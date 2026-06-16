import type { StoredDeepVolPrimitiveTrade } from "@deepvol/trading-react";

type Props = {
  isLoading: boolean;
  totalPositions: number;
  receiptCount: number;
  primitiveCount: number;
  hasLocalReceipts: boolean;
  hasLocalPrimitiveRecords: boolean;
  records: StoredDeepVolPrimitiveTrade[];
};

function Skel({ className = "" }: { className?: string }) {
  return <div className={`skel ${className}`} />;
}

export function PortfolioSummaryCards({
  isLoading,
  totalPositions,
  receiptCount,
  primitiveCount,
  hasLocalReceipts,
  hasLocalPrimitiveRecords,
  records,
}: Props) {
  return (
    <section className="relative">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 reveal">
          {/* Total positions */}
          <div className="glass featured-accent p-6 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="label">Total positions</span>
            </div>
            <div className="mt-4 font-display text-3xl text-white tracking-tight">
              {isLoading ? (
                <Skel className="h-8 w-12" />
              ) : (
                totalPositions
              )}
            </div>
            <div className="mt-1 text-[12px] text-ink-mid font-mono">
              {receiptCount} receipts &middot; {primitiveCount} primitives
            </div>
          </div>

          {/* MOVE Receipts */}
          <div className="glass p-6 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="label">MOVE Receipts</span>
              <span
                className="chip"
                style={{
                  color: "#6CF2C2",
                  borderColor: "rgba(108,242,194,.28)",
                  background: "rgba(108,242,194,.06)",
                }}
              >
                Flagship
              </span>
            </div>
            <div className="mt-4 font-display text-3xl text-white tracking-tight">
              {isLoading ? (
                <Skel className="h-8 w-8" />
              ) : (
                receiptCount
              )}
            </div>
            <div className="mt-1 text-[12px] text-ink-mid font-mono">
              {hasLocalReceipts
                ? "Local wallet receipts"
                : "Reference receipts"}
            </div>
          </div>

          {/* Primitive Positions */}
          <div className="glass p-6 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="label">Primitive positions</span>
              <span className="chip">Raw</span>
            </div>
            <div className="mt-4 font-display text-3xl text-white tracking-tight">
              {primitiveCount}
            </div>
            <div className="mt-1 text-[12px] text-ink-mid font-mono">
              {records.filter((r) => r.primitiveType === "UP").length} UP
              &middot;{" "}
              {records.filter((r) => r.primitiveType === "DOWN").length} DOWN
              &middot;{" "}
              {records.filter((r) => r.primitiveType === "RANGE").length}{" "}
              RANGE
            </div>
          </div>

          {/* Local records */}
          <div className="glass p-6 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="label">Local records</span>
            </div>
            <div className="mt-4 font-display text-3xl text-white tracking-tight">
              {hasLocalPrimitiveRecords ? primitiveCount : 0}
            </div>
            <div className="mt-1 text-[12px] text-ink-mid font-mono">
              Tracked in browser storage
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
