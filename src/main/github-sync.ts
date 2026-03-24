import { request as httpsRequest } from "https";
import { randomUUID } from "crypto";

interface StoreInstance {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(key: string): any;
  set(key: string, value: unknown): void;
}

interface AppData {
  columns: { id: string; name: string }[];
  tasks: { id: string; ticket?: string; prUrl?: string }[];
}

interface GithubSettings {
  githubToken?: string;
  githubUsername?: string;
  lastGithubSyncAt?: string;
}

const INBOX_COLUMN_ID = "inbox";

function githubGet(url: string, token: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      url,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "task-manager",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk: Buffer) => { body += chunk; });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`GitHub API error ${res.statusCode}: ${body}`));
          } else {
            resolve(body);
          }
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

export async function testGithubCredentials(
  token: string,
  username: string,
): Promise<{ ok: boolean; login?: string; error?: string }> {
  try {
    const body = await githubGet("https://api.github.com/user", token);
    const user = JSON.parse(body) as { login?: string };
    if (user.login?.toLowerCase() !== username.toLowerCase()) {
      return { ok: false, error: `Token belongs to "${user.login}", not "${username}"` };
    }
    return { ok: true, login: user.login };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function debugGithubSync(
  token: string,
  username: string,
  repos: string[],
): Promise<{ lines: string[] }> {
  const lines: string[] = [];

  // 1. Check repo access
  for (const repo of repos) {
    try {
      const body = await githubGet(`https://api.github.com/repos/${repo}`, token);
      const r = JSON.parse(body) as { full_name?: string; private?: boolean };
      lines.push(`✓ Repo access: ${r.full_name} (${r.private ? "private" : "public"})`);
    } catch (err) {
      lines.push(`✗ Repo access failed for ${repo}: ${String(err)}`);
    }
  }

  // 2. Fetch first page of events raw — no date filtering
  let totalEvents = 0;
  const typeCounts: Record<string, number> = {};
  const reviewSamples: string[] = [];

  try {
    const body = await githubGet(
      `https://api.github.com/users/${encodeURIComponent(username)}/events?per_page=100&page=1`,
      token,
    );
    const events = JSON.parse(body) as Record<string, unknown>[];
    if (!Array.isArray(events)) {
      lines.push(`✗ Events response is not an array: ${body.slice(0, 200)}`);
      return { lines };
    }

    totalEvents = events.length;
    for (const event of events) {
      const type = (event.type as string) ?? "unknown";
      typeCounts[type] = (typeCounts[type] ?? 0) + 1;

      if (type === "PullRequestReviewEvent") {
        const payload = event.payload as Record<string, unknown>;
        const pr = payload?.pull_request as Record<string, unknown> | undefined;
        const review = payload?.review as Record<string, unknown> | undefined;
        reviewSamples.push(
          `  • [${event.created_at}] action=${payload?.action} state=${review?.state} repo=${(event.repo as Record<string, unknown>)?.name} pr="${pr?.title}"`,
        );
      }
    }

    lines.push(`\nEvents on page 1: ${totalEvents}`);
    lines.push("Event type breakdown:");
    for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
      lines.push(`  ${type}: ${count}`);
    }

    if (reviewSamples.length > 0) {
      lines.push(`\nPullRequestReviewEvents found (${reviewSamples.length}):`);
      lines.push(...reviewSamples);
    } else {
      lines.push("\nNo PullRequestReviewEvents on page 1.");
    }
  } catch (err) {
    lines.push(`✗ Failed to fetch events: ${String(err)}`);
  }

  return { lines };
}

export async function syncGithubPrReviews(
  store: StoreInstance,
  notifyRenderer: () => void,
): Promise<{ created: number }> {
  const settings = store.get("settings") as GithubSettings;
  const { githubToken, githubUsername, lastGithubSyncAt } = settings;

  if (!githubToken || !githubUsername) {
    console.log("[github] githubToken or githubUsername not configured — skipping sync");
    return { created: 0 };
  }

  const sinceDate = lastGithubSyncAt
    ? new Date(lastGithubSyncAt)
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  console.log(`[github] Syncing PR reviews since ${sinceDate.toISOString()}`);

  // Fetch user events — newest first, up to 3 pages (300 events)
  // This throws on API errors (401, 403, etc), so lastGithubSyncAt is only
  // updated after a confirmed successful response.
  const reviewEvents: Record<string, unknown>[] = [];
  for (let page = 1; page <= 3; page++) {
    const body = await githubGet(
      `https://api.github.com/users/${encodeURIComponent(githubUsername)}/events?per_page=100&page=${page}`,
      githubToken,
    );
    const events = JSON.parse(body) as Record<string, unknown>[];
    console.log(`[github] Page ${page}: received ${Array.isArray(events) ? events.length : "non-array"} events`);
    if (!Array.isArray(events) || events.length === 0) break;

    const typeSummary: Record<string, number> = {};
    let hitOld = false;
    for (const event of events) {
      const type = (event.type as string) ?? "unknown";
      typeSummary[type] = (typeSummary[type] ?? 0) + 1;
      const createdAt = new Date(event.created_at as string);
      if (createdAt <= sinceDate) { hitOld = true; break; }
      if (type === "PullRequestReviewEvent") {
        const payload = event.payload as Record<string, unknown>;
        if (payload?.action === "submitted") reviewEvents.push(event);
      }
    }
    console.log(`[github] Page ${page} event types:`, typeSummary);
    if (hitOld) break;
  }

  const data = store.get("appData") as AppData;
  const targetColumn =
    data.columns.find((c) => c.id === INBOX_COLUMN_ID) ?? data.columns[0];
  if (!targetColumn) {
    console.warn("[github] No columns available");
    return { created: 0 };
  }

  let created = 0;
  const newTasks: Record<string, unknown>[] = [];

  for (const event of reviewEvents) {
    const payload = event.payload as Record<string, unknown>;
    const review = payload?.review as Record<string, unknown> | undefined;
    const reviewId = review?.id;
    const ticket = `github:review:${reviewId}`;

    // Deduplicate by review ID
    if (data.tasks.some((t) => t.ticket === ticket)) continue;

    const pr = payload?.pull_request as Record<string, unknown> | undefined;
    const prUrl = (pr?.html_url as string) ?? "";
    const prTitle = (pr?.title as string) ?? `PR #${pr?.number ?? "?"}`;
    const repoName = (event.repo as Record<string, unknown>)?.name as string ?? "";

    newTasks.push({
      id: randomUUID(),
      title: `Review: ${prTitle}`,
      description: repoName ? `Repository: ${repoName}` : "",
      columnId: targetColumn.id,
      createdAt: event.created_at as string,
      completed: true,
      completedAt: event.created_at as string,
      ticket,
      prUrl,
      status: "idle",
    });
    created++;
  }

  // Only reached if API calls succeeded — safe to advance the cursor
  store.set("settings", { ...settings, lastGithubSyncAt: new Date().toISOString() });

  if (newTasks.length > 0) {
    store.set("appData", { ...data, tasks: [...data.tasks, ...newTasks] });
    notifyRenderer();
  }

  console.log(`[github] Created ${created} PR review tasks`);
  return { created };
}
