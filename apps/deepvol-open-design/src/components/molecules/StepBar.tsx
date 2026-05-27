type StepState = "done" | "active" | "fail" | "pending";

type Step = {
  label: string;
  state: StepState;
};

type StepBarProps = {
  steps: Step[];
  className?: string;
};

function StepDotContent({ state, index }: { state: StepState; index: number }) {
  if (state === "done") {
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    );
  }

  if (state === "active") {
    return <span className="spinner" style={{ width: 10, height: 10, borderWidth: 2 }} />;
  }

  if (state === "fail") {
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    );
  }

  return <>{index + 1}</>;
}

export function StepBar({ steps, className = "" }: StepBarProps) {
  return (
    <div className={`step-bar ${className}`}>
      {steps.map((step, i) => (
        <div key={step.label} className="contents">
          <div className="flex items-center gap-3">
            <div className={`step-dot ${step.state === "pending" ? "" : step.state}`}>
              <StepDotContent state={step.state} index={i} />
            </div>
            <div className={`text-sm ${step.state === "pending" ? "text-ink-mid" : "text-white"}`}>
              {step.label}
            </div>
          </div>
          {i < steps.length - 1 && (
            <div className={`step-line ${step.state === "done" ? "done" : ""}`} />
          )}
        </div>
      ))}
    </div>
  );
}
