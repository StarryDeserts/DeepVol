---
Purpose: Define the DeepVol primitive execution policy for UP, DOWN, RANGE, and BTC MOVE.
Audience: Product engineers, frontend developers, SDK implementers, reviewers, and AI agents.
Status: DeepVol-22-fix adds pre-wallet quote drift tolerance (10%) and removes volatile mint cost from preflight dependency key. DeepVol-21 adds mintable strike candidate search for UP/DOWN primitives. DeepVol-16-fix records active BTC primitive market discovery, stale/non-live oracle blockers, wallet-gated UP/DOWN primitive execution, and RANGE quote/preflight-only policy.
Source of truth relationship: Extends the DeepVol primitives/receipts model, primitive quote/preflight contract, frontend MVP docs, and binary-leg integration notes; on-chain protocol behavior remains authoritative.
---

# DeepVol Primitive Execution Policy

## Product positioning

DeepVol is expanding into a Predict-native primitive trading terminal while keeping BTC MOVE as the featured structured product.

| Product | Product role | Creates `MoveReceipt` | DeepVol Create Fee | DeepVol-16 status |
|---|---|---:|---:|---|
| BTC MOVE | Featured DeepVol receipt product for outside-range movement exposure | Yes | Yes | Existing buy/redeem loop remains enabled behind receipt gates. |
| UP | Raw DeepBook Predict primitive for upside exposure | No | No | Wallet-gated in code after active BTC market discovery, fresh quote, balance, and mint preflight; stale/non-live markets block before wallet review. |
| DOWN | Raw DeepBook Predict primitive for downside exposure | No | No | Wallet-gated in code after active BTC market discovery, fresh quote, balance, and mint preflight; stale/non-live markets block before wallet review. |
| RANGE | Raw DeepBook Predict primitive for inside-range exposure | No | No | Quote/preflight-only until dedicated mintability validation hardens execution gates. |

BTC MOVE remains the primary DeepVol product narrative:

```text
BTC MOVE = UP above the upper strike + DOWN below the lower strike
```

UP, DOWN, and RANGE are raw Predict primitives. Direct primitive trades are positions in the user's `PredictManager`; they are not DeepVol receipts and do not become receipt-scoped inventory.

## Execution policy

UP and DOWN primitive execution can be enabled first because their binary mint path is the same source-confirmed `predict::mint<DUSDC>` path already used by BTC MOVE and prior binary validation rounds.

UP/DOWN wallet execution must remain disabled until every gate passes:

- connected Sui wallet;
- active Sui Testnet account;
- selected active BTC primitive market loaded with oracle object, oracle ID, expiry, and suggested strike context;
- selected market effective status is `Live`, not `Unknown`, `Stale`, or `Expired`;
- valid quantity;
- valid selected UP/DOWN strike;
- PredictManager ID present;
- fresh quote for the current wallet, active market, primitive, strike, and quantity;
- positive mint cost;
- PredictManager DUSDC balance readback;
- PredictManager DUSDC balance greater than or equal to the current mint cost;
- fresh binary mint preflight for the current quote and wallet state;
- `primitiveMintabilityStatus === "passed"` from `findMintableBinaryPrimitiveCandidate()` confirming the selected strike is mintable (DeepVol-21);
- no in-flight primitive wallet submission.

Clicking wallet review must rerun quote, manager balance readback, and binary mint preflight immediately before the wallet prompt. It must also fail closed if the selected market expiry has passed since the last render. The pre-wallet fresh quote uses a 10% cost tolerance — normal SVI pricing drift is accepted, but a cost increase beyond 10% blocks until the user refreshes. The preflight dependency key excludes volatile `mintCostAtomic`/`redeemPayoutAtomic` to prevent preflight invalidation from on-chain price drift (DeepVol-22-fix). The app must not automatically execute primitive trades.

DeepVol-16 confirmed browser smoke and source/test gate review, and the follow-up real-browser preflight exposed a stale/non-live oracle blocker (`oracle_config::assert_live_oracle` abort code `3`). See [DEEPVOL_PRIMITIVE_EXECUTION_VALIDATION.md](./DEEPVOL_PRIMITIVE_EXECUTION_VALIDATION.md) and [DEEPVOL_PRIMITIVE_ACTIVE_MARKET_DISCOVERY.md](./DEEPVOL_PRIMITIVE_ACTIVE_MARKET_DISCOVERY.md) for the blocker, fix, and zero-count attestation.

RANGE execution stays quote/preflight-only. RANGE wins if BTC expires inside the selected lower / upper interval, but its mintability, ask-bounds, and runtime quoteability gates require a dedicated validation round before wallet execution can open. A passed RANGE quote or preflight is diagnostic only in DeepVol-15.

## Fee policy

Primitive trades do not pay a DeepVol Create Fee in the MVP. Only BTC MOVE Receipt creation charges the DeepVol Create Fee and deposits it into the configured DeepVol `ProtocolVault<DUSDC>`.

Future versions may add a terminal fee, routing fee, or pro interface fee if the product direction requires it. That is a V2 product decision and must not be implied by DeepVol-15 primitive execution.

## Portfolio policy

Primitive positions are keyed by binary `MarketKey` or `RangeKey` and live inside the user's `PredictManager`.

Without a general indexer, DeepVol supports two limited portfolio surfaces first:

1. Local browser primitive trade records written after successful UP/DOWN wallet execution.
2. Known/selected key readback for configured BTC MOVE keys or selected primitive inputs.

Local primitive records are browser hints/history only. They are not `MoveReceipt` objects, not wallet-wide indexer truth, and not payout proof. Current position quantity still requires direct known-key readback from the user's `PredictManager` or future indexer support.

The Portfolio UI must keep these sections separate:

- MOVE Receipts: local/reference `MoveReceipt` records and guided receipt redeem state.
- Primitive local records: direct primitive trade history hints.
- Primitive known-key readback: current quantity checks for configured or selected keys.

## Safety boundary

DeepVol-15 does not:

- modify Move contracts;
- modify `move/deepvol/Move.toml`;
- publish or upgrade packages;
- execute real RANGE mint;
- execute primitive wallet transactions automatically;
- use mainnet;
- read private keys, `.env.local`, `.trace/`, or `.traces/`;
- route primitive trades into `ReceiptSummaryCard`;
- charge DeepVol Create Fee on direct primitives;
- claim general primitive indexing exists.
