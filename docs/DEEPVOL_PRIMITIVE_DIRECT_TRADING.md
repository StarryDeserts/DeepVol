---
Purpose: Document UP/DOWN direct primitive trading model and mintable strike validation.
Audience: Protocol integrators, frontend developers.
Status: DeepVol-23 records UP/DOWN primitive Testnet validation success. DeepVol-21 implementation record. RANGE not yet validated.
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

RANGE wallet execution remains disabled until dedicated mintability validation passes. RANGE can still preview quotes and run preflight.

## What this validates

DeepVol-23 validated UP and DOWN primitive direct mint on Testnet. See [DEEPVOL_PRIMITIVE_UP_DOWN_VALIDATION.md](./DEEPVOL_PRIMITIVE_UP_DOWN_VALIDATION.md) for transaction digests and evidence. Validated items:

- Raw `predict::mint<DUSDC>` binary primitive execution for both UP and DOWN.
- PredictManager position creation via direct primitive mint.
- Wallet-gated execution gates: oracle, expiry, strike, quantity, balance, preflight.
- Pre-wallet 10% quote drift tolerance.
- RANGE is NOT yet validated.

## What this does NOT validate

- RANGE execution
- Mainnet readiness
- General position indexing
