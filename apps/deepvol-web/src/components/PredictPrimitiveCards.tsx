import { DataGrid } from "./ui/DataGrid";
import { StateCallout } from "./ui/StateCallout";
import { StatusPill } from "./ui/StatusPill";

export type PredictPrimitiveKind = "UP" | "DOWN" | "RANGE";

export type PredictPrimitive = {
  kind: PredictPrimitiveKind;
  meaning: string;
  winsWhen: string;
  riskCopy: string;
  status: "Wallet-gated terminal" | "Quote/preflight only";
  ctaLabel: string;
  previewHref: string;
};

export const PREDICT_PRIMITIVES = [
  {
    kind: "UP",
    meaning: "Buy upside.",
    winsWhen: "BTC expires above the selected strike.",
    riskCopy: "Raw Predict primitive; wallet execution requires fresh quote, manager balance, and preflight gates.",
    status: "Wallet-gated terminal",
    ctaLabel: "Open UP terminal",
    previewHref: "/primitives?type=UP",
  },
  {
    kind: "DOWN",
    meaning: "Buy downside.",
    winsWhen: "BTC expires below the selected strike.",
    riskCopy: "Raw Predict primitive; wallet execution requires fresh quote, manager balance, and preflight gates.",
    status: "Wallet-gated terminal",
    ctaLabel: "Open DOWN terminal",
    previewHref: "/primitives?type=DOWN",
  },
  {
    kind: "RANGE",
    meaning: "Buy inside-range exposure.",
    winsWhen: "BTC expires inside the selected lower / upper range.",
    riskCopy: "Complement to MOVE; RANGE execution remains disabled until dedicated mintability validation.",
    status: "Quote/preflight only",
    ctaLabel: "Preview RANGE gates",
    previewHref: "/primitives?type=RANGE",
  },
] as const satisfies readonly PredictPrimitive[];

export function PredictPrimitiveCards() {
  return (
    <section className="card primitiveSection">
      <div className="cardHeader">
        <div>
          <div className="eyebrow">Predict primitive terminal</div>
          <h2>Predict building blocks</h2>
        </div>
        <StatusPill tone="info">BTC MOVE remains flagship</StatusPill>
      </div>

      <StateCallout tone="info" title="Primitive trades do not create MoveReceipt">
        UP and DOWN open wallet-gated primitive terminals. RANGE remains quote/preflight-only. Only BTC MOVE creates a DeepVol receipt in this app.
      </StateCallout>

      <div className="primitiveGrid">
        {PREDICT_PRIMITIVES.map((primitive) => (
          <article className="primitiveCard primitiveCardScaffold" key={primitive.kind}>
            <div className="primitiveCardTop">
              <span>{primitive.kind}</span>
              <StatusPill tone={primitive.status === "Wallet-gated terminal" ? "success" : "warning"}>{primitive.status}</StatusPill>
            </div>
            <DataGrid
              variant="compact"
              items={[
                { label: "Meaning", value: primitive.meaning },
                { label: "Wins when", value: primitive.winsWhen },
                { label: "Boundary", value: primitive.riskCopy },
              ]}
            />
            <div className="cardActions primitiveActions">
              <a className="secondaryButton" href={primitive.previewHref}>
                {primitive.ctaLabel}
              </a>
              <a className="primaryLink" href="/buy/btc-move">
                Trade BTC MOVE receipt
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
