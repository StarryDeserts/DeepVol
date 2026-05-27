import { Chip } from "../atoms/Chip";
import { Label } from "../atoms/Label";
import { PulseDot, StatusDot } from "../atoms/StatusDot";
import { Button } from "../atoms/Button";

type MarketStatsPanelProps = {
  oracleLabel: string;
  oracleFreshness: string;
  expiry: string;
  expiryCountdown: string;
  statusLabel: string;
  statusVariant: "live" | "stale" | "expired" | "idle";
  products: string[];
  rangeBand: string;
  rangeBandDetail: string;
  lastRefresh: string;
  onViewDetails?: () => void;
  className?: string;
};

export function MarketStatsPanel({
  oracleLabel,
  oracleFreshness,
  expiry,
  expiryCountdown,
  statusLabel,
  statusVariant,
  products,
  rangeBand,
  rangeBandDetail,
  lastRefresh,
  onViewDetails,
  className = "",
}: MarketStatsPanelProps) {
  return (
    <aside className={`glass p-6 self-start ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-white">Market stats</h3>
        <Chip highlight>
          <PulseDot /> Live
        </Chip>
      </div>

      <dl className="mt-6 space-y-5">
        <div>
          <dt><Label>Active oracle</Label></dt>
          <dd className="mt-1.5 flex items-center justify-between">
            <span className="text-white text-sm">{oracleLabel}</span>
            <Chip highlight>{oracleFreshness}</Chip>
          </dd>
        </div>

        <div className="h-px hairline border-t" />

        <div>
          <dt><Label>Expiry</Label></dt>
          <dd className="mt-1.5 font-mono text-sm text-white">{expiry}</dd>
          <dd className="text-[11px] text-ink-mid">{expiryCountdown}</dd>
        </div>

        <div className="h-px hairline border-t" />

        <div>
          <dt><Label>Status</Label></dt>
          <dd className="mt-1.5 flex items-center gap-2">
            <StatusDot variant={statusVariant} />
            <span className={`text-sm status-${statusVariant}`}>{statusLabel}</span>
          </dd>
        </div>

        <div className="h-px hairline border-t" />

        <div>
          <dt><Label>Available products</Label></dt>
          <dd className="mt-2 flex flex-wrap gap-1.5">
            {products.map((p) => (
              <Chip key={p} highlight={p === "MOVE"}>{p}</Chip>
            ))}
          </dd>
        </div>

        <div className="h-px hairline border-t" />

        <div>
          <dt><Label>Range band</Label></dt>
          <dd className="mt-1.5 font-mono text-sm text-white">{rangeBand}</dd>
          <dd className="text-[11px] text-ink-mid">{rangeBandDetail}</dd>
        </div>

        <div className="h-px hairline border-t" />

        <div>
          <dt><Label>Last refresh</Label></dt>
          <dd className="mt-1.5 font-mono text-sm text-white">{lastRefresh}</dd>
        </div>
      </dl>

      {onViewDetails && (
        <Button
          variant="outline"
          className="mt-7 w-full rounded-xl"
          onClick={onViewDetails}
        >
          View contract details
        </Button>
      )}
    </aside>
  );
}
