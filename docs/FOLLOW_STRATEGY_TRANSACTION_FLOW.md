---
Purpose: Specify the planned Route B follow_strategy_and_mint transaction flow for the RangePilot wrapper.
Audience: Move developers, SDK implementers, frontend developers, protocol integrators, reviewers, and AI agents.
Status: Phase 3D ProtocolVault transaction-flow reference; not published or executed.
Source of truth relationship: Supplements wrapper architecture and entrypoint binding docs; official DeepBook Predict docs and local source signatures remain authoritative for protocol entrypoints.
---

# Follow Strategy Transaction Flow

Route B means RangePilot's wrapper is the wallet transaction target and the wrapper internally calls DeepBook Predict `mint_range<DUSDC>`. The wrapper owns strategy validation, creator fee transfer, ProtocolVault platform fee deposit, and attribution events. DeepBook Predict owns the actual range mint.

## Inputs

Planned wrapper transaction inputs:

- shared `Strategy` object;
- DeepBook Predict `Predict` shared object;
- user's DeepBook Predict `PredictManager` shared object;
- DeepBook Predict `OracleSVI` object;
- fee `Coin<DUSDC>` or generic fee `Coin<T>`;
- shared RangePilot `ProtocolVault<T>` object for the same fee coin type;
- explicit nonzero fee amount;
- follow quantity;
- `Clock`;
- `TxContext`.

The frontend also needs confirmed config values for Testnet:

- Predict package ID;
- Predict shared object ID;
- DUSDC coin type;
- wrapper package ID after future publish;
- ProtocolVault object ID after post-publish admin creation;
- Sui Clock object ID `0x6`.

The wrapper package ID and ProtocolVault object ID are `TBD` until a future explicit publish/post-publish setup round.

## Pre-transaction frontend gates

Before wallet approval, the frontend must run the official DeepBook Predict gates:

1. confirm wallet and app are on Sui Testnet;
2. confirm user has a `PredictManager`;
3. confirm manager DUSDC balance can cover DeepBook Predict mint cost;
4. derive RangeKey from Strategy fields;
5. call official `predict::get_range_trade_amounts` for quote preview;
6. require positive mint cost;
7. run full `predict::mint_range<DUSDC>` devInspect preflight;
8. show creator/platform fee separately from mint cost;
9. confirm wrapper package ID and ProtocolVault object ID are configured;
10. block follow if full preflight fails.

Quote success alone must not enable follow.

## Wrapper transaction steps

1. Validate `strategy.active == true`.
2. Validate `quantity > 0`.
3. Validate nonzero explicit `fee_amount`.
4. Validate `fee_coin.value() >= fee_amount`.
5. Validate stored `creator_fee_bps <= 3000`; platform fee bps is protocol-set to `10`.
6. Split the explicit fee base into creator fee and platform fee.
7. Transfer creator fee to `strategy.creator`.
8. Deposit platform fee into `ProtocolVault<T>`.
9. Return any fee coin remainder to the follower.
10. Derive the `RangeKey` from stored Strategy fields:

```move
let key = range_key::new(
    strategy.oracle_id,
    strategy.expiry,
    strategy.lower_strike,
    strategy.higher_strike,
);
```

11. Rely on DeepBook Predict `mint_range` for manager ownership; the local source confirms `mint_range` asserts `ctx.sender() == manager.owner()`.
12. Call DeepBook Predict:

```move
predict::mint_range<T>(
    predict,
    manager,
    oracle,
    key,
    quantity,
    clock,
    ctx,
);
```

13. Emit `StrategyFollowed` only after `mint_range` returns successfully, including `protocol_vault_id`.

## Atomicity

Fee handling and DeepBook Predict minting happen in one Sui transaction. If `mint_range` aborts, the transaction aborts and earlier creator transfer plus ProtocolVault deposit roll back. This avoids partial fee capture for failed mints.

The frontend should still preflight to avoid unnecessary wallet failures, but on-chain atomicity is the final rollback guarantee.

## Fee flow

Phase 3D MVP fee flow:

```text
fee Coin<T> passed to wrapper
→ wrapper validates explicit_fee_amount > 0
→ wrapper validates fee_coin.value() >= explicit_fee_amount
→ wrapper splits explicit_fee_amount using creator_fee_bps and fixed platform_fee_bps = 10
→ wrapper transfers creator fee to creator
→ wrapper deposits platform fee into ProtocolVault<T>
→ wrapper returns any fee coin remainder to follower
→ wrapper calls DeepBook Predict mint_range<T>
```

The fee type may be generic in the skeleton. Product docs expect DUSDC for the Testnet user path, but concrete DUSDC publish examples still require future publish/post-publish confirmation.

The wrapper must not compute fee from DeepBook Predict mint cost by reproducing pricing. Phase 3D uses explicit fee amount only; quantity-based tokenomics remain a future product decision.

## Admin operations

`AdminCap` is not part of the follower follow transaction. It is used for admin operations:

- `create_protocol_vault<T>` after wrapper publish;
- `withdraw_platform_fees<T>` for later platform fee withdrawal.

The AdminCap owner / publish address is `TBD` until publish and must be disclosed before first follow.

## DeepBook Predict mint behavior

The local source confirms `predict::mint_range<Quote>` performs these protocol checks and mutations:

- checks manager ownership;
- checks trading pause;
- checks nonzero quantity;
- checks quote asset is accepted;
- checks RangeKey matches OracleSVI;
- checks oracle is live;
- inserts range exposure into Vault;
- refreshes oracle risk;
- recomputes range ask after the trade is inserted;
- enforces ask bounds;
- withdraws cost from `PredictManager`;
- accepts payment into Vault;
- checks total exposure;
- increases the manager range position;
- emits `RangeMinted`.

RangePilot should not duplicate these checks except for user-facing preflight diagnostics.

## Events in a successful transaction

A successful follow transaction should produce at least:

1. `PlatformFeeDeposited` from RangePilot if the computed platform split is positive.
2. DeepBook Predict `RangeMinted` event from the official protocol.
3. RangePilot `StrategyFollowed` event from the wrapper.

The recommended skeleton emits `StrategyFollowed` after `mint_range` succeeds so the event cannot exist without a successful protocol call.

## First Testnet follow scenario, design-only

Phase 3D only records this scenario; it does not execute it:

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

## Public server boundary

The public Predict server is a read model only. It can help render market lists, vault summaries, manager summaries, strategy pages, and history. It must not be treated as a transaction executor or wallet-critical source of active range quantity.

Wallet-critical position checks should use direct `predict_manager::range_position` for a known RangeKey when possible.

## Failure cases

| Failure | Expected behavior |
|---|---|
| Strategy inactive | Wrapper aborts before fee/mint. |
| Quantity zero | Wrapper aborts before fee/mint. |
| Fee below expected amount | Wrapper aborts before mint. |
| Missing wrapper package ID in SDK | SDK refuses to build wrapper PTB. |
| Missing ProtocolVault object ID in SDK | SDK refuses to build wrapper PTB. |
| Non-owner manager | DeepBook Predict `mint_range` aborts. |
| Oracle/range mismatch | DeepBook Predict `mint_range` aborts. |
| Stale or inactive oracle | DeepBook Predict `mint_range` aborts. |
| Ask bounds or vault risk failure | DeepBook Predict `mint_range` aborts. |
| Insufficient manager balance | DeepBook Predict manager withdraw aborts. |

All on-chain failures abort the transaction. Fee transfers and ProtocolVault deposits do not persist after abort.

## Out of scope

- direct real follow transaction in Phase 3D;
- wrapper package publish;
- mainnet;
- custom pricing;
- custom payout;
- custom vault risk;
- position NFTs;
- automated wallet approval;
- ProtocolVault dashboard.
