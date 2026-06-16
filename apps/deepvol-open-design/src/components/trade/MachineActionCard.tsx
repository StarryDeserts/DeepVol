import {
  type DeepVolMachineAction,
  type DeepVolMachineStep,
  type DeepVolTradeMachine,
} from "@rangepilot/deepvol-trading-react";
import { type MarketProduct, verifiedTradingHref } from "../../lib/productRoute";

type Product = MarketProduct;

export type ProductMachinePanelProps = {
  marketStatusLabel: string;
  expiryDisplay: string | null;
  referenceRange: string;
};

const productCopy: Record<Product, {
  title: string;
  description: string;
  flow: string[];
  cta: string;
}> = {
  MOVE: {
    title: "BTC MOVE",
    description: "Win if BTC expires outside the market range. MOVE trading creates a DeepVol receipt in the verified app.",
    flow: ["Validate BTC market", "Create or select VolSeries", "Quote", "Preflight", "Wallet execution"],
    cta: "Open verified DeepVol app to trade BTC MOVE",
  },
  UP: {
    title: "Primitive · UP",
    description: "Win if BTC expires above the selected strike. Execution happens in the verified primitive flow.",
    flow: ["Find mintable strike", "Quote", "Preflight", "Wallet execution"],
    cta: "Open verified DeepVol app to trade UP",
  },
  DOWN: {
    title: "Primitive · DOWN",
    description: "Win if BTC expires below the selected strike. Execution happens in the verified primitive flow.",
    flow: ["Find mintable strike", "Quote", "Preflight", "Wallet execution"],
    cta: "Open verified DeepVol app to trade DOWN",
  },
  RANGE: {
    title: "Primitive · RANGE",
    description: "Win if BTC expires inside the interval. Execution happens in the verified primitive flow.",
    flow: ["Find mintable interval", "Quote", "Preflight", "Wallet execution"],
    cta: "Open verified DeepVol app to trade RANGE",
  },
};

export function MachineActionCard({
  product,
  machine,
  marketStatusLabel,
  expiryDisplay,
  referenceRange,
}: {
  product: Product;
  machine: DeepVolTradeMachine;
  marketStatusLabel: string;
  expiryDisplay: string | null;
  referenceRange: string;
}) {
  const reviewAction = machine.actions.reviewInWallet;
  const reviewDisabled = machine.blockers.length > 0 || !reviewAction || reviewAction.disabled;
  const prepActionIds = machinePrepActionIds(product);

  return (
    <div className="p-6 space-y-5">
      <div className="rounded-2xl border border-aqua-400/25 bg-aqua-400/[0.06] p-4">
        <div className="label text-aqua-200">Shared verified execution</div>
        <p className="mt-2 text-sm text-ink-mid leading-relaxed">
          Open Design direct controls use the shared verified trading state machine. Trading execution is handled by the verified DeepVol app.
        </p>
      </div>

      <div>
        <div className="label">
          {product === "MOVE" ? "Packaged volatility" : "Predict primitive"}
        </div>
        <h3 className="mt-2 font-display text-2xl text-white">
          {productCopy[product].title}
        </h3>
        <p className="mt-2 text-sm text-ink-mid leading-relaxed">
          {productCopy[product].description}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="glass-inner p-3">
          <div className="label">Machine status</div>
          <div className="mt-1.5 text-white">{machine.status}</div>
        </div>
        <div className="glass-inner p-3">
          <div className="label">Market status</div>
          <div className="mt-1.5 text-white">{marketStatusLabel}</div>
        </div>
        <div className="glass-inner p-3">
          <div className="label">Expiry</div>
          <div className="mt-1.5 font-mono text-white">{expiryDisplay ?? "TBD"}</div>
        </div>
        <div className="glass-inner p-3">
          <div className="label">Reference range</div>
          <div className="mt-1.5 font-mono text-white">{referenceRange}</div>
        </div>
      </div>

      <div>
        <div className="label">Verified state-machine steps</div>
        <ol className="mt-3 space-y-2">
          {machine.steps.map((step, index) => (
            <MachineStepRow key={step.id} step={step} index={index} />
          ))}
        </ol>
      </div>

      {machine.blockers.length > 0 && (
        <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4">
          <div className="label text-amber-100">Blockers</div>
          <ul className="mt-2 space-y-1 text-sm text-ink-mid">
            {machine.blockers.map((blocker, index) => (
              <li key={`${blocker}-${index}`}>• {blocker}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {prepActionIds.map((actionId) => (
          <MachineActionButton key={actionId} action={machine.actions[actionId]} />
        ))}
      </div>

      <button
        type="button"
        disabled={reviewDisabled}
        onClick={() => void reviewAction?.run()}
        className="bg-cta block w-full rounded-2xl py-4 text-center font-medium text-white shadow-cta ring-aqua disabled:cursor-not-allowed disabled:opacity-45"
      >
        Review in wallet
      </button>

      <a
        href={verifiedTradingHref(product)}
        className="block w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 text-center text-sm font-medium text-white hover:border-aqua-400/40 ring-aqua"
      >
        Open verified DeepVol app
      </a>

      <MachineDiagnostics diagnostics={machine.diagnostics} />

      <p className="text-xs text-ink-low leading-relaxed">
        Testnet only. Automated smoke must not click wallet review or approve wallet prompts.
      </p>
    </div>
  );
}

function MachineStepRow({ step, index }: { step: DeepVolMachineStep; index: number }) {
  return (
    <li className="flex items-start gap-3 text-sm text-ink-mid">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] font-mono text-[11px] text-white">
        {index + 1}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-white">{step.label}</span>
          <span className={`pill text-[10px] ${stepToneClass(step.status)}`}>{step.status}</span>
        </span>
        {step.detail && <span className="mt-1 block break-words text-xs text-ink-low">{step.detail}</span>}
      </span>
    </li>
  );
}

function MachineActionButton({ action }: { action: DeepVolMachineAction | undefined }) {
  if (!action) {
    return null;
  }

  return (
    <button
      type="button"
      disabled={action.disabled}
      onClick={() => void action.run()}
      className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs text-white hover:border-aqua-400/40 disabled:cursor-not-allowed disabled:opacity-45"
    >
      {action.label}
    </button>
  );
}

function MachineDiagnostics({ diagnostics }: { diagnostics: Record<string, unknown> }) {
  return (
    <details className="group glass-inner p-4">
      <summary className="label cursor-pointer select-none flex items-center gap-2 hover:text-ink-mid">
        <span className="transition-transform group-open:rotate-90">&rsaquo;</span>
        Runtime diagnostics
      </summary>
      <div className="mt-3 space-y-2 text-[11px] text-ink-mid">
        {Object.entries(diagnostics).map(([key, value]) => (
          <div key={key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <div className="label">{key}</div>
            <div className="mt-1 break-all font-mono text-white">{formatDiagnosticValue(value)}</div>
          </div>
        ))}
      </div>
    </details>
  );
}

function machinePrepActionIds(product: Product): string[] {
  if (product === "MOVE") {
    return ["refreshActiveMarket", "generateMintableRange", "createOrSelectVolSeries", "refreshQuote", "runPreflight"];
  }

  if (product === "RANGE") {
    return ["refreshActiveMarket", "generateMintableInterval", "refreshQuote", "runPreflight"];
  }

  return ["refreshActiveMarket", "generateMintableStrike", "refreshQuote", "runPreflight"];
}

function stepToneClass(status: DeepVolMachineStep["status"]): string {
  switch (status) {
    case "passed":
      return "pill-pass";
    case "active":
      return "pill-live";
    case "blocked":
    case "failed":
      return "pill-fail";
    case "pending":
      return "pill-idle";
  }
}

function formatDiagnosticValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "None";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  try {
    return JSON.stringify(value, (_key, nestedValue) => {
      if (typeof nestedValue === "bigint") {
        return nestedValue.toString();
      }

      if (typeof nestedValue === "function") {
        return "[function]";
      }

      return nestedValue;
    });
  } catch {
    return String(value);
  }
}
