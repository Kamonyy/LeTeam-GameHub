# Platform Spectator Contract

**Status:** Compliance gates **activated** — canonical development standard.  
Review protocols for all subsequent development vectors **explicitly reject** non-compliant
architectures (CSS-only spectator blocking, asymmetric `serializeBase` leaks, write handlers
without `_requireConnectedPlayer`).

All feature branches must demonstrate **static and runtime compliance** before `main` merge.  
**Reference implementation:** Secret Word (`wordgame`). Upcoming spectator modules must close
structural gaps against this baseline prior to merge.

---

## Codebase verification targets

| Artifact | Role |
|----------|------|
| [`docs/architecture/platform-spectator-contract.md`](platform-spectator-contract.md) | Authoritative specification text and pull request checklist |
| [`shared/games/BaseGameEngine.js`](../../shared/games/BaseGameEngine.js) | Structural class-level pointer to specification bounds |
| [`README.md`](../../README.md) | Upstream architectural **merge block** designation |

---

## Invariant enforcement matrix

| Gate target | System enforcement action | Verification check |
|-------------|---------------------------|-------------------|
| **Data integrity** — engine serialization paths | Audit `serializeBase` for symmetric uniformity; enforce dual overrides on `serializeForPlayer` and `serializeForSpectator` | No asymmetric or secret fields escape via base spread alone; non-players receive spectator DTO |
| **Boundary strictness** — `RoomManager` isolation channels | Standardize write handlers through `_requireConnectedPlayer`; separate social plane from engine serialization paths | Spectator sockets in `spectatorToRoom` cannot mutate play state; chat uses `_getRoomIdForSocket` only |
| **UI partitioning** — frontend client render trees | Unmount interactive layout components strictly on `isSpectator`; forbid CSS-only hiding utilities | No `pointer-events-none` / overlay substitutes; player-only hooks absent from spectator tree |

---

## 4. Client lifecycle and reconnection invariants

To preserve the integrity of the stateful reconnection grace window, client-side lifecycle hooks
must **never** issue destructive connection teardown payloads speculatively.

### Lifecycle event boundaries

**Prohibited actions:** Do not bind `room:leave` or forced `socket.disconnect()` emitters to browser
lifecycle events such as `pagehide`, `beforeunload`, or `visibilitychange`.

**Intentional vs. unintentional disconnects:** The system strictly separates passive network socket
drops from explicit state termination. Only user-initiated leave controls (hub exit, in-game leave,
spectator “Stop watching”) may dispatch `room:leave`.

### Lifecycle resolution matrix

| Client lifecycle event | Network protocol action | Server state resolution |
|------------------------|-------------------------|------------------------|
| **Page refresh / F5 reload** | Abrupt socket termination without signaling departure. | Retains player slot in `room.players`. Waits for `player:register` retry within the grace window. |
| **Tab backgrounding / mobile throttling** | Transient transport drop or stream pause. | Session remains warm. State synchronization resumes immediately upon tab focus restoration. |
| **Explicit navigation out / leave UI** | Dispatch explicit `room:leave` via user input. | Complete room teardown. Unanchors mapping matrices and releases player allocation slots immediately. |

### Reconnection short-circuit rules

**Server validation entry:** On `player:register`, if the matching `playerId` exists within an
active room roster, the server must clear duplicate spectator maps and return `reconnected: true`
with `isSpectator: false`.

**Client bypass automation:** The initialization hook `useRoomAutoJoin` must wait until
`reconnectAssessed === true` (registration ack fully applied). If
`reconnectedRoomId === roomParam` (normalized room code), the hook must **freeze execution** and
halt any competing `room:join` or `room:spectate` dispatches to eliminate state race conditions.
`joinRoomOrSpectate` must **not** auto-demote a failed join to spectator; spectate only when
`?spectate=1` or an explicit spectate action is requested.

**UI roster override:** Game clients must treat membership in `lobby.players` as authoritative:
`viewingAsSpectator = isSpectator && !isRoomPlayer`, so hydration flicker cannot mount the
spectator tree for an active player.

---

## Enforcement invariants (mandatory)

### 1. Data integrity (`BaseGameEngine` / game engines)

Any structural addition to `BaseGameEngine` or a game engine requires **deterministic auditing**
so that **zero asymmetric fields** leak through the public `serializeBase` primitive shell.

| Check | Requirement |
|-------|-------------|
| New `serializeBase` field | Vetted symmetric for all viewers |
| Player-specific or secret data | Absent from base, or overridden in **both** `serializeForPlayer` and `serializeForSpectator` |
| Non-participant sockets | Routed to spectator DTO; never through player-relative maps (`_opponentId`, etc.) |

### 2. Boundary strictness (`RoomManager`)

Network routing must maintain **absolute isolation of write execution paths**. Non-player sockets
(entries in `spectatorToRoom`) must be **dropped at the server boundary** on state mutations.

| Check | Requirement |
|-------|-------------|
| Game writes | `_requireConnectedPlayer(room, playerId)` on every handler that mutates play state |
| Game reads | `_getPlayerContext` resolves spectators via `_findRoomForSpectator` |
| Chat / social | `_getRoomIdForSocket` only — no engine secret access |

### 3. UI partitioning (frontend game clients)

View trees must enforce **structural component unmounting** when `isSpectator === true` to guarantee
**zero-footprint rendering**: no background hook allocation, no debounced side effects, no static-export hydration failures.

| Check | Requirement |
|-------|-------------|
| Interactivity | Separate spectator board or `{!isSpectator && …}` mounts — **not** `pointer-events-none` / overlays |
| Hooks | Spectator path must not invoke player-only hooks (`useScratchpadNotes`, move handlers, etc.) |
| Entry | `joinRoomOrSpectate` + optional `?spectate=1` via `useRoomAutoJoin` |

### Pull request compliance gate (merge block)

Reviewers **must reject** PRs that fail any check below:

- [ ] **Data integrity** — `serializeBase` / serializer diff audited; dual overrides present where needed
- [ ] **Boundary strictness** — touched write handlers use `_requireConnectedPlayer`; read/sync uses `_findRoomForSpectator` via `_getPlayerContext`
- [ ] **UI partitioning** — decoupled spectator mount; no CSS-only interactivity blocking
- [ ] **Lifecycle** — no `room:leave` / forced disconnect on `pagehide`, `beforeunload`, or `visibilitychange`
- [ ] **Rollout** — non–Secret Word modules document gaps closed or explicitly out of scope

---

## 1. Unified serialization matrix

The boundary between base structural fields and viewer-specific DTOs is fixed as follows.

| Data layer | Access control | Mutability / scope |
|------------|----------------|-------------------|
| **`serializeBase`** | Symmetric public fields only (`stateVersion`, `phase`, `roundNumber`, `playerIds`, and future fields vetted for all viewers) | Strict read-only shell |
| **`serializeForPlayer`** | Asymmetric, identity-bound view; explicit secret fields allowed | Context-isolated per `viewerId` |
| **`serializeForSpectator`** | Sanitized public aggregation; zero player-relative pointers | Context-isolated; non-participant branch |

### Invariant rule

Any field added to `serializeBase` must be vetted for **asymmetry**:

- If it is player-specific or non-public, it must **not** remain only on the base object.
- It must be **absent from `serializeBase`**, or **explicitly overridden** in both
  `serializeForPlayer()` and `serializeForSpectator()` (or equivalent non-player branch).

Today, `lastAction` on the base spread is overridden in Word Game via
`_sanitizeLastActionForClient()` on both paths. New engines must follow the same pattern.

### Engine implementation checklist

1. `serializeForPlayer(viewerId)` — if `!playerIds.includes(viewerId)`, delegate to spectator DTO.
2. `serializeForSpectator(viewerId)` — neutral payload; phase-gated secrets; `canConfirmGuessed: false` (or equivalent).
3. Never expose raw secret stores (`wordsForGuesser`, hands, roles, etc.) outside approved phases.

---

## 2. Execution routing guardrails (`RoomManager`)

### Authoritative pipeline rule

| Operation class | Required guard | Spectator behavior |
|-----------------|----------------|-------------------|
| **Write** (moves, submits, confirms, kicks, settings that mutate play) | `_requireConnectedPlayer(room, playerId)` | Reject with standard protocol error (`Player not in room` / handler-specific message). No state mutation. |
| **Read** (sync, reconnect, lobby broadcast consumption) | `_getPlayerContext` → fall back to `_findRoomForSpectator` | Resolve `room` + `roomId` without polluting player-relative engine maps. |

### Hub multi-tenancy (communication plane)

- **`spectatorToRoom`** — socket membership for read/sync and chat routing.
- **`_getRoomIdForSocket`** — `playerToRoom ?? spectatorToRoom` for room-scoped chat.
- **Chat** (`handleChatSend` → `_emitToRoom`) — spectators are full participants on the **social plane** only.
- **Game state** — delivered only via per-viewer `serializeForPlayer` / `serializeForSpectator`; never via chat.

### `spectateRoom` whitelist

Extend `room.gameType` allowlist when onboarding a game; reuse `room:spectate` (no per-game socket event).

---

## 3. Frontend gating protocol

All game clients (**Dominoes**, **Bara Al-Salafa**, **Sketch-Draw**, **Mafia**, **Secret Word**) must:

1. Consume **`isSpectator`** from `useGameRoom` / socket session.
2. Use **`joinRoomOrSpectate`** (and optional `?spectate=1`) for mid-game entry.
3. Mount a **decoupled read-only tree** when `isSpectator === true`.

### Mandatory: conditional mount, not CSS blocking

- **Do:** `{!isSpectator && <InteractiveBoard />}` or a dedicated `*SpectatorBoard` component.
- **Do not:** Rely on `pointer-events-none`, overlays, or blurred panels to “disable” play UI.
- **Reason:** Static export safety, no spurious hook execution (e.g. debounced `localStorage` scratchpads).

### Shared client patterns

| Concern | Pattern |
|---------|---------|
| Auto-join | `useRoomAutoJoin` + `spectateParam` + `joinRoomOrSpectate` |
| Lobby vs match | `inLobby && !isSpectator`; `spectatorWaiting` when lobby + spectator |
| Banner | Top-docked spectator banner + optional `lobby.spectators` roster |
| Actions | No rematch/host/cancel controls unless product explicitly allows |

---

## 5. Module rollout status

| Game | Engine spectator DTO | `spectateRoom` | Decoupled client tree |
|------|----------------------|----------------|------------------------|
| **Secret Word** | Yes (`serializeForSpectator`) | Yes | Yes (`WordGameSpectatorBoard`) |
| **Dominoes** | Partial (`isPlayer` in `serializeForPlayer`) | Yes | Partial (`isSpectator` props on shared board) |
| **Bara Al-Salafa** | — | — | — |
| **Sketch-Draw** | — | — | — |
| **Mafia** | — | — | — |

New spectator work on remaining modules must close gaps against sections 1–3 before sign-off.

---

## 6. Reference files

- `shared/games/BaseGameEngine.js` — `serializeBase` shell
- `shared/games/wordgame/WordGameEngine.js` — reference spectator serializer
- `shared/hub/RoomManager.js` — `spectateRoom`, `_getPlayerContext`, `_requireConnectedPlayer`
- `shared/hub/eventRegistry.js` — `room:spectate`, `room:join` + `joinRoomOrSpectate` fallback
- `frontend/hooks/useGameRoom.ts` — `isSpectator` wiring
- `frontend/games/wordgame/WordGameClient.tsx` — reference client gating
- `frontend/lib/hub/SocketProvider.jsx` — identity hydration, `player:register`, no lifecycle leave
- `frontend/lib/hub/useRoomAutoJoin.ts` — reconnect short-circuit (`reconnectAssessed`, `reconnectedRoomId`)
- `frontend/lib/hub/resolveClientIsSpectator.ts` — `lobby.players` roster precedence
- [`docs/architecture/persistence-boundaries.md`](persistence-boundaries.md) — domain isolation and phase-boundary persistence gates
