---
Purpose: Define the DeepVol primitive quote, preflight, and execution gate contract for UP, DOWN, and RANGE.
Audience: Frontend developers, SDK implementers, product maintainers, reviewers, and AI agents.
Status: DeepVol-15 UP/DOWN wallet-gated terminal scope; RANGE execution remains disabled.
Source of truth relationship: Extends the DeepVol primitive execution policy, primitives/receipts model, frontend MVP, protocol integration, and binary leg integration docs; on-chain protocol behavior remains authoritative.
---

# DeepVol Primitive Quote and Preflight

## Scope

DeepVol-15 advances UP and DOWN from static education and quote/preflight previews into wallet-gated primitive terminals under `apps/deepvol-web/`. RANGE stays quote/preflight-only until dedicated mintability validation.

The route flow is:

```text
select primitive type
→ use the configured BTC MOVE VolSeries oracle/expiry
→ input strike or lower/upper range
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

DeepVol uses the configured BTC MOVE `VolSeries` as the known oracle/expiry context for primitive terminal inputs. Arbitrary oracle discovery and generic market routing are future work.

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

The browser calls the SDK `devInspectBinaryQuote` helper with `market_key::up` or `market_key::down` semantics, the selected strike, selected quantity, configured oracle, configured expiry, and DUSDC Testnet config.

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

The browser calls the SDK `devInspectRangeQuote` helper with the selected lower/upper strikes, selected quantity, configured oracle, configured expiry, and DUSDC Testnet config.

Quote success is not mintability proof. Runtime market state, ask bounds, vault exposure, manager balance, oracle freshness, and preflight can still block.

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
| Configured VolSeries loaded | Required | Required | Required | Blocked by policy |
| Active VolSeries | Required | Required | Required | Blocked by policy |
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
Refresh quote before wallet review.
Run primitive mint preflight again for the current quote and wallet state.
PredictManager DUSDC balance must cover the current mint cost.
```

## Wallet execution boundary

UP/DOWN wallet execution must rerun all runtime-sensitive checks immediately before the wallet prompt:

1. Re-run `devInspectBinaryQuote(...)` for the current UP/DOWN input.
2. Require a positive fresh mint cost.
3. Require the fresh quote to match the displayed quote context or force the user to refresh and rerun preflight.
4. Re-read `predict_manager::balance<DUSDC>` and require it to cover the fresh mint cost.
5. Re-run `devInspectMintBinaryPreflight(...)`.
6. Build `buildMintBinaryPrimitiveTransaction({ allowRealTestnetMint: true, ... })` only after all fresh gates pass.
7. Show a wallet prompt only after an explicit user click.
8. Store a local primitive trade record after success.

The route and panel should not import signing hooks directly. Wallet signing is isolated in `usePrimitiveWalletExecution(...)`.

## Portfolio readback boundary

DeepVol-15 keeps known-key primitive position readback groundwork. Portfolio can read configured UP, DOWN, and RANGE keys for a manually entered `PredictManager` ID when wallet, Sui Testnet, and configured series are available.

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
