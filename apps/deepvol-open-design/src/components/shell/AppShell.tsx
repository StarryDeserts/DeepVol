import type { ReactNode } from "react";
import { NavBar } from "./NavBar";
import { Footer } from "./Footer";

type AppShellProps = {
  children: ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
};

export function AppShell({ children, currentPath, onNavigate }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-abyss relative grain">
      <NavBar currentPath={currentPath} onNavigate={onNavigate} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
