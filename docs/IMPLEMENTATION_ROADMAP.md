---
Purpose: Define the phased implementation roadmap for DeepVol BTC MOVE while preserving RangePilot validation history.
Audience: Product engineers, protocol integrators, frontend developers, and project planners.
Status: Updated for the DeepVol BTC MOVE foundation refactor.
Source of truth relationship: Derived from DeepVol foundation docs, local protocol docs, and official-derived Testnet integration references; implementation details remain subject to confirmation.
---

# Implementation Roadmap

DeepVol BTC MOVE is the new primary product direction. DeepVol is a Predict-native structured product layer: UP, DOWN, and RANGE are advanced primitives, and BTC MOVE Receipt is the primary composed product. The roadmap now prioritizes a real BTC MOVE volatility receipt path over the prior RangePilot creator-follow strategy product.

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
| Deliverables | Read-only/source confirmation of `MarketKey`; binary quote harness; read-only BTC UP/DOWN pair selection; binary position readback helper; full two-leg PTB devInspect; gated Testnet binary mint mode; blocked-before-submission validation report; binary event parser; binary redeem validation plan. |
| Non-goals | No custodial receipt, no profit fee, no creator marketplace, no production UI. |
| Acceptance criteria | UP and DOWN quote preview pass for a runtime BTC oracle/expiry; full two-leg mint preflight passes; controlled binary mint validation is either completed with digest/evidence or blocked with precise cause; `predict_manager::position` readback strategy is proven. Current status: 2026-05-19 controlled round blocked before submission at CLI dry-run with `InsufficientGas in command 3`. |
| Required docs | DeepVol binary leg integration; official contract info; protocol integration notes; entrypoint bindings plan; PredictManager flow and validation docs. |
| Risks and fallback | Risk: active BTC binary market changes or mintability fails after quote. Fallback: document runtime blocker and do not build production receipt flow until full binary preflight succeeds. |

## Phase 2: DeepVol MoveReceipt / VolSeries contract design

| Field | Content |
|---|---|
| Goal | Design and implement the minimal non-custodial DeepVol Move package around BTC MOVE series and receipts. |
| Deliverables | `move/deepvol` package; `VolSeries`; `MoveReceipt`; Create Fee deposit into `ProtocolVault` or a DeepVol vault equivalent; receipt lifecycle events; Move tests. |
| Non-goals | Custodial manager, tradable receipt, Profit Fee enforcement, secondary market, custom Predict pricing, custom settlement. |
| Acceptance criteria | Move build/tests pass; receipt explicitly records linkage rather than custody; Create Fee is enforceable; Profit Fee is documented as unavailable in MVP. |
| Required docs | DeepVol protocol architecture; DeepVol data model; DeepVol business model; ProtocolVault design; Move rules. |
| Risks and fallback | Risk: trying to make receipt represent custody it does not hold. Fallback: keep non-custodial receipt language and field semantics strict. |

## Phase 3: SDK builders and preflight gates

| Field | Content |
|---|---|
| Goal | Add TypeScript types and builders for BTC MOVE preview, two-leg mint, receipt creation, and portfolio readback. |
| Deliverables | `packages/types/src/deepVol.ts`; `packages/sdk/src/deepVol/`; `packages/config/src/deepVolTestnet.ts`; binary quote helpers; binary mint preflight; receipt transaction builder; binary position readback; event parsing. |
| Non-goals | Private-key browser paths, mainnet, unaudited production launch, direct custom pricing. |
| Acceptance criteria | Builders require runtime BTC oracle/expiry, successful UP and DOWN quote previews, full PTB preflight, fee coverage, and explicit package/config IDs before wallet prompt. |
| Required docs | DeepVol binary leg integration; entrypoint bindings plan; protocol integration notes; Sui transaction-building guidance. |
| Risks and fallback | Risk: quote success differs from mintability. Fallback: preserve full binary mint preflight gate, mirroring range mint lessons. |

## Phase 4: Portfolio and guided settlement UX

| Field | Content |
|---|---|
| Goal | Display BTC MOVE receipts and guide users through official DeepBook Predict binary redeem/settlement paths. |
| Deliverables | DeepVol markets page; series page; portfolio page; receipt cards; manager binary readback; settlement status; guided redeem path; precise unavailable states. |
| Non-goals | Full UI polish, creator marketplace, secondary market, custodial settlement, Profit Fee enforcement. |
| Acceptance criteria | Users can see receipt metadata, current UP/DOWN quantities from `PredictManager`, expiry/settlement status, and guided redeem actions without treating receipt as custody truth. |
| Required docs | DeepVol protocol architecture; DeepVol data model; binary leg integration; PredictManager docs; protocol integration notes. |
| Risks and fallback | Risk: users misunderstand receipts as tradable claims. Fallback: UI copy must state non-custodial receipt limitation clearly. |

## Phase 5: Demo polish

| Field | Content |
|---|---|
| Goal | Prepare a coherent DeepVol demo that communicates BTC MOVE in under 60 seconds and proves the core protocol path. |
| Deliverables | Landing narrative; BTC MOVE market screen; receipt creation flow; portfolio/settlement view; demo script; fallback screenshots; runbook. |
| Non-goals | Broad market support, pro API, production-grade indexer, custodial receipt, secondary market. |
| Acceptance criteria | Demo explains “Trade movement, not direction”; live or recorded evidence shows official DeepBook Predict binary composition and receipt metadata; limitations are not misrepresented. |
| Required docs | DeepVol product direction; MVP scope; protocol architecture; binary validation artifacts; business model. |
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
| Phase 3 Route B wrapper | Completed and validated | Reusable ProtocolVault, fee, wrapper, event-linkage patterns. |

Formal UI design remains deferred until the DeepVol binary protocol path is validated.
