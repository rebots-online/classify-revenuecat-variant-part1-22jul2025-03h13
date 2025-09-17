# Architecture Notes (2024-07-22 03:13Z)

## Hybrid Knowledge Graph Status
- Attempted to locate existing hybrid knowledge graph entries for this project but no integration endpoints are available in the current environment. Documenting the architecture locally instead.
- Alignment with any external graphs should be performed manually once connectivity is available.

## AST Abstraction Overview
- The `App` component orchestrates global state, credit management, modal visibility, and delegates content generation to `ContentContainer`.
- `ContentContainer` drives generation workflows via Gemini-based utilities (`lib/textGeneration`) and template prompts (`lib/prompts`).
- Supporting libraries provide parsing (`lib/parse`) and YouTube helpers (`lib/youtube`).
- Presentation components (`components/*Modal.tsx`, `Header`, `Footer`, `LlmLogPanel`, etc.) render the UI chrome and user interactions.

Refer to the accompanying Mermaid mindmap (`20240722T0313-ast-abstraction.mmd`) and PlantUML class diagram (`20240722T0313-ast-abstraction.uml`) for detailed structural breakdowns.
