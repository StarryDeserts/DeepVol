---
Purpose: Define the RangePilot Route B wrapper contract boundary for creator strategies that internally mint DeepBook Predict ranges.
Audience: Move developers, SDK implementers, frontend developers, protocol integrators, reviewers, product leads, and AI agents.
Status: Phase 3D ProtocolVault wrapper design; not published and not final UI design.
Source of truth relationship: Supplements official Sui DeepBook Predict docs, local validated entrypoint bindings, and RangePilot product docs; official docs and local source signatures remain authoritative for DeepBook Predict behavior.
---

# Wrapper Contract Architecture

RangePilot wrapper internally calls DeepBook Predict `mint_range<T>`.

The wrapper is a thin creator-strategy layer above DeepBook Predict. It owns RangePilot strategy metadata, follow attribution, fee policy validation, ProtocolVault platform-fee custody, and creator-fee transfer. DeepBook Predict remains the only authority for prediction-market pricing, oracle lifecycle, vault risk, range position accounting, payout, and settlement.

## Official DeepBook Predict boundary

Official Sui DeepBook Predict docs and the local `predict-testnet-4-16` source snapshot define these boundaries:

| Module / object | Protocol role | RangePilot wrapper stance |
|---|---|---|
| `Predict` | Main shared trading and LP entrypoint surface. `mint_range` buys vertical range positions. | Call it; do not replace it. |
| `PredictManager` | Per-user account boundary with quote balances, binary positions, and range positions. | Pass the user's manager into DeepBook Predict; do not custody positions. |
| `RangeKey` | Vertical range identifier: oracle ID, expiry, lower strike, higher strike. Settlement pays inside `(lower, higher]`. | Derive from Strategy fields, then pass to DeepBook Predict. |
| `OracleSVI` | Market/pricing state: spot, forward, SVI params, activation, expiry, settlement. | Pass as official market input; do not compute SVI pricing. |
| DeepBook Predict `Vault` | Liquidity, exposure, MTM liability, max payout, PLP accounting, and risk state. | Leave all risk and payout logic to DeepBook Predict. |
| RangePilot `ProtocolVault<T>` | Holds RangePilot platform fee deposits for a fee coin type. | Owns platform-fee custody only; it is not the DeepBook Predict Vault. |
| `Registry` | Deployment, oracle cap, quote asset, pricing/risk config, pause, and governance/admin functions. | Not part of normal user follow flow. |
| Public Predict server | Read model for markets, summaries, vault, portfolio, and history. | Use for display and recovery hints only; not a write path. |

## Why a wrapper is needed

The direct browser flow proves users can mint and redeem ranges through official DeepBook Predict entrypoints. RangePilot now needs product-owned strategy behavior that DeepBook Predict does not provide:

- creator strategy objects;
- strategy active/deactivated lifecycle;
- creator fee policy;
- platform fee deposit into `ProtocolVault<T>`;
- `AdminCap`-controlled platform fee withdrawal;
- `StrategyCreated`, `StrategyFollowed`, `StrategyDeactivated`, `PlatformFeeDeposited`, and `PlatformFeesWithdrawn` events;
- atomic follow+mint UX in a future wallet flow;
- indexer-friendly link between strategy metadata and the official DeepBook Predict `RangeMinted` outcome.

## Why Route B

Route B means the user calls RangePilot's wrapper, and the wrapper internally calls DeepBook Predict `mint_range<T>`.

Route B gives RangePilot one atomic transaction for strategy validation, fee handling, ProtocolVault deposit, and official range mint. It avoids a two-step fee/mint process and avoids treating RangePilot as only an off-chain event recorder. It also preserves DeepBook Predict's protocol authority because the wrapper composes the official entrypoint instead of rebuilding protocol internals.

## What the wrapper owns

The wrapper owns only RangePilot product state and attribution:

- `Strategy` object fields;
- `AdminCap` object;
- `ProtocolVault<T>` object;
- creator address;
- oracle ID / expiry / lower strike / higher strike strategy target;
- default quantity;
- creator fee bps;
- fixed platform fee bps;
- `metadata_uri`;
- active/deactivated state;
- wrapper-specific fee validation;
- `StrategyCreated`, `StrategyFollowed`, `StrategyDeactivated`, `ProtocolVaultCreated`, `PlatformFeeDeposited`, and `PlatformFeesWithdrawn` events.

## What the wrapper does not own

The wrapper must not implement or replace:

- pricing;
- oracle settlement;
- oracle lifecycle;
- DeepBook Predict vault risk;
- DeepBook Predict exposure accounting;
- MTM or max payout logic;
- StrikeMatrix;
- payout;
- `PredictManager` replacement;
- position custody;
- direct table manipulation inside `PredictManager`;
- public server write execution;
- custom prediction market behavior.

## DeepBook Predict dependency boundary

The wrapper formal dependency source is the official DeepBookV3 Git repository:

```text
https://github.com/MystenLabs/deepbookv3.git
subdir: packages/predict
rev: predict-testnet-4-16
```

`move/rangepilot/Move.toml` uses Testnet `dep-replacements` to bind DeepBook Predict and DeepBook to the deployed Testnet package IDs. The local `deepbookv3-predict-testnet-4-16/` snapshot is source-level debugging/reference only; it must stay ignored and uncommitted, and it is not the formal wrapper dependency source.

Confirmed source signature:

```move
public fun mint_range<Quote>(
    predict: &mut Predict,
    manager: &mut PredictManager,
    oracle: &OracleSVI,
    key: RangeKey,
    quantity: u64,
    clock: &Clock,
    ctx: &mut TxContext,
)
```

Relevant internal checks performed by DeepBook Predict:

- transaction sender must equal `manager.owner()`;
- trading must not be paused;
- quantity must be greater than zero;
- quote asset type must be accepted;
- range key must match the oracle;
- oracle must be live for minting;
- vault range exposure is inserted;
- oracle risk is refreshed;
- post-trade ask is checked against ask bounds;
- mint cost is withdrawn from `PredictManager` balance;
- vault exposure limits are enforced;
- range position is increased in `PredictManager`;
- `RangeMinted` is emitted.

## Strategy and vault object model

The Phase 3D skeleton defines:

```move
public struct STRATEGY has drop {}
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

Strategy fields:

- `id: UID`
- `creator: address`
- `oracle_id: ID`
- `expiry: u64`
- `lower_strike: u64`
- `higher_strike: u64`
- `default_quantity: u64`
- `creator_fee_bps: u64`
- `platform_fee_bps: u64`
- `metadata_uri: vector<u8>`
- `active: bool`
- `created_at_ms: u64`

`platform_fee_bps` is protocol-set to `10` and stored for transparency. The Strategy does not store a direct platform recipient address.

`ProtocolVault<T>` fields:

- `id: UID`
- `balance: Balance<T>`

## Fee model

MVP fees are separate from DeepBook Predict mint cost.

- DeepBook Predict mint cost is paid from the user's `PredictManager` balance.
- RangePilot creator/platform fee is passed as a separate fee `Coin<T>`.
- The wrapper validates explicit nonzero `fee_amount` and `coin::value(&fee_coin) >= fee_amount`.
- Creator fee transfers to the Strategy creator.
- Platform fee deposits into `ProtocolVault<T>`.
- Any fee coin remainder returns to the follower.
- If `predict::mint_range<T>` aborts, the entire transaction aborts and fee movement rolls back.

Confirmed policy:

- `platform_fee_bps = 10`, which is `0.1%`.
- `MAX_CREATOR_FEE_BPS = 3000`, which is `30%`.
- `300 bps` would be `3%`.
- `metadata_uri` is the only metadata policy in Phase 3D.

The wrapper must not compute fee from DeepBook Predict mint cost by reimplementing pricing.

## Follow strategy flow

1. Follower previews strategy in the frontend.
2. Frontend runs official quote and full `mint_range<DUSDC>` preflight against DeepBook Predict.
3. Follower approves wrapper transaction.
4. Wrapper checks `strategy.active`.
5. Wrapper checks `quantity > 0`.
6. Wrapper validates nonzero explicit fee amount, fee coin value, and creator fee bps.
7. Wrapper splits the explicit fee base into creator/platform amounts.
8. Wrapper transfers creator fee to Strategy creator.
9. Wrapper deposits platform fee into `ProtocolVault<T>`.
10. Wrapper returns any fee coin remainder to follower.
11. Wrapper builds `RangeKey` from Strategy fields.
12. Wrapper calls DeepBook Predict `predict::mint_range<T>`.
13. Wrapper emits `StrategyFollowed` after the protocol call succeeds.

## Entry points

Wrapper surface:

- `create_strategy(...)`
  - creates and shares a Strategy object;
  - validates default quantity, strike order, creator fee cap, and nonempty metadata URI;
  - emits `StrategyCreated`.
- `deactivate_strategy(strategy, ctx)`
  - requires creator authorization;
  - marks strategy inactive;
  - emits `StrategyDeactivated`.
- `create_protocol_vault<T>(admin_cap, ctx)`
  - requires `&AdminCap`;
  - creates and shares `ProtocolVault<T>`;
  - emits `ProtocolVaultCreated`.
- `withdraw_platform_fees<T>(admin_cap, vault, amount, recipient, ctx)`
  - requires `&AdminCap`;
  - rejects overdraw;
  - transfers withdrawn fees to the recipient;
  - emits `PlatformFeesWithdrawn`.
- `follow_strategy_and_mint<T>(...)`
  - validates strategy and fee policy;
  - deposits platform fees into `ProtocolVault<T>`;
  - calls DeepBook Predict `mint_range<T>`;
  - emits `StrategyFollowed`.

No public or entry permissionless `deposit_platform_fees` exists. Platform deposits happen through `follow_strategy_and_mint<T>` only.

The local skeleton entrypoints compile against official DeepBookV3 Git dependencies with Testnet dep-replacements. Concrete published wrapper package IDs, ProtocolVault object IDs, AdminCap owner/publish address, and deployment-specific DUSDC examples remain pending until publish/post-publish setup.

## Events

Events should be indexer-friendly and compact:

- `StrategyCreated`
  - strategy ID, creator, oracle ID, expiry, strikes, default quantity, creator fee bps, fixed platform fee bps, metadata URI, created time.
- `StrategyFollowed`
  - strategy ID, creator, follower, manager ID, oracle ID, expiry, strikes, protocol vault ID, quantity, fee amount, creator fee, platform fee, timestamp.
- `StrategyDeactivated`
  - strategy ID, creator, timestamp.
- `ProtocolVaultCreated`
  - vault ID, admin.
- `PlatformFeeDeposited`
  - vault ID, strategy ID, follower, amount, timestamp.
- `PlatformFeesWithdrawn`
  - vault ID, recipient, amount.

DeepBook Predict still emits `RangeMinted` for the protocol position update. Indexers link the RangePilot `StrategyFollowed` event and DeepBook Predict `RangeMinted` event in the same transaction.

## Error codes

Wrapper-specific errors cover only wrapper policy:

| Error | Meaning |
|---|---|
| `EInactiveStrategy` | Strategy cannot be followed. |
| `EZeroQuantity` | Follow quantity or default quantity is zero. |
| `EFeeBpsTooHigh` | Creator fee bps exceeds wrapper max. |
| `EInsufficientFee` | Provided fee coin is below explicit fee amount. |
| `EUnauthorized` | Non-creator tried to deactivate a strategy. |
| `EZeroFee` | Explicit fee amount is zero. |
| `EEmptyMetadataUri` | Strategy metadata URI is empty. |
| `EInvalidStrikeRange` | Lower strike is not below higher strike. |
| `EInsufficientVaultBalance` | Admin withdrawal exceeds ProtocolVault balance. |

Do not mirror DeepBook Predict pricing, oracle, or vault errors in wrapper code. Surface those from transaction effects or preflight diagnostics.

## Security assumptions

- The follower is the Sui transaction sender.
- DeepBook Predict validates `ctx.sender() == manager.owner()` inside `mint_range`.
- Strategy RangeKey is derived from stored Strategy fields, not arbitrary follower input.
- Fee coin is separate from `PredictManager` balance.
- `ProtocolVault<T>` is a RangePilot fee vault, not DeepBook Predict's market Vault.
- `AdminCap` controls platform fee withdrawals.
- Frontend preflight is advisory safety UX; on-chain checks remain authoritative.
- No private keys, signatures, raw transaction bytes, or local validation caches are stored by the wrapper or browser app.

## Upgrade and deployment assumptions

- The wrapper package is not published in Phase 3D.
- Wrapper package ID is `TBD` until an explicit future Testnet publish round.
- ProtocolVault object ID is `TBD` until post-publish admin creation.
- AdminCap owner/publish address is `TBD` until publish and must be disclosed before first follow.
- The Testnet/hackathon wrapper is upgradeable; final production policy can be revisited later.
- SDK builders must block by default without a wrapper package ID and protocol vault ID.
- Mainnet is out of scope.
- `deepbookv3-predict-testnet-4-16/` is local third-party source for debugging/reference only and must not be committed.

## Open follow-ups

| Follow-up | Status | Handling |
|---|---|---|
| Official DeepBookV3 dependency source | Resolved for Phase 3C: `move/rangepilot/Move.toml` uses official DeepBookV3 Git dependencies for `packages/predict` and `packages/deepbook` at `predict-testnet-4-16`, with Testnet dep-replacements binding deployed package IDs. | Keep local snapshots ignored and uncommitted. Do not switch formal dependencies back to local paths. |
| ProtocolVault fee model | Resolved for Phase 3D: platform fee deposits into `ProtocolVault<T>` and `AdminCap` controls withdrawal. | Create real `ProtocolVault<DUSDC>` only after publish and explicit approval. |
| DUSDC source dependency for published examples | `mint_range<T>` remains generic in the skeleton; concrete DUSDC publish examples still require final package/source confirmation. | Keep skeleton generic and docs Testnet-specific. Confirm before publish. |
| Wrapper package ID | `TBD` until publish. | SDK stubs must block without explicit package ID. |
| ProtocolVault object ID | `TBD` until post-publish creation. | SDK follow builders must block without explicit protocol vault ID. |
| AdminCap owner / publish address | `TBD` until publish. | Disclose before publish/first follow. |
| Final fee policy | Phase 3D confirms Testnet/hackathon `platform_fee_bps = 10` and `MAX_CREATOR_FEE_BPS = 3000`. | Revisit before audits/production if needed. |

## Verification status

Current Phase 3D verification:

- `npm run typecheck`: passed.
- `npm run build:web`: pending final verification.
- `npm run move:build:rangepilot`: passed.
- `npm run move:test:rangepilot`: passed with 18 tests.
