import type { ReactNode } from "react";
import { GlassCard } from "../molecules/GlassCard";
import { QuotePanel } from "../organisms/QuotePanel";
import { PreflightPanel } from "../organisms/PreflightPanel";
import { WalletActionBar } from "../organisms/WalletActionBar";
import { SuccessPanel } from "../organisms/SuccessPanel";
import { AdvancedDetails } from "../organisms/AdvancedDetails";
import { StepBar } from "../molecules/StepBar";
import type { GateVariant } from "../molecules/Gate";

type Step = { label: string; state: "done" | "active" | "fail" | "pending" };

type PreflightGateEntry = {
  id: string;
  label: string;
  variant: GateVariant;
  detail?: string;
};

type MoveTradePanelProps = {
  steps: Step[];
  quoteStatus: "idle" | "loading" | "ready" | "stale" | "error";
  quoteProductLabel?: string;
  quoteQuantity?: string;
  quotePremium?: string;
  quoteCreateFee?: string;
  quoteMaxPremium?: string;
  quoteRedeemEstimate?: string;
  quoteError?: string;
  quoteAdvanced?: { label: string; value: ReactNode }[];
  onRefreshQuote?: () => void;
  onRetryQuote?: () => void;
  preflightStatus: "idle" | "ready" | "running" | "blocked" | "passed" | "failed";
  preflightGates: PreflightGateEntry[];
  preflightBlockers?: string[];
  preflightWarnings?: string[];
  onRunPreflight?: () => void;
  walletStatus: "disabled" | "ready" | "submitting" | "pending" | "confirming" | "confirmed" | "rejected" | "failed";
  walletLabel: string;
  walletBlockers?: string[];
  onSubmitWallet?: () => void;
  showSuccess?: boolean;
  successVariant?: "confirmed" | "local" | "failed";
  successTitle?: string;
  successMessage?: string;
  successDigest?: string;
  advancedEntries?: { label: string; value: ReactNode }[];
  onNavigate: (path: string) => void;
  className?: string;
};

export function MoveTradePanel({
  steps,
  quoteStatus,
  quoteProductLabel,
  quoteQuantity,
  quotePremium,
  quoteCreateFee,
  quoteMaxPremium,
  quoteRedeemEstimate,
  quoteError,
  quoteAdvanced = [],
  onRefreshQuote,
  onRetryQuote,
  preflightStatus,
  preflightGates,
  preflightBlockers = [],
  preflightWarnings = [],
  onRunPreflight,
  walletStatus,
  walletLabel,
  walletBlockers = [],
  onSubmitWallet,
  showSuccess = false,
  successVariant = "confirmed",
  successTitle = "",
  successMessage = "",
  successDigest,
  advancedEntries = [],
  onNavigate,
  className = "",
}: MoveTradePanelProps) {
  return (
    <GlassCard className={className}>
      <StepBar steps={steps} className="mb-6" />

      {showSuccess ? (
        <SuccessPanel
          variant={successVariant}
          title={successTitle}
          message={successMessage}
          digest={successDigest}
          onViewPortfolio={() => onNavigate("/portfolio")}
        />
      ) : (
        <>
          <QuotePanel
            status={quoteStatus}
            productLabel={quoteProductLabel}
            quantity={quoteQuantity}
            premium={quotePremium}
            createFee={quoteCreateFee}
            maxPremium={quoteMaxPremium}
            redeemEstimate={quoteRedeemEstimate}
            errorMessage={quoteError}
            onRefresh={onRefreshQuote}
            onRetry={onRetryQuote}
            advancedEntries={quoteAdvanced}
          />

          <PreflightPanel
            status={preflightStatus}
            gates={preflightGates}
            blockers={preflightBlockers}
            warnings={preflightWarnings}
            onRun={onRunPreflight}
            className="mt-6"
          />

          <WalletActionBar
            status={walletStatus}
            label={walletLabel}
            blockers={walletBlockers}
            onSubmit={onSubmitWallet}
            className="mt-6"
          />

          {advancedEntries.length > 0 && (
            <AdvancedDetails entries={advancedEntries} className="mt-6" />
          )}
        </>
      )}
    </GlassCard>
  );
}
