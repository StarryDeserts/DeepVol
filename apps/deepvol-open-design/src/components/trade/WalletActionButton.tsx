import type { TransactionStatus } from "@rangepilot/types/deepbookPredict";

type Props = {
  transactionStatus: TransactionStatus;
  canSubmit: boolean;
  blockers: string[];
  onSubmit: () => void;
  onNavigatePortfolio: () => void;
  submitLabel: string;
  submittingLabel: string;
};

export function WalletActionButton({
  transactionStatus,
  canSubmit,
  blockers,
  onSubmit,
  onNavigatePortfolio,
  submitLabel,
  submittingLabel,
}: Props) {
  const { state } = transactionStatus;

  if (state === "awaiting_wallet" || state === "building") {
    return (
      <div className="space-y-3">
        <button
          disabled
          className="w-full rounded-2xl py-4 font-medium text-ink-low bg-white/[0.03] border border-white/10 cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          <span className="spinner" />
          {state === "awaiting_wallet" ? submittingLabel : "Preparing transaction..."}
        </button>
        {transactionStatus.message && (
          <p className="text-[11px] text-ink-mid text-center">{transactionStatus.message}</p>
        )}
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="space-y-3">
        <div className="toast-pass p-4 rounded-xl">
          <div className="text-sm font-medium text-white">Transaction confirmed</div>
          {transactionStatus.message && (
            <p className="text-[12px] text-ink-mid mt-1">{transactionStatus.message}</p>
          )}
          {transactionStatus.explorerUrl && (
            <a
              href={transactionStatus.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] text-aqua-400 hover:underline mt-1 inline-block"
            >
              View on Sui Explorer
            </a>
          )}
        </div>
        <button
          onClick={onNavigatePortfolio}
          className="bg-cta w-full rounded-2xl py-4 font-medium text-white shadow-cta ring-aqua"
        >
          View in Portfolio
        </button>
      </div>
    );
  }

  if (state === "failed") {
    return (
      <div className="space-y-3">
        <div className="toast-fail p-4 rounded-xl">
          <div className="text-sm font-medium text-white">Transaction failed</div>
          {transactionStatus.error && (
            <p className="text-[12px] text-ink-mid mt-1">{transactionStatus.error}</p>
          )}
        </div>
        <button
          onClick={onSubmit}
          className="bg-cta w-full rounded-2xl py-4 font-medium text-white shadow-cta ring-aqua"
        >
          Try again
        </button>
      </div>
    );
  }

  if (state === "blocked_unconfirmed") {
    return (
      <div className="space-y-3">
        <div className="toast-warn p-4 rounded-xl">
          <div className="text-sm font-medium text-white">Blocked before wallet</div>
          {transactionStatus.error && (
            <p className="text-[12px] text-ink-mid mt-1">{transactionStatus.error}</p>
          )}
          {transactionStatus.explorerUrl && (
            <a
              href={transactionStatus.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] text-aqua-400 hover:underline mt-1 inline-block"
            >
              View on Sui Explorer
            </a>
          )}
        </div>
        <button
          disabled
          className="w-full rounded-2xl py-4 font-medium text-ink-low bg-white/[0.03] border border-white/10 cursor-not-allowed text-[13px]"
        >
          {transactionStatus.error ? transactionStatus.error.slice(0, 80) : "Blocked"}
        </button>
      </div>
    );
  }

  if (canSubmit) {
    return (
      <button
        onClick={onSubmit}
        className="bg-cta w-full rounded-2xl py-4 font-medium text-white shadow-cta ring-aqua"
      >
        {submitLabel}
      </button>
    );
  }

  if (blockers.length > 0) {
    return (
      <button
        disabled
        className="w-full rounded-2xl py-4 font-medium text-ink-low bg-white/[0.03] border border-white/10 cursor-not-allowed text-[13px]"
        title={blockers.join(" ")}
      >
        {blockers[0].slice(0, 80)}
      </button>
    );
  }

  return (
    <button
      disabled
      className="w-full rounded-2xl py-4 font-medium text-ink-low bg-white/[0.03] border border-white/10 cursor-not-allowed"
    >
      Preparing...
    </button>
  );
}
