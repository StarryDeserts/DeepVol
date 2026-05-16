---
Purpose: Define the phased implementation roadmap for RangePilot.
Audience: Product engineers, protocol integrators, frontend developers, and project planners.
Status: Generated documentation; approved for current main branch.
Source of truth relationship: Derived from local product/protocol source docs and official-derived Testnet integration references; implementation details remain subject to confirmation.
---

# Implementation Roadmap

This roadmap has exactly seven phases, numbered 0-6. It prioritizes a real guided SUI range prediction flow before creator and LP layers.

## Phase 0: Documentation and workflow setup

| Field | Content |
|---|---|
| Goal | Establish source-bounded docs, agent workflow, skill usage, protocol unknowns, and ADR baseline. |
| Deliverables | Architecture index; source document guide; DeepBook Predict map; agent workflow; skill guide; roadmap; protocol notes; ADR; root `CLAUDE.md`. |
| Non-goals | No app scaffolding, no chain integration, no fake protocol config, no source-doc rewrites. |
| Acceptance criteria | Required docs exist; each starts with metadata block; unknowns are marked; git staging/commit/push follows explicit user approval; excluded files remain unstaged and untouched. |
| Recommended skills | `agent-skills:documentation-and-adrs`, `superpowers:writing-plans`. |
| Required docs | Product spec; protocol analysis; source documents; architecture index. |
| Risks and fallback | Risk: docs invent concrete details. Fallback: replace invented details with `TBD` / `MUST CONFIRM BEFORE CODING`. |

## Phase 1: Protocol integration spike

| Field | Content |
|---|---|
| Goal | Prove RangePilot can create/load a Predict Account, deposit quote, preview or handle quote unavailability, mint one range position, and read it back. |
| Deliverables | Minimal wallet app; confirmed Testnet config shell; public server discovery; transaction builder spike; one guided trade form; minimal portfolio read; integration findings. |
| Non-goals | Full landing page, creator strategy system, AI composer, PLP supply/withdraw, full indexer, custom Move wrapper. |
| Acceptance criteria | Confirmed Testnet config is used from official-derived docs; one network/config path can execute or clearly identify blocker; runtime market values are confirmed before coding; portfolio fallback documented if direct reads fail. |
| Recommended skills | `sui-dev-skills`, `sui-transaction-building`, `sui-client`, `sui-bcs`, Context7 plugin. |
| Required docs | Product spec; protocol analysis; architecture map; protocol integration notes; source documents; official contract info; entrypoint bindings plan. |
| Risks and fallback | Risk: active market, response schemas, or generated-binding call shapes unavailable. Fallback: stop implementation and produce confirmed blocker list; use demo UI only if clearly labeled. |

### Phase 1 subphases

| Subphase | Focus | Exit condition |
|---|---|---|
| Phase 1A: Official config + public server discovery | Centralize official Testnet config in code; call public server status, predict state, oracles, quote assets, ask bounds, and vault summary endpoints; capture response schemas in docs. | Documented public server response shapes and active oracle candidates as a runtime snapshot; ask bounds and full strike-grid validation remain blockers before mint UI. Next step: Phase 1B Wallet + PredictManager create/deposit. |
| Phase 1B: PredictManager create/deposit | Add wallet UI scaffold, DUSDC wallet balance read, local manager hint discovery, `create_manager` PTB, manager ID recovery, gated DUSDC deposit PTB, and manager summary readback. | Automated local signer validation succeeded for `create_manager`, event/object-change manager ID recovery, two 1 DUSDC deposits, and known-manager public server balance readback. Browser wallet manual validation, general owner discovery, and direct `balance<DUSDC>` helper remain pending before Phase 1C. |
| Phase 1C: Range quote + first `mint_range<DUSDC>` | Confirm `range_key::new`, active market, strike grid, ask bounds, `predict::get_range_trade_amounts`, quote preview mapping, and first `predict::mint_range<DUSDC>` transaction after Phase 1B blockers clear. | Phase 1C-fix scanner verified successful `get_range_trade_amounts` return decoding for spot/forward-centered runtime ranges, but selected quote returned `mint_cost = 0`; mint remains blocked until a positive nonzero quote passes all safety gates. |
| Phase 1D: Portfolio readback + `redeem_range` | Confirm portfolio read strategy, active/settled range display, redeem preview if available, and `predict::redeem_range<DUSDC>`. | Minted range can be found and redeemed/claimed through the official path, or fallback/blockers are documented. |

## Phase 2: Guided range trading MVP

| Field | Content |
|---|---|
| Goal | Turn the protocol spike into a user-friendly SUI range prediction flow. |
| Deliverables | Trade page; range builder; market/expiry selector from confirmed data; Predict Account status; deposit UX; quote preview; mint transaction; transaction drawer; error translator. |
| Non-goals | Multi-asset support, advanced trading terminal, custom pricing, custom payout logic, complex secondary market. |
| Acceptance criteria | User can understand `(lower, upper]` win condition, preview before action, mint through official DeepBook Predict path, and see success state. |
| Recommended skills | `sui-dev-skills/sui-frontend`, `sui-transaction-building`, `sui-client`, Context7 plugin. |
| Required docs | Product spec sections `Core User Flows`, `UX Design Principles`, `Transaction Flows`; architecture map; protocol notes; official contract info; entrypoint bindings plan. |
| Risks and fallback | Risk: quote preview shape unknown or unstable. Fallback: official dry-run strategy or explicit preview-unavailable state; do not calculate custom pricing. |

## Phase 3: Portfolio and redeem/claim

| Field | Content |
|---|---|
| Goal | Let users monitor active/settled predictions and close or claim positions through official protocol paths. |
| Deliverables | Portfolio page; active/settled position cards; Predict Account balance; range position reads; redeem_range transaction; claim/settlement UX if same path or confirmed path supports it; history fallback. |
| Non-goals | Full analytics, leaderboard, tax reporting, custom settlement, independent position NFTs. |
| Acceptance criteria | Minted position appears in portfolio or documented fallback; user can redeem/claim only through confirmed official path; wallet-critical state uses direct reads where needed. |
| Recommended skills | `sui-client`, `sui-transaction-building`, `sui-bcs`, `sui-dev-skills`. |
| Required docs | Product spec `Portfolio Flow`; protocol analysis `PredictManager` and read surfaces; architecture map; protocol notes; official contract info; entrypoint bindings plan. |
| Risks and fallback | Risk: table layout or manager discovery is hard to decode. Fallback: use Sui events/checkpoints for history while direct wallet-critical reads are confirmed. |

## Phase 4: Creator strategy pages

| Field | Content |
|---|---|
| Goal | Add creator strategy pages that make range predictions shareable and followable. |
| Deliverables | Strategies list; strategy detail page; thesis metadata; follow trade flow; creator fee display; basic volume/participants tracking; risk disclosure. |
| Non-goals | Complex on-chain creator protocol, unconfirmed real fee routing, social graph, reputation system, leaderboard unless time permits. |
| Acceptance criteria | Creator can publish or configure a strategy in confirmed storage; follower can preview and follow the same official DeepBook Predict trade path; fees are either confirmed or labeled demo/TBD. |
| Recommended skills | `sui-dev-skills/sui-frontend`, frontend/UI skills if available, `agent-skills:api-and-interface-design`. |
| Required docs | Product spec `Creator Strategy Flow`, `Strategies Page`, `Strategy Detail Page`; roadmap; architecture map. |
| Risks and fallback | Risk: on-chain fee wrapper adds scope. Fallback: off-chain metadata and direct official follow trade; real fee routing deferred with ADR if needed. |

## Phase 5: Vault / LP dashboard

| Field | Content |
|---|---|
| Goal | Provide a basic LP dashboard that explains vault, PLP, utilization, MTM, max payout, and risk without reimplementing protocol logic. |
| Deliverables | Vault page; metric cards; PLP position display if confirmed; optional supply/withdraw forms after signatures confirmed; risk explanations; unavailable metric states. |
| Non-goals | Custom vault risk engine, StrikeMatrix reproduction, advanced LP premium analytics, unconfirmed PLP transactions. |
| Acceptance criteria | Dashboard shows only confirmed official/read-derived metrics or clearly labeled unavailable/demo values; no custom risk calculations drive user decisions. |
| Recommended skills | `sui-client`, `deepbook-trading`, `sui-dev-skills`, Context7 plugin. |
| Required docs | Product spec `LP Flow`, `Vault Page`; protocol analysis `Vault` and `StrikeMatrix`; architecture map; protocol notes; official contract info; entrypoint bindings plan. |
| Risks and fallback | Risk: vault metrics are hard to decode safely. Fallback: show minimal confirmed metrics and explanatory placeholders for unavailable metrics. |

## Phase 6: Demo polish

| Field | Content |
|---|---|
| Goal | Prepare a coherent hackathon demo that communicates product value in under 60 seconds and proves the core flow. |
| Deliverables | Landing page; polished trade/portfolio/strategy/vault flows; demo script; fallback screenshots; error messages; share card if feasible; runbook. |
| Non-goals | Broad protocol coverage, production-grade indexer, paid LP analytics, multi-chain support. |
| Acceptance criteria | Demo can run end-to-end or has documented fallback; judges understand guided SUI range prediction, creator follow, and LP dashboard positioning. |
| Recommended skills | `agent-skills:frontend-ui-engineering`, `agent-skills:shipping-and-launch`, verification skills. |
| Required docs | Product spec `Demo Script`, `Hackathon Delivery Checklist`, `Final Positioning`; architecture index; roadmap. |
| Risks and fallback | Risk: live chain state changes before demo. Fallback: prepare clearly labeled screenshots or recorded successful flow; do not misrepresent demo data as live protocol state. |
