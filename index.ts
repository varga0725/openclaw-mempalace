import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createMempalaceAdapter } from "./lib/mempalace-adapter.ts";
import { type MempalaceBackendKind } from "./lib/mempalace-backends.ts";
import { expandHomePath } from "./lib/runtime-bridge.ts";

function pluginCfg(cfg: any) {
  return cfg?.plugins?.entries?.mempalace?.config || {};
}

function pluginEnabled(cfg: any) {
  return cfg?.plugins?.entries?.mempalace?.enabled !== false;
}

function palacePathFromConfig(cfg: any) {
  return expandHomePath(pluginCfg(cfg).palacePath);
}

function backendFromConfig(cfg: any): MempalaceBackendKind {
  const backend = pluginCfg(cfg).backend;
  if (backend === "http" || backend === "mcp") return backend;
  return "python-bridge";
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
        const adapter = createMempalaceAdapter(backendFromConfig(cfg));
        const maxRecallResults = Number(pcfg.maxRecallResults) > 0 ? Number(pcfg.maxRecallResults) : 5;
        const lastUser = [...(event?.messages || [])].reverse().find((m: any) => m?.role === "user");
        const query = extractText(lastUser);
        if (!query || query.trim().length < 4) return;
        const result = await adapter.recall({
          query,
          palacePath: palacePathFromConfig(cfg),
          maxResults: maxRecallResults,
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
        const adapter = createMempalaceAdapter(backendFromConfig(cfg));
        const route = pickRoute(text, cfg);
        const sourceKey = event?.sessionKey || event?.messageId || event?.context?.messageId || new Date().toISOString();
        await adapter.saveMessage({
          palacePath: palacePathFromConfig(cfg),
          wing: route.wing,
          room: route.room,
          sourceFile: `message-received:${sourceKey}`,
          content: text,
        });
      } catch {
        return;
      }
    });
  },
});
