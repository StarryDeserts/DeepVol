# DeepVol

> Trade movement, not just direction.

**Sui Overflow 2026 submission.** A Predict-native **volatility trading terminal** on **Sui (Testnet)**, built on **DeepBook Predict**. Instead of asking only "will the price go up or down?", DeepVol lets you express a view on *how much* an asset will move.

It is **non-custodial**: users sign every transaction in their own wallet, and underlying positions stay in the user's own `PredictManager`. The primary frontend is the Open Design app under [`apps/deepvol-open-design`](apps/deepvol-open-design).

---

## Submission — Sui Overflow 2026

| Field | Value |
|---|---|
| Project | **DeepVol** — volatility trading terminal |
| Track | DeFi · Prediction Markets · Sui-native primitives |
| Network | Sui **Testnet** |
| Built on | **DeepBook Predict** (UP / DOWN / RANGE binary primitives) |
| Custody model | **Non-custodial** — every transaction signed in the user's wallet |
| Live demo | **TBD** — Vercel deployment (see [Deployment](#deployment)) |
| Demo video | **TBD** — see [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) for the script and [`docs/DEMO_VIDEO_PLAN.md`](docs/DEMO_VIDEO_PLAN.md) for the scene plan |
| Repository | this repository |
| License | **TBD** |

---

## Quick Verification for Judges

Three ways to confirm DeepVol is a working product, not a deck — pick whichever depth you have time for.

### 1. Inspect on-chain evidence (about 30 seconds)

Every flow below was executed against **Sui Testnet** via a real wallet signature. Click any digest to open it in [SuiVision Testnet Explorer](https://testnet.suivision.xyz/).

| Flow | Tx digest | Notes |
|---|---|---|
| **BTC MOVE buy** — fresh end-to-end | [`6sq8ZydZS3sLXNU6Y31gxSqBniVdf7SEXMwiKzJmjbXg`](https://testnet.suivision.xyz/txblock/6sq8ZydZS3sLXNU6Y31gxSqBniVdf7SEXMwiKzJmjbXg) | active market → mintable range → VolSeries → `buy_move_receipt<DUSDC>` → UP+DOWN mints → Create Fee → `MoveReceiptCreated` |
| **BTC MOVE buy** — browser wallet | [`A6YB62BqMmWsQeEZUoh4qYAA6n4RMqnih5TtHRdadfGn`](https://testnet.suivision.xyz/txblock/A6YB62BqMmWsQeEZUoh4qYAA6n4RMqnih5TtHRdadfGn) | Actual premium **9973**, Create Fee **29**, MoveReceipt `0xbbc2…35eb` |
| **UP primitive mint** | [`4JCQ9ZCPRfWugiRhQsU6Y3rAaeT3CyYMMGZ4XnoCWcy9`](https://testnet.suivision.xyz/txblock/4JCQ9ZCPRfWugiRhQsU6Y3rAaeT3CyYMMGZ4XnoCWcy9) | Cost **8837** atomic DUSDC, no Create Fee |
| **DOWN primitive mint** | [`4XU2145PwZNm1Qn3NtVkEdKZt9VPjiZeY5vNwTcy7jnH`](https://testnet.suivision.xyz/txblock/4XU2145PwZNm1Qn3NtVkEdKZt9VPjiZeY5vNwTcy7jnH) | Cost **3156** atomic DUSDC, no Create Fee |
| **Guided redeem** | [`HeHNeZ95oymZzmA2ZpdjkvJgCaA9s5DzL7qs6aCgbJbJ`](https://testnet.suivision.xyz/txblock/HeHNeZ95oymZzmA2ZpdjkvJgCaA9s5DzL7qs6aCgbJbJ) | Total payout **9774** (UP 9727 + DOWN 47), position deltas 20000 → 10000 |

Key on-chain objects (Sui Testnet):

| Object | Address |
|---|---|
| Validated BTC MOVE VolSeries (DeepVol-20) | [`0x227c2436…fba7006d`](https://testnet.suivision.xyz/object/0x227c2436f3f111e41a78967faaca9c5e9dc5f3074959b720efc86f70fba7006d) |
| Validated MoveReceipt (DeepVol-20) | [`0x85d803ae…eb6ff869`](https://testnet.suivision.xyz/object/0x85d803ae6b8a66f6d0e0772e8906d8076dea210de3eaa322d712db58eb6ff869) |

Full milestone-by-milestone validation history is in [`docs/IMPLEMENTATION_ROADMAP.md`](docs/IMPLEMENTATION_ROADMAP.md).

### 2. Run it locally (about 60 seconds)

Prerequisites: **Node ≥ 18** (20 LTS recommended), a **Sui wallet** browser extension set to **Testnet**, Testnet **SUI** for gas, and a **`PredictManager` funded with DUSDC**.

```bash
npm install
npm run dev:open-design
```

> The app defaults to Sui Testnet. To target another network, set `VITE_NETWORK`
> in `apps/deepvol-open-design/.env.local` (see `.env.example`). DeepBook Predict
> markets currently exist on Testnet only — see Roadmap.

Open the printed dev URL, connect your Testnet wallet, and the guided flow walks you through: active market → mintability → fresh quote → on-chain preflight → wallet review. **No `.env` setup is required** — all Testnet contract and endpoint values are baked into `@deepvol/config`.

To verify build and tests:

```bash
npm run typecheck:open-design                                       # passes
npm run build:open-design                                           # passes
npm --workspace apps/deepvol-open-design run test:open-design-ui    # 93 UI tests pass
```

### 3. Read the 4-minute demo walkthrough

[`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) is the full narration; [`docs/DEMO_VIDEO_PLAN.md`](docs/DEMO_VIDEO_PLAN.md) lists the scenes.

---

## Why DeepVol

Directional prediction is hard. A lot of the time you don't have a strong up-or-down conviction — you just believe something big is about to happen, or that things will stay calm. That's a *volatility* view, not a *direction* view, and most prediction markets give you no clean way to express it.

DeepVol packages the official DeepBook Predict primitives into a structured **BTC MOVE** product — and also exposes the raw **UP / DOWN / RANGE** primitives directly — so you can say "BTC will move a lot" or "BTC will stay in this range" instead of "BTC will finish above X."

## Core Products

### BTC MOVE (flagship composed product)

A MOVE receipt is two legs: a long **UP above an upper strike** and a long **DOWN below a lower strike**. You win when BTC moves far enough **outside** the range by expiry — in **either** direction (direction-agnostic). Both legs are minted in a single PTB via `receipt::buy_move_receipt<DUSDC>`, which creates a non-custodial `MoveReceipt` recording the full structure. A **Create Fee of 0.30% of premium** is charged into the DeepVol `ProtocolVault`.

### UP / DOWN (raw binary primitives)

Direct DeepBook Predict binary positions. **UP** wins if BTC finishes **above** the strike; **DOWN** wins if it finishes **below**. No receipt, no Create Fee — single directional building blocks.

### RANGE (raw range primitive)

Via `predict::mint_range<DUSDC>`. The mirror image of MOVE: wins when BTC expires **inside** the selected interval. No receipt, no VolSeries, no Create Fee.

## How It Works

Every product runs through one shared, headless trading state machine in [`packages/deepvol-trading-react`](packages/deepvol-trading-react). The flow is **gated** — the wallet button stays disabled until every check passes:

1. **Active market** — discover the live BTC market.
2. **Mintability validation** — confirm the position can actually be minted.
3. **Fresh quote** — pull pricing with a freshness window.
4. **On-chain preflight** — run a `devInspect` dry-run with a freshness window.
5. **Wallet review / sign** — only now does the user's wallet open for signing.

The model is **non-custodial**. Underlying positions live in the user's own `PredictManager`. DeepBook Predict owns pricing, the oracle, the vault, and settlement. DeepVol adds product packaging (MOVE), receipt metadata, fee accounting, portfolio readback, and guided settlement on top.

## Demo Flow

`Landing → Markets → BTC terminal → MOVE → UP / DOWN → RANGE → Portfolio`

See [`docs/DEMO_VIDEO_PLAN.md`](docs/DEMO_VIDEO_PLAN.md) for the recording plan and [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) for the narration.

## Architecture

npm-workspaces monorepo:

- **Frontend** — the Open Design app: Vite 7 + React 19 + Tailwind CSS 4 + `@mysten/dapp-kit` + `@mysten/sui` + `@tanstack/react-query`. SPA with client-side routing.
- **Shared trading layer** — `packages/deepvol-trading-react`: the headless MOVE / UP / DOWN / RANGE state machines that drive the gated flow. One verified sequence, four product views.
- **Supporting packages** — `@deepvol/sdk` (PTB / transaction building), `@deepvol/types`, `@deepvol/config` (baked-in Testnet contract + endpoint config).
- **Move contracts** — `move/deepvol` (`VolSeries`, `MoveReceipt`, `ProtocolVault`).

```text
┌──────────────────────────────────────────────┐
│  Open Design app (apps/deepvol-open-design)   │  React 19 + Vite 7 + Tailwind 4
├──────────────────────────────────────────────┤
│  Shared trading machines                      │  packages/deepvol-trading-react
│  (MOVE / UP / DOWN / RANGE, gated flow)        │
├──────────────────────────────────────────────┤
│  SDK · types · config                         │  @deepvol/{sdk,types,config}
├──────────────────────────────────────────────┤
│  DeepBook Predict on Sui (Testnet)            │  pricing · oracle · vault · settlement
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

## Environment

No `.env` file is required to run — all Testnet contract and endpoint values are baked into `@deepvol/config`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_DEEPVOL_VERIFIED_APP_URL` | No | Prefixes fallback CTA links. Unset ⇒ relative paths. |

Never place private keys, mnemonics, or signing secrets in env — signing happens only in the user's wallet.

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

The app consumes workspace packages as raw TypeScript via npm symlinks, so the install **must run at the repo root** to materialize the `node_modules/@deepvol/*` symlinks.

### Recommended — repo-root build

```text
Framework Preset:   Other
Root Directory:     ./           (repository root)
Install Command:    npm ci        (root install creates @deepvol/* workspace symlinks from package-lock.json)
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

This depends on Vercel detecting the root `package.json` `workspaces` and installing from the repo root so the `@deepvol/*` symlinks exist. If the build cannot resolve `@deepvol/*`, switch to the recommended repo-root config.

## Security Notes

- **Non-custodial** — the user signs every transaction in their own wallet.
- No private keys, mnemonics, `.env` signing, or CLI signing in the app.
- Current deployment target is Sui Testnet demo/runtime validation.
- **Gated execution** — quote, preflight, and mintability checks must pass before any wallet prompt.

## Current Status

Testnet-oriented MVP.

- **BTC MOVE** and **UP / DOWN / RANGE** primitive flows all run through the shared gated Testnet trading machines.
- **BTC MOVE** creates a `MoveReceipt`; **UP / DOWN / RANGE** create raw primitive positions.
- **Portfolio** shows MOVE Receipts plus primitive positions via local-record + known-key readback (no full wallet indexer yet).
- **BTC MOVE buy, UP / DOWN primitive mints, and guided redeem** are end-to-end validated on Sui Testnet — see [Quick Verification](#1-inspect-on-chain-evidence-about-30-seconds) above.
- **RANGE mint** is execution-path implemented and gate-protected but **not yet validated on Testnet** with a real digest.
- Current scope is Sui Testnet MVP validation and demo readiness.

## Roadmap

| Phase | Status | Highlights |
|---|---|---|
| 0 — Foundation docs and ADR | Complete | DeepVol direction, primitive-vs-receipt model, Create Fee enforceability |
| 1 — Binary leg validation | Complete | Two-leg BTC binary mint validated on Testnet |
| 2 — Local Route B contract | Complete | `move/deepvol` package: `VolSeries`, `MoveReceipt`, `ProtocolVault` |
| 3 — Publish + deployed validation | Complete | DeepVol `buy_move_receipt<DUSDC>` validated end-to-end |
| 4 — Portfolio + guided settlement UX | Complete | Browser buy, browser redeem, primitive terminals, RANGE gate |
| 5 — Demo polish | In progress | Demo plan, script, recording |
| 6 — V2 custodial / marketplace research | Future | Tradable receipts, Profit Fee, creator marketplace |

Full milestone history (DeepVol-1 through DeepVol-38) is in [`docs/IMPLEMENTATION_ROADMAP.md`](docs/IMPLEMENTATION_ROADMAP.md).

## Acknowledgements

Built on **DeepBook Predict** primitives on Sui. Thanks to the Sui and Mysten Labs teams for the on-chain prediction infrastructure.

## License

**TBD — not yet specified.** No `LICENSE` file is present in the repo.
