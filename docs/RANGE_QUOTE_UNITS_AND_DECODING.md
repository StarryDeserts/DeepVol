---
Purpose: Record Phase 1C-fix2 quantity-unit, return-decoding, binary quote, and range-selection validation.
Audience: Protocol integrators, transaction-builder authors, frontend developers, reviewers, and AI agents.
Status: Updated with Phase 1C-fix2 validation result from 2026-05-16.
Source of truth relationship: Supplements official contract info, protocol notes, range quoteability investigation, and range mint validation; runtime market state remains subject to live confirmation.
---

# Range Quote Units and Decoding

Phase 1C-fix2 investigates why successful official `predict::get_range_trade_amounts` devInspect calls returned `mint_cost = 0` and `redeem_payout = 0` for the first spot/forward-centered range candidates.

No private key, `.env.local` contents, or `.local/` cache contents are documented here.

## Why zero quote returns needed investigation

Phase 1C-fix verified that the range quote command can reach the official protocol path and return a decodable `(mint_cost, redeem_payout)` pair. The remaining blocker is that zero mint cost is not a mintable quote under RangePilot safety gates.

The current investigation distinguishes four possible causes:

1. The tested quantity of `1` is below the meaningful protocol unit and rounds to zero.
2. DevInspect return decoding is wrong or incomplete.
3. Centered spot/forward range selection finds only zero-cost bands.
4. Current active Testnet markets do not expose a small mintable range under the 5 DUSDC cap.

## Quantity sweep methodology

`npm run investigate:range-quote-units` runs a read-only/devInspect sweep across runtime active oracles. It derives expanded strike-aligned candidates from live spot/forward anchors and tests these quantities:

```text
1, 1000, 10000, 100000, 1000000, 5000000, 10000000, 50000000
```

For every attempt it prints public market/candidate fields, quantity, decoded mint cost, decoded redeem payout, success/abort status, and abort module/code when present. It submits no transaction.

## Quantity sweep result

`npm run investigate:range-quote-units` completed on 2026-05-16 with `3136` range quote attempts, `3135` successes, and `1` grouped failure.

The first observed nonzero positive range quote from the initial quantity sweep was:

| Field | Value |
|---|---|
| Oracle | `0xe66aabab334efda1e9650d0ad26557bcfb28fa6012e267ec3bf7cdc71ff59084` |
| Underlying | BTC |
| Expiry | `1779004800000` |
| Lower strike | `68256000000000` |
| Higher strike | `88256000000000` |
| Width ticks | `20000` |
| Strategy | `wide-around-anchor` |
| Quantity | `1` |
| Mint cost | `1` atomic DUSDC |
| Redeem payout | `0` atomic DUSDC |

A later `npm run find:quoteable-range` run with refreshed live prices tested `389` candidates, found `3109` successful quote attempts, and selected the current best candidate at oracle `0xe66aabab334efda1e9650d0ad26557bcfb28fa6012e267ec3bf7cdc71ff59084`, lower `68012000000000`, higher `88012000000000`, strategy `wide-around-anchor`, `quantity=1`, `mint_cost=1`, `redeem_payout=0`.

The same candidate scaled to nonzero costs at larger quantities, including `quantity=1000 mint_cost=1000 redeem_payout=994`, `quantity=1000000 mint_cost=1000000 redeem_payout=994753`, and `quantity=5000000 mint_cost=5000000 redeem_payout=4973769`.

Conclusion: the earlier all-zero scanner result was not caused solely by quantity units. Expanded range selection found nonzero official range quotes, and quantity affects rounding and payout precision.

## Return decoding diagnostics

The SDK now records safe devInspect return diagnostics for u64-pair quotes:

- `returnValues` count
- return type tags
- raw byte lengths
- decoded little-endian u64 values
- decode status per return value

Raw bytes are not printed. These diagnostics are metadata only and are safe to document when needed.

The representative successful range quote diagnostic decoded two return values: `returnValues count = 2`, both type tags were `u64`, both byte lengths were `8`, and both values decoded successfully. This verifies the SDK's little-endian u64-pair mapping for the inspected success path.

## Binary quote sanity check

`npm run investigate:binary-quote` performs read-only/devInspect sanity checks for documented binary quote entrypoints:

- `market_key::up`
- `market_key::down`
- `predict::get_trade_amounts`

It tests runtime strike candidates around live spot/forward anchors for both up/down directions and the same quantity sweep. It does not execute binary mint or redeem.

`npm run investigate:binary-quote` completed on 2026-05-16 with `1152` attempts, `1152` successes, and `0` failures. The first observed nonzero binary quote was `quantity=1000`, `mint_cost=368`, `redeem_payout=349`, oracle `0xe66aabab334efda1e9650d0ad26557bcfb28fa6012e267ec3bf7cdc71ff59084`, strike `78341000000000`, direction `up`.

Conclusion: the binary `market_key::up` / `market_key::down` plus `predict::get_trade_amounts` devInspect path is callable and can return nonzero quotes. Binary `quantity=1` can still round to zero, so quantity units matter for some quote shapes.

## Range candidate strategy updates

Range candidate generation now includes more than centered spot/forward widths:

- centered ranges around forward and spot anchors
- below-anchor ranges
- above-anchor ranges
- wide-around-anchor ranges
- wide-below-anchor ranges
- wide-above-anchor ranges

All candidates remain snapped to the runtime oracle strike grid and validated as `(lower, higher]`. RangePilot still does not calculate or reimplement DeepBook Predict fair prices; it asks the official quote path to accept or reject every candidate.

## Finding: quantity vs decoding vs market/range selection

The all-zero Phase 1C-fix result was caused by the initially narrow centered range set, not by a broken return decoder. Quantity can cause rounding to zero for some binary and range shapes, but expanded wide/asymmetric range candidates produced positive official range quotes even at `quantity=1`.

Current evidence points to market/range selection as the primary previous blocker, with quantity unit choice as a secondary precision and rounding concern.

## Mint execution status

`npm run validate:range-quote` selected a positive range quote with `quantity=1`, `mint_cost=1`, manager balance coverage, active runtime oracle, valid bounds, and Testnet-only safety gates.

`npm run validate:range-mint` reached the real Testnet `predict::mint_range<DUSDC>` submission path, but transaction resolution failed before returning a digest with `MoveAbort` code `7` in `predict::assert_mintable_ask`.

First successful mint remains blocked until the official mint ask/mintability requirement is understood and can be preflighted safely.

## Next step

Confirm `predict::assert_mintable_ask` abort code `7` from the pinned `predict-testnet-4-16` source before retrying mint.
