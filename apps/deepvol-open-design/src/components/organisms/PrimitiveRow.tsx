import { Pill } from "@/components/atoms/Pill";
import { DataPair } from "@/components/molecules/DataPair";
import { shortId, formatAtomicAmount, formatTimestampMs } from "@/lib/format";
import { DUSDC_DECIMALS } from "@/lib/constants";
import type { MarketProduct } from "@/lib/productRoute";

type PrimitiveRowProps = {
  primitiveKind: Exclude<MarketProduct, "MOVE">;
  status: "open" | "redeemed" | "expired" | "settled" | "failed" | "local";
  strike: string;
  quantity: string;
  costAtomic: string;
  expiryMs: string;
  digest?: string;
  className?: string;
};

const KIND_COLOR: Record<string, string> = {
  UP: "text-aqua-400",
  DOWN: "text-coral-400",
  RANGE: "text-iris-500",
};

export function PrimitiveRow({
  primitiveKind,
  status,
  strike,
  quantity,
  costAtomic,
  expiryMs,
  digest,
  className = "",
}: PrimitiveRowProps) {
  return (
    <details className={`glass p-0 overflow-hidden ${className}`}>
      <summary className="flex items-center gap-4 px-5 py-4 row-hover min-h-[44px]">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-mono text-sm font-medium ${KIND_COLOR[primitiveKind] ?? "text-ink-hi"}`}>
              {primitiveKind}
            </span>
            <Pill variant={status}>{status}</Pill>
          </div>
          <div className="text-xs text-ink-mid mt-0.5">
            Strike {strike} / {quantity} qty
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-sm text-white">
            {formatAtomicAmount(costAtomic, DUSDC_DECIMALS)} DUSDC
          </div>
          <div className="text-xs text-ink-mid">{formatTimestampMs(expiryMs)}</div>
        </div>
        <svg
          className="chev text-ink-mid shrink-0"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>

      <div className="px-5 pb-5 pt-2 border-t hairline">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <DataPair label="Kind" value={primitiveKind} mono />
          <DataPair label="Strike" value={strike} mono />
          <DataPair label="Quantity" value={quantity} mono />
          <DataPair label="Cost" value={`${formatAtomicAmount(costAtomic, DUSDC_DECIMALS)} DUSDC`} mono />
          <DataPair label="Expiry" value={formatTimestampMs(expiryMs)} mono />
          {digest && <DataPair label="Tx digest" value={shortId(digest)} mono />}
          <DataPair label="Status" value={<Pill variant={status}>{status}</Pill>} />
        </div>
      </div>
    </details>
  );
}
