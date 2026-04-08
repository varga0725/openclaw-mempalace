# openclaw-mempalace

MemPalace integration for OpenClaw.

This repo packages two related pieces:
- a native OpenClaw plugin at the repository root for MemPalace-based recall and inbound memory capture
- an internal hook that snapshots recent session context into MemPalace on `/new` and `/reset`

## Status

Prototype, but already usable.

Implemented:
- prompt-time MemPalace recall
- inbound message capture into MemPalace
- configurable wing/room routing rules
- session snapshot hook for `/new` and `/reset`

Still needs hardening:
- exact hook event validation across more OpenClaw scenarios
- duplicate handling improvements
- stronger relevance filtering
- better packaging and install ergonomics

Recent improvements already in tree:
- plugin-level `enabled` guard
- hook-level `enabled` guard
- hook `palacePath` override support via config
- broader inbound text extraction for `message_received`

## Layout

- `index.ts` + `openclaw.plugin.json` - native OpenClaw plugin root
- `hooks/mempalace-session-save/` - internal hook for session snapshot saving
- `docs/architecture.md` - high-level design notes
- `docs/install.md` - install and config guide
- `docs/verification.md` - verification notes and current install-status caveats
- `docs/operations.md` - plugin vs hook vs heartbeat vs cron responsibilities
- `docs/roadmap.md` - path from prototype to official quality
- `docs/safety.md` - bridge-isolation and install-safety strategy
- `docs/adapter.md` - adapter/backend abstraction notes
- `docs/backends.md` - backend selection and future transport direction
- `examples/config.example.json` - sample OpenClaw config
- `examples/cron.memory-maintenance.example.json` - sample maintenance cron job
- `examples/HEARTBEAT.memory-maintenance.example.md` - sample heartbeat maintenance guidance

## Requirements

- OpenClaw
- Python 3
- `chromadb`
- the MemPalace Python package and search API available in the runtime
- a writable palace path, defaulting to `~/.mempalace/palace`

## Example config

See `examples/config.example.json`.

## Install

See `docs/install.md` for local installation and config.
See `docs/verification.md` for smoke tests and the current unsafe-install caveat caused by the Python bridge.
See `docs/safety.md` for the bridge-isolation and migration strategy.
See `docs/adapter.md` for the replacement seam between plugin behavior and backend implementation.

## Development notes

This implementation uses Python subprocess bridges instead of a direct Node adapter. That keeps the integration simple and portable, but it is not the final ideal architecture.

## Changelog

See `CHANGELOG.md`.

## License

MIT
