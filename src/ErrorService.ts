import * as Sentry from '@sentry/node';

export class ErrorService {
  /**
   * Logs an error to Sentry and the console.
   *
   * @this void
   */
  static log(this: void, exception: unknown): void {
    Sentry.captureException(exception);
    console.error(exception);
  }
}
