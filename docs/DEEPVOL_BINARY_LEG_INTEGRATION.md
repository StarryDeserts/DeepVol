---
Purpose: Record the DeepBook Predict binary-leg entrypoints DeepVol depends on.
Audience: Move developers, SDK implementers, frontend developers, reviewers, and AI agents.
Status: Source-confirmed entrypoints; direct two-leg primitive mint, deployed DeepVol buy_move_receipt<DUSDC>, DeepVol-11 binary redeem read/preflight, DeepVol-13 known-receipt browser redeem, DeepVol-14 primitive quote/preflight previews, DeepVol-15 guarded UP/DOWN primitive execution code, and DeepVol-16-fix active BTC primitive market discovery/stale-oracle gate validation recorded. Real UP/DOWN primitive execution requires a freshly discovered live BTC market before any wallet prompt.
---

# DeepVol Binary Leg Integration

## Why this matters

DeepVol is a Predict-native primitive trading terminal and structured product layer. UP and DOWN can be wallet-gated raw primitives after fresh quote, manager balance, and binary mint preflight gates pass; RANGE remains quote/preflight-only until dedicated validation; BTC MOVE Receipt is the primary composed MVP product.

DeepVol BTC MOVE depends on composing two DeepBook Predict binary legs:

```text
Long UP above upper strike
+
Long DOWN below lower strike
=
BTC MOVE exposure
```

Advanced users can manually buy UP + DOWN through DeepBook Predict. DeepVol's value is not exclusivity; it is standardized series selection, protocol-enforced multi-leg execution, receipt-based portfolio aggregation, fee accounting, guided settlement/redeem, and simpler risk display.

## Source-confirmed binary key construction

`MarketKey` identifies a binary option position with:

- `oracle_id`;
- `expiry`;
- `strike`;
- `direction`.

Source-confirmed constructors:

| Function | Purpose |
|---|---|
| `market_key::up(oracle_id, expiry, strike)` | Construct an UP binary key. |
| `market_key::down(oracle_id, expiry, strike)` | Construct a DOWN binary key. |
| `market_key::new(oracle_id, expiry, strike, is_up)` | Construct UP when `is_up = true`; DOWN when `is_up = false`. |

Source-confirmed direction constants are `DIRECTION_UP = 0` and `DIRECTION_DOWN = 1`. DeepVol SDK and Move code should prefer constructors instead of hardcoded direction values where possible.

## UP / DOWN semantics for BTC MOVE

- UP leg: long above the upper strike.
- DOWN leg: long below the lower strike.

`VolSeries` is the source of truth for DeepVol legs. The Route B entrypoint derives:

- UP: `market_key::up(series.oracle_id, series.expiry, series.upper_strike)`;
- DOWN: `market_key::down(series.oracle_id, series.expiry, series.lower_strike)`.

Do not accept caller-supplied `up_market_key`, `down_market_key`, `up_strike`, or `down_strike` for receipt creation.

## Quote preview method

Binary quote preview is source-confirmed as:

```move
public fun deepbook_predict::predict::get_trade_amounts(
    predict: &Predict,
    oracle: &OracleSVI,
    key: MarketKey,
    quantity: u64,
    clock: &Clock,
): (u64, u64)
```

The return values are `(mint_cost, redeem_payout)` for the binary market at the requested quantity.

DeepVol previews both legs before BTC MOVE receipt mint:

1. `market_key::up(oracle_id, expiry, upper_strike)`.
2. `predict::get_trade_amounts` for the UP key.
3. `market_key::down(oracle_id, expiry, lower_strike)`.
4. `predict::get_trade_amounts` for the DOWN key.

`receipt::buy_move_receipt<Quote>` sums both quoted mint costs as an early cap check, then computes final `premium_paid` from the user's `PredictManager` quote-asset balance delta after the internal mints.

## Binary mint entrypoint

Binary mint is source-confirmed as:

```move
public fun deepbook_predict::predict::mint<Quote>(
    predict: &mut Predict,
    manager: &mut PredictManager,
    oracle: &OracleSVI,
    key: MarketKey,
    quantity: u64,
    clock: &Clock,
    ctx: &mut TxContext,
)
```

Required objects and type parameters:

| Item | Role |
|---|---|
| `Predict` | Shared DeepBook Predict trading object. |
| `PredictManager` | User manager that pays premium and receives binary position quantity. |
| `OracleSVI` | Oracle object for the selected BTC market. |
| `MarketKey` | UP or DOWN binary key. |
| `Clock` | Sui clock object. |
| `Quote` | Quote asset type parameter, DUSDC for current Testnet integration. |

The mint path checks manager ownership, trading pause state, positive quantity, quote asset, oracle/key match, live oracle state, mintable ask, manager balance, and vault exposure limits. DeepVol must not duplicate that pricing/risk logic.

DeepVol-15 exposes a guarded direct binary primitive mint builder as `buildMintBinaryPrimitiveTransaction(...)`. The public builder constructs `predict::mint<DUSDC>` for UP or DOWN only when passed an explicit real-Testnet gate flag and only for Testnet config. `devInspectMintBinaryPreflight(...)` uses a private preflight transaction helper so preflight-only construction is not exposed as a signable public builder. The `/primitives` route and quote panel must not own signing logic; `usePrimitiveWalletExecution(...)` reruns effective market status/expiry checks, quote, manager balance, binary position readback, and binary mint preflight immediately before building the real-Testnet wallet transaction. A passed direct primitive preflight alone does not unlock wallet review if selected market status, quote, balance, freshness, Testnet, PredictManager, or in-flight gates fail. DeepVol-16 confirmed these gates by source review, tests, and disconnected-wallet browser smoke; a later wallet-enabled preflight exposed `oracle_config::assert_live_oracle` abort code `3`, so DeepVol-16-fix added active BTC market discovery and stale/non-live oracle blockers before renewed execution validation.

## Route B DeepVol entrypoint

DeepVol-3B adds the local contract entrypoint:

```move
receipt::buy_move_receipt<Quote>(
    series: &VolSeries,
    predict: &mut Predict,
    manager: &mut PredictManager,
    oracle: &OracleSVI,
    fee_coin: Coin<Quote>,
    protocol_vault: &mut ProtocolVault<Quote>,
    quantity: u64,
    max_premium_paid: u64,
    clock: &Clock,
    ctx: &mut TxContext,
)
```

This entrypoint internally calls `predict::mint<Quote>` twice. The underlying positions remain in the user's `PredictManager`; the receipt records linkage and the actual quote-asset balance delta used for max-premium and Create Fee enforcement.

`predict::mint<Quote>` does not return the final charged cost. DeepVol reads `predict_manager::balance<Quote>` before and after the two mints, records the total balance delta, and future indexer/event logic can reconcile that total with DeepBook Predict `PositionMinted` event costs.

## Current validation harness

`scripts/validate-deepvol-binary-legs.mjs` has three modes:

- `npm run validate:deepvol-binary-read` discovers active BTC oracle candidates, constructs UP/DOWN `MarketKey` values with official constructors, quotes both legs with `predict::get_trade_amounts`, and optionally reads `predict_manager::position` when `--sender` and `--manager` are supplied.
- `npm run validate:deepvol-binary-preflight` first runs read-mode selection, then requires explicit `--sender` and `--manager` before building a two-leg `predict::mint<DUSDC>` PTB for `devInspect` only.
- `npm run validate:deepvol-binary-mint` runs the controlled Testnet mint gates for the known funded sender/manager, prints gas and command diagnostics, and stays dry-run-only unless `--execute-real-mint` is explicitly supplied.

Safety properties:

- no private key is loaded;
- `.env.local` is not read;
- mint mode is dry-run-only by default;
- real submission requires explicit sender/manager, Testnet CLI env/address, manager balance, gas balance, transaction-shape assertion, `devInspect`, SDK dry-run, CLI dry-run, and `--execute-real-mint`;
- binary redeem is not executed by the binary-leg mint harness; DeepVol-13 records a separate controlled browser redeem for the known receipt.

Latest controlled mint-mode result from 2026-05-19 is recorded in [DEEPVOL_BINARY_MINT_TESTNET_VALIDATION.md](./DEEPVOL_BINARY_MINT_TESTNET_VALIDATION.md): the old `100000000` MIST gas budget reproduced `InsufficientGas in command 3`; raising the budget to `200000000` MIST passed SDK dry-run and CLI `serialized-tx-kind` dry-run, then one real Testnet two-leg mint executed with digest `4fMQtu8mFB6jLa5gtSWBsDj3gYp8u9AjQw3xs2VcNJoh`. UP and DOWN positions each increased by `1000`, and manager DUSDC decreased by `1003` atomic units.

That digest is primitive evidence only. It did not execute DeepVol `buy_move_receipt<Quote>`, did not create a DeepVol `MoveReceipt`, and did not deposit a DeepVol Create Fee. DeepVol-15 uses the same binary primitive path for wallet-gated UP/DOWN terminal execution, but successful primitive trades remain raw Predict positions and local browser records, not receipts. DeepVol-4 later records the manual Testnet package publish and shared `ProtocolVault<DUSDC>` setup in [DEEPVOL_TESTNET_PUBLISH_RESULT.md](./DEEPVOL_TESTNET_PUBLISH_RESULT.md). DeepVol-5 then validates the deployed receipt path in [DEEPVOL_BUY_MOVE_RECEIPT_TESTNET_VALIDATION.md](./DEEPVOL_BUY_MOVE_RECEIPT_TESTNET_VALIDATION.md) with buy digest `GVyMBH9kB6nTSuWoULFZ5ir3yhFnRC8LNoRz9EEDQXbd`.

## Binary redeem entrypoints

Source-confirmed binary redeem functions:

```move
public fun deepbook_predict::predict::redeem<Quote>(
    predict: &mut Predict,
    manager: &mut PredictManager,
    oracle: &OracleSVI,
    key: MarketKey,
    quantity: u64,
    clock: &Clock,
    ctx: &mut TxContext,
)
```

```move
public fun deepbook_predict::predict::redeem_permissionless<Quote>(
    predict: &mut Predict,
    manager: &mut PredictManager,
    oracle: &OracleSVI,
    key: MarketKey,
    quantity: u64,
    clock: &Clock,
    ctx: &mut TxContext,
)
```

`redeem` is owner-mediated. It asserts that the transaction sender is the `PredictManager` owner, decreases the binary position, deposits the payout into the same manager, and emits `PositionRedeemed`.

`redeem_permissionless` requires the oracle to be settled and deposits through the permissionless manager path. It is not the MVP guided active-redeem path.

Binary redeem is distinct from the validated range redeem entrypoint. BTC MOVE uses `predict::redeem<Quote>` with a binary `MarketKey`; it must not call `predict::redeem_range<Quote>` or construct a `RangeKey` for the receipt's UP/DOWN legs.

DeepVol MVP can guide redeem, but non-custodial receipts cannot force users to redeem through DeepVol. DeepVol-11 added read/devInspect preflight only; DeepVol-13 later validated one controlled browser-wallet binary redeem for the known Testnet receipt with digest `HeHNeZ95oymZzmA2ZpdjkvJgCaA9s5DzL7qs6aCgbJbJ`.

## Redeem read/preflight validation

DeepVol-11 adds `scripts/validate-deepvol-redeem-flow.mjs` with two modes:

- `npm run validate:deepvol-redeem-read` reads the known browser `MoveReceipt`, derives UP/DOWN binary keys, reads `PredictManager` binary quantities, and previews redeem payout with `predict::get_trade_amounts`.
- `npm run validate:deepvol-redeem-preflight` runs read mode first, then uses `devInspectTransactionBlock` for `predict::redeem<DUSDC>` on each positive-quantity leg.

The script has no execute mode and prints `No real redeem executed.` DeepVol-11 read mode observed UP and DOWN manager-level quantities of `20000` for the known manager/key pair, while the selected receipt quantity is `10000`. Preflight mode uses the receipt-scoped quantity `min(manager position, receipt quantity)`, passed devInspect for both legs, and labels manager quantity separately. Payout previews remain `MUST CONFIRM AT RUNTIME` before any future wallet prompt.

DeepVol-13 used the browser-wallet path, not the read/preflight script, to validate one known-receipt redeem. Digest `HeHNeZ95oymZzmA2ZpdjkvJgCaA9s5DzL7qs6aCgbJbJ` redeemed `10000` UP for `9727` atomic DUSDC and `10000` DOWN for `47` atomic DUSDC, reducing both manager-level positions from `20000` to `10000`. The remaining `10000` per leg is aggregate manager-level quantity for the same MarketKeys, not failed receipt quantity.

## Manager readback

Binary position readback is source-confirmed as:

```move
public fun deepbook_predict::predict_manager::position(
    self: &PredictManager,
    key: MarketKey,
): u64
```

DeepVol portfolio should read both:

- UP key quantity.
- DOWN key quantity.

The `MoveReceipt` should not be treated as authoritative for current binary balances because the underlying legs remain in the user's `PredictManager`.

## Events

Source-confirmed binary lifecycle events:

| Event | Meaning |
|---|---|
| `PositionMinted` | Binary position minted for a manager. |
| `PositionRedeemed` | Binary position redeemed for a manager. |

A later SDK implementation should normalize these events and link them with DeepVol receipt events by transaction digest and fields.

## Preflight gates for deployed Route B

Before any production DeepVol mint flow:

1. Confirm active BTC oracle and expiry at runtime.
2. Construct UP key from upper strike.
3. Construct DOWN key from lower strike.
4. Preview UP leg with `predict::get_trade_amounts`.
5. Preview DOWN leg with `predict::get_trade_amounts`.
6. Ensure both mint costs are nonzero.
7. Ensure quote success is not treated as mintability proof.
8. Ensure manager quote-asset balance covers total premium.
9. Ensure fee coin covers Create Fee.
10. Simulate/preflight the full `buy_move_receipt<Quote>` call before wallet approval.
11. After mint, read back both quantities through `predict_manager::position`.
12. Verify expected `PositionMinted` events or direct position increases.

## Comparison with validated range flow

Validated prior work:

- Range quote and range mint preflight.
- Range wrapper follow transaction.
- `StrategyFollowed`, `PlatformFeeDeposited`, and DeepBook `RangeMinted` event evidence.
- Direct `predict_manager::range_position` readback.

DeepVol-specific validation status:

- Manual DeepVol package publish and quote-asset `ProtocolVault<DUSDC>` setup are recorded in [DEEPVOL_TESTNET_PUBLISH_RESULT.md](./DEEPVOL_TESTNET_PUBLISH_RESULT.md).
- Deployed `buy_move_receipt<DUSDC>` preflight, execution, event parsing, and post-state validation are recorded in [DEEPVOL_BUY_MOVE_RECEIPT_TESTNET_VALIDATION.md](./DEEPVOL_BUY_MOVE_RECEIPT_TESTNET_VALIDATION.md).
- Binary redeem read/preflight validation exists for the known browser receipt; DeepVol-13 validated one controlled browser-wallet redeem for that receipt with fresh gates and post-state readback.
- Production SDK event normalization remains pending.
- Production SDK binary direct readback helper exists for known keys; DeepVol-15 uses known-key primitive readback groundwork plus local primitive trade records, and general position enumeration remains pending.

## Open blockers

- Active BTC oracle, expiry, and strikes are `MUST CONFIRM AT RUNTIME`.
- Production DeepVol receipt flows must preserve the validated two-leg mint gates before wallet approval.
- Direct UP/DOWN primitive wallet execution must preserve fresh quote, manager balance, and binary mint preflight gates immediately before wallet prompt.
- RANGE primitive wallet execution remains disabled until dedicated mintability validation.
- DeepVol package, admin cap, upgrade cap, and DUSDC protocol vault IDs are configured after DeepVol-4; see [DEEPVOL_TESTNET_PUBLISH_RESULT.md](./DEEPVOL_TESTNET_PUBLISH_RESULT.md).
- DeepVol-5 executed one real `VolSeries` creation and one deployed `buy_move_receipt<DUSDC>` validation; future buys still require fresh runtime gates.
- Binary redeem signatures and read/preflight call shapes are source-confirmed and implemented for devInspect; DeepVol-13 validated one known-receipt browser redeem, but future redeems still require fresh runtime gates and event/readback reconciliation before any local receipt status is treated as payout evidence.
- DeepVol-16 browser smoke passed for the UP/DOWN primitive route gates, RANGE disabled policy, BTC MOVE route, and Portfolio separation. DeepVol-16-fix records that the follow-up wallet-enabled preflight hit `oracle_config::assert_live_oracle` abort code `3`, so renewed UP/DOWN execution validation must first use a freshly discovered live BTC market and preserve active-market stale/expired blockers.
