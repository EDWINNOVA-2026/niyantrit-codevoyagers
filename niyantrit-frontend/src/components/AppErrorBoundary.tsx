import { Component, type ErrorInfo, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || "Unexpected UI error",
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Keep this visible in dev tools while rendering a safe fallback.
    console.error("AppErrorBoundary caught an error", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="mx-auto mt-10 w-full max-w-2xl rounded-2xl border border-destructive/30 bg-card p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-destructive">Application Error</p>
        <h1 className="mt-2 text-xl font-bold text-foreground">Something went wrong while rendering this view.</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {this.state.message || "A runtime error interrupted the page."}
        </p>
        <button
          type="button"
          onClick={this.handleReload}
          className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Reload application
        </button>
      </main>
    );
  }
}

export default AppErrorBoundary;
