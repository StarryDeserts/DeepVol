import type { ReactNode } from "react";
import { Pill } from "@/components/atoms/Pill";
import { Label } from "@/components/atoms/Label";
import { Spinner } from "@/components/atoms/Spinner";
import { SkeletonBlock } from "@/components/atoms/SkeletonBlock";
import { StatusDot } from "@/components/atoms/StatusDot";
import { GlassInner } from "@/components/molecules/GlassInner";
import { Toast } from "@/components/molecules/Toast";
import { Button } from "@/components/atoms/Button";
import { AdvancedDetails } from "./AdvancedDetails";

type QuoteStatus = "idle" | "loading" | "ready" | "stale" | "error";

type QuotePanelProps = {
  status: QuoteStatus;
  productLabel?: string;
  rangeLabel?: string;
  expiryLabel?: string;
  quantity?: string;
  premium?: string;
  createFee?: string;
  maxPremium?: string;
  redeemEstimate?: string;
  oracleFreshness?: string;
  lastRefreshed?: string;
  errorMessage?: string;
  staleMessage?: string;
  advancedEntries?: { label: string; value: ReactNode }[];
  onRefresh?: () => void;
  onRetry?: () => void;
  className?: string;
};

export function QuotePanel({
  status,
  productLabel,
  rangeLabel,
  expiryLabel,
  quantity,
  premium,
  createFee,
  maxPremium,
  redeemEstimate,
  oracleFreshness,
  lastRefreshed,
  errorMessage,
  staleMessage,
  advancedEntries = [],
  onRefresh,
  onRetry,
  className = "",
}: QuotePanelProps) {
  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label>Quote</Label>
          {status === "idle" && <Pill variant="idle"><StatusDot variant="idle" /> Idle</Pill>}
          {status === "loading" && <Pill variant="active"><Spinner /> Loading</Pill>}
          {status === "ready" && <Pill variant="pass">Ready</Pill>}
          {status === "stale" && <Pill variant="warn">Stale</Pill>}
          {status === "error" && <Pill variant="fail">Failed</Pill>}
        </div>
      </div>

      {/* Idle state */}
      {status === "idle" && (
        <div className="mt-6 glass-inner p-8 text-center">
          <span className="grid place-items-center w-12 h-12 rounded-2xl border border-white/10 bg-white/[0.04] mx-auto text-ink-mid">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 4h16v6H4zM4 14h10v6H4z" />
            </svg>
          </span>
          <h4 className="font-display text-lg text-white mt-4">No quote yet</h4>
          <p className="text-[13px] text-ink-mid mt-1.5 max-w-xs mx-auto">
            Select a market and enter quantity to request a quote.
          </p>
        </div>
      )}

      {/* Loading state */}
      {status === "loading" && (
        <div className="mt-6 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <GlassInner className="p-3">
              <Label>Premium</Label>
              <SkeletonBlock width="96px" height="20px" className="mt-2" />
            </GlassInner>
            <GlassInner className="p-3">
              <Label>Create fee</Label>
              <SkeletonBlock width="80px" height="20px" className="mt-2" />
            </GlassInner>
            <div className="col-span-2">
              <GlassInner className="p-3">
                <Label>Max premium</Label>
                <SkeletonBlock width="160px" height="20px" className="mt-2" />
              </GlassInner>
            </div>
          </div>
          <p className="text-[12px] text-ink-mid flex items-center gap-2">
            <Spinner /> Fetching live quote from DeepBook Predict.
          </p>
        </div>
      )}

      {/* Ready state */}
      {status === "ready" && (
        <>
          {productLabel && (
            <div
              className="mt-5 glass-inner p-4"
              style={{ background: "linear-gradient(135deg, rgba(108,242,194,.05), rgba(94,232,255,.03))" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="chip text-seafoam-400 border-seafoam-400/30 bg-seafoam-400/[0.07]">
                    {productLabel}
                  </span>
                  {rangeLabel && <span className="text-[12px] text-ink-mid">{rangeLabel}</span>}
                </div>
                {expiryLabel && <span className="text-[11px] font-mono text-ink-low">{expiryLabel}</span>}
              </div>
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <GlassInner className="p-3">
              <Label>Quantity</Label>
              <div className="font-mono text-sm text-white mt-1">{quantity ?? "N/A"}</div>
            </GlassInner>
            <GlassInner className="p-3">
              <Label>Premium</Label>
              <div className="font-mono text-sm text-white mt-1">{premium ?? "N/A"}</div>
            </GlassInner>
            <GlassInner className="p-3">
              <Label>Create fee</Label>
              <div className="font-mono text-sm text-white mt-1">{createFee ?? "N/A"}</div>
            </GlassInner>
            {redeemEstimate && (
              <GlassInner className="p-3">
                <Label>Redeem estimate</Label>
                <div className="font-mono text-sm text-seafoam-400 mt-1">{redeemEstimate}</div>
              </GlassInner>
            )}
            <div className="col-span-2">
              <GlassInner className="p-3">
                <Label>Max premium</Label>
                <div className="font-mono text-sm text-white mt-1">{maxPremium ?? "N/A"}</div>
              </GlassInner>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-[11px] font-mono text-ink-mid">
            {oracleFreshness && (
              <span className="inline-flex items-center gap-2">
                <StatusDot variant="live" /> {oracleFreshness}
              </span>
            )}
            {lastRefreshed && <span>Last refreshed {lastRefreshed}</span>}
          </div>
        </>
      )}

      {/* Stale state */}
      {status === "stale" && (
        <>
          <div className="mt-5">
            <Toast variant="warn">
              <div className="text-sm text-white">Quote may be stale</div>
              <p className="text-[12px] text-ink-mid mt-0.5">{staleMessage ?? "Refresh before preflight."}</p>
            </Toast>
          </div>
          {onRefresh && (
            <Button variant="outline" className="mt-4 w-full rounded-xl" onClick={onRefresh}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="inline mr-2">
                <path d="M21 12a9 9 0 11-3-6.7M21 3v6h-6" />
              </svg>
              Refresh quote
            </Button>
          )}
        </>
      )}

      {/* Error state */}
      {status === "error" && (
        <>
          <div className="mt-5">
            <Toast variant="fail">
              <div className="text-sm text-white">Could not fetch a live quote</div>
              <p className="text-[12px] text-ink-mid mt-0.5">
                {errorMessage ?? "DeepBook Predict did not return pricing."}
              </p>
              <div className="mt-3 flex gap-2 flex-wrap">
                {onRetry && (
                  <Button variant="outline" className="text-[12px] px-3.5 py-1.5" onClick={onRetry}>
                    Retry quote
                  </Button>
                )}
                {onRefresh && (
                  <Button variant="outline" className="text-[12px] px-3.5 py-1.5" onClick={onRefresh}>
                    Refresh active market
                  </Button>
                )}
              </div>
            </Toast>
          </div>
        </>
      )}

      {advancedEntries.length > 0 && (
        <AdvancedDetails entries={advancedEntries} className="mt-4" />
      )}
    </div>
  );
}
