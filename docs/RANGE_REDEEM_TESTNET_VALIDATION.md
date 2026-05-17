---
Purpose: Record Phase 1D-2 range redeem Testnet validation for the first DeepBook Predict range position.
Audience: Protocol integrators, SDK implementers, frontend developers, reviewers, and AI agents.
Status: Updated after Phase 1D-2 Testnet redeem validation on 2026-05-17.
Source of truth relationship: Validation supplement; official deployment/config docs remain source of truth for static Testnet values.
---

# Range Redeem Testnet Validation

Phase 1D-2 validated `predict::redeem_range<DUSDC>` for the first minted DeepBook Predict range position on Sui Testnet. The validation used direct `predict_manager::range_position` devInspect before and after the real redeem, decoded official `predict::get_range_trade_amounts` quote output, ran full `redeem_range<DUSDC>` devInspect preflight for candidate quantities, submitted one gated Testnet redeem, parsed `RangeRedeemed`, and confirmed the active range quantity decreased.

No private key, `.env.local` contents, `.local/` cache contents, `.claude/` contents, or local source snapshot contents are documented here.

## Known pre-redeem range facts

| Field | Value |
|---|---|
| Test date | 2026-05-17 |
| Network | Sui Testnet |
| Public server | `https://predict-server.testnet.mystenlabs.com` |
| Mint digest | `3XoGAs2NgEMbkn59y9KrRGsRbicBvTN6po5gmTsoHARe` |
| Mint explorer URL | `https://suiexplorer.com/txblock/3XoGAs2NgEMbkn59y9KrRGsRbicBvTN6po5gmTsoHARe?network=testnet` |
| Manager ID | `0x6f341e107a87812fd4fddfc4fc50a7e3ab5bc21cabff2cd39dd86b662fa75599` |
| Manager owner / trader | `0xc558e37d20405a9751c81124ac8d167e2b2d368b834319adafa549449e0715f5` |
| Oracle ID | `0xe66aabab334efda1e9650d0ad26557bcfb28fa6012e267ec3bf7cdc71ff59084` |
| Underlying | BTC |
| Expiry | `1779004800000` |
| Lower strike | `78194000000000` |
| Higher strike | `78204000000000` |
| Pre-redeem active quantity | `1000` |
| Original mint cost | `10` atomic DUSDC |

The range values are derived from the confirmed `RangeMinted` event for the known mint digest. Earlier planning strike values are superseded by these event-derived values.

## Commands run

| Command | Result |
|---|---|
| `npm run typecheck` | Passed; npm printed existing `sass_binary_site` warnings. |
| `npm run validate:portfolio-readback` | Passed before redeem; direct reads returned active quantity `1000`. |
| `npm run validate:range-redeem-preflight` | Passed; selected quantity `500` with positive payout. |
| `npm run validate:range-redeem` | First run blocked locally before signing because the transaction guard looked for a string target; after fixing the guard to inspect structured `MoveCall` data, one real Testnet redeem succeeded. |

## Manager and range-position before redeem

| Check | Result |
|---|---|
| Manager summary before keys | `manager_id`, `owner`, `balances`, `trading_balance`, `open_exposure`, `redeemable_value`, `realized_pnl`, `unrealized_pnl`, `account_value`, `open_positions`, `awaiting_settlement_positions` |
| Manager owner before | `0xc558e37d20405a9751c81124ac8d167e2b2d368b834319adafa549449e0715f5` |
| Manager DUSDC balance before | `1999990` atomic DUSDC |
| Direct `range_position` before | `1000` |

## Redeem preflight sweep

`npm run validate:range-redeem-preflight` tested only quantities not exceeding the current direct range-position quantity.

| Quantity | Quote result | Redeem payout | Zero payout | Full `redeem_range<DUSDC>` preflight |
|---:|---|---:|---|---|
| `1` | Success | `0` | yes | Passed |
| `10` | Success | `0` | yes | Passed |
| `100` | Success | `0` | yes | Passed |
| `500` | Success | `3` | no | Passed |
| `1000` | Success | `6` | no | Passed |

Selected quantity: `500`.

Selection reason: smallest preflight-passed quantity with positive redeem payout.

Zero-payout handling: zero-payout candidates were not used because positive-payout candidates passed full preflight. Real zero-payout redeem remains blocked unless the script is explicitly invoked with `--allow-zero-payout-redeem` for tiny technical validation.

## Redeem execution

| Field | Value |
|---|---|
| Executed | Yes |
| Validation command | `npm run validate:range-redeem` |
| Redeem quantity | `500` |
| Redeem payout | `3` atomic DUSDC |
| Digest | `9MiZdKDwdZB2WDkv5JFJV7fj88YRvvcw6LYGxX5DeQWc` |
| Explorer URL | `https://suiexplorer.com/txblock/9MiZdKDwdZB2WDkv5JFJV7fj88YRvvcw6LYGxX5DeQWc?network=testnet` |
| Transaction guard | Passed after inspecting structured `MoveCall` data for `predict::redeem_range`; forbidden `mint_range`, supply, withdraw, deposit, create-manager, transfer, split, and merge commands remained blocked. |

The first `npm run validate:range-redeem` attempt did not sign or submit a transaction. It failed before execution because the guard expected a stringified target `::predict::redeem_range`, while the Sui SDK stores transaction targets as structured `{ module: "predict", function: "redeem_range" }` fields in `Transaction.getData()`. The guard was updated to check structured command data before the successful run.

## `RangeRedeemed` event

`RangeRedeemed` event parsing succeeded.

| Field | Parsed value |
|---|---|
| Event type | `0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138::predict::RangeRedeemed` |
| Parsed JSON keys | `bid_price`, `expiry`, `higher_strike`, `is_settled`, `lower_strike`, `manager_id`, `oracle_id`, `payout`, `predict_id`, `quantity`, `quote_asset`, `trader` |
| `predict_id` | `0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a` |
| `manager_id` | `0x6f341e107a87812fd4fddfc4fc50a7e3ab5bc21cabff2cd39dd86b662fa75599` |
| `trader` | `0xc558e37d20405a9751c81124ac8d167e2b2d368b834319adafa549449e0715f5` |
| `quote_asset` | Not normalized from the observed parsed JSON value; raw key was present. |
| `oracle_id` | `0xe66aabab334efda1e9650d0ad26557bcfb28fa6012e267ec3bf7cdc71ff59084` |
| `expiry` | `1779004800000` |
| `lower_strike` | `78194000000000` |
| `higher_strike` | `78204000000000` |
| `quantity` | `500` |
| `payout` | `3` |
| `bid_price` | `6000000` |
| `is_settled` | `false` |

## Post-redeem readback

| Check | Result |
|---|---|
| Direct `range_position` before | `1000` |
| Redeemed quantity | `500` |
| Expected direct `range_position` after | `500` |
| Direct `range_position` after | `500` |
| Quantity delta check | Passed |
| Manager DUSDC balance before | `1999990` atomic DUSDC |
| Manager DUSDC balance after | `1999993` atomic DUSDC |
| Manager summary after keys | `manager_id`, `owner`, `balances`, `trading_balance`, `open_exposure`, `redeemable_value`, `realized_pnl`, `unrealized_pnl`, `account_value`, `open_positions`, `awaiting_settlement_positions` |

The original active quantity `1000` is now historical for this range. Current active quantity after Phase 1D-2 is `500`.

## Current status and limitations

- Minimal Testnet lifecycle is validated through deposit, mint, direct portfolio readback, live range redeem, `RangeRedeemed` parsing, and post-redeem direct readback.
- Future real mints and redeems must still run fresh quote/direct-read/full-preflight gates because market and vault state are runtime-dependent.
- The validation confirms one known `PredictManager` + `RangeKey`; general portfolio enumeration remains pending.
- Direct `predict_manager::balance<DUSDC>` remains pending; manager balance readback currently uses public server summary.
- Settled-range claim behavior through `redeem_range<DUSDC>` remains pending.
- Browser wallet manual validation remains pending.

## Browser manual testing checklist

- [ ] Open `apps/web` locally.
- [ ] Connect browser wallet.
- [ ] Confirm Testnet.
- [ ] Load known manager ID.
- [ ] Confirm range position appears with current active quantity.
- [ ] Confirm redeem quantity selection.
- [ ] Run redeem preflight/preview.
- [ ] Approve `redeem_range` in wallet.
- [ ] Confirm `RangeRedeemed` event.
- [ ] Confirm position quantity decreases.
- [ ] Confirm no private key is used by the browser app.

## Next recommended step

Plan the Phase 2 guided range trading MVP around the validated Testnet lifecycle while keeping direct `range_position` as the wallet-critical active quantity source and full write preflight as the permanent transaction gate.
