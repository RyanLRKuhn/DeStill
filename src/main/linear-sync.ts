import { request as httpsRequest } from "https";
import { createTaskIfNotExists } from "./jira-sync";

export interface LinearSettings {
  linearApiKey?: string;
  linearEnabled?: boolean;
  linearStatusFilters?: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StoreInstance = {
  get(key: string): any;
  set(key: string, value: unknown): void;
};

function linearPost(apiKey: string, query: string, variables?: Record<string, unknown>): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query, variables });
    const req = httpsRequest(
      "https://api.linear.app/graphql",
      {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => { data += chunk; });
        res.on("end", () => resolve(data));
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

export async function fetchLinearStates(apiKey: string): Promise<string[]> {
  const body = await linearPost(apiKey, "{ workflowStates { nodes { name } } }");
  const json = JSON.parse(body) as { data?: { workflowStates?: { nodes: { name: string }[] } } };
  const nodes = json.data?.workflowStates?.nodes ?? [];
  const seen = new Set<string>();
  const names: string[] = [];
  for (const node of nodes) {
    if (!seen.has(node.name)) {
      seen.add(node.name);
      names.push(node.name);
    }
  }
  return names.sort();
}

export async function initialLinearSync(
  store: StoreInstance,
  notifyRenderer: () => void,
): Promise<void> {
  const settings = store.get("settings") as LinearSettings;

  if (!settings.linearEnabled) {
    console.log("[linear] Linear automation is disabled — skipping initial sync");
    return;
  }

  const { linearApiKey, linearStatusFilters = [] } = settings;

  if (!linearApiKey) {
    console.warn("[linear] linearApiKey not configured — skipping initial sync");
    return;
  }

  if (linearStatusFilters.length === 0) {
    console.warn("[linear] No status filters configured — skipping initial sync");
    return;
  }

  console.log("[linear] Running initial Linear sync...");
  try {
    const query = `
      query($states: [String!]!) {
        viewer {
          assignedIssues(filter: { state: { name: { in: $states } } }) {
            nodes { identifier url }
          }
        }
      }
    `;
    const body = await linearPost(linearApiKey, query, { states: linearStatusFilters });
    console.log("[linear] Initial sync response:", body);

    const json = JSON.parse(body) as {
      data?: { viewer?: { assignedIssues?: { nodes: { identifier: string; url: string }[] } } };
    };
    const issues = json.data?.viewer?.assignedIssues?.nodes ?? [];
    console.log(`[linear] Found ${issues.length} assigned issues`);

    for (const issue of issues) {
      console.log(`[linear] issue=${issue.identifier} url=${issue.url}`);
      createTaskIfNotExists(store, notifyRenderer, issue.url);
    }
  } catch (err) {
    console.error("[linear] Initial sync failed:", err);
  }
}
