import { useEffect, useState } from "react";
import type { PrimitiveActiveMarketContext } from "@rangepilot/types/deepbookPredict";
import { usePrimitiveMintableStrike } from "../../hooks/usePrimitiveMintableStrike";
import { usePrimitiveQuote } from "../../hooks/usePrimitiveQuote";
import { usePrimitivePreflight } from "../../hooks/usePrimitivePreflight";
import { usePrimitiveWalletExecution } from "../../hooks/usePrimitiveWalletExecution";
import { formatAtomicAmount } from "../../lib/format";
import { WalletActionButton } from "./WalletActionButton";

type Props = {
  kind: "UP" | "DOWN";
  predictManagerId: string | null;
  activeMarket: PrimitiveActiveMarketContext | null;
  navigate: (to: string) => void;
};

export function BinaryPrimitiveExecutionPanel({ kind, predictManagerId, activeMarket, navigate }: Props) {
  const [quantityInput, setQuantityInput] = useState("1");
  const [strikeInput, setStrikeInput] = useState("");

  useEffect(() => {
    if (!activeMarket) return;
    const suggested = kind === "UP"
      ? activeMarket.suggestedUpStrike
      : activeMarket.suggestedDownStrike;
    if (suggested && !strikeInput) {
      setStrikeInput(suggested);
    }
  }, [activeMarket, kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const mintableStrike = usePrimitiveMintableStrike({
    activeMarket,
    predictManagerId,
    quantity: quantityInput,
    primitiveKind: kind,
  });

  const quote = usePrimitiveQuote({
    activeMarket,
    primitiveKind: kind,
    quantityInput,
    strikeInput: mintableStrike.candidate?.strike ?? strikeInput,
    lowerStrikeInput: "",
    upperStrikeInput: "",
  });

  const preflight = usePrimitivePreflight({
    quote,
    predictManagerId,
  });

  const execution = usePrimitiveWalletExecution({
    quote,
    preflight,
    predictManagerId,
    primitiveMintabilityStatus: mintableStrike.status,
  });

  const directionColor = kind === "UP" ? "text-seafoam-400" : "text-aqua-400";
  const directionWord = kind === "UP" ? "above" : "below";

  return (
    <div className="p-6" style={{ animation: "fade .3s ease" }}>
      <div className="glass-inner p-4">
        <span className="chip">Primitive &middot; {kind}</span>
        <p className="mt-3 text-sm text-white leading-relaxed">
          Win if BTC expires <span className={directionColor}>{directionWord}</span> the strike.
        </p>
        <p className="mt-1.5 text-[12px] text-ink-mid">
          Primitive trades are raw Predict positions and do not create a DeepVol MoveReceipt.
        </p>
      </div>

      <div className="mt-5 space-y-4">
        {/* Mintability */}
        <div className="glass-inner p-4">
          <div className="label">Mintable strike</div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className={`pill ${mintableStrike.status === "passed" ? "pill-pass" : mintableStrike.status === "running" ? "pill-active" : mintableStrike.status === "failed" ? "pill-fail" : "pill-idle"}`}>
              {mintableStrike.status === "passed" ? "✓ Found" : mintableStrike.status === "running" ? "Searching..." : mintableStrike.status === "failed" ? "✗ Not found" : "Pending"}
            </span>
          </div>
          {mintableStrike.status !== "passed" && mintableStrike.status !== "running" && (
            <button
              onClick={() => void mintableStrike.regenerate()}
              className="mt-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm hover:border-aqua-400/40 ring-aqua inline-flex items-center gap-2"
            >
              Generate mintable strike
            </button>
          )}
          {mintableStrike.status === "running" && (
            <div className="mt-2 flex items-center gap-2 text-[12px] text-ink-mid">
              <span className="spinner" /> Searching for mintable {kind} strike...
            </div>
          )}
          {mintableStrike.candidate && (
            <div className="mt-2 text-[12px] text-seafoam-400 font-mono">
              Strike: {mintableStrike.candidate.strike}
            </div>
          )}
          {mintableStrike.status === "failed" && mintableStrike.blockers.length > 0 && (
            <div className="mt-2 text-[12px] text-coral-400">
              {mintableStrike.blockers[0]}
            </div>
          )}
        </div>

        {/* Strike input */}
        <div>
          <div className="label">Strike</div>
          <input
            className="input mt-2 font-mono"
            value={mintableStrike.candidate?.strike ?? strikeInput}
            onChange={(e) => setStrikeInput(e.target.value)}
            placeholder={kind === "UP" ? "Enter UP strike" : "Enter DOWN strike"}
          />
        </div>

        {/* Quantity input */}
        <div>
          <div className="flex items-center justify-between">
            <span className="label">Quantity</span>
          </div>
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
              <span className="spinner" /> Running mint preflight...
            </div>
          )}
          {preflight.abortMessage && (
            <p className="text-[12px] text-coral-400 mt-2">{preflight.abortMessage}</p>
          )}
          {preflight.warnings.length > 0 && (
            <p className="text-[12px] text-amber-400 mt-2">{preflight.warnings[0]}</p>
          )}
        </div>

        {/* Action button */}
        <WalletActionButton
          transactionStatus={execution.transactionStatus}
          canSubmit={execution.canSubmit}
          blockers={execution.blockers}
          onSubmit={execution.submit}
          onNavigatePortfolio={() => navigate("/portfolio")}
          submitLabel={`Buy ${kind} primitive`}
          submittingLabel="Confirm in wallet..."
        />

        {/* Advanced details */}
        <details className="group">
          <summary className="label cursor-pointer select-none flex items-center gap-2 hover:text-ink-mid">
            <span className="transition-transform group-open:rotate-90">&rsaquo;</span>
            Advanced
          </summary>
          <div className="mt-3 space-y-1 text-[11px] font-mono text-ink-low">
            <div>kind: {kind}</div>
            <div>predictManagerId: {predictManagerId ?? "none"}</div>
            <div>mintableStrike.status: {mintableStrike.status}</div>
            <div>quote.status: {quote.status}</div>
            <div>preflight.status: {preflight.status}</div>
            <div>execution.canSubmit: {String(execution.canSubmit)}</div>
            {execution.blockers.length > 0 && (
              <div>execution.blockers: {execution.blockers.join("; ")}</div>
            )}
            {mintableStrike.advancedDiagnostics.map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
