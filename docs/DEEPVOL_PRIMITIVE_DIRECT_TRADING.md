---
Purpose: Document UP/DOWN direct primitive trading model and mintable strike validation.
Audience: Protocol integrators, frontend developers.
Status: DeepVol-23 records UP/DOWN primitive Testnet validation success and adds RANGE execution path (pending validation). DeepVol-21 implementation record.
Source of truth relationship: Derived from implementation; does not override protocol or product specs.
---

# UP/DOWN Primitive Direct Trading

## Summary

UP and DOWN are raw DeepBook Predict binary positions that live in the user's PredictManager. Unlike BTC MOVE:

- Primitives do NOT create a DeepVol MoveReceipt.
- Primitives do NOT use a DeepVol VolSeries.
- Primitives do NOT pay a DeepVol create fee.
- Positions are tracked through localStorage records and known-key readback.

## Active BTC market requirement

All primitive trading requires a live active BTC market from the Predict server. The active market provides: oracle ID, oracle object ID, expiry, spot, forward, tickSize, minStrike.

## Mintable strike candidate search

Before wallet execution, a mintable strike must be validated. The SDK function `findMintableBinaryPrimitiveCandidate()` generates tick-aligned candidate strikes around the anchor price (forward ?? spot) at multiple offsets:

- UP: prefers above-anchor strikes (positive offsets first)
- DOWN: prefers below-anchor strikes (negative offsets first)
- Default offsets: [0, ±10, ±20, ±50, ±100, ±200] ticks

For each candidate:

1. Quote via `devInspectBinaryQuote()`
2. Reject if quote mint cost <= 0
3. Preflight via `devInspectMintBinaryPreflight()`
4. Accept first candidate where both pass

## Execution gate hierarchy

```
Quote blockers → Preflight blockers → Mintability gate → Execution blockers → Wallet prompt
```

The mintability gate requires `primitiveMintabilityStatus === "passed"` for UP/DOWN. Manual strike edits invalidate the validation.

## Pre-wallet quote drift tolerance

Before showing the wallet prompt, `submit()` re-runs `devInspectBinaryQuote()` and compares the fresh mint cost to the original. Because DeepBook Predict's on-chain SVI pricing model updates continuously, small cost differences are expected and tolerated.

- If the fresh mint cost is positive and at most 10% above the original quote, the wallet prompt proceeds.
- If the fresh mint cost exceeds the original by more than 10%, the user is asked to refresh their quote.
- The preflight dependency key does NOT include `mintCostAtomic` or `redeemPayoutAtomic` to avoid invalidating preflight state on normal price drift.

## Error mapping

`assert_mintable_ask::7` in primitive context shows: "Selected strike is not mintable for the current market. Try regenerating a mintable strike."

In BTC MOVE context, the same error shows: "Selected BTC MOVE range is not mintable for the current market."

## Portfolio and local records

Primitive trades are recorded in localStorage under `deepvol:primitive-trades`. Portfolio displays them separately from MOVE Receipts with a clear warning: "Primitive trades do not create DeepVol MoveReceipt."

General primitive position indexing is not yet implemented.

## RANGE

RANGE is a raw DeepBook Predict range primitive that wins if BTC expires inside the selected lower/upper interval. Unlike BTC MOVE (which wins OUTSIDE the interval with UP above upper + DOWN below lower), RANGE does not create a DeepVol MoveReceipt, does not use a VolSeries, and does not pay DeepVol Create Fee.

### RANGE mintable interval search

The SDK generates symmetric interval candidates around the anchor price (forward ?? spot) at width multipliers `[10, 20, 50, 100, 200, 500]` ticks with three placement strategies: centered, below-anchor, and above-anchor. For each candidate:

1. Quote via `devInspectRangeQuote()`
2. Reject if mint cost <= 0
3. Preflight via `devInspectMintRangePreflight()`
4. Accept first passing candidate

### RANGE wallet execution path

RANGE follows the same execution gate hierarchy as UP/DOWN:

```
Quote blockers -> Preflight blockers -> Mintability gate -> Execution blockers -> Wallet prompt
```

Pre-wallet 10% quote drift tolerance applies (same as UP/DOWN). `assert_mintable_ask::7` in RANGE context shows: "Selected RANGE interval is not mintable for the current market. Try regenerating a mintable interval."

RANGE trades are recorded in localStorage under `deepvol:primitive-trades` with `primitiveType: "RANGE"`, `lowerStrike`, and `upperStrike`.

### Naming convention

SDK uses `higherStrike` (from Move contract); frontend uses `upperStrike` -- mapped at call boundaries.

### RANGE validation status

**Real RANGE mint NOT yet validated on Testnet.** The execution path is implementation-ready but has not yet executed a real `predict::mint_range<DUSDC>` through the RANGE primitive wallet flow. See [DEEPVOL_RANGE_PRIMITIVE_TRADING.md](./DEEPVOL_RANGE_PRIMITIVE_TRADING.md) for full RANGE documentation.

## What this validates

DeepVol-23 validated UP and DOWN primitive direct mint on Testnet. See [DEEPVOL_PRIMITIVE_UP_DOWN_VALIDATION.md](./DEEPVOL_PRIMITIVE_UP_DOWN_VALIDATION.md) for transaction digests and evidence. Validated items:

- Raw `predict::mint<DUSDC>` binary primitive execution for both UP and DOWN.
- PredictManager position creation via direct primitive mint.
- Wallet-gated execution gates: oracle, expiry, strike, quantity, balance, preflight.
- Pre-wallet 10% quote drift tolerance.
- RANGE is NOT yet validated.

## What this does NOT validate

- Real RANGE mint on Testnet (execution path is implementation-ready but not yet validated)
- RANGE redeem execution
- Mainnet readiness
- General position indexing
