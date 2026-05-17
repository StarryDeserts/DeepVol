---
Purpose: Describe the Phase 3A/B creator strategy product flow that will later sit on top of the Route B wrapper.
Audience: Product leads, frontend developers, SDK implementers, Move developers, reviewers, and AI agents.
Status: Draft product-flow reference for Route B wrapper architecture; not final UI design.
Source of truth relationship: Supplements product architecture and wrapper docs; official DeepBook Predict docs remain source of truth for protocol behavior.
---

# Creator Strategy Product Flow

This flow describes how RangePilot's creator strategy layer should work once the Route B wrapper is published and integrated. Phase 3A/B does not build final UI pages; it defines the product path and minimal contract boundary.

## Flow overview

```text
Creator creates strategy
→ user discovers strategy
→ user previews follow
→ frontend runs official quote + full preflight
→ user follows strategy through RangePilot wrapper
→ wrapper internally calls DeepBook Predict mint_range<DUSDC>
→ user portfolio shows DeepBook Predict range position linked to strategy
→ creator sees followers, volume, and fees through indexed events
```

## 1. Creator creates strategy

A creator defines a compact range strategy:

- market/oracle target;
- expiry;
- lower strike;
- higher strike;
- default quantity;
- creator fee bps, capped at 3000 bps;
- protocol-set platform fee bps, fixed at 10 bps;
- metadata URI;
- thesis/title/description off-chain where appropriate.

The wrapper stores the executable fields in a `Strategy` object and emits `StrategyCreated`. The strategy must not store private keys, signatures, raw transaction bytes, wallet caches, or protocol snapshots that must be confirmed at runtime.

## 2. Strategy has market/range/expiry/thesis/fee

The strategy should separate executable fields from descriptive metadata:

| Data | Recommended location | Reason |
|---|---|---|
| Oracle ID | On-chain Strategy | Required for wrapper `RangeKey`. |
| Expiry | On-chain Strategy | Required for wrapper `RangeKey`. |
| Lower/higher strike | On-chain Strategy | Required for wrapper `RangeKey`; range semantics are `(lower, higher]`. |
| Default quantity | On-chain Strategy | Useful for default follow UX and events. |
| Creator fee bps | On-chain Strategy | Required for transparent creator fee validation. |
| Fixed platform fee bps | On-chain Strategy | Protocol-set to 10 bps for transparency. |
| ProtocolVault ID | Config / transaction input | Required for platform fee deposit during follow. |
| Thesis/title/description | Off-chain URI | Larger, mutable presentation data should not bloat the object. |
| Creator analytics | Indexer/off-chain | Derived from events and DeepBook Predict state. |

## 3. User discovers strategy

Discovery can use off-chain indexing and public read models:

- list active strategies;
- show creator address/profile;
- show range and expiry;
- explain `(lower, higher]` payoff;
- show fee policy;
- show historical follow volume and known mints;
- show stale/unavailable state if oracle or market data cannot be refreshed.

Discovery must not imply mintability. Mintability is runtime-dependent and must be confirmed by quote and full preflight immediately before wallet approval.

## 4. User previews follow

Before calling the wrapper, the frontend must run the official DeepBook Predict validation path:

1. load current OracleSVI/public server state;
2. build the Strategy-derived RangeKey;
3. run official `predict::get_range_trade_amounts` quote;
4. verify mint cost is positive and affordable from `PredictManager` balance;
5. run full `predict::mint_range<DUSDC>` devInspect preflight;
6. show creator/platform fee separately from mint cost;
7. confirm wrapper package ID and ProtocolVault object ID are configured.

Quote success alone must not enable follow. Full mint preflight remains the safety gate.

## 5. User follows strategy

When preview gates pass, the user approves one wallet transaction to the RangePilot wrapper. The wrapper validates the Strategy and fee policy, transfers the creator fee to the creator, deposits the platform fee into `ProtocolVault<DUSDC>`, returns any fee coin remainder to the follower, then internally calls DeepBook Predict `mint_range<DUSDC>`.

The user remains the owner of their `PredictManager`. DeepBook Predict validates `ctx.sender() == manager.owner()` during `mint_range`, and positions remain internal quantities in the manager.

## 6. Wrapper mints DeepBook Predict range

The wrapper does not mint a RangePilot position NFT. It calls DeepBook Predict, which:

- checks the quote asset;
- checks live oracle/range consistency;
- inserts range exposure into the Vault;
- refreshes oracle risk;
- checks post-trade ask bounds and exposure;
- withdraws mint cost from `PredictManager`;
- increases the manager's range position;
- emits `RangeMinted`.

RangePilot emits `StrategyFollowed` only after the protocol call returns successfully.

## 7. User portfolio links position to strategy

The portfolio should use layered reads:

- RangePilot `StrategyFollowed` event for attribution;
- DeepBook Predict `RangeMinted` event for official mint details;
- direct `predict_manager::range_position` for wallet-critical active quantity;
- public Predict server summaries/history as diagnostic or display acceleration only.

Positions and ranges are not independent NFTs. The source of truth is the user's `PredictManager`.

## 8. Creator sees volume, followers, and fees

Creator analytics can be derived from events:

- `StrategyCreated` for catalog and metadata;
- `StrategyFollowed` for strategy follow count, fee amount, ProtocolVault ID, manager ID, and quantity;
- DeepBook Predict `RangeMinted` for official protocol mint details;
- DeepBook Predict `RangeRedeemed` for later lifecycle outcomes.

These analytics can remain off-chain/indexer-backed for MVP. They do not require RangePilot to reimplement pricing or vault risk.

## Out of scope for Phase 3A/B

- final strategy pages;
- final visual design;
- creator profile system;
- strategy ranking algorithm;
- vault dashboard;
- AI composer;
- publish/deploy flow;
- real follow transactions;
- mainnet support.
