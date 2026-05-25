---
Purpose: Define the DeepVol BTC MOVE protocol architecture and custody boundaries.
Audience: Project maintainers, Move developers, SDK implementers, frontend developers, reviewers, and AI agents.
Status: Updated for DeepVol-17: create_series confirmed permissionless (public entry, no AdminCap). Fresh VolSeries required for new BTC MOVE buy when active BTC market oracle/expiry changes. See DEEPVOL_ACTIVE_MOVE_SERIES.md for lifecycle.
---

# DeepVol Protocol Architecture

## Overview

DeepVol is a Predict-native structured product layer on Sui. It has an advanced primitives layer (`UP`, `DOWN`, `RANGE`) and a composed receipt layer where BTC MOVE Receipt is the primary MVP product.

The MVP packages two DeepBook Predict binary legs into a non-custodial but protocol-enforced BTC MOVE Receipt:

```text
Long UP above upper strike + Long DOWN below lower strike
```

DeepBook Predict remains the protocol authority for prices, mint costs, balances, positions, redemption, and settlement. DeepVol adds series metadata, receipt metadata, fee routing, portfolio aggregation, and guided settlement.

## Product layer boundary

DeepVol should not become a generic Predict UI. Primitive UP, DOWN, and RANGE trades are available as advanced building blocks, but the MVP product is the composed BTC MOVE Receipt.

Advanced users can manually buy UP + DOWN directly through DeepBook Predict. DeepVol's value is not exclusivity; it is standardized series selection, one-call receipt creation, protocol-enforced multi-leg minting, receipt-based portfolio aggregation, fee accounting, guided settlement/redeem, and simpler risk display.

## Core components

### VolSeries

`VolSeries` describes a BTC MOVE market series. It records the selected oracle, expiry, lower strike, upper strike, Create Fee policy, active state, and metadata URI.

The series is the source of truth for leg construction:

- UP key: `market_key::up(oracle_id, expiry, upper_strike)`;
- DOWN key: `market_key::down(oracle_id, expiry, lower_strike)`.

Callers do not supply arbitrary UP/DOWN keys or leg strikes to the receipt entrypoint.

### MoveReceipt

`MoveReceipt` records that a user created a BTC MOVE position through DeepVol and links to the DeepBook Predict binary legs held in the user's `PredictManager`.

It is not a fully tradable claim token in MVP because it does not custody the underlying Predict positions. It is still protocol-enforced: the only public product path creates it after `receipt::buy_move_receipt<Quote>` internally calls both Predict binary mints.

### ProtocolVault

DeepVol defines its own `ProtocolVault<Quote>` and `AdminCap` in `deepvol::vault`. The vault receives Create Fee deposits from `receipt::buy_move_receipt<Quote>`.

The vault is distinct from the DeepBook Predict vault and distinct from the old RangePilot wrapper vault. It is a DeepVol fee treasury, not the source of Predict payouts or risk accounting.

### PredictManager

`PredictManager` is the user-level DeepBook Predict account and position boundary. In the MVP, the user's manager pays the binary mint premium and holds the UP and DOWN binary positions.

Portfolio truth for open binary quantities must come from `predict_manager::position`, not from the receipt alone.

### DeepBook Predict binary legs

The MOVE exposure is built from two official DeepBook Predict binary legs:

- UP leg above the upper strike.
- DOWN leg below the lower strike.

DeepVol calls the official Predict binary quote and mint paths instead of duplicating pricing or settlement logic.

### Public Predict server read model

The public Predict server is a read model for market discovery, quotes, and UX diagnostics. It is not a write path and must not be treated as the source of transaction execution.

## On-chain transaction path

The local Route B contract path is:

1. Discover active BTC oracle, expiry, candidate strikes, quote asset, and manager state at runtime.
2. Preview UP binary leg.
3. Preview DOWN binary leg.
4. Confirm the user's manager balance covers total premium.
5. Confirm a separate fee coin covers the DeepVol Create Fee.
6. Simulate/preflight the DeepVol `buy_move_receipt<Quote>` call.
7. Submit one Sui transaction that calls `receipt::buy_move_receipt<Quote>`.
8. Inside the entrypoint, DeepVol derives both keys, quotes both legs, calls `predict::mint<Quote>` twice, deposits Create Fee into `ProtocolVault<Quote>`, and mints the receipt.

The 2026-05-19 controlled Testnet round validated the direct Predict two-leg binary mint with digest `4fMQtu8mFB6jLa5gtSWBsDj3gYp8u9AjQw3xs2VcNJoh` after diagnosing the old `InsufficientGas in command 3` blocker as a too-low `100000000` MIST gas budget. DeepVol-3B translated that primitive into Route B Move code. DeepVol-4 then records the manual Testnet package publish and creates the shared DUSDC ProtocolVault; concrete deployment IDs are recorded in [DEEPVOL_TESTNET_PUBLISH_RESULT.md](./DEEPVOL_TESTNET_PUBLISH_RESULT.md). DeepVol-5 validates the first deployed BTC `VolSeries` and `buy_move_receipt<DUSDC>` path with buy digest `GVyMBH9kB6nTSuWoULFZ5ir3yhFnRC8LNoRz9EEDQXbd`; concrete receipt, event, position, balance, and fee-vault evidence is recorded in [DEEPVOL_BUY_MOVE_RECEIPT_TESTNET_VALIDATION.md](./DEEPVOL_BUY_MOVE_RECEIPT_TESTNET_VALIDATION.md).

## Premium and fee accounting

`buy_move_receipt<Quote>` calls `predict::get_trade_amounts` for both series-derived keys immediately before minting as an early quote and fee-coin coverage check. The caller provides `max_premium_paid`; DeepVol aborts if the immediate quote exceeds that cap and then checks the cap again against the actual manager balance delta after both mints.

DeepBook Predict mint costs are debited from the user's `PredictManager`. DeepVol records `premium_paid` from `predict_manager::balance<Quote>` before and after the two internal mints. DeepVol Create Fee is separate: it is calculated from that actual balance delta, paid through `fee_coin<Quote>`, and deposited into DeepVol `ProtocolVault<Quote>`.

Because `predict::mint<Quote>` does not return the charged cost, exact leg-level attribution belongs in future indexer/event work. The local receipt records the total actual premium delta used for max-bound and fee-basis enforcement.

## Portfolio readback path

The MVP portfolio should combine:

- `MoveReceipt` objects owned by the user;
- current binary quantities read from the user's `PredictManager` by `MarketKey`;
- public Predict server or object reads for series/oracle status;
- settlement status derived from oracle state and manager positions.

The receipt should not be treated as authoritative for current position size after redemption because the underlying legs are non-custodial.

## Settlement and redeem path

In MVP, redeem remains a guided user action against DeepBook Predict. The user can redeem through official Predict binary redeem paths using the positions held in their `PredictManager`.

`receipt::mark_receipt_settled` is an owner-only DeepVol metadata marker. It is not proof that binary redeem happened and it is not proof of payout.

## MVP: non-custodial but protocol-enforced receipt

In MVP:

- The user's `PredictManager` holds the binary legs.
- `MoveReceipt` records metadata and linkage.
- DeepVol does not custody payout.
- Receipt creation is enforced because `buy_move_receipt<Quote>` internally mints both legs before creating the receipt.
- Create Fee is enforceable because it is deposited during the same entrypoint.
- Profit Fee is not enforceable unless settlement goes through a future custodial or wrapper-mediated design.

This keeps the first implementation aligned with DeepBook Predict's existing custody model while preventing receipt minting without the intended two-leg Predict mint path.

## V2: custodial / escrow MOVE

In V2, DeepVol can explore a stronger receipt model:

- A DeepVol-controlled manager or series-level manager holds the legs.
- `MoveReceipt` represents a claim on escrowed legs or payout.
- Profit Fee can be enforced during settlement.
- Receipt can become more tradable.
- The protocol accepts higher complexity and custody risk.

This is future scope and should not block the BTC MOVE MVP.

## Code organization

DeepVol includes Route B code and TypeScript integration stubs:

```text
move/deepvol/
packages/types/src/deepVol.ts
packages/sdk/src/deepVol/
packages/config/src/deepVolTestnet.ts
```

DeepVol frontend work now starts from the separate scaffold:

```text
apps/deepvol-web/
```

`apps/web/` remains the prior RangePilot validation UI and should not become the primary DeepVol UX through incremental page patches.

The package, admin cap, upgrade cap, and DUSDC ProtocolVault IDs are configured after DeepVol-4. DeepVol-5 validates the deployed `buy_move_receipt<DUSDC>` transaction path for one runtime-selected BTC series. DeepVol-6 adds the `apps/deepvol-web/` wallet-gated scaffold for receipt UX, portfolio readback, and future guided settlement/redeem around the validated non-custodial receipt boundary.
