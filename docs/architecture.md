# Architecture

## Components

1. OpenClaw plugin runtime
2. Python bridge for MemPalace search and write
3. MemPalace ChromaDB palace store

## Recall flow

- Hook: `before_prompt_build`
- Extract last user message
- Run MemPalace search
- Prepend top hits as context

## Save flow

- Hook: `message_received`
- Extract inbound text
- Route to wing and room
- Save into MemPalace

## Design tradeoff

This version prefers simplicity and portability over deeply optimized integration.
It shells out to Python instead of embedding a dedicated Node adapter for MemPalace.
