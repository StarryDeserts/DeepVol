---
Purpose: Record successful Testnet UP and DOWN primitive direct mint transactions for DeepVol-23.
Audience: Protocol integrators, frontend developers, SDK implementers, reviewers, and AI agents.
Status: DeepVol-23 records two successful Testnet UP/DOWN primitive direct mint transactions. RANGE primitive is NOT validated.
Source of truth relationship: Derived from Testnet transaction evidence; does not override protocol or product specs. On-chain state remains authoritative.
---

# UP/DOWN Primitive Testnet Validation (DeepVol-23)

## Summary

This validates raw Predict binary primitive direct mint for UP and DOWN. UP/DOWN primitives do not create DeepVol MoveReceipt. They are stored as PredictManager positions and tracked by the DeepVol web app through local primitive records / known-key readback.

Two successful Testnet transactions confirm that the wallet-gated UP/DOWN primitive execution path works end-to-end through `market_key::up` / `market_key::down` and `predict::mint<DUSDC>`.

## DOWN transaction

| Field | Value |
|---|---|
| Digest | `4XU2145PwZNm1Qn3NtVkEdKZt9VPjiZeY5vNwTcy7jnH` |
| Function path | `market_key::down`, `predict::mint<DUSDC>` |
| Sender | `0x60ce00b02feafce805f1c3c8a7beaf7db8e903d73610fb232ad928d31fcd9349` |
| Predict object | `0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a` |
| PredictManager | `0x1d7d4e16415e7811babb27a5311991196fed9c295d0fb4e4468978efe050f010` |
| Oracle | `0x9b73c85862c838ad6054799382e33934c8bc069aba7f45aa633d24dd88f80a4b` |
| Expiry | `1779786000000` |
| Strike | `76640000000000` |
| Quantity | `10000` |
| is_up | `false` |
| Cost | 3156 atomic DUSDC |
| ask_price | `315624683` |
| Status | Success |

## UP transaction

| Field | Value |
|---|---|
| Digest | `4JCQ9ZCPRfWugiRhQsU6Y3rAaeT3CyYMMGZ4XnoCWcy9` |
| Function path | `market_key::up`, `predict::mint<DUSDC>` |
| Sender | `0x60ce00b02feafce805f1c3c8a7beaf7db8e903d73610fb232ad928d31fcd9349` |
| Predict object | `0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a` |
| PredictManager | `0x1d7d4e16415e7811babb27a5311991196fed9c295d0fb4e4468978efe050f010` |
| Oracle | `0x9b73c85862c838ad6054799382e33934c8bc069aba7f45aa633d24dd88f80a4b` |
| Expiry | `1779786000000` |
| Strike | `76640000000000` |
| Quantity | `10000` |
| is_up | `true` |
| Cost | 8837 atomic DUSDC |
| ask_price | `883737829` |
| Status | Success |

## What this validates

- Raw `predict::mint<DUSDC>` binary primitive execution for both UP and DOWN directions.
- PredictManager position creation via direct primitive mint.
- Wallet-gated execution gates: oracle, expiry, strike, quantity, balance, preflight.
- Pre-wallet 10% quote drift tolerance.
- `market_key::up` and `market_key::down` construction for binary primitives.

## What this does NOT validate

- RANGE primitive execution (not yet validated).
- BTC MOVE receipt creation (validated separately; see DEEPVOL_FRESH_MOVE_BUY_VALIDATION.md).
- Mainnet readiness.
- General primitive position indexing.
- Primitive redeem execution.

## Shared context

Both transactions share the same sender, oracle, expiry, strike, and quantity. The cost difference (DOWN: 3156 vs UP: 8837 atomic DUSDC) reflects the SVI pricing model's directional probability assessment at the time of execution.

UP/DOWN primitives are raw DeepBook Predict binary positions. They do not create DeepVol MoveReceipt, do not use a DeepVol VolSeries, and do not pay a DeepVol Create Fee. Positions are tracked through localStorage primitive records and known-key readback from the user's PredictManager.
