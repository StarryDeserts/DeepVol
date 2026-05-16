---
Purpose: Share-safe Phase 1C-debug report for DeepBook Predict range mintability blockers.
Audience: DeepBook team, protocol integrators, transaction-builder authors, reviewers, and AI agents.
Status: Updated with Phase 1C-debug targeted scanner and analyzer output from 2026-05-17; refresh after any real mint validation before sharing externally.
Source of truth relationship: Debugging supplement; official deployment/config docs remain source of truth for static Testnet values.
---

# DeepBook Predict Mintability Debug Report

No private key, `.env.local` contents, `.local/` cache contents, decoded secret bytes, mnemonics, tokens, or raw secret material are included in this report.

Source inspected from local snapshot:
`deepbookv3-predict-package/predict`

Local source snapshot used for debugging; official docs remain deployment/config source of truth.

## Environment

| Field | Value |
|---|---|
| Network | Sui Testnet |
| Public server | `https://predict-server.testnet.mystenlabs.com` |
| Source branch reference | `predict-testnet-4-16` |
| Predict package ID | `0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138` |
| Predict object ID | `0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a` |
| Manager ID | `0x6f341e107a87812fd4fddfc4fc50a7e3ab5bc21cabff2cd39dd86b662fa75599` |
| Manager owner public address | `0xc558e37d20405a9751c81124ac8d167e2b2d368b834319adafa549449e0715f5` |
| DUSDC coin type | `0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a::dusdc::DUSDC` |
| Manager DUSDC balance observed before Phase 1C-debug | `2000000` atomic DUSDC |

## Ask bounds result

Phase 1C-fix3 observed the public endpoint `/oracles/:oracle_id/ask-bounds` returning `null` for four active runtime BTC oracles.

Onchain `predict::ask_bounds(predict, oracle_id)` devInspect succeeded for the same active runtime BTC oracle set and decoded:

```text
min_ask = 10000000
max_ask = 990000000
```

The Phase 1C-debug scripts continue to fetch active oracle IDs and ask bounds at runtime. Do not treat the previously observed oracle IDs as static config.

## Source-level finding

`predict::get_range_trade_amounts` prices the current state by calling `range_trade_prices`, then returns `math::mul(ask, quantity)` and `math::mul(bid, quantity)`.

`predict::mint_range<DUSDC>` inserts the range exposure first, refreshes oracle risk, recomputes range trade prices, and then calls `assert_mintable_ask` on the post-trade ask:

```text
insert_range -> refresh_oracle_risk -> range_trade_prices -> assert_mintable_ask
```

Therefore positive quote candidates can fail full mint preflight if the post-insert, post-risk-refresh ask is outside resolved ask bounds.

## Candidate scan summary

Previous Phase 1C-fix3 scan:

```text
derived candidates: 390
quote candidates tested: 120
quote attempts: 960
full mint_range preflight attempts: 40
preflight successes: 0
code 7 / EAskPriceOutOfBounds: 29
other aborts: 11
real mint executed: no
```

Phase 1C-debug added source-informed families to avoid blindly expanding the scan:

- `wide_around_forward`
- `wide_around_spot`
- `forward_below_to_above`
- `forward_centered_target_width`
- `target_fair_price_5pct`
- `target_fair_price_10pct`
- `target_fair_price_25pct`
- `target_fair_price_50pct`
- `target_fair_price_75pct`
- `target_fair_price_90pct`
- `safe_larger_quantity_probe`

Fresh `npm run find:mintable-range` output:

```text
derived candidates: 566
quote candidates tested: 120
quote attempts: 960
quote successes: 936
full mint_range preflight attempts: 40
preflight successes: 32
code 7 / EAskPriceOutOfBounds: 6
other preflight failures: 2
best mintable candidate: oracle=0xe66aabab334efda1e9650d0ad26557bcfb28fa6012e267ec3bf7cdc71ff59084 quantity=1000 mint=10 redeem=0 lower=78321000000000 higher=78331000000000 family=forward_centered_target_width
```

Fresh `npm run analyze:mint-preflight-aborts` output, with refreshed live prices, found `32` preflight successes out of `40` attempts and grouped remaining aborts as `predict::assert_mintable_ask::7::EAskPriceOutOfBounds = 5` and `vault::set_mtm_with_curve::unknown::unknown = 3`.

## Positive quote examples

Phase 1C-fix2 and Phase 1C-fix3 found positive official range quotes with `mint_cost > 0`, including small-cost candidates under the 5 DUSDC cap. Phase 1C-debug found source-informed candidates that also pass full mint preflight.

Representative preflight-success examples from `npm run find:mintable-range`:

```text
oracle=0xe66aabab334efda1e9650d0ad26557bcfb28fa6012e267ec3bf7cdc71ff59084 expiry=1779004800000 lower=78321000000000 higher=78331000000000 quantity=1000 mint=10 redeem=0 family=forward_centered_target_width
oracle=0xc746336e790db7e93a34b684fa3768f43a7c3171d0262d0f2c71dc0a2ab5fe22 expiry=1779436800000 lower=78221000000000 higher=78271000000000 quantity=1000 mint=10 redeem=0 family=forward_below_to_above
oracle=0x57ab16e132ef0083085d1bdef7ed820892a4d574155f47a3cba168dcb43deb79 expiry=1780041600000 lower=78119000000000 higher=78369000000000 quantity=1000 mint=22 redeem=12 family=forward_centered_target_width
```

These are runtime artifacts and must not be copied into static config.

## Mint preflight abort summary

Current source-derived classifier maps aborts by module/function/code/constant. The most important class is:

```text
predict::assert_mintable_ask::7::EAskPriceOutOfBounds
```

Likely cause:

```text
Post-trade ask price was outside resolved ask bounds after mint_range inserted range exposure and refreshed oracle risk.
```

Fresh non-code-7 class observed by `npm run analyze:mint-preflight-aborts`:

```text
vault::set_mtm_with_curve::unknown::unknown = 3
```

The observed abort message did not expose an abort code, so the exact source constant remains unknown rather than guessed.

## Ask-side inference limitation

The exact failing post-trade `ask_price` is not exposed by the failed preflight return, and `RangeMinted.ask_price` is only available after a successful mint. RangePilot therefore reports below-min / above-max / unknown as inference only.

If the pre-trade quote cost is inside resolved ask-bound cost thresholds, the current analyzer reports `unknown` because the mint path recomputes the ask after exposure insertion and risk refresh.

## Open questions for the DeepBook team

1. Is `get_range_trade_amounts` intended to be only a current-state preview while `mint_range` charges against post-insert exposure?
2. Is there an intended public or devInspect-readable way to preview the exact post-trade `ask_price` that `mint_range` will pass into `assert_mintable_ask`?
3. Are Testnet default ask bounds `10000000 / 990000000` expected for the active BTC oracles whose public endpoint returns `null`?
4. For small positive quotes that fail code `7`, is the expected remedy to choose different range families/quantities, or is a protocol/server-side quote endpoint expected to model post-trade ask before mint?
5. Which non-code-7 abort classes from the analyzer output should integrators treat as candidate-selection errors versus deployment/config issues?

## Successful mint validation

`npm run validate:range-mint` selected a fresh runtime candidate that passed full preflight and submitted one gated Sui Testnet mint.

```text
oracle=0xe66aabab334efda1e9650d0ad26557bcfb28fa6012e267ec3bf7cdc71ff59084
expiry=1779004800000
lower=78194000000000
higher=78204000000000
quantity=1000
mint_cost=10 atomic DUSDC
digest=3XoGAs2NgEMbkn59y9KrRGsRbicBvTN6po5gmTsoHARe
RangeMinted event=found
```

## Share status

Ready to share with DeepBook team: yes.

Fresh `find:mintable-range` and `analyze:mint-preflight-aborts` verification found full preflight successes, and `npm run validate:range-mint` submitted one successful gated Sui Testnet mint:

```text
digest: 3XoGAs2NgEMbkn59y9KrRGsRbicBvTN6po5gmTsoHARe
RangeMinted event: found
manager summary readback: succeeded
positions summary readback: object with no top-level keys
```

The practical integration blocker is no longer first mint execution; the next open item is robust portfolio/range-position readback.
