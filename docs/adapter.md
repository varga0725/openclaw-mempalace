# Adapter design

## Why this exists

The project started with direct Python subprocess calls embedded in multiple files.
That made the plugin harder to reason about and harder to migrate away from the unsafe bridge.

## Current structure

The code now has two layers:

1. `lib/runtime-bridge.ts`
   - lowest-level temporary unsafe boundary
   - currently responsible for Python JSON subprocess execution

2. `lib/mempalace-adapter.ts`
   - MemPalace-specific adapter API
   - exposes three operations:
     - `recall(...)`
     - `saveMessage(...)`
     - `saveSessionSnapshot(...)`

The plugin and hook should depend on the adapter, not directly on subprocess details.

## Why this matters

This gives us a clean migration seam.

We can later replace the adapter backend with:
- a direct JS MemPalace client
- an HTTP service client
- an MCP-backed client
- another OpenClaw-approved runtime pattern

without rewriting the plugin and hook behavior again.

## Current backend

Right now `createMempalaceAdapter()` returns a Python-bridge-backed implementation.
That means the unsafe-install problem still exists, but the replacement path is now much cleaner.

## Backend selection

`createMempalaceAdapter()` is now switchable by backend id:
- `python-bridge`
- `http`
- `mcp`

Right now only `python-bridge` is implemented. The others intentionally return structured not-implemented errors.

## Next target

Add a second real backend implementation so the bridge stops being the only working path.
