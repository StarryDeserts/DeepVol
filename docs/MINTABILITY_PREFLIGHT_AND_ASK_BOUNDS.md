---
Purpose: Record Phase 1C-fix3 mintability preflight and ask-bounds validation artifacts.
Audience: Protocol integrators, transaction-builder authors, frontend developers, reviewers, and AI agents.
Status: Updated with Phase 1C-debug source-level mintability diagnostics from 2026-05-16.
Source of truth relationship: Supplements official contract info, protocol notes, range quoteability, range quote units, range mint validation, and source-analysis docs; runtime market state remains subject to live confirmation.
---

# Mintability Preflight and Ask Bounds

Phase 1C-fix3 upgrades RangePilot's mint safety gate from quote success to full `predict::mint_range<DUSDC>` preflight success. Phase 1C-debug adds source-level diagnostics for why that preflight still blocks positive quotes. See [MINTABILITY_SOURCE_ANALYSIS.md](./MINTABILITY_SOURCE_ANALYSIS.md) and [DEEPBOOK_PREDICT_MINTABILITY_DEBUG_REPORT.md](./DEEPBOOK_PREDICT_MINTABILITY_DEBUG_REPORT.md).

No private key, `.env.local` contents, or `.local/` cache contents are documented here.

## Previous failure summary

Phase 1C-fix2 found positive official range quotes and allowed one gated Testnet mint attempt after quote safety gates passed. The transaction did not return a digest. It failed during transaction resolution with `MoveAbort` code `7` in `predict::assert_mintable_ask`.

The failed mint attempt showed that quote success is necessary but not sufficient for mint eligibility.

## `EAskPriceOutOfBounds` explanation

From pinned `predict-testnet-4-16` source:

```move
const EAskPriceOutOfBounds: u64 = 7;
```

`assert_mintable_ask` resolves ask bounds and rejects post-trade ask prices outside those bounds:

```move
let (min_ask, max_ask) = predict.resolve_ask_bounds(oracle_id);
assert!(ask_price >= min_ask && ask_price <= max_ask, EAskPriceOutOfBounds);
```

Therefore the Phase 1C-fix2 mint attempt failed because the post-trade `ask_price` was outside resolved ask bounds.

## Public endpoint ask-bounds result

`npm run investigate:ask-bounds` scanned four active runtime BTC oracles on 2026-05-16. `/oracles/:oracle_id/ask-bounds` returned `null` for all four active oracles. Endpoint `null` remains diagnostic and is not treated as mint eligibility.

## Onchain `predict::ask_bounds` result

`npm run investigate:ask-bounds` devInspected `predict::ask_bounds(predict, oracle_id)` for the same four active runtime BTC oracles and decoded `(min_ask, max_ask)` with the shared safe u64-pair diagnostic decoder.

All four onchain calls succeeded and returned:

```text
min_ask = 10000000
max_ask = 990000000
```

Onchain `predict::ask_bounds` is now the authoritative preflight source for this validation path. The public endpoint returned `null`, but onchain resolved bounds were available.

## Why quote success does not guarantee mint success

`predict::get_range_trade_amounts` previews a quote from current state. Phase 1C-debug inspected the local source snapshot at `deepbookv3-predict-package/predict` and confirmed that `predict::mint_range<DUSDC>` first calls `vault.insert_range`, then `refresh_oracle_risk`, then recalculates the ask from post-trade state before running `assert_mintable_ask`. The mint path can therefore abort in `assert_mintable_ask` even when the quote path returned a positive `(mint_cost, redeem_payout)` pair.

The exact failing post-trade `ask_price` is not exposed by failed preflight return values. RangePilot reports below-min / above-max / unknown ask-side diagnostics as inference only, and must not execute a real mint after quote success alone.

## Full mint preflight methodology

Phase 1C-fix3 adds `devInspectMintRangePreflight()`, which builds the same PTB shape as real `predict::mint_range<DUSDC>` by reusing `buildMintRangeTransaction(..., allowRealTestnetMint: true)` and devInspects it before any signing/submission path.

A candidate is mintable only if all gates pass:

- active oracle discovered at runtime
- quote success
- `mint_cost > 0`
- `mint_cost <= 5 DUSDC`
- manager DUSDC balance covers mint cost
- verified manager owner
- valid `(lower, higher]` range bounds
- Testnet config/client
- forbidden target scan passes
- full mint preflight succeeds

If preflight aborts with code `7`, it is classified as `EAskPriceOutOfBounds`, and no real mint is submitted.

## Candidates tested

`npm run find:mintable-range` scanned four active runtime BTC oracles on 2026-05-16. The scanner derived `390` candidate ranges, tested the top `120` quote candidates, and attempted `960` quantity-aware quote previews across the configured quantity sweep.

Scanner summary:

```text
attempts: 960
quote successes: 960
zero-cost quotes: 118
positive quotes under cap: 772
preflight attempts: 40
preflight successes: 0
code 7 failures: 29
other preflight failures: 11
best mintable candidate: none
```

## Phase 1C-debug source-level diagnostics

The SDK now centralizes source-derived abort constants in `packages/sdk/src/deepbookPredict/errors.ts`. `predict::assert_mintable_ask` code `7` is classified as `EAskPriceOutOfBounds`; other source-known module/code pairs are classified as `source_known_abort` with likely-cause text when the abort code is observable.

`npm run analyze:mint-preflight-aborts` is a read-only devInspect analyzer that groups full mint preflight aborts by `module::function::code::constantName`, prints representative candidate params, and reports conservative ask-side inference counts. `npm run find:mintable-range` now uses source-informed candidate families and bounded bucket selection rather than blindly increasing quote/preflight caps.

Fresh targeted runs found full preflight successes. The result is runtime-state dependent and must be refreshed before any real mint attempt.

## Targeted candidate scan result

`npm run find:mintable-range` used source-informed candidate families and kept the existing caps at `120` quote candidates and `40` full mint preflight attempts. The fresh run scanned four active BTC oracles, derived `566` candidate ranges, tested `960` quantity-aware quote attempts, and found `32` full preflight successes.

Scanner summary:

```text
attempts: 960
quote successes: 936
zero-cost quotes: 110
positive quotes under cap: 731
preflight attempts: 40
preflight successes: 32
code 7 failures: 6
other preflight failures: 2
ask side below_min: 2
ask side above_max: 4
ask side unknown: 2
best mintable candidate: oracle=0xe66aabab334efda1e9650d0ad26557bcfb28fa6012e267ec3bf7cdc71ff59084 quantity=1000 mint=10 redeem=0 lower=78321000000000 higher=78331000000000 family=forward_centered_target_width
```

A separate `npm run analyze:mint-preflight-aborts` run, with refreshed live prices, found `32` preflight successes and grouped remaining aborts as:

```text
predict::assert_mintable_ask::7::EAskPriceOutOfBounds = 5
vault::set_mtm_with_curve::unknown::unknown = 3
below-min inference count = 1
above-max inference count = 4
unknown inference count = 3
```

`vault::set_mtm_with_curve` did not expose a parsed abort code in the observed message, so its exact source constant remains unknown rather than guessed.

## Mintable candidate found

Yes. Phase 1C-debug found source-informed candidates that pass full `mint_range<DUSDC>` devInspect preflight. This changes the blocker from “no mintable candidate found” to “real mint may be attempted only through the guarded `validate:range-mint` path if its own fresh quote, balance, Testnet, forbidden-target, and full preflight gates pass.”

## Mint execution status

Phase 1C-debug executed one gated Sui Testnet `predict::mint_range<DUSDC>` only after quote, balance, Testnet, forbidden-target, and full preflight gates passed.

```text
executed: yes
digest: 3XoGAs2NgEMbkn59y9KrRGsRbicBvTN6po5gmTsoHARe
RangeMinted event: found
oracle: 0xe66aabab334efda1e9650d0ad26557bcfb28fa6012e267ec3bf7cdc71ff59084
expiry: 1779004800000
lower: 78194000000000
higher: 78204000000000
quantity: 1000
mint cost: 10 atomic DUSDC
family: forward_centered_target_width
```

The result proves the source-informed candidate generation can find a mintable range under current Testnet state. Future real mint attempts must still run fresh runtime discovery and full preflight because oracle prices, vault exposure, and ask bounds are state-dependent.

## Next action

Use the successful digest and `RangeMinted` event shape to implement portfolio readback and range-position display. Keep `redeem_range`, supply, withdraw, binary mint/redeem, and mainnet transactions out of scope until separately planned and validated.
