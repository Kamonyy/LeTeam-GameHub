# Persistence Boundaries

**Status:** Canonical development standard — preserves future database integration without
rewriting game engines or hot-path socket handlers.

All persistence, background workers, and external I/O must respect the three demarcation layers
below. Reviewers **must reject** PRs that violate any invariant in the merge checklist.

* **Complementary Specifications:** For client-side storage allocation, Next.js hydration
  sequences, and local caching parameters, see
  [`storage-tier-contract.md`](storage-tier-contract.md). For routing/motion convergence, see
  [`motion-storage-convergence.md`](motion-storage-convergence.md).

---

## Codebase verification targets

| Artifact | Role |
|----------|------|
| [`docs/architecture/persistence-boundaries.md`](persistence-boundaries.md) | Authoritative specification text and pull request checklist |
| [`shared/games/BaseGameEngine.js`](../../shared/games/BaseGameEngine.js) | Domain isolation pointer — engines stay free of hub/network imports |
| [`shared/hub/RoomManager.js`](../../shared/hub/RoomManager.js) | Sole orchestrator for connections, transient memory, phase-boundary dispatch |
| [`shared/hub/phaseBoundaries.js`](../../shared/hub/phaseBoundaries.js) | Deterministic phase gate constants and boundary payload builder |
| [`shared/hub/persistenceAdapter.js`](../../shared/hub/persistenceAdapter.js) | Injectable adapter seam (default noop) for future D1 / Postgres writes |

---

## 1. Domain isolation (`shared/games/`)

Game engines are **pure domain logic**: rules, state transitions, serialization DTOs.

| Allowed in engines | Forbidden in engines |
|--------------------|----------------------|
| Deterministic state mutation (`submitMove`, `startNextRound`) | `import` from `shared/hub/`, `worker/`, `server/`, `frontend/` |
| Phase transitions (`this.phase = "match_over"`) | Socket emit, `fetch`, database clients, queue SDKs |
| `serializeBase` / `serializeForPlayer` / `serializeForSpectator` | Background worker dispatch, `waitUntil`, HTTP callbacks |
| Turn timers via `BaseGameEngine.startTimeout` (domain time only) | Reading connection maps, session tokens, or room membership |

Engines **return results**; they never **side-effect infrastructure**. Hub handlers call engine
methods, then `RoomManager` broadcasts and schedules follow-up work.

Optional future hook: engines may expose a **symmetric** `exportAggregateSnapshot()` for
leaderboard fields at phase boundaries. It must remain free of I/O and is not required for v1.

---

## 2. Phase boundary logic

Aggregate tracking and external persistence fire **only** at deterministic gates:

| Gate | Typical use |
|------|-------------|
| `round_end` | Per-round summaries, round scores, audit append |
| `round_over` | Round completion before inter-round delay |
| `match_over` | Match results, career stats, leaderboard updates |

**Prohibited:** database or queue writes inside move handlers (`domino:move`, `word:submit`,
`sketchDraw:canvasBatch`, etc.) or inside engine methods invoked on every tick.

**Dispatch site:** `RoomManager._broadcastGameStateNow()` — after client broadcasts complete,
via `_maybeDispatchPhaseBoundary()`. Each `(phase, roundNumber)` pair dispatches at most once
per room lifetime.

**Latency rule:** persistence adapters run **fire-and-forget** (non-blocking). Failures log and
retry out-of-band; they must never rollback or delay in-memory game state.

---

## 3. Manager demarcation (`RoomManager`)

`RoomManager` is the **only** hub class that may:

- Own connection maps (`playerToSocket`, `socketToPlayer`, `spectatorToRoom`, …)
- Manage transient room memory lifecycles (`_destroyRoom`, disconnect grace, cleanup loops)
- Inject and invoke `PersistenceAdapter` at phase boundaries
- Schedule hub-level timers (next-round delay, lobby purge, debounced broadcasts)

Socket handlers (`registerHandlers` / `executeSecureEvent`) validate and delegate; they do not
call persistence directly.

Runtime wiring:

| Runtime | `RoomManager` construction | Adapter |
|---------|---------------------------|---------|
| Local `server/` | `new RoomManager(io, { useSocketRooms: true })` | Default noop |
| Production Worker / DO | `new RoomManager(server, { useSocketRooms: false })` | Default noop; future `env` binding injected at Worker shell |

Future database modules implement `PersistenceAdapter` and are passed into the constructor — never
imported from game engines.

---

## Pull request compliance gate (merge block)

Reviewers **must reject** PRs that fail any check below:

- [ ] **Domain isolation** — no new hub/network/database imports under `shared/games/`
- [ ] **Phase boundaries** — aggregate or persistence logic only at `round_end`, `round_over`, or `match_over`; not in per-move handlers
- [ ] **Manager demarcation** — connection lifecycle and persistence dispatch remain in `RoomManager` (or adapter types in `shared/hub/`), not in engines or raw socket handlers
- [ ] **Non-blocking I/O** — persistence adapter calls are fire-and-forget; hot path latency unchanged
- [ ] **Secret safety** — boundary payloads use spectator-safe / `serializeBase` surfaces; no raw secret stores in persistence rows

---

## Reference files

- `shared/games/BaseGameEngine.js` — serialization shell; no hub imports
- `shared/hub/RoomManager.js` — `_broadcastGameStateNow`, `_maybeDispatchPhaseBoundary`
- `shared/hub/phaseBoundaries.js` — gate detection and payload builder
- `shared/hub/persistenceAdapter.js` — noop default adapter
- `shared/hub/registerHandlers.js` — thin delegation to `RoomManager`
- `docs/architecture/platform-spectator-contract.md` — complementary serialization invariants
