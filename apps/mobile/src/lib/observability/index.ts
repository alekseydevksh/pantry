// The one place the app reports errors that a user did not see as a crash: failed requests,
// errors caught by an error boundary. Sentry plugs in here in task 5.5 with `setErrorReporter`,
// so callers never import Sentry directly.

export type ErrorContext = {
  /** Where the error came from, for example `apollo`. */
  source: string;
  /** Extra values that help to group or debug the error. Must not hold personal data. */
  extra?: Record<string, string | number | boolean | null | undefined>;
};

export type ErrorReporter = (error: unknown, context: ErrorContext) => void;

/** Prints in development; does nothing in a release build until a real reporter is set. */
const defaultReporter: ErrorReporter = (error, context) => {
  if (__DEV__ && process.env.NODE_ENV !== 'test') {
    console.warn(`[${context.source}]`, error, context.extra ?? {});
  }
};

let reporter: ErrorReporter = defaultReporter;

export function reportError(error: unknown, context: ErrorContext): void {
  try {
    reporter(error, context);
  } catch {
    // A broken reporter must never break the code that reports.
  }
}

/** Replaces the reporter. Returns a function that restores the previous one (handy in tests). */
export function setErrorReporter(next: ErrorReporter): () => void {
  const previous = reporter;
  reporter = next;
  return () => {
    reporter = previous;
  };
}
