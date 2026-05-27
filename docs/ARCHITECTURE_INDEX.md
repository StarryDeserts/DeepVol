---
Purpose: Navigation index for RangePilot and DeepVol architecture documentation.
Audience: Developers, product contributors, reviewers, and AI agents.
Status: DeepVol-34 adds DEEPVOL_OLD_UI_TRADING_STATE_MACHINE.md and rewires the standalone Open Design app to the old verified trading state machine. DeepVol-33 adds DEEPVOL_MINTABILITY_RUNTIME_DIAGNOSTICS.md and normalized runtime mintability diagnostics to the standalone Open Design app. DeepVol-28 adds the standalone `apps/deepvol-open-design/` frontend rewrite with visual-fidelity design system from HTML mockups. DeepVol-27 updates the `apps/deepvol-web` Open Design route map and references in DEEPVOL_FRONTEND_MVP.md, DEEPVOL_PREDICT_MANAGER_UX.md, DEEPVOL_PORTFOLIO_PRIMITIVE_POSITIONS.md, DEEPVOL_PRIMITIVE_DIRECT_TRADING.md, and DEEPVOL_RANGE_PRIMITIVE_TRADING.md. DeepVol-25 adds DEEPVOL_PREDICT_MANAGER_UX.md and DEEPVOL_PORTFOLIO_PRIMITIVE_POSITIONS.md for wallet-scoped manager session UX and primitive Portfolio readback. DeepVol-24-fix adds DEEPVOL_RANGE_MINTABILITY_DIAGNOSTICS.md for RANGE candidate failure diagnostics. DeepVol-23 records UP/DOWN primitive Testnet validation success, adds RANGE execution path (pending validation), and adds DEEPVOL_PRIMITIVE_UP_DOWN_VALIDATION.md and DEEPVOL_RANGE_PRIMITIVE_TRADING.md. DeepVol-21 adds mintable strike candidate search for UP/DOWN primitives and DEEPVOL_PRIMITIVE_DIRECT_TRADING.md. Updated for DeepVol-20 fresh BTC MOVE buy validation, DeepVol-18-fix-2 mintable BTC MOVE range validation, active BTC primitive market discovery, and wallet-gated UP/DOWN primitive execution.
Source of truth relationship: Indexes local source-of-truth documents, official-derived protocol references, generated companion docs, and pivot ADRs; does not replace source docs.
---

# Architecture Index

DeepVol BTC MOVE is the flagship structured product direction. DeepVol is a Predict-native primitive trading terminal and structured product layer on Sui: UP, DOWN, and RANGE can be wallet-gated raw primitives (RANGE execution path added but real RANGE mint NOT yet validated on Testnet), and BTC MOVE Receipt is the primary composed product so users can trade movement, not direction. DeepVol-18-fix-2 adds mintable BTC MOVE range validation before `create_series`, because permissionless VolSeries creation does not prove the UP and DOWN Predict legs can mint. DeepVol-16-fix adds active BTC primitive market discovery and stale/non-live oracle blockers after a wallet-enabled preflight exposed `oracle_config::assert_live_oracle` abort code `3` on the historical validation oracle.

RangePilot's guided range trading and Route B creator-follow wrapper work remains preserved as validated prior infrastructure. The creator-follow strategy model is no longer the primary product direction because public on-chain strategy parameters can be copied and used to bypass a high follow fee.

## Source-of-truth documents and official-derived references

| Document | Authority | Use when |
|---|---|---|
| [range_pilot_product_architecture_spec.md](./range_pilot_product_architecture_spec.md) | Original product, business, UX, MVP scope, engineering intent | Historical RangePilot positioning and prior guided prediction assumptions |
| [deepbook_predict_模块架构解析.md](./deepbook_predict_模块架构解析.md) | Protocol architecture analysis and DeepBook Predict mental model | Mapping protocol objects, preserving pricing/oracle/vault/settlement invariants, understanding read/write surfaces |
| [DEEPBOOK_PREDICT_OFFICIAL_CONTRACT_INFO.md](./DEEPBOOK_PREDICT_OFFICIAL_CONTRACT_INFO.md) | Official-derived contract/config/endpoint/entrypoint integration reference | Confirmed Testnet deployment config, public server endpoints, entrypoint planning, and official-reference conflict checks |
| [DEEPVOL_PRODUCT_DIRECTION.md](./DEEPVOL_PRODUCT_DIRECTION.md) | Current product direction | DeepVol structured-product positioning, BTC MOVE primary product, and non-custodial receipt boundary |
| [DEEPVOL_PRIMITIVES_AND_RECEIPTS.md](./DEEPVOL_PRIMITIVES_AND_RECEIPTS.md) | Current product-layer model | Distinguishing Predict primitives from composed receipts and answering the manual UP + DOWN concern |
| [DEEPVOL_MVP_SCOPE.md](./DEEPVOL_MVP_SCOPE.md) | Current MVP scope | Deciding what belongs in the BTC MOVE MVP and what stays future scope |
| [DEEPVOL_PRIMITIVE_EXECUTION_POLICY.md](./DEEPVOL_PRIMITIVE_EXECUTION_POLICY.md) | Current primitive execution policy | Defining UP/DOWN wallet gates, RANGE disabled policy, fee policy, and primitive portfolio boundaries |
| [DEEPVOL_PREDICT_PRIMITIVES_FRONTEND.md](./DEEPVOL_PREDICT_PRIMITIVES_FRONTEND.md) | Current primitives frontend scope | Explaining UP / DOWN / RANGE / MOVE UX relationships, wallet-gated UP/DOWN, and RANGE quote/preflight-only policy |
| [DEEPVOL_PRIMITIVE_QUOTE_PREFLIGHT.md](./DEEPVOL_PRIMITIVE_QUOTE_PREFLIGHT.md) | Current primitive quote/preflight contract | Defining UP / DOWN / RANGE quote, preflight, active-market blocker matrix, SDK helper boundaries, and execution gates |
| [DEEPVOL_PRIMITIVE_ACTIVE_MARKET_DISCOVERY.md](./DEEPVOL_PRIMITIVE_ACTIVE_MARKET_DISCOVERY.md) | Current primitive active-market discovery note | Explaining stale oracle root cause, `assert_live_oracle::3`, active BTC market refresh, manual override fallback, and no-real-mint boundaries |
| [ADR/0003-pivot-to-deepvol-btc-move.md](./ADR/0003-pivot-to-deepvol-btc-move.md) | Accepted pivot decision | Explaining why DeepVol supersedes creator-follow as the primary direction |

Do not edit the original product or protocol-analysis source docs for normal implementation tasks unless the user explicitly requests source-doc maintenance. If older RangePilot docs conflict with the DeepVol pivot, use the DeepVol foundation docs and ADR-0003 for current direction while preserving historical validation records.

## DeepVol foundation docs

| Document | Purpose | Category |
|---|---|---|
| [DEEPVOL_PRODUCT_DIRECTION.md](./DEEPVOL_PRODUCT_DIRECTION.md) | Defines DeepVol structured-product direction, pivot rationale, BTC-first scope, and receipt limitations | Product / strategy |
| [DEEPVOL_PRIMITIVES_AND_RECEIPTS.md](./DEEPVOL_PRIMITIVES_AND_RECEIPTS.md) | Explains primitives vs composed receipts, manual UP + DOWN, and productization value | Product / strategy |
| [DEEPVOL_MVP_SCOPE.md](./DEEPVOL_MVP_SCOPE.md) | Defines BTC-only MVP inclusions, exclusions, runtime assumptions, and future structure | Product / engineering |
| [DEEPVOL_PRIMITIVE_EXECUTION_POLICY.md](./DEEPVOL_PRIMITIVE_EXECUTION_POLICY.md) | Defines UP/DOWN execution gates, RANGE disabled policy, fee policy, and primitive portfolio boundaries | Product / frontend / SDK |
| [DEEPVOL_PREDICT_PRIMITIVES_FRONTEND.md](./DEEPVOL_PREDICT_PRIMITIVES_FRONTEND.md) | Defines wallet-gated UP / DOWN frontend surfaces, RANGE quote/preflight-only UX, and BTC MOVE priority | Product / frontend |
| [DEEPVOL_PRIMITIVE_QUOTE_PREFLIGHT.md](./DEEPVOL_PRIMITIVE_QUOTE_PREFLIGHT.md) | Defines the DeepVol-15 UP / DOWN / RANGE quote, preflight, and execution gate contract | Frontend / SDK / protocol |
| [DEEPVOL_PREDICT_MANAGER_UX.md](./DEEPVOL_PREDICT_MANAGER_UX.md) | Documents wallet-scoped PredictManager session UX, Create PredictManager CTA, recovery order, and Advanced / Developer manual fallback | Frontend / product / SDK |
| [DEEPVOL_PORTFOLIO_PRIMITIVE_POSITIONS.md](./DEEPVOL_PORTFOLIO_PRIMITIVE_POSITIONS.md) | Documents separate Primitive Positions Portfolio display, local-record plus known-key readback, and no-indexer boundary | Frontend / portfolio / SDK |
| [DEEPVOL_PRIMITIVE_EXECUTION_VALIDATION.md](./DEEPVOL_PRIMITIVE_EXECUTION_VALIDATION.md) | Records DeepVol-16 browser smoke, source/test verification, stale/non-live oracle blocker, missing-wallet-extension blocker, active-market fix pointer, and zero-count attestation for controlled UP/DOWN primitive execution validation | Frontend / protocol / validation |
| [DEEPVOL_PRIMITIVE_ACTIVE_MARKET_DISCOVERY.md](./DEEPVOL_PRIMITIVE_ACTIVE_MARKET_DISCOVERY.md) | Documents active BTC primitive market discovery, stale oracle diagnostics, friendly error copy, manual override fallback, and no-real-mint boundaries | Frontend / SDK / protocol |
| [DEEPVOL_ACTIVE_MOVE_SERIES.md](./DEEPVOL_ACTIVE_MOVE_SERIES.md) | Documents active BTC MOVE VolSeries lifecycle, permissionless creation, active market binding, MoveSeriesStatus states, and old receipt preservation | Frontend / protocol / SDK |
| [DEEPVOL_MINTABLE_MOVE_RANGE.md](./DEEPVOL_MINTABLE_MOVE_RANGE.md) | Documents BTC MOVE mintable range candidate search, UP/DOWN leg validation, `assert_mintable_ask::7`, Create Series gating, and non-mintable series handling | Frontend / SDK / protocol |
| [DEEPVOL_PRIMITIVE_DIRECT_TRADING.md](./DEEPVOL_PRIMITIVE_DIRECT_TRADING.md) | Documents DeepVol-21 mintable strike candidate search for UP/DOWN primitives, `findMintableBinaryPrimitiveCandidate()`, primitive mintability execution gate, and `assert_mintable_ask::7` primitive-friendly error mapping | Frontend / SDK / protocol |
| [DEEPVOL_PRIMITIVE_UP_DOWN_VALIDATION.md](./DEEPVOL_PRIMITIVE_UP_DOWN_VALIDATION.md) | Records DeepVol-23 successful Testnet UP and DOWN primitive direct mint transactions, execution evidence, and validation scope | Frontend / protocol / validation |
| [DEEPVOL_RANGE_PRIMITIVE_TRADING.md](./DEEPVOL_RANGE_PRIMITIVE_TRADING.md) | Documents DeepVol-23 RANGE primitive execution path: mintable interval search, execution gates, wallet execution, local records, and naming convention; real RANGE mint NOT yet validated on Testnet | Frontend / SDK / protocol |
| [DEEPVOL_RANGE_MINTABILITY_DIAGNOSTICS.md](./DEEPVOL_RANGE_MINTABILITY_DIAGNOSTICS.md) | Documents DeepVol-24-fix RANGE source confirmation, candidate diagnostics, failure taxonomy, UI behavior, and no-real-transaction safety boundary | Frontend / SDK / protocol / diagnostics |
| [DEEPVOL_MINTABILITY_RUNTIME_DIAGNOSTICS.md](./DEEPVOL_MINTABILITY_RUNTIME_DIAGNOSTICS.md) | Documents DeepVol-33 Open Design runtime input normalization, shared candidate diagnostics, DUSDC balance separation, and connected-wallet acceptance checks | Frontend / SDK / protocol / diagnostics |
| [DEEPVOL_OLD_UI_TRADING_STATE_MACHINE.md](./DEEPVOL_OLD_UI_TRADING_STATE_MACHINE.md) | Documents DeepVol-34 old verified UI trading state machine and Open Design parity target for MOVE, UP/DOWN, and RANGE | Frontend / SDK / state machine |
| [DEEPVOL_PROTOCOL_ARCHITECTURE.md](./DEEPVOL_PROTOCOL_ARCHITECTURE.md) | Defines VolSeries, MoveReceipt, ProtocolVault, PredictManager, transaction/readback/settlement paths | Protocol / architecture |
| [DEEPVOL_DATA_MODEL.md](./DEEPVOL_DATA_MODEL.md) | Proposes VolSeries, MoveReceipt, and receipt lifecycle event fields | Move / SDK / product |
| [DEEPVOL_BINARY_LEG_INTEGRATION.md](./DEEPVOL_BINARY_LEG_INTEGRATION.md) | Records source-confirmed binary entrypoints, MarketKey construction, events, and validation blockers | Protocol / SDK / PTB |
| [DEEPVOL_BINARY_MINT_TESTNET_VALIDATION.md](./DEEPVOL_BINARY_MINT_TESTNET_VALIDATION.md) | Records the controlled Testnet binary mint validation and gas-budget diagnosis | Protocol / SDK / validation |
| [DEEPVOL_TESTNET_PUBLISH_RESULT.md](./DEEPVOL_TESTNET_PUBLISH_RESULT.md) | Records the DeepVol Testnet package publish, AdminCap/UpgradeCap, and shared ProtocolVault<DUSDC> setup | Move / protocol / validation |
| [DEEPVOL_BUY_MOVE_RECEIPT_TESTNET_VALIDATION.md](./DEEPVOL_BUY_MOVE_RECEIPT_TESTNET_VALIDATION.md) | Records the first deployed BTC VolSeries and buy_move_receipt<DUSDC> execution, receipt, mints, fee accounting, and later browser validation links | Move / protocol / validation |
| [DEEPVOL_BROWSER_BUY_VALIDATION.md](./DEEPVOL_BROWSER_BUY_VALIDATION.md) | Records the manually validated browser wallet buy_move_receipt<DUSDC> transaction and portfolio receipt display | Frontend / protocol / validation |
| [DEEPVOL_FRESH_MOVE_BUY_VALIDATION.md](./DEEPVOL_FRESH_MOVE_BUY_VALIDATION.md) | Records the first fresh-VolSeries BTC MOVE buy validation through active-market → mintable-range → create-series → buy flow | Frontend / protocol / validation |
| [DEEPVOL_REDEEM_AND_SETTLEMENT_FLOW.md](./DEEPVOL_REDEEM_AND_SETTLEMENT_FLOW.md) | Defines post-buy redeem/settlement options, recommends guided non-custodial redeem for MVP, records DeepVol-11 source-confirmed redeem path, DeepVol-12 controlled browser wiring, and DeepVol-13 known-receipt redeem validation | Product / frontend / protocol |
| [DEEPVOL_REDEEM_PREFLIGHT_VALIDATION.md](./DEEPVOL_REDEEM_PREFLIGHT_VALIDATION.md) | Records DeepVol-11 source confirmation, known receipt readback, payout preview, devInspect redeem preflight, DeepVol-12 wiring history, and DeepVol-13 execution cross-reference | Protocol / frontend / validation |
| [DEEPVOL_BROWSER_REDEEM_VALIDATION.md](./DEEPVOL_BROWSER_REDEEM_VALIDATION.md) | Records DeepVol-13 successful controlled browser guided redeem digest, payouts, and position deltas for the known receipt | Frontend / protocol / validation |
| [DEEPVOL_FRONTEND_MVP.md](./DEEPVOL_FRONTEND_MVP.md) | Defines the `apps/deepvol-web` wallet-gated frontend, Open Design route map (`/`, `/markets`, `/markets/btc`, `/portfolio`), DeepVol-7 oceanic UI/UX foundation, DeepVol-8 browser flow repair, DeepVol-9 browser receipt preflight gate, DeepVol-10 browser buy validation, DeepVol-13 redeem validation, and DeepVol-14 primitive quote/preflight previews | Frontend / product / SDK |
| [DEEPVOL_OPEN_DESIGN_REWRITE_APP.md](./DEEPVOL_OPEN_DESIGN_REWRITE_APP.md) | Documents the DeepVol-28 standalone Open Design rewrite at `apps/deepvol-open-design/`, visual-fidelity design system from HTML mockups, logic reuse boundaries, and route mapping | Frontend / product / design |
| [DEEPVOL_MOVE_RECEIPT_CONTRACT.md](./DEEPVOL_MOVE_RECEIPT_CONTRACT.md) | Documents the Route B VolSeries, ProtocolVault, and protocol-enforced non-custodial MoveReceipt contract | Move / protocol / SDK |
| [DEEPVOL_CONTRACT_BUILD_VALIDATION.md](./DEEPVOL_CONTRACT_BUILD_VALIDATION.md) | Records local DeepVol Route B contract build/test validation scope and non-actions | Move / validation |
| [DEEPVOL_BUSINESS_MODEL.md](./DEEPVOL_BUSINESS_MODEL.md) | Defines Create Fee MVP model and V2-only Profit Fee / Creator Share | Product / business |
| [ADR/0003-pivot-to-deepvol-btc-move.md](./ADR/0003-pivot-to-deepvol-btc-move.md) | Records accepted pivot to DeepVol BTC MOVE | ADR |

## Prior validated RangePilot / DeepBook Predict docs

| Document | Purpose | Category |
|---|---|---|
| [ARCHITECTURE_INDEX.md](./ARCHITECTURE_INDEX.md) | Entry point, reading order, doc map, global rules | Engineering / agent workflow |
| [SOURCE_DOCUMENTS.md](./SOURCE_DOCUMENTS.md) | Authority boundaries and local citation policy | Engineering / protocol |
| [DEEPBOOK_PREDICT_ARCHITECTURE_MAP.md](./DEEPBOOK_PREDICT_ARCHITECTURE_MAP.md) | Protocol object map and product mapping | Protocol / product |
| [DEEPBOOK_PREDICT_OFFICIAL_CONTRACT_INFO.md](./DEEPBOOK_PREDICT_OFFICIAL_CONTRACT_INFO.md) | Official-derived Testnet contract/config/endpoint/entrypoint reference | Protocol reference |
| [DEEPBOOK_PREDICT_PUBLIC_SERVER_DISCOVERY.md](./DEEPBOOK_PREDICT_PUBLIC_SERVER_DISCOVERY.md) | Phase 1A public server endpoint and oracle discovery snapshot | Protocol reference |
| [DEEPBOOK_PREDICT_RESPONSE_SHAPES.md](./DEEPBOOK_PREDICT_RESPONSE_SHAPES.md) | Compact observed public server response shape reference | Protocol reference |
| [PREDICT_MANAGER_FLOW.md](./PREDICT_MANAGER_FLOW.md) | Phase 1B wallet, Predict Account, and DUSDC deposit flow | Protocol / SDK / frontend |
| [PREDICT_MANAGER_TESTNET_VALIDATION.md](./PREDICT_MANAGER_TESTNET_VALIDATION.md) | Phase 1B Testnet create/deposit/readback validation | Protocol / SDK / validation |
| [RANGE_MINT_TESTNET_VALIDATION.md](./RANGE_MINT_TESTNET_VALIDATION.md) | Range quote and gated mint validation | Protocol / SDK / validation |
| [PORTFOLIO_READBACK_TESTNET_VALIDATION.md](./PORTFOLIO_READBACK_TESTNET_VALIDATION.md) | Portfolio and range-position readback validation | Protocol / SDK / validation |
| [RANGE_REDEEM_TESTNET_VALIDATION.md](./RANGE_REDEEM_TESTNET_VALIDATION.md) | Range redeem preflight, execution, event, and readback validation | Protocol / SDK / validation |
| [RANGE_QUOTEABILITY_INVESTIGATION.md](./RANGE_QUOTEABILITY_INVESTIGATION.md) | Quoteable range scanner methodology and blockers | Protocol / SDK / validation |
| [RANGE_QUOTE_UNITS_AND_DECODING.md](./RANGE_QUOTE_UNITS_AND_DECODING.md) | Quantity-unit, return-decoding, binary quote, and range-selection validation | Protocol / SDK / validation |
| [MINTABILITY_PREFLIGHT_AND_ASK_BOUNDS.md](./MINTABILITY_PREFLIGHT_AND_ASK_BOUNDS.md) | Mintability preflight and ask-bounds validation | Protocol / SDK / validation |
| [MINTABILITY_SOURCE_ANALYSIS.md](./MINTABILITY_SOURCE_ANALYSIS.md) | Source-level quote-vs-mint mintability analysis | Protocol / SDK / validation |
| [DEEPBOOK_PREDICT_MINTABILITY_DEBUG_REPORT.md](./DEEPBOOK_PREDICT_MINTABILITY_DEBUG_REPORT.md) | Share-safe DeepBook team debug report for mintability blockers | Protocol / SDK / validation |
| [ENTRYPOINT_BINDINGS_PLAN.md](./ENTRYPOINT_BINDINGS_PLAN.md) | SDK/PTB entrypoint binding confirmation checklist, now including DeepVol binary requirements | Protocol / SDK / PTB |
| [AGENT_WORKFLOW.md](./AGENT_WORKFLOW.md) | Per-round workflow, Plan Mode, git, uncertainty, ADR rules | Agent workflow |
| [SKILL_USAGE_GUIDE.md](./SKILL_USAGE_GUIDE.md) | Skill selection guide and found/not-found skill inventory | Agent workflow |
| [GUIDED_RANGE_TRADING_MVP.md](./GUIDED_RANGE_TRADING_MVP.md) | Prior browser-wallet guided range trading scaffold scope and gates | Product / SDK / frontend |
| [BROWSER_WALLET_MANUAL_VALIDATION_FIXES.md](./BROWSER_WALLET_MANUAL_VALIDATION_FIXES.md) | Phase 2B browser candidate scan and portfolio RangeKey recovery fixes | Product / SDK / frontend / validation |
| [BROWSER_WALLET_TESTNET_VALIDATION.md](./BROWSER_WALLET_TESTNET_VALIDATION.md) | Manual browser-wallet Testnet create/deposit/mint/portfolio/redeem validation notes | Product / SDK / frontend / validation |
| [BUSINESS_MODEL.md](./BUSINESS_MODEL.md) | Current business model overview, now reframed toward DeepVol Create Fee | Product / business |
| [WRAPPER_CONTRACT_ARCHITECTURE.md](./WRAPPER_CONTRACT_ARCHITECTURE.md) | Route B wrapper architecture and reusable wrapper/fee patterns | Move / protocol / product |
| [WRAPPER_PUBLISH_READINESS.md](./WRAPPER_PUBLISH_READINESS.md) | Wrapper publish-readiness checklist and deployment values | Move / protocol / product |
| [WRAPPER_TESTNET_PUBLISH_RESULT.md](./WRAPPER_TESTNET_PUBLISH_RESULT.md) | Wrapper deployment, ProtocolVault setup, and first wrapper follow result | Move / protocol / validation |
| [WRAPPER_FOLLOW_TESTNET_VALIDATION.md](./WRAPPER_FOLLOW_TESTNET_VALIDATION.md) | First wrapper follow execution, event, fee, and position validation record | Move / protocol / validation |
| [PROTOCOL_VAULT_DESIGN.md](./PROTOCOL_VAULT_DESIGN.md) | ProtocolVault and AdminCap fee custody design, reusable for DeepVol Create Fee | Move / protocol / product |
| [CREATOR_STRATEGY_PRODUCT_FLOW.md](./CREATOR_STRATEGY_PRODUCT_FLOW.md) | Prior creator strategy discovery, follow, and analytics flow | Legacy product |
| [FOLLOW_STRATEGY_TRANSACTION_FLOW.md](./FOLLOW_STRATEGY_TRANSACTION_FLOW.md) | Prior Route B follow transaction rules and preflight gates | Legacy Move / SDK / protocol |
| [STRATEGY_DATA_MODEL.md](./STRATEGY_DATA_MODEL.md) | Prior Strategy object and event model | Legacy Move / SDK / product |
| [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) | Current roadmap from DeepVol foundation to validation and UI | Product / engineering |
| [PROTOCOL_INTEGRATION_NOTES.md](./PROTOCOL_INTEGRATION_NOTES.md) | Confirmed Testnet config, runtime checklist, and DeepVol binary dependency notes | Protocol / engineering |
| [ADR/0001-architecture-documentation-first.md](./ADR/0001-architecture-documentation-first.md) | Decision record for documentation-first architecture | ADR |
| [ADR/0002-wrapper-internal-mint-route-b.md](./ADR/0002-wrapper-internal-mint-route-b.md) | Decision record accepting Route B wrapper internal mint architecture | ADR / prior architecture |
| [../CLAUDE.md](../CLAUDE.md) | Root guidance for agents working in this repo | Agent workflow |

## Recommended reading order

### First 15 minutes

1. [../CLAUDE.md](../CLAUDE.md)
2. [ARCHITECTURE_INDEX.md](./ARCHITECTURE_INDEX.md)
3. [DEEPVOL_PRODUCT_DIRECTION.md](./DEEPVOL_PRODUCT_DIRECTION.md)
4. [DEEPVOL_PRIMITIVES_AND_RECEIPTS.md](./DEEPVOL_PRIMITIVES_AND_RECEIPTS.md)
5. [DEEPVOL_MVP_SCOPE.md](./DEEPVOL_MVP_SCOPE.md)
6. [ADR/0003-pivot-to-deepvol-btc-move.md](./ADR/0003-pivot-to-deepvol-btc-move.md)

### Before DeepVol protocol work

1. [DEEPVOL_PROTOCOL_ARCHITECTURE.md](./DEEPVOL_PROTOCOL_ARCHITECTURE.md)
2. [DEEPVOL_DATA_MODEL.md](./DEEPVOL_DATA_MODEL.md)
3. [DEEPVOL_MOVE_RECEIPT_CONTRACT.md](./DEEPVOL_MOVE_RECEIPT_CONTRACT.md)
4. [DEEPVOL_CONTRACT_BUILD_VALIDATION.md](./DEEPVOL_CONTRACT_BUILD_VALIDATION.md)
5. [DEEPVOL_BINARY_LEG_INTEGRATION.md](./DEEPVOL_BINARY_LEG_INTEGRATION.md)
6. [DEEPVOL_BINARY_MINT_TESTNET_VALIDATION.md](./DEEPVOL_BINARY_MINT_TESTNET_VALIDATION.md)
7. [DEEPVOL_TESTNET_PUBLISH_RESULT.md](./DEEPVOL_TESTNET_PUBLISH_RESULT.md)
8. [DEEPVOL_BUY_MOVE_RECEIPT_TESTNET_VALIDATION.md](./DEEPVOL_BUY_MOVE_RECEIPT_TESTNET_VALIDATION.md)
9. [DEEPVOL_BROWSER_BUY_VALIDATION.md](./DEEPVOL_BROWSER_BUY_VALIDATION.md)
10. [DEEPVOL_PRIMITIVE_EXECUTION_POLICY.md](./DEEPVOL_PRIMITIVE_EXECUTION_POLICY.md)
11. [DEEPVOL_PREDICT_PRIMITIVES_FRONTEND.md](./DEEPVOL_PREDICT_PRIMITIVES_FRONTEND.md)
12. [DEEPVOL_PRIMITIVE_QUOTE_PREFLIGHT.md](./DEEPVOL_PRIMITIVE_QUOTE_PREFLIGHT.md)
13. [DEEPVOL_REDEEM_AND_SETTLEMENT_FLOW.md](./DEEPVOL_REDEEM_AND_SETTLEMENT_FLOW.md)
11. [DEEPVOL_REDEEM_PREFLIGHT_VALIDATION.md](./DEEPVOL_REDEEM_PREFLIGHT_VALIDATION.md)
12. [DEEPVOL_FRONTEND_MVP.md](./DEEPVOL_FRONTEND_MVP.md)
13. [DEEPBOOK_PREDICT_OFFICIAL_CONTRACT_INFO.md](./DEEPBOOK_PREDICT_OFFICIAL_CONTRACT_INFO.md)
11. [ENTRYPOINT_BINDINGS_PLAN.md](./ENTRYPOINT_BINDINGS_PLAN.md)
12. [PROTOCOL_INTEGRATION_NOTES.md](./PROTOCOL_INTEGRATION_NOTES.md)
13. [RANGE_QUOTE_UNITS_AND_DECODING.md](./RANGE_QUOTE_UNITS_AND_DECODING.md) for prior binary quote investigation
14. [WRAPPER_FOLLOW_TESTNET_VALIDATION.md](./WRAPPER_FOLLOW_TESTNET_VALIDATION.md) for prior wrapper composition evidence
15. [PROTOCOL_VAULT_DESIGN.md](./PROTOCOL_VAULT_DESIGN.md) for reusable fee treasury design

### Before DeepBook Predict work

1. [deepbook_predict_模块架构解析.md](./deepbook_predict_模块架构解析.md)
2. [DEEPBOOK_PREDICT_OFFICIAL_CONTRACT_INFO.md](./DEEPBOOK_PREDICT_OFFICIAL_CONTRACT_INFO.md)
3. [DEEPBOOK_PREDICT_PUBLIC_SERVER_DISCOVERY.md](./DEEPBOOK_PREDICT_PUBLIC_SERVER_DISCOVERY.md)
4. [DEEPBOOK_PREDICT_RESPONSE_SHAPES.md](./DEEPBOOK_PREDICT_RESPONSE_SHAPES.md)
5. [PREDICT_MANAGER_FLOW.md](./PREDICT_MANAGER_FLOW.md)
6. [PREDICT_MANAGER_TESTNET_VALIDATION.md](./PREDICT_MANAGER_TESTNET_VALIDATION.md)
7. [ENTRYPOINT_BINDINGS_PLAN.md](./ENTRYPOINT_BINDINGS_PLAN.md)
8. [PROTOCOL_INTEGRATION_NOTES.md](./PROTOCOL_INTEGRATION_NOTES.md)

### Before UI/product work

1. [DEEPVOL_PRODUCT_DIRECTION.md](./DEEPVOL_PRODUCT_DIRECTION.md)
2. [DEEPVOL_PRIMITIVES_AND_RECEIPTS.md](./DEEPVOL_PRIMITIVES_AND_RECEIPTS.md)
3. [DEEPVOL_MVP_SCOPE.md](./DEEPVOL_MVP_SCOPE.md)
4. [DEEPVOL_PROTOCOL_ARCHITECTURE.md](./DEEPVOL_PROTOCOL_ARCHITECTURE.md)
5. [DEEPVOL_FRONTEND_MVP.md](./DEEPVOL_FRONTEND_MVP.md)
6. [DEEPVOL_PRIMITIVE_EXECUTION_POLICY.md](./DEEPVOL_PRIMITIVE_EXECUTION_POLICY.md)
7. [DEEPVOL_PREDICT_PRIMITIVES_FRONTEND.md](./DEEPVOL_PREDICT_PRIMITIVES_FRONTEND.md)
8. [DEEPVOL_PRIMITIVE_QUOTE_PREFLIGHT.md](./DEEPVOL_PRIMITIVE_QUOTE_PREFLIGHT.md)
9. [DEEPVOL_BROWSER_BUY_VALIDATION.md](./DEEPVOL_BROWSER_BUY_VALIDATION.md)
8. [DEEPVOL_REDEEM_AND_SETTLEMENT_FLOW.md](./DEEPVOL_REDEEM_AND_SETTLEMENT_FLOW.md)
9. [DEEPVOL_REDEEM_PREFLIGHT_VALIDATION.md](./DEEPVOL_REDEEM_PREFLIGHT_VALIDATION.md)
10. [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md)
9. [GUIDED_RANGE_TRADING_MVP.md](./GUIDED_RANGE_TRADING_MVP.md) only as prior scaffold/reference, not current MVP direction

### Before agent-led implementation rounds

1. [AGENT_WORKFLOW.md](./AGENT_WORKFLOW.md)
2. [SKILL_USAGE_GUIDE.md](./SKILL_USAGE_GUIDE.md)
3. [DEEPVOL_MVP_SCOPE.md](./DEEPVOL_MVP_SCOPE.md)
4. [PROTOCOL_INTEGRATION_NOTES.md](./PROTOCOL_INTEGRATION_NOTES.md)
5. [DEEPBOOK_PREDICT_OFFICIAL_CONTRACT_INFO.md](./DEEPBOOK_PREDICT_OFFICIAL_CONTRACT_INFO.md)
6. [ENTRYPOINT_BINDINGS_PLAN.md](./ENTRYPOINT_BINDINGS_PLAN.md)

## Documentation categories

| Category | Primary docs |
|---|---|
| DeepVol product | DeepVol product direction, primitives and receipts, MVP scope, primitive execution policy, Predict primitives frontend, primitive quote/preflight, frontend MVP, browser buy validation, browser redeem validation, redeem and settlement flow, redeem preflight validation, protocol architecture, data model, business model, ADR-0003 |
| Protocol | Protocol analysis, source documents, architecture map, protocol integration notes, official contract info, binary leg integration, wrapper contract architecture |
| Protocol reference | Official contract info, entrypoint bindings plan, public server discovery, response shapes |
| SDK / PTB | Binary leg integration, official contract info, PredictManager flow, PredictManager validation, range validation docs, entrypoint bindings plan, protocol integration notes |
| Prior RangePilot validation | Guided range trading MVP, range mint/redeem validation, wrapper architecture, wrapper publish result, wrapper follow validation, ProtocolVault design |
| Engineering | Implementation roadmap, protocol integration notes, DeepVol frontend MVP, DeepVol protocol architecture, DeepVol data model |
| Agent workflow | Root `CLAUDE.md`, agent workflow, skill usage guide, source documents |
| ADR | ADR-0001, ADR-0002, ADR-0003 |

## Task-to-required-doc map

| Task type | Required docs before work |
|---|---|
| DeepVol BTC MOVE product work | DeepVol product direction, primitives and receipts, MVP scope, frontend MVP, business model, ADR-0003 |
| DeepVol Move/data model work | DeepVol protocol architecture, data model, MoveReceipt contract, contract build validation, Testnet publish result, buy receipt validation, binary leg integration, official contract info, entrypoint bindings plan |
| DeepVol binary quote/mint/redeem validation | Binary leg integration, mintable MOVE range, fresh MOVE buy validation, buy receipt validation, redeem preflight validation, official contract info, protocol integration notes, entrypoint bindings plan, PredictManager flow, range quote units and decoding |
| DeepVol SDK transaction builders | Binary leg integration, mintable MOVE range, buy receipt validation, official contract info, entrypoint bindings plan, protocol integration notes, Sui transaction-building docs/skills |
| DeepVol portfolio/settlement UX | DeepVol frontend MVP, fresh MOVE buy validation, browser buy validation, browser redeem validation, redeem and settlement flow, redeem preflight validation, DeepVol protocol architecture, data model, binary leg integration, PredictManager validation, protocol integration notes |
| DeepVol Predict primitives frontend | DeepVol product direction, primitives and receipts, primitive execution policy, Predict primitives frontend, primitive quote/preflight, PredictManager UX, primitive Portfolio positions, primitive active market discovery, RANGE mintability diagnostics, mintability runtime diagnostics, old UI trading state machine, MVP scope, frontend MVP, protocol integration notes, entrypoint bindings plan |
| Prior guided range UI maintenance | Guided range trading MVP, range mint validation, portfolio readback validation, range redeem validation, browser wallet fixes |
| Prior wrapper/follow maintenance | Wrapper contract architecture, wrapper publish result, wrapper follow validation, ProtocolVault design, follow strategy transaction flow, strategy data model, ADR-0002 |
| New ADR | Agent workflow, source documents, existing ADRs |
| Agent skill selection | Skill usage guide, agent workflow |
| Any git operation | Agent workflow, root `CLAUDE.md` |

## Local source snapshot note

`frontend-monorepo/` is local Balancer v3 frontend source for UI/UX reference only. It informed DeepVol-7 app shell, transaction-card, accordion, portfolio, and responsive layout patterns. It is ignored and must not be staged or committed; use it for interaction and layout ideas, not as copied project source.

`deepbookv3-predict-package/predict` is a non-committed local DeepBook Predict source snapshot used for Phase 1C-debug source-level diagnostics. `deepbookv3-predict-testnet-4-16/` is the full non-committed local DeepBookV3 Testnet source snapshot used for source-level debugging/reference. These snapshots may be read and cited by relative path when explicitly needed, but they must not be staged or committed. The formal RangePilot wrapper dependency source is the official DeepBookV3 Git repository with Testnet dep-replacements, not a local snapshot path; official docs remain the deployment/config source of truth.

## Global anti-invention rules

- Mark unknown details as `TBD`.
- Mark runtime market state as `MUST CONFIRM AT RUNTIME`.
- Mark chain/runtime or transaction-building details as `MUST CONFIRM BEFORE CODING`.
- Use confirmed Testnet deployment values only from [DEEPBOOK_PREDICT_OFFICIAL_CONTRACT_INFO.md](./DEEPBOOK_PREDICT_OFFICIAL_CONTRACT_INFO.md), [PROTOCOL_INTEGRATION_NOTES.md](./PROTOCOL_INTEGRATION_NOTES.md), and relevant validation records.
- Do not invent or replace package IDs, shared object IDs, quote asset coin types, oracle IDs, market/expiry values, PredictManager discovery method, Move entrypoint signatures, RangeKey/MarketKey layout, quote preview return shape, or public server response schemas.
- Do not treat the public server as a transaction write path.
- Use local file references and section names in generated docs; the official contract info doc is the local place to preserve primary official reference links.

## Global no-rewrite rules

DeepVol and RangePilot must use official DeepBook Predict pricing, oracle, vault, and settlement logic.

Do not reimplement:

- pricing or SVI pricing;
- oracle settlement;
- vault risk logic;
- StrikeMatrix logic;
- custom payout rules;
- custom prediction market protocol behavior.

DeepVol may build volatility product structure, transaction construction, receipt metadata, read normalization, portfolio visualization, fee collection, and settlement guidance around the official protocol.
