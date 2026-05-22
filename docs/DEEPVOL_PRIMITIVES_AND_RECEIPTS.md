---
Purpose: Explain DeepVol's Predict primitives layer and composed receipt products.
Audience: Product maintainers, Move developers, SDK implementers, frontend developers, reviewers, and AI agents.
Status: Product-layer clarification for DeepVol BTC MOVE, Route B receipts, and DeepVol-15 wallet-gated UP/DOWN primitive execution.
---

# DeepVol Primitives and Receipts

## Product layers

DeepVol is a Predict-native primitive trading terminal and structured product layer. It uses official DeepBook Predict primitives directly where product policy allows and packages selected combinations into product receipts.

DeepVol exposes two product layers:

1. Predict primitives:
   - UP
   - DOWN
   - RANGE

2. Composed receipts:
   - BTC MOVE = UP + DOWN

This framing keeps BTC MOVE as DeepVol's flagship receipt product while allowing DeepVol to grow into a Predict-native primitive terminal. The primary structured product is still the composed receipt layer, while primitives provide direct UP/DOWN terminal capability, RANGE diagnostics, and future composer workflows.

## Predict primitives

UP, DOWN, and RANGE are official DeepBook Predict primitives. DeepVol-15 enables UP and DOWN as wallet-gated raw primitive terminals after fresh quote, manager balance, and mint preflight gates pass. RANGE remains quote/preflight-only until dedicated mintability validation. Direct primitive trades are not the DeepVol fee surface and do not create `MoveReceipt` objects; see [DEEPVOL_PRIMITIVE_EXECUTION_POLICY.md](./DEEPVOL_PRIMITIVE_EXECUTION_POLICY.md), [DEEPVOL_PREDICT_PRIMITIVES_FRONTEND.md](./DEEPVOL_PREDICT_PRIMITIVES_FRONTEND.md), and [DEEPVOL_PRIMITIVE_QUOTE_PREFLIGHT.md](./DEEPVOL_PRIMITIVE_QUOTE_PREFLIGHT.md).

Primitive responsibilities remain with DeepBook Predict:

- quote and pricing;
- market and oracle lifecycle;
- vault exposure and risk;
- mint, redeem, and settlement behavior;
- `PredictManager` position accounting.

DeepVol must not reimplement those responsibilities.

## Composed receipts

Composed receipts are productized multi-leg strategies built from Predict primitives. They add standardization, portfolio metadata, fee accounting, and guided settlement around official Predict positions.

The MVP composed receipt is BTC MOVE:

```text
BTC MOVE Receipt = UP upper binary leg + DOWN lower binary leg
```

The receipt records the product series, selected oracle, expiry, strikes, premium, fee, and Predict position linkage. In MVP, it does not custody the underlying Predict legs.

DeepVol-3B makes receipt creation protocol-enforced: `receipt::buy_move_receipt<Quote>` derives both legs from `VolSeries`, calls DeepBook Predict mint for both legs, deposits Create Fee, and only then mints the receipt.

## Primary MVP product: BTC MOVE Receipt

BTC MOVE Receipt is the primary MVP product.

A user buys movement exposure rather than choosing direction:

- the UP leg covers a move above the upper strike;
- the DOWN leg covers a move below the lower strike;
- the receipt aggregates those legs into one product-level portfolio item.

The MVP should keep BTC MOVE front-and-center. UP and DOWN may be traded as raw wallet-gated primitives; RANGE remains diagnostics-only for now. Direct primitive buys do not create a DeepVol `MoveReceipt`; only the BTC MOVE receipt route creates a receipt in the MVP app.

## Can users manually buy UP + DOWN themselves?

Yes. Advanced users can manually buy UP + DOWN through DeepBook Predict and create similar exposure themselves.

DeepVol's value is not exclusivity. DeepVol does not rely on hiding a payoff structure that cannot be copied.

DeepVol's value is productization: turning a multi-leg Predict strategy into a one-click, protocol-enforced, trackable, displayable, and guided receipt product.

## Why DeepVol still adds value

DeepVol adds value through:

- one-call multi-leg execution;
- protocol-enforced receipt creation;
- standardized BTC MOVE series;
- MoveReceipt portfolio aggregation;
- unified settlement guidance;
- risk visualization;
- fee accounting.

Advanced users can construct the raw legs themselves, but most users should not need to manually choose two binary markets, coordinate quantities, inspect both quotes, manage post-mint readback, and track settlement separately.

## Fee model boundary

Primitive UP, DOWN, and RANGE trades are not the primary MVP monetization surface. In DeepVol-15, UP/DOWN primitive trades may submit wallet transactions after strict gates pass, but they do not create `MoveReceipt` objects and do not charge DeepVol Create Fee. RANGE remains quote/preflight-only.

BTC MOVE Receipt is the MVP monetization surface:

```text
Create Fee = 0.30% of premium
```

The premium basis is the actual quote-asset balance delta from the user's `PredictManager` across both internal binary mints. DeepVol still quotes both legs immediately before minting as an early cap and fee-coin coverage check; the final Create Fee goes to DeepVol `ProtocolVault<Quote>` during receipt creation.

## Future structured products

Future products can reuse the same product-layer model:

- custom receipt composer;
- BTC STAY / range-bound product;
- other MOVE underlyings after runtime market validation;
- curated or creator-authored VolSeries after the enforcement and distribution model is clearer.

These future products should keep the same boundary: DeepBook Predict owns primitive pricing and settlement; DeepVol owns structured product packaging, receipt metadata, fee accounting, and UX.

## MVP receipt boundary

The MVP `MoveReceipt` is non-custodial but protocol-enforced. It records linkage to positions held in the user's `PredictManager`; it does not own the UP or DOWN legs.

Portfolio truth for active quantities must come from DeepBook Predict readback, especially `predict_manager::position` for each binary `MarketKey`.

Because users can redeem directly through DeepBook Predict, Profit Fee and custodial receipt semantics are V2 features, not MVP assumptions.
