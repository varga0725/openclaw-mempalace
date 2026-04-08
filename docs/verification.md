# Verification and current install status

## Current result

The repository now resolves as a native OpenClaw plugin root, but local install is currently blocked by OpenClaw's dangerous-code guard because the implementation shells out to Python.

Observed install result:

```text
Plugin "mempalace" installation blocked: dangerous code patterns detected:
- Shell command execution detected (child_process) in index.ts
- Shell command execution detected (child_process) in hooks/mempalace-session-save/handler.ts
```

## Why this happens

The current implementation uses Python subprocess bridges to talk to:
- `mempalace.searcher`
- `chromadb`

That keeps the prototype simple, but it triggers OpenClaw's unsafe-install checks.

## Temporary install path for development

If you explicitly trust the local code, use:

```bash
openclaw plugins install --link --dangerously-force-unsafe-install /absolute/path/to/openclaw-mempalace
openclaw gateway restart
```

## Smoke test checklist

After install:

```bash
openclaw plugins list
openclaw plugins inspect mempalace
openclaw hooks list
```

Then verify:
- the `mempalace` plugin is discovered and enabled
- the `mempalace-session-save` hook can be enabled from config or discovered by path
- prompt recall does not throw when no MemPalace results exist
- inbound direct messages can be captured
- `/new` and `/reset` session snapshots save without crashing

## What must change for cleaner official installability

Preferred next step:
- replace Python subprocess bridges with a safer direct adapter layer, or
- isolate the bridge behind an officially accepted runtime pattern for OpenClaw plugins

Until that happens, the repo is structurally installable, but not yet frictionless to install under default safety policy.
