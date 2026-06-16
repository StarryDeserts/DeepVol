import type { StoredDeepVolPrimitiveTrade } from "@rangepilot/deepvol-trading-react";

type Props = {
  receiptCount: number;
  primitiveCount: number;
  records: StoredDeepVolPrimitiveTrade[];
  onShowMove: () => void;
  onShowPrim: () => void;
};

export function PortfolioOverviewPanel({
  receiptCount,
  primitiveCount,
  records,
  onShowMove,
  onShowPrim,
}: Props) {
  return (
    <div style={{ animation: "fade .3s ease" }}>
      {/* Callout */}
      <div
        className="glass-inner p-4 mb-6 flex items-start gap-3"
        style={{
          background:
            "linear-gradient(135deg, rgba(94,232,255,.05), rgba(110,91,255,.04))",
        }}
      >
        <span
          className="grid place-items-center w-8 h-8 rounded-full shrink-0"
          style={{
            background: "rgba(94,232,255,.10)",
            color: "#5EE8FF",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </span>
        <p className="text-[13px] text-ink-mid leading-relaxed">
          MOVE creates DeepVol receipts.{" "}
          <span className="text-white">UP, DOWN, and RANGE</span> are
          raw Predict positions and do not create receipts. Both appear
          below but are tracked separately.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* MOVE summary */}
        <div className="col-span-12 lg:col-span-6 glass p-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="chip"
                  style={{
                    color: "#6CF2C2",
                    borderColor: "rgba(108,242,194,.3)",
                    background: "rgba(108,242,194,.07)",
                  }}
                >
                  Flagship
                </span>
                <span className="label">MOVE Receipts</span>
              </div>
              <h3 className="font-display text-xl text-white mt-2">
                Structured volatility
              </h3>
            </div>
            <div className="text-right">
              <div className="label">Receipts</div>
              <div className="font-display text-2xl text-white">
                {receiptCount}
              </div>
            </div>
          </div>

          <button
            onClick={onShowMove}
            className="mt-5 w-full bg-cta rounded-xl py-3 text-sm font-medium text-white shadow-cta ring-aqua"
          >
            View all receipts
          </button>
        </div>

        {/* Primitive summary */}
        <div className="col-span-12 lg:col-span-6 glass p-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="chip">Raw</span>
                <span className="label">Primitive Positions</span>
              </div>
              <h3 className="font-display text-xl text-white mt-2">
                Predict primitives
              </h3>
            </div>
            <div className="text-right">
              <div className="label">Positions</div>
              <div className="font-display text-2xl text-white">
                {primitiveCount}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-6">
            <div className="glass-inner p-3 text-center">
              <div className="label">UP</div>
              <div
                className="font-display text-xl mt-1"
                style={{ color: "#6CF2C2" }}
              >
                {records.filter((r) => r.primitiveType === "UP").length}
              </div>
            </div>
            <div className="glass-inner p-3 text-center">
              <div className="label">DOWN</div>
              <div
                className="font-display text-xl mt-1"
                style={{ color: "#5EE8FF" }}
              >
                {
                  records.filter((r) => r.primitiveType === "DOWN")
                    .length
                }
              </div>
            </div>
            <div className="glass-inner p-3 text-center">
              <div className="label">RANGE</div>
              <div
                className="font-display text-xl mt-1"
                style={{ color: "#9F95FF" }}
              >
                {
                  records.filter((r) => r.primitiveType === "RANGE")
                    .length
                }
              </div>
            </div>
          </div>

          <p className="mt-4 text-[12px] text-ink-low">
            General primitive indexing is future work. DeepVol currently
            tracks known local primitive records and selected market
            keys.
          </p>

          <button
            onClick={onShowPrim}
            className="mt-5 w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm hover:border-aqua-400/40 ring-aqua"
          >
            View primitives
          </button>
        </div>
      </div>
    </div>
  );
}
