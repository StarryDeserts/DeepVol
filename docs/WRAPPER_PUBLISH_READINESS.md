---
Purpose: Track RangePilot wrapper contract readiness before any Testnet publish.
Audience: Move developers, SDK implementers, frontend developers, reviewers, and product leads.
Status: Phase 3D ProtocolVault publish-readiness checklist; wrapper package is not published.
Source of truth relationship: Supplements wrapper architecture and protocol integration docs; official DeepBook Predict docs and local Move source remain authoritative for protocol behavior.
---

# Wrapper Publish Readiness

## Current status

The RangePilot wrapper package is a publish-readiness candidate, not a published package. Phase 3D replaces the direct platform-recipient fee model with `ProtocolVault<T>` + `AdminCap`, fixes platform fee policy at 10 bps, caps creator fees at 3000 bps, keeps shared permissionless Strategies, and preserves Route B internal DeepBook Predict minting.

Current verification snapshot:

| Command | Status |
|---|---|
| `npm run typecheck` | Passed after SDK/config/type updates. |
| `npm run build:web` | Must pass before commit; existing Vite chunk-size warning is acceptable if unchanged. |
| `npm run move:build:rangepilot` | Passed with official DeepBookV3 Git dependencies and Testnet dep-replacements. |
| `npm run move:test:rangepilot` | Passed with 18 RangePilot tests. |

## Package and dependency source

| Item | Value |
|---|---|
| Wrapper package path | `move/rangepilot` |
| Wrapper package ID | `TBD` until publish. |
| ProtocolVault object ID | `TBD` until post-publish `create_protocol_vault<DUSDC>`. |
| AdminCap owner / publish address | `TBD` until publish; must be disclosed before first follow. |
| Formal DeepBook Predict dependency | Official DeepBookV3 Git repo, `packages/predict`, `rev = "predict-testnet-4-16"`. |
| Formal DeepBook dependency | Official DeepBookV3 Git repo, `packages/deepbook`, `rev = "predict-testnet-4-16"`. |
| Testnet binding | `Move.toml` uses `dep-replacements.testnet` for deployed DeepBook Predict and DeepBook package IDs. |
| Local source snapshot | `deepbookv3-predict-testnet-4-16/` is source-level debugging/reference only and must not be committed. |

The wrapper must not switch its formal Move dependency back to `../../deepbookv3-predict-testnet-4-16/packages/predict` or any `deepbookv3-predict-package` path.

## What is ready

- `Strategy` stores creator, range, expiry, default quantity, creator fee bps, protocol-set platform fee bps, metadata URI, active flag, and creation timestamp.
- Strategy creation is permissionless and shares the Strategy object.
- `create_strategy` validates nonzero default quantity, lower strike below higher strike, nonempty metadata URI, and creator fee bps bounds.
- `deactivate_strategy` requires creator authorization.
- `AdminCap` is minted at package init to the publisher / transaction sender.
- `create_protocol_vault<T>` requires `&AdminCap` and shares a `ProtocolVault<T>` object.
- `ProtocolVault<T>` holds platform fee balances for the fee coin type.
- `withdraw_platform_fees<T>` requires `&AdminCap` and rejects overdraw.
- `follow_strategy_and_mint<T>` checks active strategy, nonzero quantity, nonzero explicit fee amount, fee coin value, and stored creator fee bps.
- `follow_strategy_and_mint<T>` splits the explicit fee base using creator fee bps plus fixed `platform_fee_bps = 10`.
- Creator fee transfers to the creator.
- Platform fee deposits into `ProtocolVault<T>`.
- Any fee coin remainder returns to the follower.
- `follow_strategy_and_mint<T>` derives `RangeKey` from stored Strategy fields and internally calls DeepBook Predict `predict::mint_range<T>`.
- `StrategyFollowed` is emitted after `predict::mint_range<T>` returns.
- SDK transaction builder blocks unless explicit wrapper package ID, protocol vault ID, quote-preview gate, and full mint-preflight gate are supplied.
- Type/config placeholders keep wrapper package ID, protocol vault ID, and admin cap ID unset until publish/post-publish setup.

## What is not ready

- Wrapper package is not published.
- No `ProtocolVault<DUSDC>` object exists yet.
- No final AdminCap owner / publish address is recorded.
- No real `follow_strategy_and_mint<T>` transaction has been executed.
- No final creator strategy UI is built.
- No indexer schema links `StrategyFollowed` to DeepBook Predict `RangeMinted` in production.
- No final platform withdrawal recipient policy is approved.
- No mainnet deployment is in scope.

## Confirmed decisions

| Decision | Status |
|---|---|
| Platform fee recipient model | Confirmed: platform fee deposits into RangePilot `ProtocolVault<T>`, not a direct recipient address. |
| Platform fee bps | Confirmed: `10` bps = `0.1%`. |
| Creator fee bps max | Confirmed: `3000` bps = `30%`; `300` bps would be `3%`. |
| Metadata policy | Confirmed: `metadata_uri` only for MVP; nonempty URI validation. |
| Whether Strategy object is shared | Confirmed: Strategy is shared so multiple followers can use it. |
| Whether strategy creation is permissionless | Confirmed: anyone can create a Strategy; curation is off-chain/frontend/indexer. |
| Upgrade policy | Confirmed: Testnet/hackathon wrapper is upgradeable; upgrade authority must be disclosed. |
| Wrapper package/vault config location | Confirmed: `packages/config/src/rangePilotTestnet.ts`. |
| First Testnet `follow_strategy_and_mint` scenario | Confirmed as design-only in Phase 3D; actual execution remains future approval. |

## Pending publish/post-publish values

| Item | Status |
|---|---|
| Actual wrapper package ID | `TBD` until publish. |
| Actual ProtocolVault object ID | `TBD` until `create_protocol_vault<DUSDC>` after publish. |
| Actual AdminCap owner / publish address | `TBD` until publish; must be disclosed. |
| Actual first Testnet follow transaction | `TBD`; do not execute in Phase 3D. |
| Actual publish approval | Required before publish. |

## Publish checklist

- Confirm Sui CLI version and `Move.toml` environment syntax.
- Re-run `npm run move:build:rangepilot`.
- Re-run `npm run move:test:rangepilot`.
- Re-run `npm run typecheck`.
- Re-run `npm run build:web`.
- Confirm `Move.lock` pins DeepBook Predict and DeepBook to Git sources, not local snapshot paths.
- Confirm no `.env*`, `.local/`, `.claude/`, `.traces/`, or DeepBook source snapshot paths are staged.
- Confirm wrapper package will be published to Testnet only.
- Confirm upgrade authority disclosure text.
- Confirm AdminCap custody plan and publish address.
- Confirm post-publish `ProtocolVault<DUSDC>` creation transaction plan.
- Get explicit publish approval.
- Publish only to Testnet.

## Post-publish config checklist

- Record wrapper package ID in `packages/config/src/rangePilotTestnet.ts`.
- Record `ProtocolVault<DUSDC>` object ID in `packages/config/src/rangePilotTestnet.ts` after admin creates it.
- Record AdminCap object ID only for admin operations; do not expose it in follower frontend flows unless a future admin task requires it.
- Update SDK wrapper config while keeping quote/preflight gates required.
- Update docs with publish digest/package ID and ProtocolVault object ID.
- Add a small post-publish integration checklist entry for first wrapper follow.

## Testnet integration checklist

- Select a live oracle/range at runtime; do not hardcode stale market state.
- Run official `predict::get_range_trade_amounts` quote preview.
- Require positive official mint cost.
- Run full DeepBook Predict `mint_range<DUSDC>` devInspect preflight.
- Build wrapper `follow_strategy_and_mint<DUSDC>` transaction only after quote and full preflight pass.
- Include shared `ProtocolVault<DUSDC>` object as a wrapper input.
- Execute one explicit user-approved Testnet follow transaction in a future round.
- Confirm DeepBook Predict `RangeMinted` event and RangePilot `StrategyFollowed` event in the same transaction.
- Confirm direct `predict_manager::range_position` readback for the followed RangeKey.
- Confirm platform fee deposited into `ProtocolVault<DUSDC>`.
- Confirm creator fee transferred to creator.
- Confirm a failing DeepBook mint abort rolls back creator transfer and ProtocolVault deposit.

## First Testnet follow scenario, design-only

1. Obtain explicit future publish approval.
2. Publish the wrapper package to Sui Testnet with upgradeability retained for the hackathon/Testnet stage.
3. Record the wrapper package ID in `packages/config/src/rangePilotTestnet.ts`.
4. Publisher receives AdminCap; disclose AdminCap owner/publish address.
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

Forbidden Phase 3D actions:

- Do not run `sui client publish`.
- Do not run `sui client call`.
- Do not sign with a wallet.
- Do not execute local signer transactions.
- Do not run validation scripts that submit transactions.

## Rollback and redeploy assumptions

Before publish, rollback is just a git revert or follow-up commit. After Testnet publish, deployed package code cannot be removed from chain. If an issue is found post-publish, the likely path is to publish a corrected package and update config to the new wrapper package ID, subject to the Testnet/hackathon upgradeability policy.

## Security checklist

- Do not print or commit private keys, mnemonics, signatures, or raw transaction bytes.
- Do not read `.env.local` for wrapper readiness work.
- Do not commit `.env*`, `.local/`, `.claude/`, `.traces/`, `deepbookv3-predict-package/`, or `deepbookv3-predict-testnet-4-16/`.
- Do not execute real transactions without explicit approval.
- Do not publish without explicit approval.
- Do not use mainnet.
- Do not reimplement DeepBook Predict pricing, oracle, vault, StrikeMatrix, payout, settlement, or `PredictManager` custody.
- Keep frontend quote and full mint preflight gates before any wrapper wallet prompt.
