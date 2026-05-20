export type StatusChecklistItem = {
  label: string;
  state: "complete" | "blocked" | "pending";
  detail?: string;
};

type StatusChecklistProps = {
  title: string;
  items: readonly StatusChecklistItem[];
};

export function StatusChecklist({ title, items }: StatusChecklistProps) {
  return (
    <section className="statusChecklist" aria-label={title}>
      <strong>{title}</strong>
      <ol>
        {items.map((item) => (
          <li key={item.label} className={`checkItem checkItem-${item.state}`}>
            <span className="checkDot" aria-hidden="true" />
            <span>
              <span>{item.label}</span>
              {item.detail && <small>{item.detail}</small>}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
