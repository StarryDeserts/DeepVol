---
Purpose: Navigation index for RangePilot and DeepVol architecture documentation.
Audience: Developers, product contributors, reviewers, and AI agents.
Status: Updated for the DeepVol BTC MOVE foundation refactor.
Source of truth relationship: Indexes local source-of-truth documents, official-derived protocol references, generated companion docs, and pivot ADRs; does not replace source docs.
---

# Architecture Index

DeepVol BTC MOVE is the new primary product direction. DeepVol is a Predict-native structured product layer on Sui: UP, DOWN, and RANGE are advanced primitives, while BTC MOVE Receipt is the primary composed product so users can trade movement, not direction.

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
| [ADR/0003-pivot-to-deepvol-btc-move.md](./ADR/0003-pivot-to-deepvol-btc-move.md) | Accepted pivot decision | Explaining why DeepVol supersedes creator-follow as the primary direction |

Do not edit the original product or protocol-analysis source docs for normal implementation tasks unless the user explicitly requests source-doc maintenance. If older RangePilot docs conflict with the DeepVol pivot, use the DeepVol foundation docs and ADR-0003 for current direction while preserving historical validation records.

## DeepVol foundation docs

| Document | Purpose | Category |
|---|---|---|
| [DEEPVOL_PRODUCT_DIRECTION.md](./DEEPVOL_PRODUCT_DIRECTION.md) | Defines DeepVol structured-product direction, pivot rationale, BTC-first scope, and receipt limitations | Product / strategy |
| [DEEPVOL_PRIMITIVES_AND_RECEIPTS.md](./DEEPVOL_PRIMITIVES_AND_RECEIPTS.md) | Explains primitives vs composed receipts, manual UP + DOWN, and productization value | Product / strategy |
| [DEEPVOL_MVP_SCOPE.md](./DEEPVOL_MVP_SCOPE.md) | Defines BTC-only MVP inclusions, exclusions, runtime assumptions, and future structure | Product / engineering |
| [DEEPVOL_PROTOCOL_ARCHITECTURE.md](./DEEPVOL_PROTOCOL_ARCHITECTURE.md) | Defines VolSeries, MoveReceipt, ProtocolVault, PredictManager, transaction/readback/settlement paths | Protocol / architecture |
| [DEEPVOL_DATA_MODEL.md](./DEEPVOL_DATA_MODEL.md) | Proposes VolSeries, MoveReceipt, and receipt lifecycle event fields | Move / SDK / product |
| [DEEPVOL_BINARY_LEG_INTEGRATION.md](./DEEPVOL_BINARY_LEG_INTEGRATION.md) | Records source-confirmed binary entrypoints, MarketKey construction, events, and validation blockers | Protocol / SDK / PTB |
| [DEEPVOL_BINARY_MINT_TESTNET_VALIDATION.md](./DEEPVOL_BINARY_MINT_TESTNET_VALIDATION.md) | Records the controlled Testnet binary mint round blocked before submission at CLI dry-run | Protocol / SDK / validation |
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
3. [DEEPVOL_BINARY_LEG_INTEGRATION.md](./DEEPVOL_BINARY_LEG_INTEGRATION.md)
4. [DEEPVOL_BINARY_MINT_TESTNET_VALIDATION.md](./DEEPVOL_BINARY_MINT_TESTNET_VALIDATION.md)
5. [DEEPBOOK_PREDICT_OFFICIAL_CONTRACT_INFO.md](./DEEPBOOK_PREDICT_OFFICIAL_CONTRACT_INFO.md)
5. [ENTRYPOINT_BINDINGS_PLAN.md](./ENTRYPOINT_BINDINGS_PLAN.md)
6. [PROTOCOL_INTEGRATION_NOTES.md](./PROTOCOL_INTEGRATION_NOTES.md)
7. [RANGE_QUOTE_UNITS_AND_DECODING.md](./RANGE_QUOTE_UNITS_AND_DECODING.md) for prior binary quote investigation
8. [WRAPPER_FOLLOW_TESTNET_VALIDATION.md](./WRAPPER_FOLLOW_TESTNET_VALIDATION.md) for prior wrapper composition evidence
9. [PROTOCOL_VAULT_DESIGN.md](./PROTOCOL_VAULT_DESIGN.md) for reusable fee treasury design

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
5. [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md)
6. [GUIDED_RANGE_TRADING_MVP.md](./GUIDED_RANGE_TRADING_MVP.md) only as prior scaffold/reference, not current MVP direction

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
| DeepVol product | DeepVol product direction, primitives and receipts, MVP scope, protocol architecture, data model, business model, ADR-0003 |
| Protocol | Protocol analysis, source documents, architecture map, protocol integration notes, official contract info, binary leg integration, wrapper contract architecture |
| Protocol reference | Official contract info, entrypoint bindings plan, public server discovery, response shapes |
| SDK / PTB | Binary leg integration, official contract info, PredictManager flow, PredictManager validation, range validation docs, entrypoint bindings plan, protocol integration notes |
| Prior RangePilot validation | Guided range trading MVP, range mint/redeem validation, wrapper architecture, wrapper publish result, wrapper follow validation, ProtocolVault design |
| Engineering | Implementation roadmap, protocol integration notes, DeepVol protocol architecture, DeepVol data model |
| Agent workflow | Root `CLAUDE.md`, agent workflow, skill usage guide, source documents |
| ADR | ADR-0001, ADR-0002, ADR-0003 |

## Task-to-required-doc map

| Task type | Required docs before work |
|---|---|
| DeepVol BTC MOVE product work | DeepVol product direction, primitives and receipts, MVP scope, business model, ADR-0003 |
| DeepVol Move/data model work | DeepVol protocol architecture, data model, binary leg integration, ProtocolVault design, official contract info, entrypoint bindings plan |
| DeepVol binary quote/mint/redeem validation | Binary leg integration, official contract info, protocol integration notes, entrypoint bindings plan, PredictManager flow, range quote units and decoding |
| DeepVol SDK transaction builders | Binary leg integration, official contract info, entrypoint bindings plan, protocol integration notes, Sui transaction-building docs/skills |
| DeepVol portfolio/settlement UX | DeepVol protocol architecture, data model, binary leg integration, PredictManager validation, protocol integration notes |
| Prior guided range UI maintenance | Guided range trading MVP, range mint validation, portfolio readback validation, range redeem validation, browser wallet fixes |
| Prior wrapper/follow maintenance | Wrapper contract architecture, wrapper publish result, wrapper follow validation, ProtocolVault design, follow strategy transaction flow, strategy data model, ADR-0002 |
| New ADR | Agent workflow, source documents, existing ADRs |
| Agent skill selection | Skill usage guide, agent workflow |
| Any git operation | Agent workflow, root `CLAUDE.md` |

## Local source snapshot note

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
