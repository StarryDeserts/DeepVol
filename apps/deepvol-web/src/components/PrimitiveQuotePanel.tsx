import type { TransactionStatus as TransactionStatusType } from "@deepvol/types/deepbookPredict";
import { StatusChecklist, type StatusChecklistItem } from "./StatusChecklist";
import type { PrimitivePreflightController } from "../hooks/usePrimitivePreflight";
import type { PrimitiveQuoteState } from "../hooks/usePrimitiveQuote";
import type { usePrimitiveWalletExecution } from "../hooks/usePrimitiveWalletExecution";
import { PRIMITIVE_RANGE_EXECUTION_DISABLED_BLOCKER } from "../hooks/primitiveQuoteGate";
import { formatAtomicAmount, formatTimestampMs, shortId } from "../lib/format";
import { DataGrid } from "./ui/DataGrid";
import { StateCallout } from "./ui/StateCallout";
import { StatusPill } from "./ui/StatusPill";

type PrimitiveExecutionController = ReturnType<typeof usePrimitiveWalletExecution>;

type PrimitiveQuotePanelProps = {
  quote: PrimitiveQuoteState;
  preflight: PrimitivePreflightController;
  execution: PrimitiveExecutionController;
  predictManagerId: string | null;
};

export function PrimitiveQuotePanel({ quote, preflight, execution, predictManagerId }: PrimitiveQuotePanelProps) {
  const isRange = quote.primitiveKind === "RANGE";
  const checklist = buildExecutionChecklist({ quote, preflight, predictManagerId, executionBlockers: execution.blockers });

  return (
    <section className={`card quotePanel state-${quote.status}`}>
      <div className="cardHeader">
        <div>
          <div className="eyebrow">Predict primitive terminal</div>
          <h2>{quote.primitiveKind} primitive quote</h2>
        </div>
        <div className="cardActions">
          <StatusPill tone={statusTone(quote.status)}>{quote.status}</StatusPill>
          <button className="secondaryButton" type="button" disabled={!quote.canRefresh || quote.isRefreshing} onClick={quote.refreshQuote}>
            {quote.isRefreshing ? "Refreshing" : "Refresh quote"}
          </button>
        </div>
      </div>

      <StateCallout tone="info" title="Direct primitive trade boundary">
        Primitive trades do not create a DeepVol MoveReceipt. BTC MOVE remains the flagship receipt product and the only MVP path with a DeepVol Create Fee.
      </StateCallout>

      {quote.error && (
        <StateCallout tone="danger" title="Quote error">
          {quote.error}
        </StateCallout>
      )}

      <div className="primitiveQuoteMetrics">
        <article className="metricCard metricCard-hero">
          <span>Mint cost preview</span>
          <strong>{formatAtomicAmount(quote.mintCostAtomic)} DUSDC</strong>
          <small>Runtime devInspect quote for the selected primitive and quantity.</small>
        </article>
        <article className="metricCard">
          <span>Redeem payout preview</span>
          <strong>{formatAtomicAmount(quote.redeemPayoutAtomic)} DUSDC</strong>
          <small>Runtime-dependent payout preview; refresh before wallet review.</small>
        </article>
        <article className="metricCard">
          <span>Manager balance</span>
          <strong>{formatAtomicAmount(preflight.managerBalanceAtomic)} DUSDC</strong>
          <small>{preflight.managerBalanceCheckedAtMs ? "Read during primitive preflight." : "Run preflight to read PredictManager DUSDC."}</small>
        </article>
      </div>

      <DataGrid
        variant="compact"
        items={[
          {
            label: "VolSeries",
            value: <span className="mono" title={quote.series?.seriesId}>{shortId(quote.series?.seriesId)}</span>,
          },
          {
            label: "Oracle",
            value: <span className="mono" title={quote.series?.oracleId}>{shortId(quote.series?.oracleId)}</span>,
          },
          { label: "Expiry", value: formatTimestampMs(quote.series?.expiry) },
          { label: "Quantity", value: quote.quantity },
          { label: "Strike", value: quote.strike ?? "Not applicable" },
          { label: "Lower / upper", value: quote.lowerStrike && quote.upperStrike ? `${quote.lowerStrike} / ${quote.upperStrike}` : "Not applicable" },
          { label: "Quoted at", value: formatTimestampMs(quote.quotedAtMs) },
          { label: "Preflight ran", value: formatTimestampMs(preflight.lastRunAtMs) },
        ]}
      />

      <section className={`preflightAction state-${preflight.status}`} aria-live="polite">
        <div>
          <span className="eyebrow">devInspect gate</span>
          <strong>Run primitive mint preflight</strong>
          <p>{preflight.status === "passed" ? "Primitive mint preflight passed for the selected quote." : "Preflight builds the primitive mint PTB, reads manager balance, and runs devInspect."}</p>
        </div>
        <button className="primaryButton" type="button" disabled={!preflight.canRun || preflight.isRunning} onClick={preflight.runPreflight}>
          {preflight.isRunning ? "Running preflight" : "Run preflight"}
        </button>
      </section>

      {preflight.abortMessage && (
        <StateCallout tone="danger" title="Preflight failed">
          <p>{preflight.abortMessage}</p>
          {preflight.abortKnownReason && <small>Known reason: {preflight.abortKnownReason}</small>}
        </StateCallout>
      )}

      <section className={`primitiveExecutionPanel ${isRange ? "policy-disabled" : execution.canSubmit ? "ready" : "blocked"}`}>
        <div className="cardHeader">
          <div>
            <div className="eyebrow">Wallet-gated action</div>
            <h3>{isRange ? "RANGE execution disabled" : `Review ${quote.primitiveKind} in wallet`}</h3>
          </div>
          <StatusPill tone={isRange ? "warning" : execution.canSubmit ? "success" : "warning"}>{isRange ? "Disabled" : execution.canSubmit ? "Ready" : "Blocked"}</StatusPill>
        </div>
        <p>
          {isRange
            ? PRIMITIVE_RANGE_EXECUTION_DISABLED_BLOCKER
            : "UP/DOWN wallet execution reruns quote, manager balance, and binary mint preflight immediately before the wallet prompt."}
        </p>
        <StatusChecklist title="Primitive execution readiness" items={checklist} />
        {execution.blockers.length > 0 && (
          <StateCallout tone="warning" title="Execution blockers">
            <ul>
              {execution.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
            </ul>
          </StateCallout>
        )}
        <button className="primaryButton" type="button" disabled={!execution.canSubmit} onClick={execution.submit}>
          {isRange ? "RANGE execution disabled" : execution.canSubmit ? `Review ${quote.primitiveKind} in wallet` : "Resolve gates first"}
        </button>
        {!execution.canSubmit && <p className="buttonHelp">Fresh quote, fresh preflight, and manager DUSDC balance are required before wallet review.</p>}
        <TransactionStatus status={execution.transactionStatus} />
      </section>

      {[...quote.warnings, ...preflight.warnings].length > 0 && (
        <StateCallout tone="info" title="Diagnostics">
          <ul>
            {[...quote.warnings, ...preflight.warnings].map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </StateCallout>
      )}

      {quote.blockers.length > 0 && (
        <StateCallout tone="warning" title="Quote blockers">
          <ul>
            {quote.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
          </ul>
        </StateCallout>
      )}

      {preflight.blockers.length > 0 && (
        <StateCallout tone="warning" title="Preflight blockers">
          <ul>
            {preflight.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
          </ul>
        </StateCallout>
      )}
    </section>
  );
}

function buildExecutionChecklist({
  quote,
  preflight,
  predictManagerId,
  executionBlockers,
}: {
  quote: PrimitiveQuoteState;
  preflight: PrimitivePreflightController;
  predictManagerId: string | null;
  executionBlockers: string[];
}): StatusChecklistItem[] {
  const isRange = quote.primitiveKind === "RANGE";

  return [
    {
      label: "Primitive policy",
      state: isRange ? "blocked" : "complete",
      detail: isRange ? "RANGE execution waits for dedicated validation" : "UP/DOWN execution can unlock behind gates",
    },
    {
      label: "PredictManager ready",
      state: predictManagerId ? "complete" : "blocked",
      detail: predictManagerId ? "Manager ID provided" : "Enter a PredictManager ID",
    },
    {
      label: "Fresh quote",
      state: quote.status === "ready" && quote.mintCostAtomic ? "complete" : quote.status === "loading" ? "pending" : "blocked",
      detail: quote.mintCostAtomic ? `Mint cost ${formatAtomicAmount(quote.mintCostAtomic)} DUSDC` : "Refresh primitive quote",
    },
    {
      label: "Manager balance",
      state: preflight.managerBalanceAtomic ? "complete" : preflight.isRunning ? "pending" : "blocked",
      detail: preflight.managerBalanceAtomic ? `${formatAtomicAmount(preflight.managerBalanceAtomic)} DUSDC read` : "Run preflight to read manager balance",
    },
    {
      label: "Mint preflight",
      state: preflight.status === "passed" ? "complete" : preflight.isRunning ? "pending" : "blocked",
      detail: preflight.status === "passed" ? "devInspect mint gate passed" : "Run primitive mint preflight",
    },
    {
      label: "Wallet review",
      state: executionBlockers.length === 0 ? "complete" : "blocked",
      detail: executionBlockers.length === 0 ? "Wallet prompt can be shown after click" : "Resolve blockers before wallet prompt",
    },
  ];
}

function TransactionStatus({ status }: { status: TransactionStatusType }) {
  if (status.state === "idle") {
    return null;
  }

  return (
    <section className={`transactionStatus ${status.state}`} aria-live="polite">
      <strong>Transaction status: {status.state}</strong>
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

function statusTone(status: PrimitiveQuoteState["status"]) {
  if (status === "ready") {
    return "success";
  }

  if (status === "blocked" || status === "loading") {
    return "warning";
  }

  if (status === "error") {
    return "danger";
  }

  return "neutral";
}
