import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

/**
 * ErrorBoundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 * 
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * 
 * With custom fallback:
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <YourComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorCount: 0
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Update state with error details
    this.setState((prevState) => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Optional: Send error to logging service
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // TODO: Send to logging service (e.g., Sentry, LogRocket)
    // For now, just log to console
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('Error logged:', errorData);
    }

    // In production, send to backend
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/client-errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData)
      }).catch(err => console.error('Failed to log error to server:', err));
    }
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      const { error, errorInfo, errorCount } = this.state;
      const showDetails = this.props.showDetails ?? (process.env.NODE_ENV === 'development');

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl border border-red-200 p-8">
            {/* Icon & Title */}
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Oops! Etwas ist schiefgelaufen
                </h1>
                <p className="text-gray-600 mt-1">
                  Ein unerwarteter Fehler ist aufgetreten
                </p>
              </div>
            </div>

            {/* Error Count Warning */}
            {errorCount > 1 && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ Dieser Fehler ist bereits <strong>{errorCount} Mal</strong> aufgetreten.
                  Bitte Seite neu laden oder Administrator kontaktieren.
                </p>
              </div>
            )}

            {/* Error Message */}
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-semibold text-red-900 mb-2">
                Fehlermeldung:
              </p>
              <p className="text-sm text-red-700 font-mono">
                {error?.message || 'Unbekannter Fehler'}
              </p>
            </div>

            {/* Error Details (Development only) */}
            {showDetails && error && (
              <details className="mb-6">
                <summary className="cursor-pointer text-sm font-semibold text-gray-700 mb-2 hover:text-gray-900">
                  🔍 Technische Details anzeigen
                </summary>
                <div className="mt-2 p-4 bg-gray-50 border border-gray-200 rounded-lg overflow-auto max-h-64">
                  <p className="text-xs font-mono text-gray-800 whitespace-pre-wrap">
                    {error.stack}
                  </p>
                  {errorInfo && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-gray-700 mb-2">
                        Component Stack:
                      </p>
                      <p className="text-xs font-mono text-gray-600 whitespace-pre-wrap">
                        {errorInfo.componentStack}
                      </p>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Erneut versuchen
              </button>
              
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Seite neu laden
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Home className="w-4 h-4" />
                Zur Startseite
              </button>
            </div>

            {/* Help Text */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                💡 <strong>Was tun?</strong>
              </p>
              <ul className="mt-2 space-y-1 text-sm text-gray-600 list-disc list-inside">
                <li>Versuchen Sie es erneut (Button oben)</li>
                <li>Laden Sie die Seite neu</li>
                <li>Kehren Sie zur Startseite zurück</li>
                <li>Kontaktieren Sie den Support, falls das Problem bestehen bleibt</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
