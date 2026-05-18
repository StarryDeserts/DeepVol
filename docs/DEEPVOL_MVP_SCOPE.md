---
Purpose: Define the first DeepVol BTC MOVE MVP boundary.
Audience: Project maintainers, Move developers, SDK implementers, frontend developers, reviewers, and AI agents.
Status: Foundation MVP scope for the DeepVol refactor.
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
- `VolSeries` object for BTC MOVE series metadata.
- `MoveReceipt` object for non-custodial receipt metadata and Predict position linkage.
- Preview UP leg.
- Preview DOWN leg.
- Atomic PTB to mint both binary legs through DeepBook Predict.
- Mint non-custodial `MoveReceipt` after the binary-leg mint path succeeds.
- Charge Create Fee.
- Deposit Create Fee into `ProtocolVault`.
- Portfolio readback that combines `MoveReceipt` metadata with `PredictManager` binary position readback.
- Guided redeem / settlement path that directs users through the official DeepBook Predict binary redeem flow.

## Explicitly out of MVP

The MVP excludes:

- Primitive UP / DOWN / RANGE as the main fee surface.
- Protocol fees on primitive trades; primitive surfaces should be advanced/debug-only in MVP.
- SUI MOVE.
- DEEP MOVE.
- ETH MOVE.
- Profit fee enforcement.
- Creator marketplace.
- Creator share.
- Listing fee.
- Tradable receipt.
- Custodial receipt.
- Secondary market.
- Pro API.
- Full UI polish.

These can be revisited after BTC MOVE binary mint, receipt creation, fee deposit, portfolio readback, and guided redeem are validated. The 2026-05-19 controlled binary mint round was blocked before submission by CLI dry-run `InsufficientGas in command 3`, so receipt contract work remains future scope.

## Runtime assumptions

Market availability is a runtime DeepBook Predict condition. The MVP should mark active oracle, expiry, strikes, and quote values as `MUST CONFIRM AT RUNTIME` until discovered from current Testnet state.

The first implementation should prefer runtime discovery over hardcoded market assumptions. If no suitable active BTC binary market exists, the app should report a precise blocker instead of presenting unavailable markets.

## Implementation phases

1. Confirm binary leg entrypoints and source-level semantics.
2. Clarify the primitives-vs-receipts product layer.
3. Add a read-only BTC binary leg validation harness for quote, MarketKey construction, readback, and devInspect-only preflight.
4. Validate BTC binary quote preview for both UP and DOWN legs.
5. Validate a two-leg binary mint PTB in devInspect.
6. Run a controlled binary mint round and document the result. The 2026-05-19 round was blocked before submission by CLI dry-run `InsufficientGas in command 3`.
7. Diagnose the mint dry-run blocker before attempting another real binary mint.
8. Design `VolSeries` and non-custodial `MoveReceipt` Move structs after the underlying binary mint path is proven or explicitly re-scoped.
9. Add SDK builders and full preflight gates.
10. Add portfolio readback and guided settlement UI.
11. Revisit V2 custodial / escrow receipts and Profit Fee only after the non-custodial MVP is validated.

## Future code organization

This round should not create these modules yet, but the future implementation can use:

```text
move/deepvol/
packages/types/src/deepVol.ts
packages/sdk/src/deepVol/
packages/config/src/deepVolTestnet.ts
apps/web/src/pages/DeepVolMarketsPage.tsx
apps/web/src/pages/DeepVolSeriesPage.tsx
apps/web/src/pages/DeepVolPortfolioPage.tsx
```
