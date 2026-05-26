---
Purpose: Define the DeepVol primitive quote, preflight, and execution gate contract for UP, DOWN, and RANGE.
Audience: Frontend developers, SDK implementers, product maintainers, reviewers, and AI agents.
Status: DeepVol-23 records UP/DOWN primitive Testnet validation success; see DEEPVOL_PRIMITIVE_UP_DOWN_VALIDATION.md. DeepVol-21 adds mintable strike candidate search interacting with quote/preflight gates for UP/DOWN. DeepVol-16-fix updates the UP/DOWN/RANGE primitive gate contract to require an active/live BTC market context, stale-oracle blockers, and friendly assert_live_oracle error copy before quote, preflight, or wallet execution. RANGE execution remains disabled.
Source of truth relationship: Extends the DeepVol primitive execution policy, primitives/receipts model, frontend MVP, protocol integration, and binary leg integration docs; on-chain protocol behavior remains authoritative.
---

# DeepVol Primitive Quote and Preflight

## Scope

DeepVol-15 advances UP and DOWN from static education and quote/preflight previews into wallet-gated primitive terminals under `apps/deepvol-web/`. DeepVol-16-fix adds the missing market-liveness layer: primitives now use a selected active BTC market context instead of defaulting to historical configured BTC MOVE `VolSeries` values. RANGE stays quote/preflight-only until dedicated mintability validation.

The route flow is:

```text
select primitive type
→ discover or manually select active BTC market context
→ require effective market status Live
→ input strike or lower/upper range from selected market suggestions
→ input quantity
→ Refresh quote
→ show mint cost / redeem payout preview
→ Run preflight
→ read PredictManager DUSDC balance
→ show preflight diagnostics
→ for UP/DOWN only, enable wallet review when all execution gates pass
```

BTC MOVE remains the primary enabled DeepVol receipt product. Direct primitive trades do not create DeepVol `MoveReceipt` objects, do not deposit a DeepVol Create Fee, and do not become the MVP monetization surface. Only `/buy/btc-move` creates a DeepVol receipt in this app.

## Product semantics

| Primitive | Meaning | Wins when | DeepVol-15 status |
|---|---|---|---|
| UP | Buy upside | BTC expires above the selected strike | Wallet-gated execution after quote, balance, and mint preflight gates pass |
| DOWN | Buy downside | BTC expires below the selected strike | Wallet-gated execution after quote, balance, and mint preflight gates pass |
| RANGE | Buy inside-range exposure | BTC expires inside the selected lower / upper range | Quote/preflight only; execution disabled |
| BTC MOVE | Buy movement | BTC expires below the lower strike or above the upper strike | Primary enabled receipt product |

DeepVol primitives use active BTC primitive market discovery as the oracle/expiry context for quote, preflight, execution, and selected-key readback. Historical BTC MOVE `VolSeries` and prior binary-validation oracle snapshots are evidence only; they are not live primitive trading defaults. Generic multi-asset market routing remains future work.

## Quote sources

UP and DOWN quote preview uses the official binary quote path:

```move
predict::get_trade_amounts(
    &Predict,
    &OracleSVI,
    MarketKey,
    quantity,
    &Clock,
): (u64, u64)
```

The browser calls the SDK `devInspectBinaryQuote` helper with `market_key::up` or `market_key::down` semantics, the selected strike, selected quantity, selected active market oracle object, selected active market oracle ID, selected active market expiry, and DUSDC Testnet config.

RANGE quote preview uses the official range quote path:

```move
predict::get_range_trade_amounts(
    &Predict,
    &OracleSVI,
    RangeKey,
    quantity,
    &Clock,
): (u64, u64)
```

The browser calls the SDK `devInspectRangeQuote` helper with the selected lower/upper strikes, selected quantity, selected active market oracle object, selected active market oracle ID, selected active market expiry, and DUSDC Testnet config.

Quote success is not mintability proof. Runtime market state, ask bounds, vault exposure, manager balance, oracle freshness, and preflight can still block. `oracle_config::assert_live_oracle` abort code `3` means the selected oracle is stale/non-live for the mint path and should render: `This oracle is no longer live for new minting. Refresh the active BTC market before trading this primitive.`

DeepVol-21 adds `findMintableBinaryPrimitiveCandidate()` which searches tick-aligned candidates around the anchor price and runs devInspect binary mint for each candidate to find a mintable strike before quote/preflight can proceed to wallet execution. The mintable strike search runs after active market discovery and before the final preflight gate, so `primitiveMintabilityStatus === "passed"` is now a required execution prerequisite alongside fresh quote and preflight. `assert_mintable_ask::7` maps to "Selected strike is not mintable" for UP/DOWN primitives. See [DEEPVOL_PRIMITIVE_DIRECT_TRADING.md](./DEEPVOL_PRIMITIVE_DIRECT_TRADING.md).

## Preflight sources

UP and DOWN mint preflight builds `predict::mint<DUSDC>` with an SDK-constructed binary `MarketKey` and runs `devInspectTransactionBlock`:

```move
predict::mint<DUSDC>(
    &mut Predict,
    &mut PredictManager,
    &OracleSVI,
    MarketKey,
    quantity,
    &Clock,
)
```

DeepVol-15 exposes `buildMintBinaryPrimitiveTransaction(...)` as a guarded SDK transaction builder. The public builder requires an explicit `allowRealTestnetMint` flag and only allows Testnet config. `devInspectMintBinaryPreflight(...)` uses a private preflight transaction helper so preflight-only construction is not exposed as a signable public builder.

RANGE mint preflight reuses `devInspectMintRangePreflight(...)` and the official `predict::mint_range<DUSDC>` route for diagnostics only.

Primitive preflight now also reads `predict_manager::balance<DUSDC>` so the UI can show manager DUSDC balance and block wallet review when it is below the current mint cost.

## Blocker matrix

| Gate | Quote | Preflight | UP/DOWN execution | RANGE execution |
|---|---:|---:|---:|---:|
| Connected wallet | Required | Required | Required | Blocked by policy |
| Sui Testnet | Required | Required | Required | Blocked by policy |
| Active BTC market context loaded | Required | Required | Required | Blocked by policy |
| Selected oracle object available | Required | Required | Required | Blocked by policy |
| Market status `Live` | Required | Required | Required | Blocked by policy |
| Valid quantity | Required | Required | Required | Blocked by policy |
| Valid UP/DOWN strike | Required for UP/DOWN | Required for UP/DOWN | Required for UP/DOWN | Not applicable |
| Valid RANGE lower/upper strikes | Required for RANGE | Required for RANGE | Not applicable | Blocked by policy |
| PredictManager ID | Not required | Required | Required | Blocked by policy |
| Fresh quote | Not required | Required | Required | Blocked by policy |
| Positive mint cost | Not required | Required | Required | Blocked by policy |
| Manager DUSDC balance read | Not required | Required | Required | Blocked by policy |
| Manager DUSDC balance covers mint cost | Not required | Warning/blocker | Required | Blocked by policy |
| Fresh preflight after dependency changes | Not required | Required | Required | Blocked by policy |
| No active submission | Not applicable | Not applicable | Required | Blocked by policy |

Execution blocker copy:

```text
RANGE wallet execution remains disabled until dedicated mintability validation passes.
Refresh the active BTC market before trading this primitive.
Selected BTC market is no longer live for new primitive minting.
This oracle is no longer live for new minting. Refresh the active BTC market before trading this primitive.
Refresh quote before wallet review.
Run primitive mint preflight again for the current quote and wallet state.
PredictManager DUSDC balance must cover the current mint cost.
```

## Wallet execution boundary

UP/DOWN wallet execution must rerun all runtime-sensitive checks immediately before the wallet prompt:

1. Re-check the selected market expiry/status and block if it is no longer effectively `Live`.
2. Re-run `devInspectBinaryQuote(...)` for the current UP/DOWN input and selected oracle object.
3. Require a positive fresh mint cost.
4. Require the fresh quote to match the displayed quote context or force the user to refresh and rerun preflight.
5. Re-read `predict_manager::balance<DUSDC>` and require it to cover the fresh mint cost.
6. Re-run `devInspectMintBinaryPreflight(...)` for the selected oracle object.
7. Build `buildMintBinaryPrimitiveTransaction({ allowRealTestnetMint: true, ... })` only after all fresh gates pass.
8. Show a wallet prompt only after an explicit user click.
9. Store a local primitive trade record after success.

The route and panel should not import signing hooks directly. Wallet signing is isolated in `usePrimitiveWalletExecution(...)`.

## Portfolio readback boundary

DeepVol keeps known-key primitive position readback groundwork. The primitive route can read selected active-market UP, DOWN, and RANGE keys for a manually entered `PredictManager` ID when wallet, Sui Testnet, selected series, and selected oracle object are available. Portfolio keeps this as future-work groundwork and does not fall back to historical configured series when no selected market context exists.

This is not general indexing. The app must continue to say:

```text
Known selected key readback is supported first. General primitive position indexing is future work.
```

Local primitive trade records are separate from MOVE receipts and are browser hints only. They are not `MoveReceipt` objects and not wallet-wide indexer truth.

## Non-actions

DeepVol-15 does not:

- execute a real RANGE mint;
- execute primitive wallet transactions automatically;
- create a DeepVol `MoveReceipt` from a direct primitive;
- charge a DeepVol Create Fee for direct primitive trades;
- modify Move contracts;
- modify `move/deepvol/Move.toml`;
- publish or upgrade packages;
- withdraw protocol fees;
- use mainnet;
- read private keys, `.env.local`, `.trace/`, or `.traces/`;
- claim full primitive portfolio indexing exists.

## Verification

Before treating the primitive terminal route as ready, run:

```bash
npm run typecheck:deepvol-web
npm run build:deepvol-web
npm run typecheck
npm run build:web
npm --workspace apps/deepvol-web run test:buy-gate
npm --workspace apps/deepvol-web run test:primitive-gates
npm --workspace apps/deepvol-web run test:primitive-quote-gates
npm --workspace apps/deepvol-web run test:primitive-execution-gates
```

Browser smoke must cover `/markets`, `/primitives?type=UP`, `/primitives?type=DOWN`, `/primitives?type=RANGE`, `/buy/btc-move`, and `/portfolio`. Confirm BTC MOVE remains featured, UP/DOWN execution gates render, RANGE execution remains disabled, Portfolio separates MOVE receipts from primitive local records, and no wallet prompt occurs without explicit click.
