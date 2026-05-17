---
Purpose: Define RangePilot ProtocolVault and AdminCap fee custody for the creator strategy wrapper.
Audience: Move developers, SDK implementers, frontend developers, reviewers, and product leads.
Status: Phase 3E publish attempt blocked by dependency publication metadata; no ProtocolVault object exists.
Source of truth relationship: Supplements wrapper architecture and publish readiness docs; Move source remains authoritative for implemented entrypoints.
---

# ProtocolVault Design

## Role

`ProtocolVault<T>` is a RangePilot wrapper object, not the DeepBook Predict Vault. DeepBook Predict still owns pricing, liquidity, exposure, payout, settlement, and `PredictManager` range-position accounting.

RangePilot `ProtocolVault<T>` only holds the platform split of the explicit RangePilot follow fee. It does not custody follower DeepBook Predict positions or DeepBook mint cost.

## Confirmed fee policy

Phase 3D confirms this Testnet/hackathon policy:

- platform fees deposit into `ProtocolVault<T>`;
- `AdminCap` controls withdrawals;
- no direct platform recipient is chosen at follow time;
- `platform_fee_bps = 10`, which is `0.1%`;
- `MAX_CREATOR_FEE_BPS = 3000`, which is `30%`;
- `300 bps` would be `3%`;
- metadata policy is `metadata_uri` only;
- Strategy objects are shared;
- strategy creation is permissionless;
- the wrapper is upgradeable for the Testnet/hackathon stage, and upgrade authority must be disclosed before publish.

The explicit RangePilot fee base remains separate from the DeepBook Predict mint cost. The wrapper must not compute fee amounts by reimplementing DeepBook Predict pricing.

## Follow transaction fee movement

A future wrapper follow transaction uses this fee path:

```text
fee Coin<T> passed to wrapper
→ wrapper validates explicit fee_amount > 0
→ wrapper validates fee_coin.value() >= fee_amount
→ wrapper splits fee_amount by creator_fee_bps and fixed platform_fee_bps = 10
→ creator fee transfers to Strategy creator
→ platform fee deposits into ProtocolVault<T>
→ any fee coin remainder returns to the follower
→ wrapper calls DeepBook Predict mint_range<T>
→ wrapper emits StrategyFollowed after mint_range<T> succeeds
```

If DeepBook Predict `mint_range<T>` aborts, the Sui transaction aborts and the creator transfer plus `ProtocolVault<T>` deposit roll back.

## Admin authority

The package initializer mints `AdminCap` to the publisher / transaction sender. Admin operations use `AdminCap`; normal follower transactions do not need it.

Admin-controlled operations:

- create `ProtocolVault<T>` after wrapper publish;
- withdraw platform fees from `ProtocolVault<T>` to a recipient chosen by the admin operation.

Phase 3E intended publisher/AdminCap owner address was `0xc558e37d20405a9751c81124ac8d167e2b2d368b834319adafa549449e0715f5`, but publish was blocked before execution, so no actual `AdminCap` exists yet. The admin cap ID is a post-publish operational value, not a frontend follower-flow input unless a future explicit admin workflow requires it.

## Current deployment state and non-goals

Phase 3E pre-publish checks passed, but Sui CLI publish and bytecode-dump diagnostics still classify `deepbook_predict` as an unpublished dependency. The wrapper package was not published, no `AdminCap` or `UpgradeCap` was created, and no real `ProtocolVault<DUSDC>` object exists.

Current non-goals:

- execute `follow_strategy_and_mint<DUSDC>`;
- execute DeepBook Predict `mint_range`, `redeem_range`, or `supply`;
- execute `withdraw_platform_fees`;
- use mainnet;
- choose a final platform withdrawal recipient;
- build a vault dashboard;
- implement DeepBook Predict pricing, oracle settlement, vault risk, StrikeMatrix, payout, settlement, or `PredictManager` custody.

## First Testnet follow scenario

This scenario remains pending until the Phase 3E dependency publication metadata blocker is resolved and wrapper publish plus `ProtocolVault<DUSDC>` setup succeed:

1. Resolve Sui CLI `deepbook_predict` unpublished-dependency diagnostics without vendoring local snapshots or publishing DeepBook Predict as a RangePilot dependency.
2. Retry the controlled wrapper package publish to Sui Testnet with upgradeability retained for the hackathon/Testnet stage.
3. Record the wrapper package ID in `packages/config/src/rangePilotTestnet.ts`.
4. Publisher receives `AdminCap`; disclose AdminCap owner/publish address.
5. Admin creates `ProtocolVault<DUSDC>`; record ProtocolVault object ID in RangePilot config.
6. Creator creates a shared permissionless Strategy with `creator_fee_bps <= 3000` and `metadata_uri`.
7. Follower has a `PredictManager`.
8. Follower manager has DUSDC balance for DeepBook Predict mint cost.
9. Follower wallet has a separate DUSDC fee coin for RangePilot creator/platform fee base.
10. Frontend/SDK runs official `get_range_trade_amounts` quote preview.
11. Frontend/SDK runs full DeepBook Predict `mint_range<DUSDC>` preflight.
12. SDK builds wrapper `follow_strategy_and_mint<DUSDC>` only after quote/preflight gates pass.
13. Future explicit approval executes the wrapper follow transaction.
14. Verify RangePilot `StrategyFollowed` event.
15. Verify DeepBook Predict `RangeMinted` event in the same transaction.
16. Verify follower `predict_manager::range_position` increased.
17. Verify platform fee deposited into `ProtocolVault<DUSDC>`.
18. Verify creator fee transferred to creator.
19. Verify a failing DeepBook mint abort rolls back creator transfer and ProtocolVault deposit.

Remaining forbidden actions before publish/setup succeeds:

- do not execute `follow_strategy_and_mint`;
- do not execute DeepBook Predict `mint_range`, `redeem_range`, or `supply`;
- do not execute `withdraw_platform_fees`;
- do not use mainnet;
- do not run validation scripts that submit non-approved transactions.
