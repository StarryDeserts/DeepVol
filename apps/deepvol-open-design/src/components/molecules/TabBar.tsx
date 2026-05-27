type Tab<T extends string> = {
  id: T;
  label: string;
  featured?: boolean;
};

type TabBarProps<T extends string> = {
  tabs: Tab<T>[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
};

export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
  className = "",
}: TabBarProps<T>) {
  return (
    <nav
      className={`flex gap-1 border-b border-white/[0.06] ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          className={`tab min-h-[44px] min-w-[44px] cursor-pointer ring-aqua ${
            active === tab.id ? "active" : ""
          } ${tab.featured ? "featured" : ""}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
