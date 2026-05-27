# LeTeam Game Hub — Production Deployment

## Architecture

| Component | Platform | Why |
|-----------|----------|-----|
| **Frontend** | Cloudflare Pages | Static Next.js export, global CDN |
| **Backend** | Render | Persistent WebSocket (Socket.io) |

Cloudflare Pages cannot run the Socket.io game server — it needs an always-on Node process.

---

## 1. Deploy backend (Render)

1. Push this repo to GitHub.
2. Go to [render.com](https://render.com) → **New** → **Blueprint** → connect your repository.
3. Render reads `render.yaml` and creates `leteam-gamehub-api`.
4. Set **CLIENT_URL** in Render dashboard:
   ```
   https://your-project.pages.dev,https://your-custom-domain.com
   ```
5. Note the service URL, e.g. `https://your-api.onrender.com`.

> Free tier sleeps after inactivity (~50s cold start on first connect).

---

## 2. Deploy frontend (Cloudflare)

### Option A — Workers deploy (Wrangler, current setup)

In Cloudflare → your project → **Settings** → **Build**:

| Setting | Value |
|---------|-------|
| **Build command** | `npm run build` |
| **Deploy command** | `npx wrangler deploy` |

Add environment variable (Production + Preview):

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SERVER_URL` | `https://your-api.onrender.com` |

The build step installs frontend deps and exports static files to `frontend/out`.  
`wrangler.toml` tells Wrangler to serve that directory.

### Option B — Cloudflare Pages (dashboard only)

| Setting | Value |
|---------|-------|
| **Root directory** | `frontend` |
| **Build command** | `npm install && npm run build` |
| **Build output directory** | `out` |

Same `NEXT_PUBLIC_SERVER_URL` env var as above.

---

## 3. Final wiring

1. Copy your Cloudflare Pages URL.
2. Update **CLIENT_URL** on Render to include it (comma-separated if multiple).
3. Redeploy backend if CORS was blocking (Render auto-restarts on env change).

Share room links like:
```
https://your-project.pages.dev/dominoes/?room=A7B9
```

---

## Custom domain (optional)

**Cloudflare Pages:** Settings → Custom domains → add your domain.

**Render:** Settings → Custom Domain → add e.g. `api.yourdomain.com`.

Update env vars:
- Pages: `NEXT_PUBLIC_SERVER_URL=https://api.yourdomain.com`
- Render: add `https://yourdomain.com` to `CLIENT_URL`

---

## Local development

```bash
npm run install:all
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
npm run dev
```

---

## Secrets

Never commit real environment files. Use platform dashboards for production values:

- `backend/.env` — local only (gitignored)
- `frontend/.env.local` — local only (gitignored)
- Cloudflare Pages → `NEXT_PUBLIC_SERVER_URL`
- Render → `CLIENT_URL`
