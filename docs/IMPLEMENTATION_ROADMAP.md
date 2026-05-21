---
Purpose: Define the phased implementation roadmap for DeepVol BTC MOVE while preserving RangePilot validation history.
Audience: Product engineers, protocol integrators, frontend developers, and project planners.
Status: Updated for DeepVol-9 browser-safe receipt preflight.
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
| Goal | Establish and polish the DeepVol-first wallet-gated frontend before settlement UX. |
| Deliverables | New `apps/deepvol-web` Vite app; BTC MOVE markets route; buy route; portfolio route; wallet status; Testnet guard; quote/preflight panels; transaction gating card; local/reference receipt readback; explicit blocker states; DeepVol-7 oceanic UI/UX redesign over the DeepVol-6 scaffold; DeepVol-8 browser flow repair with PredictManager create/store action visibility, DUSDC wallet/deposit visibility, explicit quote refresh, explicit preflight action, and first-receipt portfolio guidance; DeepVol-9 browser-safe `buy_move_receipt<DUSDC>` preflight with PredictManager DUSDC balance readback and receipt `devInspect` gating. |
| Non-goals | Creator marketplace, secondary market, custodial settlement, Profit Fee enforcement, automatic execution, mainnet, redeem/withdraw actions, or protocol changes. |
| Acceptance criteria | Users can connect a Testnet wallet, inspect the validated BTC MOVE VolSeries, understand `Trade movement, not direction.`, create or store a PredictManager, inspect wallet DUSDC funding, refresh quotes, run browser `buy_move_receipt<DUSDC>` preflight, understand why the buy button is disabled until receipt preflight and funding gates pass, and view local/reference receipt readback without treating the receipt as custody truth. |
| Required docs | DeepVol frontend MVP; DeepVol protocol architecture; DeepVol data model; binary leg integration; PredictManager docs; protocol integration notes. |
| Risks and fallback | Risk: users misunderstand receipts as tradable claims or assume the reference artifact is a live wallet position. Fallback: UI copy must state non-custodial receipt and local/indexer limitations clearly. |

## Phase 5: Demo polish

| Field | Content |
|---|---|
| Goal | Prepare a coherent DeepVol demo that communicates BTC MOVE in under 60 seconds and proves the core protocol path. |
| Deliverables | Landing narrative; DeepVol-7 polished `apps/deepvol-web` BTC MOVE market, buy, and portfolio screens; completed browser-safe receipt creation preflight; portfolio/settlement view; demo script; fallback screenshots; runbook. |
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
| Phase 3 Route B wrapper | Completed and validated | Reusable fee vault, wrapper, event-linkage, and post-state verification patterns. |

Formal UI design should now build from `apps/deepvol-web`, not by extending the prior RangePilot `apps/web` scaffold. DeepVol-7 moved that app from scaffold aesthetics to a coherent oceanic BTC MOVE transaction UX. DeepVol-8 repairs the browser flow so new Testnet users can see PredictManager setup, DUSDC funding, quote refresh, preflight, and portfolio next steps. The remaining protocol/frontend task is still full browser-safe binary mint and `buy_move_receipt<DUSDC>` preflight that can safely unlock the final buy wallet prompt. Wallet-gated UX work must preserve fresh quote, preflight, readback, and non-custodial receipt limitations.
