import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";

const log = {
  info: (...args: any[]) => console.log("[mempalace-session-save]", ...args),
  error: (...args: any[]) => console.error("[mempalace-session-save]", ...args),
};

function resolveHookConfig(cfg: any) {
  return cfg?.hooks?.internal?.entries?.["mempalace-session-save"] || {};
}

function resolvePalacePath() {
  return process.env.MEMPALACE_PALACE_PATH || path.join(os.homedir(), ".mempalace", "palace");
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

async function writeToMempalace(payload: Record<string, any>) {
  const script = `
import os, sys, json, hashlib
from datetime import datetime
import chromadb

payload = json.loads(sys.stdin.read())
palace_path = payload["palace_path"]
wing = payload["wing"]
room = payload["room"]
source_file = payload["source_file"]
content = payload["content"]
chunk_size = 800
overlap = 100
min_chunk = 50

client = chromadb.PersistentClient(path=palace_path)
try:
    col = client.get_collection("mempalace_drawers")
except Exception:
    col = client.create_collection("mempalace_drawers")

start = 0
idx = 0
while start < len(content):
    end = min(start + chunk_size, len(content))
    chunk = content[start:end].strip()
    if len(chunk) >= min_chunk:
        drawer_id = f"drawer_{wing}_{room}_{hashlib.md5((source_file + str(idx) + chunk[:80]).encode()).hexdigest()[:16]}"
        try:
            col.add(
                documents=[chunk],
                ids=[drawer_id],
                metadatas=[{
                    "wing": wing,
                    "room": room,
                    "source_file": source_file,
                    "chunk_index": idx,
                    "added_by": "openclaw-hook",
                    "filed_at": datetime.now().isoformat(),
                }],
            )
        except Exception:
            pass
        idx += 1
    start = end - overlap if end < len(content) else end

print(json.dumps({"ok": True, "chunks": idx}))
`.trim();

  return await new Promise<{ ok: boolean; chunks?: number; error?: string }>((resolve) => {
    const child = spawn("python3", ["-c", script], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => (stdout += String(d)));
    child.stderr.on("data", (d) => (stderr += String(d)));
    child.on("close", (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(stdout || "{}"));
        } catch {
          resolve({ ok: true });
        }
      } else {
        resolve({ ok: false, error: stderr || `python exited ${code}` });
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

export default async function handler(event: any) {
  if (event?.type !== "command") return;
  if (event?.action !== "new" && event?.action !== "reset") return;

  try {
    const context = event.context || {};
    const cfg = context.cfg || {};
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
      palace_path: resolvePalacePath(),
      wing,
      room,
      source_file: sourceFile,
      content,
    });

    if (!result.ok) {
      throw new Error(result.error || "unknown mempalace write failure");
    }

    log.info("Saved session snapshot to MemPalace", { sessionId, wing, room, chunks: result.chunks || 0 });
  } catch (err: any) {
    log.error("Failed to save session snapshot", err?.message || String(err));
  }
}
