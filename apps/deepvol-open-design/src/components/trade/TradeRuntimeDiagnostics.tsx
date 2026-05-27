import { formatAtomicAmount, shortId } from "../../lib/format";
import { classifyBalanceFailure, type RuntimeCandidateDiagnostic, type RuntimeMintabilitySummary } from "../../hooks/mintabilityDiagnostics";
import type { TradeRuntimeContext, TradeRuntimeProduct } from "../../hooks/tradeRuntimeContext";

type Props = {
  product: TradeRuntimeProduct;
  runtimeContext: TradeRuntimeContext;
  mintabilityStatus: string;
  mintabilityBlockers: string[];
  diagnosticSummary: RuntimeMintabilitySummary | null;
  candidateDiagnostics: RuntimeCandidateDiagnostic[];
  quoteMintCostAtomic?: string | null;
  quoteRedeemPayoutAtomic?: string | null;
  expectedPremiumAtomic?: string | null;
  createFeeAtomic?: string | null;
  walletDusdcAtomic?: string | null;
  walletDusdcCoinCount?: number | null;
  managerDusdcAtomic?: string | null;
  preflightStatus?: string | null;
  preflightMessage?: string | null;
};

export function TradeRuntimeDiagnostics({
  product,
  runtimeContext,
  mintabilityStatus,
  mintabilityBlockers,
  diagnosticSummary,
  candidateDiagnostics,
  quoteMintCostAtomic,
  quoteRedeemPayoutAtomic,
  expectedPremiumAtomic,
  createFeeAtomic,
  walletDusdcAtomic,
  walletDusdcCoinCount,
  managerDusdcAtomic,
  preflightStatus,
  preflightMessage,
}: Props) {
  const firstCandidate = candidateDiagnostics[0] ?? null;
  const rawFailureSummary = firstCandidate?.rawErrorSummary ?? firstCandidate?.message ?? null;
  const balanceEvidence = candidateDiagnostics.some((diagnostic) =>
    classifyBalanceFailure(diagnostic.rawErrorSummary) || classifyBalanceFailure(diagnostic.message),
  );

  return (
    <details className="group glass-inner p-4">
      <summary className="label cursor-pointer select-none flex items-center gap-2 hover:text-ink-mid">
        <span className="transition-transform group-open:rotate-90">&rsaquo;</span>
        Runtime diagnostics
      </summary>

      <div className="mt-3 space-y-4 text-[11px] text-ink-mid">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          <DiagnosticRow label="Product" value={product} />
          <DiagnosticRow label="Mintability status" value={mintabilityStatus} />
          <DiagnosticRow label="Preflight status" value={preflightStatus ?? "Not run"} />
          <DiagnosticRow label="Wallet" value={shortId(runtimeContext.walletAddress)} />
          <DiagnosticRow label="Network" value={runtimeContext.walletTestnet ? "Sui Testnet" : "Not Testnet"} />
          <DiagnosticRow label="PredictManager" value={shortId(runtimeContext.predictManagerId)} />
          <DiagnosticRow label="Active market" value={runtimeContext.activeMarketStatus ?? "Missing"} />
          <DiagnosticRow label="Market source" value={runtimeContext.activeMarketSource ?? "Missing"} />
          <DiagnosticRow label="Oracle id" value={shortId(runtimeContext.oracleId)} />
          <DiagnosticRow label="Oracle object" value={shortId(runtimeContext.oracleObjectId)} />
          <DiagnosticRow label="Expiry" value={runtimeContext.expiry ?? "Missing"} />
          <DiagnosticRow label="Quantity" value={runtimeContext.quantity ?? `Invalid: ${runtimeContext.rawQuantityInput}`} />
          <DiagnosticRow label="Anchor source" value={runtimeContext.anchorSource ?? "Missing"} />
          <DiagnosticRow label="Anchor price" value={runtimeContext.anchorPrice ?? "Missing"} />
          <DiagnosticRow label="Spot" value={runtimeContext.spot ?? "Missing"} />
          <DiagnosticRow label="Forward" value={runtimeContext.forward ?? "Missing"} />
          <DiagnosticRow label="Tick size" value={runtimeContext.tickSize ?? "Missing"} />
          <DiagnosticRow label="Min strike" value={runtimeContext.minStrike ?? "Missing"} />
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          <DiagnosticRow label="Wallet DUSDC" value={walletDusdcAtomic ? formatAtomicAmount(walletDusdcAtomic) : "Not checked"} />
          <DiagnosticRow label="Wallet DUSDC coins" value={walletDusdcCoinCount === null || walletDusdcCoinCount === undefined ? "Not checked" : String(walletDusdcCoinCount)} />
          <DiagnosticRow label="PredictManager DUSDC" value={managerDusdcAtomic ? formatAtomicAmount(managerDusdcAtomic) : "Not checked"} />
          <DiagnosticRow label="Quote mint cost" value={quoteMintCostAtomic ? formatAtomicAmount(quoteMintCostAtomic) : "Not available"} />
          <DiagnosticRow label="Quote redeem payout" value={quoteRedeemPayoutAtomic ? formatAtomicAmount(quoteRedeemPayoutAtomic) : "Not available"} />
          <DiagnosticRow label="Expected premium" value={expectedPremiumAtomic ? formatAtomicAmount(expectedPremiumAtomic) : "Not available"} />
          <DiagnosticRow label="Create fee" value={createFeeAtomic ? formatAtomicAmount(createFeeAtomic) : "Not available"} />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-ink-low">
          <div>Wallet DUSDC: deposit/create-fee source only.</div>
          <div>PredictManager DUSDC: mint collateral for primitive/MOVE premium.</div>
          <div>{balanceEvidence ? "Balance-specific failure evidence detected in raw diagnostics." : "No raw balance/deposit failure evidence detected."}</div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          <DiagnosticRow label="Candidate count" value={String(diagnosticSummary?.totalCandidates ?? 0)} />
          <DiagnosticRow label="Quote passed count" value={String(diagnosticSummary?.quotedCandidates ?? 0)} />
          <DiagnosticRow label="Preflight passed count" value={String(diagnosticSummary?.preflightPassedCandidates ?? 0)} />
          <DiagnosticRow label="Dominant failure" value={diagnosticSummary?.dominantFailure ?? "None"} />
          <DiagnosticRow label="First candidate" value={firstCandidate?.candidateLabel ?? "None"} />
          <DiagnosticRow label="Raw failure summary" value={rawFailureSummary ?? "None"} />
        </div>

        {runtimeContext.blockers.length > 0 && (
          <DiagnosticList title="Missing/invalid runtime inputs" entries={runtimeContext.blockers} tone="fail" />
        )}
        {mintabilityBlockers.length > 0 && (
          <DiagnosticList title="Mintability blockers" entries={mintabilityBlockers} tone="fail" />
        )}
        {preflightMessage && (
          <DiagnosticList title="Preflight message" entries={[preflightMessage]} tone="idle" />
        )}
        {candidateDiagnostics.length > 0 && (
          <div className="space-y-2">
            <div className="label">Candidate diagnostics</div>
            {candidateDiagnostics.slice(0, 5).map((diagnostic, index) => (
              <div key={`${diagnostic.product}-${diagnostic.candidateLabel}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 font-mono text-ink-low">
                <div>{diagnostic.candidateLabel}</div>
                <div>quoteStatus={diagnostic.quoteStatus} quoteCostAtomic={diagnostic.quoteCostAtomic ?? "null"}</div>
                <div>preflightStatus={diagnostic.preflightStatus} failureFamily={diagnostic.failureFamily ?? "null"}</div>
                <div>message={diagnostic.message ?? "null"}</div>
                <div>rawErrorSummary={diagnostic.rawErrorSummary ?? "null"}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="label">{label}</div>
      <div className="mt-1 break-all font-mono text-white">{value}</div>
    </div>
  );
}

function DiagnosticList({
  title,
  entries,
  tone,
}: {
  title: string;
  entries: string[];
  tone: "fail" | "idle";
}) {
  return (
    <div className="space-y-2">
      <div className="label">{title}</div>
      <div className="flex flex-wrap gap-2">
        {entries.map((entry, index) => (
          <span key={`${entry}-${index}`} className={`pill ${tone === "fail" ? "pill-fail" : "pill-idle"} text-[11px]`}>
            {entry}
          </span>
        ))}
      </div>
    </div>
  );
}
