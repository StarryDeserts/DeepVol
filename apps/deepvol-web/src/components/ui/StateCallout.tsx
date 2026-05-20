import type { ReactNode } from "react";

type StateCalloutTone = "info" | "success" | "warning" | "danger";

type StateCalloutProps = {
  tone?: StateCalloutTone;
  title: string;
  children: ReactNode;
};

export function StateCallout({ tone = "info", title, children }: StateCalloutProps) {
  return (
    <section className={`stateCallout stateCallout-${tone}`}>
      <strong>{title}</strong>
      <div>{children}</div>
    </section>
  );
}
