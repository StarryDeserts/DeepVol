---
Purpose: Document the DeepVol-28 Open Design frontend rewrite as a standalone app.
Audience: Developers, product contributors, reviewers, and AI agents.
Status: DeepVol-33 adds normalized runtime mintability context and diagnostics to `apps/deepvol-open-design/`. DeepVol-28 created the visual-fidelity Open Design frontend. The old `apps/deepvol-web/` remains for functional validation and logic reference only.
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

## DeepVol-30: PredictManager setup CTA

DeepVol-29 showed blocker text when PredictManager was missing but provided no actionable button.
DeepVol-30 adds `PredictManagerSetup` component with status-driven CTA:

| Session status | UI |
|---|---|
| `wallet_required` | "Connect wallet" guidance |
| `wrong_network` | "Switch to Sui Testnet" guidance |
| `missing` | **"Create PredictManager" CTA button** (calls real `signAndExecuteTransaction`) |
| `loading` | Spinner + "Validating..." |
| `ready` | Hidden (returns null) |
| `invalid` / `error` | Error message + Refresh / Clear + Advanced manual override |

Manual object ID entry remains under collapsed Advanced/Developer section only.

Passive blocker pills removed from BtcMarketPage — replaced by actionable setup card.

## DeepVol-31: Connected-wallet UX fixes

Three P0 issues found during connected-wallet testing:

1. **MOVE active market context:** MoveExecutionPanel now shows the active market status separately from VolSeries status. Users see "Live" market indicator even when VolSeries is "Idle" or "Missing". VolSeries idle message softened from imperative "Discover an active BTC market first" to "Awaiting active BTC market context."

2. **DUSDC deposit flow:** `PredictManagerSetup` no longer returns null when manager status is "ready". If the PredictManager has zero DUSDC balance, it shows `ManagerFundingCard` with wallet DUSDC balance, deposit amount input, and "Deposit DUSDC to PredictManager" CTA wired to real `buildDepositDusdcTransaction` → `signAndExecuteTransaction`. When funded, shows compact ready strip with balance.

3. **Funding vs quote separation:** Deposit status (in PredictManagerSetup area) is visually separate from quote/preflight errors (inside execution panels). "Non-positive mint cost" from quote is not confused with "insufficient DUSDC balance" from funding.

`TransactionStatusStrip` extracted as shared component used by both `PredictManagerSetup` and `ManagerFundingCard`.

## DeepVol-32: Product context, mintability gates, and preflight wiring

Five root causes fixed after connected-wallet testing:

1. **Shared blocker text fixed:** `buildPrimitiveQuoteBlockers()` in `primitiveQuoteGate.ts` used "Configured BTC MOVE VolSeries" text for all products. Replaced with product-neutral "Configured VolSeries" copy. UP/DOWN no longer show MOVE-specific error messages.

2. **Preflight gated on mintability:** `buildPrimitivePreflightBlockers()` now checks `primitiveMintabilityStatus` (for UP/DOWN) and `rangeMintabilityStatus` (for RANGE). `PrimitiveInputState` extended with optional mintability status fields. Prevents preflight from running when mintability search has failed.

3. **MOVE range band TBD fixed:** Range band fallback chain now includes `activeMarket?.suggestedLowerStrike` / `suggestedUpperStrike` before falling through to "TBD". When active market provides suggested strikes, they display immediately.

4. **RANGE ARITHMETIC_ERROR prevented:** Consequence of fix #2 — RANGE preflight no longer runs with invalid parameters from failed mintability search, preventing `vault::set_mtm_with_curve ARITHMETIC_ERROR`.

5. **Mintability threading:** `usePrimitivePreflight` hook now accepts `primitiveMintabilityStatus` and `rangeMintabilityStatus` params. `BinaryPrimitiveExecutionPanel` and `RangeExecutionPanel` pass their respective mintability statuses through to preflight.

## DeepVol-33: Runtime mintability input parity

DeepVol-33 fixes the next connected-wallet diagnostic gap: all Open Design products could fail mintability search with non-positive mint cost while the UI lacked enough runtime evidence to distinguish input mismatch, quote economics, and funding/preflight failures.

Key changes:

1. **Shared runtime input builder:** `buildTradeRuntimeContext()` validates wallet address, Testnet network, PredictManager, live active market, oracle ID, oracle object ID, expiry, normalized quantity, forward/spot anchor, tick size, min strike, and underlying asset before SDK candidate search.

2. **Normalized SDK inputs:** MOVE, UP, DOWN, and RANGE mintability hooks pass `runtimeContext.sdkInput.quantity` and other validated `sdkInput` fields into SDK candidate helpers. Candidate state resets when the runtime dependency key changes, including oracle object, spot/forward, tick grid, quantity, manager, and wallet state.

3. **MOVE quote oracle object fixed:** `useDeepVolQuote()` now accepts active market context and uses `activeMarket.oracleObjectId` for UP/DOWN leg quotes instead of reusing `series.oracleId` as the OracleSVI object ID. It also blocks stale VolSeries when oracle or expiry differs from the active BTC market.

4. **Shared diagnostics panel:** `TradeRuntimeDiagnostics` renders in MOVE, UP/DOWN, and RANGE panels. It shows runtime input fields, anchor source, quote/preflight status, candidate counts, dominant failure, raw failure summary, Wallet DUSDC, and PredictManager DUSDC.

5. **Balance vs quote separation:** Wallet DUSDC remains a deposit/create-fee source; PredictManager DUSDC remains mint collateral/premium balance. Non-positive quotes are not labeled as balance failures unless raw diagnostics contain balance/deposit evidence.

Suggested strikes seed UI fields only; mintability candidate search uses `forward` or `spot` plus the tick grid. See [DEEPVOL_MINTABILITY_RUNTIME_DIAGNOSTICS.md](./DEEPVOL_MINTABILITY_RUNTIME_DIAGNOSTICS.md).

## DeepVol-34: Verified state-machine parity

DeepVol-34 stops treating the Open Design app as an independent trading implementation. The old `apps/deepvol-web` app remains the verified functional state-machine reference, and Open Design is the view layer over the same sequence.

Canonical orders:

- **MOVE:** `active market -> mintable range -> VolSeries -> quote -> preflight -> wallet`
- **UP/DOWN:** `active market -> mintable strike -> quote -> preflight -> wallet`
- **RANGE:** `active market -> mintable interval -> quote -> preflight -> wallet`

Open Design parity fixes:

1. `MoveExecutionPanel` now wires `useCreateVolSeries` after a passed mintable MOVE range and only passes `moveQuoteSeriesId` to `useDeepVolQuote` when the selected series is ready for the validated range.
2. Binary primitive quote inputs now come from `quoteStrikeInput`, which is populated only after `mintableStrike.status === "passed"`.
3. RANGE quote inputs now come from `quoteLowerStrikeInput` / `quoteUpperStrikeInput`, populated only after `mintableRange.status === "passed"`.
4. Suggested strikes remain visual seed fields only; they no longer become canonical quote/preflight inputs before mintability passes.
5. Product contexts remain isolated, and non-positive quote diagnostics remain distinct from Wallet DUSDC and PredictManager DUSDC funding diagnostics.

See [DEEPVOL_OLD_UI_TRADING_STATE_MACHINE.md](./DEEPVOL_OLD_UI_TRADING_STATE_MACHINE.md). Connected-wallet acceptance is still required; Claude Code did not approve wallet prompts or execute real transactions.

## Verification

| Check | Result |
|-------|--------|
| `npm run typecheck:open-design` | Pass |
| `npm run build:open-design` | Pass |
| `test:open-design-ui` (124 assertions, including DeepVol-33 runtime input parity checks) | Pass |
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
| Missing PredictManager shows Create CTA | Yes |
| CTA calls real `createManager()` on click | Yes |
| No passive blocker pills remain | Yes |
| Manual override Advanced-only | Yes |
