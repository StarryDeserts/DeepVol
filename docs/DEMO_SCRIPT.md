# DeepVol — Demo Script

Estimated duration: **~3:45–4:00** at ~150 words per minute. Timestamps map to the scenes in [`DEMO_VIDEO_PLAN.md`](./DEMO_VIDEO_PLAN.md).

**[Opening / 0:00]**
Hi — this is DeepVol, a volatility trading terminal built on Sui and DeepBook Predict.
Most prediction markets ask you one question: will the price go up, or down? But a lot of
the time you don't have a strong directional view — you just believe something big is about
to happen. DeepVol lets you trade exactly that. The core idea is simple: trade movement,
not just direction.

**[Landing / Markets / 0:25]**
This is the landing page — it lays out the products and the core idea up front. Let's jump
into Markets. The active market here is BTC against DUSDC on Sui Testnet. BTC MOVE is
featured first — that's our flagship product — and below it are the raw primitives: UP,
DOWN, and RANGE.

**[BTC terminal / 0:55]**
Opening the BTC market gives us the trading terminal: market context and the volatility view
on the left, the product tabs in the center, and a guided execution panel on the right.
Everything you're about to see runs through one shared trading state machine, so every product
walks the same safe sequence: discover the live market, validate that the position is actually
mintable, pull a fresh quote, run an on-chain preflight, and only then open your wallet to sign.

**[MOVE trade / 1:30]**
Let's start with BTC MOVE. A MOVE position is really two legs: a long UP above an upper strike,
and a long DOWN below a lower strike. Together, you win if BTC moves far enough out of the range
by expiry — in either direction. You're not picking up or down; you're betting on the size of the
move. Watch the steps light up: active market, mintable range, series, quote, preflight. When every
gate passes, the Review-in-wallet button unlocks, and I approve the transaction in my own wallet.
DeepVol mints both legs through DeepBook Predict in a single call and issues a non-custodial
MoveReceipt that records the whole structure.

**[UP / DOWN / 2:20]**
Now the raw primitives. UP and DOWN are direct DeepBook Predict binary positions: UP wins if BTC
finishes above the strike, DOWN wins if it finishes below. They go through the same quote and
preflight gates, but they don't create a receipt and they don't pay a create fee — they're the raw
building blocks underneath MOVE, for advanced users who want a single directional leg.

**[RANGE / 2:55]**
RANGE is the mirror image of MOVE. Instead of betting that price leaves the range, a RANGE position
wins if BTC expires inside the interval you select. Same guided flow: the terminal searches for a
mintable interval, quotes it, runs preflight, and gates the wallet step behind those checks.

**[Portfolio / 3:25]**
Finally, the Portfolio. Your MOVE Receipts show up here as structured positions, separately from
your raw primitive positions. Because everything is non-custodial, your underlying legs stay in your
own PredictManager — DeepVol reads them back so you can see what you hold and get guided through
settlement and redeem.

**[Closing / 3:50]**
So that's DeepVol: a single, guided terminal for trading volatility on Sui. MOVE for the big move,
RANGE for staying in the range, UP and DOWN as the raw primitives — all non-custodial, all signed in
your own wallet, all built on DeepBook Predict. Thanks for watching.

---

*Note: the RANGE scene narration intentionally describes the gated flow (search → quote → preflight → gated wallet step) and does not claim a completed on-chain RANGE mint.*
