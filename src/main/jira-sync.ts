import { createServer, get as httpGet } from "http";
import { request as httpsRequest } from "https";
import { execSync, spawn as spawnProcess } from "child_process";
import { createHmac, timingSafeEqual, randomUUID } from "crypto";

export interface JiraSettings {
  ngrokAuthToken?: string;
  webhookPort?: number;
  jiraBaseUrl?: string;
  webhookSecret?: string;
  jiraEmail?: string;
  jiraStatusFilters?: string[]; // status names selected in Jira Automation settings
  jiraEnabled?: boolean;
  jiraProjectKey?: string;
}

interface AppData {
  columns: { id: string; name: string }[];
  tasks: { id: string; ticket?: string }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StoreInstance = {
  get(key: string): any;
  set(key: string, value: unknown): void;
};

// Atlassian IP CIDR cache — populated once on webhook server start
let atlassianCidrs: string[] = [];

function fetchAtlassianCidrs(): Promise<string[]> {
  return new Promise((resolve) => {
    const req = httpsRequest(
      "https://ip-ranges.atlassian.com/",
      { method: "GET" },
      (res) => {
        let body = "";
        res.on("data", (chunk: Buffer) => {
          body += chunk;
        });
        res.on("end", () => {
          try {
            const json = JSON.parse(body);
            resolve(
              (json.items as { cidr: string }[]).map((item) => item.cidr),
            );
          } catch {
            console.error(
              "[jira] Failed to parse Atlassian IP ranges response",
            );
            resolve([]);
          }
        });
      },
    );
    req.on("error", (err) => {
      console.error("[jira] Failed to fetch Atlassian IP ranges:", err);
      resolve([]);
    });
    req.end();
  });
}

function ipInCidr(ip: string, cidr: string): boolean {
  try {
    const [range, bitsStr] = cidr.split("/");
    const bits = parseInt(bitsStr, 10);
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    const toNum = (s: string): number =>
      s.split(".").reduce((acc, o) => acc * 256 + parseInt(o, 10), 0) >>> 0;
    return (toNum(ip) & mask) === (toNum(range) & mask);
  } catch {
    return false;
  }
}

function ipAllowed(ip: string): boolean {
  if (atlassianCidrs.length === 0) return true; // fail open if ranges unavailable
  // Normalize IPv6-mapped IPv4 addresses (e.g. ::ffff:1.2.3.4)
  const normalized = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  return atlassianCidrs.some((cidr) => ipInCidr(normalized, cidr));
}

function validateSignature(
  body: string,
  secret: string,
  header: string | undefined,
): boolean {
  if (!header) return false;
  const eqIdx = header.indexOf("=");
  if (eqIdx === -1) return false;
  const algo = header.slice(0, eqIdx);
  const received = header.slice(eqIdx + 1);
  const hmac = createHmac(algo === "sha256" ? "sha256" : "sha1", secret);
  hmac.update(body);
  const expected = hmac.digest("hex");
  try {
    return timingSafeEqual(
      Buffer.from(received, "hex"),
      Buffer.from(expected, "hex"),
    );
  } catch {
    return false;
  }
}

const INBOX_COLUMN_ID = "inbox";

export function createTaskIfNotExists(
  store: StoreInstance,
  notifyRenderer: () => void,
  ticketUrl: string,
): void {
  const data = store.get("appData") as AppData;
  if (data.tasks.some((t) => t.ticket === ticketUrl)) return;

  const columns = data.columns;
  const targetColumn =
    columns.find((c) => c.id === INBOX_COLUMN_ID) ?? columns[0];
  if (!targetColumn) {
    console.warn(
      "[jira] No columns available, cannot create task for",
      ticketUrl,
    );
    return;
  }

  // Derive a human-readable title from the ticket key in the URL
  const key = ticketUrl.split("/").pop() ?? ticketUrl;

  store.set("appData", {
    ...data,
    tasks: [
      ...data.tasks,
      {
        id: randomUUID(),
        title: key,
        description: "",
        columnId: targetColumn.id,
        createdAt: new Date().toISOString(),
        completed: false,
        ticket: ticketUrl,
        status: "idle",
      },
    ],
  });
  notifyRenderer();
  console.log("[jira] Created task for", ticketUrl);
}

export async function startNgrokTunnel(
  store: StoreInstance,
): Promise<string | null> {
  const settings = store.get("settings") as JiraSettings;
  const authToken = settings.ngrokAuthToken;
  const port = settings.webhookPort;

  if (!authToken || !port) {
    console.warn(
      "[jira] ngrokAuthToken or webhookPort not configured — skipping ngrok tunnel",
    );
    return null;
  }

  console.log("[jira] Starting ngrok tunnel on port", port);
  spawnProcess("ngrok", ["http", String(port)], {
    env: { ...process.env, NGROK_AUTHTOKEN: authToken },
    stdio: "ignore",
  });

  // Give ngrok a moment to start, then poll its local API for the public URL
  await new Promise((resolve) => setTimeout(resolve, 2000));

  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const publicUrl = await new Promise<string>((resolve, reject) => {
        httpGet("http://localhost:4040/api/tunnels", (res) => {
          let body = "";
          res.on("data", (chunk: Buffer) => {
            body += chunk;
          });
          res.on("end", () => {
            try {
              const json = JSON.parse(body);
              const tunnel = (
                json.tunnels as { proto: string; public_url: string }[]
              ).find((t) => t.proto === "https");
              if (tunnel) resolve(tunnel.public_url);
              else reject(new Error("No HTTPS tunnel found yet"));
            } catch (e) {
              reject(e);
            }
          });
        }).on("error", reject);
      });
      console.log("[jira] ngrok public URL:", publicUrl);
      return publicUrl;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.error("[jira] ngrok tunnel did not become ready after 10 attempts");
  return null;
}

export async function startJiraWebhookServer(
  store: StoreInstance,
  notifyRenderer: () => void,
): Promise<void> {
  const settings = store.get("settings") as JiraSettings;
  const port = settings.webhookPort;

  if (!port) {
    console.warn("[jira] webhookPort not configured — skipping webhook server");
    return;
  }

  atlassianCidrs = await fetchAtlassianCidrs();
  console.log(`[jira] Loaded ${atlassianCidrs.length} Atlassian CIDR blocks`);

  const server = createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/jira/webhook") {
      res.writeHead(404);
      res.end();
      return;
    }

    // Buffer the request body (needed for signature validation)
    const body = await new Promise<string>((resolve, reject) => {
      let data = "";
      req.on("data", (chunk: Buffer) => {
        data += chunk;
      });
      req.on("end", () => resolve(data));
      req.on("error", reject);
    });

    // Security check 1: Jira webhook secret
    const secret = (store.get("settings") as JiraSettings).webhookSecret;
    if (secret) {
      const sig = req.headers["x-hub-signature"] as string | undefined;
      if (!validateSignature(body, secret, sig)) {
        console.warn("[jira] Rejected webhook — invalid signature");
        res.writeHead(403);
        res.end();
        return;
      }
    }

    // Security check 2: IP whitelist
    const ip = req.socket.remoteAddress ?? "";
    if (!ipAllowed(ip)) {
      console.warn("[jira] Rejected webhook from non-Atlassian IP:", ip);
      res.writeHead(403);
      res.end();
      return;
    }

    // Process payload
    try {
      const payload = JSON.parse(body);
      console.log("[jira] Webhook payload:", payload);
      const issueKey: string | undefined = payload?.issue?.key;
      const statusName: string | undefined =
        payload?.issue?.fields?.status?.name;
      const { jiraBaseUrl, jiraStatusFilters = [] } = store.get(
        "settings",
      ) as JiraSettings;
      if (issueKey && jiraBaseUrl) {
        const normalize = (s: string): string =>
          s.toLowerCase().replace(/\s+/g, "");
        const allowed =
          jiraStatusFilters.length === 0 ||
          (statusName != null &&
            jiraStatusFilters.some(
              (f) => normalize(f) === normalize(statusName),
            ));
        if (!allowed) {
          console.log(
            `[jira] Skipping webhook for ${issueKey} — status "${statusName}" not in filters`,
          );
        } else {
          const ticketUrl = `${jiraBaseUrl}/browse/${issueKey}`;
          createTaskIfNotExists(store, notifyRenderer, ticketUrl);
        }
      } else {
        console.warn(
          "[jira] Webhook missing issue.key or jiraBaseUrl not configured",
        );
      }
    } catch {
      console.error("[jira] Failed to parse webhook payload");
    }

    res.writeHead(200);
    res.end();
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`[jira] Webhook server listening on port ${port}`);
  });
}

export async function initialJiraSync(
  store: StoreInstance,
  notifyRenderer: () => void,
): Promise<void> {
  const settings = store.get("settings") as JiraSettings;
  const jiraBaseUrl = settings.jiraBaseUrl;

  if (!settings.jiraEnabled) {
    console.log("[jira] Jira automation is disabled — skipping initial sync");
    return;
  }

  if (!jiraBaseUrl) {
    console.warn("[jira] jiraBaseUrl not configured — skipping initial sync");
    return;
  }

  console.log("[jira] Running initial Jira sync...");
  try {
    const { jiraStatusFilters = [] } = settings;

    if (jiraStatusFilters.length === 0) {
      console.warn("[jira] No status filters configured — skipping initial sync");
      return;
    }

    const statusFlags = jiraStatusFilters.map((s) => `-s"${s}"`).join(" ");
    const output = execSync(
      `jira issue list -a$(jira me) ${statusFlags} --plain --columns key,status,summary --no-headers`,
      {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `/usr/local/bin:/opt/homebrew/bin:${process.env.HOME ?? ""}/.local/bin:${process.env.PATH ?? "/usr/bin:/bin"}`,
        },
      },
    );

    const lines = output
      .trim()
      .split("\n")
      .filter((l) => l.trim());
    console.log(`[jira] Found ${lines.length} assigned tickets`);

    for (const line of lines) {
      const [key] = line.split("\t");
      console.log(`[jira] ticket=${key?.trim()}`);
      if (!key?.trim()) continue;
      createTaskIfNotExists(
        store,
        notifyRenderer,
        `${jiraBaseUrl}/browse/${key.trim()}`,
      );
    }
  } catch (err) {
    const stderr: string =
      (err as { stderr?: Buffer | string }).stderr?.toString() ?? "";
    if (stderr.includes("No result found")) {
      console.log("[jira] No assigned tickets found in the configured status");
    } else {
      console.error("[jira] Initial sync failed:", err);
    }
  }
}

function jiraGet(url: string, auth: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      url,
      {
        method: "GET",
        headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk: Buffer) => { body += chunk; });
        res.on("end", () => resolve(body));
      },
    );
    req.on("error", reject);
    req.end();
  });
}

export async function fetchJiraProjects(
  baseUrl: string,
  email: string,
  token: string,
): Promise<{ key: string; name: string }[]> {
  const auth = Buffer.from(`${email}:${token}`).toString("base64");
  const base = baseUrl.replace(/\/+$/, "");
  const body = await jiraGet(`${base}/rest/api/3/project/search?maxResults=100&orderBy=name`, auth);
  console.log("[jira] Fetched projects from Jira:", body);
  const json = JSON.parse(body) as { values: { key: string; name: string }[] };
  return json.values.map((p) => ({ key: p.key, name: p.name }));
}

export async function fetchJiraStatuses(
  baseUrl: string,
  email: string,
  token: string,
  projectKey: string,
): Promise<string[]> {
  const auth = Buffer.from(`${email}:${token}`).toString("base64");
  const base = baseUrl.replace(/\/+$/, "");
  const body = await jiraGet(`${base}/rest/api/3/project/${encodeURIComponent(projectKey)}/statuses`, auth);
  console.log("[jira] Fetched statuses from Jira:", body);
  const issueTypes = JSON.parse(body) as { statuses: { name: string }[] }[];
  const seen = new Set<string>();
  const statuses: string[] = [];
  for (const issueType of issueTypes) {
    for (const s of issueType.statuses) {
      if (!seen.has(s.name)) {
        seen.add(s.name);
        statuses.push(s.name);
      }
    }
  }
  return statuses.sort();
}

export async function initJiraSync(
  store: StoreInstance,
  notifyRenderer: () => void,
): Promise<void> {
  await startNgrokTunnel(store);
  await startJiraWebhookServer(store, notifyRenderer);
  await initialJiraSync(store, notifyRenderer);
}
