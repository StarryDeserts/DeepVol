---
Purpose: Record Phase 1C-fix quoteable range selection investigation and scanner results.
Audience: Protocol integrators, transaction-builder authors, frontend developers, reviewers, and AI agents.
Status: Updated with quoteability scanner result from 2026-05-16.
Source of truth relationship: Supplements official contract info, protocol notes, entrypoint binding docs, and range mint validation; runtime market state remains subject to live confirmation.
---

# Range Quoteability Investigation

Phase 1C-fix investigated why the first derived DeepBook Predict range quote failed and added a scanner that searches runtime active oracles for ranges that reach a successful official `predict::get_range_trade_amounts` devInspect return.

No private key, `.env.local` contents, or `.local/` cache contents are documented here.

## Previous failure summary

The Phase 1C quote-only run selected runtime BTC oracle `0x7f6af68a95f01b1c2153edcb7c96475935e8b2d796a8c04f32d57e5d0a83289d` with expiry `1778918400000` and range `50001000000000 / 50002000000000`. That range was derived mechanically from `min_strike + tick_size` and was far from the live BTC spot/forward region.

`predict::get_range_trade_amounts` reached official DeepBook Predict pricing code but aborted in `pricing_config::quote_spread_from_fair_price` with abort code `1`. No `mint_range<DUSDC>` transaction was submitted.

## Abort code interpretation

From the pinned `predict-testnet-4-16` source, `pricing_config::quote_spread_from_fair_price` abort code `1` corresponds to the fair price failing the open interval requirement:

```text
fair_price > 0 && fair_price < FLOAT_SCALING
```

The previous range likely produced a boundary fair price of `0` or `FLOAT_SCALING`. This means the primary blocker was invalid fair price for the selected range, not the public server ask-bounds endpoint returning `null`.

## Ask-bounds null interpretation

`/oracles/:oracle_id/ask-bounds` returned `null` for the selected oracle in Phase 1C and again for the scanner-selected oracle in Phase 1C-fix. Phase 1C-fix treats this as diagnostic data, not as a standalone mint blocker. Quote and mint decisions are gated by official `get_range_trade_amounts` output and the explicit mint safety gates.

## Why narrow or extreme ranges can be unquoteable

A range near the lower edge of the strike grid can be far away from live spot/forward and may have an extreme model probability. The official pricing code rejects boundary fair prices because quote spread logic requires a fair price strictly inside `(0, FLOAT_SCALING)`. RangePilot must therefore derive test candidates around live market anchors rather than from `min_strike` alone.

RangePilot still does not calculate or reimplement DeepBook Predict fair prices. The scanner only proposes strike-aligned candidates and asks the official protocol quote path to accept or reject them.

## Scanner methodology

`npm run find:quoteable-range` runs `scripts/find-quoteable-range.mjs`, which:

1. Loads confirmed DeepBook Predict Testnet config.
2. Parses `SUI_PRIVATE_KEY` from `.env.local` internally without printing the value.
3. Fetches active unexpired oracles from the public server at runtime.
4. Fetches oracle state for each active oracle.
5. Extracts `oracle_id`, underlying, expiry, `min_strike`, `tick_size`, latest spot, and latest forward.
6. Derives strike-aligned candidate ranges around forward and spot anchors.
7. Tests widths of `1`, `5`, `10`, `25`, `50`, `100`, and `250` ticks.
8. Runs `predict::get_range_trade_amounts` via devInspect for every candidate.
9. Prints successful decoded quote candidates and groups failures by abort module/function/code.
10. Submits no transaction.

## Active oracles scanned

The 2026-05-16 scanner run scanned four active BTC oracles:

| Oracle | Underlying | Expiry | Spot | Forward | Candidates |
|---|---|---:|---:|---:|---:|
| `0xe66aabab334efda1e9650d0ad26557bcfb28fa6012e267ec3bf7cdc71ff59084` | BTC | `1779004800000` | `78430345144363` | `78413340215101` | 14 |
| `0xb79524498a9947307e192d8045772150dc47aade4f9e09bd4b6fe3236b9e3125` | BTC | `1780646400000` | `78430345144363` | `78459583226485` | 14 |
| `0x57ab16e132ef0083085d1bdef7ed820892a4d574155f47a3cba168dcb43deb79` | BTC | `1780041600000` | `78430345144363` | `78434266563793` | 14 |
| `0xc746336e790db7e93a34b684fa3768f43a7c3171d0262d0f2c71dc0a2ab5fe22` | BTC | `1779436800000` | `78430345144363` | `78424293490064` | 14 |

Runtime oracle IDs, prices, expiries, and strike values are validation artifacts and must not be copied into static config.

## Candidate ranges tested

The scanner tested 56 total candidate ranges: 4 active oracles × 2 live anchors (`forward`, `spot`) × 7 widths (`1`, `5`, `10`, `25`, `50`, `100`, `250` ticks). Candidates were snapped to the oracle strike grid using `min_strike = 50000000000000` and `tick_size = 1000000000`.

## Quoteable candidates found

All 56 tested candidates returned a decodable `get_range_trade_amounts` result. This verifies that the SDK devInspect return decoder can read the `(mint_cost, redeem_payout)` pair on the successful return path.

However, every printed ranked candidate had `mint=0` and `redeem=0`; `npm run validate:range-quote` selected the lowest ranked candidate and blocked mint because `mintCostAtomic` must be greater than zero.

## Best candidate

The gated quote validation run selected this runtime candidate:

| Field | Value |
|---|---|
| Oracle | `0xe66aabab334efda1e9650d0ad26557bcfb28fa6012e267ec3bf7cdc71ff59084` |
| Underlying | BTC |
| Expiry | `1779004800000` |
| Anchor | `forward:78374764969527` |
| Lower strike | `78375000000000` |
| Higher strike | `78376000000000` |
| Width ticks | `1` |
| Mint cost | `0` atomic DUSDC |
| Redeem payout | `0` atomic DUSDC |
| Ask bounds | `null` diagnostic |

This is a successful quote return shape but not a mintable candidate under the current safety gates.

## Mint execution status

`mint_range<DUSDC>` was not executed. The validation script correctly blocked with:

```text
Mint cost 0 must be greater than 0.
```

## Phase 1C-fix2 follow-up

Phase 1C-fix2 added a quantity sweep, safe devInspect return diagnostics, binary quote sanity checks, and wider/asymmetric range candidate strategies. See [RANGE_QUOTE_UNITS_AND_DECODING.md](./RANGE_QUOTE_UNITS_AND_DECODING.md).

The expanded range investigation tested quantities `1`, `1000`, `10000`, `100000`, `1000000`, `5000000`, `10000000`, and `50000000` across `3136` range quote attempts. It found the first positive range quote at `quantity=1`, `mint_cost=1`, oracle `0xe66aabab334efda1e9650d0ad26557bcfb28fa6012e267ec3bf7cdc71ff59084`, lower `68256000000000`, higher `88256000000000`, strategy `wide-around-anchor`. A later scanner run with refreshed live prices tested `389` candidates and found `3109` successful quote attempts, with current best `quantity=1`, `mint_cost=1`, lower `68012000000000`, higher `88012000000000`. This shows the previous all-zero result was primarily a candidate selection issue, not a broken decoder.

The binary sanity check completed `1152` successful devInspect attempts through `market_key::up` / `market_key::down` and `predict::get_trade_amounts`. Its first nonzero binary quote was `quantity=1000`, `mint_cost=368`, `redeem_payout=349`, strike `78341000000000`, direction `up`.

## Phase 1C-fix3 mintability follow-up

Phase 1C-fix2 proved that quoteable ranges are not necessarily mintable ranges: a positive `get_range_trade_amounts` quote reached the real mint path, but `mint_range<DUSDC>` failed before digest with `MoveAbort` code `7` in `predict::assert_mintable_ask`.

From pinned `predict-testnet-4-16` source, code `7` is `EAskPriceOutOfBounds`. The mint path recalculates post-trade ask after mutating exposure and can reject a candidate that quoted successfully from current state.

Phase 1C-fix3 adds ask-bounds investigation and full mint preflight. See [MINTABILITY_PREFLIGHT_AND_ASK_BOUNDS.md](./MINTABILITY_PREFLIGHT_AND_ASK_BOUNDS.md).

## Current blockers

- A successful quote is no longer sufficient for real mint; full `mint_range<DUSDC>` preflight must succeed first.
- First successful `predict::mint_range<DUSDC>` remains unexecuted.
- `RangeMinted` event shape and post-mint portfolio/positions readback remain unverified.

## Next recommended action

Run the mintable-range scanner and execute `mint_range<DUSDC>` only if the official quote path returns `mint_cost > 0`, the cost is within the 5 DUSDC cap, manager balance covers the quote, and full mint preflight passes.
