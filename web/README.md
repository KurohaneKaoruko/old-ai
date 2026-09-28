# Web UI

A zero-dependency web workbench for the superseded historical AI algorithms in
this repository (11 algorithms). Node.js built-ins only — no runtime `npm
install` required.

## Quick start

```powershell
npm start
# or: node web/server.js
# or with a custom port: $env:PORT=8080; node web/server.js
```

Then open <http://localhost:3000>. Pick an algorithm in the sidebar; the control
panel on the left and the visualization on the right are shaped by the
algorithm's type, and a free-text chat stays available as a collapsible fallback
(it is the primary interface for the conversational agents).

## Typed panels

Each algorithm declares a `ui` schema (form fields + view type) and a `run()`
entry point in [`panels.js`](./panels.js); the chat-only conversational agents
(ELIZA, ScriptNLU) skip the panel and use the chat box directly.

| Panel type | Algorithms | Controls → Visualization |
|---|---|---|
| proof | Logic Theorist | editable facts/rules/goal → proof tree |
| graph | Semantic Network | relation editor → triple table + inference trace |
| slots | Frames | frame/slot get/add → slot table with provenance |
| expert | MYCIN | evidence sliders → belief bars + CF trace |
| state | Blackboard, Subsumption | feature/sensor toggles → hypothesis bars, arbitration table |
| tagger | HMM | sentence input → POS word chips |
| translate | RBMT | sentence input → word alignment table + pipeline |
| vision | Haar Cascade | feature sliders → stage score gauge + weak-classifier table |

Visualizations are hand-rolled SVG/CSS (bars, gauges, chips, tables, flow
boxes) — no chart library.

## API

### `GET /api/algorithms`

Returns the catalog; each entry includes its `ui` schema:

```json
{
  "algorithms": [
    { "id": "haar", "name": "Haar 级联检测器", "year": 2001,
      "category": "computer_vision", "conversational": false,
      "intro": "…",
      "ui": { "type": "vision", "hint": "…", "submit": "检测",
              "fields": [ { "key": "eye_darkness", "kind": "range", "min": 0, "max": 1, "step": 0.05, "value": 0.9 } ] } }
  ]
}
```

### `POST /api/run` — structured panel execution

```json
{ "algorithmId": "haar", "sessionId": "abc-123", "params": { "eye_darkness": 0.9, "nose_bridge": 0.8 } }
```

```json
{ "reply": "判定：正样本（全部阶段通过）", "view": { "type": "multi", "blocks": [ … ] } }
```

* `400` if `algorithmId` is unknown or the algorithm has no panel.
* Algorithm errors come back as a normal reply with `"error": true`.

### `POST /api/chat` — free-text fallback

```json
{ "algorithmId": "eliza", "sessionId": "abc-123", "text": "I need help" }
```

```json
{ "reply": "Why do you need help?" }
```

### `POST /api/reset`

```json
{ "sessionId": "abc-123", "algorithmId": "haar" }
```

Clears server-side session state for that (session, algorithm) pair; omit
`algorithmId` to reset the whole session.

## Sessions

State lives in a server-side `Map` keyed by `sessionId::algorithmId`, so
stateful algorithms keep their instances across messages (ELIZA template
rotation, ScriptNLU history, network/frame/logic edits). The browser generates
a random `sessionId` per page load. Nothing is persisted across server
restarts.

## Extending

Adding a new algorithm means: (1) one adapter object in
[`adapters.js`](./adapters.js) (`handle` for the chat fallback), and (2) one
panel entry in [`panels.js`](./panels.js) (`ui` schema + `run` returning a
typed `view`). The frontend renders both from the schema — no per-algorithm
frontend code.

## Notes and limitations

* Single-process, in-memory, no auth — intended for local use.
* Some algorithms only accept English input because their own tokenizers are
  English-only (RBMT dictionary, HMM vocabularies); the panels say so in their
  hints.
