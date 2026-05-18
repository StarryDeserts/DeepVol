---
Purpose: Define the DeepVol BTC MOVE protocol architecture and custody boundaries.
Audience: Project maintainers, Move developers, SDK implementers, frontend developers, reviewers, and AI agents.
Status: Foundation architecture for the DeepVol refactor.
---

# DeepVol Protocol Architecture

## Overview

DeepVol is a Predict-native structured product layer on Sui. It has an advanced primitives layer (`UP`, `DOWN`, `RANGE`) and a composed receipt layer where BTC MOVE Receipt is the primary MVP product.

The MVP packages two DeepBook Predict binary legs into a non-custodial BTC MOVE Receipt:

```text
Long UP above upper strike + Long DOWN below lower strike
```

DeepBook Predict remains the protocol authority for prices, mint costs, balances, positions, redemption, and settlement. DeepVol adds series metadata, receipt metadata, fee routing, portfolio aggregation, and guided settlement.

## Product layer boundary

DeepVol should not become a generic Predict UI. Primitive UP, DOWN, and RANGE trades are available as advanced building blocks, but the MVP product is the composed BTC MOVE Receipt.

Advanced users can manually buy UP + DOWN directly through DeepBook Predict. DeepVol's value is not exclusivity; it is standardized series selection, atomic multi-leg execution, receipt-based portfolio aggregation, fee accounting, guided settlement/redeem, and simpler risk display.

## Core components

### VolSeries

`VolSeries` describes a BTC MOVE market series. It records the selected underlying, oracle, expiry, lower strike, upper strike, quote asset, Create Fee policy, active state, and metadata URI.

The series is the product-level object users browse and mint against.

### MoveReceipt

`MoveReceipt` is the MVP receipt object. It records that a user created a BTC MOVE position through DeepVol and links to the DeepBook Predict binary legs held in the user's `PredictManager`.

It is not a fully tradable claim token in MVP because it does not custody the underlying Predict positions.

### ProtocolVault

`ProtocolVault` is reusable treasury infrastructure from the RangePilot wrapper work. In DeepVol MVP, it receives the Create Fee.

The vault is distinct from the DeepBook Predict vault. It is a DeepVol/RangePilot fee treasury, not the source of Predict payouts or risk accounting.

### PredictManager

`PredictManager` is the user-level DeepBook Predict account and position boundary. In the MVP, the user's manager holds the UP and DOWN binary positions.

Portfolio truth for open binary quantities must come from `predict_manager::position`, not from the receipt alone.

### DeepBook Predict binary legs

The MOVE exposure is built from two official DeepBook Predict binary legs:

- UP leg above the upper strike.
- DOWN leg below the lower strike.

DeepVol must call the official Predict binary quote, mint, and redeem paths instead of duplicating pricing or settlement logic.

### Public Predict server read model

The public Predict server is a read model for market discovery, quotes, and UX diagnostics. It is not a write path and must not be treated as the source of transaction execution.

### On-chain transaction path

The intended MVP transaction path is:

1. Discover active BTC oracle, expiry, and candidate strikes.
2. Preview UP binary leg.
3. Preview DOWN binary leg.
4. Confirm manager balance covers total premium.
5. Build an atomic PTB that mints both binary legs through DeepBook Predict.
6. Charge Create Fee.
7. Deposit Create Fee into `ProtocolVault`.
8. Mint `MoveReceipt` recording the series and binary leg metadata.

The 2026-05-19 controlled Testnet round validated the direct Predict two-leg PTB through `devInspect`, but the CLI dry-run returned `InsufficientGas in command 3` before submission. No direct binary mint, Create Fee routing, or `MoveReceipt` mint has been executed yet, so the exact DeepVol wrapper design remains future implementation work.

### Portfolio readback path

The MVP portfolio should combine:

- `MoveReceipt` objects owned by the user;
- current binary quantities read from the user's `PredictManager` by `MarketKey`;
- public Predict server or object reads for series/oracle status;
- settlement status derived from oracle state and manager positions.

The receipt should not be treated as authoritative for current position size after redemption because the underlying legs are non-custodial.

### Settlement and redeem path

In MVP, redeem remains a guided user action against DeepBook Predict. The user can redeem through official Predict binary redeem paths using the positions held in their `PredictManager`.

DeepVol can guide the flow and update receipt settlement metadata if the user chooses the DeepVol-mediated path, but it cannot force that path while the positions remain non-custodial.

## MVP: Non-custodial Receipt

In MVP:

- The user's `PredictManager` holds the binary legs.
- `MoveReceipt` records metadata and linkage.
- DeepVol does not custody payout.
- Create Fee is enforceable because it is charged during wrapper-mediated receipt creation.
- Profit Fee is not enforceable unless settlement goes through DeepVol.

This keeps the first implementation aligned with DeepBook Predict's existing custody model and avoids pretending the receipt owns the underlying legs.

## V2: Custodial / Escrow MOVE

In V2, DeepVol can explore a stronger receipt model:

- A DeepVol-controlled manager or series-level manager holds the legs.
- `MoveReceipt` represents a claim on escrowed legs or payout.
- Profit Fee can be enforced during settlement.
- Receipt can become more tradable.
- The protocol accepts higher complexity and custody risk.

This is future scope and should not block the BTC MOVE MVP.

## Future code organization

This round is docs-first and should not implement these modules yet. A later implementation can use:

```text
move/deepvol/
packages/types/src/deepVol.ts
packages/sdk/src/deepVol/
packages/config/src/deepVolTestnet.ts
apps/web/src/pages/DeepVolMarketsPage.tsx
apps/web/src/pages/DeepVolSeriesPage.tsx
apps/web/src/pages/DeepVolPortfolioPage.tsx
```
