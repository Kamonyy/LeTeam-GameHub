# LeTeam Game Hub — Production Deployment

**Live site:** https://gamehub.mohamed-hussein.net

## Architecture

| Component | Platform | URL |
|-----------|----------|-----|
| **Frontend** | Cloudflare Workers | https://gamehub.mohamed-hussein.net |
| **Backend** | Render | `https://<your-service>.onrender.com` |

---

## 1. Cloudflare (frontend) — already configured

| Setting | Value |
|---------|-------|
| **Deploy command** | `npx wrangler deploy` |
| **Custom domain** | `gamehub.mohamed-hussein.net` (in `wrangler.toml`) |

**Required environment variable** (Cloudflare → gamehub → Settings → Variables):

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SERVER_URL` | Your Render API URL, e.g. `https://leteam-gamehub-api.onrender.com` |

Redeploy after setting this so the build embeds the backend URL.

---

## 2. Render (backend)

1. [render.com](https://render.com) → **Blueprint** → connect this repo → creates `leteam-gamehub-api`.
2. Set **CLIENT_URL**:
   ```
   https://gamehub.mohamed-hussein.net
   ```
3. Copy the Render service URL → paste into Cloudflare `NEXT_PUBLIC_SERVER_URL`.

> Free tier sleeps after inactivity (~50s cold start on first connect).

---

## 3. Share game links

```
https://gamehub.mohamed-hussein.net/dominoes/?room=A7B9
```

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

Never commit real environment files:

- `backend/.env` — local only (gitignored)
- `frontend/.env.local` — local only (gitignored)
- Cloudflare → `NEXT_PUBLIC_SERVER_URL`
- Render → `CLIENT_URL`
