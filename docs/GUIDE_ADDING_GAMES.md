# Guide: Adding a New Game

**Audience:** Developers onboarding a new title into LeTeam Game Hub.  
**Prerequisites:** Read [ARCHITECTURE.md](./ARCHITECTURE.md) for hub flow and [SECURITY_PERFORMANCE.md](./SECURITY_PERFORMANCE.md) for guardrails.  
**Setup:** [README.md](../README.md) (`npm run dev`, env files).

Follow these steps **in order**. Skipping a step (especially registry, events, or `serializeForPlayer`) causes production-only failures or secret leaks.

---

## Overview

| Step | Location | Outcome |
|------|----------|---------|
| 0 | Naming | Stable `gameType` id everywhere |
| 1 | `shared/games/<game-id>/` | Authoritative engine |
| 2 | `shared/games/registry.js` | Hub can instantiate engine |
| 3 | `shared/hub/` | Socket events + `RoomManager` methods |
| 4 | `frontend/games/<game-id>/` | UI, lobby, routing |
| 5 | Verification | Local + static build |

---

## Step 0: Naming and IDs

Choose one **kebab-case** `gameType` string (examples: `wordgame`, `bara-alsalafa`, `sketch-draw`). Use it consistently in:

| Surface | Example |
|---------|---------|
| [`shared/games/registry.js`](../shared/games/registry.js) | `GAMES['my-game']` |
| Socket events (recommended) | `my-game:action:request` |
| Frontend route | `frontend/app/my-game/page.tsx` |
| `useGameRoom({ gameType: 'my-game' })` | Client hook |
| [`frontend/lib/hub/games-registry.ts`](../frontend/lib/hub/games-registry.ts) | Catalog card `id` |

**Done when:** You can grep the repo for a single id with no typos.

---

## Step 1: Backend Engine (`shared/games/<game-id>/`)

### 1.1 Extend `BaseGameEngine`

Create `shared/games/<game-id>/MyGameEngine.js` (or `.ts` if the repo pattern allows) importing:

```javascript
import { BaseGameEngine } from '../BaseGameEngine.js';

export class MyGameEngine extends BaseGameEngine {
  constructor(playerIds, settings = {}) {
    if (playerIds.length < MIN || playerIds.length > MAX) {
      throw new Error('My Game requires N–M players');
    }
    super(playerIds, settings);
    // Initialize game-specific fields (phase, scores, hands, etc.)
  }

  serializeForPlayer(viewerId) {
    // Required — see §1.3
  }

  // nextTurn() only if your game uses turn rotation — see §1.4
}
```

Reference implementations:

| Game | Engine path |
|------|-------------|
| Turn-based tiles | [`shared/games/dominoes/DominoEngine.js`](../shared/games/dominoes/DominoEngine.js) |
| Phase / social | [`shared/games/bara-alsalafa/BaraAlsalafaEngine.js`](../shared/games/bara-alsalafa/BaraAlsalafaEngine.js) |
| Drawing side channel | [`shared/games/sketch-draw/SketchDrawEngine.js`](../shared/games/sketch-draw/SketchDrawEngine.js) |

### 1.2 Constructor contract

- **Signature:** `constructor(playerIds, settings)` — always call `super(playerIds, settings)` first after validating count.
- **`super`** sets: `playerIds`, `players` Map, `phase` (`'setup'`), `roundNumber`, `timers`, `stateVersion`, `lastAction`.
- Validate `settings` shape (integers, enums, host-only fields) in the constructor; reject invalid configs early.
- Do **not** read `process.env` or touch the filesystem.

### 1.3 `serializeForPlayer(playerId)` — authoritative filtering

This method is the **only** way match state reaches clients via `game:state:update`. `RoomManager._broadcastGameStateNow` calls it once per connected viewer.

#### Rules (mandatory)

| Rule | Rationale |
|------|-----------|
| Always include `...this.serializeBase(viewerId)` | Shared metadata: `stateVersion`, `phase`, `roundNumber`, `playerIds`, `lastAction` |
| Return **new objects** every time | `{ ...this.scores }`, `.map((x) => ({ ...x }))` — never return internal arrays/maps by reference |
| Never leak secrets to wrong viewers | Hidden cards, opponent roles, secret words, narrator-only Mafia data |
| Omit or empty **transient** bulk data | Keys in `BaseGameEngine.TRANSIENT_KEYS`: `canvasBuffer`, `canvasUndoStack`, `canvasRedoStack` — use separate socket events for live streams |
| Include `gameType` in payload | Frontend merge/redaction helpers often key off `gameType` |
| Bump `stateVersion` on meaningful changes | Call `_bumpStateVersion()` from engine methods or rely on `startTimeout` expiry |

#### Anti-patterns

```javascript
// BAD — shared reference; mutating client could corrupt server state
return { myHand: this.hands[viewerId] };

// BAD — exposes all hands
return { hands: this.hands };

// GOOD
return {
  ...this.serializeBase(viewerId),
  gameType: 'my-game',
  myHand: [...(this.hands[viewerId] ?? [])],
  opponents: this.playerIds.map((id) => ({
    id,
    handCount: id === viewerId ? undefined : (this.hands[id]?.length ?? 0),
  })),
};
```

#### Sketch Draw pattern (high-frequency data)

During `drawing` phase, **do not** put live strokes in `serializeForPlayer`:

```javascript
// shared/games/sketch-draw/SketchDrawEngine.js (conceptual)
if (this.phase === 'round_end' || this.phase === 'match_over') {
  base.canvasBuffer = this.canvasBuffer.map((b) => ({ ...b, points: [...b.points] }));
} else {
  base.canvasBuffer = [];
}
```

Live strokes use `sketch-draw:canvas:stroke:batch`; rejoin uses `sketch-draw:canvas:recovery:request` → `sketch-draw:canvas:sync`. See [SECURITY_PERFORMANCE.md](./SECURITY_PERFORMANCE.md).

#### Bara Alsalfafa pattern (per-viewer secrets)

[`BaraAlsalafaEngine.serializeForPlayer`](../shared/games/bara-alsalafa/BaraAlsalafaEngine.js) gates `secretWord`, role text, and category by phase and `viewerId === outcastId`. Mirror that style for any hidden-information game.

### 1.4 Turn and phase advancement

Choose **one** strategy:

| Strategy | When to use | Implementation |
|----------|-------------|----------------|
| **`nextTurn()` override** | Strict turn rotation (e.g. dominoes) | Override in engine; hub may call after moves |
| **`phase` + `phaseEndsAt`** | Timed phases (Bara, Sketch) | Hub adds `roomId` to `_baraPhaseRoomIds` / `_sketchPhaseRoomIds` in `startGame`; interval in `RoomManager` |
| **`this.startTimeout(key, durationMs, onExpire)`** | One-off deadlines inside engine | Clears prior timer for `key`; bumps `stateVersion` on expire |

`nextTurn()` on the base class **throws** until overridden. Most party games use phases instead.

### 1.5 Lifecycle: `teardown()`

Inherited `teardown()` clears all engine `timers`. Override only if you add non-timeout resources. `RoomManager._destroyRoom` always calls `room.game?.teardown?.()`.

**Done when:** Engine unit logic runs in isolation; `serializeForPlayer` returns different shapes for two viewer ids when secrets differ.

---

## Step 2: Register the Engine

### 2.1 `shared/games/registry.js`

```javascript
import { MyGameEngine } from './my-game/MyGameEngine.js';
import { MY_MIN_PLAYERS, MY_MAX_PLAYERS } from '../hub/constants.js';

export const GAMES = {
  // ...existing games
  'my-game': {
    enabled: GAME_ENABLED['my-game'],
    minPlayers: MY_MIN_PLAYERS,
    maxPlayers: MY_MAX_PLAYERS,
    createEngine: (playerIds, settings) => new MyGameEngine(playerIds, settings),
  },
};
```

### 2.2 `shared/games/availability.js`

Add `GAME_ENABLED['my-game']` (feature flag for production).

### 2.3 `shared/hub/constants.js`

Define:

- `MY_MIN_PLAYERS` / `MY_MAX_PLAYERS`
- `DEFAULT_MY_GAME_SETTINGS` (lobby defaults)
- Optional: `RATE_LIMITS.myGameAction` entries

Wire lobby defaults in `RoomManager.createRoom` settings branch (search for `gameType === 'sketch-draw'` as template).

**Done when:** `getGame('my-game')` returns a definition and `isGameEnabled('my-game')` is true in dev.

---

## Step 3: Isomorphic Socket Registration (`shared/hub/`)

### 3.1 Add `RoomManager` methods

In [`shared/hub/RoomManager.js`](../shared/hub/RoomManager.js), add methods that:

1. Resolve context: `_getPlayerContext(socket)` → `{ playerId, room }` or `{ error }`
2. Assert `room.gameType === 'my-game'` and `room.game` exists
3. Call `room.game.yourAction(playerId, payload)`
4. On success: `this.broadcastGameState(room.id)` (or `broadcastLobbyState` for lobby-only)
5. Return `{ success: true }` or `{ error: '...' }` — **never** throw to the client

For `startGame`, if you need hub timers, add `roomId` to the appropriate `Set` (see `_sketchPhaseRoomIds`).

### 3.2 Declare events in `eventRegistry.js`

Add a thin handler and an `ALL_EVENTS` entry. **Every production event should go through this registry.**

#### Mandatory `EventConfig` fields

| Field | Required | Description |
|-------|----------|-------------|
| `event` | Yes | Socket event name (use `my-game:` prefix for game-specific) |
| `actionKey` | Yes* | Rate-limit bucket id (*if `rateLimit` set) |
| `rateLimit` | Recommended | Number from `RATE_LIMITS` in [`constants.js`](../shared/hub/constants.js) |
| `handler` | Yes | `(socket, payload, roomManager) => result` |
| `requiresRegistered` | Usually yes | Player must have completed `player:register` |
| `requiresAuth` | For sensitive actions | Payload must include valid `playerId` + `sessionToken` |
| `validate` | Recommended | Returns error string or `null` |
| `emitGameError` | Optional | Emit `game:error` on handler failure |
| `validationToast` | Optional | Emit `protocol:error` on validation failure |

#### Example entry

```javascript
function myGameAction(socket, payload, roomManager) {
  return roomManager.handleMyGameAction(socket, payload);
}

// Inside ALL_EVENTS:
{
  event: 'my-game:action:request',
  actionKey: 'myGameAction',
  rateLimit: RATE_LIMITS.move,
  requiresRegistered: true,
  requiresAuth: true,
  validate: validatePlainObject,
  emitGameError: true,
  handler: myGameAction,
},
```

Existing sketch-draw canvas entries (copy pattern for high-frequency events):

| Event | `actionKey` | `rateLimit` |
|-------|-------------|-------------|
| `sketch-draw:canvas:stroke:batch` | `sketchDrawCanvasBatch` | 120 |
| `sketch-draw:canvas:recovery:request` | `sketchDrawCanvasRecovery` | 10 |

### 3.3 Validators

Add validators in [`shared/hub/validate.js`](../shared/hub/validate.js). Reuse `validatePlainObject`, `validatePlayerId`, `validateSessionToken` where possible.

**Done when:** `registerHandlers` automatically binds your event (no changes needed in `server/` or `worker/`).

---

## Step 4: Frontend Client (`frontend/games/<game-id>/`)

### 4.1 Directory layout

```
frontend/games/my-game/
  MyGameClient.tsx           # Main orchestrator ('use client')
  types.ts                   # GameState, lobby types
  components/
    MyGameLobby.tsx          # Pre-game UI
    MyGameBoard.tsx          # In-match UI
frontend/app/my-game/
  page.tsx                   # Dynamic import of MyGameClient
```

### 4.2 App route

`frontend/app/my-game/page.tsx`:

```tsx
import dynamic from 'next/dynamic';

const MyGameClient = dynamic(() => import('@/games/my-game/MyGameClient'), {
  ssr: false,
});

export default function MyGamePage() {
  return <MyGameClient />;
}
```

Use `ssr: false` when the client depends on `window` / socket (matches existing game pages).

### 4.3 `MyGameClient.tsx` orchestration

Pattern from [`frontend/games/dominoes/DominoesClient.tsx`](../frontend/games/dominoes/DominoesClient.tsx):

```tsx
'use client';

import { useGameRoom, useCoreSession } from '@/hooks/useSocket';
import GameClientFrame from '@/components/ui/GameClientFrame';
import GameLobbyPendingOverlay from '@/components/hub/GameLobbyPendingOverlay';
import { isGameActive, getGameEntry } from '@/lib/hub/games-registry';

export default function MyGameClient() {
  const { isHydrated } = useCoreSession();
  const enabled = isGameActive('my-game');

  const socket = useGameRoom({
    gameType: 'my-game',
    gameEnabled: enabled,
    basePath: '/my-game',
    roomParam: searchParams.get('room'),
    spectateParam: /* ... */,
  });

  if (!isHydrated) {
    return <GameLobbyPendingOverlay message="Loading session…" />;
  }

  if (!enabled) {
    return /* InactiveGameScreen */;
  }

  return (
    <GameClientFrame
      title="My Game"
      connected={socket.connected}
      onLeave={/* leave room */}
    >
      {!socket.gameState ? (
        <MyGameLobby lobby={socket.lobby} settingsSlot={/* rules UI */} />
      ) : (
        <MyGameBoard state={socket.gameState} />
      )}
    </GameClientFrame>
  );
}
```

### 4.4 `GameClientFrame`

[`frontend/components/ui/GameClientFrame.tsx`](../frontend/components/ui/GameClientFrame.tsx) provides:

- Viewport-safe layout (`h-dvh`, mobile safe-area)
- Header, connection indicator, unified leave/cancel actions
- Props: `title`, `subtitle`, `onLeave`, `onCancelMatch`, `connected`, `children`, etc.

### 4.5 `GameLobbyCore` and `settingsSlot`

[`frontend/components/ui/GameLobbyCore.tsx`](../frontend/components/ui/GameLobbyCore.tsx) — pass game-specific rules and options via **`settingsSlot`**:

```tsx
<GameLobbyCore
  lobby={lobby}
  playerId={playerId}
  roomPath="/my-game"
  onStartGame={startGame}
  onLeave={onLeave}
  settingsSlot={<MyGameSettingsPanel settings={lobby.settings} onChange={updateRoomSettings} />}
  aboutSlot={<GameAboutPanel /* ... */ />}
/>
```

Examples: [`frontend/games/mafia/components/MafiaLobby.tsx`](../frontend/games/mafia/components/MafiaLobby.tsx), [`frontend/games/sketch-draw/components/SketchDrawLobby.tsx`](../frontend/games/sketch-draw/components/SketchDrawLobby.tsx).

### 4.6 `useGameRoom`

[`frontend/hooks/useGameRoom.ts`](../frontend/hooks/useGameRoom.ts):

| Option | Purpose |
|--------|---------|
| `gameType` | Must match registry key |
| `gameEnabled` | From `isGameActive()` |
| `basePath` | Route prefix for auto-join |
| `roomParam` / `spectateParam` | URL query handling via `useRoomAutoJoin` |

Returns lobby + `gameState` + actions (`createRoom`, `joinRoomOrSpectate`, `startGame`, game-specific emits on `actionsRef`). Use typed `gameState` in your `types.ts`.

### 4.7 Hydration gate

Never read `localStorage` during the first server render. Gate on `useCoreSession().isHydrated` (see [SECURITY_PERFORMANCE.md](./SECURITY_PERFORMANCE.md)).

### 4.8 Hub catalog

Add an entry to [`frontend/lib/hub/games-registry.ts`](../frontend/lib/hub/games-registry.ts) so the home page lists the game.

### 4.9 Client-side redaction (optional)

If any server mistake could leak narrator-only data, add a client sanitizer like [`frontend/games/mafia/lib/redactMafiaState.ts`](../frontend/games/mafia/lib/redactMafiaState.ts) and merge in `SocketProvider` (search `sanitizeMafiaClientState`).

**Done when:** You can create a room, start a match, play one full round, and refresh the page mid-game without desync.

---

## Step 5: Verification Checklist

### Local functional

- [ ] `npm run dev` — hub on **3001**, UI on **3000**
- [ ] `player:register` succeeds (no `SESSION_INVALID` loop)
- [ ] Create room, second browser joins, host starts game
- [ ] Actions hit your `my-game:*` events and update UI via `game:state:update`
- [ ] Disconnect tab 30s, reconnect — player slot restored (unless you intentionally remove)
- [ ] Spectate mode (if supported)
- [ ] Host leave / empty room destroys room (no ghost lobbies)

### Static export / production constraints

- [ ] `npm run build` succeeds (`frontend/out` generated)
- [ ] No new Node-only imports under `shared/`
- [ ] No secrets in client bundle
- [ ] High-frequency UI uses narrow contexts (`useGameTimer`, `useSketchCanvas`) — not root socket state

### Security spot-check

- [ ] Two clients cannot see each other's hidden `serializeForPlayer` fields (inspect WebSocket payloads)
- [ ] Unauthenticated socket cannot invoke `requiresAuth` events
- [ ] Rate limit triggers after spamming an action

---

## Appendix A: Mafia narrator secrets

Server: `_lobbySettingsForViewer` strips `roleAssignments` for non-host. Client: `stripNarratorSecrets` in socket merge path. Follow both layers for any host-only config.

---

## Appendix B: Secret Word soft disconnect

[`shouldPreserveWordGameRoom`](../shared/hub/RoomManager.js) keeps a disconnected player in an active word-game session so a phone call does not end the duel. Only opt into similar behavior with explicit product approval.

---

## Appendix C: Checklist file map

| Task | Primary files |
|------|----------------|
| Engine | `shared/games/<id>/*Engine.js` |
| Register game | `shared/games/registry.js`, `availability.js` |
| Constants | `shared/hub/constants.js` |
| Socket API | `shared/hub/eventRegistry.js`, `RoomManager.js`, `validate.js` |
| UI | `frontend/games/<id>/`, `frontend/app/<id>/page.tsx` |
| Catalog | `frontend/lib/hub/games-registry.ts` |

---

## Document Index

| Document | Contents |
|----------|----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Topology, state authority, pipeline |
| [SECURITY_PERFORMANCE.md](./SECURITY_PERFORMANCE.md) | Memory, bandwidth, auth, React boundaries |
