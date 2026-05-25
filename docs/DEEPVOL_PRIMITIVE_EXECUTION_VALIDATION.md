---
Purpose: Record the DeepVol-16 controlled UP/DOWN primitive wallet execution validation attempt.
Audience: Product engineers, frontend developers, SDK implementers, reviewers, and AI agents.
Status: Browser smoke passed; real UP/DOWN primitive execution first blocked in Playwright by a missing wallet extension, then real browser preflight exposed a stale/non-live BTC oracle blocker. DeepVol-16-fix adds active BTC market discovery and stale-oracle gating before any new validation attempt.
Source of truth relationship: Extends the primitive execution policy, quote/preflight contract, primitives frontend docs, and binary leg integration notes; on-chain protocol behavior remains authoritative.
---

# DeepVol Primitive Execution Validation

## Summary

DeepVol-16 attempted to validate the real browser-wallet path for one UP primitive mint and one DOWN primitive mint from `apps/deepvol-web` on Sui Testnet.

Initial result: browser smoke and source/test verification passed, but the Playwright validation browser did not have an installed Sui wallet extension. The dApp Kit wallet dialog rendered the Slush option, but selecting it showed the install flow instead of connecting an existing wallet.

Follow-up real-browser finding: when a wallet-enabled browser reached primitive mint preflight, DeepBook Predict aborted in `oracle_config::assert_live_oracle` with abort code `3`. The controlled oracle/expiry from prior BTC binary validation is stale/non-live for new primitive minting and must not remain the default primitive trading context.

DeepVol-16-fix adds active BTC primitive market discovery, `Live / Stale / Expired / Unknown` status, stale-oracle blockers, selected oracle object propagation, and friendly `assert_live_oracle` copy before any renewed UP/DOWN execution validation.

No UP mint, DOWN mint, RANGE mint, BTC MOVE buy, BTC MOVE redeem, withdraw, publish, upgrade, mainnet transaction, or repeated primitive mint occurred during this validation record.

## Date and baseline

Date: 2026-05-23

DeepVol-16-fix follow-up smoke date: 2026-05-24

Controlled context intended for validation:

| Field | Value |
|---|---|
| Wallet | `0x60ce00b02feafce805f1c3c8a7beaf7db8e903d73610fb232ad928d31fcd9349` |
| PredictManager | `0xffc0629e53bc703b60d5b135b2def3f6919bb08b5b41c137b5c8563739d6216a` |
| BTC oracle | `0xc746336e790db7e93a34b684fa3768f43a7c3171d0262d0f2c71dc0a2ab5fe22` |
| Expiry | `1779436800000` |
| App | `apps/deepvol-web` |
| Dev server | `http://127.0.0.1:5173` |

Workspace baseline:

```text
git status --short --branch:
## main...origin/main
?? deepvol-session.txt

git diff --stat:
(no output)

git diff -- move/deepvol/Move.toml:
(no output)

git diff -- .gitignore:
(no output)
```

`deepvol-session.txt` was an existing untracked session export and was not modified, staged, or committed.

Process cleanup:

```text
leftover shell/process: no stale repo-owned Vite/npm/watch/test process was found before starting the validation server; observed non-repo MCP/Adobe node processes, Notepad3 with the exported session text, and the current command shells only.
action taken: no process was stopped; started a fresh strict DeepVol dev server on 127.0.0.1:5173 for browser smoke.
```

## Gate review

Source review confirmed that UP/DOWN execution requires:

- connected wallet;
- Sui Testnet;
- selected active/live BTC primitive market context, including oracle object, oracle ID, expiry, and effective market status;
- positive quantity;
- valid selected UP/DOWN strike;
- PredictManager ID;
- quote status `ready`;
- positive mint cost;
- quote dependency match;
- quote freshness under `PRIMITIVE_QUOTE_FRESHNESS_MS`;
- preflight status `passed`;
- preflight dependency match;
- preflight freshness under `PRIMITIVE_PREFLIGHT_FRESHNESS_MS`;
- PredictManager DUSDC balance readback;
- PredictManager DUSDC balance covering the current mint cost;
- no active submission.

`usePrimitiveWalletExecution(...)` reruns position readback, binary quote, manager balance, and binary mint preflight before building `buildMintBinaryPrimitiveTransaction({ allowRealTestnetMint: true, ... })` and before opening wallet review.

RANGE remains hard-blocked by policy with:

```text
RANGE wallet execution remains disabled until dedicated mintability validation passes.
```

Portfolio keeps MOVE Receipts, local primitive trade records, and known-key primitive readback as separate sections. Primitive local records are browser hints only and are not `MoveReceipt` objects or wallet-wide indexer truth.

## Pre-execution verification

The required pre-execution verification suite passed:

| Command | Result |
|---|---|
| `npm run typecheck:deepvol-web` | Passed |
| `npm run build:deepvol-web` | Passed |
| `npm run typecheck` | Passed |
| `npm run build:web` | Passed |
| `npm --workspace apps/deepvol-web run test:buy-gate` | Passed |
| `npm --workspace apps/deepvol-web run test:primitive-gates` | Passed |
| `npm --workspace apps/deepvol-web run test:primitive-quote-gates` | Passed |
| `npm --workspace apps/deepvol-web run test:primitive-execution-gates` | Passed |
| `npm --workspace apps/deepvol-web run test:primitive-active-market` | Passed |

Observed warnings only:

- npm warned about unknown `sass_binary_site` / `sass-binary-site` config.
- Vite warned that some chunks exceed 500 kB after minification.

## Browser smoke without real execution

Browser smoke covered the required routes on `http://127.0.0.1:5173`.

| Route | Result |
|---|---|
| `/markets` | Rendered BTC MOVE market surface with wallet-required state; BTC MOVE remained primary. |
| `/primitives?type=UP` | Rendered UP primitive terminal; quote/preflight actions were gated by disconnected wallet; wallet review button showed `Resolve gates first` and was disabled. |
| `/primitives?type=DOWN` | Rendered DOWN primitive terminal; quote/preflight actions were gated by disconnected wallet; wallet review button showed `Resolve gates first` and was disabled. |
| `/primitives?type=RANGE` | Rendered RANGE primitive terminal; execution panel showed `RANGE execution disabled`; wallet action was disabled. |
| `/buy/btc-move` | Rendered BTC MOVE transaction workspace; buy action remained disabled while gates failed; no buy/redeem action was clicked. |
| `/portfolio` | Rendered MOVE Receipts first, local primitive trade records separately, and known-key primitive readback with explicit indexing limitation copy. |

Console status:

- Route smoke before wallet-dialog interaction showed no console warnings or errors.
- Opening the dApp Kit wallet dialog produced one library warning: `Dialog is changing from uncontrolled to controlled...` from `@mysten/dapp-kit`.
- No console errors were observed.

No accidental wallet prompt occurred during route smoke.

DeepVol-16-fix follow-up browser smoke on 2026-05-24 rechecked `/markets`, `/primitives?type=UP`, `/primitives?type=DOWN`, `/primitives?type=RANGE`, `/buy/btc-move`, and `/portfolio` after active market wiring. The primitive pages showed the active BTC market panel, refresh action, selected-market readback copy, disabled quote/preflight/wallet actions while gates failed, and RANGE execution remained disabled. `/buy/btc-move` rendered with the buy action disabled while gates failed, and `/portfolio` rendered MOVE Receipts, local primitive trade records, and known-key readback as separate sections. No console warnings or errors were observed during this follow-up smoke, and no wallet prompt appeared.

## Wallet blocker

The controlled execution path requires a connected Sui Testnet wallet. Browser validation reached the wallet selector but could not connect:

1. Clicked `Connect wallet`.
2. dApp Kit rendered `Connect a Wallet` with `Slush` as the only wallet option.
3. Clicked `Slush`.
4. Dialog changed to `Get Started with Sui` and showed `Install the Slush Extension`.
5. The Playwright browser had no installed Slush/Sui wallet extension, so no account was connected.

Because no wallet connected in the Playwright profile, the app correctly kept primitive quote, preflight, and wallet execution gates blocked. That browser-smoke validation stopped there. No extension was installed, no private key path was used, and no retry was attempted.

## Follow-up stale oracle blocker

A later wallet-enabled browser attempt reached `Run primitive mint preflight` and failed with:

```text
oracle_config::assert_live_oracle abort code 3
```

Known interpretation:

```text
assert_live_oracle::3 = stale / non-live oracle for the mint path
```

User-facing DeepVol copy:

```text
This oracle is no longer live for new minting. Refresh the active BTC market before trading this primitive.
```

The previously controlled BTC oracle `0xc746336e790db7e93a34b684fa3768f43a7c3171d0262d0f2c71dc0a2ab5fe22` and expiry `1779436800000` are historical validation evidence only. DeepVol-16-fix records the required correction in [DEEPVOL_PRIMITIVE_ACTIVE_MARKET_DISCOVERY.md](./DEEPVOL_PRIMITIVE_ACTIVE_MARKET_DISCOVERY.md): `/primitives` must discover or select a fresh active BTC market and block `Unknown`, `Stale`, or `Expired` markets before quote, preflight, or wallet review.

## UP primitive

| Field | Result |
|---|---|
| UP quote | Not run; blocked before quote because no wallet connected in the Playwright browser. |
| UP preflight | Not run; blocked before preflight because no wallet/PredictManager runtime gate could pass in browser. |
| UP executed | No. |
| UP digest | Not applicable. |
| UP PositionMinted event | Not applicable; no transaction executed. |
| UP mint cost from event | Not applicable. |
| UP manager position before | Not read in browser because wallet connection was unavailable. |
| UP manager position after | Not applicable. |
| UP manager balance before | Not read in browser because wallet connection was unavailable. |
| UP manager balance after | Not applicable. |
| UP local record | Not created. |
| UP Portfolio display | No UP primitive record displayed because no UP primitive transaction executed. |

## DOWN primitive

| Field | Result |
|---|---|
| DOWN quote | Not run; blocked before quote because no wallet connected in the Playwright browser. |
| DOWN preflight | Not run; blocked before preflight because no wallet/PredictManager runtime gate could pass in browser. |
| DOWN executed | No. |
| DOWN digest | Not applicable. |
| DOWN PositionMinted event | Not applicable; no transaction executed. |
| DOWN mint cost from event | Not applicable. |
| DOWN manager position before | Not read in browser because wallet connection was unavailable. |
| DOWN manager position after | Not applicable. |
| DOWN manager balance before | Not read in browser because wallet connection was unavailable. |
| DOWN manager balance after | Not applicable. |
| DOWN local record | Not created. |
| DOWN Portfolio display | No DOWN primitive record displayed because no DOWN primitive transaction executed. |

## Portfolio reconciliation

Portfolio behavior observed during browser smoke:

- MOVE Receipts rendered before primitive sections.
- Local primitive trade records rendered as a separate section with `0 records`.
- The primitive section stated that primitive trades do not create DeepVol `MoveReceipt` objects.
- Known-key primitive readback rendered separately and stayed blocked until wallet and PredictManager ID were available.
- Copy stated that general primitive position indexing is future work.

Because no UP/DOWN primitive transaction executed, there was no primitive local record to reconcile beyond confirming the empty-record state and separation copy.

## Zero-count attestation

```text
UP primitive mints: 0
DOWN primitive mints: 0
RANGE mints: 0
BTC MOVE buys: 0
BTC MOVE redeems: 0
withdraws: 0
publishes/upgrades: 0
mainnet transactions: 0
repeated primitive mints: 0
private-key or raw-signature paths: 0
```

## Security and boundary checks

- `move/deepvol/Move.toml` was not modified.
- `.gitignore` was not modified.
- No Move contracts were modified.
- No private key, mnemonic, `.env.local`, `.trace/`, `.traces/`, raw transaction bytes, or raw signatures were read.
- No wallet transaction was approved.
- No publish, upgrade, withdraw, RANGE mint, BTC MOVE buy, or BTC MOVE redeem was executed.
- `frontend-monorepo/` and `deepbookv3-predict-testnet-4-16/` were not staged or committed.

## Next step

Run DeepVol-16 execution validation again only after `/primitives` has discovered or selected a live active BTC market and the controlled Sui Testnet wallet extension is installed and connected to:

```text
0x60ce00b02feafce805f1c3c8a7beaf7db8e903d73610fb232ad928d31fcd9349
```

Before any wallet prompt, confirm market status is `Live`, quote/preflight use the selected oracle object and expiry, stale/non-live oracle copy is absent, and the PredictManager ID remains controlled. Then rerun the strict UP/DOWN flow with the same limits: at most one UP mint, at most one DOWN mint, no RANGE mint, no BTC MOVE buy/redeem, no withdraw, no publish/upgrade, no mainnet, and no blind retries.
