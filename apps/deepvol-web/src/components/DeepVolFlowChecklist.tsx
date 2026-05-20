export type DeepVolFlowStep = {
  label: string;
  state: "complete" | "current" | "blocked" | "pending";
  detail: string;
};

type DeepVolFlowChecklistProps = {
  steps: readonly DeepVolFlowStep[];
};

export function DeepVolFlowChecklist({ steps }: DeepVolFlowChecklistProps) {
  return (
    <section className="card flowChecklist" aria-label="DeepVol BTC MOVE setup flow">
      <div className="cardHeader">
        <div>
          <div className="eyebrow">First-time flow</div>
          <h2>From wallet to receipt</h2>
        </div>
      </div>
      <ol>
        {steps.map((step, index) => (
          <li key={step.label} className={`flowStep flowStep-${step.state}`}>
            <span className="flowStepIndex" aria-hidden="true">{index + 1}</span>
            <span>
              <strong>{step.label}</strong>
              <small>{step.detail}</small>
            </span>
            <em>{step.state}</em>
          </li>
        ))}
      </ol>
    </section>
  );
}
