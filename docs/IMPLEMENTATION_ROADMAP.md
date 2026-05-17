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
| Phase 1C: Range quote + first `mint_range<DUSDC>` | Confirm `range_key::new`, active market, strike grid, ask bounds, `predict::get_range_trade_amounts`, quote preview mapping, full mint preflight, source-level blocker analysis, and first `predict::mint_range<DUSDC>` transaction after Phase 1B blockers clear. | Phase 1C-debug completed the first gated Sui Testnet `mint_range<DUSDC>` after source-informed candidate generation found preflight-passing candidates. Digest: `3XoGAs2NgEMbkn59y9KrRGsRbicBvTN6po5gmTsoHARe`; `RangeMinted` event found. Future mints still require fresh runtime discovery and full preflight, and Phase 1D should focus on robust portfolio/range-position readback. |
| Phase 1D-1: Portfolio readback | Confirm portfolio read strategy and active range quantity for the first minted range without executing write transactions. | Completed on 2026-05-17: `RangeMinted` event readback matched the known digest, `/ranges/minted` returned one matching record, and direct `predict_manager::range_position` devInspect returned quantity `1000` twice for the event-derived RangeKey. |
| Phase 1D-2: `redeem_range` validation | Confirm active range display, redeem preview, one gated `predict::redeem_range<DUSDC>`, `RangeRedeemed` parsing, and post-redeem readback. | Completed on 2026-05-17: full redeem preflight passed for quantities `1`, `10`, `100`, `500`, and `1000`; one Testnet redeem of quantity `500` succeeded with digest `9MiZdKDwdZB2WDkv5JFJV7fj88YRvvcw6LYGxX5DeQWc`; direct `range_position` decreased from `1000` to `500`. Settled claim behavior, general portfolio enumeration, and browser wallet manual validation remain pending. |

## Phase 2: Guided range trading MVP

| Field | Content |
|---|---|
| Goal | Turn the protocol spike into a user-friendly SUI range prediction flow. |
| Deliverables | Trade page; range builder; market/expiry selector from confirmed data; Predict Account status; deposit UX; quote preview; mint transaction; transaction drawer; error translator. |
| Non-goals | Multi-asset support, advanced trading terminal, custom pricing, custom payout logic, complex secondary market. |
| Acceptance criteria | User can understand `(lower, upper]` win condition, preview before action, mint through official DeepBook Predict path, and see success state. |
| Recommended skills | `sui-dev-skills/sui-frontend`, `sui-transaction-building`, `sui-client`, Context7 plugin. |
| Required docs | Product spec sections `Core User Flows`, `UX Design Principles`, `Transaction Flows`; architecture map; protocol notes; official contract info; entrypoint bindings plan; guided range trading MVP guide. |
| Risks and fallback | Risk: quote preview shape unknown or unstable. Fallback: official dry-run strategy or explicit preview-unavailable state; do not calculate custom pricing. |

### Phase 2 subphases

| Subphase | Focus | Exit condition |
|---|---|---|
| Phase 2A: Guided range trading MVP scaffold | Add minimal browser-wallet `/trade` and `/portfolio` scaffolds around the validated create/deposit/mint/readback/redeem lifecycle, with non-secret persistence and full preflight gates. | Engineering scaffold exists and is documented in [GUIDED_RANGE_TRADING_MVP.md](./GUIDED_RANGE_TRADING_MVP.md). It is not final UI design; browser wallet manual validation identified scan/recovery fixes for Phase 2B. |
| Phase 2B-fix: Browser scan and portfolio recovery | Deduplicate and bound `/trade` candidate scans, add progress/cancel/diagnostics and Advanced Diagnostics candidate import, recover `/portfolio` RangeKeys from manager-scoped localStorage and mint digests, and move manual RangeKey input to Advanced Debug. | Implemented as scaffold fixes and documented in [BROWSER_WALLET_MANUAL_VALIDATION_FIXES.md](./BROWSER_WALLET_MANUAL_VALIDATION_FIXES.md). Browser wallet approval remains manual; final UI design remains deferred. |

## Phase 3: Creator strategy wrapper architecture

| Field | Content |
|---|---|
| Goal | Define and scaffold Route B: a thin RangePilot wrapper that owns creator strategy metadata, fee attribution, and follow events while internally calling DeepBook Predict `mint_range<DUSDC>`. |
| Deliverables | Business model; wrapper contract architecture; creator strategy product flow; follow strategy transaction flow; strategy data model; ADR 0002; minimal `move/rangepilot` wrapper skeleton; guarded TypeScript types/SDK stubs; documented Move build result or blocker. |
| Non-goals | Final creator UI, vault dashboard, leaderboard, AI composer, mainnet, package publish, custom pricing, custom oracle settlement, custom vault risk, custom payout, independent position NFTs. |
| Acceptance criteria | Wrapper boundary is documented; `follow_strategy_and_mint` derives `RangeKey` from Strategy fields and calls DeepBook Predict `mint_range`; creator/platform fee is separate from PredictManager mint cost; wrapper package ID remains `TBD` until explicit publish approval; frontend still requires official quote plus full preflight before any wrapper wallet prompt. |
| Recommended skills | `sui-dev-skills/move`, `sui-dev-skills/sui-ts-sdk`, `sui-transaction-building`, `superpowers:executing-plans`. |
| Required docs | Business model; wrapper contract architecture; creator strategy product flow; follow strategy transaction flow; strategy data model; ADR 0002; official contract info; entrypoint bindings plan; protocol integration notes. |
| Risks and fallback | Risk: future DeepBook Predict source or publish dependency shape may change after the local compile snapshot. Fallback: document the exact external dependency blocker without vendoring fake modules or editing ignored source snapshots. |

### Phase 3 subphases

| Subphase | Focus | Exit condition |
|---|---|---|
| Phase 3A: Business model and wrapper architecture | Define the creator/user/platform fee model, Route B DeepBook Predict boundary, and accepted ADR. | Docs and ADR state that RangePilot wrapper internally calls DeepBook Predict `mint_range<DUSDC>` and does not own pricing/oracle/vault/StrikeMatrix/payout/position custody. |
| Phase 3B: Minimal wrapper skeleton and guarded SDK stubs | Add `move/rangepilot`, fee helpers, Strategy events, `follow_strategy_and_mint`, build scripts, optional TS types/stubs, and build/dependency documentation. | Local Move build and tests passed; TypeScript compiled; no publish or real transaction was executed. |
| Phase 3C: Wrapper hardening and publish readiness | Switch formal Move dependencies to official DeepBookV3 Git plus Testnet dep-replacements, harden fee/strategy policy, expand tests, add SDK placeholders, and create publish-readiness docs. | Move build passes with official Git dependencies; Move tests pass with 11 tests; wrapper package ID remained unconfigured until publish; direct platform recipient routing was superseded in Phase 3D; no publish or real transaction was executed. |
| Phase 3D: ProtocolVault fee model | Replace direct platform recipient routing with `ProtocolVault<T>` + `AdminCap`, fix platform fee at 10 bps, cap creator fees at 3000 bps, confirm metadata_uri-only/shared/permissionless/upgradeable policy, update SDK/config/docs, and design the first Testnet follow scenario without executing it. | Move build passes; Move tests pass with 18 tests; typecheck passes; wrapper package ID, ProtocolVault object ID, and AdminCap owner remain `TBD` until publish/post-publish setup; no publish or real transaction is executed. |

## Phase 4: Portfolio and redeem/claim hardening

| Field | Content |
|---|---|
| Goal | Let users monitor active/settled predictions and close or claim positions through official protocol paths. |
| Deliverables | Portfolio page hardening; active/settled position cards; Predict Account balance; range position reads; redeem_range transaction; claim/settlement UX if same path or confirmed path supports it; history fallback. |
| Non-goals | Full analytics, leaderboard, tax reporting, custom settlement, independent position NFTs. |
| Acceptance criteria | Minted position appears in portfolio or documented fallback; user can redeem/claim only through confirmed official path; wallet-critical state uses direct reads where needed. |
| Recommended skills | `sui-client`, `sui-transaction-building`, `sui-bcs`, `sui-dev-skills`. |
| Required docs | Product spec `Portfolio Flow`; protocol analysis `PredictManager` and read surfaces; architecture map; protocol notes; official contract info; entrypoint bindings plan; portfolio readback validation; range redeem validation. |
| Risks and fallback | Risk: table layout or manager discovery is hard to decode. Fallback: use Sui events/checkpoints for history while direct wallet-critical reads are confirmed. |

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
