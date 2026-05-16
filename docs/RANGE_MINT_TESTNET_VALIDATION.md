---
Purpose: Record Phase 1C range quote and mint_range Testnet validation artifacts.
Audience: Protocol integrators, transaction-builder authors, frontend developers, reviewers, and AI agents.
Status: Quote-only and quoteability scanner validation completed on 2026-05-16; mint_range blocked by zero-cost quote safety gate.
Source of truth relationship: Supplements official contract info, protocol notes, and entrypoint binding docs; runtime market state remains subject to live confirmation.
---

# Range Mint Testnet Validation

Phase 1C attempted the official DeepBook Predict range quote path through a local signer validation script. The first run discovered an active oracle at runtime, derived a candidate range from public server oracle metadata, attempted `predict::get_range_trade_amounts` through devInspect, and correctly blocked before `predict::mint_range<DUSDC>` because mint safety gates did not pass. Phase 1C-fix added a quoteability scanner that derives market-centered candidates around runtime spot/forward prices; it reached successful quote return decoding, but the selected quote returned zero mint cost and remains blocked before mint.

No private key, `.env.local` contents, or `.local/` cache contents are documented here.

## Automated local signer validation

| Field | Value |
|---|---|
| Test date | 2026-05-16 |
| Network | Sui Testnet |
| Mode | Quote-only validation; no mint submitted |
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

See [RANGE_QUOTEABILITY_INVESTIGATION.md](./RANGE_QUOTEABILITY_INVESTIGATION.md) for scanner methodology and full summarized results.

## Mint safety gate result

| Gate | Result |
|---|---|
| Runtime active oracle selected | Passed |
| Oracle status active/live | Passed (`active`) |
| Expiry from oracle state/metadata | Passed |
| Strike metadata available | Passed for `min_strike` and `tick_size`; full eligibility still constrained by quote result |
| `lowerStrike < higherStrike` | Passed |
| Win condition displayed as `(lower, higher]` | Passed |
| `get_range_trade_amounts` preview succeeds | Passed in Phase 1C-fix scanner |
| Mint cost readable | Passed (`0`) |
| Mint cost greater than zero | Failed |
| Mint cost `<= 5 DUSDC` | Passed (`0`) |
| Manager balance `>= mint cost` | Passed, but mint remains blocked by zero cost |
| Verified manager ID and owner | Passed |
| Sui Testnet only | Passed |
| Warning before real mint | Not reached |
| No private key output | Passed |
| Forbidden actions blocked | Passed |

Safety gate status: blocked. No `mint_range<DUSDC>` transaction was submitted.

## Mint validation

| Field | Result |
|---|---|
| Executed | No |
| Digest | N/A |
| Explorer URL | N/A |
| `RangeMinted` event | N/A |
| Manager/positions readback after mint | N/A |

## Public server observations

- `/managers/:manager_id/summary` validates the known manager owner and reports `2000000` atomic DUSDC.
- `/oracles/:oracle_id/ask-bounds` returned `null` for the selected active oracle; Phase 1C-fix treats this as diagnostic, not as standalone mint eligibility or ineligibility.
- The selected oracle record exposed `min_strike` and `tick_size`, which are sufficient for strike alignment but not sufficient to prove a positive mintable quote.

## Current blockers

- The previous `pricing_config::quote_spread_from_fair_price` abort code `1` is understood as an invalid boundary fair price for the selected range.
- Ask bounds are `null`; this is diagnostic and must not be treated as mint eligibility by itself.
- Successful quote return mapping for `(mint_cost, redeem_payout)` is verified by Phase 1C-fix scanner devInspect results.
- The selected quote returned `mint_cost = 0`, so mint remains blocked by safety gates.
- First real `predict::mint_range<DUSDC>` remains unexecuted.
- `RangeMinted` event shape and portfolio/positions readback after mint remain unverified.

## Browser wallet manual validation checklist

Browser validation remains pending and should wait until quote safety gates pass in the automated local signer path.

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

1. Expand candidate search for the first positive nonzero quote, preferably using official source-confirmed dimensions such as wider or asymmetric ranges.
2. Keep `npm run validate:range-quote` as the gate for selecting the best runtime candidate.
3. Only run `npm run validate:range-mint` after the quote has `mint_cost > 0`, cost is within the 5 DUSDC cap, and all safety gates pass.
4. Update this document with the first successful positive quote and mint digest, or with the next precise blocker.
