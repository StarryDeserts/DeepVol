# Active BTC MOVE VolSeries

## Overview

A **VolSeries** is DeepVol's on-chain product series object. It is **not** a DeepBook Predict object. Predict provides oracle / mint / redeem; VolSeries binds an active BTC oracle + expiry + lower/upper strike range into a BTC MOVE product.

## Ownership

- VolSeries is a **shared object** on Sui (created via `transfer::share_object`).
- `buy_move_receipt` takes `series: &VolSeries` (immutable reference) — any wallet can buy against an active series.
- `deactivate_series` requires `sender == series.creator` — only the creator can deactivate.

## Creation

`create_series` in `move/deepvol/sources/series.move` is **permissionless** (`public entry`, no AdminCap required).

Parameters:
- `oracle_id: ID` — the Predict oracle object
- `expiry: u64` — must be in the future
- `lower_strike: u64` — must be < upper_strike
- `upper_strike: u64`
- `create_fee_bps: u64` — must be <= 100
- `metadata_uri: vector<u8>` — must be non-empty
- `clock: &Clock`
- `ctx: &mut TxContext`

The SDK builder `buildCreateVolSeriesTransaction` in `packages/sdk/src/deepVol/transactions.ts` wraps this with typed parameters.

## Lifecycle

1. **Active BTC market discovered** — `useActiveBtcPredictMarket` finds a live oracle with future expiry.
2. **Mintable range found** — `useBtcMoveMintableRange` searches wider tick-aligned lower/upper candidates, quotes UP at the upper strike and DOWN at the lower strike, then devInspects both binary mints.
3. **VolSeries checked** — `useActiveBtcMoveSeries` compares the selected series's oracle/expiry against the active market and requires recent mintability validation.
4. **If ready** — status is `Ready`, BTC MOVE quote/preflight/buy are enabled.
5. **If validation required** — oracle/expiry/strikes match, but no recent mintability pass exists. Quote/preflight/buy stay gated.
6. **If non-mintable** — the dependency key has a failed mintability record, including `assert_mintable_ask::7`. Quote/preflight/buy stay gated.
7. **If stale** — oracle/expiry mismatch, deactivated, expired, or invalid strike ordering. Buy is gated.
8. **If missing** — no series selected. User can regenerate a mintable range, then create one via the "Create BTC MOVE Series" CTA.
9. **After creation** — new series ID is stored in localStorage (`deepvol:created-series`), attached to the validation record, and auto-selected.

## DeepVol-18 no-fallback buy gate

The Buy page must not fall back to `CONFIGURED_BTC_MOVE_SERIES_ID` when `useActiveBtcMoveSeries` reports `missing`, `stale`, `loading`, or `idle`.

For new BTC MOVE buys:

1. `useActiveBtcPredictMarket` discovers the current active BTC market.
2. `useActiveBtcMoveSeries` confirms the selected VolSeries matches that active market.
3. `BuyMovePage` passes a series ID into quote/preflight only when `MoveSeriesStatus` is `ready`.
4. Quote, receipt preflight, and wallet review all stay blocked when the active series is missing or stale.

The historical configured VolSeries remains a validation/reference value and may still support old receipt display. It is not a live default for new buys.

## MoveSeriesStatus

| Status | Meaning |
|--------|---------|
| `ready` | Series matches active market, is active, unexpired, has valid strikes, and has recent passed mintability validation |
| `validationRequired` | Series structurally matches the active market but has no recent mintability validation |
| `nonMintable` | The current validation key has a failed mintability record, including `assert_mintable_ask::7` |
| `stale` | Oracle/expiry mismatch, deactivated, expired, or lower >= upper |
| `missing` | No series selected or could not load from chain |
| `loading` | Reading VolSeries from Sui Testnet |
| `idle` | No active BTC market yet |

## Old Receipts

Old VolSeries remain valid for historical receipts. Active market refresh does **not** mutate or hide old VolSeries. Portfolio displays old receipts regardless of whether their series matches the current active market.

- Historical receipts use old VolSeries for display / redeem / settlement.
- New BTC MOVE buys require a fresh series matching the current active market.

## Suggested Range

Active market discovery can suggest initial lower/upper strikes, but those suggestions are not sufficient to authorize `create_series`. DeepVol-18-fix-2 adds a mintable candidate search that uses `forward || spot`, snaps to `tick_size`, tries wider multipliers `[10, 20, 50, 100, 200, 500]`, respects `minStrike`, quotes UP at `upper`, quotes DOWN at `lower`, and devInspects both binary mints before selecting a range.

## Frontend Hooks

- `useBtcMoveMintableRange` — browser-safe mintable range search and dependency-keyed validation recording
- `useActiveBtcMoveSeries` — series detection and status derivation, including `validationRequired` and `nonMintable`
- `useCreateVolSeries` — wallet execution for `create_series`, gated by matching mintability validation
- `useDeepVolQuote` — accepts a selected active `seriesId` parameter and blocks when it is missing

## localStorage

Key: `deepvol:created-series`
Value: `{ "seriesId": "0x..." }`

Stored when a series is created via wallet or manually selected. Loaded on page mount.

Key: `deepvol:move-series-mintability`
Value: dependency-keyed validation record with `passedAtMs` or `failedAtMs`, optional `seriesId`, friendly message, and raw advanced detail.

Mintability records are timestamped and scoped to oracle, expiry, lower, upper, quantity, PredictManager, quote asset, and package/config IDs. They are not unconditional readiness flags.
