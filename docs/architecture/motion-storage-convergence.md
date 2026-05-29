# Motion and Storage Architectural Convergence Record

**Status:** Canonical development standard — charts the complete synchronization of the frontend
routing pipeline, hardware-accelerated motion boundaries, and disk memory allocation matrix.

This record locks the Premium Motion Framework and Storage Tier Contract integration cycle.
Complementary specifications:

- [`persistence-boundaries.md`](persistence-boundaries.md) — server engines, phase gates,
  `RoomManager` persistence seam
- [`storage-tier-contract.md`](storage-tier-contract.md) — client disk/tab/RAM tiers, hydration,
  hard-reset sanitation

---

## Codebase verification targets

| Artifact                                                                                                   | Role                                                 |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| [`docs/architecture/motion-storage-convergence.md`](motion-storage-convergence.md)                         | Convergence audit and navigation vocabulary          |
| [`frontend/lib/hub/navigateToGameLobby.ts`](../../frontend/lib/hub/navigateToGameLobby.ts)                 | Room-entry navigation gate (`MapsToGameLobby`)       |
| [`frontend/lib/hub/ViewTransitionProvider.tsx`](../../frontend/lib/hub/ViewTransitionProvider.tsx)         | Loading overlay + canonical App Router bridge        |
| [`frontend/lib/hub/hubGameNavigation.ts`](../../frontend/lib/hub/hubGameNavigation.ts)                     | `hub-navigating-game` session hint writer            |
| [`frontend/lib/hub/spectateFromHub.ts`](../../frontend/lib/hub/spectateFromHub.ts)                         | Hub spectate helpers (typed `gameType` hints)        |
| [`frontend/lib/hub/useRoomAutoJoin.ts`](../../frontend/lib/hub/useRoomAutoJoin.ts)                         | Inline URL/query normalization (isolated router use) |
| [`frontend/components/shared/StuckResetButton.tsx`](../../frontend/components/shared/StuckResetButton.tsx) | Soft recovery + animated return to hub               |

---

## 1. Unified symbol mapping

The following naming schema is the **integration vocabulary** for client navigation and motion.
Physical exports in the monorepo use the right-hand identifiers.

| Vocabulary (contract)  | Codebase export                                   | Location                                                                                           |
| ---------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **MapsToGameLobby**    | `navigateToGameLobby`                             | [`frontend/lib/hub/navigateToGameLobby.ts`](../../frontend/lib/hub/navigateToGameLobby.ts)         |
| **MapsWithTransition** | `useViewNavigator()` → `navigate(href, options?)` | [`frontend/lib/hub/ViewTransitionProvider.tsx`](../../frontend/lib/hub/ViewTransitionProvider.tsx) |
| **MapsToGameLobby.ts** | `navigateToGameLobby.ts`                          | Same module as `MapsToGameLobby`                                                                   |

`navigateToGameLobby` accepts optional `{ replace, spectate }` for invite acceptance, spectate
entry, and query-normalization flows without bypassing the motion overlay.

---

## 2. Final architecture resolution matrix

| Target module                                           | Previous legacy state                             | Upgraded production state                                                | Compliance          |
| ------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------ | ------------------- |
| `InvitationContext.tsx`                                 | Raw `router.push` string routing                  | `navigateToGameLobby` + `useViewNavigator`                               | Context stability   |
| `InactiveGameScreen.tsx`                                | Un-orchestrated `<Link href="/">`                 | `HubBackLink` (view transition)                                          | Motion tokens       |
| `StuckResetButton.tsx`                                  | Abrupt `router.replace('/')`                      | `navigateWithTransition('/', { replace: true })` after `hardResetPlayer` | Phase coordination  |
| `spectateFromHub.ts`                                    | Hardcoded `'1'` session hint                      | `markHubGameNavigation(gameType)`                                        | Storage contract §1 |
| `navigateToGameLobby.ts`                                | Fixed signature                                   | `{ replace, spectate }` options                                          | Context stability   |
| Game clients (Word, Mafia, Bara, Dominoes, Sketch-Draw) | Per-game `router.push` / `replace` on create/join | `navigateToGameLobby` + transition hub exits                             | Motion + storage    |

---

## 3. Verified strategic invariants

### 3.1 Navigational token consistency

The legacy `'1'` literal was removed from hub spectate flows. `hub-navigating-game`
(`HUB_NAVIGATING_KEY`) now stores a **canonical `gameType` string** in all writers:

- Arcade card play (`markHubGameNavigation`)
- Lobby quick-join (`navigateToGameLobby`)
- Invite acceptance (`InvitationContext`)
- Hub spectate (`markHubNavigating(gameType)` → `markHubGameNavigation`)

`HubGameLoadingScreen` and `initializeClientStorage()` consume and remove the hint on read,
so loading chrome resolves the correct game icon/name without asset pop-in.

### 3.2 Intentional router boundaries

Direct Next.js App Router calls from feature UI are **prohibited**. The only isolated drivers:

| Module                       | Responsibility                                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **`ViewTransitionProvider`** | Canonical routing execution bridge under the route-loading overlay (`router.push` / `router.replace` with `scroll: false`). |
| **`useRoomAutoJoin.ts`**     | Inline address-bar URL and `?room=` / `?spectate=` query normalization after socket join — not hub marketing transitions.   |

All user-visible hub ↔ game navigation must pass through **MapsWithTransition** and/or
**MapsToGameLobby**.

### 3.3 Identity safety during recovery

`StuckResetButton` triggers `hardResetPlayer()`:

1. **React eviction** — `clearClientSessionState()` (lobby, `gameState`, chat, sketch UI buffers).
2. **Disk sanitation** — `clearPlayerLocalGameDataKeepingIdentity()` evicts `wordgame_notes_*`
   and `hub-navigating-game`; **does not** call `localStorage.clear()`.
3. **Network re-sync** — `room:leave` → `player:register` with preserved `player.id` / token.
4. **Motion exit** — `navigateWithTransition('/', { replace: true })`.

`leteam_core_session` (`id`, `name`, `token`, `prefs`) remains intact. See
[`storage-tier-contract.md`](storage-tier-contract.md) §4.

### 3.4 Reduced-motion clamp

Global fallback in [`frontend/app/globals.css`](../../frontend/app/globals.css) clamps
`animation-duration` and `transition-duration` to **0.01ms** under
`@media (prefers-reduced-motion: reduce)`. Game-specific hooks (Mafia atmosphere, hub particles,
Bara duel fly) additionally gate motion when the media query matches.

---

## 4. Post-convergence verification matrix

| Verification task                           | Result                                             |
| ------------------------------------------- | -------------------------------------------------- |
| `npx tsc --noEmit` (frontend)               | Required on PRs touching client navigation/storage |
| `npm run build` (static `output: 'export'`) | Required before deploy                             |
| `prefers-reduced-motion` global clamp       | Active (0.01ms fallback guard)                     |

**System state:** CONVERGED — engineering cycle closed. No pending structural actions for motion
or client storage tiers.

---

## Pull request compliance gate (merge block)

Reviewers **must reject** PRs that:

- [ ] Add `router.push` / `router.replace` outside `ViewTransitionProvider` or
      `useRoomAutoJoin.ts`
- [ ] Write non-`gameType` values to `hub-navigating-game`
- [ ] Skip `navigateToGameLobby` for new hub-initiated room entry paths
- [ ] Break `StuckResetButton` identity preservation or animated hub return
- [ ] Violate [`storage-tier-contract.md`](storage-tier-contract.md) disk/RAM boundaries

---

## Reference files

- `frontend/lib/hub/navigateToGameLobby.ts`
- `frontend/lib/hub/ViewTransitionProvider.tsx`
- `frontend/lib/hub/hubGameNavigation.ts`
- `frontend/lib/session/core-session.ts`
- `frontend/context/InvitationContext.tsx`
- `frontend/components/hub/HubBackLink.tsx`
- `docs/architecture/storage-tier-contract.md`
- `docs/architecture/persistence-boundaries.md`
