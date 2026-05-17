---
Purpose: Define the RangePilot Strategy data model for the Phase 3D Route B wrapper skeleton.
Audience: Move developers, SDK implementers, frontend developers, indexer authors, reviewers, and AI agents.
Status: Phase 3D data-model reference; not final schema or UI design.
Source of truth relationship: Supplements wrapper architecture and product flow docs; official DeepBook Predict docs remain source of truth for protocol position state.
---

# Strategy Data Model

RangePilot Strategy data links creator intent to an official DeepBook Predict range mint. It must be compact enough for on-chain validation and event attribution while leaving presentation-heavy metadata to off-chain systems.

## Core objects and events

The Phase 3D Move skeleton defines:

```move
public struct AdminCap has key, store
public struct ProtocolVault<phantom T> has key
public struct Strategy has key
public struct ProtocolVaultCreated has copy, drop
public struct PlatformFeeDeposited has copy, drop
public struct PlatformFeesWithdrawn has copy, drop
public struct StrategyCreated has copy, drop
public struct StrategyFollowed has copy, drop
public struct StrategyDeactivated has copy, drop
```

## Strategy

On-chain fields:

| Field | Move type | TypeScript type | Purpose |
|---|---|---|---|
| `id` / `strategy_id` | `UID` / `ID` | `string` | Sui object identity. |
| `creator` | `address` | `string` | Creator who can deactivate the strategy and receives creator fee. |
| `oracle_id` | `ID` | `string` | DeepBook Predict OracleSVI ID. |
| `expiry` | `u64` | decimal string | Range expiry timestamp from DeepBook Predict oracle. |
| `lower_strike` | `u64` | decimal string | Lower exclusive bound of `(lower, higher]`. |
| `higher_strike` | `u64` | decimal string | Higher inclusive bound of `(lower, higher]`. |
| `default_quantity` | `u64` | decimal string | Suggested follow quantity. |
| `creator_fee_bps` | `u64` | number | Creator share of explicit fee amount; max 3000 bps. |
| `platform_fee_bps` | `u64` | `10` | Protocol-set platform share of explicit fee amount. |
| `metadata_uri` | `vector<u8>` | `string` | Off-chain strategy metadata pointer. |
| `active` | `bool` | `boolean` | Follow gating. |
| `created_at_ms` | `u64` | decimal string | Creation timestamp from Clock. |

The wrapper derives `RangeKey` from `oracle_id`, `expiry`, `lower_strike`, and `higher_strike`. Followers do not provide arbitrary RangeKey fields to `follow_strategy_and_mint`.

Strategy objects are shared so multiple followers can use a creator's Strategy. Strategy creation is permissionless; frontend/indexer curation or verification is an off-chain concern.

## ProtocolVault and AdminCap

`ProtocolVault<T>` is a RangePilot wrapper object, not the DeepBook Predict Vault.

| Object | Purpose |
|---|---|
| `AdminCap` | Minted to the package publisher / transaction sender at init; authorizes ProtocolVault creation and withdrawals. |
| `ProtocolVault<T>` | Holds RangePilot platform fee deposits for coin type `T`. |

Normal follower flows pass `ProtocolVault<T>` but do not pass `AdminCap`. Admin withdrawals are separate from follow.

## StrategyCreated

Event fields:

| Field | Purpose |
|---|---|
| `strategy_id` | Links event to Strategy object. |
| `creator` | Creator address. |
| `oracle_id` | DeepBook Predict oracle target. |
| `expiry` | Expiry timestamp. |
| `lower_strike` | Lower range bound. |
| `higher_strike` | Higher range bound. |
| `default_quantity` | Suggested follow size. |
| `creator_fee_bps` | Creator fee share. |
| `platform_fee_bps` | Protocol-set platform fee share, fixed at 10. |
| `metadata_uri` | Off-chain metadata pointer. |
| `created_at_ms` | Creation timestamp. |

## StrategyFollowed

Event fields:

| Field | Purpose |
|---|---|
| `strategy_id` | Strategy followed. |
| `creator` | Creator receiving attribution. |
| `follower` | Transaction sender / user. |
| `manager_id` | User's DeepBook Predict manager. |
| `oracle_id` | DeepBook Predict oracle target. |
| `expiry` | Expiry timestamp. |
| `lower_strike` | Lower range bound. |
| `higher_strike` | Higher range bound. |
| `protocol_vault_id` | ProtocolVault object that received platform fee. |
| `quantity` | Minted range quantity. |
| `fee_amount` | Explicit fee amount provided to wrapper. |
| `creator_fee` | Fee amount transferred to creator. |
| `platform_fee` | Fee amount deposited into ProtocolVault. |
| `timestamp_ms` | Follow timestamp. |

The official DeepBook Predict `RangeMinted` event remains the protocol source of truth for successful mint details. Indexers should link `StrategyFollowed` and `RangeMinted` in the same transaction.

## ProtocolVault events

| Event | Fields | Purpose |
|---|---|---|
| `ProtocolVaultCreated` | `vault_id`, `admin` | Records admin creation of a shared ProtocolVault. |
| `PlatformFeeDeposited` | `vault_id`, `strategy_id`, `follower`, `amount`, `timestamp_ms` | Records platform fee deposit during wrapper follow. |
| `PlatformFeesWithdrawn` | `vault_id`, `recipient`, `amount` | Records admin withdrawal. |

## StrategyDeactivated

Event fields:

| Field | Purpose |
|---|---|
| `strategy_id` | Strategy deactivated. |
| `creator` | Authorized creator. |
| `timestamp_ms` | Deactivation timestamp. |

Deactivation prevents new follows. It does not affect already minted positions because those positions live inside follower `PredictManager` objects under DeepBook Predict.

## Metadata location

Phase 3D uses `metadata_uri` only. The wrapper rejects an empty URI but does not enforce a scheme, max length, content hash, or URI immutability.

Keep long-form strategy content off-chain:

- title;
- thesis;
- markdown body;
- image/social preview;
- tags;
- creator profile information;
- external links;
- version history.

A future production version may add stronger metadata integrity, but Phase 3D keeps metadata URI-only.

## Fee bps policy

The wrapper enforces confirmed Phase 3D fee policy:

```text
BPS_DENOMINATOR = 10_000
MAX_TOTAL_FEE_BPS = 10_000
MAX_CREATOR_FEE_BPS = 3_000
PLATFORM_FEE_BPS = 10
```

`3000 bps = 30%`; `300 bps` would be `3%`.

The platform split deposits into `ProtocolVault<T>` and the creator split transfers to the creator. The explicit fee base remains separate from DeepBook Predict mint cost.

## Strategy active/deactivated state

`active: bool` is the MVP lifecycle gate:

- `true`: strategy may be followed if frontend quote/preflight and wrapper checks pass;
- `false`: wrapper aborts follow attempts.

Only the creator can deactivate in the minimal skeleton. Admin moderation or platform pause can be designed later if needed.

## Strategy-to-position mapping

RangePilot does not create a separate position object. Mapping is event/indexer-based:

1. `StrategyFollowed` identifies strategy, follower, manager, range, ProtocolVault, and quantity.
2. DeepBook Predict `RangeMinted` confirms protocol mint details in the same transaction.
3. Direct `predict_manager::range_position` confirms active quantity for wallet-critical reads.
4. DeepBook Predict `RangeRedeemed` and direct reads update later lifecycle state.

This preserves the official model: positions and range positions are internal quantities in `PredictManager`, not standalone NFTs. Follower profit belongs to the follower because redemption uses the follower's own `PredictManager`; the RangePilot wrapper does not custody or distribute DeepBook Predict payout.

## TypeScript representation

TypeScript APIs keep protocol integers as decimal strings:

```ts
export type RangePilotStrategy = {
  strategyId: string;
  creator: string;
  oracleId: string;
  expiry: string;
  lowerStrike: string;
  higherStrike: string;
  defaultQuantity: string;
  creatorFeeBps: number;
  platformFeeBps: 10;
  metadataUri: string;
  active: boolean;
  createdAtMs: string;
};

export type FollowStrategyParams = {
  strategyId: string;
  predictId: string;
  managerId: string;
  oracleObjectId: string;
  feeCoinObjectId: string;
  protocolVaultId: string;
  feeAmountAtomic: string;
  quantity: string;
  quoteCoinType: string;
};
```

SDK transaction builders remain guarded until wrapper package ID and ProtocolVault object ID are published and confirmed.

## Open questions

- Wrapper package ID: `TBD` until future publish.
- ProtocolVault object ID: `TBD` until post-publish admin creation.
- AdminCap owner / publish address: `TBD` until publish and must be disclosed.
- Final production upgrade/immutability policy: revisit after Testnet/hackathon stage.
- Indexer schema for linking RangePilot and DeepBook Predict events: `TBD`.
