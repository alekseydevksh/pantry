import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react';

export type ErrorBoundaryProps = {
  children: ReactNode;
  /** What to show instead of the children after an error. `reset` tries the children again. */
  fallback: (args: { error: Error; reset: () => void }) => ReactNode;
  /** Called once for each error, for reporting. */
  onError?: (error: Error, info: ErrorInfo) => void;
  /**
   * When this value changes, the boundary resets by itself. A details screen passes the id of the
   * item, so opening another item does not keep showing the error of the previous one.
   */
  resetKey?: unknown;
};

type State = {
  error: Error | null;
  /** Bumped by every reset, so the children mount again with fresh state (a retry, not a re-render). */
  attempt: number;
};

/**
 * Catches an error that a child throws while rendering, and shows `fallback` instead of crashing
 * the app (a red screen in development, a closed app in release). React only supports error
 * boundaries as classes. It does not catch errors in event handlers or async code: those are the
 * caller's to handle (a failed query is an inline error, not a thrown one).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  override state: State = { error: null, attempt: 0 };

  static getDerivedStateFromError(thrown: unknown): Partial<State> {
    // Anything can be thrown, not only an Error.
    return { error: thrown instanceof Error ? thrown : new Error(String(thrown)) };
  }

  override componentDidCatch(thrown: unknown, info: ErrorInfo) {
    this.props.onError?.(thrown instanceof Error ? thrown : new Error(String(thrown)), info);
  }

  override componentDidUpdate(previous: ErrorBoundaryProps) {
    if (this.state.error && !Object.is(previous.resetKey, this.props.resetKey)) {
      this.reset();
    }
  }

  reset = () => {
    this.setState((state) => ({ error: null, attempt: state.attempt + 1 }));
  };

  override render() {
    const { error, attempt } = this.state;
    if (error) return this.props.fallback({ error, reset: this.reset });
    return <Fragment key={attempt}>{this.props.children}</Fragment>;
  }
}
