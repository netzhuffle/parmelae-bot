import * as Sentry from '@sentry/node';

export const ErrorService = {
  /**
   * Logs an error to Sentry and the console.
   *
   * @this void
   */
  log(this: void, exception: unknown): void {
    Sentry.captureException(exception);
    console.error(exception);
  },
};
