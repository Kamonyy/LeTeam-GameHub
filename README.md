# LeTeam Game Hub

Real-time multiplayer game platform with an authoritative server. First game: **Draw/Block Dominoes** (double-six).

## Live stack

- **Frontend:** Next.js static export → **Cloudflare Pages**
- **Backend:** Express + Socket.io → **Render** (WebSockets)

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for full production setup.

## Local development

```bash
npm run install:all
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
npm run dev
```

- Hub: http://localhost:3000
- API: http://localhost:3001

## Project structure

```
backend/          Authoritative game server
frontend/         Next.js client (static export for Pages)
render.yaml       Backend deploy config for Render
```

## Environment variables

| Variable | Where | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_SERVER_URL` | Cloudflare Pages | Backend WebSocket URL |
| `CLIENT_URL` | Render | Comma-separated frontend origins |
| `PORT` | Render | Set automatically |

`*.pages.dev` origins are allowed automatically by the backend CORS config.
