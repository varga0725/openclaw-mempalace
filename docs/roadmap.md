# Roadmap to official quality

## Goal

Turn `openclaw-mempalace` from a working prototype into an official-quality OpenClaw memory plugin with clear install, safety, and operations story.

## Current state

Working now:
- native OpenClaw plugin root layout
- prompt-time recall
- inbound message capture
- `/new` and `/reset` session snapshot hook
- basic duplicate suppression
- install and verification docs

Still blocking official-grade adoption:
- Python subprocess bridge triggers unsafe-install guard
- no automated smoke-test harness yet
- no first-class maintenance workflow documented in one place

## Milestones

### M1. Safe installation path
- isolate `child_process` usage behind one shared bridge module
- replace Python bridge with a safer adapter pattern
- make default `openclaw plugins install` succeed without unsafe override

### M2. Verification and testing
- add reproducible smoke-test procedure
- add fixture-based local validation steps
- add test notes for recall, capture, and session-save paths

### M3. Memory operations model
- define responsibilities for plugin vs hook vs heartbeat vs cron
- document recommended maintenance schedule
- add example cron jobs and heartbeat guidance

### M4. Release readiness
- tighten naming and packaging
- improve changelog and release notes discipline
- prepare publish/install instructions for broader community use

## Recommended next engineering order

1. safety-cleanup for subprocess bridge
2. real smoke-test flow
3. maintenance automation examples
4. publish/release polish
