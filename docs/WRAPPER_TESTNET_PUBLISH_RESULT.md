---
Purpose: Record the RangePilot wrapper Testnet publish and ProtocolVault setup result.
Audience: Move developers, SDK implementers, frontend developers, reviewers, and product leads.
Status: Phase 3E Testnet publish blocker record; no wrapper package was published.
Source of truth relationship: Records observed Testnet publish diagnostics; Move source, Sui CLI output, and Sui object reads remain authoritative for on-chain state.
---

# Wrapper Testnet Publish Result

## Summary

Phase 3E attempted the controlled Testnet publish path after the pre-publish repository checks passed, but the publish did not execute because Sui CLI package publication diagnostics rejected `deepbook_predict` as an unpublished dependency.

No RangePilot wrapper package was published, no `AdminCap` or `UpgradeCap` was created, and no `ProtocolVault<DUSDC>` was created.

## Network and publisher

| Item | Value |
|---|---|
| Network | Testnet |
| Active environment | `testnet` |
| Sui CLI version | `sui 1.71.1-2f5992f189cd-dirty` |
| Intended publisher address | `0xc558e37d20405a9751c81124ac8d167e2b2d368b834319adafa549449e0715f5` |
| Intended AdminCap owner | `0xc558e37d20405a9751c81124ac8d167e2b2d368b834319adafa549449e0715f5` |
| Available gas at pre-publish gate | One Testnet SUI gas coin with approximately `8.16 SUI` |

## Publish result

| Item | Value |
|---|---|
| Publish executed | No |
| Publish digest | `TBD`; no publish transaction was executed. |
| Wrapper package ID | `TBD`; no package was published. |
| AdminCap object ID | `TBD`; no package init ran. |
| AdminCap owner | `TBD`; no `AdminCap` exists for this wrapper package. |
| UpgradeCap object ID | `TBD`; no package was published. |
| UpgradeCap owner | `TBD`; no `UpgradeCap` exists for this wrapper package. |
| Sanitized blocker | `sui client publish move/rangepilot --dry-run --gas-budget 200000000 --json` reports: `The package has unpublished dependencies ... Unpublished dependencies: deepbook_predict`. |

## ProtocolVault<DUSDC> setup

| Item | Value |
|---|---|
| DUSDC type | `0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a::dusdc::DUSDC` |
| ProtocolVault creation executed | No |
| ProtocolVault creation digest | `TBD`; vault creation was not attempted after publish was blocked. |
| ProtocolVault<DUSDC> object ID | `TBD`; no vault exists yet. |

## Config updates

`packages/config/src/rangePilotTestnet.ts` remains intentionally unset:

- `RANGEPILOT_WRAPPER_PACKAGE_ID = null`
- `RANGEPILOT_PROTOCOL_VAULT_ID = null`
- `RANGEPILOT_ADMIN_CAP_ID = null`

The SDK/follower flow must continue to block until real Testnet wrapper package and `ProtocolVault<DUSDC>` IDs are recorded.

## Commands used

Pre-publish repository checks passed before the publish attempt:

```bash
npm run typecheck
npm run build:web
npm run move:build:rangepilot
npm run move:test:rangepilot
```

The publish investigation used no-transaction commands before deciding not to publish:

```bash
sui client publish move/rangepilot --dry-run --gas-budget 200000000 --json
sui move build --path move/rangepilot --build-env testnet --dump-bytecode-as-base64
```

Observed blocker:

```text
The package has unpublished dependencies. If you want to publish with unpublished dependencies, please publish them one by one, or (not recommended) pass the `--with-unpublished-dependencies` flag.
 Unpublished dependencies: deepbook_predict
```

## Verification

- `npm run typecheck`: passed at pre-publish gate.
- `npm run build:web`: passed at pre-publish gate with the existing acceptable Vite chunk-size warning.
- `npm run move:build:rangepilot`: passed at pre-publish gate.
- `npm run move:test:rangepilot`: passed at pre-publish gate with 18 RangePilot tests.
- Public object read confirmed the configured DeepBook Predict package ID exists on Testnet as an immutable package object.
- No RangePilot wrapper package object exists because publish did not execute.

## Security and non-actions

- No private keys, mnemonics, signatures, or raw transaction bytes were printed or committed.
- `.env.local`, `.env*`, `.local/`, `.claude/`, `.trace/`, `.traces/`, `deepbookv3-predict-package/`, and `deepbookv3-predict-testnet-4-16/` were not read or staged.
- No `follow_strategy_and_mint` transaction was executed.
- No DeepBook Predict `mint_range`, `redeem_range`, or `supply` transaction was executed.
- No `withdraw_platform_fees` transaction was executed.
- No mainnet transaction was executed.
- `create_protocol_vault<DUSDC>` was not attempted because publish was blocked.

## Next step

Resolve the Sui Move package publication metadata blocker for the official DeepBook Predict Git dependency without vendoring local snapshots or publishing DeepBook Predict as a RangePilot dependency. After a no-transaction publish dry-run no longer reports `deepbook_predict` as unpublished, rerun the controlled Testnet publish and then create `ProtocolVault<DUSDC>`.
