# DeepVol — Demo Video Plan

Target duration: **3–5 minutes (aim ~4:00)**. Audience: hackathon / demo day. The paired narration lives in [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md).

## Video structure

| Scene | Approx time | On-screen action | Talking points |
| --- | --- | --- | --- |
| Opening | 0:00–0:25 | Title card / landing hero. | Hook: "trade movement, not just direction." Introduce DeepVol as a volatility trading terminal on Sui + DeepBook Predict. |
| Landing / Markets | 0:25–0:55 | Scroll the landing products + how-it-works section; open `/markets`. | Active market is BTC / DUSDC on Sui Testnet. BTC MOVE is featured; UP, DOWN, and RANGE appear as primitive cards. |
| BTC market terminal | 0:55–1:30 | Open `/markets/btc`; show the 3-column layout. | Every product runs through one shared, gated state machine: active market → mintability → quote → preflight → wallet. |
| MOVE trade | 1:30–2:20 | MOVE tab; walk the steps lighting up; when gates pass, click Review-in-wallet; approve in wallet; show success. | MOVE = UP-above-upper + DOWN-below-lower; wins on a big move in either direction. Both legs mint in one call; a non-custodial MoveReceipt is created. |
| UP / DOWN primitive trade | 2:20–2:55 | Switch to UP, then DOWN tab; show the same quote/preflight gating. | UP/DOWN are raw DeepBook Predict binary primitives. Same gates, but no receipt and no Create Fee. |
| RANGE primitive trade | 2:55–3:25 | RANGE tab; show mintable-interval search → quote → preflight → gated wallet step. | RANGE wins when BTC expires **inside** the selected interval. **Honesty note:** show the gated flow up to the wallet step; only approve a real RANGE signature if a validated RANGE mint is available — otherwise narrate the gating and stop before signing. |
| Portfolio | 3:25–3:50 | Open `/portfolio`; show MOVE Receipts vs primitive positions. | Non-custodial: underlying legs stay in the user's PredictManager; DeepVol reads them back for review and settlement. |
| Closing | 3:50–4:00 | Return to landing / summary card. | Recap: MOVE = big move, RANGE = stays in range, UP/DOWN = raw primitives. All non-custodial, on Sui + DeepBook Predict. |

## Recording checklist

- Use a **test wallet only** — never a wallet holding real funds.
- Network set to **Sui Testnet**.
- Wallet funded with **SUI** for gas.
- A **PredictManager** is created and ready.
- The PredictManager is funded with **DUSDC**.
- An **active BTC market** is discoverable at record time.
- **MOVE / UP / DOWN** (and the RANGE flow) pre-tested successfully before recording.
- Close unrelated windows, tabs, and notifications.
- Never show a private key, seed phrase, or `.env` contents on screen.
- Record and note each **tx digest** for the video description.

## Screen recording tips

- Record at **1080p** or higher.
- Set browser zoom to **100%**.
- Move the mouse slowly and deliberately so viewers can follow.
- You may cut / trim footage while waiting on chain confirmations.
- **Keep** the wallet-confirmation and success states on screen — don't cut them.
- Use a clean browser profile (no unrelated extensions or bookmarks).
- Optionally add captions sourced from [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md).
