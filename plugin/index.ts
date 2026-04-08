import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";

function runPython(script: string, payload: any): Promise<any> {
  return new Promise((resolve) => {
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
          resolve({ ok: true, raw: stdout });
        }
      } else {
        resolve({ ok: false, error: stderr || `python exited ${code}` });
      }
    });
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

function pluginCfg(cfg: any) {
  return cfg?.plugins?.entries?.mempalace?.config || {};
}

function pluginEnabled(cfg: any) {
  return cfg?.plugins?.entries?.mempalace?.enabled !== false;
}

function expandHomePath(inputPath?: string) {
  if (!inputPath) return path.join(os.homedir(), ".mempalace", "palace");
  if (inputPath === "~") return os.homedir();
  if (inputPath.startsWith("~/")) return path.join(os.homedir(), inputPath.slice(2));
  return inputPath;
}

function palacePathFromConfig(cfg: any) {
  return expandHomePath(pluginCfg(cfg).palacePath);
}

function extractText(message: any): string {
  const content = message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((c: any) => c?.type === "text")
      .map((c: any) => c.text || "")
      .join("\n");
  }
  return "";
}

function extractInboundText(event: any): string {
  const candidates = [
    event?.context?.content,
    event?.context?.bodyForAgent,
    event?.context?.transcript,
    event?.context?.text,
    event?.message?.content,
    event?.payload?.content,
    event?.payload?.text,
    event?.body,
    event?.text,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
    if (Array.isArray(candidate)) {
      const text = candidate
        .filter((item: any) => item?.type === "text" && typeof item?.text === "string")
        .map((item: any) => item.text.trim())
        .filter(Boolean)
        .join("\n");
      if (text) return text;
    }
  }

  return "";
}

function pickRoute(text: string, cfg: any) {
  const pcfg = pluginCfg(cfg);
  const rules = Array.isArray(pcfg.routingRules) ? pcfg.routingRules : [];
  const lower = text.toLowerCase();
  for (const rule of rules) {
    if (Array.isArray(rule.matchAny) && rule.matchAny.some((k: string) => lower.includes(String(k).toLowerCase()))) {
      return { wing: rule.wing, room: rule.room };
    }
  }
  return {
    wing: pcfg.defaultWing || "workspace",
    room: pcfg.defaultRoom || "memory",
  };
}

const recallScript = `
import sys, json
from mempalace.searcher import search_memories
payload = json.loads(sys.stdin.read())
res = search_memories(payload['query'], palace_path=payload['palace_path'], n_results=payload['max_results'])
print(json.dumps(res))
`.trim();

const saveScript = `
import sys, json, hashlib
from datetime import datetime
import chromadb
payload = json.loads(sys.stdin.read())
client = chromadb.PersistentClient(path=payload['palace_path'])
try:
    col = client.get_collection('mempalace_drawers')
except Exception:
    col = client.create_collection('mempalace_drawers')
content = payload['content']
wing = payload['wing']
room = payload['room']
source_file = payload['source_file']
content_hash = hashlib.md5(content.encode()).hexdigest()
drawer_id = f"drawer_{wing}_{room}_{content_hash[:16]}"
try:
    existing = col.get(ids=[drawer_id])
    if existing and existing.get('ids'):
        print(json.dumps({'ok': True, 'duplicate': True}))
        raise SystemExit(0)
except Exception:
    pass
try:
    col.add(documents=[content], ids=[drawer_id], metadatas=[{
        'wing': wing,
        'room': room,
        'source_file': source_file,
        'content_hash': content_hash,
        'chunk_index': 0,
        'added_by': 'openclaw-mempalace-plugin',
        'filed_at': datetime.now().isoformat(),
    }])
except Exception:
    pass
print(json.dumps({'ok': True, 'duplicate': False}))
`.trim();

export default definePluginEntry({
  id: "mempalace",
  name: "MemPalace OpenClaw Integration",
  description: "Generic MemPalace recall and relevance-based memory capture for OpenClaw",
  register(api: any) {
    api.registerHook("before_prompt_build", async (event: any) => {
      try {
        const cfg = event?.cfg || {};
        if (!pluginEnabled(cfg)) return;
        const pcfg = pluginCfg(cfg);
        const maxRecallResults = Number(pcfg.maxRecallResults) > 0 ? Number(pcfg.maxRecallResults) : 5;
        const lastUser = [...(event?.messages || [])].reverse().find((m: any) => m?.role === "user");
        const query = extractText(lastUser);
        if (!query || query.trim().length < 4) return;
        const result = await runPython(recallScript, {
          query,
          palace_path: palacePathFromConfig(cfg),
          max_results: maxRecallResults,
        });
        const hits = result?.results || [];
        if (!hits.length) return;
        const contextText = [
          "[MemPalace recall]",
          ...hits.slice(0, maxRecallResults).map((h: any, i: number) => `${i + 1}. wing=${h.wing} room=${h.room} source=${h.source_file}\n${h.text}`),
        ].join("\n\n");
        return { prependContext: contextText };
      } catch {
        return;
      }
    });

    api.registerHook("message_received", async (event: any) => {
      try {
        const cfg = event?.cfg || {};
        if (!pluginEnabled(cfg)) return;
        const pcfg = pluginCfg(cfg);
        const scope = pcfg.captureChannelScope || "direct-only";
        if (scope === "direct-only" && event?.kind && event.kind !== "direct") return;
        const text = extractInboundText(event);
        if (text.length < 20) return;
        const route = pickRoute(text, cfg);
        const sourceKey = event?.sessionKey || event?.messageId || event?.context?.messageId || new Date().toISOString();
        await runPython(saveScript, {
          palace_path: palacePathFromConfig(cfg),
          wing: route.wing,
          room: route.room,
          source_file: `message-received:${sourceKey}`,
          content: text,
        });
      } catch {
        return;
      }
    });
  },
});
