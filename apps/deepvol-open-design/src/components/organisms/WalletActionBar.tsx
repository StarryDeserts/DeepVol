import { Button } from "@/components/atoms/Button";
import { Spinner } from "@/components/atoms/Spinner";
import { Label } from "@/components/atoms/Label";
import { Pill } from "@/components/atoms/Pill";

type WalletActionStatus =
  | "disabled"
  | "ready"
  | "submitting"
  | "pending"
  | "confirming"
  | "confirmed"
  | "rejected"
  | "failed";

type WalletActionBarProps = {
  status: WalletActionStatus;
  label: string;
  blockers?: string[];
  digest?: string;
  onSubmit?: () => void;
  className?: string;
};

function statusPill(status: WalletActionStatus) {
  switch (status) {
    case "disabled":
      return null;
    case "ready":
      return <Pill variant="active">Ready</Pill>;
    case "submitting":
      return <Pill variant="active"><Spinner /> Submitting</Pill>;
    case "pending":
      return <Pill variant="active"><Spinner /> Pending</Pill>;
    case "confirming":
      return <Pill variant="active"><Spinner /> Confirming</Pill>;
    case "confirmed":
      return <Pill variant="pass">Confirmed</Pill>;
    case "rejected":
      return <Pill variant="warn">Rejected</Pill>;
    case "failed":
      return <Pill variant="fail">Failed</Pill>;
  }
}

export function WalletActionBar({
  status,
  label,
  blockers = [],
  digest,
  onSubmit,
  className = "",
}: WalletActionBarProps) {
  const isReady = status === "ready";
  const isLoading = status === "submitting" || status === "pending" || status === "confirming";
  const shouldDisable = !isReady;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <Label>Wallet action</Label>
        {statusPill(status)}
      </div>

      <Button
        variant="cta"
        className="w-full rounded-xl py-3.5 text-base"
        disabled={shouldDisable ? true : undefined}
        onClick={onSubmit}
      >
        {isLoading && <Spinner className="inline mr-2" />}
        {label}
      </Button>

      {blockers.length > 0 && (
        <ul className="mt-2 space-y-1">
          {blockers.map((b) => (
            <li key={b} className="text-[11px] text-ink-low font-mono">{b}</li>
          ))}
        </ul>
      )}

      {digest && (
        <div className="mt-2 text-[11px] font-mono text-ink-mid">
          Tx: {digest}
        </div>
      )}
    </div>
  );
}
