---
Purpose: Define the DeepVol web information architecture for Predict primitives UP, DOWN, RANGE, and BTC MOVE.
Audience: Product engineers, frontend developers, SDK implementers, reviewers, and AI agents.
Status: DeepVol-16-fix-2 primitive terminal status: UP/DOWN remain wallet-gated, `/primitives` auto-discovers active BTC market on page load with granular discovery-phase feedback (Refreshing, Not found, Server error, Quote failed), manual override collapsed under Advanced fallback. RANGE remains quote/preflight-only.
Source of truth relationship: Extends the DeepVol primitives/receipts model, primitive execution policy, primitive quote/preflight contract, and frontend MVP docs; protocol docs and on-chain state remain authoritative for Predict semantics.
---

# DeepVol Predict Primitives Frontend

## Summary

DeepVol is expanding into a Predict-native primitive trading terminal while keeping BTC MOVE as the featured structured receipt product. BTC MOVE packages official DeepBook Predict UP and DOWN binary legs into one protocol-enforced, non-custodial `MoveReceipt` so users can trade movement, not direction.

DeepVol-15 upgrades UP and DOWN from quote/preflight previews into wallet-gated primitive terminals. They can open wallet review only after active BTC market discovery, fresh quote, PredictManager DUSDC balance, and binary mint preflight gates pass. DeepVol-16 confirmed browser smoke and source/test gate review; a follow-up wallet-enabled preflight exposed a stale/non-live oracle blocker (`oracle_config::assert_live_oracle` abort code `3`). DeepVol-16-fix adds active market refresh, effective `Live / Stale / Expired / Unknown` status, stale-oracle copy, and selected oracle object propagation; see [DEEPVOL_PRIMITIVE_ACTIVE_MARKET_DISCOVERY.md](./DEEPVOL_PRIMITIVE_ACTIVE_MARKET_DISCOVERY.md) and [DEEPVOL_PRIMITIVE_EXECUTION_VALIDATION.md](./DEEPVOL_PRIMITIVE_EXECUTION_VALIDATION.md). RANGE remains quote/preflight-only until a dedicated mintability validation round hardens its execution gates.

See [DEEPVOL_PRIMITIVE_EXECUTION_POLICY.md](./DEEPVOL_PRIMITIVE_EXECUTION_POLICY.md) for the execution, fee, and portfolio policy. See [DEEPVOL_PRIMITIVE_QUOTE_PREFLIGHT.md](./DEEPVOL_PRIMITIVE_QUOTE_PREFLIGHT.md) for the quote/preflight contract and blocker matrix.

## Product model

| Product | Meaning | Wins when | DeepVol frontend status |
|---|---|---|---|
| UP | Buy upside | BTC expires above the selected strike | Wallet-gated primitive terminal |
| DOWN | Buy downside | BTC expires below the selected strike | Wallet-gated primitive terminal |
| RANGE | Buy inside range | BTC expires inside the selected lower / upper range | Quote/preflight only; execution disabled |
| MOVE | Buy movement | BTC expires below the lower strike or above the upper strike | Primary enabled receipt product |

BTC MOVE remains the productized DeepVol route:

```text
BTC MOVE = UP above upper strike + DOWN below lower strike
```

Direct primitive trades do not create a DeepVol `MoveReceipt`. Only the BTC MOVE receipt route creates a `MoveReceipt` in the DeepVol MVP.

## RANGE and MOVE complementarity

RANGE and MOVE are complementary exposures around a selected interval:

- RANGE wins when BTC stays inside the selected interval.
- MOVE wins when BTC leaves the selected interval.

This relationship is useful for education, diagnostics, and future composition. DeepVol-15 still keeps BTC MOVE front-and-center as the flagship structured product while allowing UP/DOWN users to trade raw Predict primitives directly behind strict wallet gates.

## Frontend information architecture

DeepVol-15 uses the primitive route as a guarded terminal:

| Surface | DeepVol-15 behavior |
|---|---|
| `/markets` | BTC MOVE remains featured first; UP and DOWN cards link to wallet-gated primitive terminals; RANGE links to quote/preflight gates. |
| `/buy/btc-move` | Existing wallet-gated BTC MOVE receipt transaction workspace remains the enabled receipt route. |
| `/primitives` | Defaults to UP, auto-discovers active BTC primitive market on page load, renders granular discovery-phase feedback (Connect wallet / Refreshing / Live / Not found / Server error / Quote failed / Stale / Expired), collapses manual override under Advanced fallback, and blocks quote/preflight/wallet review unless the selected market is live. |
| `/primitives?type=UP` | Shows UP strike, quantity, quote, manager balance, mint preflight, diagnostics, and wallet review once gates pass. |
| `/primitives?type=DOWN` | Shows DOWN strike, quantity, quote, manager balance, mint preflight, diagnostics, and wallet review once gates pass. |
| `/primitives?type=RANGE` | Shows lower/upper strikes, quantity, range quote, range mint preflight, diagnostics, and disabled execution policy. |
| `/portfolio` | Separates MOVE Receipts from local Primitive Trade Records and keeps known-key primitive readback for a manually entered PredictManager ID. |

The primitive cards and route explain payoff, risk boundary, quote/preflight status, and execution policy. Route and panel UI must not own signing logic directly; wallet signing belongs in the primitive execution hook.

## Execution status

UP/DOWN primitive wallet execution is execution-ready behind DeepVol-15 gates.

Allowed:

- Explain UP, DOWN, RANGE, and MOVE payoffs.
- Link users back to the supported BTC MOVE receipt route.
- Use browser-safe devInspect quote helpers for UP, DOWN, and RANGE.
- Use mint preflight helpers for UP, DOWN, and RANGE.
- Read PredictManager DUSDC balance during primitive preflight.
- Enable UP/DOWN wallet review only after active/live BTC market context, fresh quote, sufficient balance, fresh preflight, Testnet wallet, PredictManager ID, and no active submission.
- Rerun market expiry/status checks, quote, manager balance, and binary mint preflight immediately before the UP/DOWN wallet prompt.
- Store successful UP/DOWN primitive trade digests as local primitive records.
- Read known primitive keys for a manually entered PredictManager ID.
- Keep RANGE execution disabled.

Not allowed:

- Execute a primitive wallet transaction automatically.
- Enable RANGE wallet execution in DeepVol-15.
- Treat primitive trades as `MoveReceipt` creation.
- Charge DeepVol Create Fee on primitive trades.
- Claim general primitive portfolio indexing exists.
- Route primitive records through receipt components.
- Import RANGE builders, BTC MOVE buy builders, redeem builders, withdraw helpers, or private-key utilities into primitive execution code.

## SDK/helper boundary

Current SDK and validation work covers the terminal surface:

| Capability | Status |
|---|---|
| Active BTC market discovery | Browser-safe auto-discovery on page load, granular discovery-phase feedback, selected oracle object, suggested strike context, and manual override collapsed under Advanced fallback. Users no longer manually enter oracle IDs by default. |
| Binary UP/DOWN quote | Browser-safe `devInspectBinaryQuote` support using selected active market context. |
| Binary UP/DOWN mint preflight | `devInspectMintBinaryPreflight` support using a private preflight transaction helper. |
| Binary UP/DOWN mint execution | `buildMintBinaryPrimitiveTransaction(...)` can build the wallet PTB only with an explicit real-Testnet gate flag. |
| Binary UP/DOWN redeem | Existing guarded builder/preflight support for controlled BTC MOVE receipt redeem; primitive redeem UX remains future work. |
| Range quote | Browser-safe `devInspectRangeQuote` support. |
| Range mint preflight | Existing `devInspectMintRangePreflight` support. |
| Range mint execution | Existing SDK capability from prior RangePilot validation, but not enabled from DeepVol-15 primitives UI. |
| Binary/range position readback | Existing known-key readback helpers; no general enumeration. |

Primitive execution still requires runtime gates because quote success is not mintability proof. Fresh quote, manager balance, and mint preflight are rerun immediately before wallet review.

## Copy boundaries

Use clear product copy:

```text
BTC MOVE remains the flagship receipt product. UP and DOWN are wallet-gated raw Predict primitives. RANGE remains quote/preflight-only.
```

```text
Primitive trades do not create DeepVol MoveReceipt. Only BTC MOVE creates a receipt in this app.
```

```text
RANGE wallet execution remains disabled until dedicated mintability validation passes.
```

```text
Known selected key readback is supported first. General primitive position indexing is future work.
```

The app should continue to emphasize:

```text
Trade movement, not direction.
```
