# openclaw-mempalace

MemPalace integration for OpenClaw.

This repo packages two related pieces:
- an OpenClaw plugin for MemPalace-based recall and inbound memory capture
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

## Layout

- `plugin/` - OpenClaw plugin entry, manifest, and package metadata
- `hooks/mempalace-session-save/` - internal hook for session snapshot saving
- `docs/architecture.md` - high-level design notes
- `examples/config.example.json` - sample OpenClaw config

## Requirements

- OpenClaw
- Python 3
- `chromadb`
- the MemPalace Python package and search API available in the runtime
- a writable palace path, defaulting to `~/.mempalace/palace`

## Example config

See `examples/config.example.json`.

## Development notes

This implementation uses Python subprocess bridges instead of a direct Node adapter. That keeps the integration simple and portable, but it is not the final ideal architecture.

## License

MIT
