---
Purpose: Record the decision to build RangePilot Route B as a wrapper that internally calls DeepBook Predict mint_range.
Audience: Project maintainers, Move developers, SDK implementers, frontend developers, reviewers, and AI agents.
Status: Accepted ADR.
Source of truth relationship: Decision record derived from user selection, official DeepBook Predict docs, and local validated entrypoint/source analysis; does not replace protocol source docs.
---

# ADR-0002: Wrapper-internal mint Route B

## Status

Accepted

## Date

2026-05-17

## Context

Phase 2B completed the browser wallet engineering scaffold and fixed manual validation blockers for candidate scan and portfolio RangeKey recovery. Browser wallet testing has validated the direct DeepBook Predict lifecycle: create manager, deposit DUSDC, mint a range, read portfolio quantity, and redeem.

RangePilot now needs its own creator strategy and business layer. The user explicitly selected Route B:

```text
Route B — wrapper contract internally calls DeepBook Predict mint_range.
```

Official Sui DeepBook Predict docs and local source analysis confirm the key protocol boundary:

- DeepBook Predict is a prediction market protocol, not ML prediction.
- `Predict` is the main shared trading entrypoint.
- `PredictManager` is the per-user account and position boundary.
- Range positions are internal `PredictManager` quantities, not standalone NFTs.
- `RangeKey` identifies vertical ranges with `(lower, higher]` settlement semantics.
- `OracleSVI` supplies market/pricing state.
- `Vault` owns liquidity, exposure, MTM, max payout, and risk state.
- The public Predict server is a read model, not a write path.
- `predict::mint_range<Quote>` is public and owns the official mint logic.

Local source signature:

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

## Decision

Build a thin RangePilot wrapper package skeleton.

The wrapper will:

- define `Strategy` data and lifecycle events;
- validate RangePilot strategy active state;
- validate wrapper fee policy;
- construct `RangeKey` from Strategy fields;
- call DeepBook Predict `predict::mint_range<DUSDC>` or generic `predict::mint_range<T>` internally;
- emit `StrategyFollowed` after the DeepBook Predict call succeeds.

The wrapper will not:

- implement pricing;
- implement oracle settlement;
- implement vault risk;
- implement StrikeMatrix;
- calculate payout;
- replace `PredictManager`;
- custody positions;
- treat the public server as a write path.

The existing direct DeepBook Predict SDK lifecycle remains valid for quote, diagnostics, and full preflight. Future wrapper UX must still run official quote + full `mint_range<DUSDC>` preflight before wallet approval.

## Alternatives considered

### Route A: frontend-only PTB orchestration

The frontend could build a PTB that calls DeepBook Predict directly and records strategy metadata off-chain.

- Pros: no wrapper package deployment.
- Cons: no atomic creator/platform fee enforcement, no on-chain Strategy object lifecycle, weaker attribution.
- Rejected because the user selected wrapper-internal minting.

### Event-recorder-only strategy layer

RangePilot could emit StrategyCreated/StrategyFollowed events without calling DeepBook Predict internally.

- Pros: simpler contract.
- Cons: follow attribution can diverge from actual mint execution; fee and mint are not one atomic wrapper action.
- Rejected because RangePilot should become the creator strategy + fee + DeepBook Predict mint entrypoint.

### Custom pricing/risk wrapper

RangePilot could compute quote/mintability/payout itself and only use DeepBook Predict as settlement infrastructure.

- Pros: more control.
- Cons: violates protocol boundary, duplicates pricing/vault/oracle/StrikeMatrix logic, likely unsafe and wrong.
- Rejected because DeepBook Predict must remain the pricing/risk/payout authority.

### NFT-like RangePilot positions

RangePilot could wrap or mirror range positions as standalone NFTs.

- Pros: familiar portfolio mental model.
- Cons: conflicts with DeepBook Predict design where range positions live as quantities inside `PredictManager`.
- Rejected for MVP. Attribution should be event/indexer-based.

## Consequences

Positive:

- Strategy validation, fee policy, DeepBook mint, and attribution can be one atomic transaction.
- DeepBook Predict remains the source of truth for positions and protocol behavior.
- Creator strategies become first-class RangePilot objects.
- Failed `mint_range` rolls back fee movement in the same transaction.

Negative:

- A RangePilot Move package must be deployed in a future round.
- Wrapper package ID is unknown until publish and must be `TBD` in config.
- SDK wrapper builders must block unless a package ID is explicitly provided.
- The wrapper formal dependency source is the official DeepBookV3 Git repository with Testnet dep-replacements for the deployed DeepBook Predict and DeepBook package IDs; the local `deepbookv3-predict-testnet-4-16/` snapshot is debugging/reference-only and must not be committed.

## Phase 3D amendment

Phase 3D supersedes the direct platform-recipient model with RangePilot `ProtocolVault<T>` and `AdminCap`:

- platform fee deposits into `ProtocolVault<T>`, not a direct recipient address;
- `AdminCap` controls ProtocolVault creation and withdrawal;
- `platform_fee_bps = 10`, which is `0.1%`;
- `MAX_CREATOR_FEE_BPS = 3000`, which is `30%`; `300 bps` would be `3%`;
- metadata policy is `metadata_uri` only;
- Strategy objects remain shared;
- strategy creation remains permissionless;
- the Testnet/hackathon wrapper is upgradeable, and upgrade authority must be disclosed before publish.

## Phase 3E note

Phase 3E pre-publish verification passed, and the intended Testnet publisher/AdminCap owner address was confirmed as `0xc558e37d20405a9751c81124ac8d167e2b2d368b834319adafa549449e0715f5`. The controlled publish did not execute because Sui CLI publish and bytecode-dump diagnostics still classify `deepbook_predict` as an unpublished dependency. No wrapper package, AdminCap, UpgradeCap, or `ProtocolVault<DUSDC>` was created, so Route B remains accepted but unpublished.

## Follow-up requirements

- Keep `move/rangepilot` compiling against official DeepBookV3 Git dependencies plus Testnet dep-replacements; current verification passes `npm run move:build:rangepilot` and `npm run move:test:rangepilot` with 18 tests.
- Resolve the `deepbook_predict` dependency publication metadata blocker without vendoring local snapshots or publishing DeepBook Predict as a RangePilot dependency.
- Retry wrapper publish only after a no-transaction publish dry-run no longer reports `deepbook_predict` as unpublished.
- Create `ProtocolVault<DUSDC>` only after wrapper publish succeeds.
- Record wrapper package ID, ProtocolVault object ID, and actual AdminCap owner after publish/post-publish setup.
- Keep SDK transaction builders default-blocked without wrapper package ID, ProtocolVault object ID, quote-preview gate, and full mint-preflight gate.
- Re-run official quote and full preflight before every future wrapper follow transaction.
- Add indexing plan to link `StrategyFollowed` with DeepBook Predict `RangeMinted` in the same transaction.
