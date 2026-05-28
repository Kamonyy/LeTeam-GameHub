# Mafia Visual Theme — Design Prompt & Implementation Spec

## Design prompt (target look)

**Setting:** A claustrophobic medieval courtyard at dusk — wet stone, iron bars, torch pools, and cold moonlight at the edges. The player sits at a council table in the only pool of warmth; the UI is the hearth, the background is the watchful dark.

**Background:** Deep warm charcoal (`#07080b` → `#14161c`) with faint cobblestone texture, side torches (amber blur, slow flicker), cold moon top-left, low **amber-brown** fog (not gray mist). Thematic silhouettes stay at 3–7% opacity — felt, not read. Phase shifts: Day = gray-gold; Night = colder, tighter vignette; Morning = liminal amber-gray.

**Foreground:** **Glass bronze panels** — translucent warm stone (`rgba(18,16,14,0.72)`), brass borders (`rgba(154,116,40,0.35)`), inset gold hairline on hero cards, outer shadow depth. **Cinzel** titles, **Cormorant** flavor text, parchment ink (`#f3ead8`). Primary buttons: amber torch glow + inset highlight. Cards lift on hover (`-translate-y-0.5`, shadow bloom).

**Spark:** Rim light on borders, ember shadows on CTAs, gradient hero headers (codex, lobby), phase-colored accents, atmosphere visible **through** panels — never opaque gray slabs.

**Don't:** Tiled runes, >7% decor opacity, hub blue accent, `shadow-none` on all cards, `bg-zinc-950` blocking atmosphere.

---

## Shared primitives

- `MafiaCard` — `components/mafia/mafia-panel.tsx` variants: `glass` | `elevated` | `codex` | `inset`
- `MafiaButton` — primary/destructive/ghost/outline (bronze ghost)
- Tokens on `[data-mafia-theme]` in `mafia-tokens.css`

---

## Agent workstreams

| # | Scope | Key files |
|---|--------|-----------|
| A | Tokens, globals bridge, atmosphere opacity/warm fog | `mafia-tokens.css`, `mafia-atmosphere*.css`, `MafiaAtmosphere.tsx` |
| B | `MafiaCard`, `card.tsx`, `mafia-button`, `PhaseCeremony` | `mafia-panel.tsx`, `mafia-button.tsx`, `PhaseCeremony.tsx` |
| C | Shell: `MafiaClient`, phase transition, header glass | `MafiaClient.tsx`, `MafiaPhaseTransition.tsx` |
| D | Narrator UI → MafiaCard codex/glass | `NarratorDashboard.tsx`, `NarratorDecreeDeck.tsx`, `NarratorChronicle.tsx`, `NarratorAskPrompt.tsx` |
| E | Lobby, player, audit, roster | `MafiaLobby.tsx`, `PlayerCompanion.tsx`, `RoleRevealCard.tsx`, `ui-audit/page.tsx` |

Validate on `/mafia` and `/mafia/ui-audit`.
