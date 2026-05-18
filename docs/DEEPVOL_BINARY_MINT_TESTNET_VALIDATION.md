---
Purpose: Record the controlled Testnet validation of DeepVol's BTC two-leg binary mint path.
Audience: Move developers, SDK implementers, frontend developers, reviewers, and AI agents.
Status: Blocked before submission; CLI dry-run returned `InsufficientGas in command 3`, so no write transaction was submitted.
---

# DeepVol Binary Mint Testnet Validation

## Scope

This validation targets direct DeepBook Predict two-leg binary minting on Sui Testnet:

```text
Long UP above upper strike
+
Long DOWN below lower strike
=
BTC MOVE base exposure
```

It validates the underlying DeepBook Predict leg path that DeepVol BTC MOVE depends on. It is not a DeepVol `MoveReceipt` implementation, not receipt minting, not binary redeem validation, not wrapper validation, and not Mainnet work.

## Safety constraints

- Testnet only.
- Controlled sender only: `0x4ff903b0dcc52dc8753787baf19b34b7425dfa64d187cc7c726b38413705fa75`.
- Controlled manager only: `0xd59be0646d948c9be6073edc0cfd253ce4cb00f4929f0bae71f451f50e5d1575`.
- No private key was loaded by the script.
- `.env.local` was not read.
- No serialized transaction bytes were printed.
- Exactly one mint-mode command was run in this round.
- The command stopped at CLI dry-run and did not submit a write transaction.
- No retry was attempted.
- No publish, redeem, withdraw, range mint, wrapper follow, or receipt mint was executed.

## Commands

Pre-mint verification commands passed:

```bash
npm run typecheck
npm run build:web
npm run move:build:rangepilot
npm run move:test:rangepilot
npm run validate:deepvol-binary-read
npm run validate:deepvol-binary-preflight -- --sender 0x4ff903b0dcc52dc8753787baf19b34b7425dfa64d187cc7c726b38413705fa75 --manager 0xd59be0646d948c9be6073edc0cfd253ce4cb00f4929f0bae71f451f50e5d1575
```

Single mint-mode command run:

```bash
npm run validate:deepvol-binary-mint
```

## Gate results

| Gate | Result |
|---|---|
| Network config | Passed: Testnet config and Testnet public server. |
| Controlled sender | Passed: `0x4ff903b0dcc52dc8753787baf19b34b7425dfa64d187cc7c726b38413705fa75`. |
| Controlled manager | Passed: `0xd59be0646d948c9be6073edc0cfd253ce4cb00f4929f0bae71f451f50e5d1575`. |
| Manager summary owner | Passed: owner matched controlled sender. |
| Manager DUSDC balance | Passed: `999965` atomic DUSDC before dry-run. |
| Sender SUI gas balance | Passed: `1957057036` MIST before dry-run. |
| Active Sui CLI env | Passed: `testnet`. |
| Active Sui CLI address | Passed: controlled sender. |
| Two-leg PTB shape assertion | Passed before devInspect and before CLI dry-run. |
| Two-leg PTB devInspect | Passed. |
| CLI dry-run | Blocked: `InsufficientGas in command 3`. |
| Real write submission | Not submitted. |

## Selected BTC MOVE pair

Runtime-selected values from the mint-mode run:

| Field | Value |
|---|---|
| Network | Sui Testnet |
| Sender | `0x4ff903b0dcc52dc8753787baf19b34b7425dfa64d187cc7c726b38413705fa75` |
| Manager | `0xd59be0646d948c9be6073edc0cfd253ce4cb00f4929f0bae71f451f50e5d1575` |
| BTC oracle | `0xc746336e790db7e93a34b684fa3768f43a7c3171d0262d0f2c71dc0a2ab5fe22` |
| Expiry | `1779436800000` |
| Lower strike | `76221000000000` |
| Upper strike | `76334000000000` |
| Quantity | `1000` |
| UP MarketKey | `market_key::up(0xc746336e790db7e93a34b684fa3768f43a7c3171d0262d0f2c71dc0a2ab5fe22, 1779436800000, 76334000000000)` |
| DOWN MarketKey | `market_key::down(0xc746336e790db7e93a34b684fa3768f43a7c3171d0262d0f2c71dc0a2ab5fe22, 1779436800000, 76221000000000)` |
| UP quote | `mint=494`, `redeem=474` |
| DOWN quote | `mint=509`, `redeem=489` |
| Total quoted premium | `1003` atomic DUSDC |
| Max premium cap | `10000` atomic DUSDC |

These runtime values are validation evidence only. Future mints must rediscover oracle, expiry, strikes, quotes, balances, and preflight status at runtime.

## Execution result

Outcome: `Blocked before submission`.

The script passed read, balance, owner, CLI environment, transaction-shape, and `devInspect` gates. It then serialized transaction-kind bytes for the Sui CLI and ran exactly one CLI dry-run. The dry-run did not succeed:

```text
CLI dry-run did not succeed: InsufficientGas in command 3
```

No real transaction digest was produced because the write transaction was not submitted. No retry was attempted.

## Post-state readback

Pre-submission readback from the mint-mode run:

| Field | Before |
|---|---:|
| UP position | `0` |
| DOWN position | `0` |
| Manager DUSDC balance | `999965` |

No post-submission readback exists for this round because the transaction stopped at dry-run and no write transaction was submitted.

## Events and transaction diagnostics

No `PositionMinted` events were emitted in this round because no write transaction was submitted.

The dry-run reached command-level execution and returned:

```text
InsufficientGas in command 3
```

The source-confirmed mint path recomputes cost after inserting each leg's exposure, so quote success and `devInspect` success still are not sufficient production mint proof. Future validation should determine whether the CLI dry-run blocker is caused by gas-budget requirements, command-level execution cost, or a protocol-side condition surfaced as the CLI dry-run diagnostic before attempting another write.

## Outcome

`Blocked before submission`.

Blocker:

```text
CLI dry-run did not succeed: InsufficientGas in command 3
```

No write transactions submitted.

## Follow-up

- Diagnose the CLI dry-run `InsufficientGas in command 3` root cause without submitting a write transaction.
- Decide whether a higher dry-run gas budget is appropriate only after understanding the dry-run failure.
- Keep binary redeem validation pending.
- Keep DeepVol `MoveReceipt`, receipt minting, Create Fee routing, and wrapper integration as future work.
- Preserve the rule that future production mints require fresh quote, manager balance, gas, transaction-shape assertion, full preflight, and wallet approval gates.
