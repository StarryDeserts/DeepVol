---
Purpose: Record the DeepBook Predict binary-leg entrypoints DeepVol depends on.
Audience: Move developers, SDK implementers, frontend developers, reviewers, and AI agents.
Status: Source-confirmed entrypoints; quote/read/preflight validated; controlled binary mint attempt blocked before submission at CLI dry-run.
---

# DeepVol Binary Leg Integration

## Why this matters

DeepVol is a Predict-native structured product layer. UP, DOWN, and RANGE are advanced primitives; BTC MOVE Receipt is the primary composed MVP product.

DeepVol BTC MOVE depends on composing two DeepBook Predict binary legs:

```text
Long UP above upper strike
+
Long DOWN below lower strike
=
BTC MOVE exposure
```

Advanced users can manually buy UP + DOWN through DeepBook Predict. DeepVol's value is not exclusivity; it is standardized series selection, atomic multi-leg execution, receipt-based portfolio aggregation, fee accounting, guided settlement/redeem, and simpler risk display.

Range mint has been validated end-to-end through the existing RangePilot wrapper work. Binary quote/read/preflight is now DeepVol-critical and still needs dedicated validation before production DeepVol coding.

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

A BTC MOVE Receipt should record both keys or the fields needed to reconstruct them.

## Quote preview method

Binary quote preview is source-confirmed as:

```move
predict::get_trade_amounts(
    predict: &Predict,
    oracle: &OracleSVI,
    key: MarketKey,
    quantity: u64,
    clock: &Clock,
): (u64, u64)
```

The return values are the mint cost and redeem payout for the binary market at the requested quantity.

DeepVol should preview both legs before mint:

1. `market_key::up(oracle_id, expiry, upper_strike)`.
2. `predict::get_trade_amounts` for the UP key.
3. `market_key::down(oracle_id, expiry, lower_strike)`.
4. `predict::get_trade_amounts` for the DOWN key.

## Current read-only/preflight validation harness

This round adds `scripts/validate-deepvol-binary-legs.mjs` with two modes:

- `npm run validate:deepvol-binary-read` discovers active BTC oracle candidates, constructs UP/DOWN `MarketKey` values with official constructors, quotes both legs with `predict::get_trade_amounts`, and optionally reads `predict_manager::position` when `--sender` and `--manager` are supplied.
- `npm run validate:deepvol-binary-preflight` first runs read-mode selection, then requires explicit `--sender` and `--manager` before building a two-leg `predict::mint<DUSDC>` PTB for `devInspect` only.
- `npm run validate:deepvol-binary-mint` runs the controlled Testnet mint gates for the known funded sender/manager, serializes a two-leg transaction kind for Sui CLI dry-run, and submits only if all gates pass.

Safety properties:

- no private key is loaded;
- `.env.local` is not read;
- no write transaction is signed or submitted;
- live binary mint/redeem remains not executed in this round.

Latest harness result from 2026-05-18:

| Field | Result |
|---|---|
| Selected BTC oracle | `0xc746336e790db7e93a34b684fa3768f43a7c3171d0262d0f2c71dc0a2ab5fe22` |
| Selected expiry | `1779436800000` |
| Lower / upper strikes | Read mode selected `76310000000000 / 76418000000000`; preflight reran at runtime and selected `76306000000000 / 76409000000000`. |
| UP MarketKey construction | `market_key::up(oracle, 1779436800000, 76418000000000)` in read mode; `market_key::up(oracle, 1779436800000, 76409000000000)` in preflight mode. |
| DOWN MarketKey construction | `market_key::down(oracle, 1779436800000, 76310000000000)` in read mode; `market_key::down(oracle, 1779436800000, 76306000000000)` in preflight mode. |
| UP quote result | Read mode `mint=495`, `redeem=475`, `quantity=1000`; preflight rerun `mint=498`, `redeem=478`, `quantity=1000`. |
| DOWN quote result | Read mode `mint=510`, `redeem=490`, `quantity=1000`; preflight rerun `mint=507`, `redeem=487`, `quantity=1000`. |
| Binary readback result | With sender `0x4ff903b0dcc52dc8753787baf19b34b7425dfa64d187cc7c726b38413705fa75` and manager `0xd59be0646d948c9be6073edc0cfd253ce4cb00f4929f0bae71f451f50e5d1575`, UP position `0`, DOWN position `0`. |
| Two-leg PTB preflight result | Passed with explicit sender/manager through `client.devInspectTransactionBlock`; no signing or execution. |
| Blockers | Live binary mint/redeem not executed in this round. Future wallet approval still needs fresh runtime quote, manager balance, fee coverage, and full two-leg preflight. |

Latest controlled mint-mode result from 2026-05-19 is recorded in [DEEPVOL_BINARY_MINT_TESTNET_VALIDATION.md](./DEEPVOL_BINARY_MINT_TESTNET_VALIDATION.md): read, balance, owner, CLI environment, transaction-shape, and `devInspect` gates passed for sender `0x4ff903b0dcc52dc8753787baf19b34b7425dfa64d187cc7c726b38413705fa75` and manager `0xd59be0646d948c9be6073edc0cfd253ce4cb00f4929f0bae71f451f50e5d1575`, but CLI dry-run returned `InsufficientGas in command 3`. No write transaction was submitted and no retry was attempted.

Quote success and `devInspect` success do not imply mintability or executable CLI submission. The full two-leg PTB still requires fresh quote, manager balance, gas, `devInspect`, CLI dry-run or wallet dry-run equivalent, and wallet approval gates before any future production mint.

## Binary mint entrypoint

Binary mint is source-confirmed as:

```move
predict::mint<Quote>(
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

The mint entrypoint checks manager ownership, trading pause state, positive quantity, quote asset, oracle/key match, live oracle state, mintable ask, manager balance, and vault exposure limits. DeepVol must not duplicate that pricing/risk logic.

## Binary redeem entrypoints

Source-confirmed binary redeem functions:

```move
predict::redeem<Quote>(
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
predict::redeem_permissionless<Quote>(
    predict: &mut Predict,
    manager: &mut PredictManager,
    oracle: &OracleSVI,
    key: MarketKey,
    quantity: u64,
    clock: &Clock,
    ctx: &mut TxContext,
)
```

`redeem` is owner-mediated. `redeem_permissionless` requires the oracle to be settled and deposits through the permissionless manager path.

DeepVol MVP can guide redeem, but non-custodial receipts cannot force users to redeem through DeepVol.

## Manager readback

Binary position readback is source-confirmed as:

```move
predict_manager::position(self: &PredictManager, key: MarketKey): u64
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

## Preflight gates for later implementation

Before any production DeepVol mint flow:

1. Confirm active BTC oracle and expiry at runtime.
2. Construct UP key from upper strike.
3. Construct DOWN key from lower strike.
4. Preview UP leg with `predict::get_trade_amounts`.
5. Preview DOWN leg with `predict::get_trade_amounts`.
6. Ensure both mint costs are nonzero.
7. Ensure quote success is not treated as mintability proof.
8. Ensure manager DUSDC balance covers total premium.
9. Ensure fee coin covers Create Fee.
10. DevInspect the full two-leg PTB before wallet approval.
11. After mint, read back both quantities through `predict_manager::position`.
12. Verify expected `PositionMinted` events or direct position increases.

## Comparison with validated range flow

Validated prior work:

- Range quote and range mint preflight.
- Range wrapper follow transaction.
- `StrategyFollowed`, `PlatformFeeDeposited`, and DeepBook `RangeMinted` event evidence.
- Direct `predict_manager::range_position` readback.

DeepVol-specific remaining work:

- Record this harness round's actual read output and blockers.
- Diagnose the controlled mint-mode CLI dry-run blocker: `InsufficientGas in command 3`.
- Complete controlled live binary mint validation in a later explicitly approved round only after the dry-run blocker is understood.
- Binary redeem validation.
- Binary event parsing in SDK.
- Binary direct readback helper in SDK.
- Non-custodial receipt creation around the two-leg mint path.

## Open blockers

- Active BTC oracle, expiry, and strikes are `MUST CONFIRM AT RUNTIME`.
- Full two-leg binary mint PTB is `MUST CONFIRM BEFORE CODING` production DeepVol flows.
- Binary redeem path and post-settlement behavior are `MUST CONFIRM BEFORE CODING` guided settlement UX.
- Final `MoveReceipt` field types are `MUST CONFIRM BEFORE CODING` after the binary validation harness is designed.
