import { useEffect, useMemo, useState } from "react";
import type { PrimitiveActiveMarketContext } from "@rangepilot/types/deepbookPredict";
import { useActiveBtcMoveSeries } from "../../hooks/useActiveBtcMoveSeries";
import { useBtcMoveMintableRange } from "../../hooks/useBtcMoveMintableRange";
import { useDeepVolQuote } from "../../hooks/useDeepVolQuote";
import { useDeepVolPreflight } from "../../hooks/useDeepVolPreflight";
import { useBuyMoveReceipt } from "../../hooks/useBuyMoveReceipt";
import { useCreateVolSeries } from "../../hooks/useCreateVolSeries";
import { formatAtomicAmount, formatTimestampMs } from "../../lib/format";
import { TradeRuntimeDiagnostics } from "./TradeRuntimeDiagnostics";
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
  const moveSeriesCreationValidation = useMemo(() => ({
    status: mintableRange.status,
    lowerStrike: mintableRange.candidate?.lowerStrike ?? null,
    upperStrike: mintableRange.candidate?.upperStrike ?? null,
    recordCreatedSeries: mintableRange.recordCreatedSeries,
  }), [mintableRange.candidate?.lowerStrike, mintableRange.candidate?.upperStrike, mintableRange.recordCreatedSeries, mintableRange.status]);
  const createVolSeries = useCreateVolSeries(activeMarket, moveSeriesCreationValidation);
  const moveSeriesMatchesMintableRange = Boolean(
    moveSeries.series &&
    mintableRange.status === "passed" &&
    mintableRange.candidate &&
    moveSeries.series.oracleId === mintableRange.candidate.oracleId &&
    moveSeries.series.expiry === mintableRange.candidate.expiry &&
    moveSeries.series.lowerStrike === mintableRange.candidate.lowerStrike &&
    moveSeries.series.upperStrike === mintableRange.candidate.upperStrike,
  );
  const moveSeriesReadyForQuote = moveSeries.status === "ready" || moveSeriesMatchesMintableRange;
  const moveQuoteSeriesId = moveSeriesReadyForQuote && mintableRange.status !== "failed" ? moveSeries.seriesId : null;
  const displayLowerStrike = mintableRange.candidate?.lowerStrike
    ?? (moveSeriesReadyForQuote ? moveSeries.series?.lowerStrike : null)
    ?? activeMarket?.suggestedLowerStrike
    ?? null;
  const displayUpperStrike = mintableRange.candidate?.upperStrike
    ?? (moveSeriesReadyForQuote ? moveSeries.series?.upperStrike : null)
    ?? activeMarket?.suggestedUpperStrike
    ?? null;

  useEffect(() => {
    if (createVolSeries.createdSeriesId) {
      moveSeries.setSeriesId(createVolSeries.createdSeriesId);
    }
  }, [createVolSeries.createdSeriesId, moveSeries.setSeriesId]);

  const quote = useDeepVolQuote({
    quantityInput,
    predictManagerId,
    seriesId: moveQuoteSeriesId,
    activeMarket,
  });
  const preflight = useDeepVolPreflight({
    quote,
    predictManagerId,
    walletDusdcChecked: quote.status !== "idle" && quote.status !== "loading",
  });
  const quoteForBuy = useMemo(() => ({
    ...quote,
    preflight: preflight.preflight,
  }), [preflight.preflight, quote]);
  const buy = useBuyMoveReceipt({ quote: quoteForBuy, predictManagerId });

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
        {/* Active market context */}
        <div className="glass-inner p-4">
          <div className="label">Active market</div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {activeMarket ? (
              <>
                <span className={`pill ${activeMarket.status === "live" ? "pill-pass" : "pill-idle"}`}>
                  {activeMarket.status === "live" ? "Live" : activeMarket.status === "stale" ? "Stale" : activeMarket.status === "expired" ? "Expired" : "Discovered"}
                </span>
                {activeMarket.expiry && (
                  <span className="text-[12px] text-ink-mid font-mono">
                    Expiry {formatTimestampMs(activeMarket.expiry)}
                  </span>
                )}
              </>
            ) : (
              <span className="pill pill-idle">Awaiting discovery</span>
            )}
          </div>
          {activeMarket && moveSeries.status === "idle" && (
            <p className="text-[12px] text-ink-mid mt-2">
              BTC market discovered. Select or create a VolSeries to enable MOVE trading.
            </p>
          )}
        </div>

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
          {mintableRange.status === "passed" && mintableRange.candidate && !moveSeriesReadyForQuote && (
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="text-[12px] text-ink-mid">
                Create or select a VolSeries for the validated MOVE range before quote/preflight.
              </div>
              <button
                onClick={() => createVolSeries.create({
                  lowerStrike: mintableRange.candidate!.lowerStrike,
                  upperStrike: mintableRange.candidate!.upperStrike,
                })}
                disabled={!createVolSeries.canCreate}
                className="mt-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm hover:border-aqua-400/40 disabled:opacity-50 disabled:cursor-not-allowed ring-aqua inline-flex items-center gap-2"
              >
                {createVolSeries.status === "building" || createVolSeries.status === "signing" ? (
                  <>
                    <span className="spinner" /> Creating VolSeries...
                  </>
                ) : (
                  "Create VolSeries for range"
                )}
              </button>
              {createVolSeries.blockers.length > 0 && (
                <div className="mt-2 text-[11px] text-ink-low">
                  {createVolSeries.blockers[0]}
                </div>
              )}
              {createVolSeries.error && (
                <div className="mt-2 text-[11px] text-coral-400">
                  {createVolSeries.error}
                </div>
              )}
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
                {displayLowerStrike ?? "Generate mintable range"}
              </div>
            </div>
            <div className="glass-inner p-3">
              <div className="label">Upper</div>
              <div className="font-mono text-sm text-white mt-0.5">
                {displayUpperStrike ?? "Generate mintable range"}
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
          <div className="flex items-center justify-between">
            <div className="label">Preflight</div>
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
            <span className={`pill ${preflight.status === "passed" ? "pill-pass" : preflight.status === "blocked" ? "pill-fail" : preflight.status === "running" ? "pill-active" : "pill-idle"}`}>
              {preflight.status === "passed" ? "✓ Receipt" : preflight.status === "blocked" ? "✗ Blocked" : preflight.status === "running" ? "Running..." : "• Receipt pending"}
            </span>
          </div>
          {preflight.preflight.message && (
            <p className="text-[12px] text-ink-mid mt-2">{preflight.preflight.message}</p>
          )}
          {preflight.blockers.length > 0 && (
            <p className="text-[12px] text-coral-400 mt-2">{preflight.blockers[0]}</p>
          )}
          {preflight.warnings.length > 0 && (
            <p className="text-[12px] text-amber-400 mt-2">{preflight.warnings[0]}</p>
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

        <TradeRuntimeDiagnostics
          product="MOVE"
          runtimeContext={mintableRange.runtimeContext}
          mintabilityStatus={mintableRange.status}
          mintabilityBlockers={mintableRange.blockers}
          diagnosticSummary={mintableRange.diagnosticSummary}
          candidateDiagnostics={mintableRange.candidateDiagnostics}
          quoteMintCostAtomic={quote.expectedPremiumAtomic}
          expectedPremiumAtomic={quote.expectedPremiumAtomic}
          createFeeAtomic={quote.createFeeAtomic}
          walletDusdcAtomic={quote.feeCoin?.balanceAtomic ?? null}
          walletDusdcCoinCount={quote.feeCoin ? 1 : null}
          managerDusdcAtomic={preflight.preflight.managerBalanceAtomic}
          preflightStatus={preflight.status}
          preflightMessage={preflight.preflight.message}
        />

        {/* Advanced details */}
        <details className="group">
          <summary className="label cursor-pointer select-none flex items-center gap-2 hover:text-ink-mid">
            <span className="transition-transform group-open:rotate-90">&rsaquo;</span>
            Advanced
          </summary>
          <div className="mt-3 space-y-1 text-[11px] font-mono text-ink-low">
            <div>stateMachine: active market -&gt; mintable range -&gt; VolSeries -&gt; quote -&gt; preflight -&gt; wallet</div>
            <div>predictManagerId: {predictManagerId ?? "none"}</div>
            <div>seriesId: {moveSeries.seriesId ?? "none"}</div>
            <div>moveQuoteSeriesId: {moveQuoteSeriesId ?? "none"}</div>
            <div>createVolSeries.status: {createVolSeries.status}</div>
            <div>series.status: {moveSeries.status}</div>
            <div>mintableRange.status: {mintableRange.status}</div>
            <div>quote.status: {quote.status}</div>
            <div>preflight.status: {preflight.status}</div>
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
