import { Component, type ErrorInfo, type ReactNode } from "react";

interface State {
  error: Error | null;
}

/** Last-resort boundary: a render crash shows a recovery panel, never a white screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Render error:", error, info.componentStack);
  }

  private reset = () => {
    try {
      ["cf.draft.v2", "cf.apps.v2", "cf.settings.v2", "cf.draft.v1", "cf.apps.v1", "cf.settings.v1"].forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
    window.location.href = "/";
  };

  render() {
    if (this.state.error) {
      return (
        <div className="grid min-h-dvh place-items-center bg-background px-4 text-foreground">
          <div className="panel max-w-md p-8 text-center">
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted-foreground">An unexpected error interrupted the page. Reloading usually fixes it; resetting also clears saved demo data.</p>
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={() => window.location.reload()} className="rounded-lg border border-border px-4 py-2.5 text-sm">
                Reload
              </button>
              <button onClick={this.reset} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
                Reset & reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
