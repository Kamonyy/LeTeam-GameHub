# LeTeam Game Hub

A browser-based **multiplayer game hub** for playing real-time party games with friends. Create or join a room with a short code, pick a game, and stay in sync over WebSockets—no install required.

**Games**

- **Secret Word** — Two-player word guessing (custom words or League champions); built for voice chat.
- **برا السالفة** — Arabic social deduction for 3–12 players (who’s out of the loop?).
- **Mafia** — Face-to-face Werewolf-style party game for 6–12 in the room (one narrator + 5–11 with roles). The site is a narrator console and secret role cards; discussion and votes happen in person.
- **Dominoes** — Block dominoes for 2–4 (currently offline in the hub while it’s being polished).

**Stack:** Next.js static frontend, shared game engines, Socket.io hub (local dev) or Cloudflare Worker (production).

**Live:** https://gamehub.mohamed-hussein.net

## Local dev

```bash
npm run install:all
cp server/.env.example server/.env
cp frontend/.env.example frontend/.env.local
npm run dev
```

## Deploy

```bash
npm run deploy
```

## Layout

```
shared/     Game engines, hub logic, socket handlers
worker/     Cloudflare Worker entry
server/     Local dev Socket.io server
frontend/   Next.js static export
```
