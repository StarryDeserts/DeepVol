---
Purpose: Document DeepVol-33 runtime input normalization and mintability diagnostics for the Open Design app.
Audience: Frontend developers, SDK implementers, protocol integrators, reviewers, and AI agents.
Status: DeepVol-33 implementation record for `apps/deepvol-open-design/`; source tests, typecheck, and build verify the runtime diagnostics wiring. Connected-wallet candidate outcomes remain runtime-dependent.
Source of truth relationship: Derived from the Open Design app implementation and SDK helper contracts; protocol docs and on-chain state remain authoritative for transaction semantics.
---

# DeepVol Mintability Runtime Diagnostics

## Summary

DeepVol-33 adds runtime mintability input parity diagnostics to the standalone Open Design app. MOVE, UP, DOWN, and RANGE mintability searches now build a shared normalized runtime context before calling SDK candidate helpers, and each trading panel exposes a collapsed diagnostics view for missing inputs, quote/preflight attempt summaries, and DUSDC balance roles.

This work diagnoses the connected-wallet failure mode where every product reported a non-positive mint cost. The app no longer treats that as a generic visual-copy issue or as proof of insufficient DUSDC by default; it records the actual runtime fields and candidate failure family so users can distinguish input mismatch, quote economics, and balance/preflight failures.

## App scope

```text
apps/deepvol-open-design/
```

DeepVol-33 affects browser-safe quote, mintability, and preflight diagnostics only. It does not change Move contracts, package config, protocol entrypoints, SDK pricing logic, or the old `apps/deepvol-web` UI.

## Runtime context builder

`apps/deepvol-open-design/src/hooks/tradeRuntimeContext.ts` exports `buildTradeRuntimeContext()` for all four products:

```ts
type TradeRuntimeProduct = "MOVE" | "UP" | "DOWN" | "RANGE";
```

The builder validates and normalizes the exact fields the SDK candidate searches need:

- connected wallet address;
- Sui Testnet network state;
- PredictManager object ID;
- live active BTC market;
- oracle ID and oracle object ID;
- expiry as an unsigned integer string;
- quantity via `normalizePositiveIntegerInput()`;
- anchor price from valid `forward` first, then valid `spot`;
- positive `tickSize`;
- non-negative `minStrike`;
- optional `underlyingAsset`.

It emits `sdkInput` only when blockers are empty. It also emits a dependency key that includes wallet, network, PredictManager, active-market status/source, oracle ID, oracle object ID, expiry, raw and normalized quantity, spot, forward, tick size, min strike, and underlying asset so stale candidate state resets when any runtime input changes.

Suggested strikes seed UI fields only; mintability search uses `forward` or `spot` plus the tick grid.

## Candidate diagnostics

`apps/deepvol-open-design/src/hooks/mintabilityDiagnostics.ts` normalizes candidate-attempt summaries across product families:

- MOVE uses BTC MOVE lower/upper candidates and UP/DOWN leg diagnostics.
- UP and DOWN use binary primitive strike attempts.
- RANGE adapts existing range interval diagnostics.

Each diagnostic row includes:

- product;
- candidate label;
- quote status;
- quote cost atomic;
- preflight status;
- failure family;
- user-facing message;
- raw error summary.

Each summary includes:

- candidate count;
- quote passed count;
- preflight passed count;
- failure counts by family;
- first few failures;
- last failure;
- dominant failure.

## Product wiring

### MOVE

`useBtcMoveMintableRange()` now calls `buildTradeRuntimeContext({ product: "MOVE", ... })` and passes normalized `runtimeContext.sdkInput` fields into `findMintableBtcMoveRangeCandidate()`.

`useDeepVolQuote()` now receives the active market and uses `activeMarket.oracleObjectId` for both MOVE leg quotes instead of using the VolSeries oracle ID as the OracleSVI object ID. It also blocks quotes when the loaded VolSeries oracle or expiry does not match the active BTC market.

MOVE receipt preflight remains explicit and read-only until the user clicks `Run preflight`; the buy wallet prompt stays blocked unless receipt preflight passes.

### UP and DOWN

`usePrimitiveMintableStrike()` is binary-only and accepts only `"UP" | "DOWN"`. It builds product-specific runtime context, uses normalized SDK quantity, and exposes candidate diagnostics.

UP/DOWN blockers and diagnostics stay primitive-binary-specific. They must not reuse BTC MOVE range copy.

### RANGE

`usePrimitiveMintableRange()` builds product-specific runtime context and resets stale candidates on the shared runtime dependency key, including oracle object, spot, forward, tick size, min strike, and underlying asset changes.

The hook preserves existing RANGE interval diagnostics while also exposing the shared runtime diagnostic summary. RANGE preflight and wallet review remain blocked unless mintability passes.

## Diagnostics UI

`apps/deepvol-open-design/src/components/trade/TradeRuntimeDiagnostics.tsx` renders a collapsed panel in MOVE, UP/DOWN, and RANGE panels. It exposes:

- product;
- mintability status;
- preflight status;
- wallet;
- network;
- PredictManager;
- active market status/source;
- oracle ID;
- oracle object;
- expiry;
- quantity;
- anchor source;
- anchor price;
- spot;
- forward;
- tick size;
- min strike;
- Wallet DUSDC;
- PredictManager DUSDC;
- Quote mint cost;
- Expected premium;
- Create Fee;
- candidate count;
- quote passed count;
- preflight passed count;
- dominant failure;
- raw failure summary;
- missing/invalid runtime input blockers;
- candidate diagnostic rows.

## DUSDC balance separation

Wallet DUSDC and PredictManager DUSDC have different roles:

- Wallet DUSDC is a deposit/create-fee source.
- PredictManager DUSDC is mint collateral for primitive/MOVE premium.

DeepVol-33 only marks a failure as balance-specific when raw diagnostics include conservative evidence such as `balance`, `insufficient`, `deposit`, or `PredictManager DUSDC`. A non-positive quote remains a quote failure unless runtime evidence proves a balance/deposit failure.

## Why earlier tests missed this

Earlier Open Design checks were mostly structural and no-wallet smoke tests. They verified components rendered, routes mapped, buttons were hooked to execution functions, and gates were present. They did not exercise connected-wallet runtime input parity for SDK candidate helpers across wallet address, active market oracle object, expiry, anchor, tick grid, normalized quantity, and PredictManager.

DeepVol-33 adds source tests that assert the Open Design app has:

- `buildTradeRuntimeContext()`;
- normalized quantity usage in MOVE, UP/DOWN, and RANGE mintability hooks;
- runtime dependency-key resets;
- binary-only UP/DOWN mintability typing;
- shared candidate diagnostics;
- runtime diagnostics UI in every product panel;
- MOVE quotes keyed by active-market `oracleObjectId`.

## Non-actions

DeepVol-33 did not execute or authorize:

- Move package publish;
- package upgrade;
- Move contract edits;
- `create_series`;
- BTC MOVE buy;
- BTC MOVE redeem;
- UP mint;
- DOWN mint;
- RANGE mint;
- DUSDC deposit;
- withdraw;
- mainnet operations.

Connected-wallet acceptance still requires a user-controlled Testnet browser session. If mintability still fails, the expected output is exact runtime diagnostics and candidate failure evidence, not a claim of successful trading.
