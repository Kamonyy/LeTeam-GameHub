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

The `server/` Socket.io process is for **local/LAN development only** (`HOST=0.0.0.0` in `.env.example`). Do not expose it to the public internet. If you must run it on a reachable host, set `NODE_ENV=production` and `DISABLE_DEV_BOTS=true` (and avoid permissive `CLIENT_URL` / `DEV_LAN_CORS`).

## Deploy

**Production** deploys on push to `main` via **Workers Builds** (Cloudflare dashboard → your Worker → Builds).

Workers Builds does **not** read `[build]` from `wrangler.toml`. In Build settings use:

- **Build command:** `npm run build` (Workers Builds runs `npm ci` first; exports `frontend/out`)
- **Deploy command:** `npx wrangler deploy` (upload only — no `[build]` in `wrangler.toml`)
- **Node.js:** **22** (required by Wrangler 4.95+; match `.node-version`)

**Local:**

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