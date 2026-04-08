import fs from "node:fs/promises";
import { createMempalaceAdapter } from "../../lib/mempalace-adapter.ts";
import { type MempalaceBackendKind } from "../../lib/mempalace-backends.ts";
import { expandHomePath } from "../../lib/runtime-bridge.ts";

const log = {
  info: (...args: any[]) => console.log("[mempalace-session-save]", ...args),
  error: (...args: any[]) => console.error("[mempalace-session-save]", ...args),
};

function resolveHookConfig(cfg: any) {
  return cfg?.hooks?.internal?.entries?.["mempalace-session-save"] || {};
}

function hookEnabled(cfg: any) {
  return resolveHookConfig(cfg).enabled !== false;
}

function resolvePalacePath(cfg: any) {
  const hookConfig = resolveHookConfig(cfg);
  return expandHomePath(hookConfig.palacePath || process.env.MEMPALACE_PALACE_PATH);
}

function backendFromHookConfig(cfg: any): MempalaceBackendKind {
  const backend = resolveHookConfig(cfg).backend;
  if (backend === "http" || backend === "mcp") return backend;
  return "python-bridge";
}

async function getRecentSessionContent(sessionFilePath: string, messageCount = 15) {
  try {
    const lines = (await fs.readFile(sessionFilePath, "utf-8")).trim().split("\n");
    const allMessages: string[] = [];
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.type !== "message" || !entry.message) continue;
        const msg = entry.message;
        const role = msg.role;
        if ((role !== "user" && role !== "assistant") || !msg.content) continue;
        const text = Array.isArray(msg.content)
          ? msg.content.find((c: any) => c.type === "text")?.text
          : msg.content;
        if (text && typeof text === "string" && !text.startsWith("/")) {
          allMessages.push(`${role}: ${text}`);
        }
      } catch {}
    }
    return allMessages.slice(-messageCount).join("\n");
  } catch {
    return null;
  }
}

async function writeToMempalace(payload: Record<string, any>, backend: MempalaceBackendKind) {
  const adapter = createMempalaceAdapter(backend);
  return await adapter.saveSessionSnapshot({
    palacePath: payload.palace_path,
    wing: payload.wing,
    room: payload.room,
    sourceFile: payload.source_file,
    content: payload.content,
  });
}

export default async function handler(event: any) {
  if (event?.type !== "command") return;
  if (event?.action !== "new" && event?.action !== "reset") return;

  try {
    const context = event.context || {};
    const cfg = context.cfg || {};
    if (!hookEnabled(cfg)) return;
    const hookConfig = resolveHookConfig(cfg);
    const messages = Number(hookConfig.messages) > 0 ? Number(hookConfig.messages) : 15;
    const wing = hookConfig.wing || "openclaw_sessions";
    const room = hookConfig.room || "session_memory";
    const sessionEntry = context.previousSessionEntry || context.sessionEntry || {};
    const sessionFile = sessionEntry.sessionFile;
    const sessionId = sessionEntry.sessionId || "unknown";

    if (!sessionFile) {
      log.info("No session file found, skipping", { sessionId });
      return;
    }

    const transcript = await getRecentSessionContent(sessionFile, messages);
    if (!transcript || transcript.trim().length < 20) {
      log.info("Transcript too small, skipping", { sessionId });
      return;
    }

    const now = new Date(event.timestamp || Date.now()).toISOString();
    const sourceFile = `openclaw-session:${sessionId}:${now}`;
    const content = `# OpenClaw session snapshot\n\n- session_id: ${sessionId}\n- session_key: ${event.sessionKey || "unknown"}\n- action: ${event.action}\n- timestamp: ${now}\n\n## Transcript\n\n${transcript}`;

    const result = await writeToMempalace({
      palace_path: resolvePalacePath(cfg),
      wing,
      room,
      source_file: sourceFile,
      content,
    }, backendFromHookConfig(cfg));

    if (!result.ok) {
      throw new Error(result.error || "unknown mempalace write failure");
    }

    log.info("Saved session snapshot to MemPalace", { sessionId, wing, room, chunks: result.chunks || 0 });
  } catch (err: any) {
    log.error("Failed to save session snapshot", err?.message || String(err));
  }
}
