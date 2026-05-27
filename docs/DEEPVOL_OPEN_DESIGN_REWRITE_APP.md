---
Purpose: Document the DeepVol-28 Open Design frontend rewrite as a standalone app.
Audience: Developers, product contributors, reviewers, and AI agents.
Status: DeepVol-28 creates `apps/deepvol-open-design/` as the visual-fidelity Open Design frontend. The old `apps/deepvol-web/` remains for functional validation and logic reference only.
Source of truth relationship: Companion to DEEPVOL_FRONTEND_MVP.md; records the Open Design rewrite rationale, architecture, and boundaries.
---

# DeepVol Open Design Rewrite App

## Why the rewrite

DeepVol-27 attempted to implement the Open Design UI by modifying `apps/deepvol-web/` — adding new components, routes, and CSS on top of the existing codebase. The result did not visually match the 5 HTML design mockups in `uiux-design/`. The old app's component hierarchy, CSS architecture, and visual language diverged too far from the target design.

DeepVol-28 creates a separate, standalone app that:

1. Uses Tailwind CSS v4 with `@theme` tokens extracted verbatim from the HTML mockups
2. Copies all 25 headless hooks and 9 lib files verbatim (they have zero UI imports)
3. Builds new components from scratch following the mockup HTML structure
4. Never imports from `apps/deepvol-web/src/components/` or `apps/deepvol-web/src/styles.css`

## App path

```
apps/deepvol-open-design/
```

## Source HTML mockups

```
uiux-design/landing-page.html    — Landing / hero / products / how-it-works
uiux-design/markets.html         — Markets overview / featured BTC card / table
uiux-design/market-btc.html      — BTC terminal: 3-column layout, trade tabs
uiux-design/portfolio.html       — Portfolio: summary, receipts, positions
uiux-design/state.html           — Transaction state system reference
```

## Route mapping

| Path | Page | Notes |
|------|------|-------|
| `/` | LandingPage | Hero, products, how-it-works, status strip |
| `/markets` | MarketsPage | Featured BTC card, market table |
| `/markets/btc` | BtcMarketPage | 3-column terminal, product tabs |
| `/markets/btc?product=X` | BtcMarketPage | X = MOVE, UP, DOWN, RANGE |
| `/portfolio` | PortfolioPage | Summary cards, receipts, positions |

Compatibility routes handled by App.tsx `parseRoute`:

| Legacy path | Resolves to |
|-------------|-------------|
| `/buy/btc-move` | BtcMarketPage with product=MOVE |
| `/primitives?type=UP` | BtcMarketPage with product=UP |
| `/primitives?type=DOWN` | BtcMarketPage with product=DOWN |
| `/primitives?type=RANGE` | BtcMarketPage with product=RANGE |

## Tech stack

- Vite 7 + React 19 + TypeScript
- Tailwind CSS 4 via `@tailwindcss/vite` (local, not CDN)
- `@mysten/dapp-kit` + `@mysten/sui` + `@tanstack/react-query`
- SPA client-side routing (no routing library)

## Design system

Tailwind v4 `@theme` tokens extracted from the HTML mockups:

- **Colors**: abyss-900/800/700, navy-600/500, aqua-400, cyanx-500, azure-600, iris-500, seafoam-400, amber-400, coral-400, ink-hi/mid/low
- **Typography**: Inter Tight (display), Inter (body), JetBrains Mono (mono)
- **Component classes**: `.glass`, `.glass-inner`, `.chip`, `.pill-*` (12 variants), `.dot-*` (8 variants), `.gate`/`.gate-icon` (5 variants), `.toast-*` (4 variants), `.step-dot`/`.step-line`, `.skel`, `.spinner`, `.tab`, `.input`, `.label`, `.bg-cta`, `.bg-abyss`, `.grain`, `.featured-accent`, `.nav-link`
- **Animations**: pulse, draw, float, shimmer, skel, spin + `prefers-reduced-motion` support

## Logic reuse boundaries

**Copied verbatim** (zero UI imports, resolved via root tsconfig path aliases):
- `src/hooks/` — 25 headless React hooks
- `src/lib/` — 9 pure utility files

**Allowed runtime dependencies** (shared packages):
- `@rangepilot/sdk/*`
- `@rangepilot/types/*`
- `@rangepilot/config/*`

**Forbidden runtime imports**:
- `apps/deepvol-web/src/components/**`
- `apps/deepvol-web/src/styles.css`
- `apps/deepvol-web/src/App.tsx`
- `apps/deepvol-web/src/routes/**`

## What the old app remains for

`apps/deepvol-web/` is preserved as:

- Functional validation reference (all 12 gate tests pass)
- Logic reference for hook behavior and SDK integration patterns
- Historical Testnet validation evidence (browser buy, redeem, primitive execution)

It is not the production UI direction.

## DeepVol-29: Execution parity

DeepVol-28 shipped the visual shell with static trade buttons. DeepVol-29 wires real chain execution:

- **MOVE:** `useActiveBtcMoveSeries` → `useBtcMoveMintableRange` → `useDeepVolQuote` → `useBuyMoveReceipt` → `useSignAndExecuteTransaction` → wallet prompt
- **UP/DOWN:** `usePrimitiveMintableStrike` → `usePrimitiveQuote` → `usePrimitivePreflight` → `usePrimitiveWalletExecution` → wallet prompt
- **RANGE:** `usePrimitiveMintableRange` → `usePrimitiveQuote` → `usePrimitivePreflight` → `usePrimitiveWalletExecution` (submitRange path) → wallet prompt

RANGE is NOT permanently disabled. It uses real gate-based status via `usePrimitiveMintableRange`.

Wallet prompt only appears when all gates pass. No static fake buttons.

Execution panels: `MoveExecutionPanel`, `BinaryPrimitiveExecutionPanel`, `RangeExecutionPanel`, `WalletActionButton` (shared).

Landing page blank section fixed (`.reveal` CSS default visibility changed from hidden to visible).

## Verification

| Check | Result |
|-------|--------|
| `npm run typecheck:open-design` | Pass |
| `npm run build:open-design` | Pass |
| `test:open-design-ui` (47 assertions) | Pass |
| All 12 old app gate tests | Pass |
| Browser smoke (all routes) | Pass, 0 console errors |
| Responsive 375px | Columns stack, no overflow |
| Import isolation | No forbidden imports |
| MOVE button wired to `useBuyMoveReceipt.submit` | Yes |
| UP/DOWN buttons wired to `usePrimitiveWalletExecution.submit` | Yes |
| RANGE button wired to `usePrimitiveWalletExecution.submit` | Yes |
| RANGE NOT hardcoded disabled | Yes |
| Disabled buttons show human-readable blocker | Yes |
| Landing page content visible by default | Yes |
