---
Purpose: Official-derived DeepBook Predict Testnet contract, config, endpoint, and entrypoint reference for RangePilot.
Audience: Protocol integrators, SDK implementers, transaction-builder authors, frontend developers, reviewers, and AI agents.
Status: Generated documentation; official-derived Testnet integration reference.
Source of truth relationship: Derived from official Sui DeepBook Predict docs and the pinned predict-testnet-4-16 source branch; static Testnet config is confirmed, runtime market state and exact generated-binding call shapes still require confirmation.
---

# DeepBook Predict Official Contract Info for RangePilot

This document is a Claude Code reference for integrating RangePilot with the official DeepBook Predict Testnet deployment. It extracts contract, object, server, endpoint, and entrypoint information from the Sui official DeepBook Predict documentation and the pinned `predict-testnet-4-16` DeepBookV3 source branch.

Primary sources:

- Sui official DeepBook Predict overview: https://docs.sui.io/onchain-finance/deepbook-predict
- Sui official DeepBook Predict design: https://docs.sui.io/onchain-finance/deepbook-predict/design
- Sui official DeepBook Predict contract information: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information
- Predict contract page: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/predict
- PredictManager page: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/predict-manager
- Market Keys page: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/market-keys
- Oracle page: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/oracle
- Vault page: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/vault
- Registry page: https://docs.sui.io/onchain-finance/deepbook-predict/contract-information/registry
- Source branch: https://github.com/MystenLabs/deepbookv3/tree/predict-testnet-4-16

Important caution:

DeepBook Predict is currently documented as a Testnet integration surface. The official docs state that package IDs, object layouts, and entrypoints are provisional and may change before Mainnet. Do not reuse older local package IDs or object IDs unless a newer official deployment explicitly replaces the values below. Exact generated TypeScript bindings, PTB argument ordering, pure argument encoding, return tuple shape, and event fields are `MUST CONFIRM BEFORE CODING`.

---

## 1. Confirmed Testnet Deployment Values

These values are confirmed from the Sui official DeepBook Predict contract information page.

| Parameter | Value | Status |
|---|---|---|
| Network | `Testnet` | Confirmed |
| Public server | `https://predict-server.testnet.mystenlabs.com` | Confirmed |
| Predict package | `0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138` | Confirmed |
| Predict registry | `0x43af14fed5480c20ff77e2263d5f794c35b9fab7e2212903127062f4fe2a6e64` | Confirmed |
| Predict object | `0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a` | Confirmed |
| Current quote asset | `0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a::dusdc::DUSDC` | Confirmed |
| DUSDC currency ID | `0xf3000dff421833d4bb8ed58fac146d691a3aaba2785aa1989af65a7089ca3e9c` | Confirmed |
| DUSDC decimals | `6` | Confirmed |
| PLP coin type | `0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138::plp::PLP` | Confirmed |
| Source branch | `predict-testnet-4-16` | Confirmed |

### Recommended config constant

```ts
export const DEEPBOOK_PREDICT_TESTNET = {
  network: "testnet",
  publicServer: "https://predict-server.testnet.mystenlabs.com",

  packageId:
    "0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138",

  registryId:
    "0x43af14fed5480c20ff77e2263d5f794c35b9fab7e2212903127062f4fe2a6e64",

  predictId:
    "0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a",

  quoteAssets: {
    DUSDC: {
      coinType:
        "0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a::dusdc::DUSDC",
      currencyId:
        "0xf3000dff421833d4bb8ed58fac146d691a3aaba2785aa1989af65a7089ca3e9c",
      decimals: 6,
    },
  },

  plpCoinType:
    "0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138::plp::PLP",

  sourceBranch: "predict-testnet-4-16",
} as const;
```

---

## 2. Integration Model for RangePilot

The official docs recommend splitting reads by freshness and purpose:

1. Use the public Predict server for render-ready market, portfolio, vault, and history data.
2. Use Sui checkpoint or event streaming for lower-latency oracle updates.
3. Use direct onchain object reads immediately before or after wallet flows that require authoritative state.

RangePilot should follow this model.

### RangePilot read/write separation

| Concern | Preferred source | Notes |
|---|---|---|
| Market list | Public Predict server | Use `/predicts/:predict_id/oracles`. |
| Oracle state | Public server, event stream, optional direct read | Use direct read around wallet-critical flows. |
| Portfolio summary | Public Predict server | Use manager summary endpoints first. |
| Portfolio confirmation after transaction | Direct read and/or events | Use server after it catches up. |
| Vault dashboard | Public Predict server | Use `/vault/summary` first. |
| Historical trades | Public Predict server | Use history endpoints. |
| Transactions | Onchain Move calls | Server is not a write path. |

Important:

The public server is a read model, not a transaction executor. RangePilot must build and submit Sui transactions for writes.

---

## 3. Public Server Endpoints

Base URL:

```text
https://predict-server.testnet.mystenlabs.com
```

### Protocol and market state

| Endpoint | Purpose | RangePilot usage |
|---|---|---|
| `GET /status` | Server health and status | Health check / debug page. |
| `GET /predicts/:predict_id/state` | Predict object state and config | Config panel, protocol status. |
| `GET /predicts/:predict_id/oracles` | Oracle list for a Predict object | Market discovery. |
| `GET /oracles/:oracle_id/state` | Current oracle state | Trade page market state. |
| `GET /predicts/:predict_id/quote-assets` | Accepted quote assets | Confirm DUSDC support. |
| `GET /oracles/:oracle_id/ask-bounds` | Resolved oracle ask bounds | Quote preview warning and mint eligibility. |

### Vault and LP data

| Endpoint | Purpose | RangePilot usage |
|---|---|---|
| `GET /predicts/:predict_id/vault/summary` | Current vault summary | Vault dashboard. |
| `GET /predicts/:predict_id/vault/performance?range=ALL` | Vault performance over selected range | LP analytics. |
| `GET /lp/supplies` | LP supply history | Vault history. |
| `GET /lp/withdrawals` | LP withdrawal history | Vault history. |

### Manager and portfolio data

| Endpoint | Purpose | RangePilot usage |
|---|---|---|
| `GET /managers` | Predict manager list | Manager discovery candidate. Validate actual query behavior. |
| `GET /managers/:manager_id/summary` | Manager summary | Portfolio overview. |
| `GET /managers/:manager_id/positions/summary` | Manager position summary | Active positions and ranges. |
| `GET /managers/:manager_id/pnl?range=ALL` | Manager PnL over selected range | Portfolio analytics. |

### History data

| Endpoint | Purpose | RangePilot usage |
|---|---|---|
| `GET /oracles/:oracle_id/prices` | Oracle price history | Market chart. |
| `GET /oracles/:oracle_id/prices/latest` | Latest indexed price update | Fast market display. |
| `GET /oracles/:oracle_id/svi` | Oracle SVI history | Advanced analytics. |
| `GET /oracles/:oracle_id/svi/latest` | Latest indexed SVI update | Quote diagnostics. |
| `GET /positions/minted` | Binary mint history | P2 history. |
| `GET /positions/redeemed` | Binary redeem history | P2 history. |
| `GET /ranges/minted` | Range mint history | RangePilot core activity history. |
| `GET /ranges/redeemed` | Range redeem history | RangePilot portfolio/history. |
| `GET /trades/:oracle_id` | Trade history for an oracle | Market page / strategy stats. |

### Discovery checklist

Claude Code should confirm actual response shapes before writing final TypeScript types.

Required first calls:

```bash
curl https://predict-server.testnet.mystenlabs.com/status
curl https://predict-server.testnet.mystenlabs.com/predicts/0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a/state
curl https://predict-server.testnet.mystenlabs.com/predicts/0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a/oracles
curl https://predict-server.testnet.mystenlabs.com/predicts/0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a/quote-assets
curl https://predict-server.testnet.mystenlabs.com/predicts/0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a/vault/summary
```

---

## 4. Core Protocol Objects

### Predict

`Predict` is the top-level shared object and the main app-facing trading/liquidity entrypoint.

Responsibilities:

- Validate quote assets.
- Check trading pause state.
- Check oracle and key validity.
- Price mints and redeems from oracle state.
- Apply spread and utilization adjustments.
- Update vault exposure.
- Emit trading and liquidity events.

RangePilot usage:

- Pass the confirmed Predict object ID into `mint_range`, `redeem_range`, `get_range_trade_amounts`, `supply`, and `withdraw`.
- Do not recreate or administer Predict.

### PredictManager

`PredictManager` is a per-user shared account object.

Responsibilities:

- Wrap an inner DeepBook `BalanceManager`.
- Store deposited quote balances.
- Track binary positions internally.
- Track vertical range positions internally.

Important:

Positions and ranges are not standalone onchain objects. They are quantities stored inside the manager.

RangePilot product mapping:

```text
PredictManager = Predict Account
PredictManager balance = deposited DUSDC balance
range_positions = user active range predictions
positions = user binary predictions
```

### OracleSVI

`OracleSVI` is the market state for one underlying asset and one expiry.

Responsibilities:

- Store spot price.
- Store forward price.
- Store SVI volatility surface parameters.
- Store activation state.
- Store timestamp.
- Store settlement price after expiry.

Lifecycle:

```text
Inactive -> Active -> Pending Settlement -> Settled
```

Trading rules:

- Mints require a live oracle.
- Redeems can use quoteable live or settled oracle state.
- After settlement, price and SVI updates are rejected.

RangePilot usage:

- Use server endpoints to discover active oracle IDs.
- Use oracle state to populate asset, expiry, status, current price, and settlement state.
- Do not assume static oracle IDs.

### MarketKey

`MarketKey` identifies binary positions.

Shape:

```text
(oracle_id, expiry, strike, direction)
```

Direction:

- UP
- DOWN

RangePilot priority:

- P2. RangePilot MVP can focus on `RangeKey` first.

### RangeKey

`RangeKey` identifies vertical range positions.

Shape:

```text
(oracle_id, expiry, lower_strike, higher_strike)
```

Rules:

- `lower_strike < higher_strike`
- Direction is not part of the key.
- Bull-call and bear-put ranges with the same strikes share the same key row.
- At settlement, a range pays when settlement lands in `(lower, higher]`.

RangePilot usage:

- This is the core MVP trading primitive.
- UI must clearly display the boundary rule as “above lower and at or below higher.”

### Vault

The Predict vault takes the opposite side of every Predict trade.

Responsibilities:

- Hold accepted quote assets.
- Track concrete asset balances.
- Track mark-to-market liability.
- Track maximum payout.
- Track per-oracle exposure.
- Support PLP supply and withdrawal.
- Support settled-oracle compaction.

Important:

`predict.move` owns pricing and trading orchestration. `vault.move` is the state machine for balances and exposure. RangePilot must not reimplement vault risk.

### PLP

`PLP` is the LP share coin minted when users supply liquidity to the Predict vault.

RangePilot priority:

- P1/P2 dashboard.
- Do not block the core range trading MVP on PLP supply/withdraw.

### Registry

The Registry tracks Predict object ID and oracle IDs associated with oracle caps.

Important:

Most app integrations do not call Registry admin functions directly. They are operator/governance surfaces.

RangePilot usage:

- Use the confirmed Predict object ID directly from official Testnet config.
- Do not call admin functions such as `create_predict`, `create_oracle`, quote asset management, pricing config, risk config, or withdrawal limiter setters.

---

## 5. Confirmed Contract Entry Points for RangePilot

This section is intended for `docs/ENTRYPOINT_BINDINGS_PLAN.md` and `packages/sdk` implementation.

Important implementation note:

The entrypoint roles below are confirmed for integration planning. Exact generated TypeScript bindings, PTB object argument ordering, pure argument encoding, return tuple shape, and event fields are `MUST CONFIRM BEFORE CODING` from the pinned `predict-testnet-4-16` source branch, generated bindings, devInspect, or real Testnet transactions.

---

## 5.1 Create PredictManager

Purpose:

Create a new shared `PredictManager` for the caller.

Move function:

```move
predict::create_manager(ctx: &mut TxContext): ID
```

SDK target:

```text
<PREDICT_PACKAGE>::predict::create_manager
```

Type arguments:

```text
none
```

Object arguments:

```text
none
```

Pure arguments:

```text
none
```

Return:

```text
ID of new PredictManager
```

Events:

```text
predict_manager::PredictManagerCreated
```

RangePilot usage:

- Trigger when connected wallet has no known manager.
- Store discovered manager ID locally after creation.
- Also index event history for future discovery.

Status:

```text
Confirmed entrypoint role; exact generated binding and PTB call shape are MUST CONFIRM BEFORE CODING.
```

---

## 5.2 Deposit DUSDC into PredictManager

Purpose:

Deposit quote asset into the user’s `PredictManager` before minting positions or ranges.

Move function:

```move
predict_manager::deposit<T>(self: &mut PredictManager, coin: Coin<T>, ctx: &TxContext)
```

SDK target:

```text
<PREDICT_PACKAGE>::predict_manager::deposit
```

Type arguments:

```text
DUSDC
```

Object arguments:

```text
&mut PredictManager
Coin<DUSDC>
```

Pure arguments:

```text
none
```

Requirements:

- Transaction sender must be the manager owner.
- Coin type should be the accepted DUSDC quote asset.

RangePilot usage:

- Split user wallet DUSDC coin if needed.
- Deposit selected amount into manager.
- Refresh manager summary and balance after transaction.

Status:

```text
Confirmed entrypoint role; PTB coin splitting, generated binding, and exact TypeScript SDK construction are MUST CONFIRM BEFORE CODING.
```

---

## 5.3 Read PredictManager State

Purpose:

Read user manager owner, deposited balance, binary position quantity, and range position quantity.

Move functions:

```move
predict_manager::owner(self: &PredictManager): address
predict_manager::balance<T>(self: &PredictManager): u64
predict_manager::position(self: &PredictManager, key: MarketKey): u64
predict_manager::range_position(self: &PredictManager, key: RangeKey): u64
```

RangePilot preferred read strategy:

1. Use public server manager summary endpoints for page rendering.
2. Use direct reads or devInspect/view calls for wallet-critical confirmation.
3. Use events as fallback for portfolio activity history.

Status:

```text
Confirmed read-helper roles; exact direct-read, devInspect, and server response shapes are MUST CONFIRM BEFORE CODING.
```

---

## 5.4 Build RangeKey

Purpose:

Create a vertical range key from oracle, expiry, lower strike, and higher strike.

Move function:

```move
range_key::new(
  oracle_id: ID,
  expiry: u64,
  lower_strike: u64,
  higher_strike: u64
): RangeKey
```

SDK target:

```text
<PREDICT_PACKAGE>::range_key::new
```

Rules:

```text
lower_strike < higher_strike
```

RangePilot usage:

- Build RangeKey inside PTB before calling `get_range_trade_amounts`, `mint_range`, or `redeem_range`.
- Validate range client-side before PTB construction.

Status:

```text
Confirmed entrypoint role; exact generated binding and intermediate PTB handling are MUST CONFIRM BEFORE CODING.
```

---

## 5.5 Preview Range Trade Amounts

Purpose:

Preview mint cost and redeem payout for a vertical range.

Move function:

```move
predict::get_range_trade_amounts(
  predict: &Predict,
  oracle: &OracleSVI,
  key: RangeKey,
  quantity: u64,
  clock: &Clock
): (u64, u64)
```

SDK target:

```text
<PREDICT_PACKAGE>::predict::get_range_trade_amounts
```

Type arguments:

```text
none
```

Object arguments:

```text
&Predict
&OracleSVI
&Clock
```

Pure / constructed arguments:

```text
RangeKey
quantity: u64
```

Return:

```text
(mint_cost, redeem_payout)
```

RangePilot usage:

- Show Quote Preview before minting.
- Explain that amounts reflect protocol pricing and may change as oracle/vault state changes.

Implementation options:

1. Use a Move call/devInspect to get return values.
2. Use official server data if the server exposes equivalent quote output.
3. Use dry-run fallback if view/devInspect is not straightforward.

Status:

```text
Confirmed entrypoint role; exact TypeScript preview, devInspect, dry-run, and return mapping strategy are MUST CONFIRM BEFORE CODING.
```

---

## 5.6 Mint Range

Purpose:

Buy a vertical range position using DUSDC deposited in the caller’s `PredictManager`.

Move function:

```move
predict::mint_range<T>(
  predict: &mut Predict,
  manager: &mut PredictManager,
  oracle: &OracleSVI,
  key: RangeKey,
  quantity: u64,
  clock: &Clock,
  ctx: &mut TxContext
)
```

SDK target:

```text
<PREDICT_PACKAGE>::predict::mint_range
```

Type arguments:

```text
DUSDC
```

Object arguments:

```text
&mut Predict
&mut PredictManager
&OracleSVI
&Clock
```

Pure / constructed arguments:

```text
RangeKey
quantity: u64
```

Key requirements:

- Sender must be manager owner.
- Trading must not be paused.
- Quantity must be greater than zero.
- DUSDC must be an accepted quote asset.
- Oracle must be live.
- RangeKey must match the oracle.
- Manager must have enough deposited balance.
- Post-trade ask must be within ask bounds.
- Vault exposure must remain within risk limits.

Behavior:

- Inserts range into vault.
- Refreshes oracle risk.
- Prices against post-trade state.
- Withdraws cost from manager balance.
- Accepts payment into vault.
- Increases manager range quantity.
- Emits `RangeMinted`.

RangePilot usage:

- Core MVP transaction.
- Revalidate quote before transaction submission.
- Refresh manager and portfolio after success.

Status:

```text
Confirmed entrypoint role; first real Testnet transaction, generated binding, and PTB construction are MUST CONFIRM BEFORE CODING.
```

---

## 5.7 Redeem Range

Purpose:

Sell a vertical range position and deposit payout back into the owner’s `PredictManager`.

Move function:

```move
predict::redeem_range<T>(
  predict: &mut Predict,
  manager: &mut PredictManager,
  oracle: &OracleSVI,
  key: RangeKey,
  quantity: u64,
  clock: &Clock,
  ctx: &mut TxContext
)
```

SDK target:

```text
<PREDICT_PACKAGE>::predict::redeem_range
```

Type arguments:

```text
DUSDC
```

Object arguments:

```text
&mut Predict
&mut PredictManager
&OracleSVI
&Clock
```

Pure / constructed arguments:

```text
RangeKey
quantity: u64
```

Behavior:

- Decreases manager range quantity.
- If live, removes vault exposure and pays post-removal bid value.
- If settled and compacted, pays according to settlement result.
- Deposits payout into manager balance.
- Emits `RangeRedeemed`.

Settlement rule:

```text
The range pays if settlement lands in (lower_strike, higher_strike].
```

RangePilot usage:

- Portfolio redeem action.
- Claim-style UX after settlement.

Status:

```text
Confirmed entrypoint role; portfolio position readback, generated binding, and PTB construction are MUST CONFIRM BEFORE CODING.
```

---

## 5.8 Binary Position Functions

RangePilot MVP can defer these to P2.

### MarketKey builders

```move
market_key::up(oracle_id: ID, expiry: u64, strike: u64): MarketKey
market_key::down(oracle_id: ID, expiry: u64, strike: u64): MarketKey
market_key::new(oracle_id: ID, expiry: u64, strike: u64, is_up: bool): MarketKey
```

### Preview binary

```move
predict::get_trade_amounts(
  predict: &Predict,
  oracle: &OracleSVI,
  key: MarketKey,
  quantity: u64,
  clock: &Clock
): (u64, u64)
```

### Mint/redeem binary

```move
predict::mint<T>(...)
predict::redeem<T>(...)
```

RangePilot priority:

```text
P2 after vertical range MVP works.
```

---

## 5.9 Vault Liquidity Functions

RangePilot Vault dashboard can use these after the core range trading MVP.

### Supply liquidity

```move
predict::supply<T>(
  predict: &mut Predict,
  coin: Coin<T>,
  clock: &Clock,
  ctx: &mut TxContext
): Coin<PLP>
```

Type arguments:

```text
DUSDC
```

Behavior:

- Deposits accepted quote asset into the vault.
- Mints PLP shares.
- First supplier receives shares one-to-one with supplied amount.
- Later suppliers receive shares proportional to deposit relative to current vault value.

### Withdraw liquidity

```move
predict::withdraw<T>(
  predict: &mut Predict,
  lp_coin: Coin<PLP>,
  clock: &Clock,
  ctx: &mut TxContext
): Coin<T>
```

Type arguments:

```text
DUSDC
```

Behavior:

- Burns PLP.
- Returns selected quote asset.
- Subject to current vault value, max payout coverage, and withdrawal limiter.

RangePilot priority:

```text
P1/P2 after trade and portfolio flows.
```

---

## 6. Event Types

### Oracle events

The official docs list the following oracle events for live freshness:

```text
<PREDICT_PACKAGE>::oracle::OraclePricesUpdated
<PREDICT_PACKAGE>::oracle::OracleSVIUpdated
<PREDICT_PACKAGE>::oracle::OracleSettled
<PREDICT_PACKAGE>::oracle::OracleActivated
```

With the current Testnet package:

```text
0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138::oracle::OraclePricesUpdated
0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138::oracle::OracleSVIUpdated
0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138::oracle::OracleSettled
0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138::oracle::OracleActivated
```

### Trading and manager events

From pinned source:

```text
<PREDICT_PACKAGE>::predict::PositionMinted
<PREDICT_PACKAGE>::predict::PositionRedeemed
<PREDICT_PACKAGE>::predict::RangeMinted
<PREDICT_PACKAGE>::predict::RangeRedeemed
<PREDICT_PACKAGE>::predict::Supplied
<PREDICT_PACKAGE>::predict::Withdrawn
<PREDICT_PACKAGE>::predict_manager::PredictManagerCreated
```

RangePilot usage:

- `PredictManagerCreated`: discover newly created manager ID.
- `RangeMinted`: update portfolio/history after mint.
- `RangeRedeemed`: update portfolio/history after redeem.
- Oracle events: update market status and freshness.
- `Supplied` / `Withdrawn`: vault activity history.

---

## 7. Runtime Discovery Items

The following items are not static in this document and must be discovered at runtime.

| Item | How to discover | Status |
|---|---|---|
| Active oracle IDs | `GET /predicts/:predict_id/oracles` | MUST CONFIRM BEFORE CODING |
| Underlying assets | Oracle list/state | MUST CONFIRM BEFORE CODING |
| Expiry list | Oracle state | MUST CONFIRM BEFORE CODING |
| Strike grid | Predict/oracle state or server response | MUST CONFIRM BEFORE CODING |
| Oracle freshness | `/oracles/:oracle_id/state`, event stream, or direct read | MUST CONFIRM BEFORE CODING |
| Ask bounds | `/oracles/:oracle_id/ask-bounds` and `predict::ask_bounds(predict, oracle_id)` | MUST CONFIRM BEFORE CODING |
| Manager discovery by owner | `/managers`, event history, local cache | MUST CONFIRM BEFORE CODING |
| Portfolio direct read feasibility | Manager summary endpoint, direct read, event fallback | MUST CONFIRM BEFORE CODING |
| Faucet DUSDC balance | Wallet coin query | MUST CONFIRM BEFORE CODING |

---

## 8. Recommended Phase 1 Integration Sequence

### Phase 1A: Public server discovery

1. Add official Testnet config.
2. Call `/status`.
3. Call `/predicts/:predict_id/state`.
4. Call `/predicts/:predict_id/oracles`.
5. Select one active oracle.
6. Call `/oracles/:oracle_id/state`.
7. Call `/oracles/:oracle_id/ask-bounds`.
8. Derive range UI constraints from discovered market data.

### Phase 1B: Wallet and PredictManager

1. Connect Sui testnet wallet.
2. Query DUSDC wallet balance.
3. Create PredictManager with `predict::create_manager` if needed.
4. Capture `PredictManagerCreated` event or returned ID.
5. Deposit DUSDC using `predict_manager::deposit<DUSDC>`.
6. Confirm manager balance via server/direct read.

### Phase 1C: Range quote and mint

1. Build `RangeKey` from selected oracle/expiry/lower/higher.
2. Preview with `predict::get_range_trade_amounts` using devInspect or equivalent.
3. Inspect resolved ask bounds with `predict::ask_bounds` and treat public ask-bounds endpoint `null` as diagnostic.
4. Preflight the full `predict::mint_range<DUSDC>` PTB with devInspect; abort code `7` in `predict::assert_mintable_ask` is `EAskPriceOutOfBounds`.
5. Submit `predict::mint_range<DUSDC>` only if full preflight succeeds.
6. Confirm `RangeMinted` event.
7. Refresh portfolio from manager summary and/or event history.

### Phase 1D: Portfolio and redeem

1. Read active range position.
2. Preview redeem if market is live.
3. Submit `predict::redeem_range<DUSDC>`.
4. Confirm `RangeRedeemed` event.
5. Refresh manager balance and position summary.

---

## 9. SDK Implementation Notes

### Suggested package config file

Path:

```text
packages/config/src/deepbookPredictTestnet.ts
```

Export:

```ts
export const DEEPBOOK_PREDICT_TESTNET = { ... } as const;
```

### Suggested SDK modules

```text
packages/sdk/src/deepbookPredict/
├─ client.ts
├─ config.ts
├─ server.ts
├─ manager.ts
├─ market.ts
├─ rangeKey.ts
├─ quote.ts
├─ trade.ts
├─ portfolio.ts
├─ events.ts
└─ errors.ts
```

### Suggested first TypeScript types

```ts
export type DeepBookPredictNetworkConfig = {
  network: "testnet";
  publicServer: string;
  packageId: string;
  registryId: string;
  predictId: string;
  quoteAssets: {
    DUSDC: {
      coinType: string;
      currencyId: string;
      decimals: 6;
    };
  };
  plpCoinType: string;
  sourceBranch: string;
};

export type OracleLifecycleStatus =
  | "inactive"
  | "active"
  | "pending_settlement"
  | "settled"
  | "unknown";

export type RangeInput = {
  oracleId: string;
  expiry: string | number | bigint;
  lowerStrike: string | number | bigint;
  higherStrike: string | number | bigint;
  quantity: string | number | bigint;
};
```

### Strike and quantity units

Treat strike, quantity, cost, payout, and balances as integer `bigint` values in SDK code.

Do not convert to JavaScript `number` except for display formatting.

DUSDC has 6 decimals.

---

## 10. Guardrails for Claude Code

Claude Code must follow these rules when using this document.

### Allowed

- Use confirmed Testnet config values from this document.
- Use public server endpoints for discovery and summaries.
- Build SDK stubs around confirmed entrypoint concepts.
- Mark untested PTB construction as `MUST CONFIRM BEFORE CODING` until validated.
- Use `TBD` where response shapes are not yet discovered.
- Use official source branch for additional verification.

### Not allowed

- Do not invent active oracle IDs.
- Do not invent market/expiry data.
- Do not invent strike grid values.
- Do not invent public server response shapes.
- Do not treat public server endpoints as write paths.
- Do not represent PredictManager positions as NFTs.
- Do not reimplement DeepBook Predict pricing.
- Do not reimplement oracle settlement.
- Do not reimplement vault risk or StrikeMatrix logic.
- Do not use old package IDs from prior experiments.
- Do not treat Testnet package IDs as future Mainnet IDs.

---

## 11. Open Questions for Next Claude Code Round

These should be answered by actual requests against the public server and/or testnet RPC.

1. What is the actual JSON shape of `/status`?
2. What is the actual JSON shape of `/predicts/:predict_id/state`?
3. What is the actual JSON shape of `/predicts/:predict_id/oracles`?
4. Which oracle IDs are currently active?
5. Which underlying assets and expiries are currently usable?
6. Where is strike grid data exposed in server responses?
7. How should RangePilot choose the first default market?
8. Does `/managers` support owner filtering or pagination parameters?
9. What is the best manager discovery strategy for a connected wallet?
10. Can `get_range_trade_amounts` be called through devInspect cleanly?
11. What is the exact PTB construction pattern for `RangeKey` as an intermediate argument?
12. What is the exact PTB construction pattern for DUSDC split + manager deposit?
13. How quickly does the public server index `RangeMinted` after transaction confirmation?

---

## 12. Suggested Document Placement

Recommended path in RangePilot repository:

```text
docs/DEEPBOOK_PREDICT_OFFICIAL_CONTRACT_INFO.md
```

Recommended updates after adding this document:

1. Add it to `docs/ARCHITECTURE_INDEX.md` under protocol reference docs.
2. Add it to `docs/SOURCE_DOCUMENTS.md` as an official derived source.
3. Update `docs/PROTOCOL_INTEGRATION_NOTES.md` with confirmed Testnet config.
4. Update `docs/ENTRYPOINT_BINDINGS_PLAN.md` with the confirmed entrypoint table.
5. In `docs/AGENT_WORKFLOW.md`, require Claude Code to read this document before any DeepBook Predict SDK or PTB work.
