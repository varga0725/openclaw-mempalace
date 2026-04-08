# Operations model

This project has four different automation layers. They should not be mixed blindly.

## 1. Plugin

Use the plugin for runtime memory behavior:
- recall before prompt build
- inbound message capture into MemPalace

The plugin should stay focused on memory behavior that belongs inside the normal agent turn.

## 2. Hook

Use the internal hook for event-driven lifecycle capture:
- `/new`
- `/reset`

The hook is the right place for saving session snapshots because it reacts to explicit Gateway lifecycle events.

## 3. HEARTBEAT.md

Use heartbeat guidance for lightweight, session-aware maintenance:
- review whether recent work should be written into memory files
- check if recent decisions need curation
- trigger a short maintenance pass when conversational context matters

Heartbeat is not a technical hook. It is behavioral guidance for heartbeat turns.

## 4. Cron jobs

Use cron for exact or recurring maintenance tasks:
- daily memory cleanup
- periodic dedupe review
- nightly consistency checks
- scheduled summary generation

Cron is best when timing matters and the task should not depend on the current conversation.

## Recommended split

### Plugin responsibilities
- recall
- inbound capture
- routing rules

### Hook responsibilities
- session lifecycle snapshots

### Heartbeat responsibilities
- lightweight review of memory freshness
- deciding whether new information should be curated

### Cron responsibilities
- regular maintenance
- scheduled cleanup
- consistency checks

## Suggested daily operating model

- plugin runs continuously during normal use
- hook runs only on `/new` and `/reset`
- heartbeat reviews memory state a few times per day when useful
- cron runs one or two fixed maintenance tasks per day
