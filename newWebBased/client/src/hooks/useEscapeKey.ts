import { useEffect } from 'react';

/**
 * Hook to handle ESC key press to close modals/dialogs
 * @param onEscape Callback function to execute when ESC is pressed
 * @param enabled Whether the ESC key handler is active (default: true)
 */
export function useEscapeKey(onEscape: () => void, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onEscape, enabled]);
}
