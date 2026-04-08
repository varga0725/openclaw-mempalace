# openclaw-mempalace

> Development has moved to **`varga0725/mempalace-openclaw`**.

This repository should now be treated as a **historical integration staging repo**, not the main source of truth.

## Canonical repo

Use this repo instead:

- `varga0725/mempalace-openclaw`

That repo now contains:
- the MemPalace core
- the benchmarks and tests
- the OpenClaw integration under `integrations/openclaw/`

## What this repo is now

This repo can be archived after any still-useful docs or examples are copied over.

Until then, keep it only as:
- a reference snapshot of the earlier standalone OpenClaw integration work
- a place to compare old plugin structure against the consolidated repo

## Migration note

The OpenClaw integration now lives in the canonical repo here:

```text
integrations/openclaw/
├── README.md
├── plugin/
│   └── openclaw-mempalace-plugin.ts
└── docs/
    ├── architecture.md
    ├── install.md
    └── verification.md
```

## Status

**Moved. Prefer the consolidated repo for all new work.**

## License

MIT
