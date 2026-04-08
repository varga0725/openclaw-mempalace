# Install and configure

## Local development install

```bash
openclaw plugins install --link --dangerously-force-unsafe-install /absolute/path/to/openclaw-mempalace
openclaw gateway restart
```

Then enable and configure the plugin in your OpenClaw config.

## Example plugin config

```json
{
  "plugins": {
    "entries": {
      "mempalace": {
        "enabled": true,
        "config": {
          "palacePath": "~/.mempalace/palace",
          "maxRecallResults": 5,
          "captureChannelScope": "direct-only",
          "defaultWing": "workspace",
          "defaultRoom": "memory"
        }
      }
    }
  }
}
```

## Session save hook

This repo also ships a standalone internal hook for saving recent session context on `/new` and `/reset`.

```json
{
  "hooks": {
    "internal": {
      "entries": {
        "mempalace-session-save": {
          "enabled": true,
          "path": "/absolute/path/to/openclaw-mempalace/hooks/mempalace-session-save",
          "messages": 15,
          "wing": "openclaw_sessions",
          "room": "session_memory",
          "palacePath": "~/.mempalace/palace"
        }
      }
    }
  }
}
```

## Verify

```bash
openclaw plugins list
openclaw plugins inspect mempalace
openclaw hooks list
```

For the current install-status details and smoke-test checklist, see `docs/verification.md`.

## Notes

- Config changes require a Gateway restart.
- `palacePath` can be set separately for the plugin and the hook.
- The plugin focuses on recall plus inbound capture. The hook focuses on session snapshots.
