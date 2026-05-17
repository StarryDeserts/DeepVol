---
Purpose: Navigation index for RangePilot architecture documentation.
Audience: Developers, product contributors, reviewers, and AI agents.
Status: Generated documentation; approved for current main branch.
Source of truth relationship: Indexes local source-of-truth documents, official-derived protocol references, and generated companion docs; does not replace source docs.
---

# Architecture Index

RangePilot is a guided prediction terminal and creator strategy layer for DeepBook Predict. This index tells contributors which documents to read, what each document is allowed to justify, and which rules apply before implementation.

## Source-of-truth documents and official-derived references

| Document | Authority | Use when |
|---|---|---|
| [range_pilot_product_architecture_spec.md](./range_pilot_product_architecture_spec.md) | Product, business, UX, MVP scope, engineering intent | Defining user flows, MVP priorities, product positioning, page structure, transaction lifecycle expectations |
| [deepbook_predict_模块架构解析.md](./deepbook_predict_模块架构解析.md) | Protocol architecture analysis and DeepBook Predict mental model | Mapping protocol objects, preserving pricing/oracle/vault/settlement invariants, understanding read/write surfaces |
| [DEEPBOOK_PREDICT_OFFICIAL_CONTRACT_INFO.md](./DEEPBOOK_PREDICT_OFFICIAL_CONTRACT_INFO.md) | Official-derived contract/config/endpoint/entrypoint integration reference | Confirmed Testnet deployment config, public server endpoints, entrypoint planning, and official-reference conflict checks |

Do not edit the product or protocol-analysis source docs for normal implementation tasks unless the user explicitly requests source-doc maintenance. If official Testnet config or entrypoint references conflict with older analysis notes, prefer the official-derived contract info while keeping runtime market state subject to live confirmation.

## Generated documentation set

| Document | Purpose | Category |
|---|---|---|
| [ARCHITECTURE_INDEX.md](./ARCHITECTURE_INDEX.md) | Entry point, reading order, doc map, global rules | Engineering / agent workflow |
| [SOURCE_DOCUMENTS.md](./SOURCE_DOCUMENTS.md) | Authority boundaries and local citation policy | Engineering / protocol |
| [DEEPBOOK_PREDICT_ARCHITECTURE_MAP.md](./DEEPBOOK_PREDICT_ARCHITECTURE_MAP.md) | Protocol object map and RangePilot product mapping | Protocol / product |
| [DEEPBOOK_PREDICT_OFFICIAL_CONTRACT_INFO.md](./DEEPBOOK_PREDICT_OFFICIAL_CONTRACT_INFO.md) | Official-derived Testnet contract/config/endpoint/entrypoint reference | Protocol Reference / Official Contract Info |
| [DEEPBOOK_PREDICT_PUBLIC_SERVER_DISCOVERY.md](./DEEPBOOK_PREDICT_PUBLIC_SERVER_DISCOVERY.md) | Phase 1A public server endpoint and oracle discovery snapshot | Protocol Reference / Public Server Discovery |
| [DEEPBOOK_PREDICT_RESPONSE_SHAPES.md](./DEEPBOOK_PREDICT_RESPONSE_SHAPES.md) | Compact observed public server response shape reference | Protocol Reference / Public Server Schema |
| [PREDICT_MANAGER_FLOW.md](./PREDICT_MANAGER_FLOW.md) | Phase 1B wallet, Predict Account, and DUSDC deposit flow | Protocol / SDK / Frontend |
| [PREDICT_MANAGER_TESTNET_VALIDATION.md](./PREDICT_MANAGER_TESTNET_VALIDATION.md) | Phase 1B-Verify Testnet create/deposit/readback validation artifacts | Protocol / SDK / Validation |
| [RANGE_MINT_TESTNET_VALIDATION.md](./RANGE_MINT_TESTNET_VALIDATION.md) | Phase 1C range quote and gated mint validation artifacts or blockers | Protocol / SDK / Validation |
| [PORTFOLIO_READBACK_TESTNET_VALIDATION.md](./PORTFOLIO_READBACK_TESTNET_VALIDATION.md) | Phase 1D-1 portfolio and range-position readback validation artifacts | Protocol / SDK / Validation |
| [RANGE_REDEEM_TESTNET_VALIDATION.md](./RANGE_REDEEM_TESTNET_VALIDATION.md) | Phase 1D-2 range redeem preflight, execution, event, and post-redeem readback validation artifacts | Protocol / SDK / Validation |
| [RANGE_QUOTEABILITY_INVESTIGATION.md](./RANGE_QUOTEABILITY_INVESTIGATION.md) | Phase 1C-fix quoteable range scanner methodology, results, and blockers | Protocol / SDK / Validation |
| [RANGE_QUOTE_UNITS_AND_DECODING.md](./RANGE_QUOTE_UNITS_AND_DECODING.md) | Phase 1C-fix2 quantity-unit, return-decoding, binary quote, and range-selection validation | Protocol / SDK / Validation |
| [MINTABILITY_PREFLIGHT_AND_ASK_BOUNDS.md](./MINTABILITY_PREFLIGHT_AND_ASK_BOUNDS.md) | Phase 1C-fix3 mintability preflight and ask-bounds validation | Protocol / SDK / Validation |
| [MINTABILITY_SOURCE_ANALYSIS.md](./MINTABILITY_SOURCE_ANALYSIS.md) | Phase 1C-debug source-level quote-vs-mint mintability analysis | Protocol / SDK / Validation |
| [DEEPBOOK_PREDICT_MINTABILITY_DEBUG_REPORT.md](./DEEPBOOK_PREDICT_MINTABILITY_DEBUG_REPORT.md) | Share-safe DeepBook team debug report for mintability blockers | Protocol / SDK / Validation |
| [ENTRYPOINT_BINDINGS_PLAN.md](./ENTRYPOINT_BINDINGS_PLAN.md) | SDK/PTB entrypoint binding confirmation checklist | Protocol / SDK / PTB |
| [AGENT_WORKFLOW.md](./AGENT_WORKFLOW.md) | Per-round workflow, Plan Mode, git, uncertainty, ADR rules | Agent workflow |
| [SKILL_USAGE_GUIDE.md](./SKILL_USAGE_GUIDE.md) | Skill selection guide and found/not-found skill inventory | Agent workflow |
| [GUIDED_RANGE_TRADING_MVP.md](./GUIDED_RANGE_TRADING_MVP.md) | Phase 2A browser-wallet guided range trading scaffold scope, gates, flows, and manual validation checklist | Product / SDK / Frontend |
| [BROWSER_WALLET_MANUAL_VALIDATION_FIXES.md](./BROWSER_WALLET_MANUAL_VALIDATION_FIXES.md) | Phase 2B browser candidate scan and portfolio RangeKey recovery fixes | Product / SDK / Frontend / Validation |
| [BROWSER_WALLET_TESTNET_VALIDATION.md](./BROWSER_WALLET_TESTNET_VALIDATION.md) | Manual browser-wallet Testnet create/deposit/mint/portfolio/redeem validation notes | Product / SDK / Frontend / Validation |
| [BUSINESS_MODEL.md](./BUSINESS_MODEL.md) | Creator strategy business model, fee separation, and DeepBook Predict dependency boundary | Product / business |
| [WRAPPER_CONTRACT_ARCHITECTURE.md](./WRAPPER_CONTRACT_ARCHITECTURE.md) | Route B wrapper contract architecture and DeepBook Predict boundary | Move / protocol / product |
| [WRAPPER_PUBLISH_READINESS.md](./WRAPPER_PUBLISH_READINESS.md) | Phase 3D wrapper publish-readiness checklist, dependency policy, ProtocolVault policy, and pre-publish blockers | Move / protocol / product |
| [PROTOCOL_VAULT_DESIGN.md](./PROTOCOL_VAULT_DESIGN.md) | RangePilot ProtocolVault and AdminCap fee custody design | Move / protocol / product |
| [CREATOR_STRATEGY_PRODUCT_FLOW.md](./CREATOR_STRATEGY_PRODUCT_FLOW.md) | Creator strategy discovery, preview, follow, portfolio-linking, and creator analytics flow | Product |
| [FOLLOW_STRATEGY_TRANSACTION_FLOW.md](./FOLLOW_STRATEGY_TRANSACTION_FLOW.md) | Route B follow transaction inputs, validation order, atomic fee/mint behavior, and preflight rules | Move / SDK / protocol |
| [STRATEGY_DATA_MODEL.md](./STRATEGY_DATA_MODEL.md) | Strategy object, events, metadata, fee, and indexer mapping model | Move / SDK / product |
| [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) | Phased implementation plan from docs to demo polish | Product / engineering |
| [PROTOCOL_INTEGRATION_NOTES.md](./PROTOCOL_INTEGRATION_NOTES.md) | Confirmed Testnet config and runtime-confirmation checklist | Protocol / engineering |
| [ADR/0001-architecture-documentation-first.md](./ADR/0001-architecture-documentation-first.md) | Decision record for documentation-first architecture | ADR |
| [ADR/0002-wrapper-internal-mint-route-b.md](./ADR/0002-wrapper-internal-mint-route-b.md) | Decision record accepting Route B wrapper internal mint architecture | ADR |
| [../CLAUDE.md](../CLAUDE.md) | Root guidance for agents working in this repo | Agent workflow |

## Recommended reading order

### First 15 minutes

1. [../CLAUDE.md](../CLAUDE.md)
2. [ARCHITECTURE_INDEX.md](./ARCHITECTURE_INDEX.md)
3. [SOURCE_DOCUMENTS.md](./SOURCE_DOCUMENTS.md)
4. Product spec sections: `Executive Summary`, `Goals and Non-Goals`, `Recommended MVP Decision`, `Final Positioning`

### Before DeepBook Predict work

1. [range_pilot_product_architecture_spec.md](./range_pilot_product_architecture_spec.md)
2. [deepbook_predict_模块架构解析.md](./deepbook_predict_模块架构解析.md)
3. [DEEPBOOK_PREDICT_OFFICIAL_CONTRACT_INFO.md](./DEEPBOOK_PREDICT_OFFICIAL_CONTRACT_INFO.md)
4. [DEEPBOOK_PREDICT_PUBLIC_SERVER_DISCOVERY.md](./DEEPBOOK_PREDICT_PUBLIC_SERVER_DISCOVERY.md)
5. [DEEPBOOK_PREDICT_RESPONSE_SHAPES.md](./DEEPBOOK_PREDICT_RESPONSE_SHAPES.md)
6. [PREDICT_MANAGER_FLOW.md](./PREDICT_MANAGER_FLOW.md)
7. [PREDICT_MANAGER_TESTNET_VALIDATION.md](./PREDICT_MANAGER_TESTNET_VALIDATION.md)
8. [RANGE_MINT_TESTNET_VALIDATION.md](./RANGE_MINT_TESTNET_VALIDATION.md)
9. [RANGE_QUOTEABILITY_INVESTIGATION.md](./RANGE_QUOTEABILITY_INVESTIGATION.md)
10. [RANGE_QUOTE_UNITS_AND_DECODING.md](./RANGE_QUOTE_UNITS_AND_DECODING.md)
11. [MINTABILITY_PREFLIGHT_AND_ASK_BOUNDS.md](./MINTABILITY_PREFLIGHT_AND_ASK_BOUNDS.md)
12. [MINTABILITY_SOURCE_ANALYSIS.md](./MINTABILITY_SOURCE_ANALYSIS.md)
13. [DEEPBOOK_PREDICT_MINTABILITY_DEBUG_REPORT.md](./DEEPBOOK_PREDICT_MINTABILITY_DEBUG_REPORT.md)
14. [PORTFOLIO_READBACK_TESTNET_VALIDATION.md](./PORTFOLIO_READBACK_TESTNET_VALIDATION.md)
15. [RANGE_REDEEM_TESTNET_VALIDATION.md](./RANGE_REDEEM_TESTNET_VALIDATION.md)
16. [ENTRYPOINT_BINDINGS_PLAN.md](./ENTRYPOINT_BINDINGS_PLAN.md)
17. [DEEPBOOK_PREDICT_ARCHITECTURE_MAP.md](./DEEPBOOK_PREDICT_ARCHITECTURE_MAP.md)
18. [PROTOCOL_INTEGRATION_NOTES.md](./PROTOCOL_INTEGRATION_NOTES.md)
19. [WRAPPER_CONTRACT_ARCHITECTURE.md](./WRAPPER_CONTRACT_ARCHITECTURE.md) before wrapper, creator strategy, or follow-strategy work
20. [PROTOCOL_VAULT_DESIGN.md](./PROTOCOL_VAULT_DESIGN.md) before wrapper fee custody or ProtocolVault work
21. [FOLLOW_STRATEGY_TRANSACTION_FLOW.md](./FOLLOW_STRATEGY_TRANSACTION_FLOW.md) before Route B transaction-builder work

### Before UI/product work

1. Product spec sections: `Core User Flows`, `UX Design Principles`, `Page Information Architecture`, `Component Specification`
2. [DEEPBOOK_PREDICT_ARCHITECTURE_MAP.md](./DEEPBOOK_PREDICT_ARCHITECTURE_MAP.md) for protocol naming and boundaries
3. [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) for phase scope
4. [GUIDED_RANGE_TRADING_MVP.md](./GUIDED_RANGE_TRADING_MVP.md) for browser-wallet scaffold gates and manual validation
5. [BROWSER_WALLET_MANUAL_VALIDATION_FIXES.md](./BROWSER_WALLET_MANUAL_VALIDATION_FIXES.md) for Phase 2B scan/recovery fixes

### Before agent-led implementation rounds

1. [AGENT_WORKFLOW.md](./AGENT_WORKFLOW.md)
2. [SKILL_USAGE_GUIDE.md](./SKILL_USAGE_GUIDE.md)
3. [PROTOCOL_INTEGRATION_NOTES.md](./PROTOCOL_INTEGRATION_NOTES.md) for any transaction or chain detail
4. [DEEPBOOK_PREDICT_OFFICIAL_CONTRACT_INFO.md](./DEEPBOOK_PREDICT_OFFICIAL_CONTRACT_INFO.md) and [ENTRYPOINT_BINDINGS_PLAN.md](./ENTRYPOINT_BINDINGS_PLAN.md) for DeepBook Predict SDK/PTB/integration work

## Documentation categories

| Category | Primary docs |
|---|---|
| Product | Product spec, architecture map, implementation roadmap, guided range trading MVP guide, browser wallet manual validation fixes, business model, ProtocolVault design, creator strategy product flow |
| Protocol | Protocol analysis, source documents, architecture map, protocol integration notes, official contract info, wrapper contract architecture |
| Protocol Reference / Official Contract Info | Official contract info, entrypoint bindings plan |
| SDK / PTB | Official contract info, PredictManager flow, PredictManager Testnet validation, Range Mint Testnet validation, entrypoint bindings plan, protocol integration notes, follow strategy transaction flow |
| Engineering | Product spec implementation sections, architecture map, implementation roadmap, protocol integration notes, wrapper contract architecture, strategy data model |
| Agent workflow | Root `CLAUDE.md`, agent workflow, skill usage guide, source documents |
| ADR | `docs/ADR/0001-architecture-documentation-first.md`, `docs/ADR/0002-wrapper-internal-mint-route-b.md` |

## Task-to-required-doc map

| Task type | Required docs before work |
|---|---|
| Guided SUI range prediction UI | Product spec, architecture map, implementation roadmap, guided range trading MVP guide, browser wallet manual validation fixes |
| DeepBook Predict integration spike | Product spec, protocol analysis, official contract info, entrypoint bindings plan, architecture map, protocol integration notes |
| DeepBook Predict transaction builder / PTB | Product spec, protocol analysis, official contract info, entrypoint bindings plan, architecture map, protocol integration notes |
| SDK binding planning | Official contract info, entrypoint bindings plan, protocol integration notes, source documents |
| PredictManager load/create/deposit | Product spec, protocol analysis, official contract info, PredictManager flow, PredictManager Testnet validation, entrypoint bindings plan, architecture map, protocol integration notes |
| Quote preview | Product spec, protocol analysis, official contract info, entrypoint bindings plan, architecture map, protocol integration notes |
| Portfolio/redeem/claim | Product spec, protocol analysis, official contract info, entrypoint bindings plan, portfolio readback validation, range redeem validation, guided range trading MVP guide, browser wallet manual validation fixes, architecture map, protocol integration notes |
| Creator strategy wrapper / follow flow | Product spec, business model, wrapper contract architecture, ProtocolVault design, creator strategy product flow, follow strategy transaction flow, strategy data model, ADR 0002, official contract info, entrypoint bindings plan, protocol integration notes |
| Creator strategy pages | Product spec, business model, creator strategy product flow, strategy data model, architecture map, implementation roadmap |
| Vault / LP dashboard | Product spec, protocol analysis, official contract info, entrypoint bindings plan, architecture map, protocol integration notes |
| New ADR | Agent workflow, source documents, existing ADRs |
| Agent skill selection | Skill usage guide, agent workflow |
| Any git operation | Agent workflow, root `CLAUDE.md` |

## Local source snapshot note

`deepbookv3-predict-package/predict` is a non-committed local DeepBook Predict source snapshot used for Phase 1C-debug source-level diagnostics. `deepbookv3-predict-testnet-4-16/` is the full non-committed local DeepBookV3 Testnet source snapshot used for source-level debugging/reference. These snapshots may be read and cited by relative path, but they must not be staged or committed. The formal RangePilot wrapper dependency source is the official DeepBookV3 Git repository with Testnet dep-replacements, not a local snapshot path; official docs remain the deployment/config source of truth.

## Global anti-invention rules

- Mark unknown details as `TBD`.
- Mark chain/runtime or transaction-building details as `MUST CONFIRM BEFORE CODING`.
- Use confirmed Testnet deployment values only from [DEEPBOOK_PREDICT_OFFICIAL_CONTRACT_INFO.md](./DEEPBOOK_PREDICT_OFFICIAL_CONTRACT_INFO.md) and [PROTOCOL_INTEGRATION_NOTES.md](./PROTOCOL_INTEGRATION_NOTES.md).
- Do not invent or replace package IDs, shared object IDs, quote asset coin types, oracle IDs, market/expiry values, PredictManager discovery method, Move entrypoint signatures, RangeKey/MarketKey binary layout, quote preview return shape, or public server response schemas.
- Do not treat the public server as a transaction write path.
- Use local file references and section names in generated docs; the official contract info doc is the local place to preserve primary official reference links.

## Global no-rewrite rules

RangePilot must use official DeepBook Predict pricing, oracle, vault, and settlement logic.

Do not reimplement:

- pricing or SVI pricing
- oracle settlement
- vault risk logic
- StrikeMatrix logic
- custom payout rules
- custom prediction market protocol behavior

RangePilot may build UX, transaction construction, read normalization, portfolio visualization, creator strategy surfaces, and risk explanations around the official protocol.
