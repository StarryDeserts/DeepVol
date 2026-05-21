---
Purpose: Record the first deployed DeepVol buy_move_receipt<DUSDC> Testnet validation.
Audience: Move developers, SDK implementers, frontend developers, protocol integrators, reviewers, and product leads.
Status: DeepVol-5 validation record; DeepVol-9 browser preflight now ports the receipt devInspect and manager-balance subset into the web app.
Source of truth relationship: Records observed Testnet validation facts; Sui transaction effects, object reads, and Move source remain authoritative for on-chain state.
---

# DeepVol Buy MOVE Receipt Testnet Validation

## Summary

DeepVol-5 validated the first deployed DeepVol BTC MOVE receipt path on Sui Testnet. The validation created one BTC `VolSeries`, passed fresh quote and preflight gates, executed exactly one real `receipt::buy_move_receipt<DUSDC>` transaction, and verified the receipt, internal DeepBook Predict UP/DOWN mints, manager balance delta, binary position deltas, and DeepVol `ProtocolVault<DUSDC>` Create Fee deposit.

The executed receipt remains the MVP non-custodial model: the user's `PredictManager` holds the binary legs, and the `MoveReceipt` records protocol-enforced metadata/linkage.

DeepVol-9 ports the browser-safe subset of this validation into `apps/deepvol-web`: the web app reads `predict_manager::balance<DUSDC>`, verifies the manager balance covers the expected premium, builds the final `receipt::buy_move_receipt<DUSDC>` transaction, and runs browser `devInspect` before enabling wallet review. CLI-only safety checks, private-key execution, raw transaction bytes, and post-execution reconciliation remain script/manual validation concerns and are not imported into browser code.

## Network and deployed config

| Item | Value |
|---|---|
| Network | Sui Testnet |
| Active Sui CLI env | `testnet` |
| Active Sui CLI address | `0x4ff903b0dcc52dc8753787baf19b34b7425dfa64d187cc7c726b38413705fa75` |
| Sender / receipt owner | `0x4ff903b0dcc52dc8753787baf19b34b7425dfa64d187cc7c726b38413705fa75` |
| PredictManager | `0xd59be0646d948c9be6073edc0cfd253ce4cb00f4929f0bae71f451f50e5d1575` |
| DeepVol package | `0xe9b45e8d06406bb935bf5e3260ac9b82491ca158775861660be34881e17a4fa0` |
| ProtocolVault<DUSDC> | `0x1b9174645d70ac4caa2cfa0db5df59ac78a3ce0d3cca10f8be37e4c5d84f1a09` |
| AdminCap | `0xa0f062e01af265137324eb26489de788fee443e49376725bed84a877c99318b1` |
| UpgradeCap | `0x2b5224c317e2d517bbc7abb47740cce86234399e818077ac50e63e79b0298fc4` |
| DeepBook Predict object | `0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a` |
| DUSDC type | `0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a::dusdc::DUSDC` |

Object checks confirmed the DeepVol package exists as an immutable package, the AdminCap and UpgradeCap are address-owned by the sender, the `ProtocolVault<DUSDC>` is shared with the expected type, the DeepBook Predict object is shared, and the selected PredictManager summary owner is the sender.

## Workspace safety notes

- `move/deepvol/Move.toml` was treated as user-managed publish config and was not modified, restored, or staged by the validation round.
- `move/deepvol/Published.toml` was inspected as normal generated Sui publish metadata and contains no secrets.
- `.env.local`, `.env*`, `.local/`, `.claude/`, `.trace/`, `.traces/`, `deepbookv3-predict-package/`, and `deepbookv3-predict-testnet-4-16/` were not read or staged.
- No private key, mnemonic, signature, or raw transaction bytes were printed or committed.

## Runtime BTC market selection

The execute-mode run discovered fresh active BTC oracle contexts from the public Predict read model and selected this runtime pair:

| Item | Value |
|---|---|
| Oracle | `0xc746336e790db7e93a34b684fa3768f43a7c3171d0262d0f2c71dc0a2ab5fe22` |
| Expiry | `1779436800000` |
| Lower / DOWN strike | `76696000000000` |
| Upper / UP strike | `76796000000000` |
| Quantity | `10000` |
| Create Fee bps | `30` |
| Metadata URI | `https://deepvol.local/series/testnet/btc-move-demo-1` |

Fresh quote selection before writes produced positive UP and DOWN quotes and a nonzero Create Fee:

| Item | Value |
|---|---:|
| UP quote before `create_series` | `4910` atomic DUSDC |
| DOWN quote before `create_series` | `5119` atomic DUSDC |
| Expected premium before `create_series` | `10029` atomic DUSDC |
| Expected Create Fee before `create_series` | `30` atomic DUSDC |
| Computed maxPremiumPaid | `12034` atomic DUSDC |

The final buy preflight refreshed the quotes immediately before `buy_move_receipt<DUSDC>`:

| Item | Value |
|---|---:|
| UP quote before buy | `4915` atomic DUSDC |
| DOWN quote before buy | `5114` atomic DUSDC |
| Expected premium before buy | `10029` atomic DUSDC |
| Create Fee before buy | `30` atomic DUSDC |
| maxPremiumPaid | `12034` atomic DUSDC |

## VolSeries creation

| Item | Value |
|---|---|
| `create_series` executed | Yes |
| Digest | `JCHonGTMEikMBtxWkZpUbhDWNZjMCoSDJNbRuVBHTLUk` |
| VolSeries object ID | `0x57878763c144cabe06c86d7e02f168d6b42481d779434d8efc8146a10c1ba885` |
| Shared object | Yes |
| `VolSeriesCreated` event found | Yes |
| Created timestamp ms | `1779193133982` |

`VolSeriesCreated` confirmed the selected oracle, expiry, lower strike, upper strike, metadata URI, creator, and Create Fee bps.

## Fresh quotes and preflight gates

Preflight gates passed before the buy transaction:

| Gate | Result |
|---|---|
| UP quote positive | Passed |
| DOWN quote positive | Passed |
| Lower strike less than upper strike | Passed |
| Expiry in the future | Passed |
| Manager summary owner equals sender | Passed |
| Manager DUSDC balance before buy | `998962` atomic DUSDC |
| ProtocolVault<DUSDC> balance before buy | `0` atomic DUSDC |
| Selected fee coin | `0xd6ede8462af8be1e2ccbb673a8c33d3507fb3974daabecd08a3d3ae9f3ebe016` |
| Selected fee coin balance before buy | `45989000` atomic DUSDC |
| Sender SUI gas balance before writes | `1748134028` MIST |
| Direct binary mint devInspect | Passed |
| `buy_move_receipt<DUSDC>` devInspect | Passed |
| `buy_move_receipt<DUSDC>` SDK dry-run | Passed |
| `buy_move_receipt<DUSDC>` CLI dry-run | Passed at `200000000` MIST |

The buy dry-run reported gas usage of `computation=138100000`, `storage=342266000`, `rebate=330702372`, and `nonRefundable=3340428` for the selected CLI budget.

## buy_move_receipt execution

| Item | Value |
|---|---|
| `buy_move_receipt<DUSDC>` executed | Yes |
| Digest | `GVyMBH9kB6nTSuWoULFZ5ir3yhFnRC8LNoRz9EEDQXbd` |
| MoveReceipt object ID | `0x6eac478ef6300281093a2301a52b4ee7b272d6b1a76be9e16e63fa43171f6a0f` |
| `MoveReceiptCreated` event found | Yes |
| `PositionMinted` UP event found | Yes |
| `PositionMinted` DOWN event found | Yes |
| `CreateFeeDeposited` event found | Yes |
| Post-state validation | Passed |

## Transaction events

### MoveReceiptCreated

| Field | Value |
|---|---|
| `receipt_id` | `0x6eac478ef6300281093a2301a52b4ee7b272d6b1a76be9e16e63fa43171f6a0f` |
| `owner` | `0x4ff903b0dcc52dc8753787baf19b34b7425dfa64d187cc7c726b38413705fa75` |
| `series_id` | `0x57878763c144cabe06c86d7e02f168d6b42481d779434d8efc8146a10c1ba885` |
| `predict_manager_id` | `0xd59be0646d948c9be6073edc0cfd253ce4cb00f4929f0bae71f451f50e5d1575` |
| `oracle_id` | `0xc746336e790db7e93a34b684fa3768f43a7c3171d0262d0f2c71dc0a2ab5fe22` |
| `expiry` | `1779436800000` |
| `lower_strike` / `down_strike` | `76696000000000` |
| `upper_strike` / `up_strike` | `76796000000000` |
| `quantity` | `10000` |
| `premium_paid` | `10029` atomic DUSDC |
| `create_fee_paid` | `30` atomic DUSDC |
| `timestamp_ms` | `1779193143373` |

### DeepBook Predict PositionMinted events

| Leg | Strike | Quantity | Cost | Manager | Trader |
|---|---:|---:|---:|---|---|
| UP | `76796000000000` | `10000` | `4895` | `0xd59be0646d948c9be6073edc0cfd253ce4cb00f4929f0bae71f451f50e5d1575` | `0x4ff903b0dcc52dc8753787baf19b34b7425dfa64d187cc7c726b38413705fa75` |
| DOWN | `76696000000000` | `10000` | `5134` | `0xd59be0646d948c9be6073edc0cfd253ce4cb00f4929f0bae71f451f50e5d1575` | `0x4ff903b0dcc52dc8753787baf19b34b7425dfa64d187cc7c726b38413705fa75` |

The two event costs sum to `10029`, matching the manager balance delta and `MoveReceiptCreated.premium_paid`.

### CreateFeeDeposited

| Field | Value |
|---|---|
| `vault_id` | `0x1b9174645d70ac4caa2cfa0db5df59ac78a3ce0d3cca10f8be37e4c5d84f1a09` |
| `series_id` | `0x57878763c144cabe06c86d7e02f168d6b42481d779434d8efc8146a10c1ba885` |
| `owner` | `0x4ff903b0dcc52dc8753787baf19b34b7425dfa64d187cc7c726b38413705fa75` |
| `amount` | `30` atomic DUSDC |
| `timestamp_ms` | `1779193143373` |

## MoveReceipt readback

Object readback for `0x6eac478ef6300281093a2301a52b4ee7b272d6b1a76be9e16e63fa43171f6a0f` matched the event and selected runtime parameters:

| Field | Value |
|---|---|
| `owner` | `0x4ff903b0dcc52dc8753787baf19b34b7425dfa64d187cc7c726b38413705fa75` |
| `series_id` | `0x57878763c144cabe06c86d7e02f168d6b42481d779434d8efc8146a10c1ba885` |
| `predict_manager_id` | `0xd59be0646d948c9be6073edc0cfd253ce4cb00f4929f0bae71f451f50e5d1575` |
| `oracle_id` | `0xc746336e790db7e93a34b684fa3768f43a7c3171d0262d0f2c71dc0a2ab5fe22` |
| `expiry` | `1779436800000` |
| `lower_strike` / `down_strike` | `76696000000000` |
| `upper_strike` / `up_strike` | `76796000000000` |
| `quantity` | `10000` |
| `premium_paid` | `10029` atomic DUSDC |
| `create_fee_paid` | `30` atomic DUSDC |
| `status` | `0` / open |

## PredictManager position and balance readback

| Item | Before | After | Delta |
|---|---:|---:|---:|
| UP binary position | `0` | `10000` | `10000` |
| DOWN binary position | `0` | `10000` | `10000` |
| PredictManager DUSDC balance | `998962` | `988933` | `10029` decrease |

The `MoveReceiptCreated.premium_paid` value equals the actual manager DUSDC balance delta.

## ProtocolVault fee accounting

| Item | Before | After | Delta |
|---|---:|---:|---:|
| ProtocolVault<DUSDC> balance | `0` | `30` | `30` increase |
| Selected fee coin balance | `45989000` | `45988970` | `30` decrease |

`MoveReceiptCreated.create_fee_paid`, `CreateFeeDeposited.amount`, the selected fee coin decrease, and the `ProtocolVault<DUSDC>` balance delta all match at `30` atomic DUSDC.

## Blockers or mismatches

No blocker or post-state mismatch was observed in this validation round.

Future executions still require fresh runtime oracle, expiry, strike, quote, manager balance, fee coin, gas, devInspect, and dry-run gates because BTC market state and DeepBook Predict mintability are runtime conditions.

## Explicit non-actions

- No `sui client publish` command was run.
- No package upgrade was run.
- No `create_protocol_vault` transaction was run.
- No `withdraw_protocol_fees` transaction was run.
- No Predict binary redeem or permissionless redeem was run.
- No range mint or range redeem was run.
- No old RangePilot `follow_strategy_and_mint` transaction was run.
- No mainnet path was used.
- No second `create_series` transaction was submitted in the validation run.
- No second `buy_move_receipt<DUSDC>` transaction was submitted in the validation run.

## DeepVol-6 frontend scaffold note

DeepVol-6 uses the validated VolSeries and receipt in this document as reference artifacts for the new `apps/deepvol-web/` wallet-gated frontend scaffold. The historical quote values recorded above are validation evidence only; they are not live offers and must not be displayed as current quotes.

The frontend must refresh quote, wallet fee coin, manager DUSDC balance, and receipt preflight state at runtime before enabling wallet approval. Browser-side receipt preflight is now the main gate; direct two-leg binary mint preflight may remain diagnostic-only and must not block the composed receipt path by itself.

## Next step

Finish browser-safe quote/preflight/readback helpers or polish the transaction step UX from the `apps/deepvol-web/` scaffold, depending on which blockers remain after verification.
