import type { ReactNode } from "react";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
};

export function PageHero({ eyebrow, title, children, actions, meta }: PageHeroProps) {
  return (
    <section className="pageHero">
      <div className="pageHeroCopy">
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <div className="pageHeroText">{children}</div>
      </div>
      {(actions || meta) && (
        <div className="pageHeroAside">
          {meta}
          {actions}
        </div>
      )}
    </section>
  );
}
