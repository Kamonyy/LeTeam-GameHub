# New Game — Hub Integration Template

Use this document when describing a game you want added to LeTeam GameHub. Fill in every section. Keep game rules in **your description**; this file only defines **where things go** in the repo so implementation stays consistent.

---

## 1. Game identity

| Field | Your value |
|-------|------------|
| **Game ID** (kebab-case, used in URLs & sockets) | e.g. `my-game` |
| **Display name** | |
| **Hub tagline** (one line for home page card) | |
| **Route** | e.g. `/my-game` |
| **Player count** | min: __ max: __ |
| **Enabled on launch?** | yes / no (can ship disabled via flag) |
| **Icon / emoji** (hub card) | |

**Lobby description** (2–4 bullets shown on game page / lobby):

1. 
2. 
3. 

---

## 2. Game rules (for the implementer)

Describe only what is unique to your game:

- **Win condition**
- **Phases** (lobby → … → match over)
- **Turn order** (if any)
- **What each player sees** (hidden vs public info)
- **Host-only actions** (start, kick, settings, cancel match)
- **Auto-advance** (timers between rounds? yes/no)
- **Rematch** (same settings new match? return to lobby only?)

Optional: mermaid or bullet flow for one full round.

---

## 3. Lobby settings

List settings the host picks **before** start (with allowed values):

| Setting key | Type | Default | Notes |
|-------------|------|---------|-------|
| e.g. `roundsToWin` | number | 3 | options: 3, 5, 7 |
| | | | |

---

## 4. Repo checklist (do not skip)

When implementation happens, these locations must be updated. Use your **Game ID** everywhere.

### Shared (server truth)

- [ ] `shared/games/availability.js` — `GAME_ENABLED['your-id']`
- [ ] `shared/games/registry.js` — register engine + min/max players
- [ ] `shared/games/your-id/YourGameEngine.js` — core logic
- [ ] `shared/hub/constants.js` — defaults, delays, player limits (if not generic)
- [ ] `shared/hub/validate.js` — allow `gameType === 'your-id'`
- [ ] `shared/hub/RoomManager.js` — `createRoom` default settings, `startGame`, `updateRoomSettings`, any `handleYourGame*` methods, `broadcastGameState` quirks
- [ ] `shared/hub/registerHandlers.js` — socket events `yourgame:action` → RoomManager

### Frontend (UI)

- [ ] `frontend/lib/hub/games-registry.ts` — catalog entry (tagline, href, players)
- [ ] `frontend/app/your-id/page.tsx` — route + dynamic client import + loading screen
- [ ] `frontend/games/your-id/YourGameClient.tsx` — main shell (lobby / pre-game / in-game)
- [ ] `frontend/games/your-id/types.ts` — `YourGameState`, phases, settings
- [ ] `frontend/games/your-id/components/` — Lobby, Board, modals
- [ ] `frontend/games/your-id/your-game.css` — scoped styles (prefix e.g. `mg-` or `yg-`)
- [ ] `frontend/lib/hub/SocketProvider.jsx` — handle `game:state:update` when `gameType === 'your-id'`; expose actions on context
- [ ] `frontend/hooks/useSocket.d.ts` — types for new socket actions

### Optional

- [ ] `shared/games/your-id/data/` — static JSON assets
- [ ] `frontend/components/hub/GameAboutPanel.tsx` — variant if special about sidebar
- [ ] Game-specific celebration / sfx events (pattern: `word:guessed:celebration`)

---

## 5. Socket contract (template)

### Shared hub events (already exist — use as-is)

| Event | Direction | Purpose |
|-------|-----------|---------|
| `player:register` | C→S | Session |
| `room:create` | C→S | `{ gameType: 'your-id' }` |
| `room:join` / `room:leave` | C→S | |
| `room:settings:update` | C→S | Lobby settings |
| `game:start` | C→S | Host starts |
| `game:cancel` | C→S | Host ends → lobby |
| `game:rematch:request` | C→S | Host rematch (if supported) |
| `game:state:request` | C→S | Resync |
| `lobby:state` | S→C | Room roster + settings |
| `game:state:update` | S→C | Per-player serialized state |
| `game:error` | S→C | User-visible errors |

### Game-specific events (you define)

| Event | Direction | Payload | Ack returns |
|-------|-----------|---------|-------------|
| `yourgame:example` | C→S | `{ ... }` | `{ success, state? }` or `{ error }` |

**Serialized state** must include:

```ts
{
  gameType: 'your-id',
  stateVersion?: number,  // recommended for wordgame-style merge
  phase: '...',
  playerIds: string[],
  // ... only what clients need; secrets per viewer via serializeForPlayer(viewerId)
}
```

---

## 6. Client UI states

Map your game to these **screens** (check what applies):

| Screen | When |
|--------|------|
| Game disabled | `!isGameActive('your-id')` |
| Pre-lobby (name + create/join) | Not in room |
| Lobby | `lobby.status === 'lobby'` && `lobby.gameType === 'your-id'` |
| In-game | `lobby.status === 'playing'` or `'finished'` |
| Match over overlay | Your `phase === 'match_over'` (if any) |

**Client guards (required pattern):**

- `lobby` filtered: `lobby?.gameType === 'your-id' ? lobby : null`
- `gameState` filtered: must include `gameType === 'your-id'`
- Auto-join from `?room=CODE` only when not already in another game’s room

---

## 7. Engine responsibilities (short)

Your engine class should provide:

| Method / behavior | Required? |
|-------------------|-----------|
| `constructor(playerIds, settings)` | yes |
| `serializeForPlayer(viewerId)` | yes |
| Mutations return `{ success, error? }` | yes |
| `phase` includes terminal `match_over` (or equivalent) | if match-based |
| `_bumpStateVersion()` on meaningful changes | recommended |

RoomManager calls `createEngine(playerIds, room.settings)` on start/rematch.

---

## 8. Files to create (skeleton)

```
shared/games/{game-id}/
  {GameName}Engine.js

frontend/games/{game-id}/
  {GameName}Client.tsx
  types.ts
  {game-id}.css
  components/
    {GameName}Lobby.tsx
    {GameName}Board.tsx

frontend/app/{game-id}/
  page.tsx
```

---

## 9. Conventions

- **Game ID** = folder name = `gameType` string = catalog `id`
- **No secrets in broadcast** — use `serializeForPlayer` to hide opponent hidden info
- **Host** = `lobby.hostId`; only host starts / rematch / cancel (unless you specify otherwise)
- **Styling** — scope CSS to your prefix; reuse hub tokens (`sw-`, `hub-`) only when intentionally matching another game
- **Static export** — no server components for game pages; use `'use client'` clients

---

## 10. Acceptance checklist (for QA)

- [ ] Home page card appears (or shows disabled reason)
- [ ] Create room → friend joins via link `/{game-id}?room=XXXXXXXX`
- [ ] Wrong game type in URL cannot hijack another game’s lobby state
- [ ] Host can start with min players; settings apply
- [ ] Both players see consistent state after each action
- [ ] Disconnect / reconnect resyncs (`game:state:request`)
- [ ] Cancel match returns everyone to lobby
- [ ] Rematch (if applicable) restarts without stale UI

---

## Example filled header (reference only)

```text
Game ID:     card-duel
Display:     Card Duel
Route:       /card-duel
Players:     2–4
Enabled:     no (ship behind flag first)
```

---

*Copy this file per game, fill the tables, and attach your rules in §2. Hand the completed doc to implementation.*
