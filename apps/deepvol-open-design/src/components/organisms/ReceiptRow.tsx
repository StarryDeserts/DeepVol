import { Pill } from "../atoms/Pill";
import { Label } from "../atoms/Label";
import { DataPair } from "../molecules/DataPair";
import { shortId, formatAtomicAmount, formatTimestampMs } from "../../lib/format";
import { DUSDC_DECIMALS } from "../../lib/constants";

type ReceiptRowProps = {
  receiptId: string;
  status: "open" | "redeemed" | "expired" | "settled" | "failed" | "local";
  seriesId: string;
  quantity: string;
  premiumAtomic: string;
  expiryMs: string;
  createdDigest?: string;
  className?: string;
};

export function ReceiptRow({
  receiptId,
  status,
  seriesId,
  quantity,
  premiumAtomic,
  expiryMs,
  createdDigest,
  className = "",
}: ReceiptRowProps) {
  return (
    <details className={`glass p-0 overflow-hidden ${className}`}>
      <summary className="flex items-center gap-4 px-5 py-4 row-hover min-h-[44px]">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-white truncate">{shortId(receiptId)}</span>
            <Pill variant={status}>{status}</Pill>
          </div>
          <div className="text-xs text-ink-mid mt-0.5">
            MOVE receipt {quantity} qty
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-sm text-white">
            {formatAtomicAmount(premiumAtomic, DUSDC_DECIMALS)} DUSDC
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
          <DataPair label="Receipt ID" value={shortId(receiptId)} mono />
          <DataPair label="Series" value={shortId(seriesId)} mono />
          <DataPair label="Quantity" value={quantity} mono />
          <DataPair label="Premium paid" value={`${formatAtomicAmount(premiumAtomic, DUSDC_DECIMALS)} DUSDC`} mono />
          <DataPair label="Expiry" value={formatTimestampMs(expiryMs)} mono />
          {createdDigest && (
            <DataPair label="Tx digest" value={shortId(createdDigest)} mono />
          )}
          <DataPair label="Status" value={<Pill variant={status}>{status}</Pill>} />
        </div>
      </div>
    </details>
  );
}
