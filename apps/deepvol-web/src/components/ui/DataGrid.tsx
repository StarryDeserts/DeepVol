import type { ReactNode } from "react";

export type DataGridItem = {
  label: string;
  value: ReactNode;
};

type DataGridProps = {
  items: readonly DataGridItem[];
  variant?: "default" | "compact";
};

export function DataGrid({ items, variant = "default" }: DataGridProps) {
  return (
    <dl className={`dataGrid dataGrid-${variant}`}>
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
