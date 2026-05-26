---
Purpose: Track confirmed DeepBook Predict integration values and remaining runtime details for RangePilot.
Audience: Protocol integrators, transaction-builder authors, frontend developers, and AI agents.
Status: DeepVol-23 records UP/DOWN primitive Testnet validation success; see DEEPVOL_PRIMITIVE_UP_DOWN_VALIDATION.md. RANGE pending. DeepVol-21 adds mintable strike candidate search and primitive mintability gate for UP/DOWN execution. Updated for DeepVol-20: fresh BTC MOVE buy validated with active VolSeries. create_series is permissionless but not mintability proof. Fresh BTC MOVE VolSeries creation and buy readiness require mintable range validation. See DEEPVOL_ACTIVE_MOVE_SERIES.md, DEEPVOL_MINTABLE_MOVE_RANGE.md, and DEEPVOL_FRESH_MOVE_BUY_VALIDATION.md.
Source of truth relationship: Deployment values in this file are confirmed for the official Testnet setup and source branch listed below; runtime market state, response schemas, and exact generated-binding call shapes still require confirmation.
---

# Protocol Integration Notes

This document records the DeepBook Predict Testnet configuration the project should use for integration work. DeepVol BTC MOVE is now the primary product direction; RangePilot range and wrapper validations remain preserved evidence. Confirmed deployment/config values may be copied into environment-specific config code. Runtime market state, server response schemas, and transaction behavior still require live validation before user-facing trading is considered complete.

For DeepVol direction and binary-leg requirements, see [DEEPVOL_PRODUCT_DIRECTION.md](./DEEPVOL_PRODUCT_DIRECTION.md), [DEEPVOL_PRIMITIVES_AND_RECEIPTS.md](./DEEPVOL_PRIMITIVES_AND_RECEIPTS.md), [DEEPVOL_MVP_SCOPE.md](./DEEPVOL_MVP_SCOPE.md), [DEEPVOL_PRIMITIVE_EXECUTION_POLICY.md](./DEEPVOL_PRIMITIVE_EXECUTION_POLICY.md), [DEEPVOL_PREDICT_PRIMITIVES_FRONTEND.md](./DEEPVOL_PREDICT_PRIMITIVES_FRONTEND.md), [DEEPVOL_PRIMITIVE_QUOTE_PREFLIGHT.md](./DEEPVOL_PRIMITIVE_QUOTE_PREFLIGHT.md), [DEEPVOL_PRIMITIVE_ACTIVE_MARKET_DISCOVERY.md](./DEEPVOL_PRIMITIVE_ACTIVE_MARKET_DISCOVERY.md), [DEEPVOL_PRIMITIVE_EXECUTION_VALIDATION.md](./DEEPVOL_PRIMITIVE_EXECUTION_VALIDATION.md), [DEEPVOL_ACTIVE_MOVE_SERIES.md](./DEEPVOL_ACTIVE_MOVE_SERIES.md), [DEEPVOL_MINTABLE_MOVE_RANGE.md](./DEEPVOL_MINTABLE_MOVE_RANGE.md), [DEEPVOL_FRONTEND_MVP.md](./DEEPVOL_FRONTEND_MVP.md), [DEEPVOL_BROWSER_BUY_VALIDATION.md](./DEEPVOL_BROWSER_BUY_VALIDATION.md), [DEEPVOL_REDEEM_AND_SETTLEMENT_FLOW.md](./DEEPVOL_REDEEM_AND_SETTLEMENT_FLOW.md), [DEEPVOL_REDEEM_PREFLIGHT_VALIDATION.md](./DEEPVOL_REDEEM_PREFLIGHT_VALIDATION.md), [DEEPVOL_BROWSER_REDEEM_VALIDATION.md](./DEEPVOL_BROWSER_REDEEM_VALIDATION.md), [DEEPVOL_PROTOCOL_ARCHITECTURE.md](./DEEPVOL_PROTOCOL_ARCHITECTURE.md), [DEEPVOL_MOVE_RECEIPT_CONTRACT.md](./DEEPVOL_MOVE_RECEIPT_CONTRACT.md), [DEEPVOL_CONTRACT_BUILD_VALIDATION.md](./DEEPVOL_CONTRACT_BUILD_VALIDATION.md), [DEEPVOL_BINARY_LEG_INTEGRATION.md](./DEEPVOL_BINARY_LEG_INTEGRATION.md), [DEEPVOL_BINARY_MINT_TESTNET_VALIDATION.md](./DEEPVOL_BINARY_MINT_TESTNET_VALIDATION.md), [DEEPVOL_TESTNET_PUBLISH_RESULT.md](./DEEPVOL_TESTNET_PUBLISH_RESULT.md), [DEEPVOL_BUY_MOVE_RECEIPT_TESTNET_VALIDATION.md](./DEEPVOL_BUY_MOVE_RECEIPT_TESTNET_VALIDATION.md), and [ADR/0003-pivot-to-deepvol-btc-move.md](./ADR/0003-pivot-to-deepvol-btc-move.md).

For the detailed official-derived reference, see [DEEPBOOK_PREDICT_OFFICIAL_CONTRACT_INFO.md](./DEEPBOOK_PREDICT_OFFICIAL_CONTRACT_INFO.md). For Phase 1B wallet and Predict Account flow details, see [PREDICT_MANAGER_FLOW.md](./PREDICT_MANAGER_FLOW.md). For the Phase 1B-Verify local signer validation report, see [PREDICT_MANAGER_TESTNET_VALIDATION.md](./PREDICT_MANAGER_TESTNET_VALIDATION.md). For the Phase 1C range quote and mint validation report, see [RANGE_MINT_TESTNET_VALIDATION.md](./RANGE_MINT_TESTNET_VALIDATION.md). For the Phase 1C-fix quoteability scanner investigation, see [RANGE_QUOTEABILITY_INVESTIGATION.md](./RANGE_QUOTEABILITY_INVESTIGATION.md). For the Phase 1C-fix2 quantity, decoding, and binary quote investigation, see [RANGE_QUOTE_UNITS_AND_DECODING.md](./RANGE_QUOTE_UNITS_AND_DECODING.md). For the Phase 1C-fix3 mintability preflight and ask-bounds investigation, see [MINTABILITY_PREFLIGHT_AND_ASK_BOUNDS.md](./MINTABILITY_PREFLIGHT_AND_ASK_BOUNDS.md). For Phase 1C-debug source-level mintability analysis, see [MINTABILITY_SOURCE_ANALYSIS.md](./MINTABILITY_SOURCE_ANALYSIS.md) and [DEEPBOOK_PREDICT_MINTABILITY_DEBUG_REPORT.md](./DEEPBOOK_PREDICT_MINTABILITY_DEBUG_REPORT.md). For Phase 1D-1 portfolio readback validation, see [PORTFOLIO_READBACK_TESTNET_VALIDATION.md](./PORTFOLIO_READBACK_TESTNET_VALIDATION.md). For Phase 1D-2 redeem validation, see [RANGE_REDEEM_TESTNET_VALIDATION.md](./RANGE_REDEEM_TESTNET_VALIDATION.md). For the Phase 2A browser-wallet scaffold, see [GUIDED_RANGE_TRADING_MVP.md](./GUIDED_RANGE_TRADING_MVP.md). For Phase 2B browser scan/recovery fixes, see [BROWSER_WALLET_MANUAL_VALIDATION_FIXES.md](./BROWSER_WALLET_MANUAL_VALIDATION_FIXES.md). For Phase 3 Route B wrapper architecture, Phase 3D ProtocolVault fee custody, Phase 3E-postpublish Testnet wrapper deployment, and Phase 3F first wrapper follow validation, see [BUSINESS_MODEL.md](./BUSINESS_MODEL.md), [WRAPPER_CONTRACT_ARCHITECTURE.md](./WRAPPER_CONTRACT_ARCHITECTURE.md), [WRAPPER_TESTNET_PUBLISH_RESULT.md](./WRAPPER_TESTNET_PUBLISH_RESULT.md), [WRAPPER_FOLLOW_TESTNET_VALIDATION.md](./WRAPPER_FOLLOW_TESTNET_VALIDATION.md), [PROTOCOL_VAULT_DESIGN.md](./PROTOCOL_VAULT_DESIGN.md), [FOLLOW_STRATEGY_TRANSACTION_FLOW.md](./FOLLOW_STRATEGY_TRANSACTION_FLOW.md), [STRATEGY_DATA_MODEL.md](./STRATEGY_DATA_MODEL.md), and [ADR/0002-wrapper-internal-mint-route-b.md](./ADR/0002-wrapper-internal-mint-route-b.md). For SDK/PTB entrypoint tracking, see [ENTRYPOINT_BINDINGS_PLAN.md](./ENTRYPOINT_BINDINGS_PLAN.md).

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

## DeepVol BTC MOVE binary-leg dependency

DeepVol is a Predict-native primitive trading terminal and structured product layer. UP and DOWN can be direct wallet-gated primitives after fresh quote, PredictManager balance, and binary mint preflight gates pass; RANGE remains quote/preflight-only until dedicated mintability validation; BTC MOVE Receipt is the primary composed MVP product.

DeepVol packages two DeepBook Predict binary legs into a BTC MOVE Receipt: an UP leg above the upper strike and a DOWN leg below the lower strike. `series::create_series` is permissionless and does not prove those legs are mintable, so current frontend/SDK gates require quote plus UP/DOWN binary mint devInspect validation before Create Series can open wallet review. Current source-confirmed dependencies are `market_key::up`, `market_key::down`, `market_key::new`, `predict::get_trade_amounts`, `predict::mint<Quote>`, `predict::redeem<Quote>`, `predict::redeem_permissionless<Quote>`, `predict_manager::position`, `PositionMinted`, and `PositionRedeemed`.

Binary quote/read/preflight, one controlled full two-leg binary mint, DeepVol-11 guided binary redeem read/preflight, DeepVol-12 controlled browser redeem wiring, DeepVol-13 controlled browser redeem execution, DeepVol-14 primitive quote/preflight UX, DeepVol-15 guarded UP/DOWN primitive execution code, DeepVol-16 source/test/browser-smoke gate validation, DeepVol-16-fix active BTC primitive market discovery/stale-oracle gating, and DeepVol-20 fresh BTC MOVE buy with mintable-range-validated VolSeries now have Testnet-facing implementation evidence. DeepVol-20 confirms that requiring mintable range validation before `create_series` effectively prevents `assert_mintable_ask::7` in the real buy flow. DeepVol-16 did not execute real UP/DOWN primitive mints; the Playwright browser profile had no installed Sui wallet extension, and a follow-up wallet-enabled preflight exposed `oracle_config::assert_live_oracle` abort code `3`, meaning the historical BTC oracle was stale/non-live for new minting. DeepVol-21 adds a primitive mintability gate: `findMintableBinaryPrimitiveCandidate()` searches tick-aligned candidates around the anchor price, and UP/DOWN wallet execution now requires `primitiveMintabilityStatus === "passed"` with `assert_mintable_ask::7` mapped to "Selected strike is not mintable". No real UP/DOWN primitive mint has been executed yet. See [DEEPVOL_PRIMITIVE_DIRECT_TRADING.md](./DEEPVOL_PRIMITIVE_DIRECT_TRADING.md). Binary redeem signatures are source-confirmed and the browser path validated one gated two-leg `predict::redeem<DUSDC>` PTB for the known receipt with digest `HeHNeZ95oymZzmA2ZpdjkvJgCaA9s5DzL7qs6aCgbJbJ`, UP payout `9727`, DOWN payout `47`, and UP/DOWN position deltas `20000 -> 10000`. The 2026-05-19 controlled binary mint diagnosis reproduced `InsufficientGas in command 3` at `100000000` MIST, identified command `3` as the second `predict::mint` if zero-based and `market_key::down` if one-based, then passed SDK and CLI dry-runs at `200000000` MIST and executed one real two-leg BTC binary mint with digest `4fMQtu8mFB6jLa5gtSWBsDj3gYp8u9AjQw3xs2VcNJoh`. Active BTC oracle, expiry, strike grid, leg mintability, payout preview, and redeemability are `MUST CONFIRM AT RUNTIME`. Quote success alone does not imply mintability: `predict::assert_mintable_ask::7` means the selected ask / strike is not mintable for this oracle market. `devInspect` success does not imply executable mint or redeem submission; future wallet prompts still require fresh gates and wallet simulation before approval. Range and wrapper validations remain useful prior work: they proved PredictManager setup, full preflight discipline, direct manager readback, ProtocolVault fee custody, and wrapper/protocol event linkage.

## DeepVol Testnet package, ProtocolVault, and receipt status

DeepVol Route B is now published on Sui Testnet, and the DUSDC ProtocolVault is configured after the DeepVol-4 setup transaction. DeepVol-5 validated the first deployed BTC `VolSeries` and `buy_move_receipt<DUSDC>` transaction. The public receipt path remains `receipt::buy_move_receipt<Quote>`: it derives UP/DOWN legs from `VolSeries`, quotes both legs, internally calls DeepBook Predict `predict::mint<Quote>` twice, deposits Create Fee into DeepVol `ProtocolVault<Quote>`, and only then mints the receipt.

| Item | Value |
|---|---|
| Publish digest | `3HZ88SZZsUpmgJqxCAqzKxi6ceeD1pkrKXnprDS36DFi` |
| DeepVol package ID | `0xe9b45e8d06406bb935bf5e3260ac9b82491ca158775861660be34881e17a4fa0` |
| Publisher / AdminCap owner | `0x4ff903b0dcc52dc8753787baf19b34b7425dfa64d187cc7c726b38413705fa75` |
| AdminCap object ID | `0xa0f062e01af265137324eb26489de788fee443e49376725bed84a877c99318b1` |
| UpgradeCap object ID | `0x2b5224c317e2d517bbc7abb47740cce86234399e818077ac50e63e79b0298fc4` |
| ProtocolVault creation digest | `BXMAz5vN2QUjEkvPANELhLQg7gieUWU2DJKzuXajaAZK` |
| ProtocolVault<DUSDC> object ID | `0x1b9174645d70ac4caa2cfa0db5df59ac78a3ce0d3cca10f8be37e4c5d84f1a09` |
| First VolSeries creation digest | `JCHonGTMEikMBtxWkZpUbhDWNZjMCoSDJNbRuVBHTLUk` |
| First VolSeries object ID | `0x57878763c144cabe06c86d7e02f168d6b42481d779434d8efc8146a10c1ba885` |
| First buy_move_receipt<DUSDC> digest | `GVyMBH9kB6nTSuWoULFZ5ir3yhFnRC8LNoRz9EEDQXbd` |
| First MoveReceipt object ID | `0x6eac478ef6300281093a2301a52b4ee7b272d6b1a76be9e16e63fa43171f6a0f` |
| First manually validated browser buy digest | `A6YB62BqMmWsQeEZUoh4qYAA6n4RMqnih5TtHRdadfGn` |
| Browser-created MoveReceipt object ID | `0xbbc2d18447502830a96602b8f9611e834c509d6fa00abdf2061ecd1addaa35eb` |
| Browser guided redeem digest | `HeHNeZ95oymZzmA2ZpdjkvJgCaA9s5DzL7qs6aCgbJbJ` |
| Fresh VolSeries buy digest (DeepVol-20) | `6sq8ZydZS3sLXNU6Y31gxSqBniVdf7SEXMwiKzJmjbXg` |
| Fresh VolSeries object ID (DeepVol-20) | `0x227c2436f3f111e41a78967faaca9c5e9dc5f3074959b720efc86f70fba7006d` |
| Fresh MoveReceipt object ID (DeepVol-20) | `0x85d803ae6b8a66f6d0e0772e8906d8076dea210de3eaa322d712db58eb6ff869` |

The setup record is [DEEPVOL_TESTNET_PUBLISH_RESULT.md](./DEEPVOL_TESTNET_PUBLISH_RESULT.md), and `packages/config/src/deepVolTestnet.ts` contains the runtime config constants. `AdminCap` and `UpgradeCap` are admin-only deployment/operations objects and must not be required by normal `buy_move_receipt` builders. DeepVol-4 created no real `VolSeries`, minted no real `MoveReceipt`, executed no deployed `buy_move_receipt<DUSDC>`, executed no Predict mint/redeem, deposited no Create Fee through the receipt path, executed no withdrawal, and used no mainnet path. DeepVol-5 later executed one `series::create_series` and one `buy_move_receipt<DUSDC>` only after fresh gates, then verified MoveReceipt readback, UP/DOWN position deltas of `10000`, manager DUSDC premium delta `10029`, and ProtocolVault fee delta `30`; see [DEEPVOL_BUY_MOVE_RECEIPT_TESTNET_VALIDATION.md](./DEEPVOL_BUY_MOVE_RECEIPT_TESTNET_VALIDATION.md). DeepVol-10 manually validated the browser wallet buy path with digest `A6YB62BqMmWsQeEZUoh4qYAA6n4RMqnih5TtHRdadfGn`, receipt `0xbbc2d18447502830a96602b8f9611e834c509d6fa00abdf2061ecd1addaa35eb`, actual premium `9973`, Create Fee `29`, and successful portfolio display; see [DEEPVOL_BROWSER_BUY_VALIDATION.md](./DEEPVOL_BROWSER_BUY_VALIDATION.md). DeepVol-13 manually validated the controlled browser guided redeem path with digest `HeHNeZ95oymZzmA2ZpdjkvJgCaA9s5DzL7qs6aCgbJbJ`, UP payout `9727`, DOWN payout `47`, total payout `9774`, and UP/DOWN position deltas `20000 -> 10000`; see [DEEPVOL_BROWSER_REDEEM_VALIDATION.md](./DEEPVOL_BROWSER_REDEEM_VALIDATION.md).

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
| Manager balance read | Public server summary for a known manager ID reports owner and DUSDC balance fields; DeepVol mint harness also verified direct script-level `balance<DUSDC>` devInspect readback for the controlled manager. | Verified known-manager public server read path; direct script-level readback verified; production SDK helper pending | After two deposits, `/managers/:manager_id/summary` reported `balances[0].balance = 2000000`, `trading_balance = 2000000`, and `account_value = 2000000`. The DeepVol mint harness read manager DUSDC `999965` before the successful binary mint and `998962` after it. |
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

## DeepVol browser wallet gate policy

DeepVol browser buy and primitive preview flows live under `apps/deepvol-web/`. The BTC MOVE buy flow must require a connected wallet, Sui Testnet, a selected `VolSeries` whose oracle/expiry matches the active BTC market, recent mintability validation for that series/range/quantity/manager key, fresh UP and DOWN quotes, PredictManager DUSDC balance readback, a prepared sender-owned `Coin<DUSDC>` for Create Fee, and browser `buy_move_receipt<DUSDC>` preflight before enabling wallet approval.

The app must not use mainnet, local private keys, `.env.local`, CLI signing, validation scripts, automatic execution, publish, withdraw, script/private-key redeem, or old RangePilot follow paths. Historical DeepVol-5 quotes and previously created VolSeries objects are validation evidence only and are not live offers or mintability proof.

The current BTC MOVE route can show quote/readback state but must keep Create Series disabled until a mintable range passes validation, and must keep the buy button disabled when the selected series is missing, stale, validation-required, non-mintable, or when browser `buy_move_receipt<DUSDC>` preflight is unavailable or stale for the current quote and wallet state. The `/primitives` route can run browser-safe UP/DOWN/RANGE quote and mint-preflight diagnostics only from a selected active BTC primitive market context. UP/DOWN wallet review can unlock only after selected market status is effectively `Live`, fresh quote, positive mint cost, PredictManager DUSDC balance coverage, fresh binary mint preflight, Sui Testnet wallet, PredictManager ID, and no active submission. The execution hook must rerun market expiry/status checks, quote, manager balance, and mint preflight immediately before wallet prompt. RANGE direct execution remains disabled even when quote and preflight pass. Direct primitive trades do not create `MoveReceipt` objects and do not charge DeepVol Create Fee. General portfolio enumeration/indexer support is not available; localStorage receipts, local primitive trade records, labeled validation receipts, and selected known-key primitive readback are reference/readback surfaces only.

DeepVol browser wallet buy (including DeepVol-20 fresh VolSeries buy with digest `6sq8ZydZS3sLXNU6Y31gxSqBniVdf7SEXMwiKzJmjbXg` and receipt `0x85d803ae6b8a66f6d0e0772e8906d8076dea210de3eaa322d712db58eb6ff869`) and one controlled browser guided redeem are now validated on Testnet. The receipt remains non-custodial: the `MoveReceipt` records metadata/linkage, while the UP and DOWN binary positions remain in the user's `PredictManager`. DeepVol-11 source-confirmed Predict binary redeem signatures, payout preview/readback behavior, event fields, and quoteable-oracle constraints, then added read/devInspect preflight only. DeepVol-12 wired controlled browser redeem behind exact receipt/owner/Testnet/fresh-preflight/one-shot gates, and DeepVol-13 validated the known receipt redeem with digest `HeHNeZ95oymZzmA2ZpdjkvJgCaA9s5DzL7qs6aCgbJbJ`. Guided MVP redeem must not imply Profit Fee enforcement, custody, withdraw authority, mainnet support, script/private-key fallback, or executed redeem success without digest/event/readback reconciliation.

## Phase 2A browser-wallet MVP scaffold

Phase 2A adds minimal `/trade` and `/portfolio` browser pages around the validated Testnet lifecycle. The web app uses browser wallet approval only, never `.env.local` or local private-key signing. Validation scripts remain protocol regression tests; they are not imported into the UI. Browser mint remains gated by official quote plus fresh full `mint_range<DUSDC>` preflight, and browser redeem remains gated by fresh direct `range_position`, official quote, positive payout by default, and full `redeem_range<DUSDC>` preflight. This is an engineering scaffold, not final UI design.

## Phase 2B browser scan and portfolio recovery fixes

Phase 2B fixes manual browser validation blockers without changing protocol authority. `/trade` now runs a bounded browser scan with default limits of `120` quote attempts, `30` mint preflight attempts, and `4` oracle contexts. Quote/preflight attempts are deduped by `oracleId:expiry:lowerStrike:higherStrike:quantity`, source-informed runtime-derived candidate families are ranked before broad candidates, and the scan early-stops on the first full `mint_range<DUSDC>` preflight success. No-candidate results are scan state, not transaction failures. `EAskPriceOutOfBounds` remains a protocol preflight blocker that quote success alone cannot bypass.

`/portfolio` now recovers manager-scoped known RangeKeys from browser `RangeMinted` events, non-secret localStorage, mint transaction digest import, and public mint history hints. Manual RangeKey entry is available only under Advanced Debug and must be explicitly selected. Direct `predict_manager::range_position` remains the wallet-critical active quantity source before redeem; public server history is diagnostic/recovery-only until direct readback confirms active quantity.

## Phase 3A/B Route B wrapper architecture

Route B is selected: RangePilot adds a thin creator strategy wrapper that internally calls DeepBook Predict `predict::mint_range<DUSDC>` after validating RangePilot strategy state and collecting a separate creator/platform fee coin. The wrapper derives `RangeKey` from stored Strategy fields and emits RangePilot attribution events, while DeepBook Predict remains the authority for pricing, oracle lifecycle, vault exposure/risk, StrikeMatrix accounting, payout, settlement, and `PredictManager` position custody.

The mint cost remains paid from the user's `PredictManager` balance by DeepBook Predict. The RangePilot creator/platform fee is a separate `Coin<DUSDC>` or generic `Coin<T>` passed to the wrapper; it must not be forced out of `PredictManager` balance. Because fee transfers and `mint_range` execute in one Sui transaction, a DeepBook Predict abort rolls back fee transfers and `StrategyFollowed` emission.

The public Predict server remains a read model for discovery, history, and diagnostics. Writes must go through Sui transactions and Move entrypoints. Frontend follow flows must still run official `get_range_trade_amounts` quote preview plus full `mint_range<DUSDC>` preflight before prompting a wallet for the wrapper call.

Phase 3D replaces direct platform-recipient routing with RangePilot `ProtocolVault<T>` and `AdminCap`. The wrapper transfers creator fees to the creator, deposits platform fees into `ProtocolVault<T>`, returns any fee coin remainder to the follower, and then calls DeepBook Predict `mint_range<T>`. Confirmed policy is `platform_fee_bps = 10` and `MAX_CREATOR_FEE_BPS = 3000`; `3000 bps = 30%` and `300 bps = 3%`. Strategy objects remain shared, strategy creation remains permissionless, metadata policy is `metadata_uri`, and the Testnet/hackathon wrapper is upgradeable.

Phase 3E-postpublish records the manual wrapper publish and post-publish `ProtocolVault<DUSDC>` setup. Wrapper package ID is `0xe0b877a06541d184b8c3bec46b81ccca2de38495979c25a658f98923407bf697`; publish digest is `7kSkeGzzTo3BcVCwC3qZdLh2bZdBpDP2hvMxkG8oB7TV`; `ProtocolVault<DUSDC>` object ID is `0x9430cc42b879c8f70a855230aecf7042e3efcadb41924cb6ff6c66c8e167d992`; vault creation digest is `5d8W8RtVWHxVjEhpjf6t3qfKzEFuDMdxHGXGJiR6DBe5`. Publisher/AdminCap owner is `0xc558e37d20405a9751c81124ac8d167e2b2d368b834319adafa549449e0715f5`; AdminCap is `0xbd825bd9f0ea1846314a02977430e691054e56752d8cf30b483cf211fec880f7`; UpgradeCap is `0xd313b4281ea0a9a0918ab7f35651fe8915477d748ec123cb0950197e34c2a741`.

Phase 3F validates the first real Route B wrapper follow. Admin/creator `0xc558e37d20405a9751c81124ac8d167e2b2d368b834319adafa549449e0715f5` created Strategy `0x8402c9475b75beddc0328ac60e0ac743f8e36223ab8fa066800f9b7317cac30a` with digest `8yrzb1mfWUdrJZXBKvGC6Y8xFkppDTUmFuA4Gg979zJV`. Follower `0x4ff903b0dcc52dc8753787baf19b34b7425dfa64d187cc7c726b38413705fa75` used PredictManager `0xd59be0646d948c9be6073edc0cfd253ce4cb00f4929f0bae71f451f50e5d1575`, passed official quote and full `mint_range<DUSDC>` preflight for quantity `1000`, then executed wrapper follow digest `997Yu78xbiM57fbJUsVk1eKURcbt8SXdi7Ypb1H74HEB`. The transaction emitted `StrategyFollowed`, `PlatformFeeDeposited`, and DeepBook Predict `RangeMinted`; ProtocolVault balance increased `0` → `1000`, creator DUSDC increased by `10000`, follower manager DUSDC decreased by `35`, and direct `range_position` increased `0` → `1000`.

Client builders must still require explicit wrapper package ID, protocol vault ID, quote-preview gate, and full mint-preflight gate. AdminCap and UpgradeCap are admin-only operational objects and must not be required by normal follower follow builders. The old incomplete `deepbookv3-predict-package/predict` dependency blocker is superseded; local third-party snapshots remain debugging/reference only and must not be committed.

## Runtime-confirmation table

These items remain `TBD` because they depend on live server data, chain state, object layout, generated bindings, event schemas, or a real transaction attempt.

| Topic | Current value | Coding status | Confirmation source needed | Notes |
|---|---|---|---|---|
| Active oracle IDs | Phase 1C quote-only run selected runtime BTC oracle `0x7f6af68a95f01b1c2153edcb7c96475935e8b2d796a8c04f32d57e5d0a83289d` | MUST CONFIRM AT RUNTIME / MUST CONFIRM BEFORE CODING | Public server, chain state, or generated bindings | Required before selecting the first market; do not hardcode as static config. |
| Active underlying assets | Phase 1C quote-only run observed BTC for the selected active oracle | MUST CONFIRM AT RUNTIME / MUST CONFIRM BEFORE CODING | Public server or chain state | No active SUI market has been confirmed; do not hardcode until confirmed for the active Testnet deployment. |
| Expiry list | Phase 1C selected oracle expiry `1778918400000` as a runtime value | MUST CONFIRM AT RUNTIME / MUST CONFIRM BEFORE CODING | Public server or chain state | Do not hardcode until confirmed for the active Testnet deployment. |
| Strike grid | Phase 1C-fix2 scanned BTC oracles with `min_strike = 50000000000000` and `tick_size = 1000000000` | Partial / MUST CONFIRM BEFORE CODING | Public server, `OracleConfig`, generated bindings, or chain state | Candidate derivation now snaps centered, adjacent, and wide ranges to the strike grid; positive official range quotes were observed. |
| Oracle freshness | Latest price spot/forward fields are available for scanned active BTC oracles; `oracle_config::assert_live_oracle` abort code `3` maps to stale/non-live oracle for mint paths | Partial / MUST CONFIRM BEFORE CODING | Public server, events/checkpoints, direct object reads, generated bindings, devInspect | Primitive UX now fails closed with active market refresh and stale-oracle copy instead of treating historical oracle snapshots as live. |
| Ask bounds | Public endpoint returned `null` for all four active BTC oracles; onchain `predict::ask_bounds` returned `10000000 / 990000000` for each | Onchain preflight source verified for scanned runtime oracles | Public server `/oracles/:oracle_id/ask-bounds`, onchain `predict::ask_bounds`, direct object reads, or generated bindings | Public endpoint `null` is diagnostic. Full mint preflight, not quote success alone, is required before real mint because code `7` / `EAskPriceOutOfBounds` can reject post-trade ask. |
| Public server response schemas | Phase 1A snapshot documented | MUST CONFIRM AT RUNTIME | Live server responses and schema capture | Conservative TypeScript response types are in `packages/types`; final UI assumptions still require runtime confirmation. |
| PredictManager discovery strategy | Post-create event/object-change recovery is verified; known-manager public server summary validates owner; general owner discovery remains pending | Partial / MUST CONFIRM BEFORE CODING | Public server `/managers`, event scan filters, direct object ownership pattern | Local storage is not authoritative; owner query and historical event lookup remain pending. |
| Portfolio direct read strategy | Direct `predict_manager::range_position` devInspect returned `1000` twice before Phase 1D-2 redeem and `500` after redeem for the known minted RangeKey; direct binary `predict_manager::position` returned UP/DOWN `0` before the DeepVol mint and `1000` after it; public manager summary reports owner and balances | Verified for specific RangeKey and MarketKey readback; enumeration still pending | Direct devInspect, public server, events/checkpoints | Use direct `range_position` or binary `position` for wallet-critical active quantity for a known key. Public server positions summary returned `count=0`, so it is diagnostic only for now. Production SDK balance helper remains pending. |
| Exact generated-binding/PTB call shapes | `create_manager`, gated `deposit<DUSDC>`, quote helpers, `range_key::new`, `mint_range<DUSDC>`, direct `range_position`, direct script-level `balance<DUSDC>`, binary `predict::mint<DUSDC>`, `redeem_range<DUSDC>`, and known-receipt browser `predict::redeem<DUSDC>` have validated Testnet paths where noted | Partial / MUST CONFIRM BEFORE CODING for unvalidated writes | Pinned source branch, generated bindings, devInspect, and real Testnet transaction attempts | Supply, withdraw, settled claim behavior, permissionless binary redeem, broader production binary redeem coverage, and production SDK balance helper remain unexecuted or pending. |
| First real `mint_range<DUSDC>` transaction validation | Gated Sui Testnet mint succeeded with digest `3XoGAs2NgEMbkn59y9KrRGsRbicBvTN6po5gmTsoHARe` after fresh quote, balance, Testnet, forbidden-target, and full preflight gates passed | Confirmed for current Testnet runtime state; rerun gates before future mints | Local source snapshot, onchain ask bounds, full mint preflight, Testnet transaction execution, event readback, and direct range-position readback | `RangeMinted` event was found and Phase 1D-1 direct `range_position` readback confirmed pre-redeem quantity `1000` for event-derived strikes `78194000000000 / 78204000000000`. |
| DeepVol BTC binary quote | Read harness found nonzero runtime UP/DOWN `predict::get_trade_amounts` quotes | Partial / MUST CONFIRM BEFORE CODING | Runtime BTC oracle/expiry, `market_key::up`, `market_key::down`, and devInspect | DeepVol must quote both UP and DOWN legs for the selected BTC MOVE series. Future values remain runtime-dependent. |
| DeepVol two-leg binary mint | Controlled Testnet mint succeeded with digest `4fMQtu8mFB6jLa5gtSWBsDj3gYp8u9AjQw3xs2VcNJoh` | Historical validation confirmed; future mints require fresh active-market gates | Runtime quote, full PTB devInspect, SDK dry-run, CLI dry-run, transaction execution, event parsing, direct readback | 2026-05-19 successful round selected oracle `0xc746336e790db7e93a34b684fa3768f43a7c3171d0262d0f2c71dc0a2ab5fe22`, expiry `1779436800000`, strikes `76705000000000 / 76803000000000`, quantity `1000`, total quote `1003`; UP and DOWN positions each increased `0` → `1000`, and manager DUSDC decreased `999965` → `998962`. This oracle/expiry is historical evidence only and was later observed stale/non-live for new primitive mint preflight. |
| DeepVol binary readback | Direct `predict_manager::position` devInspect returned UP `0` and DOWN `0` before the successful primitive mint, then UP `1000` and DOWN `1000` after it. DeepVol-5 receipt validation returned UP `0` and DOWN `0` before receipt buy, then UP `10000` and DOWN `10000` after it for the selected receipt keys. DeepVol-10 browser validation observed receipt-linked UP/DOWN mint events for quantity `10000`. | Confirmed for selected runtime UP/DOWN MarketKeys; future keys require fresh readback | Direct devInspect/readback helper | Required for wallet-critical UP and DOWN quantities because non-custodial `MoveReceipt` does not own legs. |
| DeepVol guided binary redeem | Guided non-custodial redeem is the recommended MVP exit path after browser buy validation. DeepVol-11 source-confirmed `predict::redeem<DUSDC>` / `predict::redeem_permissionless<DUSDC>`, payout quote source, event fields, and quoteable-oracle behavior, then read/preflighted the known browser receipt without execution. DeepVol-12 wired controlled browser execution and DeepVol-13 validated one browser-wallet redeem for the known receipt. | Source-confirmed, devInspect-preflighted, browser-wired, and executed once for the known controlled Testnet receipt | Source branch, validation script, devInspect, browser smoke, wallet execution, event parsing, direct before/after position readback | Known manager-level quantities were UP `20000` and DOWN `20000`; selected receipt quantity was `10000`; browser redeem digest `HeHNeZ95oymZzmA2ZpdjkvJgCaA9s5DzL7qs6aCgbJbJ` paid UP `9727`, DOWN `47`, and reduced both positions to `10000`. Future payout and market state remain `MUST CONFIRM AT RUNTIME`; future redeems still require event/readback reconciliation. |

## Confirmed entrypoint plan

Use the official Testnet package/config above and confirm exact generated binding call shapes from source branch `predict-testnet-4-16` before wiring code. Do not hand-write unverified Move signatures. Detailed argument tracking lives in [ENTRYPOINT_BINDINGS_PLAN.md](./ENTRYPOINT_BINDINGS_PLAN.md).

| Order | Entrypoint / helper | Product purpose | Status |
|---:|---|---|---|
| 1 | `create_manager` | Create the user-facing Predict Account | Verified on Testnet with transaction `DKoSBnKWZGJK6H2RV3yF4pAqSnQ3XncWFfgTsB38pf56`; manager ID recovery source `event_and_object_change` |
| 2 | `predict_manager::deposit<DUSDC>` | Deposit DUSDC into the Predict Account | Verified on Testnet through gated local signer validation; browser builder remains guarded until manual wallet validation |
| 3 | `predict_manager::balance<DUSDC>` | Read deposited DUSDC balance | Public server summary readback verified for known manager IDs; direct script-level devInspect readback verified in the DeepVol mint harness; production SDK helper pending |
| 4 | `predict_manager::range_position` | Read active quantity for a specific range key | Phase 1D-1 direct devInspect read returned pre-redeem quantity `1000` twice; Phase 1D-2 post-redeem read returned `500` |
| 5 | `range_key::new` | Construct the range key for lower/upper strikes | Phase 1C-fix scanner builds spot/forward-centered ranges and successful quote devInspect returns; Phase 1D-1 and Phase 1D-2 used it for direct position readback and redeem |
| 6 | `predict::get_range_trade_amounts` | Preview official range trade amounts | Phase 1C-fix2 devInspect verified safe `(mint_cost, redeem_payout)` decoding; Phase 1D-2 decoded redeem payouts before live redeem |
| 7 | `predict::mint_range<DUSDC>` | Mint the guided range prediction | Verified on Sui Testnet through the guarded validation path with digest `3XoGAs2NgEMbkn59y9KrRGsRbicBvTN6po5gmTsoHARe`; future mints require fresh full preflight |
| 8 | `predict::redeem_range<DUSDC>` | Redeem or claim range position through official protocol path | Verified on Sui Testnet through the guarded validation path with digest `9MiZdKDwdZB2WDkv5JFJV7fj88YRvvcw6LYGxX5DeQWc`; future redeems require fresh direct readback, quote, and full preflight |
| 9 | `market_key::up` / `market_key::down` | Construct DeepVol BTC MOVE binary leg keys | Source-confirmed and exercised by the DeepVol read/preflight/mint-mode harness |
| 10 | `predict::get_trade_amounts` | Preview official binary mint cost and redeem payout | DeepVol two-leg quote harness verified runtime UP/DOWN quotes |
| 11 | `predict::mint<DUSDC>` | Mint binary UP/DOWN legs for DeepVol BTC MOVE | Two-leg Testnet mint verified with digest `4fMQtu8mFB6jLa5gtSWBsDj3gYp8u9AjQw3xs2VcNJoh`; future mints require fresh quote, balance, gas, devInspect, and dry-run gates |
| 12 | `deepvol::receipt::buy_move_receipt<DUSDC>` | Create the protocol-enforced BTC MOVE receipt through the deployed DeepVol package | DeepVol-5 validated the first deployed execution with digest `GVyMBH9kB6nTSuWoULFZ5ir3yhFnRC8LNoRz9EEDQXbd`; future buys require fresh quote, fee coin, full preflight, wallet approval, and post-state checks |
| 13 | `predict::redeem<DUSDC>` / `predict::redeem_permissionless<DUSDC>` | Redeem binary positions for guided settlement | `predict::redeem<DUSDC>` is source-confirmed, devInspect-preflighted by DeepVol-11, wired for controlled browser execution in DeepVol-12, and validated for the known receipt in DeepVol-13 with digest `HeHNeZ95oymZzmA2ZpdjkvJgCaA9s5DzL7qs6aCgbJbJ`; future redeems require fresh runtime gates |
| 14 | `predict_manager::position` | Read binary position quantity by `MarketKey` | Direct devInspect readback exercised by the DeepVol harness and DeepVol-11 redeem read script for selected UP/DOWN keys |
| 14 | `predict::supply<DUSDC>` | Supply DUSDC liquidity to the Predict vault | Confirmed entrypoint role; later vault/LP work, not required for core guided range MVP |
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
