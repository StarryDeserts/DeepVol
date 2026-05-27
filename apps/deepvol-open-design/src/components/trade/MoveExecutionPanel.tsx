import { useState } from "react";
import type { PrimitiveActiveMarketContext } from "@rangepilot/types/deepbookPredict";
import { useActiveBtcMoveSeries } from "../../hooks/useActiveBtcMoveSeries";
import { useBtcMoveMintableRange } from "../../hooks/useBtcMoveMintableRange";
import { useDeepVolQuote } from "../../hooks/useDeepVolQuote";
import { useBuyMoveReceipt } from "../../hooks/useBuyMoveReceipt";
import { formatAtomicAmount } from "../../lib/format";
import { WalletActionButton } from "./WalletActionButton";

type Props = {
  predictManagerId: string | null;
  activeMarket: PrimitiveActiveMarketContext | null;
  navigate: (to: string) => void;
};

export function MoveExecutionPanel({ predictManagerId, activeMarket, navigate }: Props) {
  const [quantityInput, setQuantityInput] = useState("1");

  const moveSeries = useActiveBtcMoveSeries(activeMarket, {
    quantity: quantityInput,
    predictManagerId,
  });
  const mintableRange = useBtcMoveMintableRange({
    activeMarket,
    predictManagerId,
    quantity: quantityInput,
  });
  const quote = useDeepVolQuote({
    quantityInput,
    predictManagerId,
    seriesId: moveSeries.seriesId,
  });
  const buy = useBuyMoveReceipt({ quote, predictManagerId });

  return (
    <div className="p-6" style={{ animation: "fade .3s ease" }}>
      <div className="glass-inner p-4">
        <span
          className="chip"
          style={{
            color: "#6CF2C2",
            borderColor: "rgba(108,242,194,.3)",
            background: "rgba(108,242,194,.07)",
          }}
        >
          BTC MOVE
        </span>
        <p className="mt-3 text-sm text-white leading-relaxed">
          Win if BTC expires <span className="text-aqua-400">outside</span> the range.
          Buys a DeepVol MoveReceipt redeemable at expiry.
        </p>
      </div>

      <div className="mt-5 space-y-4">
        {/* VolSeries status */}
        <div className="glass-inner p-4">
          <div className="label">VolSeries</div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className={`pill ${moveSeries.status === "ready" ? "pill-pass" : moveSeries.status === "loading" ? "pill-active" : "pill-idle"}`}>
              {moveSeries.statusLabel}
            </span>
          </div>
          <p className="text-[12px] text-ink-mid mt-2">{moveSeries.statusMessage}</p>
          {(moveSeries.status === "missing" || moveSeries.status === "stale" || moveSeries.status === "validationRequired" || moveSeries.status === "nonMintable") && (
            <button
              onClick={() => void mintableRange.regenerate()}
              disabled={mintableRange.status === "running"}
              className="mt-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm hover:border-aqua-400/40 ring-aqua inline-flex items-center gap-2"
            >
              {mintableRange.status === "running" ? (
                <>
                  <span className="spinner" /> Searching...
                </>
              ) : (
                "Validate mintable range"
              )}
            </button>
          )}
          {mintableRange.status === "passed" && mintableRange.candidate && (
            <div className="mt-2 text-[12px] text-seafoam-400">
              Found: {mintableRange.candidate.lowerStrike} — {mintableRange.candidate.upperStrike}
            </div>
          )}
          {mintableRange.status === "failed" && mintableRange.blockers.length > 0 && (
            <div className="mt-2 text-[12px] text-coral-400">
              {mintableRange.blockers[0]}
            </div>
          )}
        </div>

        {/* Range band */}
        <div>
          <span className="label">Range band</span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="glass-inner p-3">
              <div className="label">Lower</div>
              <div className="font-mono text-sm text-white mt-0.5">
                {moveSeries.series?.lowerStrike ?? mintableRange.candidate?.lowerStrike ?? "TBD"}
              </div>
            </div>
            <div className="glass-inner p-3">
              <div className="label">Upper</div>
              <div className="font-mono text-sm text-white mt-0.5">
                {moveSeries.series?.upperStrike ?? mintableRange.candidate?.upperStrike ?? "TBD"}
              </div>
            </div>
          </div>
        </div>

        {/* Size input */}
        <div>
          <div className="flex items-center justify-between">
            <span className="label">Quantity</span>
          </div>
          <div className="relative mt-2">
            <input
              className="input pr-20"
              value={quantityInput}
              onChange={(e) => setQuantityInput(e.target.value)}
              placeholder="Enter quantity"
            />
          </div>
        </div>

        {/* Quote */}
        <div className="glass-inner p-4">
          <div className="label">Quote</div>
          {quote.isLoading ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-ink-mid">
              <span className="spinner" /> Loading quote...
            </div>
          ) : quote.status === "ready" ? (
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-ink-mid">Expected premium</span>
                <span className="font-mono text-white">
                  {formatAtomicAmount(quote.expectedPremiumAtomic)}
                </span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-ink-mid">Create fee</span>
                <span className="font-mono text-white">
                  {formatAtomicAmount(quote.createFeeAtomic)}
                </span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-ink-mid">Max premium paid</span>
                <span className="font-mono text-white">
                  {formatAtomicAmount(quote.maxPremiumPaidAtomic)}
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
                <span key={i} className="pill pill-idle">
                  {b.slice(0, 60)}
                </span>
              ))}
              {quote.blockers.length === 0 && (
                <span className="pill pill-idle">Awaiting quote</span>
              )}
            </div>
          )}
        </div>

        {/* Preflight pills */}
        <div className="glass-inner p-4">
          <div className="label">Preflight</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`pill ${quote.preflight.binaryMintPassed ? "pill-pass" : "pill-idle"}`}>
              {quote.preflight.binaryMintPassed ? "✓ Mint" : "• Mint pending"}
            </span>
            <span className={`pill ${quote.preflight.buyReceiptPassed ? "pill-pass" : "pill-idle"}`}>
              {quote.preflight.buyReceiptPassed ? "✓ Receipt" : "• Receipt pending"}
            </span>
          </div>
          {quote.preflight.message && (
            <p className="text-[12px] text-ink-mid mt-2">{quote.preflight.message}</p>
          )}
        </div>

        {/* Action button */}
        <WalletActionButton
          transactionStatus={buy.transactionStatus}
          canSubmit={buy.canSubmit}
          blockers={buy.blockers}
          onSubmit={buy.submit}
          onNavigatePortfolio={() => navigate("/portfolio")}
          submitLabel="Mint BTC MOVE receipt"
          submittingLabel="Confirm in wallet..."
        />

        <p className="text-[11px] text-ink-low text-center">
          Non-custodial &middot; settled at expiry by Pyth oracle
        </p>

        {/* Advanced details */}
        <details className="group">
          <summary className="label cursor-pointer select-none flex items-center gap-2 hover:text-ink-mid">
            <span className="transition-transform group-open:rotate-90">&rsaquo;</span>
            Advanced
          </summary>
          <div className="mt-3 space-y-1 text-[11px] font-mono text-ink-low">
            <div>predictManagerId: {predictManagerId ?? "none"}</div>
            <div>seriesId: {moveSeries.seriesId ?? "none"}</div>
            <div>series.status: {moveSeries.status}</div>
            <div>mintableRange.status: {mintableRange.status}</div>
            <div>quote.status: {quote.status}</div>
            <div>buy.canSubmit: {String(buy.canSubmit)}</div>
            {buy.blockers.length > 0 && (
              <div>buy.blockers: {buy.blockers.join("; ")}</div>
            )}
            {mintableRange.advancedDiagnostics.map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
