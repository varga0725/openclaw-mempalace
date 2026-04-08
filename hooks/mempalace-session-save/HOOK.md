---
name: mempalace-session-save
description: "Save recent session context into MemPalace when /new or /reset is issued"
metadata:
  {
    "openclaw": {
      "emoji": "🏛️",
      "events": ["command:new", "command:reset"],
      "requires": { "config": ["workspace.dir"], "bins": ["python3"] }
    }
  }
---

# MemPalace Session Save

On `/new` or `/reset`, saves recent user/assistant conversation context directly into MemPalace as verbatim drawers.

Config options under `hooks.internal.entries.mempalace-session-save`:

- `enabled`: boolean
- `messages`: number, default 15
- `wing`: override wing name, default `openclaw_sessions`
- `room`: override room name, default `session_memory`
- `palacePath`: optional explicit palace path, defaults to `MEMPALACE_PALACE_PATH` or `~/.mempalace/palace`
