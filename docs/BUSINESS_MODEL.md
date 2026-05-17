---
Purpose: Define RangePilot's creator strategy business model on top of DeepBook Predict.
Audience: Product leads, frontend developers, SDK implementers, Move developers, protocol integrators, reviewers, and AI agents.
Status: Phase 3D ProtocolVault fee model; not final tokenomics or UI design.
Source of truth relationship: Supplements the product architecture and official DeepBook Predict integration docs; official Sui docs, local validated entrypoint bindings, and Move source remain source of truth for protocol behavior.
---

# Business Model

RangePilot monetizes guided DeepBook Predict strategy discovery and execution. Creators publish range strategies with a thesis, target range, expiry, default quantity, and creator fee policy. Users follow those strategies through a RangePilot wrapper transaction that validates RangePilot strategy state, handles creator/platform attribution, deposits platform fees into a RangePilot `ProtocolVault<T>`, and internally calls DeepBook Predict `mint_range<DUSDC>`.

DeepBook Predict remains the prediction-market protocol. RangePilot does not price ranges, settle oracles, custody positions, run vault risk, reproduce StrikeMatrix logic, or calculate payout. The business layer is built on top of the official protocol's `Predict`, `PredictManager`, `RangeKey`, `OracleSVI`, and Vault behavior.

## Core model

```text
User follows creator strategy
→ user pays DeepBook Predict mint cost from PredictManager balance
→ user separately provides creator/platform fee as Coin<DUSDC>
→ RangePilot wrapper validates strategy and fee policy
→ wrapper transfers creator fee to creator
→ wrapper deposits platform fee into ProtocolVault<DUSDC>
→ wrapper calls DeepBook Predict mint_range<DUSDC>
→ wrapper emits StrategyFollowed for attribution
→ DeepBook Predict stores the range position in the user's PredictManager
```

The mint cost and RangePilot fee are separate payment surfaces:

- DeepBook Predict mint cost is withdrawn from the user's `PredictManager` balance by `predict::mint_range`.
- Creator/platform fee is paid with a separate fee coin passed to the RangePilot wrapper.
- The creator fee transfers to the Strategy creator.
- The platform fee deposits into a RangePilot `ProtocolVault<T>`, not a direct platform recipient address.
- The wrapper returns any fee coin remainder to the follower.
- The wrapper does not deduct creator/platform fees from `PredictManager` because `PredictManager` is the protocol account boundary for official quote assets and positions.
- If DeepBook Predict `mint_range` aborts, the Sui transaction aborts and fee movement in the same transaction rolls back.

## Why creators publish strategies

Creators get a strategy distribution surface without building their own protocol integration. RangePilot can attribute followers, volume, and fee revenue to a creator's strategy through `StrategyCreated`, `StrategyFollowed`, and later analytics/indexing.

Creator incentives:

- build a public track record around range theses;
- earn creator fee share when followers execute a strategy;
- publish reusable strategy metadata and updates;
- receive distribution through RangePilot discovery surfaces;
- avoid owning protocol pricing, vault risk, or settlement logic.

## Why users follow strategies

Users get a simplified decision path for DeepBook Predict ranges. Instead of manually discovering active oracles, expiry, strike grid, candidate ranges, and mintability gates, users can inspect a creator's thesis and preview a preconfigured range.

User value:

- strategy context before wallet approval;
- official quote and full preflight before following;
- clearer `(lower, higher]` range semantics;
- portfolio linkage between the DeepBook Predict position and the RangePilot strategy event;
- creator attribution without moving custody away from the user's `PredictManager`.

## Fee model

Phase 3D confirms this MVP fee policy:

| Fee | Paid by | Paid to | Stage | Source |
|---|---|---|---|---|
| DeepBook Predict mint cost | follower | DeepBook Predict Vault | `mint_range<DUSDC>` | withdrawn from `PredictManager` by protocol |
| Creator fee | follower | strategy creator | wrapper follow transaction | separate fee `Coin<DUSDC>` or generic `Coin<T>` |
| Platform fee | follower | RangePilot `ProtocolVault<T>` | wrapper follow transaction | separate fee `Coin<DUSDC>` or generic `Coin<T>` |

Confirmed parameters:

- `platform_fee_bps = 10`, which is `0.1%`.
- `MAX_CREATOR_FEE_BPS = 3000`, which is `30%`.
- `300 bps` would be `3%`.
- Creator fee may be `0 <= creator_fee_bps <= 3000`.
- The explicit fee base remains separate from the DeepBook Predict mint cost.

Wrapper fee handling:

1. frontend/SDK passes nonzero `fee_amount` explicitly;
2. wrapper validates `fee_coin.value() >= fee_amount`;
3. wrapper splits `fee_amount` using creator bps plus fixed platform bps;
4. wrapper transfers the creator split to the creator;
5. wrapper deposits the platform split into `ProtocolVault<T>`;
6. wrapper returns any unused fee coin remainder to the follower.

The wrapper must not compute fees from DeepBook Predict mint cost unless the protocol exposes that cost directly to the wrapper without reproducing pricing.

## ProtocolVault and AdminCap

`ProtocolVault<T>` is a RangePilot wrapper object, not the DeepBook Predict Vault. It holds platform fee deposits only. `AdminCap` controls `ProtocolVault<T>` creation and platform fee withdrawal. The package initializer mints `AdminCap` to the publisher / transaction sender.

Normal follower transactions require the shared Strategy, DeepBook Predict objects, fee coin, and `ProtocolVault<T>` object. They do not require `AdminCap`.

## Failure and rollback behavior

The desired Route B follow is one Sui transaction. Creator transfer, ProtocolVault deposit, DeepBook Predict mint, and `StrategyFollowed` emission happen atomically. If `predict::mint_range<DUSDC>` aborts, Sui abort semantics roll back the entire transaction, including creator fee transfer and ProtocolVault deposit.

This is why Route B can support paid strategy execution without a separate refund path for failed mints. The frontend must still run official quote + full mint preflight first to avoid avoidable wallet failures.

## MVP on-chain surface

Required on-chain MVP pieces:

- shared `Strategy` object with creator, range, expiry, quantity, creator fee bps, fixed platform fee bps, metadata URI, active flag, and creation time;
- permissionless strategy creation;
- creator-only deactivation;
- `AdminCap` object minted at package init;
- `ProtocolVault<T>` object created by admin;
- `StrategyCreated` event;
- `StrategyFollowed` event emitted after successful wrapper call to DeepBook Predict `mint_range`;
- `StrategyDeactivated` event;
- `PlatformFeeDeposited` and `PlatformFeesWithdrawn` events;
- wrapper-specific fee validation and active-strategy checks.

The wrapper keeps on-chain metadata compact and uses `metadata_uri` only for Phase 3D. Long thesis/title/description, images, comments, rankings, and performance dashboards can live in off-chain metadata/indexer systems referenced by URI.

## Later off-chain and analytics surface

These do not need to be on-chain in the MVP:

- creator ranking;
- follower counts;
- total volume;
- strategy PnL aggregation;
- long thesis content;
- screenshots, thumbnails, and social previews;
- creator dashboard analytics;
- strategy search and tags;
- historical performance charts;
- ProtocolVault dashboard.

These can be derived from RangePilot events, DeepBook Predict `RangeMinted` / `RangeRedeemed` events, public server read models, and direct onchain reads where wallet-critical state is required.

## DeepBook Predict dependency boundary

RangePilot's business model works because DeepBook Predict already owns the market protocol:

- `Predict` is the official trading entrypoint.
- `PredictManager` is the per-user account and position boundary.
- `RangeKey` identifies the vertical range.
- `OracleSVI` supplies live or settled market state.
- `Vault` enforces liquidity, exposure, MTM, max payout, and risk constraints.
- `predict::mint_range<DUSDC>` computes and enforces the official mint path.

RangePilot monetizes strategy routing and creator attribution while preserving this protocol boundary.
