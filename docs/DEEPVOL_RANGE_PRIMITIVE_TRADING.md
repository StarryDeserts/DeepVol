---
Purpose: Document RANGE primitive trading model, mintable interval search, execution gates, and validation status.
Audience: Protocol integrators, frontend developers, SDK implementers.
Status: DeepVol-25 adds shared wallet-scoped PredictManager session UX and primitive Portfolio readback. DeepVol-24-fix adds structured mintability diagnostics on top of the DeepVol-23 RANGE primitive execution path. Real RANGE mint NOT yet validated on Testnet.
Source of truth relationship: Derived from implementation; does not override protocol or product specs.
---

# RANGE Primitive Direct Trading

## Summary

RANGE is a raw DeepBook Predict range primitive. A RANGE position wins if BTC expires inside the selected lower/upper interval.

- RANGE does NOT create a DeepVol MoveReceipt.
- RANGE does NOT use a DeepVol VolSeries.
- RANGE does NOT pay a DeepVol Create Fee.
- Positions are tracked through localStorage records and known-key readback.
- PredictManager setup uses the shared wallet-scoped session; manual manager object ID entry is Advanced / Developer fallback only.

## Distinction from BTC MOVE

RANGE and BTC MOVE are complementary but structurally different:

| | RANGE | BTC MOVE |
|---|---|---|
| Wins when | BTC expires INSIDE the selected interval | BTC expires OUTSIDE the interval (UP above upper + DOWN below lower) |
| Underlying | Single range primitive position | Two binary legs (UP + DOWN) composed into a MoveReceipt |
| DeepVol receipt | None | MoveReceipt created |
| DeepVol VolSeries | Not used | Required |
| DeepVol Create Fee | Not charged | Charged |
| Mint entrypoint | `predict::mint_range<DUSDC>` | `receipt::buy_move_receipt<DUSDC>` (internally mints UP + DOWN) |

## Active BTC market requirement

All RANGE trading requires a live active BTC market from the Predict server. The active market provides: oracle ID, oracle object ID, expiry, spot, forward, tickSize, minStrike.

## Mintable interval candidate search

Before wallet execution, a mintable interval must be validated. The SDK function generates symmetric interval candidates around the anchor price (forward ?? spot) using width multipliers and placement strategies.

Width multipliers (in ticks): `[10, 20, 50, 100, 200, 500]`

Three placement strategies per width:

- **Centered**: anchor is the midpoint of the interval
- **Below-anchor**: interval sits below the anchor price
- **Above-anchor**: interval sits above the anchor price

For each candidate interval (lower, upper):

1. Quote via `devInspectRangeQuote()`
2. Reject if mint cost <= 0
3. Preflight via `devInspectMintRangePreflight()`
4. Accept first candidate where both pass

DeepVol-24-fix adds structured candidate diagnostics for failed searches: total candidates, successful quotes, passed preflights, dominant failure family, first failures, and last failure. See [DEEPVOL_RANGE_MINTABILITY_DIAGNOSTICS.md](./DEEPVOL_RANGE_MINTABILITY_DIAGNOSTICS.md).

## Execution gate hierarchy

```
Quote blockers -> Preflight blockers -> Mintability gate -> Execution blockers -> Wallet prompt
```

The mintability gate requires the RANGE interval candidate search to have found a passing interval before wallet review can unlock.

## Pre-wallet quote drift tolerance

Before showing the wallet prompt, `submit()` re-runs `devInspectRangeQuote()` and compares the fresh mint cost to the original. Because DeepBook Predict's on-chain SVI pricing model updates continuously, small cost differences are expected and tolerated.

- If the fresh mint cost is positive and at most 10% above the original quote, the wallet prompt proceeds.
- If the fresh mint cost exceeds the original by more than 10%, the user is asked to refresh their quote.

This is the same 10% drift tolerance used for UP/DOWN primitives.

## Error mapping

`assert_mintable_ask::7` in RANGE primitive context shows: "Selected RANGE interval is not mintable for the current market. Try regenerating a mintable interval."

## PredictManager session

RANGE uses the same wallet-scoped PredictManager session as BTC MOVE, UP, and DOWN. The app restores a manager for the connected wallet when available, can recover from same-wallet local primitive records, and shows `Create PredictManager` when missing. Manual object ID entry remains collapsed under Advanced / Developer fallback only.

See [DEEPVOL_PREDICT_MANAGER_UX.md](./DEEPVOL_PREDICT_MANAGER_UX.md).

## Portfolio and local records

RANGE trades are recorded in localStorage under `deepvol:primitive-trades` with `primitiveType: "RANGE"`, `lowerStrike`, and `upperStrike`. Portfolio displays RANGE records separately from MOVE Receipts with a clear warning: "Primitive trades do not create DeepVol MoveReceipt." When lower/upper strikes are present, Portfolio can attempt known-key readback through `predict_manager::range_position`; incomplete records keep the local record visible and show `RANGE readback pending; local transaction record shown.`

General primitive position indexing and cross-browser primitive discovery are not yet implemented. See [DEEPVOL_PORTFOLIO_PRIMITIVE_POSITIONS.md](./DEEPVOL_PORTFOLIO_PRIMITIVE_POSITIONS.md).

## Naming convention

The SDK and Move contract use `higherStrike` (from the Move `range_key::new` signature). The frontend uses `upperStrike` for user-facing display. The mapping occurs at call boundaries between frontend and SDK layers.

## Validation status

**Real RANGE mint NOT yet validated on Testnet.**

DeepVol-23 adds the RANGE execution path (mintable interval search, execution gates, wallet prompt, local record persistence) but has not yet executed a real `predict::mint_range<DUSDC>` through the RANGE primitive wallet flow. The execution gates and mintability search are implementation-ready only.

## What this does NOT validate

- Real RANGE mint transaction on Testnet
- RANGE redeem execution
- Mainnet readiness
- General position indexing
