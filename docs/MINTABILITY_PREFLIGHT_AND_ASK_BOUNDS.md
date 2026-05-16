---
Purpose: Record Phase 1C-fix3 mintability preflight and ask-bounds validation artifacts.
Audience: Protocol integrators, transaction-builder authors, frontend developers, reviewers, and AI agents.
Status: Updated with Phase 1C-fix3 ask-bounds and mintable-range validation results from 2026-05-16.
Source of truth relationship: Supplements official contract info, protocol notes, range quoteability, range quote units, and range mint validation docs; runtime market state remains subject to live confirmation.
---

# Mintability Preflight and Ask Bounds

Phase 1C-fix3 upgrades RangePilot's mint safety gate from quote success to full `predict::mint_range<DUSDC>` preflight success. It exists because Phase 1C-fix2 proved that a successful `predict::get_range_trade_amounts` quote can still fail on the real mint path.

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

`predict::get_range_trade_amounts` previews a quote from current state. `predict::mint_range<DUSDC>` mutates vault exposure, refreshes oracle risk, and recalculates the ask from post-trade state before completing. The mint path can therefore abort in `assert_mintable_ask` even when the quote path returned a positive `(mint_cost, redeem_payout)` pair.

RangePilot must not execute a real mint after quote success alone.

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

## Mintable candidate found

No. The bounded mintability scan found positive official quotes, but none of the `40` full `mint_range<DUSDC>` preflight attempts passed. The most common classified blocker was code `7` / `EAskPriceOutOfBounds` in `predict::assert_mintable_ask`, with `29` code-7 failures and `11` other classified aborts.

## Mint execution status

No real mint was executed in Phase 1C-fix3 because no candidate passed full mint preflight. `npm run validate:range-quote` also selected a positive runtime quote and then blocked on `predict::assert_mintable_ask` code `7` / `EAskPriceOutOfBounds`; `npm run validate:range-mint` remains blocked unless a later runtime scan finds a candidate with full preflight success.

## Next action

Continue investigating why post-trade ask prices remain outside the resolved `10000000 / 990000000` ask bounds for otherwise positive quoted ranges. Do not retry real `mint_range<DUSDC>` until a fresh `npm run find:mintable-range` run reports at least one full preflight success.
