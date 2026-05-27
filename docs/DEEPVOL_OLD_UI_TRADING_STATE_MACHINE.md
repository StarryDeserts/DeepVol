---
Purpose: Record the old verified DeepVol UI trading state machine and the Open Design parity target.
Audience: Developers, product contributors, reviewers, and AI agents.
Status: DeepVol-34 extracts the verified `apps/deepvol-web` trading sequence and rewires `apps/deepvol-open-design` to use the same gate order.
Source of truth relationship: Companion to DEEPVOL_OPEN_DESIGN_REWRITE_APP.md and DEEPVOL_FRONTEND_MVP.md; this captures frontend state-machine parity, not protocol contract behavior.
---

# DeepVol Old UI Trading State Machine

DeepVol-34 treats the old `apps/deepvol-web` app as the verified functional state-machine reference and the standalone Open Design app as the view layer. The Open Design UI must preserve the old hook/gate sequence instead of quoting from visual fallback fields.

No Move contracts were changed. Claude Code did not execute `publish`, `upgrade`, `create_series`, BTC MOVE buy/redeem, UP mint, DOWN mint, RANGE mint, DUSDC deposit, withdraw, or mainnet operations while documenting this parity target.

## MOVE

Canonical order:

```text
active market -> mintable range -> VolSeries -> quote -> preflight -> wallet
```

Required inputs:

- connected Sui Testnet wallet;
- wallet-owned PredictManager;
- active BTC primitive market with live status;
- active market `oracleId`, `oracleObjectId`, `expiry`, `spot` or `forward`, tick size, and minimum strike;
- positive integer quantity;
- DUSDC wallet coin for DeepVol Create Fee;
- PredictManager DUSDC balance for underlying primitive premium;
- VolSeries matching active `oracleId`, active `expiry`, lower/upper range, and recent mintability record.

Hook order:

1. `usePredictManagerSession` recovers or creates the wallet-scoped PredictManager.
2. `useActiveBtcPredictMarket` discovers the live BTC market.
3. `useBtcMoveMintableRange` finds a range whose UP and DOWN legs quote and preflight as mintable.
4. `useCreateVolSeries` creates/selects a VolSeries only after mintability passes.
5. `useActiveBtcMoveSeries` validates selected VolSeries against active market and recent mintability.
6. `useDeepVolQuote` quotes only the validated VolSeries.
7. `useDeepVolPreflight` runs `buy_move_receipt<DUSDC>` browser preflight.
8. `useBuyMoveReceipt` re-runs preflight before wallet review and submits only after gates pass.

Button order:

1. Generate / validate mintable MOVE range.
2. Create or select VolSeries for that validated range.
3. Refresh quote.
4. Run buy receipt preflight.
5. Submit wallet transaction.

Gate conditions:

- Quote is blocked until a validated current VolSeries is ready.
- Preflight is blocked until quote has positive UP/DOWN leg costs, Create Fee is computed, a wallet DUSDC fee coin is available, and PredictManager is present.
- Wallet submit is blocked until buy receipt preflight has passed with the current dependency key.

Quote/preflight inputs:

- Quote uses active market `oracleObjectId`, VolSeries `oracleId`, VolSeries `expiry`, VolSeries upper strike for UP, VolSeries lower strike for DOWN, and normalized quantity.
- Preflight uses the same series and quote outputs plus fee coin, PredictManager, ProtocolVault, and DUSDC coin type.

Success persistence:

- MOVE mintability pass is stored as a short-lived local record keyed by oracle, expiry, lower/upper, quantity, PredictManager, DUSDC, DeepVol package, and Predict package.
- Created VolSeries ID is stored locally and attached to the mintability record.
- Successful buy stores a local MoveReceipt reference for Portfolio display.

## UP

Canonical order:

```text
active market -> mintable strike -> quote -> preflight -> wallet
```

Required inputs:

- connected Sui Testnet wallet;
- wallet-owned PredictManager;
- live active BTC market with `oracleId`, `oracleObjectId`, `expiry`, anchor price, tick size, and minimum strike;
- positive integer quantity;
- passed UP mintable strike candidate;
- PredictManager DUSDC balance covering the primitive mint cost.

Hook order:

1. PredictManager session.
2. Active BTC market discovery.
3. `usePrimitiveMintableStrike` with `primitiveKind: "UP"`.
4. `usePrimitiveQuote` using only the passed candidate strike.
5. `usePrimitivePreflight` with `primitiveMintabilityStatus`.
6. `usePrimitiveWalletExecution` with the same status and quote/preflight dependency keys.

Button order:

1. Generate mintable strike.
2. Refresh quote.
3. Run preflight.
4. Submit wallet transaction.

Gate conditions:

- Quote uses the candidate strike only after mintability passes.
- Preflight is blocked unless UP mintability status is `passed` and quote is ready.
- Wallet submit re-runs quote, manager balance, and mint preflight before wallet review.

Quote/preflight inputs:

- Direction is `up`.
- Strike is the passed mintability candidate strike.
- Oracle ID, oracle object, expiry, and quantity come from the active market and normalized UI quantity.

Success persistence:

- Successful UP mint stores a primitive local record with wallet, PredictManager, oracle, expiry, strike, quantity, mint cost, redeem payout, digest, and readback position key.

## DOWN

Canonical order:

```text
active market -> mintable strike -> quote -> preflight -> wallet
```

DOWN is the same state machine as UP, with `primitiveKind: "DOWN"` and direction `down`. The selected strike must be the passed DOWN mintability candidate, not MOVE range state or arbitrary UI fallback input.

## RANGE

Canonical order:

```text
active market -> mintable interval -> quote -> preflight -> wallet
```

Required inputs:

- connected Sui Testnet wallet;
- wallet-owned PredictManager;
- live active BTC market with `oracleId`, `oracleObjectId`, `expiry`, anchor price, tick size, and minimum strike;
- positive integer quantity;
- passed RANGE interval candidate with lower and higher strikes;
- PredictManager DUSDC balance covering the RANGE mint cost.

Hook order:

1. PredictManager session.
2. Active BTC market discovery.
3. `usePrimitiveMintableRange` searches candidate intervals and records diagnostics.
4. `usePrimitiveQuote` uses only the passed lower/higher candidate interval.
5. `usePrimitivePreflight` with `rangeMintabilityStatus`.
6. `usePrimitiveWalletExecution` with the same status and quote/preflight dependency keys.

Button order:

1. Generate mintable RANGE interval.
2. Refresh quote.
3. Run RANGE preflight.
4. Submit wallet transaction.

Gate conditions:

- Quote and preflight must not use arbitrary lower/upper UI fallback fields after candidate search failed.
- Preflight is blocked unless RANGE mintability status is `passed` and quote is ready.
- Wallet submit re-runs RANGE quote, manager balance, and mint preflight before wallet review.

Quote/preflight inputs:

- Lower/higher strikes are the passed RANGE candidate interval.
- Oracle ID, oracle object, expiry, and quantity come from the active market and normalized UI quantity.

Success persistence:

- Successful RANGE mint stores a primitive local record with wallet, PredictManager, oracle, expiry, lower/upper, quantity, mint cost, redeem payout, digest, and readback position key.

## Open Design parity rules

- The new UI can seed visual input fields from suggested strikes, but quote/preflight inputs must come from validated state-machine outputs.
- MOVE quote waits for a ready validated VolSeries, not any stored/stale series ID.
- UP/DOWN quote waits for a passed mintable strike candidate.
- RANGE quote waits for a passed mintable interval candidate.
- Product contexts stay isolated: UP/DOWN never use MOVE blocker copy, and RANGE uses RANGE-specific mintability/preflight copy.
- Non-positive quote diagnostics are quote economics; insufficient wallet DUSDC and insufficient PredictManager DUSDC are separate funding diagnostics.
- Connected-wallet acceptance still requires user verification; Claude Code must not approve wallet prompts.
