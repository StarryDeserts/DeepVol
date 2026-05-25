---
Purpose: Document the BTC MOVE mintable range validation gate before VolSeries creation and buy preflight.
Audience: Frontend developers, SDK implementers, protocol integrators, reviewers, and AI agents.
Status: Added for DeepVol-18-fix-2: Create BTC MOVE Series is gated by quote plus UP/DOWN mint devInspect validation.
Source of truth relationship: Derived from DeepVol frontend/SDK implementation and DeepBook Predict mintability investigations; runtime market state remains authoritative.
---

# DeepVol Mintable BTC MOVE Range

## Summary

`series::create_series` success is not proof that a BTC MOVE range can mint through DeepBook Predict. `create_series` is permissionless and validates DeepVol metadata only: active future expiry, nonempty metadata, fee bps, and `lower_strike < upper_strike`.

Before a newly created BTC MOVE `VolSeries` can unlock quotes, receipt preflight, or wallet review, the frontend must validate that the selected range is mintable for the current active BTC market.

## Required leg mapping

BTC MOVE is composed from two binary Predict legs:

| BTC MOVE leg | DeepBook Predict key | Strike source |
|---|---|---|
| UP | `market_key::up(series.oracle_id, series.expiry, series.upper_strike)` | `upper` |
| DOWN | `market_key::down(series.oracle_id, series.expiry, series.lower_strike)` | `lower` |

Do not invert these. The SDK candidate search quotes and preflights UP at `upper` and DOWN at `lower`.

## `assert_mintable_ask::7`

DeepBook Predict abort:

```text
predict::assert_mintable_ask::7
```

means the selected ask / strike is not mintable for this oracle market. Quote success alone is insufficient because a later mint path can still fail the post-trade ask-bound check.

User-facing copy depends on context:

- range search / create-series context: `Selected BTC MOVE range is not mintable for the current market. Try a wider range or refresh suggested strikes.`
- buy / receipt preflight context: `Selected BTC MOVE range is not mintable for the current market. Create or select a wider BTC MOVE series before buying.`

Advanced diagnostics may still retain the raw `predict::assert_mintable_ask::7` / VM detail for debugging.

## Candidate generation

The SDK generates wider candidate ranges around the active BTC market anchor:

```text
mid = activeMarket.forward || activeMarket.spot
tickSize = activeMarket.tickSize || 1000000000
widthMultipliers = [10, 20, 50, 100, 200, 500]

for each multiplier:
  width = tickSize * multiplier
  lower = roundDown(mid - width, tickSize)
  upper = roundUp(mid + width, tickSize)
  keep only candidates where lower >= minStrike and lower < upper
```

The goal is to avoid accidental zero-width or one-tick BTC MOVE ranges. If the market anchor is close to `minStrike`, the lower strike is clamped to the configured minimum strike and still snapped to the grid.

Ask-bound data is treated as diagnostic unless its schema is clearly safe to apply. Quote plus mint preflight is the authoritative validation path.

## Validation flow

For each candidate range:

1. quote UP with `direction = "up"`, `is_up = true`, `strike = upper`, and selected quantity;
2. quote DOWN with `direction = "down"`, `is_up = false`, `strike = lower`, and selected quantity;
3. reject candidates with missing, failed, or non-positive quotes;
4. devInspect UP `predict::mint<DUSDC>`;
5. devInspect DOWN `predict::mint<DUSDC>`;
6. select the first candidate whose UP and DOWN mint preflights pass.

Failure diagnostics are grouped as quote failure, non-positive quote, UP mint preflight failure, DOWN mint preflight failure, `assert_mintable_ask`, or unknown error.

## Browser flow

The `/buy/btc-move` page exposes `Regenerate mintable range` when the selected BTC MOVE series is missing, stale, validation-required, or non-mintable.

Successful regeneration:

- fills the lower / upper strike inputs from the selected candidate;
- shows selected lower, selected upper, candidate width, UP quote, DOWN quote, and validation status;
- records a dependency-keyed validation pass.

Manual lower strike, upper strike, quantity, wallet, PredictManager, active market, package/config, or quote-asset changes invalidate the previous validation.

## Create Series gate

`Create BTC MOVE Series` must stay disabled until the current lower/upper range has a matching recent passed mintability validation.

The hook-level guard repeats the UI gate before opening wallet review, so button state cannot be bypassed by stale page state.

After wallet-approved `create_series` succeeds, the created series ID is attached to the passed validation record. That association is still dependency-keyed; it is not an unconditional “series is always mintable” flag.

## Active series handling

A selected `VolSeries` can be active and structurally valid but still not ready for BTC MOVE buying.

| Status | Meaning |
|---|---|
| `missing` | No selected series or selected series could not be loaded. |
| `stale` | Series does not match the active BTC market, is inactive, expired, or has invalid strikes. |
| `validationRequired` | Series matches the active BTC market structurally but has no recent passed mintability record. |
| `nonMintable` | The current validation key has a failed mintability record, including `assert_mintable_ask::7`. |
| `ready` | Series matches the active BTC market and has recent passed mintability validation. |

The known failed browser-created series `0x2197fae8…8341f81c` with range `77238000000000 / 77240000000000` must not be treated as `ready` without a fresh passed validation. If it remains in localStorage, the UI should allow the user to regenerate a wider mintable range and create/select a replacement series.

## Safety boundaries

This validation round performs only browser-safe quote and `devInspect` checks until the user explicitly approves a wallet transaction.

It does not:

- modify Move contracts;
- modify `move/deepvol/Move.toml`;
- publish or upgrade packages;
- execute real `create_series` automatically;
- execute BTC MOVE buy or redeem automatically;
- execute primitive or RANGE mints;
- withdraw ProtocolVault funds;
- use mainnet;
- read `.env.local`, `.trace/`, or `.traces/`.
