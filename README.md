# LeTeam Game Hub

Real-time multiplayer game hub. Production: Cloudflare Worker at https://gamehub.mohamed-hussein.net

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
