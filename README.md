# LeTeam Game Hub

LeTeam Game Hub is a web-based multiplayer platform built to bring people together over fast, engaging party games. The core philosophy here is zero friction: you open the site, spin up a room, share a short code with your friends, and start playing instantly. There are no accounts to create, no launchers to download, and no setup loops to clear.

- **Live platform:** [https://gamehub.mohamed-hussein.net](https://gamehub.mohamed-hussein.net/)
- **Infrastructure:** Powered by Cloudflare Workers and Durable Objects to keep real-time gameplay synchronized directly in memory at the edge.

---

## What can you play?

Our catalog focuses on games that drive social interaction, bluffing, and quick thinking. Here is the current deployment status of the hub:

| Game | Directory | Status | What it is |
| :--- | :--- | :--- | :--- |
| **Secret Word** | `wordgame` | **Active** | A fast-paced word guessing game featuring real-time scratchpads and character voice-line cues. |
| **برا السالفة** | `bara-alsalafa` | **Active** | A popular regional game of deception, hidden roles, and secret voting where players try to spot the outsider. |
| **Mafia** | `mafia` | **Active** | The classic social deduction game complete with automated night cycles, text isolation, and narrator controls. |
| **Dominoes** | `dominoes` | *In catalog (offline)* | Traditional tile gameplay supporting 2v2 casual matchups and local scoring configurations. |
| **What is that** | `sketch-draw` | *In catalog (offline)* | A synchronized drawing and guessing board powered by the Fabric canvas framework. |

---

## How it works under the hood

The project is structured as a monorepo, separating user interface layouts from core game rules to ensure the platform remains stable, lightweight, and easy to maintain.

- **The frontend (`frontend/`):** Built with Next.js 15 using the App Router. To ensure maximum loading speeds, it compiles entirely into a static web export (`output: 'export'`).
- **The shared core (`shared/`):** This is where the actual game rules and state logic live. Because these engines are written in pure JavaScript/TypeScript without external environment dependencies, they run exactly the same way on a developer's local machine as they do on production servers.

For detailed development specs, deep dives into state management, or animation guidelines, refer to our internal onboarding documentation:

- [Server persistence and phase gates](docs/architecture/persistence-boundaries.md)
- [Client storage tiers and state lifecycles](docs/architecture/storage-tier-contract.md)
- [Motion and memory convergence record](docs/architecture/motion-storage-convergence.md)

---

## Getting started locally

If you want to spin up a local instance of the game hub for testing, development, or playing over a local area network (LAN), follow these steps.

### Prerequisites

Make sure you have **Node.js 22** or higher installed on your machine. We use **npm** to handle workspace dependencies.

### Installation and launch

1. Install all dependencies across the frontend, server, and shared directories simultaneously:

   ```bash
   npm run install:all
   ```

2. Set up your local environment configuration files:

   Create a file named `frontend/.env.local` and add:

   ```env
   NEXT_PUBLIC_SERVER_URL=http://localhost:3001
   ```

   Create a file named `server/.env` and add:

   ```env
   PORT=3001
   NODE_ENV=development
   HOST=0.0.0.0
   CLIENT_URL=http://localhost:3000
   ```

   Or copy the checked-in examples:

   ```bash
   cp frontend/.env.example frontend/.env.local
   cp server/.env.example server/.env
   ```

3. Launch the unified development server. This fires up the Next.js interface and the local Socket.io gateway concurrently:

   ```bash
   npm run dev
   ```

4. Open your browser to [http://localhost:3000](http://localhost:3000) to access the hub.

---

## Building and deployment

### Compiling for production

To generate the static web assets for the frontend interface, run the workspace build command:

```bash
npm run build
```

This processes the Next.js optimization pipeline and drops the final production-ready files straight into the `frontend/out/` directory.

### Production push

Maintainers can execute a full clean install, static build, and edge deployment to the live Cloudflare production network by running:

```bash
npm run deploy
```

You must be authenticated locally via the Cloudflare Wrangler CLI (`wrangler login`) for this command to execute successfully.

---

## Security and privacy invariants

- **Hidden state protection:** To prevent cheating, our servers never broadcast raw game data or hidden player roles to everyone in a room. The backend explicitly filters out secrets and sends customized, redacted information to each individual player's screen.
- **Development gates:** The backend package found under `server/` is explicitly tailored for local and LAN environments. Do not expose this unshielded development server directly to the open web.

---

## Licensing and rights

This repository is private and proprietary. All rights are reserved by the core development team. No part of this source code, including individual game modules, asset manifests, or design frameworks, may be copied, redistributed, or modified for secondary use without express written consent from the project maintainers.
