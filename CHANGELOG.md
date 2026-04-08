# Changelog

## 0.1.0

- initial public repository bootstrap
- prompt-time MemPalace recall plugin
- inbound message capture into MemPalace
- `/new` and `/reset` session snapshot hook
- initial hardening for config guards and palacePath overrides
- official packaging prep: richer manifest, install docs, changelog
- home-path expansion for palace paths like `~/.mempalace/palace`
- first-pass duplicate suppression for plugin saves and session snapshot chunks
- native plugin root layout at repository root for direct OpenClaw install
- verification doc covering current unsafe-install blocker from Python subprocess bridging
- operations and roadmap docs for official plugin direction
- example cron and HEARTBEAT maintenance templates
- shared runtime bridge module to isolate the Python subprocess boundary
- adapter layer for recall and save operations, decoupling plugin logic from backend details
- backend selector groundwork for `python-bridge`, `http`, and `mcp`
- safety strategy doc for removing the unsafe-install blocker over time
