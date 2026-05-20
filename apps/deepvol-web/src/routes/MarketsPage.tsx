import { BtcMoveCard } from "../components/BtcMoveCard";
import { PageHero } from "../components/ui/PageHero";
import { StatusPill } from "../components/ui/StatusPill";

const primitives = [
  {
    name: "UP",
    description: "Binary leg that pays when BTC settles above the upper strike.",
  },
  {
    name: "DOWN",
    description: "Binary leg that pays when BTC settles below the lower strike.",
  },
  {
    name: "RANGE",
    description: "Primitive for inside-range exposure; not the primary BTC MOVE MVP product.",
  },
] as const;

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
          </div>
        )}
      >
        <p>
          BTC MOVE packages UP and DOWN DeepBook Predict binary legs into one protocol-enforced receipt for traders who want
          volatility exposure instead of directional exposure.
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

      <section className="card primitiveSection">
        <div className="cardHeader">
          <div>
            <div className="eyebrow">Advanced primitives</div>
            <h2>Underlying building blocks</h2>
          </div>
          <StatusPill tone="neutral">Not the primary flow</StatusPill>
        </div>
        <div className="primitiveGrid">
          {primitives.map((primitive) => (
            <article className="primitiveCard" key={primitive.name}>
              <span>{primitive.name}</span>
              <p>{primitive.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
