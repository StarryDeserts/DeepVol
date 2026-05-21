---
Purpose: Define the DeepVol wallet-gated frontend MVP scaffold, UI/UX foundation, and safety boundaries.
Audience: Frontend developers, SDK implementers, product contributors, reviewers, and AI agents.
Status: Updated for DeepVol-9 browser-safe buy_move_receipt<DUSDC> preflight over the DeepVol-8 guided flow.
Source of truth relationship: Derived from DeepVol foundation docs, deployed receipt validation, and local frontend implementation; protocol docs and on-chain state remain authoritative for transaction semantics.
---

# DeepVol Frontend MVP

## Summary

DeepVol-6 added a DeepVol-first frontend scaffold under `apps/deepvol-web/`. DeepVol-7 redesigns that app into a more professional oceanic DeFi trading experience for the validated BTC MOVE receipt path while preserving strict wallet, Testnet, quote, fee coin, and preflight gates before any wallet prompt can submit `receipt::buy_move_receipt<DUSDC>`.

The redesigned frontend is still an MVP foundation, not a production launch. It improves product clarity, route hierarchy, transaction readiness states, portfolio receipt presentation, accessibility, and responsive layout without adding production chain behavior.

DeepVol-8 repairs the browser interaction flow for brand-new Sui Testnet users. The Buy page exposes the path from wallet connection to PredictManager setup, DUSDC funding visibility, explicit quote refresh, explicit preflight, final buy gating, and portfolio guidance.

DeepVol-9 implements the browser-safe main preflight for `buy_move_receipt<DUSDC>`. The `Run preflight` action now reads the connected wallet's `PredictManager` DUSDC balance with `predict_manager::balance<DUSDC>`, verifies it covers the expected premium, builds the DeepVol receipt transaction in browser, and runs `devInspect` before the final wallet prompt can unlock. Direct two-leg binary mint preflight is diagnostic-only for the composed receipt path; the receipt entrypoint itself is the main gate.

## App path

```text
apps/deepvol-web/
```

`apps/deepvol-web/` is the current DeepVol-first frontend. It is separate from `apps/web/`, which remains the prior RangePilot/browser validation UI and should not become the primary DeepVol UX through incremental patches.

The app reuses existing packages for config, types, and transaction construction:

```text
packages/config/src/deepVolTestnet.ts
packages/config/src/deepbookPredictTestnet.ts
packages/types/src/deepVol.ts
packages/sdk/src/deepVol/
packages/sdk/src/deepbookPredict/
```

## DeepVol-7 UI/UX redesign

DeepVol-7 used the local `ui-ux-pro-max` skill during planning and implementation. The applied guidance includes strong dark-mode contrast, visible focus states, 44px touch targets, readable status labels, no emoji-as-icons, 150-300ms interaction transitions, `prefers-reduced-motion`, and responsive checks at mobile, tablet, laptop, and desktop widths.

The visual direction is an oceanic DeFi terminal:

- deep ocean and abyss backgrounds;
- cyan glow for live/action emphasis;
- seafoam and turquoise accents for positive/ready states;
- glassy card surfaces with luminous borders;
- clear warning and danger states for blockers and failures;
- restrained professional layout rather than a game-like neon theme.

## Balancer reference source

The Balancer v3 frontend source is present locally as UI/UX reference only:

```text
frontend-monorepo/
```

DeepVol-7 used it only for interaction and layout patterns: app shell rhythm, focused transaction cards, wallet-gated CTA placement, advanced details accordions, portfolio summary/position cards, semantic tokens, and responsive mobile behavior. It must not be copied wholesale into DeepVol code and must not be staged or committed.

`frontend-monorepo/` is ignored because it is third-party reference source, not RangePilot or DeepVol project source. Local reference material, generated files, package lock churn, or unrelated upstream source must not enter this repository's review or commit surface.

## Page map and interaction model

| Route | Purpose |
|---|---|
| `/` | Alias to the markets page. |
| `/markets` | Product entry page for BTC MOVE with `Trade movement, not direction.`, BTC MOVE payoff zones, CTA, advanced primitive context, and first-time setup preview. |
| `/buy/btc-move` | Transaction workspace with product context, first-time flow checklist, PredictManager create/store actions, DUSDC wallet/deposit visibility, quantity setup, quote metrics, UP/DOWN leg quotes, explicit preflight, disabled buy CTA, and advanced protocol details. |
| `/portfolio` | Receipt overview showing local browser records or the DeepVol-5 validation reference artifact, with explicit local/indexer limitations and a path back to `/buy/btc-move` for first local receipt creation. |

The redesigned Buy page follows a transaction workspace model: product explanation and payoff zones stay near the guided setup flow, while PredictManager setup, DUSDC funding, quote metrics, explicit preflight, and wallet-gated execution sit in a focused action column. The buy button stays disabled until all hook-derived gates and explicit preflight gates pass.

## Wallet and Testnet guard

The app uses Sui dApp Kit with Testnet as the default network. The shell shows wallet connection state, connected address, active network, wallet name, and whether the wallet supports `sui:testnet`.

Buy execution must remain disabled unless:

- a wallet is connected;
- the active dApp Kit network is Testnet;
- the connected account supports `sui:testnet`;
- all quote, fee coin, and preflight gates pass.

No browser code uses local private keys, mnemonics, `.env.local`, CLI signing, or mainnet paths.

## BTC MOVE buy flow gates

The primary first-time browser flow is:

```text
Connect wallet
→ switch to Sui Testnet
→ check / create PredictManager
→ check wallet DUSDC coins
→ deposit DUSDC to PredictManager if needed
→ load configured BTC VolSeries
→ refresh UP quote
→ refresh DOWN quote
→ compute expected premium
→ compute Create Fee
→ select sender-owned Coin<DUSDC> for Create Fee
→ run explicit browser buy_move_receipt<DUSDC> preflight
→ keep buy disabled unless receipt preflight and all funding gates pass
→ enable explicit wallet approval only after all gates pass
→ persist successful digest and receipt ID locally
```

DeepVol-8 exposes `Create PredictManager`, `Deposit DUSDC to PredictManager`, `Refresh quote`, and `Run preflight` as visible browser actions. `Create PredictManager` and `Deposit DUSDC` are real Sui Testnet wallet actions guarded by wallet/Testnet checks. Quote refresh uses browser-safe devInspect helpers for the configured BTC VolSeries.

The app reads the configured validated VolSeries and attempts browser-safe quote helpers. Historical DeepVol-5 quote values are not treated as live offers. Fresh quote, premium, fee, and fee coin values are runtime state.

The current frontend keeps final `buy_move_receipt<DUSDC>` submission blocked until receipt preflight succeeds in the browser. DeepVol-9 replaces the old placeholder blocker with real `devInspect`-based receipt preflight and PredictManager DUSDC balance readback. The main gate checks that the manager balance can cover the expected premium and that the wallet has a sender-owned `Coin<DUSDC>` covering the Create Fee; these are separate balances. Direct two-leg binary mint preflight is not a main blocker because the DeepVol receipt entrypoint internally mints both legs.

## Product clarity requirements

The UI must preserve these core messages:

```text
Trade movement, not direction.
BTC MOVE = UP + DOWN.
```

BTC MOVE means the user buys exposure to BTC leaving the configured range:

- UP leg: BTC above the upper strike;
- DOWN leg: BTC below the lower strike;
- premium risk zone: BTC stays inside the range;
- receipt: non-custodial but protocol-enforced;
- underlying positions: stay in the user's `PredictManager`.

## Portfolio and readback limitations

The portfolio page reads locally stored successful buy records from browser storage. If no local receipt exists, it shows the DeepVol-5 validated receipt as a labeled reference artifact.

General receipt enumeration is not implemented. A future indexer or event-query layer is needed to discover all receipts for a wallet without local storage.

Receipt object readback is best-effort and displays only fields that can be parsed from the Move object. Wallet-critical underlying position quantities still require direct `PredictManager` binary position readback for the known UP and DOWN MarketKeys.

## Non-custodial receipt copy

The MVP receipt is non-custodial. The user's underlying DeepBook Predict UP and DOWN positions remain in the user's `PredictManager`; the `MoveReceipt` records protocol-enforced metadata and linkage after the DeepVol entrypoint mints both legs.

The UI must not imply that the receipt escrows, owns, redeems, or transfers the underlying Predict positions.

## Explicit non-actions

The DeepVol frontend does not:

- publish or upgrade Move packages;
- modify `move/deepvol/Move.toml`;
- run `series::create_series`;
- run `buy_move_receipt<DUSDC>` from CLI or scripts;
- execute wallet transactions automatically;
- withdraw protocol fees;
- redeem binary positions;
- implement Profit Fee;
- implement creator marketplace or secondary market flows;
- use mainnet;
- import validation scripts into browser code;
- claim full portfolio enumeration or indexer support.

## Verification commands

Run these before treating the frontend as ready for review:

```bash
npm --workspace apps/deepvol-web run test:buy-gate
npm run typecheck:deepvol-web
npm run build:deepvol-web
npm run typecheck
npm run build:web
```

Manual browser checks should cover `/markets`, `/buy/btc-move`, `/portfolio`, disconnected wallet gating, wrong-network gating, PredictManager create/store visibility, DUSDC balance/deposit visibility, explicit quote refresh, real receipt preflight pass/fail diagnostics, explicit BTC MOVE copy, non-custodial receipt copy, disabled buy gating before preflight, enabled wallet review only after receipt preflight passes, visible focus states, responsive layout, and absence of historical validation quote values as live quotes.
