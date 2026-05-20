import { MovePayoutDiagram } from "./MovePayoutDiagram";
import { DataGrid } from "./ui/DataGrid";
import { StatusPill } from "./ui/StatusPill";
import { useDeepVolConfig } from "../hooks/useDeepVolConfig";
import { shortId } from "../lib/format";

export function BtcMoveCard() {
  const config = useDeepVolConfig();

  return (
    <section className="card btcMoveCard cardGlow">
      <div className="cardHeader btcMoveHeader">
        <div>
          <div className="eyebrow">Primary MVP market</div>
          <h2>BTC MOVE = UP + DOWN.</h2>
        </div>
        <StatusPill tone="info">BTC only MVP</StatusPill>
      </div>
      <p className="heroCopy">
        BTC MOVE packages two DeepBook Predict binary legs into one protocol-enforced receipt. The position wins if BTC breaks
        below the lower strike or above the upper strike; if BTC stays inside the range, the premium is at risk.
      </p>
      <MovePayoutDiagram />
      <DataGrid
        items={[
          { label: "Market", value: config.primaryMarket },
          { label: "Quote asset", value: "DUSDC" },
          { label: "Create Fee", value: `${config.defaultCreateFeeBps} bps` },
          { label: "Custody model", value: "Non-custodial but protocol-enforced" },
        ]}
      />
      <div className="cardActions">
        <a className="primaryLink" href="/buy/btc-move">Open BTC MOVE</a>
        <span className="muted">Underlying positions stay in the user's PredictManager.</span>
      </div>
      <div className="secondaryDetails">
        <div className="sectionLabel">Deployment references</div>
        <DataGrid
          variant="compact"
          items={[
            {
              label: "VolSeries",
              value: <span className="mono" title={config.configuredSeriesId}>{shortId(config.configuredSeriesId)}</span>,
            },
            {
              label: "ProtocolVault",
              value: <span className="mono" title={config.protocolVaultId ?? undefined}>{shortId(config.protocolVaultId)}</span>,
            },
            {
              label: "Predict object",
              value: <span className="mono" title={config.predictId}>{shortId(config.predictId)}</span>,
            },
          ]}
        />
      </div>
    </section>
  );
}
