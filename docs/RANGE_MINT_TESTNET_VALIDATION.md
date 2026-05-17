---
Purpose: Record Phase 1C range quote and mint_range Testnet validation artifacts.
Audience: Protocol integrators, transaction-builder authors, frontend developers, reviewers, and AI agents.
Status: Quote-only, quoteability scanner, quantity-unit, return-decoding, binary quote, ask-bounds, mintability preflight, source-level mintability diagnostics, first Testnet mint, portfolio readback, and first Testnet range redeem completed through Phase 1D-2.
Source of truth relationship: Supplements official contract info, protocol notes, and entrypoint binding docs; runtime market state remains subject to live confirmation.
---

# Range Mint Testnet Validation

Phase 1C attempted the official DeepBook Predict range quote path through a local signer validation script. The first run discovered an active oracle at runtime, derived a candidate range from public server oracle metadata, attempted `predict::get_range_trade_amounts` through devInspect, and correctly blocked before `predict::mint_range<DUSDC>` because mint safety gates did not pass. Phase 1C-fix added a quoteability scanner that derives market-centered candidates around runtime spot/forward prices; it reached successful quote return decoding, but the selected quote returned zero mint cost and remained blocked before mint. Phase 1C-fix2 added quantity-unit sweep, safe return-decoding diagnostics, binary quote sanity checks, and wider/asymmetric candidate strategies; it found positive official range quotes and nonzero binary quotes, then reached the real mint submission path before failing in `predict::assert_mintable_ask` with abort code `7` before digest. Phase 1C-fix3 identifies code `7` as `EAskPriceOutOfBounds` and upgrades mint safety so full `mint_range<DUSDC>` devInspect preflight, not quote success alone, is required before real mint execution. Phase 1C-debug inspected `deepbookv3-predict-package/predict`, confirmed the source-level difference between quote and mint, found source-informed preflight-passing candidates, and submitted the first gated Sui Testnet range mint. Phase 1D-1 then confirmed portfolio readback for the minted range; see [PORTFOLIO_READBACK_TESTNET_VALIDATION.md](./PORTFOLIO_READBACK_TESTNET_VALIDATION.md). Phase 1D-2 later redeemed `500` from the same range through one gated Testnet `predict::redeem_range<DUSDC>` and confirmed direct `range_position` decreased to `500`; see [RANGE_REDEEM_TESTNET_VALIDATION.md](./RANGE_REDEEM_TESTNET_VALIDATION.md).

No private key, `.env.local` contents, or `.local/` cache contents are documented here.

## Automated local signer validation

| Field | Value |
|---|---|
| Test date | 2026-05-16 |
| Network | Sui Testnet |
| Mode | Quote-only validation, full mint preflight, gated first mint, and portfolio readback passed |
| Signer public address | `0xc558e37d20405a9751c81124ac8d167e2b2d368b834319adafa549449e0715f5` |
| Manager ID | `0x6f341e107a87812fd4fddfc4fc50a7e3ab5bc21cabff2cd39dd86b662fa75599` |
| Manager owner source | Public server `/managers/:manager_id/summary` |
| Manager owner | `0xc558e37d20405a9751c81124ac8d167e2b2d368b834319adafa549449e0715f5` |
| Manager DUSDC balance | `2000000` atomic DUSDC |
| Manager summary keys | `manager_id`, `owner`, `balances`, `trading_balance`, `open_exposure`, `redeemable_value`, `realized_pnl`, `unrealized_pnl`, `account_value`, `open_positions`, `awaiting_settlement_positions` |

## Runtime market selection

| Field | Runtime value |
|---|---|
| Active oracle selected | `0x7f6af68a95f01b1c2153edcb7c96475935e8b2d796a8c04f32d57e5d0a83289d` |
| Oracle object candidate | `0x7f6af68a95f01b1c2153edcb7c96475935e8b2d796a8c04f32d57e5d0a83289d` |
| Underlying | `BTC` |
| Oracle status | `active` |
| Expiry | `1778918400000` |
| Strike grid source | Public server oracle metadata |
| Minimum strike | `50000000000000` |
| Tick size | `1000000000` |
| Candidate lower strike | `50001000000000` |
| Candidate higher strike | `50002000000000` |
| Range win condition | `(lower, higher]` |
| Quantity | `1` |
| Ask bounds | `null` from `/oracles/:oracle_id/ask-bounds` |

The selected oracle and strikes are runtime validation artifacts. They must not be copied into static config.

## Quote preview result

`predict::get_range_trade_amounts` was attempted through devInspect using the runtime oracle candidate and derived `RangeKey`.

| Field | Result |
|---|---|
| Quote preview | Blocked |
| Mint cost | Not available |
| Redeem payout | Not available |
| DevInspect result | Move abort in `pricing_config::quote_spread_from_fair_price` |
| Abort code | `1` |
| Abort location | `0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138::pricing_config::quote_spread_from_fair_price` at offset `17` |

This confirmed the script could reach the official quote path, but the selected range was not quoteable because the official pricing path rejected a boundary fair price. From the pinned `predict-testnet-4-16` source, `pricing_config::quote_spread_from_fair_price` abort code `1` means the fair price failed `fair_price > 0 && fair_price < FLOAT_SCALING`. Ask-bounds `null` is now treated as diagnostic rather than the primary blocker.

## Phase 1C-fix quoteability scanner result

`npm run find:quoteable-range` scanned four active BTC oracles at runtime, derived 56 total candidate ranges around live spot/forward anchors, and devInspected every candidate through `predict::get_range_trade_amounts`. All tested candidates returned decodable `(mint_cost, redeem_payout)` values, which verifies the successful quote return mapping.

The gated `npm run validate:range-quote` run selected oracle `0xe66aabab334efda1e9650d0ad26557bcfb28fa6012e267ec3bf7cdc71ff59084`, expiry `1779004800000`, range `78375000000000 / 78376000000000`, anchor `forward:78374764969527`, and width `1` tick. The decoded quote was `mint=0` and `redeem=0`, so mint remained blocked because mint cost must be greater than zero.

See [RANGE_QUOTEABILITY_INVESTIGATION.md](./RANGE_QUOTEABILITY_INVESTIGATION.md) for scanner methodology and full summarized results. See [RANGE_QUOTE_UNITS_AND_DECODING.md](./RANGE_QUOTE_UNITS_AND_DECODING.md) for the Phase 1C-fix2 quantity-unit, return-decoding, and binary quote investigation.

## Phase 1C-fix2 quote units and binary sanity result

`npm run investigate:range-quote-units` swept quantities `1`, `1000`, `10000`, `100000`, `1000000`, `5000000`, `10000000`, and `50000000` across expanded centered, adjacent, and wide range candidates. It completed `3136` official range quote attempts with `3135` successes and found the first nonzero range quote at `quantity=1`, `mint_cost=1`, `redeem_payout=0`, oracle `0xe66aabab334efda1e9650d0ad26557bcfb28fa6012e267ec3bf7cdc71ff59084`, lower `68256000000000`, higher `88256000000000`, strategy `wide-around-anchor`. A later `npm run find:quoteable-range` run with refreshed live prices found `3109` quoteable attempts and selected current best `quantity=1`, `mint_cost=1`, lower `68012000000000`, higher `88012000000000`, strategy `wide-around-anchor`.

`npm run investigate:binary-quote` completed `1152` official binary quote attempts with `1152` successes and found the first nonzero binary quote at `quantity=1000`, `mint_cost=368`, `redeem_payout=349`, strike `78341000000000`, direction `up`.

This rules out broken u64-pair decoding as the cause of the previous all-zero range result. Expanded range selection is required; quantity still affects rounding and payout precision.

## Mint safety gate result

The gated `npm run validate:range-quote` run selected a runtime active BTC oracle and passed all quote-only safety gates.

| Gate | Result |
|---|---|
| Runtime active oracle selected | Passed (`0xe66aabab334efda1e9650d0ad26557bcfb28fa6012e267ec3bf7cdc71ff59084`) |
| Oracle status active/live | Passed (`active`) |
| Expiry from oracle state/metadata | Passed (`1779004800000`) |
| Strike metadata available | Passed (`min_strike = 50000000000000`, `tick_size = 1000000000`) |
| `lowerStrike < higherStrike` | Passed (`67801000000000 / 87801000000000`) |
| Win condition displayed as `(lower, higher]` | Passed |
| `get_range_trade_amounts` preview succeeds | Passed |
| Mint cost readable | Passed (`1`) |
| Mint cost greater than zero | Passed |
| Mint cost `<= 5 DUSDC` | Passed (`1`) |
| Manager balance `>= mint cost` | Passed (`2000000` atomic DUSDC) |
| Verified manager ID and owner | Passed |
| Sui Testnet only | Passed |
| Warning before real mint | Reached; mint attempt then failed in `predict::assert_mintable_ask` |
| No private key output | Passed |
| Forbidden actions blocked | Passed |

Safety gate status: passed for quote-only validation. `validate:range-mint` reached the real Testnet mint submission path, then failed before returning a digest with `MoveAbort` code `7` in `predict::assert_mintable_ask`. From pinned `predict-testnet-4-16` source, code `7` is `EAskPriceOutOfBounds`, meaning the post-trade ask price was outside resolved ask bounds. Quote success is not a mint gate; do not retry minting unless full `mint_range<DUSDC>` preflight succeeds.

## Phase 1C-debug source diagnostics

Source inspected from local snapshot: `deepbookv3-predict-package/predict`.

Local source snapshot used for debugging; official docs remain deployment/config source of truth.

The source-level mintability blocker model is now documented in [MINTABILITY_SOURCE_ANALYSIS.md](./MINTABILITY_SOURCE_ANALYSIS.md). The new abort analyzer groups full preflight failures by source-derived `module::function::code::constantName`, and the targeted scanner adds source-informed families such as `wide_around_forward`, `forward_below_to_above`, target fair-price buckets, and `safe_larger_quantity_probe` without raising the bounded preflight cap. Fresh analyzer output must be used to fill the final non-code-7 abort class list; until a full preflight success appears, `validate:range-mint` remains blocked.

## Mint validation

| Field | Result |
|---|---|
| Executed | Yes. Phase 1C-debug submitted one gated Sui Testnet `predict::mint_range<DUSDC>` only after quote, balance, Testnet, forbidden-target, and full preflight gates passed. |
| Digest | `3XoGAs2NgEMbkn59y9KrRGsRbicBvTN6po5gmTsoHARe` |
| Explorer URL | `https://suiexplorer.com/txblock/3XoGAs2NgEMbkn59y9KrRGsRbicBvTN6po5gmTsoHARe?network=testnet` |
| `RangeMinted` event | Found; parsed JSON keys: `ask_price`, `cost`, `expiry`, `higher_strike`, `lower_strike`, `manager_id`, `oracle_id`, `predict_id`, `quantity`, `quote_asset`, `trader` |
| Manager/positions readback after mint | Manager summary readback succeeded; initial positions summary was not usable as active-position proof. Phase 1D-1 direct `range_position` devInspect later confirmed pre-redeem quantity `1000` for the event-derived range `78194000000000 / 78204000000000`; Phase 1D-2 redeemed `500`, leaving active quantity `500`. |
| Previous failure class | Earlier positive-quote mint attempts failed with `MoveAbort` code `7` / `EAskPriceOutOfBounds` in `0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138::predict::assert_mintable_ask`; the successful mint path passed fresh full preflight first. |
| Public ask-bounds endpoint | `null` for all four active runtime BTC oracles scanned by `npm run investigate:ask-bounds` |
| Onchain `predict::ask_bounds` | Succeeded for all four active runtime BTC oracles; decoded `min_ask = 10000000`, `max_ask = 990000000` |
| Full mint preflight | `npm run find:mintable-range` tested `40` full preflight attempts; `0` passed, `29` failed with code `7` / `EAskPriceOutOfBounds`, and `11` failed with other classified aborts. `npm run validate:range-quote` selected a positive quote but also blocked because full preflight failed with code `7` / `EAskPriceOutOfBounds`. |

## Public server observations

- `/managers/:manager_id/summary` validates the known manager owner and reports `2000000` atomic DUSDC.
- `/oracles/:oracle_id/ask-bounds` returned `null` for the selected active oracle; Phase 1C-fix treats this as diagnostic, not as standalone mint eligibility or ineligibility.
- The selected oracle record exposed `min_strike` and `tick_size`, which are sufficient for strike alignment but not sufficient to prove a positive mintable quote.

## Current blockers

- The previous `pricing_config::quote_spread_from_fair_price` abort code `1` is understood as an invalid boundary fair price for the selected range.
- Public ask-bounds endpoint `null` is diagnostic and must not be treated as mint eligibility by itself.
- Successful quote return mapping for `(mint_cost, redeem_payout)` is verified by Phase 1C-fix and Phase 1C-fix2 devInspect results.
- Phase 1C-fix2 found positive official range quotes, including `quantity=1 mint_cost=1` on a wide-around-anchor range, so the previous zero-cost result is no longer the only observed range quote outcome.
- Earlier positive-quote mint attempts failed with `MoveAbort` code `7` / `EAskPriceOutOfBounds` in `predict::assert_mintable_ask` before source-informed candidate generation was added.
- Full `mint_range<DUSDC>` preflight must pass before any further real mint attempt.
- Source-informed scans later found preflight-passing candidates, enabling the first successful `predict::mint_range<DUSDC>` on Sui Testnet with digest `3XoGAs2NgEMbkn59y9KrRGsRbicBvTN6po5gmTsoHARe`.
- `RangeMinted` event shape is verified at the key level.
- Phase 1D-1 re-read the digest, normalized event-derived strikes `78194000000000 / 78204000000000`, found one matching `/ranges/minted` record, and directly devInspected `predict_manager::range_position` twice with quantity `1000`.

## Browser wallet manual validation checklist

Browser validation remains pending and should use the full mint preflight gate plus the Phase 1D-1 direct range-position readback strategy.

- [ ] Open `apps/web` locally.
- [ ] Connect browser wallet.
- [ ] Confirm Testnet.
- [ ] Confirm manager ID is loaded or entered.
- [ ] Confirm manager DUSDC balance.
- [ ] Select active discovered market.
- [ ] Confirm range bounds and win condition.
- [ ] Run quote preview.
- [ ] Confirm cost is small.
- [ ] Approve `mint_range` in wallet.
- [ ] Confirm transaction digest.
- [ ] Confirm `RangeMinted` / portfolio update.

## Next steps

1. Plan the Phase 2 guided range trading MVP around the validated deposit, first mint, portfolio readback, live redeem, and post-redeem readback lifecycle.
2. Keep full `mint_range<DUSDC>` and `redeem_range<DUSDC>` preflight gates because mintability, payout, and vault state remain runtime-state dependent.
3. Do not add supply, withdraw, binary mint/redeem, or mainnet transactions until separately planned and validated.
