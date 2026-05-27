---
Purpose: Define the phased implementation roadmap for DeepVol BTC MOVE while preserving RangePilot validation history.
Audience: Product engineers, protocol integrators, frontend developers, and project planners.
Status: DeepVol-28 adds the standalone `apps/deepvol-open-design/` frontend rewrite with visual-fidelity design system from HTML mockups. DeepVol-27 adds the Open Design UI route map and BTC terminal shell for MOVE, UP, DOWN, RANGE, plus the updated Portfolio layout. DeepVol-25 adds wallet-scoped PredictManager session UX and primitive Portfolio readback. DeepVol-24-fix adds RANGE mintability diagnostics while preserving the RANGE wallet gate. DeepVol-23 records UP/DOWN primitive Testnet validation success and adds RANGE execution path (pending validation). DeepVol-21 adds mintable strike candidate search and execution gates for UP/DOWN primitives. Updated for DeepVol-20: fresh BTC MOVE buy validated on Testnet with active VolSeries. BTC MOVE buy no longer falls back to historical configured VolSeries, and Create BTC MOVE Series plus quote/preflight/wallet review are gated on mintable range validation.
Source of truth relationship: Derived from DeepVol foundation docs, local protocol docs, and official-derived Testnet integration references; implementation details remain subject to confirmation.
---

# Implementation Roadmap

DeepVol BTC MOVE is the flagship structured product direction. DeepVol is also becoming a Predict-native primitive trading terminal: UP and DOWN can be direct wallet-gated primitives, RANGE remains quote/preflight-only until dedicated validation, and BTC MOVE Receipt stays the primary composed receipt product. The roadmap prioritizes a real BTC MOVE volatility receipt path while adding raw primitive terminal capability without turning primitives into the MVP fee surface.

Prior RangePilot work remains important validation evidence:

- PredictManager create/deposit was validated.
- Range quote, mint, readback, and redeem were validated.
- Browser range trading scaffold was built as an engineering validation surface.
- Route B wrapper, ProtocolVault, publish, and first wrapper follow were validated on Testnet.

The prior creator-follow strategy model is not the primary product direction because public on-chain strategy parameters can be copied and used to bypass high follow fees.

## Phase 0: DeepVol foundation docs and ADR

| Field | Content |
|---|---|
| Goal | Establish DeepVol BTC MOVE as the primary direction and define product scope, architecture, data model, binary integration needs, business model, and pivot ADR. |
| Deliverables | DeepVol product direction; primitives-and-receipts clarification; MVP scope; protocol architecture; data model; binary leg integration; business model; ADR-0003; updated index, roadmap, protocol notes, binding plan, and legacy status notes. |
| Non-goals | No new Move package, no transaction execution, no binary mint, no publish, no formal UI rewrite, no deletion of prior validation docs. |
| Acceptance criteria | BTC-only MVP is explicit; non-custodial receipt limitation is explicit; Create Fee is MVP-enforceable; Profit Fee and Creator Share are V2/future; binary entrypoints are source-confirmed or marked `MUST CONFIRM BEFORE CODING`. |
| Required docs | DeepVol foundation docs; ADR-0003; protocol integration notes; entrypoint bindings plan. |
| Risks and fallback | Risk: old RangePilot docs still read like current direction. Fallback: add status notes and index links without deleting historical validation records. |

## Phase 1: Binary leg validation

| Field | Content |
|---|---|
| Goal | Validate the DeepBook Predict binary leg path DeepVol depends on with read/preflight evidence first, then a controlled real mint only after gates pass. |
| Deliverables | Read-only/source confirmation of `MarketKey`; binary quote harness; read-only BTC UP/DOWN pair selection; binary position readback helper; full two-leg PTB devInspect; gated Testnet binary mint mode; successful Testnet validation report; binary event parser; binary redeem validation plan. |
| Non-goals | No custodial receipt, no profit fee, no creator marketplace, no production UI. |
| Acceptance criteria | UP and DOWN quote preview pass for a runtime BTC oracle/expiry; full two-leg mint preflight passes; controlled binary mint validation is completed with digest/evidence; `predict_manager::position` readback strategy is proven. Current status: 2026-05-19 controlled two-leg BTC binary mint succeeded with digest `4fMQtu8mFB6jLa5gtSWBsDj3gYp8u9AjQw3xs2VcNJoh` after diagnosing the old `InsufficientGas in command 3` as a too-low `100000000` MIST gas budget and using `200000000` MIST. |
| Required docs | DeepVol binary leg integration; official contract info; protocol integration notes; entrypoint bindings plan; PredictManager flow and validation docs. |
| Risks and fallback | Risk: active BTC binary market changes or mintability fails after quote. Fallback: document runtime blocker and do not build production receipt flow until full binary preflight succeeds. |

## Phase 2: DeepVol local Route B contract

| Field | Content |
|---|---|
| Goal | Implement the minimal non-custodial but protocol-enforced DeepVol Move package around BTC MOVE series, DeepVol fee vault, and receipt creation. |
| Deliverables | `move/deepvol` package; `VolSeries`; DeepVol `AdminCap`; DeepVol `ProtocolVault<Quote>`; `MoveReceipt`; `receipt::buy_move_receipt<Quote>` with internal UP/DOWN Predict mints; Create Fee deposit; receipt lifecycle events; Move tests; TypeScript type/config/SDK stubs. |
| Non-goals | Package publish, real `VolSeries` creation, real `MoveReceipt` minting, real `buy_move_receipt<Quote>` execution, binary redeem execution, custodial manager, tradable receipt, Profit Fee enforcement, secondary market, custom Predict pricing, custom settlement. |
| Acceptance criteria | Move build/tests pass locally; receipt creation is not exposed as a metadata-only public path; `buy_move_receipt<Quote>` derives both keys from `VolSeries`; Create Fee deposits into DeepVol `ProtocolVault<Quote>`; DeepVol-4 records the later manual Testnet publish and DUSDC ProtocolVault setup. |
| Required docs | DeepVol protocol architecture; DeepVol data model; DeepVol MoveReceipt contract; DeepVol contract build validation; DeepVol business model; binary leg integration; Move rules. |
| Risks and fallback | Risk: implying deployment or on-chain validation before manual publish. Fallback: keep null config, no-publish status, and primitive-vs-Route-B evidence separation strict. |

## Phase 3: Manual publish, deployed Route B validation, and preflight gates

| Field | Content |
|---|---|
| Goal | Validate deployed DeepVol `buy_move_receipt<DUSDC>` after manual package publish and DUSDC ProtocolVault setup. |
| Deliverables | Manual publish readiness review; DeepVol-4 package/AdminCap/UpgradeCap/config values; shared `ProtocolVault<DUSDC>` setup; binary quote helpers; deployed `buy_move_receipt<DUSDC>` preflight; receipt transaction builder wired to deployed package; Create Fee coin routing; binary position readback; event parsing. |
| Current status | Manual publish and shared `ProtocolVault<DUSDC>` setup are complete and recorded in [DEEPVOL_TESTNET_PUBLISH_RESULT.md](./DEEPVOL_TESTNET_PUBLISH_RESULT.md). DeepVol-5 created VolSeries `0x57878763c144cabe06c86d7e02f168d6b42481d779434d8efc8146a10c1ba885`, executed `buy_move_receipt<DUSDC>` digest `GVyMBH9kB6nTSuWoULFZ5ir3yhFnRC8LNoRz9EEDQXbd`, minted MoveReceipt `0x6eac478ef6300281093a2301a52b4ee7b272d6b1a76be9e16e63fa43171f6a0f`, and verified internal UP/DOWN mints plus Create Fee deposit in [DEEPVOL_BUY_MOVE_RECEIPT_TESTNET_VALIDATION.md](./DEEPVOL_BUY_MOVE_RECEIPT_TESTNET_VALIDATION.md). |
| Non-goals | Private-key browser paths, mainnet, unaudited production launch, direct custom pricing, bypassing fresh quote/preflight gates. |
| Acceptance criteria | DeepVol-5 satisfied the first deployed receipt validation criteria for one runtime-selected BTC series. Future builders must still require runtime BTC oracle/expiry, successful UP and DOWN quote previews, full DeepVol Route B preflight, fee coverage, explicit package/vault IDs, and explicit gates before wallet prompt. |
| Required docs | DeepVol Testnet publish result; DeepVol binary leg integration; entrypoint bindings plan; protocol integration notes; Sui transaction-building guidance. |
| Risks and fallback | Risk: quote success differs from mintability or actual event costs differ from the immediate quote. Fallback: preserve full preflight gate and event/readback reconciliation, mirroring range mint lessons. |

## Phase 4: Portfolio and guided settlement UX

| Field | Content |
|---|---|
| Goal | Establish and polish the DeepVol-first wallet-gated frontend through controlled guided redeem wiring while preserving the no-overclaim boundary for real execution. |
| Deliverables | New `apps/deepvol-web` Vite app; BTC MOVE markets route; buy route; portfolio route; wallet status; Testnet guard; quote/preflight panels; transaction gating card; local/reference receipt readback; explicit blocker states; DeepVol-7 oceanic UI/UX redesign over the DeepVol-6 scaffold; DeepVol-8 browser flow repair with PredictManager create/store action visibility, DUSDC wallet/deposit visibility, explicit quote refresh, explicit preflight action, and first-receipt portfolio guidance; DeepVol-9 browser-safe `buy_move_receipt<DUSDC>` preflight with PredictManager DUSDC balance readback and receipt `devInspect` gating; DeepVol-10 manual browser wallet buy validation with portfolio receipt display evidence; DeepVol-11 source-confirmed binary redeem path, read/preflight script, and Portfolio guided redeem scaffold; DeepVol-12 controlled browser redeem gates, combined two-leg PTB builder, event parser, and reconciliation UI; DeepVol-13 controlled browser guided redeem validation; DeepVol-14 UP / DOWN / RANGE primitive quote/preflight previews; DeepVol-15 primitive execution policy, guarded UP/DOWN wallet execution gates, primitive local records, and RANGE disabled policy; DeepVol-16-fix active BTC primitive market discovery, stale/non-live oracle blockers, and selected oracle object propagation. |
| Non-goals | Creator marketplace, secondary market, custodial settlement, Profit Fee enforcement, automatic redeem execution, mainnet, withdraw actions, script/private-key redeem fallback, or protocol changes. |
| Acceptance criteria | Users can connect a Testnet wallet, inspect the validated BTC MOVE VolSeries, understand `Trade movement, not direction.`, create or store a PredictManager, inspect wallet DUSDC funding, refresh quotes, run browser `buy_move_receipt<DUSDC>` preflight, understand why the buy button is disabled until receipt preflight and funding gates pass, execute `buy_move_receipt<DUSDC>` by explicit wallet approval after gates pass, view the browser-created receipt in portfolio without treating the receipt as custody truth, run explicit guided redeem preflight that reads UP/DOWN positions and payout estimates, execute the controlled known-receipt redeem only after exact known receipt/wallet/Testnet/fresh preflight gates pass, use UP/DOWN as wallet-gated primitive terminals only after fresh quote/balance/preflight gates pass, understand RANGE as quote/preflight-only, and understand that primitives do not create `MoveReceipt` or pay DeepVol Create Fee. Current status: DeepVol-10 manually validated browser digest `A6YB62BqMmWsQeEZUoh4qYAA6n4RMqnih5TtHRdadfGn`, receipt `0xbbc2d18447502830a96602b8f9611e834c509d6fa00abdf2061ecd1addaa35eb`, actual premium `9973`, Create Fee `29`, and portfolio display; DeepVol-11 read/preflight validation observed current manager-level UP/DOWN quantities of `20000`, selected receipt quantity `10000`, and devInspect redeem preflight passed for both receipt-scoped legs; DeepVol-13 validated browser redeem digest `HeHNeZ95oymZzmA2ZpdjkvJgCaA9s5DzL7qs6aCgbJbJ`, UP payout `9727`, DOWN payout `47`, total payout `9774`, and UP/DOWN position deltas `20000 -> 10000`; DeepVol-15 adds execution-ready UP/DOWN primitive gates; DeepVol-16 browser smoke and source/test verification passed; follow-up wallet-enabled preflight exposed a stale/non-live oracle blocker, so DeepVol-16-fix adds active BTC market discovery and stale-oracle gating before renewed execution validation. |
| Required docs | DeepVol frontend MVP; DeepVol protocol architecture; DeepVol data model; binary leg integration; PredictManager docs; protocol integration notes. |
| Risks and fallback | Risk: users misunderstand receipts as tradable claims or assume the reference artifact is a live wallet position. Fallback: UI copy must state non-custodial receipt and local/indexer limitations clearly. |

- DeepVol-18 fixes the active-series gate: `/buy/btc-move` passes quote/preflight only a `ready` active VolSeries and blocks historical configured-series fallback for new buys.
- DeepVol-18-fix-2 adds mintable BTC MOVE range validation before `Create BTC MOVE Series`: the browser regenerates wider lower/upper candidates, quotes UP at `upper` and DOWN at `lower`, devInspects both binary mints, blocks unvalidated or non-mintable series, and maps `predict::assert_mintable_ask::7` to friendly BTC MOVE copy.
- DeepVol-20 fresh buy: digest `6sq8ZydZS3sLXNU6Y31gxSqBniVdf7SEXMwiKzJmjbXg`, receipt `0x85d803ae6b8a66f6d0e0772e8906d8076dea210de3eaa322d712db58eb6ff869` — validates active BTC market → mintable range → fresh VolSeries (`0x227c2436f3f111e41a78967faaca9c5e9dc5f3074959b720efc86f70fba7006d`) → `buy_move_receipt<DUSDC>` → UP/DOWN mints → create fee deposit → MoveReceiptCreated. This confirms the `assert_mintable_ask::7` fix works end-to-end.
- DeepVol-21 adds mintable strike candidate search for UP/DOWN primitives. `findMintableBinaryPrimitiveCandidate()` searches tick-aligned candidates around the anchor price and the execution gate now requires `primitiveMintabilityStatus === "passed"`. `assert_mintable_ask::7` maps to primitive-friendly "Selected strike is not mintable". RANGE execution remains disabled. No real UP/DOWN primitive mint has been executed yet -- gates are implementation-ready only. See [DEEPVOL_PRIMITIVE_DIRECT_TRADING.md](./DEEPVOL_PRIMITIVE_DIRECT_TRADING.md).
- DeepVol-23 validates UP and DOWN primitive direct mint on Testnet. DOWN digest `4XU2145PwZNm1Qn3NtVkEdKZt9VPjiZeY5vNwTcy7jnH` (cost 3156 atomic DUSDC) and UP digest `4JCQ9ZCPRfWugiRhQsU6Y3rAaeT3CyYMMGZ4XnoCWcy9` (cost 8837 atomic DUSDC) both succeeded via `market_key::down`/`market_key::up` and `predict::mint<DUSDC>`. This confirms the wallet-gated primitive execution path works end-to-end for UP and DOWN. See [DEEPVOL_PRIMITIVE_UP_DOWN_VALIDATION.md](./DEEPVOL_PRIMITIVE_UP_DOWN_VALIDATION.md).
- DeepVol-23 also adds the RANGE primitive execution path: mintable interval candidate search at width multipliers `[10, 20, 50, 100, 200, 500]` ticks with centered/below-anchor/above-anchor strategies, range quote and preflight validation, execution gate hierarchy, wallet execution with 10% drift tolerance, `assert_mintable_ask::7` mapped to RANGE-friendly error, RANGE local records with `primitiveType: "RANGE"` / `lowerStrike` / `upperStrike`, and documentation. **Real RANGE mint NOT yet validated on Testnet.** See [DEEPVOL_RANGE_PRIMITIVE_TRADING.md](./DEEPVOL_RANGE_PRIMITIVE_TRADING.md).
- DeepVol-24-fix adds structured RANGE mintability diagnostics for failed candidate searches: total candidates, quoted candidates, preflight-passed candidates, failure-family counts, representative candidate rows, and UI advanced details. This does not broaden candidate multipliers and does not validate a real RANGE mint. See [DEEPVOL_RANGE_MINTABILITY_DIAGNOSTICS.md](./DEEPVOL_RANGE_MINTABILITY_DIAGNOSTICS.md).
- DeepVol-25 adds shared wallet-scoped PredictManager session UX for BTC MOVE and primitives, keeps manual manager ID entry under Advanced / Developer fallback, recovers managers from same-wallet local primitive records when possible, and displays Primitive Positions separately from MOVE Receipts with local-record plus known-key readback. This does not add a general indexer, cross-browser discovery, Move contract state, mainnet support, or new real write validation. See [DEEPVOL_PREDICT_MANAGER_UX.md](./DEEPVOL_PREDICT_MANAGER_UX.md) and [DEEPVOL_PORTFOLIO_PRIMITIVE_POSITIONS.md](./DEEPVOL_PORTFOLIO_PRIMITIVE_POSITIONS.md).
- DeepVol-27 lands the Open Design UI in `apps/deepvol-web`: `/` landing, `/markets` overview, `/markets/btc?product=MOVE|UP|DOWN|RANGE` terminal, `/portfolio` Portfolio layout, plus compatibility routes `/buy/btc-move` and `/primitives?type=UP|DOWN|RANGE`. It does not change Move contracts, protocol entrypoints, Testnet config, or execute new real writes.
- DeepVol-28 creates a standalone `apps/deepvol-open-design/` frontend rewrite with Tailwind v4 design system extracted from `uiux-design/*.html` mockups. The new app copies all 25 headless hooks and 9 lib files verbatim, builds new components from scratch, and never imports from `apps/deepvol-web` UI components or CSS. Routes: `/` landing, `/markets` overview, `/markets/btc?product=MOVE|UP|DOWN|RANGE` terminal, `/portfolio` Portfolio. All 4 product tabs (MOVE/UP/DOWN/RANGE) render with real gate/blocker states. It does not change Move contracts, protocol entrypoints, Testnet config, or execute new real writes. See [DEEPVOL_OPEN_DESIGN_REWRITE_APP.md](./DEEPVOL_OPEN_DESIGN_REWRITE_APP.md).

## Phase 5: Demo polish

| Field | Content |
|---|---|
| Goal | Prepare a coherent DeepVol demo that communicates BTC MOVE in under 60 seconds, proves the core buy protocol path, and clearly frames the next guided exit path. |
| Deliverables | Landing narrative; DeepVol-7 polished `apps/deepvol-web` BTC MOVE market, buy, and portfolio screens; completed browser-safe receipt creation preflight; DeepVol-10 browser buy validation artifact; portfolio receipt display evidence; DeepVol-11 guided redeem read/preflight artifact; DeepVol-13 controlled redeem validation artifact; wallet-gated UP / DOWN primitive terminal, RANGE quote/preflight route, primitive execution policy doc, demo script, fallback screenshots, runbook. |
| Non-goals | Broad market support, pro API, production-grade indexer, custodial receipt, secondary market, Profit Fee enforcement, script/private-key redeem fallback, or overclaiming a redeem as executed without wallet digest/events/readback. |
| Acceptance criteria | Demo explains “Trade movement, not direction”; live or recorded evidence shows official DeepBook Predict binary composition, receipt metadata, browser wallet buy validation, portfolio display, guided redeem preflight, controlled browser redeem validation, UP/DOWN primitive gates, and RANGE quote/preflight education; limitations around non-custodial receipt, local/indexer-limited portfolio state, known-receipt-only redeem validation, known-key-only primitive readback, primitive local records, and RANGE-disabled execution are not misrepresented. |
| Required docs | DeepVol product direction; MVP scope; protocol architecture; binary validation artifacts; browser buy validation; redeem and settlement flow; business model. |
| Risks and fallback | Risk: live BTC market state changes before demo. Fallback: prepare clearly labeled screenshots or recorded successful flow; do not misrepresent stale data as live. |

## Phase 6: V2 custodial / escrow and marketplace research

| Field | Content |
|---|---|
| Goal | Evaluate whether DeepVol should evolve beyond non-custodial receipts. |
| Deliverables | Custodial/escrow design ADR; Profit Fee enforceability analysis; tradable receipt feasibility; creator VolSeries marketplace model; custody risk review. |
| Non-goals | Shipping custodial receipt before MVP validation, hidden custody, unvalidated settlement fee claims. |
| Acceptance criteria | Decision record explains whether V2 custody and Profit Fee are worth the complexity and risk. |
| Required docs | DeepVol protocol architecture; business model; data model; security review notes; future validation artifacts. |
| Risks and fallback | Risk: V2 complexity undermines MVP. Fallback: keep non-custodial receipt MVP as the stable product baseline. |

## Preserved RangePilot validation milestones

These milestones are complete and remain useful as DeepVol implementation evidence.

| Milestone | Status | DeepVol relevance |
|---|---|---|
| Phase 1A public server discovery | Completed | Runtime market discovery and read-model boundary. |
| Phase 1B PredictManager create/deposit | Completed | User manager and DUSDC balance setup for binary legs. |
| Phase 1C range quote/mint | Completed | Full preflight lesson: quote success alone is insufficient. |
| Phase 1D portfolio/readback/redeem | Completed | Direct manager readback and redeem gating patterns. |
| Phase 2 guided range scaffold | Completed as engineering scaffold | UI and wallet-gating reference, not current MVP direction. |
| Phase 3 Route B wrapper | Completed and validated | Reusable fee vault, wrapper, event-linkage, and post-state verification patterns. |

Formal UI design should now build from `apps/deepvol-open-design/` (the DeepVol-28 visual-fidelity rewrite), not from `apps/deepvol-web` or the prior RangePilot `apps/web` scaffold. DeepVol-7 moved that app from scaffold aesthetics to a coherent oceanic BTC MOVE transaction UX. DeepVol-8 repairs the browser flow so new Testnet users can see PredictManager setup, DUSDC funding, quote refresh, preflight, and portfolio next steps. DeepVol-9 makes browser `buy_move_receipt<DUSDC>` preflight the main composed-receipt gate, including PredictManager DUSDC balance readback and stale-state protection before wallet review. DeepVol-10 records a successful browser wallet buy and portfolio display. Direct two-leg binary mint preflight is diagnostic-only for this Route B receipt path. Wallet-gated UX work must preserve fresh quote, preflight, readback, and non-custodial receipt limitations.

DeepVol-11 implements browser guided redeem preflight as a disabled-execution scaffold: Predict binary redeem signatures are source-confirmed, UP/DOWN `PredictManager` positions can be read, payout preview uses `predict::get_trade_amounts`, and `predict::redeem<DUSDC>` devInspect preflight passed for both receipt-scoped legs of the known browser receipt. DeepVol-11 does not add Profit Fee, withdraw, custody, automatic execution, real redeem execution, or mainnet paths.

DeepVol-12 wires controlled browser redeem execution for the known receipt and blocks the wallet prompt unless the exact receipt, exact owner wallet, Sui Testnet, both receipt-scoped leg preflights, fresh submit-time read/preflight, and local one-shot guard pass. DeepVol-13 records the subsequent successful browser-wallet guided redeem for the known receipt with digest `HeHNeZ95oymZzmA2ZpdjkvJgCaA9s5DzL7qs6aCgbJbJ`, UP payout `9727`, DOWN payout `47`, total payout `9774`, and UP/DOWN position deltas `20000 -> 10000`. The remaining `10000` per leg is aggregate manager-level quantity for the same MarketKeys, not a failed receipt redeem. Future redeems must still use fresh read/preflight gates, parse `PositionRedeemed`, reconcile manager DUSDC balance and position deltas, and only then update local receipt status. DeepVol-14 adds preview-only UP/DOWN/RANGE primitive quote and mint-preflight diagnostics on `/primitives`; DeepVol-15 adds UP/DOWN wallet-gated primitive execution policy and code while leaving RANGE execution disabled, DeepVol Create Fee on primitives disabled, and direct primitive `MoveReceipt` creation disabled. DeepVol-16 confirms the route smoke and source/test gates, and DeepVol-16-fix records the follow-up stale/non-live oracle blocker (`oracle_config::assert_live_oracle` abort code `3`) plus active BTC market discovery/stale-oracle guards. Next step is rerunning controlled UP/DOWN browser execution validation only in a wallet-enabled Testnet browser profile with a freshly discovered live BTC market.
