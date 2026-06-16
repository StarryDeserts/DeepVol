import type { TransactionStatus as TransactionStatusType } from "@deepvol/types/deepbookPredict";
import { StateCallout } from "./ui/StateCallout";
import { StatusPill } from "./ui/StatusPill";
import { shortId } from "../lib/format";

type PredictManagerSetupCardProps = {
  managerId: string | null;
  knownManagerId: string | null;
  manualManagerId: string;
  isConnected: boolean;
  isTestnet: boolean;
  isLoading: boolean;
  validationMessage: string | null;
  discoveryMessage: string | null;
  transactionStatus: TransactionStatusType;
  onManualManagerIdChange: (value: string) => void;
  onStoreManualManagerId: () => void;
  onCreateManager: () => void;
};

export function PredictManagerSetupCard({
  managerId,
  knownManagerId,
  manualManagerId,
  isConnected,
  isTestnet,
  isLoading,
  validationMessage,
  discoveryMessage,
  transactionStatus,
  onManualManagerIdChange,
  onStoreManualManagerId,
  onCreateManager,
}: PredictManagerSetupCardProps) {
  const canCreate = isConnected && isTestnet;
  const canStore = manualManagerId.trim().length > 0;

  return (
    <section className="card setupActionCard">
      <div className="cardHeader">
        <div>
          <div className="eyebrow">Step 3</div>
          <h2>PredictManager setup</h2>
        </div>
        <StatusPill tone={managerId ? "success" : canCreate ? "warning" : "neutral"}>
          {managerId ? "Manager ready" : "Manager required"}
        </StatusPill>
      </div>
      <p>
        PredictManager is your personal DeepBook Predict account for holding DUSDC balances and primitive positions.
      </p>

      {managerId ? (
        <StateCallout tone="success" title="PredictManager validated">
          Using <span className="mono" title={managerId}>{shortId(managerId)}</span> for this Testnet wallet. {validationMessage ?? "Object type and owner validation passed."}
        </StateCallout>
      ) : (
        <StateCallout tone={knownManagerId ? "warning" : canCreate ? "warning" : "info"} title={knownManagerId ? "Manager hint needs validation" : "Create or store a manager"}>
          {knownManagerId
            ? validationMessage ?? "Stored PredictManager hint is being validated before deposits, quotes, and preflight can unlock."
            : canCreate
              ? "Create a PredictManager with your wallet. Existing object IDs are available from the Advanced / Developer fallback."
              : "Connect a Sui Testnet wallet before DeepVol can create or validate a manager hint."}
        </StateCallout>
      )}

      {(validationMessage || discoveryMessage) && (
        <p className="fieldHelp">{isLoading ? "Checking manager hint..." : validationMessage ?? discoveryMessage}</p>
      )}

      <div className="actionRow">
        <button className="primaryButton" type="button" disabled={!canCreate} onClick={onCreateManager}>
          Create PredictManager
        </button>
        {!canCreate && <small>Requires connected Sui Testnet wallet.</small>}
      </div>

      <details className="advancedDetails">
        <summary>Advanced / Developer: use an existing PredictManager</summary>
        <div className="advancedContent">
          <StateCallout tone="warning" title="Developer fallback only">
            Use this only if you already know your PredictManager object ID. DeepVol validates object type and owner before quote, preflight, or trade actions unlock.
          </StateCallout>
          <label className="fieldLabel" htmlFor="predict-manager-id">
            Existing PredictManager ID
          </label>
          <div className="inlineFieldGroup">
            <input
              id="predict-manager-id"
              value={manualManagerId}
              placeholder="0x..."
              autoComplete="off"
              onChange={(event) => onManualManagerIdChange(event.target.value)}
            />
            <button className="secondaryButton" type="button" disabled={!canStore} onClick={onStoreManualManagerId}>
              Store locally
            </button>
          </div>
          <small className="fieldHelp">
            Local storage is a browser hint only; DeepVol validates object type and owner before funding, quote, preflight, or buy actions unlock.
          </small>
        </div>
      </details>

      <TransactionStatus label="PredictManager action" status={transactionStatus} />
    </section>
  );
}

function TransactionStatus({ label, status }: { label: string; status: TransactionStatusType }) {
  if (status.state === "idle") {
    return null;
  }

  return (
    <section className={`transactionStatus ${status.state}`} aria-live="polite">
      <strong>{label}: {status.state}</strong>
      {status.message && <p>{status.message}</p>}
      {status.error && <p className="errorText">{status.error}</p>}
      {status.digest && <p>Digest: <span className="mono wrapText">{status.digest}</span></p>}
      {status.explorerUrl && (
        <p>
          <a href={status.explorerUrl} target="_blank" rel="noreferrer">Open in Sui Explorer</a>
        </p>
      )}
    </section>
  );
}
