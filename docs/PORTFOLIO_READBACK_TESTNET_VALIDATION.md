---
Purpose: Record Phase 1D-1 portfolio and range-position readback validation for the first DeepBook Predict range mint.
Audience: Protocol integrators, SDK implementers, frontend developers, reviewers, and AI agents.
Status: Updated after Phase 1D-1 Testnet readback validation on 2026-05-17.
Source of truth relationship: Validation supplement; official deployment/config docs remain source of truth for static Testnet values.
---

# Portfolio Readback Testnet Validation

Phase 1D-1 validated read-only portfolio/range-position readback for the first successful DeepBook Predict range mint. No `mint_range`, `redeem_range`, `supply`, `withdraw`, `deposit`, `create_manager`, transaction signing, or transaction submission was executed in this phase.

Phase 1D-2 later redeemed `500` from this range through one gated Sui Testnet `predict::redeem_range<DUSDC>` transaction. The Phase 1D-1 active quantity `1000` is now historical for the known RangeKey; the current direct `range_position` after redeem is `500`. See [RANGE_REDEEM_TESTNET_VALIDATION.md](./RANGE_REDEEM_TESTNET_VALIDATION.md).

No private key, `.env.local` contents, `.local/` cache contents, `.claude/` contents, or local source snapshot contents are documented here.

## Known mint facts

| Field | Value |
|---|---|
| Test date | 2026-05-17 |
| Network | Sui Testnet |
| Public server | `https://predict-server.testnet.mystenlabs.com` |
| Validation command | `npm run validate:portfolio-readback` |
| Digest | `3XoGAs2NgEMbkn59y9KrRGsRbicBvTN6po5gmTsoHARe` |
| Explorer URL | `https://suiexplorer.com/txblock/3XoGAs2NgEMbkn59y9KrRGsRbicBvTN6po5gmTsoHARe?network=testnet` |
| Manager ID | `0x6f341e107a87812fd4fddfc4fc50a7e3ab5bc21cabff2cd39dd86b662fa75599` |
| Trader / devInspect sender | `0xc558e37d20405a9751c81124ac8d167e2b2d368b834319adafa549449e0715f5` |
| Oracle ID | `0xe66aabab334efda1e9650d0ad26557bcfb28fa6012e267ec3bf7cdc71ff59084` |
| Underlying | BTC |
| Expiry | `1779004800000` |
| Lower strike | `78194000000000` |
| Higher strike | `78204000000000` |
| Quantity | `1000` |
| Mint cost | `10` atomic DUSDC |

The Phase 1D-1 script first used earlier planning notes that expected lower/higher strikes `78321000000000 / 78331000000000`. Re-reading the known digest showed the onchain `RangeMinted` event contains `78194000000000 / 78204000000000`, so the script and docs now use the event-derived values as authoritative for this digest.

## Public server readback

| Read path | Result | Status | Notes |
|---|---|---|---|
| `/managers/:manager_id/summary` | Top-level keys: `manager_id`, `owner`, `balances`, `trading_balance`, `open_exposure`, `redeemable_value`, `realized_pnl`, `unrealized_pnl`, `account_value`, `open_positions`, `awaiting_settlement_positions` | Available | Useful for manager owner, balances, and page summary diagnostics. |
| `/managers/:manager_id/positions/summary` | `count=0` | Empty | Does not currently prove the active range position for this manager/range. Treat as diagnostic only. |
| `/managers/:manager_id/pnl?range=ALL` | Top-level keys: `manager_id`, `range`, `series_type`, `points`, `current_unrealized_pnl`, `current_total_pnl` | Available | Useful for PnL diagnostics; not a range-position quantity proof. |
| `/ranges/minted?manager_id=...&oracle_id=...` | `count=1`, matching record found | Verified | Confirms public server range mint history can find the known mint with current query params. |
| `/trades/:oracle_id` | `count=24`, matching record not found by compact field scan | Available | Useful as oracle trade history diagnostics, but not relied on for the known manager/range proof. |

## Event readback

The validation script re-read the known digest with `showEvents: true` and parsed the `RangeMinted` event. Normalized fields matched the manager, oracle, expiry, lower strike, higher strike, quantity, and cost listed above.

Event readback status: verified.

## Direct range-position readback

The validation script built a read-only PTB containing:

1. `range_key::new(oracle_id, expiry, lower_strike, higher_strike)`.
2. `predict_manager::range_position(&PredictManager, RangeKey)`.

It submitted the PTB through `devInspectTransactionBlock` only. The script rejects forbidden write targets before direct readback.

| Check | Result |
|---|---|
| Direct range_position read #1 | `quantity=1000` before Phase 1D-2 redeem |
| Direct range_position read #2 | `quantity=1000` before Phase 1D-2 redeem |
| Repeated-read stability | Passed |
| Phase 1D-2 post-redeem direct range_position | `quantity=500` |
| Direct DUSDC balance helper | Not implemented in this phase; public server summary remains the validated manager-balance read path. |

Direct/devInspect range-position status: verified for this known manager and `RangeKey`.

## Recommended portfolio read strategy

- Primary wallet-critical active quantity: direct devInspect `predict_manager::range_position` for a specific `PredictManager` and `RangeKey`.
- Primary page summary diagnostics: public server `/managers/:manager_id/summary`.
- Secondary activity/history: known digest and normalized `RangeMinted` / future `RangeRedeemed` events.
- Public server positions/history endpoints: use `/ranges/minted` as a verified history accelerator for this manager/oracle; keep `/managers/:manager_id/positions/summary`, `/managers/:manager_id/pnl?range=ALL`, and `/trades/:oracle_id` diagnostic until indexing shape and matching semantics are validated for broader portfolio views.

## Limitations and blockers

- General manager discovery by owner remains pending; known manager IDs can be validated through manager summary.
- `predict_manager::balance<DUSDC>` direct devInspect remains pending; manager balance is currently read from public server summary for known managers.
- The validated direct `range_position` helper confirms a specific `RangeKey`; it does not enumerate all range positions by itself.
- `/managers/:manager_id/positions/summary` returned empty for the known active minted range in this run.
- `/trades/:oracle_id` returned records, but the compact match scan did not identify the known manager/range mint; do not use it as the wallet-critical portfolio source.
- Phase 1D-2 executed one gated `redeem_range<DUSDC>` for this known RangeKey; settled-range claim behavior remains pending.

## Browser manual testing checklist

- [ ] Open `apps/web` locally.
- [ ] Connect browser wallet.
- [ ] Confirm Testnet.
- [ ] Load known manager ID.
- [ ] Confirm DUSDC manager balance from public server summary.
- [ ] Confirm the minted BTC range appears through a direct readback path or display the known public-server positions-summary limitation.
- [ ] Confirm `RangeMinted` digest link opens in Sui Explorer.
- [ ] Confirm no private key is used by the browser app.

## Next step

Plan the Phase 2 guided range trading MVP around the validated deposit, mint, direct portfolio readback, live redeem, and post-redeem direct readback lifecycle while keeping direct `range_position` as the wallet-critical active quantity source.
