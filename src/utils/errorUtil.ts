import { Notification } from '@jupyterlab/apputils';

export function showError(error: unknown, context?: string): void {
  const message = error instanceof Error ? error.message : String(error);
  const displayMessage = context ? `${context}: ${message}` : message;
  
  Notification.error(displayMessage);
  console.error(context || 'Error:', error);
}

export function showErrorWithRetry(error: unknown, context: string, retryFn: () => void): void {
  const message = error instanceof Error ? error.message : String(error);
  const displayMessage = `${context}: ${message}`;
  
  Notification.error(displayMessage, {
    actions: [{ label: 'Retry', callback: retryFn }]
  });
  console.error(context, error);
}

export function showProgress<T>(promise: Promise<T>, message: string): Promise<T> {
  return Notification.promise(promise, {
    pending: { message, options: { autoClose: false } },
    error: { message: 'Operation failed' }
  });
}

export function showSuccess(message: string): void {
  Notification.success(message);
}