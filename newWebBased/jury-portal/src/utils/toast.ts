/**
 * Toast notification utility for the Jury Portal.
 *
 * Lightweight DOM-based toast to avoid pulling in a full library.
 * Extracted from useScoreSave so it can be reused across components.
 */

interface ToastOptions {
  /** Duration in milliseconds before auto-dismiss. Default: 3000 */
  duration?: number;
  /** CSS color for background. Default: '#10b981' (green) */
  background?: string;
}

/**
 * Show a short success notification at the top-right of the screen.
 */
export function showSuccessToast(message: string, options?: ToastOptions): void {
  const { duration = 3000, background = '#10b981' } = options ?? {};

  const el = document.createElement('div');
  el.textContent = message;
  el.style.cssText = [
    'position: fixed',
    'top: 20px',
    'right: 20px',
    `background: ${background}`,
    'color: white',
    'padding: 16px 24px',
    'border-radius: 8px',
    'font-weight: bold',
    'z-index: 9999',
    'box-shadow: 0 4px 6px rgba(0,0,0,0.1)',
  ].join('; ');

  document.body.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

/**
 * Show an error notification.
 */
export function showErrorToast(message: string, options?: ToastOptions): void {
  showSuccessToast(message, { background: '#ef4444', ...options });
}
