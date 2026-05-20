---
Purpose: Define the first DeepVol BTC MOVE MVP boundary.
Audience: Project maintainers, Move developers, SDK implementers, frontend developers, reviewers, and AI agents.
Status: Foundation MVP scope for the DeepVol refactor, updated for DeepVol-7 frontend UI/UX redesign.
---

# DeepVol MVP Scope

## MVP thesis

DeepVol MVP should prove one real BTC MOVE Receipt path on DeepBook Predict Testnet before expanding markets or fee models.

DeepVol is a Predict-native structured product layer. BTC MOVE Receipt is the primary MVP product; UP, DOWN, and RANGE are advanced primitives, not the main MVP product surface.

The first product is:

```text
BTC MOVE Receipt = Long UP above upper strike + Long DOWN below lower strike
```

The user buys exposure to BTC movement rather than choosing direction.

## Included in MVP

The MVP includes:

- BTC MOVE Receipt only as the primary composed product.
- Advanced UP / DOWN / RANGE primitive surfaces only for validation, diagnostics, or future composer groundwork.
- One active BTC oracle / expiry selected at runtime.
- `VolSeries` object for BTC MOVE series metadata and leg truth.
- `MoveReceipt` object for non-custodial receipt metadata and Predict position linkage.
- DeepVol-owned `AdminCap` and `ProtocolVault<Quote>` for Create Fee custody.
- Preview UP leg.
- Preview DOWN leg.
- Protocol-enforced `buy_move_receipt<Quote>` path that internally mints both binary legs through DeepBook Predict.
- Mint non-custodial `MoveReceipt` after the binary-leg mint path succeeds.
- Charge Create Fee through a separate `fee_coin<Quote>`.
- Deposit Create Fee into DeepVol `ProtocolVault<Quote>`.
- Portfolio readback that combines `MoveReceipt` metadata with `PredictManager` binary position readback.
- A DeepVol-first wallet-gated frontend under `apps/deepvol-web/`, redesigned in DeepVol-7 as an oceanic BTC MOVE UX/demo foundation.
- Guided redeem / settlement path that directs users through the official DeepBook Predict binary redeem flow.

## Explicitly out of MVP

The MVP excludes:

- Primitive UP / DOWN / RANGE as the main fee surface.
- Protocol fees on primitive trades; primitive surfaces should be advanced/debug-only in MVP.
- SUI MOVE.
- DEEP MOVE.
- ETH MOVE.
- Profit Fee enforcement.
- Creator marketplace.
- Creator share.
- Listing fee.
- Tradable receipt.
- Custodial receipt.
- Secondary market.
- Pro API.
- Production UI polish beyond the BTC MOVE demo foundation.

These can be revisited after BTC MOVE binary mint, receipt creation, fee deposit, portfolio readback, and guided redeem are validated. The 2026-05-19 controlled binary mint round validated the direct two-leg BTC binary mint on Testnet with digest `4fMQtu8mFB6jLa5gtSWBsDj3gYp8u9AjQw3xs2VcNJoh`; DeepVol-3B added the Route B contract path; DeepVol-4 records the manual Testnet package publish plus shared `ProtocolVault<DUSDC>` setup in [DEEPVOL_TESTNET_PUBLISH_RESULT.md](./DEEPVOL_TESTNET_PUBLISH_RESULT.md); and DeepVol-5 validates the first deployed BTC `VolSeries`, `buy_move_receipt<DUSDC>`, `MoveReceipt`, internal UP/DOWN mints, and Create Fee deposit in [DEEPVOL_BUY_MOVE_RECEIPT_TESTNET_VALIDATION.md](./DEEPVOL_BUY_MOVE_RECEIPT_TESTNET_VALIDATION.md). Guided redeem remains future MVP work.

## Runtime assumptions

Market availability is a runtime DeepBook Predict condition. The MVP should mark active oracle, expiry, strikes, and quote values as `MUST CONFIRM AT RUNTIME` until discovered from current Testnet state.

The first implementation should prefer runtime discovery over hardcoded market assumptions. If no suitable active BTC binary market exists, the app should report a precise blocker instead of presenting unavailable markets.

## Implementation phases

1. Confirm binary leg entrypoints and source-level semantics.
2. Clarify the primitives-vs-receipts product layer.
3. Add a read-only BTC binary leg validation harness for quote, MarketKey construction, readback, and devInspect-only preflight.
4. Validate BTC binary quote preview for both UP and DOWN legs.
5. Validate a two-leg binary mint PTB in devInspect.
6. Run a controlled binary mint round and document the result. The 2026-05-19 round diagnosed the old `InsufficientGas in command 3` as a too-low `100000000` MIST gas budget and validated one real two-leg mint at `200000000` MIST.
7. Add DeepVol-3 local skeleton for `VolSeries`, non-custodial `MoveReceipt`, Create Fee calculation/recording, TypeScript stubs, and docs without publishing or executing transactions.
8. Upgrade to DeepVol-3B Route B contract code: DeepVol derives both binary legs from `VolSeries`, calls Predict mint twice inside `buy_move_receipt<Quote>`, and deposits Create Fee into a DeepVol-owned vault.
9. Record DeepVol-4 manual Testnet publish/configuration and create the shared `ProtocolVault<DUSDC>`.
10. Validate fresh quote, fee coin, full preflight, execution, and post-state gates around the deployed `buy_move_receipt<DUSDC>` path. DeepVol-5 completed this for one runtime-selected BTC series with buy digest `GVyMBH9kB6nTSuWoULFZ5ir3yhFnRC8LNoRz9EEDQXbd`.
11. Add the DeepVol-6 wallet-gated frontend scaffold under `apps/deepvol-web/`, separate from the prior RangePilot `apps/web` validation UI.
12. Apply DeepVol-7 BTC MOVE UX/demo polish to Markets, Buy, Portfolio, and the oceanic app shell without adding mainnet, redeem, withdraw, marketplace, or protocol changes.
13. Add completed browser-safe portfolio readback and guided settlement UI.
13. Revisit V2 custodial / escrow receipts and Profit Fee only after the non-custodial MVP is validated.

## Code organization

DeepVol local contract and TypeScript paths:

```text
move/deepvol/
packages/types/src/deepVol.ts
packages/sdk/src/deepVol/
packages/config/src/deepVolTestnet.ts
```

DeepVol frontend scaffold:

```text
apps/deepvol-web/
```

`apps/web/` remains the prior RangePilot validation UI. Future DeepVol UX work should build from `apps/deepvol-web/`, not by patching DeepVol pages into the old scaffold.
