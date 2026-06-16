import { useState } from "react";
import type { DeepVolPortfolioReceipt } from "@deepvol/trading-react";
import { shortId, formatTimestampMs } from "@/lib/format";

type Props = {
  receipt: DeepVolPortfolioReceipt;
  navigate: (to: string) => void;
};

function Skel({ className = "" }: { className?: string }) {
  return <div className={`skel ${className}`} />;
}

export function ReceiptRow({ receipt, navigate }: Props) {
  const [open, setOpen] = useState(false);
  const obj = receipt.object;
  const isRedeemed = receipt.storedRecord?.redeemValidation?.digest != null;

  const statusPill = isRedeemed ? "pill-redeemed" : "pill-open";
  const statusText = isRedeemed ? "Redeemed" : "Open";

  return (
    <details
      className="glass overflow-hidden"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="px-6 py-5 grid grid-cols-12 items-center gap-3 cursor-pointer">
        <div className="col-span-12 md:col-span-3 flex items-center gap-3">
          <span className="grid place-items-center w-10 h-10 rounded-xl border border-white/10 bg-abyss-700 text-amber-400">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M14.3 11.5c.9-.6 1.5-1.6 1.5-2.8 0-1.8-1.3-3.2-3-3.5V3h-2v2H9V3H7v2H5v2h2v10H5v2h2v2h2v-2h1.8v2h2v-2c2.6 0 4.7-1.8 4.7-4.2 0-1.4-.8-2.6-2.2-3.3zM9 7h3.5c.8 0 1.5.7 1.5 1.5S13.3 10 12.5 10H9V7zm4 10H9v-5h4c1.4 0 2.5 1.1 2.5 2.5S14.4 17 13 17z" />
            </svg>
          </span>
          <div>
            <div className="text-white font-medium">BTC MOVE</div>
            <div className="text-[11px] font-mono text-ink-low">
              Receipt &middot; {shortId(receipt.receiptId)}
            </div>
          </div>
        </div>
        <div className="col-span-6 md:col-span-2">
          <div className="label">Receipt ID</div>
          <div className="text-sm font-mono text-white mt-1">
            {shortId(receipt.receiptId)}
          </div>
        </div>
        <div className="col-span-6 md:col-span-2">
          <div className="label">Source</div>
          <div className="text-sm font-mono text-white mt-1">
            {receipt.source === "local" ? "Local wallet" : "Reference"}
          </div>
        </div>
        <div className="col-span-6 md:col-span-2">
          <div className="label">On-chain</div>
          <div className="text-sm font-mono mt-1">
            {obj ? (
              <span style={{ color: "#6CF2C2" }}>Verified</span>
            ) : receipt.readbackError ? (
              <span style={{ color: "#F7B955" }}>Read error</span>
            ) : (
              <Skel className="h-4 w-16" />
            )}
          </div>
        </div>
        <div className="col-span-6 md:col-span-2">
          <div className="label">Digest</div>
          <div className="text-sm font-mono text-white mt-1">
            {receipt.digest ? shortId(receipt.digest) : "—"}
          </div>
        </div>
        <div className="col-span-12 md:col-span-1 flex items-center justify-between md:justify-end gap-3">
          <span className={`pill ${statusPill}`}>{statusText}</span>
          <svg
            className="chev text-ink-mid"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </summary>

      <div className="border-t hairline px-6 py-5 grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-8 grid grid-cols-2 gap-3">
          <div className="glass-inner p-3">
            <div className="label">Receipt ID</div>
            <div className="text-[12px] font-mono text-white mt-1">
              {shortId(receipt.receiptId)}
            </div>
          </div>
          <div className="glass-inner p-3">
            <div className="label">Mint digest</div>
            <div className="text-[12px] font-mono text-white mt-1 truncate">
              {receipt.digest ? shortId(receipt.digest) : "—"}
            </div>
          </div>
          {receipt.storedRecord && (
            <>
              <div className="glass-inner p-3">
                <div className="label">Series</div>
                <div className="text-[12px] font-mono text-white mt-1 truncate">
                  {shortId(receipt.storedRecord.seriesId)}
                </div>
              </div>
              <div className="glass-inner p-3">
                <div className="label">Created</div>
                <div className="text-[12px] font-mono text-white mt-1">
                  {formatTimestampMs(receipt.storedRecord.createdAtMs)}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="col-span-12 md:col-span-4 flex flex-col gap-3">
          <div className="glass-inner p-4">
            <div className="label">Status</div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`pill ${statusPill}`}>{statusText}</span>
            </div>
            {receipt.readbackError && (
              <p className="mt-2 text-[11px] text-ink-mid">
                Readback error: {receipt.readbackError}
              </p>
            )}
          </div>
          <button
            onClick={() => navigate("/markets/btc")}
            className="rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm text-center hover:border-aqua-400/40 ring-aqua"
          >
            View market
          </button>
        </div>
      </div>
    </details>
  );
}
