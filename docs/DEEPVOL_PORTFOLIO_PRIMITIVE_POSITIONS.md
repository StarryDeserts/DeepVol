---
Purpose: Document DeepVol Portfolio display for raw Predict primitive positions and the local-record plus known-key readback model.
Audience: Frontend developers, SDK implementers, product contributors, reviewers, and AI agents.
Status: DeepVol-25 implementation note. This document does not claim general indexing, cross-browser discovery, mainnet support, or new real transaction validation.
Source of truth relationship: Derived from the DeepVol frontend implementation and DeepBook Predict readback helpers; protocol docs and chain state remain authoritative for active positions.
---

# DeepVol Portfolio Primitive Positions

## Summary

Portfolio separates DeepVol `MoveReceipt` records from raw DeepBook Predict primitive positions.

```text
MOVE Receipts
→ DeepVol receipt records and guided receipt readback/redeem surfaces

Primitive Positions
→ UP / DOWN / RANGE raw Predict local trade records with known-key readback when possible
```

UP, DOWN, and RANGE primitive trades do not create a DeepVol `MoveReceipt`. They are raw Predict positions held in the user's `PredictManager`.

## Data source

The MVP primitive Portfolio source is:

1. Local primitive trade records from this browser.
2. Known-key readback using the fields stored in each local record.
3. Local record fallback when readback is pending or unavailable.

This is not a wallet-wide indexer. It does not discover primitive positions from other browsers, devices, or historical wallets unless a local record exists or a future indexer is added.

## Local primitive record fields

Primitive local records carry the fields needed to display the trade and attempt known-key readback:

```text
primitiveType: UP / DOWN / RANGE
digest
wallet
predictManagerId
oracleId
expiry
strike for UP/DOWN
lowerStrike and upperStrike for RANGE
quantity
mintCost
positionKey
status
```

The card remains visible even if readback fails.

## UP and DOWN readback

UP and DOWN records use the record's own manager and market key fields:

```text
record.predictManagerId
record.wallet
record.oracleId
record.expiry
record.strike
record.primitiveType -> market_key::up or market_key::down
```

Readback calls the binary position helper backed by `predict_manager::position`. A successful readback can show current position quantity for that known key.

## RANGE readback

RANGE records use:

```text
record.predictManagerId
record.wallet
record.oracleId
record.expiry
record.lowerStrike
record.upperStrike
```

Readback calls the range position helper backed by `predict_manager::range_position` when lower and upper strikes are present. If the range key fields are incomplete, Portfolio shows:

```text
RANGE readback pending; local transaction record shown.
```

The UI must not fabricate a RANGE quantity.

## Readback failures

Known-key readback is best-effort. It can fail because a wallet is disconnected, RPC/devInspect is unavailable, the key fields are incomplete, or the position quantity is not readable at that moment.

A readback failure does not hide the local primitive record. The card should still show digest, executed time, manager, oracle, expiry, strike/range, quantity, mint cost, position key, readback status, and the error or fallback message.

## MOVE Receipt separation

MOVE Receipts remain a separate Portfolio section because they are DeepVol receipt objects and metadata for a composed BTC MOVE position. Their underlying UP and DOWN legs still live in the user's `PredictManager`, but the receipt route has different readback, redeem, and validation semantics from raw primitive trades.

Primitive local records must not be routed through receipt components, must not imply custody, and must not imply DeepVol Create Fee or `MoveReceipt` creation.

## Non-goals and safety boundary

DeepVol-25 primitive Portfolio does not add:

- general wallet-wide primitive position indexing;
- cross-browser primitive discovery;
- a user profile service;
- a registry contract;
- new DeepVol Move state;
- mainnet support;
- real RANGE mint validation;
- new real chain-write verification.

## Related docs

- [DEEPVOL_PREDICT_MANAGER_UX.md](./DEEPVOL_PREDICT_MANAGER_UX.md)
- [DEEPVOL_FRONTEND_MVP.md](./DEEPVOL_FRONTEND_MVP.md)
- [DEEPVOL_PRIMITIVE_DIRECT_TRADING.md](./DEEPVOL_PRIMITIVE_DIRECT_TRADING.md)
- [DEEPVOL_RANGE_PRIMITIVE_TRADING.md](./DEEPVOL_RANGE_PRIMITIVE_TRADING.md)
- [PROTOCOL_INTEGRATION_NOTES.md](./PROTOCOL_INTEGRATION_NOTES.md)
