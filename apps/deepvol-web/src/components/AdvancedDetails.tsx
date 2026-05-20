import { DataGrid } from "./ui/DataGrid";
import { StateCallout } from "./ui/StateCallout";
import { useDeepVolConfig } from "../hooks/useDeepVolConfig";
import { shortId } from "../lib/format";

export function AdvancedDetails() {
  const config = useDeepVolConfig();

  return (
    <details className="advancedDetails">
      <summary>Advanced protocol details</summary>
      <div className="advancedContent">
        <StateCallout tone="info" title="Reference data only">
          These IDs are configured Testnet deployment references. The validation receipt and digest are historical evidence, not
          live quote data or current market terms.
        </StateCallout>
        <DataGrid
          variant="compact"
          items={[
            {
              label: "DeepVol package",
              value: <span className="mono" title={config.packageId ?? undefined}>{shortId(config.packageId)}</span>,
            },
            {
              label: "Predict object",
              value: <span className="mono" title={config.predictId}>{shortId(config.predictId)}</span>,
            },
            { label: "DUSDC type", value: <span className="mono wrapText">{config.dusdcCoinType}</span> },
            {
              label: "Validated receipt",
              value: <span className="mono" title={config.validatedReferenceReceiptId}>{shortId(config.validatedReferenceReceiptId)}</span>,
            },
            {
              label: "Validated buy digest",
              value: <span className="mono" title={config.validatedReferenceBuyDigest}>{shortId(config.validatedReferenceBuyDigest)}</span>,
            },
            { label: "Custody model", value: config.receiptCustody.replace("_", " ") },
          ]}
        />
        <StateCallout tone="success" title="Non-custodial boundary">
          The underlying UP and DOWN DeepBook Predict positions stay in the user's PredictManager. The MoveReceipt records
          protocol-enforced metadata and linkage; it is not a tradable custody claim in this MVP.
        </StateCallout>
      </div>
    </details>
  );
}
