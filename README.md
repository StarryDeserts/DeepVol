# DeepVol

> Trade movement, not just direction.

## Overview

DeepVol is a Predict-native **volatility trading terminal** on **Sui (Testnet)**, built on **DeepBook Predict**. Instead of asking only "will the price go up or down?", DeepVol lets you express a view on *how much* an asset will move.

It is **non-custodial**: users sign every transaction in their own wallet, and underlying positions stay in the user's own `PredictManager`. The primary frontend is the Open Design app under [`apps/deepvol-open-design`](apps/deepvol-open-design).

## Why DeepVol

Directional prediction is hard. A lot of the time you don't have a strong up-or-down conviction — you just believe something big is about to happen, or that things will stay calm. That's a *volatility* view, not a *direction* view, and most prediction markets give you no clean way to express it.

DeepVol packages the official DeepBook Predict primitives into a structured **BTC MOVE** product — and also exposes the raw **UP / DOWN / RANGE** primitives directly — so you can say "BTC will move a lot" or "BTC will stay in this range" instead of "BTC will finish above X."

## Core Products

### BTC MOVE

The flagship composed product. A MOVE receipt is two legs: a long **UP above an upper strike** and a long **DOWN below a lower strike**. You win when BTC moves far enough **outside** the range by expiry — in **either** direction (direction-agnostic). Both legs are minted in a single call via `receipt::buy_move_receipt<DUSDC>`, which creates a non-custodial `MoveReceipt` recording the full structure. A **Create Fee of 0.30% of premium** is charged into the DeepVol `ProtocolVault`.

### UP

A raw DeepBook Predict **binary primitive**. Wins if BTC finishes **above** the strike. No receipt, no Create Fee — a single directional building block.

### DOWN

A raw DeepBook Predict **binary primitive**. Wins if BTC finishes **below** the strike. No receipt, no Create Fee.

### RANGE

A raw range primitive via `predict::mint_range<DUSDC>`. The mirror image of MOVE: wins when BTC expires **inside** the selected interval. No receipt, no VolSeries, no Create Fee.

## How It Works

Every product runs through one shared, headless trading state machine in [`packages/deepvol-trading-react`](packages/deepvol-trading-react). The flow is **gated** — the wallet button stays disabled until every check passes:

1. **Active market** — discover the live BTC market.
2. **Mintability validation** — confirm the position can actually be minted.
3. **Fresh quote** — pull pricing with a freshness window.
4. **On-chain preflight** — run a `devInspect` dry-run with a freshness window.
5. **Wallet review / sign** — only now does the user's wallet open for signing.

The model is **non-custodial**. Underlying positions live in the user's own `PredictManager`. DeepBook Predict owns pricing, the oracle, the vault, and settlement. DeepVol adds the product packaging (MOVE), receipt metadata, fee accounting, portfolio readback, and guided settlement on top.

## Demo Flow

`Landing → Markets → BTC terminal → MOVE → UP / DOWN → RANGE → Portfolio`

See [`docs/DEMO_VIDEO_PLAN.md`](docs/DEMO_VIDEO_PLAN.md) for the scene-by-scene recording plan and [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) for the narration.

## Architecture

npm-workspaces monorepo:

- **Frontend** — the Open Design app: Vite 7 + React 19 + Tailwind CSS 4 + `@mysten/dapp-kit` + `@mysten/sui` + `@tanstack/react-query`. SPA with client-side routing.
- **Shared trading layer** — `packages/deepvol-trading-react`: the headless MOVE / UP / DOWN / RANGE state machines that drive the gated flow.
- **Supporting packages** — `@rangepilot/sdk` (PTB / transaction building), `@rangepilot/types`, `@rangepilot/config` (baked-in Testnet contract + endpoint config).
- **Move contracts** — `move/deepvol` (VolSeries, MoveReceipt, ProtocolVault).

```text
┌──────────────────────────────────────────────┐
│  Open Design app (apps/deepvol-open-design)    │  React 19 + Vite 7 + Tailwind 4
├──────────────────────────────────────────────┤
│  Shared trading machines                       │  packages/deepvol-trading-react
│  (MOVE / UP / DOWN / RANGE, gated flow)         │
├──────────────────────────────────────────────┤
│  SDK · types · config                          │  @rangepilot/{sdk,types,config}
├──────────────────────────────────────────────┤
│  DeepBook Predict on Sui (Testnet)             │  pricing · oracle · vault · settlement
└──────────────────────────────────────────────┘
```

## Project Structure

```text
apps/
  deepvol-open-design/    # primary frontend (Vite + React + Tailwind)
packages/
  deepvol-trading-react/  # shared headless MOVE/UP/DOWN/RANGE state machines
  sdk/                    # transaction / PTB building
  types/                  # shared types
  config/                 # baked-in Testnet contract + endpoint config
move/
  deepvol/                # Move contracts: VolSeries, MoveReceipt, ProtocolVault
docs/                     # architecture, demo plan, demo script, integration notes
```

## Getting Started

Prerequisites:

- **Node >= 18** (20 LTS recommended).
- A **Sui wallet** browser extension set to **Testnet**.
- Testnet **SUI** for gas.
- A **PredictManager** funded with **DUSDC**.

Install all workspaces from the repo root:

```bash
npm install
```

## Environment

No `.env` file is required to run — all Testnet contract and endpoint values are baked into `@rangepilot/config`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_DEEPVOL_VERIFIED_APP_URL` | No | Prefixes fallback CTA links. Unset ⇒ relative paths. |

Never place private keys, mnemonics, or signing secrets in env — signing happens only in the user's wallet.

## Running the App

```bash
npm install
npm run dev:open-design     # Vite dev server
```

Production build:

```bash
npm run build:open-design   # output: apps/deepvol-open-design/dist
```

## Testing

None of these execute real transactions — wallet acceptance is always manual.

```bash
npm run typecheck:open-design
npm run build:open-design
npm --workspace apps/deepvol-open-design run test:open-design-ui
npm --workspace packages/deepvol-trading-react run typecheck
npm --workspace packages/deepvol-trading-react run test
```

## Deployment

The app consumes workspace packages as raw TypeScript via npm symlinks, so the install **must run at the repo root** to materialize the `node_modules/@rangepilot/*` symlinks.

### Recommended — repo-root build

```text
Framework Preset:   Other
Root Directory:     ./           (repository root)
Install Command:    npm ci        (root install creates @rangepilot/* workspace symlinks from package-lock.json)
Build Command:      npm run typecheck:open-design && npm run build:open-design
Output Directory:   apps/deepvol-open-design/dist
Node.js Version:    20.x
```

- Required env vars: **none**. Optional: `VITE_DEEPVOL_VERIFIED_APP_URL`.
- **SPA fallback (required):** the app uses client-side routing with no router library, so configure a rewrite of all paths to `/index.html` (Vercel dashboard → Project → Settings → Rewrites: source `/(.*)` → destination `/index.html`). Without it, refreshing or deep-linking `/markets/btc` or `/portfolio` will 404.

### Alternative — app-root build (simpler)

```text
Framework Preset:   Vite          (gives automatic SPA fallback)
Root Directory:     apps/deepvol-open-design
Install Command:    npm install   (Vercel auto-installs workspace deps from repo root when it detects npm workspaces)
Build Command:      npm run build
Output Directory:   dist
Node.js Version:    20.x
```

This depends on Vercel detecting the root `package.json` `workspaces` and installing from the repo root so the `@rangepilot/*` symlinks exist. If the build cannot resolve `@rangepilot/*`, switch to the recommended repo-root config.

## Security Notes

- **Non-custodial** — the user signs every transaction in their own wallet.
- No private keys, mnemonics, `.env` signing, or CLI signing in the app.
- Current deployment target is Sui Testnet demo/runtime validation.
- **Gated execution** — quote, preflight, and mintability checks must pass before any wallet prompt.

## Current Status

Testnet-oriented MVP.

- **BTC MOVE** and **UP / DOWN / RANGE** primitive flows run through the shared gated Testnet trading machines.
- **BTC MOVE** creates a `MoveReceipt`; **UP / DOWN / RANGE** create raw primitive positions.
- **Portfolio** shows MOVE Receipts plus primitive positions via local-record + known-key readback (no full wallet indexer yet).
- Current scope is Sui Testnet MVP validation and demo readiness.

## License

**TBD — not yet specified.** No `LICENSE` file is present in the repo.
