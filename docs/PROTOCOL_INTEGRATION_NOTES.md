---
Purpose: Track confirmed DeepBook Predict integration values and remaining runtime details for RangePilot.
Audience: Protocol integrators, transaction-builder authors, frontend developers, and AI agents.
Status: Updated with confirmed official DeepBook Predict Testnet values.
Source of truth relationship: Deployment values in this file are confirmed for the official Testnet setup and source branch listed below; runtime market state, response schemas, and exact generated-binding call shapes still require confirmation.
---

# Protocol Integration Notes

This document records the DeepBook Predict Testnet configuration RangePilot should use for the first protocol integration spike. Confirmed deployment/config values may be copied into environment-specific config code. Runtime market state, server response schemas, and transaction behavior still require live validation before user-facing trading is considered complete.

For the detailed official-derived reference, see [DEEPBOOK_PREDICT_OFFICIAL_CONTRACT_INFO.md](./DEEPBOOK_PREDICT_OFFICIAL_CONTRACT_INFO.md). For Phase 1B wallet and Predict Account flow details, see [PREDICT_MANAGER_FLOW.md](./PREDICT_MANAGER_FLOW.md). For the Phase 1B-Verify local signer validation report, see [PREDICT_MANAGER_TESTNET_VALIDATION.md](./PREDICT_MANAGER_TESTNET_VALIDATION.md). For the Phase 1C range quote and mint validation report, see [RANGE_MINT_TESTNET_VALIDATION.md](./RANGE_MINT_TESTNET_VALIDATION.md). For the Phase 1C-fix quoteability scanner investigation, see [RANGE_QUOTEABILITY_INVESTIGATION.md](./RANGE_QUOTEABILITY_INVESTIGATION.md). For the Phase 1C-fix2 quantity, decoding, and binary quote investigation, see [RANGE_QUOTE_UNITS_AND_DECODING.md](./RANGE_QUOTE_UNITS_AND_DECODING.md). For the Phase 1C-fix3 mintability preflight and ask-bounds investigation, see [MINTABILITY_PREFLIGHT_AND_ASK_BOUNDS.md](./MINTABILITY_PREFLIGHT_AND_ASK_BOUNDS.md). For Phase 1C-debug source-level mintability analysis, see [MINTABILITY_SOURCE_ANALYSIS.md](./MINTABILITY_SOURCE_ANALYSIS.md) and [DEEPBOOK_PREDICT_MINTABILITY_DEBUG_REPORT.md](./DEEPBOOK_PREDICT_MINTABILITY_DEBUG_REPORT.md). For Phase 1D-1 portfolio readback validation, see [PORTFOLIO_READBACK_TESTNET_VALIDATION.md](./PORTFOLIO_READBACK_TESTNET_VALIDATION.md). For Phase 1D-2 redeem validation, see [RANGE_REDEEM_TESTNET_VALIDATION.md](./RANGE_REDEEM_TESTNET_VALIDATION.md). For the Phase 2A browser-wallet scaffold, see [GUIDED_RANGE_TRADING_MVP.md](./GUIDED_RANGE_TRADING_MVP.md). For Phase 2B browser scan/recovery fixes, see [BROWSER_WALLET_MANUAL_VALIDATION_FIXES.md](./BROWSER_WALLET_MANUAL_VALIDATION_FIXES.md). For Phase 3 Route B wrapper architecture and Phase 3D ProtocolVault fee custody, see [BUSINESS_MODEL.md](./BUSINESS_MODEL.md), [WRAPPER_CONTRACT_ARCHITECTURE.md](./WRAPPER_CONTRACT_ARCHITECTURE.md), [PROTOCOL_VAULT_DESIGN.md](./PROTOCOL_VAULT_DESIGN.md), [FOLLOW_STRATEGY_TRANSACTION_FLOW.md](./FOLLOW_STRATEGY_TRANSACTION_FLOW.md), [STRATEGY_DATA_MODEL.md](./STRATEGY_DATA_MODEL.md), and [ADR/0002-wrapper-internal-mint-route-b.md](./ADR/0002-wrapper-internal-mint-route-b.md). For SDK/PTB entrypoint tracking, see [ENTRYPOINT_BINDINGS_PLAN.md](./ENTRYPOINT_BINDINGS_PLAN.md).

## Confirmed official Testnet configuration

| Topic | Confirmed value | Status | Source / notes |
|---|---|---|---|
| Network | Testnet | Confirmed | Official DeepBook Predict Testnet configuration |
| Public server | `https://predict-server.testnet.mystenlabs.com` | Confirmed | Official public read server for Testnet; not a write path |
| Source branch | `predict-testnet-4-16` | Confirmed | Use this branch as the source reference for bindings/signature confirmation |
| Predict package | `0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138` | Confirmed | Store in protocol config, not UI components |
| Predict registry | `0x43af14fed5480c20ff77e2263d5f794c35b9fab7e2212903127062f4fe2a6e64` | Confirmed | Store in protocol config, not UI components |
| Predict object | `0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a` | Confirmed | Store in protocol config, not UI components |
| DUSDC coin type | `0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a::dusdc::DUSDC` | Confirmed | Quote asset for the Testnet integration spike |
| DUSDC Currency ID | `0xf3000dff421833d4bb8ed58fac146d691a3aaba2785aa1989af65a7089ca3e9c` | Confirmed | Store with quote asset config |
| DUSDC decimals | `6` | Confirmed | Matches protocol quote-asset decimal constraint |
| PLP coin type | `0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138::plp::PLP` | Confirmed | Required for later vault / LP dashboard work |

## Phase 1A public server discovery

RangePilot Phase 1A added centralized static Testnet config in code, a read-only public server client, a repeatable discovery script, and compact response-shape docs. The public server remains a read model only and must not be treated as a transaction write path.

| Topic | Phase 1A finding | Coding status | Notes |
|---|---|---|---|
| Public server availability | Required discovery endpoints returned HTTP 200 during the Phase 1A snapshot. | Confirmed snapshot; reconfirm at runtime | See [DEEPBOOK_PREDICT_PUBLIC_SERVER_DISCOVERY.md](./DEEPBOOK_PREDICT_PUBLIC_SERVER_DISCOVERY.md) and [DEEPBOOK_PREDICT_RESPONSE_SHAPES.md](./DEEPBOOK_PREDICT_RESPONSE_SHAPES.md). |
| Active oracle discovery | 5 active BTC oracles were observed. | MUST CONFIRM AT RUNTIME | Oracle IDs are runtime snapshots and must not be static protocol config. |
| Quote asset endpoint | DUSDC only was observed. | Confirmed snapshot; reconfirm before trading | Static DUSDC config remains the confirmed quote asset for the integration spike. |
| Vault summary endpoint | Balance, value, liquidity, supply, and utilization fields were available. | Confirmed snapshot; do not reimplement vault logic | Display only official/read-derived metrics in later UI. |
| Strike metadata | Oracle records exposed `min_strike` and `tick_size`. | MUST CONFIRM BEFORE CODING | Full strike-grid validation remains pending. |
| Ask bounds | Endpoint returned HTTP 200, but selected oracles returned `null`. | Diagnostic / MUST CONFIRM BEFORE CODING for final UX | Phase 1C-fix treats `null` as no observed override, not as the primary mint blocker or as mint eligibility. |
| Manager and portfolio discovery | Not covered by Phase 1A. | MUST CONFIRM BEFORE CODING | Remains in Phase 1B/1D scope. |
| Quote preview and write PTB shapes | Not validated by Phase 1A. | MUST CONFIRM BEFORE CODING | `get_range_trade_amounts`, `mint_range`, `redeem_range`, and first mint validation remain pending. |

## Phase 1B wallet and Predict Account validation

RangePilot Phase 1B adds a minimal Vite React wallet app and conservative SDK helpers for browser-wallet-only Predict Account setup. Phase 1B-Verify validated the core Sui Testnet `create_manager`, manager ID recovery, small `deposit<DUSDC>`, and known-manager public server summary readback path with a local signer. Browser wallet manual validation remains pending.

| Topic | Phase 1B status | Coding status | Notes |
|---|---|---|---|
| Wallet UI scaffold | Minimal Testnet-only dApp Kit UI exists under `apps/web`. | Scaffolded; browser manual validation pending | Browser wallet confirmation remains the product signing path; no private keys, mnemonics, or CLI signing in the browser app. |
| DUSDC wallet read | SDK paginates DUSDC coin objects and sums atomic balances with `bigint`. | Verified by local signer validation | Uses confirmed DUSDC coin type and 6 decimals. Validation address went from 550 DUSDC before first deposit to 548 DUSDC after two 1 DUSDC deposits. |
| DUSDC coin selection | SDK selects enough DUSDC coin objects for an atomic amount. | Verified by local signer validation | Does not assume a single coin object; insufficient balance returns a user-safe error. |
| PredictManager discovery | Local cache manager ID hint exists; fresh create recovery is verified; general owner discovery remains pending. | Partial / verified post-create recovery | Local cache is only a hint. `/managers/:manager_id/summary` can validate a known manager owner; `/managers` owner filtering remains pending. |
| `create_manager` PTB | SDK builds `<PREDICT_PACKAGE>::predict::create_manager` with no args. | Verified on Testnet | Transaction `DKoSBnKWZGJK6H2RV3yF4pAqSnQ3XncWFfgTsB38pf56` created manager `0x6f341e107a87812fd4fddfc4fc50a7e3ab5bc21cabff2cd39dd86b662fa75599`. |
| `PredictManagerCreated` recovery | Event and object-change recovery helper recovers a unique manager ID. | Verified on Testnet | Recovery source was `event_and_object_change`; ambiguous multiple-object cases abort before deposit. |
| `deposit<DUSDC>` PTB | SDK keeps the browser-safe default blocker but can build a gated Testnet deposit PTB with `allowRealTestnetDeposit`. | Verified on Testnet for local signer validation | Deposit transactions `DeSdTRYKpA1hGEGXSoGGEu4y8nzn8gwcbFjUAs1zRH5M` and `8pQox3ckxD9uyqaYGgzbKgeUBYMv9CrzzMxEQeKwRS1W` each deposited 1 DUSDC. |
| Manager balance read | Public server summary for a known manager ID reports owner and DUSDC balance fields. | Verified known-manager public server read path | After two deposits, `/managers/:manager_id/summary` reported `balances[0].balance = 2000000`, `trading_balance = 2000000`, and `account_value = 2000000`. Direct `balance<DUSDC>` devInspect helper remains pending. |
| Range minting | Phase 1C-debug found source-informed preflight-passing candidates and submitted the first gated Testnet `mint_range<DUSDC>`. | First range mint verified on Testnet | Phase 1C-debug inspected local source and confirmed quote prices current state while mint inserts exposure, refreshes risk, and checks post-trade ask. Targeted candidate generation found full preflight successes, and `validate:range-mint` submitted digest `3XoGAs2NgEMbkn59y9KrRGsRbicBvTN6po5gmTsoHARe` with a `RangeMinted` event. A positive quote alone remains insufficient; every future real mint must pass fresh full `mint_range<DUSDC>` preflight. See [RANGE_MINT_TESTNET_VALIDATION.md](./RANGE_MINT_TESTNET_VALIDATION.md), [RANGE_QUOTEABILITY_INVESTIGATION.md](./RANGE_QUOTEABILITY_INVESTIGATION.md), [RANGE_QUOTE_UNITS_AND_DECODING.md](./RANGE_QUOTE_UNITS_AND_DECODING.md), [MINTABILITY_PREFLIGHT_AND_ASK_BOUNDS.md](./MINTABILITY_PREFLIGHT_AND_ASK_BOUNDS.md), and [MINTABILITY_SOURCE_ANALYSIS.md](./MINTABILITY_SOURCE_ANALYSIS.md). |

## Phase 1C range quote validation

Phase 1C added a quote-only and gated mint validation script for the official range path. The script keeps active oracle, expiry, strike, and quote data as runtime values; it does not add oracle snapshots to static config. The first 2026-05-16 quote-only run confirmed the verified manager owner and `2000000` atomic DUSDC balance, selected an active BTC oracle at runtime, derived a candidate `(lower, higher]` range from public server `min_strike` and `tick_size`, and then blocked before mint because `predict::get_range_trade_amounts` devInspect aborted in `pricing_config::quote_spread_from_fair_price` with abort code `1`.

Phase 1C-fix added `npm run find:quoteable-range` and updated `npm run validate:range-quote` to scan active runtime oracles, derive spot/forward-centered strike ranges, and select the best successful quote return. From the pinned `predict-testnet-4-16` source, abort code `1` means the fair price failed `fair_price > 0 && fair_price < FLOAT_SCALING`; ask-bounds `null` is diagnostic, not the primary blocker. The scanner verified successful `(mint_cost, redeem_payout)` decoding, but the selected validation quote returned `mint=0` and `redeem=0`, so mint remains blocked by the positive-cost safety gate.

Phase 1C-fix2 added `npm run investigate:range-quote-units` and `npm run investigate:binary-quote`. The range investigation swept quantities `1`, `1000`, `10000`, `100000`, `1000000`, `5000000`, `10000000`, and `50000000` across `3136` attempts, finding the first positive range quote at `quantity=1`, `mint=1`, `redeem=0` on a `wide-around-anchor` candidate. The binary investigation devInspected `market_key::up`, `market_key::down`, and `predict::get_trade_amounts` without adding binary mint/redeem builders; all `1152` attempts succeeded, with the first nonzero binary quote at `quantity=1000`, `mint=368`, `redeem=349`.

`npm run validate:range-mint` initially reached the real Testnet mint submission path after quote safety gates passed, but transaction resolution failed before returning a digest with `MoveAbort` code `7` in `predict::assert_mintable_ask`. From pinned source, code `7` is `EAskPriceOutOfBounds`, so quote success must not authorize real mint by itself. Phase 1C-fix3 added onchain `predict::ask_bounds` investigation and full `mint_range<DUSDC>` devInspect preflight. Phase 1C-debug then added source-informed candidate generation and submitted the first gated Testnet `predict::mint_range<DUSDC>` after quote, balance, Testnet, forbidden-target, and full preflight gates passed. Digest `3XoGAs2NgEMbkn59y9KrRGsRbicBvTN6po5gmTsoHARe` emitted `RangeMinted`.

## Phase 1D-1 portfolio readback validation

Phase 1D-1 added read-only portfolio helpers and `npm run validate:portfolio-readback`. The script re-read digest `3XoGAs2NgEMbkn59y9KrRGsRbicBvTN6po5gmTsoHARe`, normalized the `RangeMinted` event, and corrected the validated event strikes to `78194000000000 / 78204000000000`. Public server manager summary and PnL reads succeeded; `/ranges/minted?manager_id=...&oracle_id=...` returned one matching mint; `/managers/:manager_id/positions/summary` returned `count=0`; `/trades/:oracle_id` returned `count=24` without a compact match for the known manager/range. Direct devInspect `predict_manager::range_position` for the event-derived `RangeKey` returned `quantity=1000` twice. Use direct `range_position` for wallet-critical active quantity for a known RangeKey, public manager summary for page diagnostics, and event/range history for activity. `redeem_range<DUSDC>` remains unexecuted.

## Phase 1D-2 range redeem validation

Phase 1D-2 added redeem transaction helpers, `RangeRedeemed` parsing, and `npm run validate:range-redeem-preflight` / `npm run validate:range-redeem`. The validation re-used the Phase 1D-1 event-derived range, confirmed direct `predict_manager::range_position` quantity `1000` before redeem, decoded `predict::get_range_trade_amounts` redeem payouts for quantities `1`, `10`, `100`, `500`, and `1000`, and ran full `predict::redeem_range<DUSDC>` devInspect preflight for each candidate. One gated Sui Testnet redeem of quantity `500` succeeded with digest `9MiZdKDwdZB2WDkv5JFJV7fj88YRvvcw6LYGxX5DeQWc`, emitted `RangeRedeemed`, increased manager DUSDC balance from `1999990` to `1999993`, and reduced direct `range_position` from `1000` to `500`. Future redeems still require fresh direct readback, quote, and full preflight gates because payout and vault state are runtime-dependent.

## Phase 2A browser-wallet MVP scaffold

Phase 2A adds minimal `/trade` and `/portfolio` browser pages around the validated Testnet lifecycle. The web app uses browser wallet approval only, never `.env.local` or local private-key signing. Validation scripts remain protocol regression tests; they are not imported into the UI. Browser mint remains gated by official quote plus fresh full `mint_range<DUSDC>` preflight, and browser redeem remains gated by fresh direct `range_position`, official quote, positive payout by default, and full `redeem_range<DUSDC>` preflight. This is an engineering scaffold, not final UI design.

## Phase 2B browser scan and portfolio recovery fixes

Phase 2B fixes manual browser validation blockers without changing protocol authority. `/trade` now runs a bounded browser scan with default limits of `120` quote attempts, `30` mint preflight attempts, and `4` oracle contexts. Quote/preflight attempts are deduped by `oracleId:expiry:lowerStrike:higherStrike:quantity`, source-informed runtime-derived candidate families are ranked before broad candidates, and the scan early-stops on the first full `mint_range<DUSDC>` preflight success. No-candidate results are scan state, not transaction failures. `EAskPriceOutOfBounds` remains a protocol preflight blocker that quote success alone cannot bypass.

`/portfolio` now recovers manager-scoped known RangeKeys from browser `RangeMinted` events, non-secret localStorage, mint transaction digest import, and public mint history hints. Manual RangeKey entry is available only under Advanced Debug and must be explicitly selected. Direct `predict_manager::range_position` remains the wallet-critical active quantity source before redeem; public server history is diagnostic/recovery-only until direct readback confirms active quantity.

## Phase 3A/B Route B wrapper architecture

Route B is selected: RangePilot adds a thin creator strategy wrapper that internally calls DeepBook Predict `predict::mint_range<DUSDC>` after validating RangePilot strategy state and collecting a separate creator/platform fee coin. The wrapper derives `RangeKey` from stored Strategy fields and emits RangePilot attribution events, while DeepBook Predict remains the authority for pricing, oracle lifecycle, vault exposure/risk, StrikeMatrix accounting, payout, settlement, and `PredictManager` position custody.

The mint cost remains paid from the user's `PredictManager` balance by DeepBook Predict. The RangePilot creator/platform fee is a separate `Coin<DUSDC>` or generic `Coin<T>` passed to the wrapper; it must not be forced out of `PredictManager` balance. Because fee transfers and `mint_range` execute in one Sui transaction, a DeepBook Predict abort rolls back fee transfers and `StrategyFollowed` emission.

The public Predict server remains a read model for discovery, history, and diagnostics. Writes must go through Sui transactions and Move entrypoints. Frontend follow flows must still run official `get_range_trade_amounts` quote preview plus full `mint_range<DUSDC>` preflight before prompting a wallet for the wrapper call.

Phase 3D replaces direct platform-recipient routing with RangePilot `ProtocolVault<T>` and `AdminCap`. The wrapper transfers creator fees to the creator, deposits platform fees into `ProtocolVault<T>`, returns any fee coin remainder to the follower, and then calls DeepBook Predict `mint_range<T>`. Confirmed policy is `platform_fee_bps = 10` and `MAX_CREATOR_FEE_BPS = 3000`; `3000 bps = 30%` and `300 bps = 3%`. Strategy objects remain shared, strategy creation remains permissionless, metadata policy is `metadata_uri`, and the Testnet/hackathon wrapper is upgradeable with upgrade authority to be disclosed before publish.

Formal wrapper dependency source: official DeepBookV3 Git dependencies for `packages/predict` and `packages/deepbook` at `predict-testnet-4-16`, with Testnet `dep-replacements` binding the deployed DeepBook Predict and DeepBook package IDs. The local third-party snapshot root `deepbookv3-predict-testnet-4-16/` is ignored and must not be committed; it is source-level debugging/reference only, not the formal Move dependency source. Official Sui docs and `DEEPBOOK_PREDICT_OFFICIAL_CONTRACT_INFO.md` remain the deployment/config source of truth. The wrapper package is unpublished, package ID is `TBD`, ProtocolVault object ID is `TBD`, AdminCap owner/publish address is `TBD`, and client builders must block unless explicit wrapper package ID and protocol vault ID are supplied.

Build status: `npm run move:build:rangepilot` passes with official DeepBookV3 Git dependencies and Testnet dep-replacements, and `npm run move:test:rangepilot` passes with 18 RangePilot tests. The current Sui CLI accepts the package scripts' `sui move build --path move/rangepilot` / `sui move test --path move/rangepilot` commands and rejects `--environment testnet`; `Move.lock` records `pinned.testnet` Git sources. The old incomplete `deepbookv3-predict-package/predict` dependency blocker and the temporary local snapshot formal dependency are superseded.

## Runtime-confirmation table

These items remain `TBD` because they depend on live server data, chain state, object layout, generated bindings, event schemas, or a real transaction attempt.

| Topic | Current value | Coding status | Confirmation source needed | Notes |
|---|---|---|---|---|
| Active oracle IDs | Phase 1C quote-only run selected runtime BTC oracle `0x7f6af68a95f01b1c2153edcb7c96475935e8b2d796a8c04f32d57e5d0a83289d` | MUST CONFIRM AT RUNTIME / MUST CONFIRM BEFORE CODING | Public server, chain state, or generated bindings | Required before selecting the first market; do not hardcode as static config. |
| Active underlying assets | Phase 1C quote-only run observed BTC for the selected active oracle | MUST CONFIRM AT RUNTIME / MUST CONFIRM BEFORE CODING | Public server or chain state | No active SUI market has been confirmed; do not hardcode until confirmed for the active Testnet deployment. |
| Expiry list | Phase 1C selected oracle expiry `1778918400000` as a runtime value | MUST CONFIRM AT RUNTIME / MUST CONFIRM BEFORE CODING | Public server or chain state | Do not hardcode until confirmed for the active Testnet deployment. |
| Strike grid | Phase 1C-fix2 scanned BTC oracles with `min_strike = 50000000000000` and `tick_size = 1000000000` | Partial / MUST CONFIRM BEFORE CODING | Public server, `OracleConfig`, generated bindings, or chain state | Candidate derivation now snaps centered, adjacent, and wide ranges to the strike grid; positive official range quotes were observed. |
| Oracle freshness | Latest price spot/forward fields are available for scanned active BTC oracles | Partial / MUST CONFIRM BEFORE CODING | Public server, events/checkpoints, direct object reads, or generated bindings | Scanner uses latest spot/forward as quote candidate anchors; final stale-market UX remains pending. |
| Ask bounds | Public endpoint returned `null` for all four active BTC oracles; onchain `predict::ask_bounds` returned `10000000 / 990000000` for each | Onchain preflight source verified for scanned runtime oracles | Public server `/oracles/:oracle_id/ask-bounds`, onchain `predict::ask_bounds`, direct object reads, or generated bindings | Public endpoint `null` is diagnostic. Full mint preflight, not quote success alone, is required before real mint because code `7` / `EAskPriceOutOfBounds` can reject post-trade ask. |
| Public server response schemas | Phase 1A snapshot documented | MUST CONFIRM AT RUNTIME | Live server responses and schema capture | Conservative TypeScript response types are in `packages/types`; final UI assumptions still require runtime confirmation. |
| PredictManager discovery strategy | Post-create event/object-change recovery is verified; known-manager public server summary validates owner; general owner discovery remains pending | Partial / MUST CONFIRM BEFORE CODING | Public server `/managers`, event scan filters, direct object ownership pattern | Local storage is not authoritative; owner query and historical event lookup remain pending. |
| Portfolio direct read strategy | Direct `predict_manager::range_position` devInspect returned `1000` twice before Phase 1D-2 redeem and `500` after redeem for the known minted RangeKey; public manager summary reports owner and balances | Verified for specific RangeKey readback; enumeration still pending | Direct devInspect, public server, events/checkpoints | Use direct `range_position` for wallet-critical active quantity for a known RangeKey. Public server positions summary returned `count=0`, so it is diagnostic only for now. Direct `balance<DUSDC>` remains pending. |
| Exact generated-binding/PTB call shapes | `create_manager`, gated `deposit<DUSDC>`, quote helpers, `range_key::new`, `mint_range<DUSDC>`, direct `range_position`, and `redeem_range<DUSDC>` have validated Testnet paths where noted | Partial / MUST CONFIRM BEFORE CODING for unvalidated writes | Pinned source branch, generated bindings, devInspect, and real Testnet transaction attempts | Supply, withdraw, settled claim behavior, and direct DUSDC balance remain unexecuted or pending. |
| First real `mint_range<DUSDC>` transaction validation | Gated Sui Testnet mint succeeded with digest `3XoGAs2NgEMbkn59y9KrRGsRbicBvTN6po5gmTsoHARe` after fresh quote, balance, Testnet, forbidden-target, and full preflight gates passed | Confirmed for current Testnet runtime state; rerun gates before future mints | Local source snapshot, onchain ask bounds, full mint preflight, Testnet transaction execution, event readback, and direct range-position readback | `RangeMinted` event was found and Phase 1D-1 direct `range_position` readback confirmed pre-redeem quantity `1000` for event-derived strikes `78194000000000 / 78204000000000`. |

## Confirmed entrypoint plan

Use the official Testnet package/config above and confirm exact generated binding call shapes from source branch `predict-testnet-4-16` before wiring code. Do not hand-write unverified Move signatures. Detailed argument tracking lives in [ENTRYPOINT_BINDINGS_PLAN.md](./ENTRYPOINT_BINDINGS_PLAN.md).

| Order | Entrypoint / helper | Product purpose | Status |
|---:|---|---|---|
| 1 | `create_manager` | Create the user-facing Predict Account | Verified on Testnet with transaction `DKoSBnKWZGJK6H2RV3yF4pAqSnQ3XncWFfgTsB38pf56`; manager ID recovery source `event_and_object_change` |
| 2 | `predict_manager::deposit<DUSDC>` | Deposit DUSDC into the Predict Account | Verified on Testnet through gated local signer validation; browser builder remains guarded until manual wallet validation |
| 3 | `predict_manager::balance<DUSDC>` | Read deposited DUSDC balance | Public server summary readback verified for known manager IDs; direct read/devInspect strategy still pending |
| 4 | `predict_manager::range_position` | Read active quantity for a specific range key | Phase 1D-1 direct devInspect read returned pre-redeem quantity `1000` twice; Phase 1D-2 post-redeem read returned `500` |
| 5 | `range_key::new` | Construct the range key for lower/upper strikes | Phase 1C-fix scanner builds spot/forward-centered ranges and successful quote devInspect returns; Phase 1D-1 and Phase 1D-2 used it for direct position readback and redeem |
| 6 | `predict::get_range_trade_amounts` | Preview official range trade amounts | Phase 1C-fix2 devInspect verified safe `(mint_cost, redeem_payout)` decoding; Phase 1D-2 decoded redeem payouts before live redeem |
| 7 | `predict::mint_range<DUSDC>` | Mint the guided range prediction | Verified on Sui Testnet through the guarded validation path with digest `3XoGAs2NgEMbkn59y9KrRGsRbicBvTN6po5gmTsoHARe`; future mints require fresh full preflight |
| 8 | `predict::redeem_range<DUSDC>` | Redeem or claim range position through official protocol path | Verified on Sui Testnet through the guarded validation path with digest `9MiZdKDwdZB2WDkv5JFJV7fj88YRvvcw6LYGxX5DeQWc`; future redeems require fresh direct readback, quote, and full preflight |
| 8 | `predict::supply<DUSDC>` | Supply DUSDC liquidity to the Predict vault | Confirmed entrypoint role; later vault/LP work, not required for core guided range MVP |
| 9 | `predict::withdraw<DUSDC>` | Withdraw DUSDC liquidity by burning PLP | Confirmed entrypoint role; later vault/LP work, not required for core guided range MVP |

## Read surfaces

Use a layered read strategy, with confirmed Testnet server first for market discovery and summaries, and direct chain reads for wallet-critical state once the object layout is confirmed.

| Read surface | Intended use | Status |
|---|---|---|
| Official public server | Markets, expiries, summaries, quote/read data, history where exposed | Base URL, manager summary, manager PnL, and range mint history paths validated where documented; positions summary empty for known mint |
| Sui events/checkpoints | History, portfolio fallback, creator stats, oracle freshness stream | `RangeMinted` and `RangeRedeemed` event readback and normalized key fields verified for known digests; broader event query strategy remains pending |
| Direct object reads | Wallet-critical state: Predict Account balance, positions, claimability | Direct `range_position` devInspect verified before and after redeem for a specific RangeKey; balance and position enumeration remain pending |
| RangePilot cache/API | Product-friendly normalization, creator metadata, optional history cache | Internal design TBD after spike |

## Quote preview policy

Allowed:

- Use `predict::get_range_trade_amounts` through confirmed bindings.
- Use the official public server if it exposes quote data needed by the UI.
- Use dry-run of official transactions if validated and safe.
- Show quote unavailable with clear UX if no reliable official path exists.

Forbidden:

- Custom SVI pricing.
- Custom vault utilization pricing.
- Custom settlement calculation.
- Custom payout engine.

## Configuration policy

Confirmed values above should be centralized in environment-specific protocol config during implementation. UI components must import config and SDK helpers rather than embedding package IDs, object IDs, coin types, or server URLs directly.

Keep runtime values out of static config until confirmed:

- active oracle IDs
- active underlying assets
- expiry list
- strike grid
- oracle freshness
- ask bounds
- user manager discovery result
- portfolio object/table layout assumptions
- public server response schemas

## Integration spike exit report

When Phase 1 completes, update or append findings with:

- Config keys/locations for the confirmed Testnet deployment values.
- Binding/source references from `predict-testnet-4-16` used for each entrypoint.
- Confirmed public server endpoints and response fields used by the app.
- Confirmed read strategy and fallbacks.
- Confirmed quote preview strategy and response mapping.
- First successful `mint_range<DUSDC>` transaction digest or blocker summary.
- Remaining blockers.
- Any ADR needed for architectural decisions.
