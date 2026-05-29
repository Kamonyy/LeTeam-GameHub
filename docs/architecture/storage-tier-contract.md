# Storage Tier Contract and State Lifecycle Specification

**Status:** Canonical development standard — defines client-side persistence and volatile runtime
state boundaries across the LeTeam GameHub platform.

All future feature implementations, module additions, and refactoring patterns must comply with
these structural bounds. This document complements server-side rules in
[`persistence-boundaries.md`](persistence-boundaries.md) (engines, `RoomManager`, phase gates)
and navigation convergence in
[`motion-storage-convergence.md`](motion-storage-convergence.md).

---

## Codebase verification targets

| Artifact | Role |
|----------|------|
| [`docs/architecture/storage-tier-contract.md`](storage-tier-contract.md) | Authoritative client storage specification and pull request checklist |
| [`frontend/lib/session/core-session.ts`](../../frontend/lib/session/core-session.ts) | Canonical `leteam_core_session` read/write/migrate |
| [`frontend/lib/session/ClientStorageContext.tsx`](../../frontend/lib/session/ClientStorageContext.tsx) | App-boot storage gate (`isStorageReady`) |
| [`frontend/lib/player.ts`](../../frontend/lib/player.ts) | Identity API, targeted hard-reset sanitation |
| [`frontend/lib/hub/SocketProvider.jsx`](../../frontend/lib/hub/SocketProvider.jsx) | Identity hydration, `player:register`, hard reset orchestration |
| [`frontend/hooks/useBrowserStorage.ts`](../../frontend/hooks/useBrowserStorage.ts) | Post-mount hydration primitive for game routes |
| [`frontend/games/wordgame/hooks/useScratchpadNotes.ts`](../../frontend/games/wordgame/hooks/useScratchpadNotes.ts) | Domain-isolated scratchpad keys |
| [`frontend/lib/wordgame/lol-audio.ts`](../../frontend/lib/wordgame/lol-audio.ts) | `LolAudioEngine` instantiation and prefs write-back |

---

## 1. Storage allocation matrix

The application enforces a strict separation between disk memory (persistent), tab memory (volatile
navigation), and runtime execution memory (ephemeral network states).

| Storage tier | Identifier key | Scope and lifecycle | Allowlisted properties |
| :--- | :--- | :--- | :--- |
| **Local storage** | `leteam_core_session` | Persistent across restarts. Tied to the device profile. JSON stringified (`CoreSessionV1`, `v: 1`). | Identity credentials (`player.id`, `player.name`, `player.token`), client preferences (`prefs.audioMuted`, `prefs.vol`, `prefs.sketchMuted`). |
| **Local storage** (domain) | `wordgame_notes_{roomId}_{playerId}_r{roundNumber}` | Persistent per room, player, and round. Not part of the core session blob. | Secret Word scratchpad note arrays only (see §3.A). |
| **Session storage** | `hub-navigating-game` | Volatile. Scoped strictly to the active browser tab. Purged on consumption. | Transient navigation target hints (`gameId` strings, or `'1'` for spectate-from-hub) used by chunk-loading wrappers. |
| **Runtime RAM** | In-memory (React / sockets) | Destroyed on page refresh (F5). Regenerates via socket authentication handshake. | WebSocket engine payloads (`gameState`, `lobby`), live match engagement states, temporary UI transaction flags, Sketch-Draw canvas buffers (server-synced, not disk). |

### Domain restrictions

* No active game room indicators, engine matrices, or authorization variables may be stored
  outside of volatile runtime memory.
* **Mafia** hidden roles, **Bara Al-Salafa** secret words/categories, and **Sketch-Draw** canvas
  undo/redo history must remain in runtime memory (and server authority); never in
  `localStorage` / `sessionStorage`.
* Direct calls to raw storage primitives (`window.localStorage.getItem`) inside render loops are
  strictly prohibited. All disk operations must occur within localized `useEffect` lifecycle loops,
  debounced write handlers, or wrapped execution gates (`typeof window !== 'undefined'`).
* Prefer `readCoreSession`, `patchCoreSession`, and `writeCoreSession` from
  [`core-session.ts`](../../frontend/lib/session/core-session.ts) over ad-hoc keys.

### Legacy keys (migrate-only)

On first read, the client may promote and then **delete** these standalone keys into
`leteam_core_session`:

| Legacy key | Migrated field |
| :--- | :--- |
| `leteam_player_id` | `player.id` |
| `leteam_display_name` | `player.name` |
| `leteam_session_token` | `player.token` |
| `sw-lol-audio-muted` | `prefs.audioMuted` |
| `sw-lol-audio-volume` | `prefs.vol` |
| `sketch-draw-sfx-muted` | `prefs.sketchMuted` |

New code must not write legacy keys.

---

## 2. Bootstrapping and hydration sequence

To prevent server-side rendering (SSR) hydration mismatches in Next.js 15, components must follow
a sequential activation lifecycle.

```
[App Boot] ──► ClientStorageProvider (useEffect)
│
├──► Read & migrate legacy root storage keys
├──► Hydrate JSON payload leteam_core_session
├──► Consume hub-navigating-game (read + remove)
└──► Set isStorageReady === true
│
▼
SocketProvider handshake
│
├──► Execute getOrCreatePlayerId()
├──► Dispatch player:register over WebSocket
└──► Trigger setIsIdentityHydrated(true) ──► paint game tree
│
▼
Game route client (optional second gate)
│
├──► useCoreSession / useBrowserStorage isHydrated
└──► notifyRouteContentReady() for view-transition overlay
```

### Hydration invariants

1. **Tree occlusion:** The UI layout tree must block the rendering of interactive routes until
   `ClientStorageProvider` resolves initialization (`isStorageReady`).
2. **Dynamic segment execution:** Game clients must explicitly block board layouts if preference
   hydration is incomplete, defaulting execution states immediately to `HubGameLoadingScreen`.
3. **Token write path:** `player:register` acknowledgements call `setSessionToken` →
   `patchCoreSession` (direct disk write). They do not depend on a React context feedback loop.
4. **No `suppressHydrationWarning` substitute:** Use occlusion and `isHydrated` gates; do not
   render storage-dependent UI on the server.

Provider order (canonical):

`ClientStorageProvider` → `SocketProvider` → `ViewTransitionProvider` (see
[`frontend/app/providers.tsx`](../../frontend/app/providers.tsx)).

---

## 3. Domain-isolated engine contracts

### A. Secret Word scratchpad (`useScratchpadNotes`)

* **Key generation structure:** Notebook entries must execute on dynamically isolated, composite
  keys mapped exactly to the room, player, and current iteration:
  `wordgame_notes_{roomId}_{playerId}_r{roundNumber}`.
* **Write constraint:** Mutations must utilize a 300ms debounced disk write layer to optimize I/O
  overhead on low-power devices.
* **Server sync:** Optional `onSync` pushes notes to spectators via `word:scratchpad:sync`; disk
  is a local convenience layer, not authoritative match state.
* **Eviction gate:** All keys matching the `wordgame_notes_*` prefix must be destroyed
  automatically during hard reset sequences (`clearPlayerLocalGameDataKeepingIdentity`).

### B. Audio engine framework (`LolAudioEngine`)

* **Instantiation phase:** Audio systems must sample configurations from `readCoreSession()`
  exactly once during instantiation (constructor of the exported singleton in `lol-audio.ts`).
* **Runtime synchronization:** Volatile runtime values (`muted`, `volumeScale`) must drive active
  oscillator pipelines. Changes write back directly to `leteam_core_session` via `patchCoreSession`
  but do not rely on a React state feedback loop to update audio execution metrics.
* **Volume debounce:** Master volume persistence uses a 300ms debounced `patchCoreSession` write.
* **Sketch-Draw SFX:** `sketchDrawSound.ts` reads/writes `prefs.sketchMuted` through the same
  core session API (not a separate storage key).
* **Dominoes:** Procedural Web Audio only; no volume prefs in storage tier.

### C. Modules with no client disk tier

| Module | Runtime source |
| :--- | :--- |
| Sketch-Draw | Fabric + socket `sketch-draw:canvas:*` (sync, undo, redo) |
| Mafia | Socket `game:state:update` + `stripNarratorSecrets` on ingest |
| Bara Al-Salafa | Socket `game:state:update` only |
| Dominoes | Socket state + procedural SFX |

---

## 4. Reset pipeline and boundary sanitation

When `StuckResetButton` executes a recovery routine (“كموني ساعندي”), the system must perform a
targeted cleanup rather than executing a destructive global wipe.

```
[Stuck reset activated]
│
├──► React memory eviction: clearClientSessionState()
│      (purges lobby, gameState, chat, sketch-draw UI buffers, flags)
│
├──► Disk cache sanitation: clearPlayerLocalGameDataKeepingIdentity()
│      ├──► Evict: all wordgame_notes_* entries
│      └──► Evict: hub-navigating-game context keys
│
└──► Network re-sync: emit room:leave ──► re-execute player:register with preserved identity
         └──► router.replace('/')
```

**Prohibited:** `localStorage.clear()` or `sessionStorage.clear()` in recovery paths.

### Preservation rules

The canonical identity mapping inside `leteam_core_session` (`player.id`, `player.name`,
`player.token`, and `prefs`) must remain untouched during soft recovery routines. The display
profile is preserved while clearing stale game-specific memory leaks.

### Navigation teardown

`HubBackLink` and `leaveRoom` do **not** require session-storage cleanup; only hard reset and
boot-time consumers remove `hub-navigating-game`. Leaving a room clears runtime state only.

---

## Pull request compliance gate (merge block)

Reviewers **must reject** PRs that fail any check below:

- [ ] **Tier separation** — no room membership, game phase, roles, secrets, or canvas state in
  `localStorage` / `sessionStorage` (except allowlisted keys in §1)
- [ ] **No render-loop I/O** — storage reads/writes only in effects, event handlers, or
  debounced writers; never during render
- [ ] **Hydration gates** — new storage-dependent routes use `ClientStorageProvider` and/or
  `isHydrated` before painting interactive UI
- [ ] **Core session API** — new prefs use `patchCoreSession` / `readCoreSession`, not new root keys
- [ ] **Hard reset safe** — domain disk keys use documented prefixes and are evicted in
  `clearPlayerLocalGameDataKeepingIdentity` when applicable
- [ ] **Server authority** — match truth remains on `RoomManager` / sockets; client disk is
  identity, prefs, and explicitly scoped UX caches only

---

## Reference files

- `frontend/lib/session/core-session.ts` — keys, schema, migration, `HUB_NAVIGATING_KEY`
- `frontend/lib/session/ClientStorageContext.tsx` — boot gate
- `frontend/lib/player.ts` — identity helpers, hard-reset sanitation
- `frontend/lib/hub/SocketProvider.jsx` — register ack, `hardResetPlayer`
- `frontend/components/shared/StuckResetButton.tsx` — user-facing recovery entry
- `frontend/hooks/useCoreSession.ts` — game-route hydration mirror
- `docs/architecture/persistence-boundaries.md` — server-side phase-boundary persistence
