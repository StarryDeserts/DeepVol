import { Pill } from "../atoms/Pill";
import { Label } from "../atoms/Label";
import { Spinner } from "../atoms/Spinner";
import { Button } from "../atoms/Button";
import { Gate, type GateVariant } from "../molecules/Gate";
import { Toast } from "../molecules/Toast";

type PreflightStatus = "idle" | "ready" | "running" | "blocked" | "passed" | "failed";

type PreflightGate = {
  id: string;
  label: string;
  variant: GateVariant;
  detail?: string;
};

type PreflightPanelProps = {
  status: PreflightStatus;
  gates: PreflightGate[];
  blockers?: string[];
  warnings?: string[];
  onRun?: () => void;
  className?: string;
};

function statusPill(status: PreflightStatus) {
  switch (status) {
    case "idle":
      return <Pill variant="idle">Idle</Pill>;
    case "ready":
      return <Pill variant="active">Ready</Pill>;
    case "running":
      return <Pill variant="active"><Spinner /> Running</Pill>;
    case "blocked":
      return <Pill variant="warn">Blocked</Pill>;
    case "passed":
      return <Pill variant="pass">Passed</Pill>;
    case "failed":
      return <Pill variant="fail">Failed</Pill>;
  }
}

export function PreflightPanel({
  status,
  gates,
  blockers = [],
  warnings = [],
  onRun,
  className = "",
}: PreflightPanelProps) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label>Preflight</Label>
          {statusPill(status)}
        </div>
        {onRun && status === "ready" && (
          <Button variant="outline" className="text-xs px-3 py-1.5" onClick={onRun}>
            Run preflight
          </Button>
        )}
      </div>

      {gates.length > 0 && (
        <div className="mt-4 space-y-2">
          {gates.map((gate) => (
            <Gate key={gate.id} variant={gate.variant} label={gate.label} detail={gate.detail} />
          ))}
        </div>
      )}

      {blockers.length > 0 && (
        <div className="mt-4">
          <Toast variant="fail">
            <div>
              <div className="text-sm text-white">Preflight blocked</div>
              <ul className="mt-1 space-y-0.5">
                {blockers.map((b) => (
                  <li key={b} className="text-[12px] text-ink-mid">{b}</li>
                ))}
              </ul>
            </div>
          </Toast>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mt-3">
          <Toast variant="warn">
            <div>
              {warnings.map((w) => (
                <p key={w} className="text-[12px] text-ink-mid">{w}</p>
              ))}
            </div>
          </Toast>
        </div>
      )}
    </div>
  );
}
