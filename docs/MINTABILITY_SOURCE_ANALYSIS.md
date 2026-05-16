---
Purpose: Source-level Phase 1C-debug mintability diagnostics for DeepBook Predict range mints.
Audience: Protocol integrators, transaction-builder authors, frontend developers, reviewers, DeepBook team, and AI agents.
Status: Updated with local source snapshot analysis from 2026-05-16.
Source of truth relationship: Source-level debugging supplement; official docs remain deployment/config source of truth.
---

# Mintability Source Analysis

Source inspected from local snapshot:
`deepbookv3-predict-package/predict`

Local source snapshot used for debugging; official docs remain deployment/config source of truth.

No private key, `.env.local` contents, `.local/` cache contents, or raw secret material are documented here.

## Source files inspected

- `deepbookv3-predict-package/predict/sources/predict.move`
- `deepbookv3-predict-package/predict/sources/config/pricing_config.move`
- `deepbookv3-predict-package/predict/sources/config/risk_config.move`
- `deepbookv3-predict-package/predict/sources/config/treasury_config.move`
- `deepbookv3-predict-package/predict/sources/helper/constants.move`
- `deepbookv3-predict-package/predict/sources/helper/math.move`
- `deepbookv3-predict-package/predict/sources/helper/i64.move`
- `deepbookv3-predict-package/predict/sources/helper/rate_limiter.move`
- `deepbookv3-predict-package/predict/sources/helper/strike_matrix.move`
- `deepbookv3-predict-package/predict/sources/market_key/market_key.move`
- `deepbookv3-predict-package/predict/sources/market_key/range_key.move`
- `deepbookv3-predict-package/predict/sources/oracle.move`
- `deepbookv3-predict-package/predict/sources/oracle_config.move`
- `deepbookv3-predict-package/predict/sources/predict_manager.move`
- `deepbookv3-predict-package/predict/sources/registry.move`
- `deepbookv3-predict-package/predict/sources/vault/plp.move`
- `deepbookv3-predict-package/predict/sources/vault/vault.move`

## `get_range_trade_amounts` flow

`predict::get_range_trade_amounts` is a read-style quote path. It calls `predict.range_trade_prices(oracle, key, clock)` using current state, then returns scaled amounts:

```move
let (ask, bid) = predict.range_trade_prices(oracle, key, clock);
(math::mul(ask, quantity), math::mul(bid, quantity))
```

It does not insert the requested range exposure into the vault and does not refresh oracle risk for the hypothetical trade before pricing.

## `mint_range` flow

`predict::mint_range<Quote>` performs the write-path checks and mutates state before charging the trader:

1. Validate manager owner, trading pause, nonzero quantity, quote asset, range key/oracle match, and live oracle.
2. Extract `lower` and `higher` from the `RangeKey`.
3. Insert the requested range exposure into the vault.
4. Refresh oracle risk.
5. Recompute range trade prices against the post-insert state.
6. Run `assert_mintable_ask` on the recomputed ask.
7. Withdraw payment from the manager, accept payment into the vault, assert total exposure, increase manager range position, and emit `RangeMinted`.

The key source-level difference is:

```move
predict.vault.insert_range(oracle.id(), lower, higher, quantity);
predict.refresh_oracle_risk(oracle);
let (ask, _) = predict.range_trade_prices(oracle, key, clock);
predict.assert_mintable_ask(oracle.id(), ask);
```

Therefore the mint path checks a post-trade, post-risk-refresh ask, not the same current-state quote returned by `get_range_trade_amounts`.

## Range fair price and spread

`range_trade_prices` computes the range fair price from the two binary up prices:

```text
range fair price = lower_up_price - higher_up_price
```

For live markets, the source passes that fair price plus vault state into `pricing_config.quote_spread_from_fair_price(fair_price, predict.vault.total_mtm(), predict.vault.balance())`. Spread is therefore introduced by `pricing_config`, and the live path depends on current vault liability and balance.

`pricing_config::quote_spread_from_fair_price` rejects boundary fair prices with `EFairPriceAlreadySettled = 1` when fair price is not strictly between `0` and `FLOAT_SCALING`.

## Ask bounds and code 7

`predict.move` defines:

```move
const EAskPriceOutOfBounds: u64 = 7;
```

`assert_mintable_ask` resolves per-oracle/default ask bounds and enforces:

```move
assert!(ask_price >= min_ask && ask_price <= max_ask, EAskPriceOutOfBounds);
```

The default constants from `helper/constants.move` are:

```text
FLOAT_SCALING = 1000000000
DEFAULT_MIN_ASK_PRICE = 10000000
DEFAULT_MAX_ASK_PRICE = 990000000
```

Phase 1C-fix3 devInspect confirmed the same resolved onchain ask bounds for scanned active BTC oracles: `min_ask = 10000000`, `max_ask = 990000000`.

## Why quote success does not guarantee mint success

Quote success only proves the current-state `get_range_trade_amounts` path returned decodable `(mint_cost, redeem_payout)` values for the candidate. Mint success additionally requires the post-insert, post-risk-refresh ask to remain within resolved ask bounds and the vault exposure checks to pass.

A candidate can therefore have a positive quote and still fail full `mint_range<DUSDC>` preflight with code `7` after the mint path inserts the same candidate into vault exposure and recomputes risk/ask.

## What remains externally unobservable

The exact failing post-trade `ask_price` is not exposed by the current preflight abort message or by `get_range_trade_amounts` return values. `RangeMinted` would include `ask_price` only after a successful mint, but failed preflight does not emit that event.

Ask-side diagnostics in RangePilot are therefore conservative:

- If the pre-trade quote cost is below the min ask cost threshold, the script may report a low-confidence below-min inference.
- If the pre-trade quote cost is above the max ask cost threshold, the script may report a low-confidence above-max inference.
- If the pre-trade quote cost is inside bounds, the script reports `unknown` because the failing value is recomputed after exposure insertion and risk refresh.

RangePilot must not fabricate an exact post-trade ask price.

## Source-informed candidate generation

The targeted scanner now adds candidate families that are intended to probe non-boundary ask prices without blindly raising scan caps:

- `wide_around_forward`
- `wide_around_spot`
- `forward_below_to_above`
- `forward_centered_target_width`
- `target_fair_price_5pct`
- `target_fair_price_10pct`
- `target_fair_price_25pct`
- `target_fair_price_50pct`
- `target_fair_price_75pct`
- `target_fair_price_90pct`
- `safe_larger_quantity_probe`

Preflight selection now favors buckets whose pre-trade quote appears within ask-bound cost thresholds, near lower bound, near upper bound, and representative below/above-bound probes. Full mint preflight remains the only mintability gate.
