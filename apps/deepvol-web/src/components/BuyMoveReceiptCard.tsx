import type { TransactionStatus as TransactionStatusType } from "@rangepilot/types/deepbookPredict";
import { StatusChecklist, type StatusChecklistItem } from "./StatusChecklist";
import { StateCallout } from "./ui/StateCallout";
import { StatusPill } from "./ui/StatusPill";
import type { DeepVolQuoteState } from "../hooks/useDeepVolQuote";
import { useBuyMoveReceipt } from "../hooks/useBuyMoveReceipt";
import { useSuiWallet } from "../hooks/useSuiWallet";
import { formatAtomicAmount } from "../lib/format";

type BuyMoveReceiptCardProps = {
  quote: DeepVolQuoteState;
  predictManagerId: string | null;
  walletDusdcChecked: boolean;
};

export function BuyMoveReceiptCard({ quote, predictManagerId, walletDusdcChecked }: BuyMoveReceiptCardProps) {
  const wallet = useSuiWallet();
  const buy = useBuyMoveReceipt({ quote, predictManagerId });
  const checklist = buildChecklist({ wallet, quote, predictManagerId, walletDusdcChecked });

  return (
    <section className="card transactionCard">
      <div className="cardHeader">
        <div>
          <div className="eyebrow">Wallet-gated action</div>
          <h2>Review BTC MOVE</h2>
        </div>
        <StatusPill tone={buy.canSubmit ? "success" : "warning"}>{buy.canSubmit ? "Ready" : "Blocked"}</StatusPill>
      </div>
      <p>
        DeepVol builds one transaction for `receipt::buy_move_receipt&lt;DUSDC&gt;`. The Move entrypoint derives the UP and DOWN
        legs from the VolSeries, mints both Predict positions, deposits the Create Fee, and transfers a non-custodial but
        protocol-enforced MoveReceipt to your wallet.
      </p>

      <div className="transactionSummary">
        <span>Expected premium</span>
        <strong>{formatAtomicAmount(quote.expectedPremiumAtomic)} DUSDC</strong>
      </div>

      <StatusChecklist title="Transaction readiness" items={checklist} />

      {buy.blockers.length > 0 && (
        <StateCallout tone="warning" title="Wallet prompt disabled">
          <ul>
            {buy.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
          </ul>
        </StateCallout>
      )}

      <button className="primaryButton" type="button" disabled={!buy.canSubmit} onClick={buy.submit}>
        {buy.canSubmit ? "Review BTC MOVE in wallet" : "Preflight required"}
      </button>
      {!buy.canSubmit && <p className="buttonHelp">Resolve the readiness checklist before a wallet prompt can be shown.</p>}
      <TransactionStatus status={buy.transactionStatus} />
    </section>
  );
}

function buildChecklist({
  wallet,
  quote,
  predictManagerId,
  walletDusdcChecked,
}: {
  wallet: ReturnType<typeof useSuiWallet>;
  quote: DeepVolQuoteState;
  predictManagerId: string | null;
  walletDusdcChecked: boolean;
}): StatusChecklistItem[] {
  const preflightComplete = quote.preflight.binaryMintPassed && quote.preflight.buyReceiptPassed;

  return [
    {
      label: "Wallet connected",
      state: wallet.address && wallet.isConnected ? "complete" : "blocked",
      detail: wallet.address ? "Account available" : "Connect a Sui wallet",
    },
    {
      label: "Sui Testnet",
      state: wallet.isTestnet ? "complete" : wallet.isConnected ? "blocked" : "pending",
      detail: wallet.isTestnet ? "Network ready" : "Switch wallet to Sui Testnet",
    },
    {
      label: "PredictManager ready",
      state: predictManagerId ? "complete" : "blocked",
      detail: predictManagerId ? "Manager object stored for this flow" : "Create or store a PredictManager object ID",
    },
    {
      label: "DUSDC wallet balance checked",
      state: walletDusdcChecked ? "complete" : wallet.isTestnet ? "pending" : "blocked",
      detail: walletDusdcChecked ? "Wallet Coin<DUSDC> objects loaded" : "Load wallet DUSDC before deposit and fee checks",
    },
    {
      label: "PredictManager funding checked",
      state: walletDusdcChecked ? "pending" : "blocked",
      detail: "Deposit premium DUSDC to PredictManager if needed; direct manager balance readback remains a preflight blocker.",
    },
    {
      label: "BTC MOVE Series loaded",
      state: quote.series ? "complete" : quote.status === "loading" ? "pending" : "blocked",
      detail: quote.series ? "Configured VolSeries available" : "Waiting for configured VolSeries readback",
    },
    {
      label: "UP quote ready",
      state: quote.upQuoteAtomic ? "complete" : quote.status === "loading" ? "pending" : "blocked",
      detail: quote.upQuoteAtomic ? "Fresh UP leg quote loaded" : "Waiting for UP quote",
    },
    {
      label: "DOWN quote ready",
      state: quote.downQuoteAtomic ? "complete" : quote.status === "loading" ? "pending" : "blocked",
      detail: quote.downQuoteAtomic ? "Fresh DOWN leg quote loaded" : "Waiting for DOWN quote",
    },
    {
      label: "Create Fee coin ready",
      state: quote.feeCoin ? "complete" : quote.status === "loading" ? "pending" : "blocked",
      detail: quote.feeCoin ? "Sender-owned DUSDC fee coin selected" : "Needs one Coin<DUSDC> covering Create Fee",
    },
    {
      label: "Full binary mint preflight",
      state: quote.preflight.binaryMintPassed ? "complete" : quote.status === "loading" ? "pending" : "blocked",
      detail: quote.preflight.binaryMintPassed ? "Binary mint preflight passed" : quote.preflight.message,
    },
    {
      label: "DeepVol receipt preflight",
      state: preflightComplete ? "complete" : quote.status === "loading" ? "pending" : "blocked",
      detail: preflightComplete ? "Receipt preflight passed" : quote.preflight.message,
    },
  ];
}

function TransactionStatus({ status }: { status: TransactionStatusType }) {
  if (status.state === "idle") {
    return null;
  }

  return (
    <section className={`transactionStatus ${status.state}`} aria-live="polite">
      <strong>Transaction status: {status.state}</strong>
      {status.message && <p>{status.message}</p>}
      {status.error && <p className="errorText">{status.error}</p>}
      {status.digest && <p>Digest: <span className="mono wrapText">{status.digest}</span></p>}
      {status.explorerUrl && (
        <p>
          <a href={status.explorerUrl} target="_blank" rel="noreferrer">Open in Sui Explorer</a>
        </p>
      )}
    </section>
  );
}
