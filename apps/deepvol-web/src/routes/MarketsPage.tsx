import { BtcMoveCard } from "../components/BtcMoveCard";
import { PredictPrimitiveCards } from "../components/PredictPrimitiveCards";
import { PageHero } from "../components/ui/PageHero";
import { StatusPill } from "../components/ui/StatusPill";

export function MarketsPage() {
  return (
    <div className="pageGrid marketsPage">
      <PageHero
        eyebrow="DeepVol BTC MOVE"
        title="Trade movement, not direction."
        meta={(
          <div className="heroMetaPills">
            <StatusPill tone="info">Sui Testnet</StatusPill>
            <StatusPill tone="neutral">BTC only MVP</StatusPill>
            <StatusPill tone="success">Non-custodial receipt</StatusPill>
            <StatusPill tone="warning">Primitive terminal</StatusPill>
          </div>
        )}
      >
        <p>
          BTC MOVE packages UP and DOWN DeepBook Predict binary legs into one protocol-enforced receipt for traders who want
          volatility exposure instead of directional exposure. UP and DOWN also open wallet-gated primitive terminals, while RANGE stays quote/preflight-only.
        </p>
      </PageHero>

      <BtcMoveCard />

      <section className="card primitiveSection">
        <div className="cardHeader">
          <div>
            <div className="eyebrow">First-time setup</div>
            <h2>What happens before a BTC MOVE buy?</h2>
          </div>
          <StatusPill tone="info">Browser-guided</StatusPill>
        </div>
        <div className="primitiveGrid">
          <article className="primitiveCard">
            <span>1. Wallet + Testnet</span>
            <p>Connect a wallet and switch to Sui Testnet before DeepVol shows transaction actions.</p>
          </article>
          <article className="primitiveCard">
            <span>2. PredictManager + DUSDC</span>
            <p>Create or store a PredictManager, then deposit DUSDC for Predict premium funding.</p>
          </article>
          <article className="primitiveCard">
            <span>3. Quote + preflight</span>
            <p>Refresh UP/DOWN quotes and run preflight before the buy wallet prompt can unlock.</p>
          </article>
        </div>
      </section>

      <PredictPrimitiveCards />
    </div>
  );
}
