import { useEffect, useState } from "react";
import type { PrimitiveActiveMarketContext } from "@rangepilot/types/deepbookPredict";
import { usePrimitiveMintableRange } from "../../hooks/usePrimitiveMintableRange";
import { usePrimitiveQuote } from "../../hooks/usePrimitiveQuote";
import { usePrimitivePreflight } from "../../hooks/usePrimitivePreflight";
import { usePrimitiveWalletExecution } from "../../hooks/usePrimitiveWalletExecution";
import { formatAtomicAmount } from "../../lib/format";
import { TradeRuntimeDiagnostics } from "./TradeRuntimeDiagnostics";
import { WalletActionButton } from "./WalletActionButton";

type Props = {
  predictManagerId: string | null;
  activeMarket: PrimitiveActiveMarketContext | null;
  navigate: (to: string) => void;
};

export function RangeExecutionPanel({ predictManagerId, activeMarket, navigate }: Props) {
  const [quantityInput, setQuantityInput] = useState("1");
  const [lowerStrikeInput, setLowerStrikeInput] = useState("");
  const [upperStrikeInput, setUpperStrikeInput] = useState("");

  useEffect(() => {
    if (!activeMarket) return;
    if (activeMarket.suggestedLowerStrike && !lowerStrikeInput) {
      setLowerStrikeInput(activeMarket.suggestedLowerStrike);
    }
    if (activeMarket.suggestedUpperStrike && !upperStrikeInput) {
      setUpperStrikeInput(activeMarket.suggestedUpperStrike);
    }
  }, [activeMarket]); // eslint-disable-line react-hooks/exhaustive-deps

  const mintableRange = usePrimitiveMintableRange({
    activeMarket,
    predictManagerId,
    quantity: quantityInput,
  });

  const effectiveLower = mintableRange.candidate?.lowerStrike ?? lowerStrikeInput;
  const effectiveUpper = mintableRange.candidate?.higherStrike ?? upperStrikeInput;
  const quoteLowerStrikeInput = mintableRange.status === "passed" ? mintableRange.candidate?.lowerStrike ?? "" : "";
  const quoteUpperStrikeInput = mintableRange.status === "passed" ? mintableRange.candidate?.higherStrike ?? "" : "";

  const quote = usePrimitiveQuote({
    activeMarket,
    primitiveKind: "RANGE",
    quantityInput,
    strikeInput: "",
    lowerStrikeInput: quoteLowerStrikeInput,
    upperStrikeInput: quoteUpperStrikeInput,
  });

  const preflight = usePrimitivePreflight({
    quote,
    predictManagerId,
    rangeMintabilityStatus: mintableRange.status,
  });

  const execution = usePrimitiveWalletExecution({
    quote,
    preflight,
    predictManagerId,
    rangeMintabilityStatus: mintableRange.status,
  });

  return (
    <div className="p-6" style={{ animation: "fade .3s ease" }}>
      <div className="glass-inner p-4">
        <span className="chip">Primitive &middot; RANGE</span>
        <p className="mt-3 text-sm text-white leading-relaxed">
          Win if BTC expires <span style={{ color: "#9F95FF" }}>inside</span> the interval.
        </p>
        <p className="mt-1.5 text-[12px] text-ink-mid">
          Primitive trades are raw Predict positions and do not create a DeepVol MoveReceipt.
        </p>
      </div>

      <div className="mt-5 space-y-4">
        {/* Mintability — NOT hardcoded disabled */}
        <div className="glass-inner p-4">
          <div className="label">Mintable RANGE interval</div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className={`pill ${mintableRange.status === "passed" ? "pill-pass" : mintableRange.status === "running" ? "pill-active" : mintableRange.status === "failed" ? "pill-fail" : "pill-idle"}`}>
              {mintableRange.status === "passed" ? "✓ Found" : mintableRange.status === "running" ? "Searching..." : mintableRange.status === "failed" ? "✗ Not found" : "Pending"}
            </span>
          </div>

          {mintableRange.status !== "passed" && mintableRange.status !== "running" && (
            <button
              onClick={() => void mintableRange.regenerate()}
              className="mt-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm hover:border-aqua-400/40 ring-aqua inline-flex items-center gap-2"
            >
              Generate mintable RANGE interval
            </button>
          )}

          {mintableRange.status === "running" && (
            <div className="mt-2 flex items-center gap-2 text-[12px] text-ink-mid">
              <span className="spinner" /> Searching for mintable RANGE interval...
            </div>
          )}

          {mintableRange.candidate && (
            <div className="mt-2 text-[12px] text-seafoam-400 font-mono">
              Interval: {mintableRange.candidate.lowerStrike} — {mintableRange.candidate.higherStrike}
            </div>
          )}

          {mintableRange.status === "failed" && mintableRange.blockers.length > 0 && (
            <div className="mt-2 text-[12px] text-coral-400">
              {mintableRange.blockers[0]}
            </div>
          )}

          {mintableRange.diagnosticSummary && (
            <div className="mt-2 text-[11px] text-ink-low font-mono">
              Candidates: {mintableRange.diagnosticSummary.totalCandidates} total,{" "}
              {mintableRange.diagnosticSummary.quotedCandidates} quoted,{" "}
              {mintableRange.diagnosticSummary.preflightPassedCandidates} passed
            </div>
          )}
        </div>

        {/* Lower / Upper inputs */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="label">Lower</div>
            <input
              className="input mt-2 font-mono"
              value={effectiveLower}
              onChange={(e) => setLowerStrikeInput(e.target.value)}
              placeholder="Lower strike"
            />
          </div>
          <div>
            <div className="label">Upper</div>
            <input
              className="input mt-2 font-mono"
              value={effectiveUpper}
              onChange={(e) => setUpperStrikeInput(e.target.value)}
              placeholder="Upper strike"
            />
          </div>
        </div>

        {/* Quantity */}
        <div>
          <div className="label">Quantity</div>
          <input
            className="input mt-2"
            value={quantityInput}
            onChange={(e) => setQuantityInput(e.target.value)}
            placeholder="Enter quantity"
          />
        </div>

        {/* Quote */}
        <div className="glass-inner p-4">
          <div className="flex items-center justify-between">
            <span className="label">Quote</span>
            {quote.canRefresh && (
              <button
                onClick={quote.refreshQuote}
                className="text-[11px] text-aqua-400 hover:underline"
              >
                Refresh
              </button>
            )}
          </div>
          {quote.isLoading ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-ink-mid">
              <span className="spinner" /> Loading quote...
            </div>
          ) : quote.status === "ready" ? (
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-ink-mid">Mint cost</span>
                <span className="font-mono text-white">
                  {formatAtomicAmount(quote.mintCostAtomic)}
                </span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-ink-mid">Redeem payout</span>
                <span className="font-mono text-white">
                  {formatAtomicAmount(quote.redeemPayoutAtomic)}
                </span>
              </div>
            </div>
          ) : quote.status === "error" ? (
            <div className="mt-3">
              <span className="pill pill-fail">Quote error</span>
              <p className="text-[12px] text-coral-400 mt-1">{quote.error}</p>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {quote.blockers.map((b, i) => (
                <span key={i} className="pill pill-idle text-[11px]">
                  {b.slice(0, 60)}
                </span>
              ))}
              {quote.blockers.length === 0 && (
                <span className="pill pill-idle">Awaiting quote</span>
              )}
            </div>
          )}
        </div>

        {/* Preflight */}
        <div className="glass-inner p-4">
          <div className="flex items-center justify-between">
            <span className="label">Preflight</span>
            {preflight.canRun && (
              <button
                onClick={preflight.runPreflight}
                className="text-[11px] text-aqua-400 hover:underline"
              >
                Run preflight
              </button>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`pill ${preflight.status === "passed" ? "pill-pass" : preflight.status === "failed" ? "pill-fail" : preflight.status === "running" ? "pill-active" : "pill-idle"}`}>
              {preflight.status === "passed" ? "✓ Passed" : preflight.status === "failed" ? "✗ Failed" : preflight.status === "running" ? "Running..." : "Pending"}
            </span>
          </div>
          {preflight.isRunning && (
            <div className="mt-2 flex items-center gap-2 text-[12px] text-ink-mid">
              <span className="spinner" /> Running RANGE mint preflight...
            </div>
          )}
          {preflight.abortMessage && (
            <p className="text-[12px] text-coral-400 mt-2">{preflight.abortMessage}</p>
          )}
          {preflight.warnings.length > 0 && (
            <p className="text-[12px] text-amber-400 mt-2">{preflight.warnings[0]}</p>
          )}
        </div>

        {/* Action button — gate-driven, NOT hardcoded disabled */}
        <WalletActionButton
          transactionStatus={execution.transactionStatus}
          canSubmit={execution.canSubmit}
          blockers={execution.blockers}
          onSubmit={execution.submit}
          onNavigatePortfolio={() => navigate("/portfolio")}
          submitLabel="Buy RANGE primitive"
          submittingLabel="Confirm in wallet..."
        />

        <TradeRuntimeDiagnostics
          product="RANGE"
          runtimeContext={mintableRange.runtimeContext}
          mintabilityStatus={mintableRange.status}
          mintabilityBlockers={mintableRange.blockers}
          diagnosticSummary={mintableRange.runtimeDiagnosticSummary}
          candidateDiagnostics={mintableRange.runtimeCandidateDiagnostics}
          quoteMintCostAtomic={quote.mintCostAtomic}
          quoteRedeemPayoutAtomic={quote.redeemPayoutAtomic}
          managerDusdcAtomic={preflight.managerBalanceAtomic}
          preflightStatus={preflight.status}
          preflightMessage={preflight.abortMessage ?? preflight.warnings[0] ?? null}
        />

        {/* Advanced details */}
        <details className="group">
          <summary className="label cursor-pointer select-none flex items-center gap-2 hover:text-ink-mid">
            <span className="transition-transform group-open:rotate-90">&rsaquo;</span>
            Advanced
          </summary>
          <div className="mt-3 space-y-1 text-[11px] font-mono text-ink-low">
            <div>stateMachine: active market -&gt; mintable interval -&gt; quote -&gt; preflight -&gt; wallet</div>
            <div>predictManagerId: {predictManagerId ?? "none"}</div>
            <div>quoteLowerStrikeInput: {quoteLowerStrikeInput || "none"}</div>
            <div>quoteUpperStrikeInput: {quoteUpperStrikeInput || "none"}</div>
            <div>mintableRange.status: {mintableRange.status}</div>
            <div>quote.status: {quote.status}</div>
            <div>preflight.status: {preflight.status}</div>
            <div>execution.canSubmit: {String(execution.canSubmit)}</div>
            {execution.blockers.length > 0 && (
              <div>execution.blockers: {execution.blockers.join("; ")}</div>
            )}
            {mintableRange.advancedDiagnostics.map((d, i) => (
              <div key={i}>{d}</div>
            ))}
            {mintableRange.candidateDiagnostics.map((d, i) => (
              <div key={`cd-${i}`}>
                candidate: {d.candidate.lowerStrike}-{d.candidate.higherStrike} strategy={d.candidate.strategy} failure={d.failureFamily}
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
