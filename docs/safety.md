# Safety and bridge strategy

## Current problem

The plugin currently uses `child_process` to shell out to Python for two things:
- MemPalace recall
- MemPalace writes via ChromaDB

This is the main reason default OpenClaw plugin install is currently blocked by unsafe-install checks.

## What we changed now

The unsafe runtime bridge is now isolated into a single shared module:
- `lib/runtime-bridge.ts`

That does **not** remove the unsafe-install warning yet, but it gives us:
- one replacement point
- less duplicated subprocess logic
- cleaner future migration path

## Migration targets

### Option A. Direct JavaScript adapter
Best long-term outcome if feasible.

Replace Python subprocess usage with:
- direct JS/TS access to the memory backend, or
- a first-class Node-compatible MemPalace client

### Option B. Official external service boundary
Move MemPalace access behind an accepted external boundary such as:
- a local HTTP service
- an MCP server
- another officially supported OpenClaw extension surface

This would keep the plugin itself free of subprocess execution.

### Option C. Sanctioned OpenClaw runtime pattern
If OpenClaw later defines a safe bridge pattern for local companion processes, the isolated bridge can be rewritten to follow that pattern without changing plugin behavior.

## Immediate engineering goal

Next refactor target:
- remove direct `child_process` usage from `index.ts`
- remove direct `child_process` usage from `hooks/mempalace-session-save/handler.ts`
- keep only the shared bridge module as the temporary unsafe boundary

## Official-quality bar

For this project to feel truly official, default install should work without:
- `--dangerously-force-unsafe-install`
- manual trust exceptions
- undocumented local assumptions

Until then, this repo is progressing toward official quality, but not fully there yet.
