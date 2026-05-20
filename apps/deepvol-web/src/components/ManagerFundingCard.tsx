import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import type { DusdcBalance, TransactionStatus as TransactionStatusType } from "@rangepilot/types/deepbookPredict";
import {
  buildDepositDusdcTransaction,
  buildSuiExplorerTransactionUrl,
  selectDusdcCoinsForAmount,
  translateDeepBookPredictError,
} from "@rangepilot/sdk/deepbookPredict";
import { DEEPBOOK_PREDICT_TESTNET } from "@rangepilot/config/deepbookPredictTestnet";
import { StateCallout } from "./ui/StateCallout";
import { StatusPill } from "./ui/StatusPill";
import { useSuiWallet } from "../hooks/useSuiWallet";
import { formatAtomicAmount } from "../lib/format";
import { TESTNET_CHAIN } from "../lib/constants";

type ManagerFundingCardProps = {
  managerId: string | null;
  balance: DusdcBalance | undefined;
  isLoading: boolean;
  error: unknown;
  expectedPremiumAtomic: string | null;
  createFeeAtomic: string | null;
  feeCoinReady: boolean;
  onDeposited?: () => void;
};

export function ManagerFundingCard({
  managerId,
  balance,
  isLoading,
  error,
  expectedPremiumAtomic,
  createFeeAtomic,
  feeCoinReady,
  onDeposited,
}: ManagerFundingCardProps) {
  const wallet = useSuiWallet();
  const client = useSuiClient();
  const queryClient = useQueryClient();
  const [depositAmountAtomic, setDepositAmountAtomic] = useState(expectedPremiumAtomic ?? "");
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatusType>({ state: "idle" });
  const signAndExecuteTransaction = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      client.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showEvents: true,
          showEffects: true,
          showObjectChanges: true,
          showRawEffects: true,
        },
      }),
  });
  const selectedCoins = useMemo(() => {
    if (!balance || !/^[1-9][0-9]*$/.test(depositAmountAtomic)) {
      return null;
    }

    try {
      return selectDusdcCoinsForAmount(balance.coins, depositAmountAtomic);
    } catch {
      return null;
    }
  }, [balance, depositAmountAtomic]);
  const canDeposit = Boolean(wallet.address && wallet.isTestnet && managerId && selectedCoins && depositAmountAtomic);
  const errorMessage = error ? error instanceof Error ? error.message : String(error) : null;

  function useExpectedPremium() {
    if (expectedPremiumAtomic) {
      setDepositAmountAtomic(expectedPremiumAtomic);
    }
  }

  function depositDusdc() {
    if (!wallet.address || !wallet.isTestnet || !managerId) {
      setTransactionStatus({
        state: "blocked_unconfirmed",
        error: "Connect a Sui Testnet wallet and prepare a PredictManager before depositing DUSDC.",
      });
      return;
    }

    if (!selectedCoins) {
      setTransactionStatus({
        state: "blocked_unconfirmed",
        error: "Wallet DUSDC coins cannot cover the requested deposit amount.",
      });
      return;
    }

    setTransactionStatus({
      state: "building",
      message: "Building deposit<DUSDC> transaction for your PredictManager.",
    });

    try {
      const transaction = buildDepositDusdcTransaction({
        managerId,
        amountAtomic: depositAmountAtomic,
        coins: selectedCoins,
        config: DEEPBOOK_PREDICT_TESTNET,
        allowRealTestnetDeposit: true,
      });

      setTransactionStatus({
        state: "awaiting_wallet",
        message: "Confirm deposit<DUSDC> in your Sui Testnet wallet.",
      });

      signAndExecuteTransaction.mutate(
        {
          transaction,
          chain: TESTNET_CHAIN,
        },
        {
          onSuccess: (result) => {
            setTransactionStatus({
              state: "success",
              digest: result.digest,
              explorerUrl: buildSuiExplorerTransactionUrl(result.digest),
              message: "DUSDC deposit transaction succeeded. Refresh quote/preflight after the balance settles.",
            });
            void queryClient.invalidateQueries({ queryKey: ["deepvol-dusdc-balance"] });
            onDeposited?.();
          },
          onError: (depositError) => {
            setTransactionStatus({
              state: "failed",
              error: translateDeepBookPredictError(depositError),
            });
          },
        },
      );
    } catch (depositError) {
      setTransactionStatus({
        state: "blocked_unconfirmed",
        error: translateDeepBookPredictError(depositError),
      });
    }
  }

  return (
    <section className="card setupActionCard">
      <div className="cardHeader">
        <div>
          <div className="eyebrow">Step 4</div>
          <h2>DUSDC funding</h2>
        </div>
        <StatusPill tone={balance && BigInt(balance.totalAtomic) > 0n ? "success" : "warning"}>
          {isLoading ? "Checking" : `${formatAtomicAmount(balance?.totalAtomic)} DUSDC`}
        </StatusPill>
      </div>
      <p>
        Predict premium is paid from DUSDC deposited into your PredictManager. The DeepVol Create Fee is separate and needs a
        sender-owned Coin&lt;DUSDC&gt; in your wallet.
      </p>

      <div className="fundingSplitGrid">
        <article>
          <span>Wallet DUSDC</span>
          <strong>{formatAtomicAmount(balance?.totalAtomic)} DUSDC</strong>
          <small>{balance?.coins.length ?? 0} Coin&lt;DUSDC&gt; objects available for deposits and Create Fee selection.</small>
        </article>
        <article>
          <span>Expected premium</span>
          <strong>{formatAtomicAmount(expectedPremiumAtomic)} DUSDC</strong>
          <small>Should be available inside PredictManager before buy preflight can pass.</small>
        </article>
        <article>
          <span>Create Fee coin</span>
          <strong>{feeCoinReady ? "Ready" : "Needed"}</strong>
          <small>{formatAtomicAmount(createFeeAtomic)} DUSDC Create Fee from a wallet coin.</small>
        </article>
      </div>

      {errorMessage && (
        <StateCallout tone="warning" title="DUSDC balance readback">
          {errorMessage}
        </StateCallout>
      )}

      <label className="fieldLabel" htmlFor="manager-deposit-amount">
        Deposit amount, atomic DUSDC
      </label>
      <div className="inlineFieldGroup">
        <input
          id="manager-deposit-amount"
          value={depositAmountAtomic}
          inputMode="numeric"
          placeholder="1000000"
          onChange={(event) => setDepositAmountAtomic(event.target.value)}
        />
        <button className="secondaryButton" type="button" disabled={!expectedPremiumAtomic} onClick={useExpectedPremium}>
          Use premium
        </button>
      </div>
      <small className="fieldHelp">DUSDC has 6 decimals; 1 DUSDC = 1000000 atomic units.</small>

      <button className="primaryButton" type="button" disabled={!canDeposit} onClick={depositDusdc}>
        Deposit DUSDC to PredictManager
      </button>
      {!canDeposit && (
        <p className="buttonHelp">
          Requires Sui Testnet wallet, stored PredictManager, positive deposit amount, and enough wallet Coin&lt;DUSDC&gt; objects.
        </p>
      )}

      <TransactionStatus status={transactionStatus} />
    </section>
  );
}

function TransactionStatus({ status }: { status: TransactionStatusType }) {
  if (status.state === "idle") {
    return null;
  }

  return (
    <section className={`transactionStatus ${status.state}`} aria-live="polite">
      <strong>Deposit status: {status.state}</strong>
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
