---
Purpose: Document the DeepVol wallet-scoped PredictManager session UX and Advanced manual fallback boundary.
Audience: Frontend developers, SDK implementers, product contributors, reviewers, and AI agents.
Status: DeepVol-25 implementation note. No Move contract changes, mainnet support, or real chain-write verification are introduced by this document.
Source of truth relationship: Derived from the DeepVol frontend implementation and DeepBook Predict Testnet integration docs; protocol docs and on-chain state remain authoritative for transaction semantics.
---

# DeepVol PredictManager UX

## Summary

`PredictManager` is the user's DeepBook Predict account object for DUSDC balances and raw Predict positions. It is user-level state and must not be written into DeepVol contract global config.

DeepVol-25 changes the normal frontend path from "paste a PredictManager object ID" to a wallet-scoped session:

```text
Connect wallet
→ restore wallet-scoped PredictManager hint
→ validate object type and connected-wallet ownership
→ read manager DUSDC balance when available
→ use the validated manager for MOVE / UP / DOWN / RANGE gates
```

If no manager is known, the app shows `Create PredictManager`. The user must explicitly click the CTA and approve the wallet transaction before any manager is created.

## Default user flow

First-time flow:

```text
Connect Sui Testnet wallet
→ no wallet-scoped manager found
→ show Create PredictManager CTA
→ user approves wallet transaction
→ recover created PredictManager object ID from result events/object changes
→ save wallet-scoped local record
→ refresh validation and balance readback
→ quote / preflight / trade gates can use the manager after status is ready
```

Returning flow:

```text
Connect Sui Testnet wallet
→ read wallet-scoped localStorage record
→ validate the manager object belongs to the connected wallet
→ use it automatically when ready
```

Wrong-network and disconnected-wallet states fail closed. A manager saved for one wallet is never reused for a different connected wallet.

## Storage model

The MVP storage source is browser localStorage, scoped by network and normalized wallet address under the existing `deepvol:predict-manager` namespace.

Stored records use this shape:

```ts
{
  walletAddress: string;
  predictManagerId: string;
  createdDigest?: string;
  source: "created" | "manual" | "local_record" | "recovered";
  createdAt?: number;
  updatedAt: number;
}
```

Storage is a browser hint only. It must be validated against chain state before funding, quote, preflight, or trade actions unlock.

## Recovery order

The shared session resolves manager candidates in this order:

1. Wallet-scoped localStorage for the current network and wallet.
2. Latest local primitive trade record for the connected wallet.
3. Existing known-owner discovery helper when useful.
4. Missing state.

Local primitive records can recover a manager ID only for the same connected wallet. Recovery does not imply wallet-wide or cross-browser indexing.

## Session hook

`usePredictManagerSession()` centralizes the PredictManager state used by BTC MOVE and primitive trading pages.

Status values:

```text
idle
wallet_required
wrong_network
loading
missing
ready
invalid
error
```

The session exposes the validated manager ID, source, balance readback, blockers, validation/discovery messages, transaction status, and explicit actions:

```text
createManager()
refresh()
clear()
setManualManager()
```

Quote, preflight, mintability, and wallet execution should use the manager only when `status === "ready"`.

## Create flow

The create flow uses the SDK `buildCreateManagerTransaction()` builder and wallet signing. It does not read private keys, does not use CLI signing, and does not execute automatically.

On success, the frontend recovers the created manager ID with `recoverPredictManagerIdFromCreateResult()`, stores it with `source: "created"` and the transaction digest, then refreshes validation and balance queries.

## Advanced manual fallback

Manual PredictManager object ID entry is not the default user path. It remains available only inside a collapsed Advanced / Developer section for users who already know a manager object ID.

Manual entries are stored with `source: "manual"` and must pass the same object type and connected-wallet ownership validation before they can unlock quotes, preflights, or trades.

## Non-goals and safety boundary

DeepVol-25 does not add:

- general wallet-wide PredictManager discovery;
- cross-browser primitive position indexing;
- profile service, registry, or indexer;
- DeepVol contract state for user managers;
- Move contract changes;
- mainnet support;
- automatic wallet prompts;
- private-key, mnemonic, `.env.local`, or CLI signing paths.

Implementation verification does not require publish, upgrade, `create_series`, BTC MOVE buy/redeem, UP/DOWN mint, RANGE mint, withdraw, or any other real chain write. The runtime create-manager transaction remains an explicit user-click Testnet wallet action.

## Related docs

- [DEEPVOL_PORTFOLIO_PRIMITIVE_POSITIONS.md](./DEEPVOL_PORTFOLIO_PRIMITIVE_POSITIONS.md)
- [DEEPVOL_FRONTEND_MVP.md](./DEEPVOL_FRONTEND_MVP.md)
- [DEEPVOL_PRIMITIVE_DIRECT_TRADING.md](./DEEPVOL_PRIMITIVE_DIRECT_TRADING.md)
- [DEEPVOL_RANGE_PRIMITIVE_TRADING.md](./DEEPVOL_RANGE_PRIMITIVE_TRADING.md)
- [PROTOCOL_INTEGRATION_NOTES.md](./PROTOCOL_INTEGRATION_NOTES.md)
