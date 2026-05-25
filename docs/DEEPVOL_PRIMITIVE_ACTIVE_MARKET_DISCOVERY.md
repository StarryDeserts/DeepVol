---
Purpose: Document DeepVol primitive active BTC market discovery, stale oracle detection, and user-facing blockers.
Audience: Frontend developers, SDK implementers, protocol integrators, reviewers, and AI agents.
Status: DeepVol-16-fix adds active BTC primitive market discovery, stale/non-live oracle blocking, manual market override diagnostics, and friendly assert_live_oracle error mapping; no real primitive mint is executed by this fix.
Source of truth relationship: Extends the primitive execution policy, primitive quote/preflight contract, primitives frontend docs, protocol integration notes, and binary leg integration docs; on-chain DeepBook Predict behavior remains authoritative.
---

# DeepVol Primitive Active Market Discovery

## Summary

DeepVol-16 originally used the historical BTC oracle / expiry from prior binary and BTC MOVE validation as the primitive terminal context. A later real browser preflight showed that this market was no longer live for new primitive minting: DeepBook Predict aborted in `oracle_config::assert_live_oracle` with abort code `3`.

DeepVol-16-fix changes `/primitives?type=UP|DOWN|RANGE` to fail closed unless a selected active BTC market context is available and effectively live. The page now exposes active market discovery, `Live / Stale / Expired / Unknown` status, refresh diagnostics, manual override input, stale-oracle copy, and gate propagation into quote, preflight, wallet execution, and known-key readback.

No UP, DOWN, RANGE, BTC MOVE buy, BTC MOVE redeem, withdraw, publish, upgrade, mainnet, or private-key path is executed by this fix.

## Root cause

The blocked browser preflight used this historical validation market as if it were still mintable:

```text
oracle: 0xc746336e790db7e93a34b684fa3768f43a7c3171d0262d0f2c71dc0a2ab5fe22
expiry: 1779436800000
```

Those values remain useful historical evidence, but they must not be treated as current primitive trading defaults. Active BTC oracle, expiry, strike grid, and mintability are runtime state and remain `MUST CONFIRM AT RUNTIME` before any new primitive mint path.

## Friendly error mapping

Observed protocol abort:

```text
oracle_config::assert_live_oracle abort code 3
```

DeepVol interprets this as:

```text
assert_live_oracle::3 = stale / non-live oracle for the mint path
```

User-facing copy:

```text
This oracle is no longer live for new minting. Refresh the active BTC market before trading this primitive.
```

The SDK maps this source-known abort before showing generic `ExecutionError` / VM abort text. The UI should still keep the raw protocol failure available in diagnostics when useful, but primary action copy should tell the user to refresh/select a live active BTC market.

## Implementation map

| Layer | File | Responsibility |
|---|---|---|
| Types | `packages/types/src/deepbookPredict.ts` | Defines `PrimitiveMarketStatus`, `PrimitiveActiveMarketContext`, discovery result types, and market sources. |
| SDK discovery | `packages/sdk/src/deepbookPredict/market.ts` | Discovers active BTC oracle candidates, classifies market status, derives suggested strikes, and confirms quoteability before returning a live market. |
| SDK errors | `packages/sdk/src/deepbookPredict/errors.ts` | Maps `oracle_config::assert_live_oracle` stale/non-live aborts to friendly DeepVol copy. |
| Hook | `apps/deepvol-web/src/hooks/useActiveBtcPredictMarket.ts` | Browser controller for active market discovery, refresh, diagnostics, and manual override validation. |
| Gates | `apps/deepvol-web/src/hooks/primitiveQuoteGate.ts` | Requires selected active market status and oracle object in quote, preflight, and execution dependency keys/blockers. |
| Quote | `apps/deepvol-web/src/hooks/usePrimitiveQuote.ts` | Builds a selected-market `VolSeries` compatibility object from active market context and derives render/click-time effective status from expiry. |
| Preflight | `apps/deepvol-web/src/hooks/usePrimitivePreflight.ts` | Uses the selected active market oracle object and market status before running primitive mint preflight. |
| Execution | `apps/deepvol-web/src/hooks/usePrimitiveWalletExecution.ts` | Reuses selected oracle context, reruns fresh gates, and performs a final submit-time expiry check before wallet review. |
| Readback | `apps/deepvol-web/src/hooks/usePrimitivePositionReadback.ts` | Reads only selected active-market primitive keys; Portfolio no longer falls back to historical configured series. |
| UI | `apps/deepvol-web/src/routes/PrimitiveQuotePage.tsx` | Renders market status, refresh action, diagnostics, manual override, selected oracle/expiry details, and quote-gate effective status. |

## Active market discovery behavior

The active market flow is:

```text
Connect Sui Testnet wallet
→ Refresh active BTC market
→ load BTC oracle candidates from the official Predict read surface
→ require future expiry and live oracle state
→ derive suggested UP/DOWN/RANGE strikes
→ devInspect small UP/DOWN quote candidates
→ expose the first live quoteable market
→ feed selected oracle object / oracle ID / expiry / strikes into primitive quote, preflight, execution, and readback
```

If discovery cannot find a live quoteable market, the primitive terminal shows precise diagnostics and stays blocked instead of silently using stale historical `VolSeries` data.

## Market statuses

| Status | Meaning | Primitive action behavior |
|---|---|---|
| `Live` | Selected BTC market has a future expiry, active oracle state, and positive quoteable candidates. | Quote and preflight may proceed after wallet, Testnet, quantity, strike, and PredictManager gates pass. |
| `Stale` | Selected oracle is not active or has stale diagnostics. | Quote, preflight, and wallet execution stay blocked. |
| `Expired` | Selected expiry is at or before the current browser clock. | Quote, preflight, and wallet execution stay blocked. |
| `Unknown` | No selected market, invalid manual override, or insufficient discovery context. | Quote, preflight, and wallet execution stay blocked until refresh or valid live discovery. |

The UI renders the effective quote-gate status, not only the cached discovery status, so an idle page rolls from `Live` to `Expired` when the selected market expiry passes.

## Manual override fallback

Manual active market override exists for controlled validation when automatic discovery is unavailable. It requires a valid Sui object ID and unsigned-integer expiry/strike fields. A valid manual override remains `Unknown` by design and cannot bypass quote, preflight, or wallet execution gates.

Manual override copy:

```text
Manual overrides remain Unknown and must still pass quote/preflight gates before wallet execution.
```

Invalid override copy:

```text
Manual active market override requires an oracle object and unsigned-integer expiry/strike values.
```

## Safety boundaries

DeepVol-16-fix does not:

- execute real UP, DOWN, or RANGE primitive mints;
- execute BTC MOVE buy or redeem;
- publish or upgrade packages;
- withdraw protocol fees;
- use mainnet;
- read private keys, `.env.local`, `.trace/`, `.traces/`, raw signatures, or raw transaction bytes;
- modify Move contracts;
- modify or stage `move/deepvol/Move.toml`;
- treat historical oracle snapshots as live market configuration;
- bypass `oracle_config::assert_live_oracle`.

## Verification

Source-level coverage includes:

```bash
npm --workspace apps/deepvol-web run test:primitive-active-market
npm --workspace apps/deepvol-web run test:primitive-quote-gates
npm --workspace apps/deepvol-web run test:primitive-execution-gates
```

Full frontend readiness still requires the standard DeepVol verification suite and browser smoke. Browser smoke must confirm `/primitives?type=UP`, `/primitives?type=DOWN`, and `/primitives?type=RANGE` show the active market panel, refresh action, non-live blockers, no console errors, no accidental wallet prompt, and RANGE execution disabled.

DeepVol-16-fix follow-up browser smoke on 2026-05-24 confirmed `/markets`, `/primitives?type=UP`, `/primitives?type=DOWN`, `/primitives?type=RANGE`, `/buy/btc-move`, and `/portfolio` rendered without console warnings or errors. Primitive quote/preflight/wallet actions stayed disabled while active market/wallet gates failed, RANGE execution stayed disabled, BTC MOVE buy stayed disabled while gates failed, and Portfolio kept MOVE receipts, local primitive records, and known-key readback separated.
