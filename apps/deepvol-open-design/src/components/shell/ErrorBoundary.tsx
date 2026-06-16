import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("DeepVol render error:", error, info.componentStack);
  }

  reset = (): void => this.setState({ error: null });

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center bg-abyss-900 text-ink-hi">
        <div className="max-w-md glass p-6 space-y-3">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="text-sm text-ink-mid">{error.message}</p>
          <button
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm cursor-pointer"
            onClick={this.reset}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
