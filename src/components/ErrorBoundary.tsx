import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { hapticFeedback } from '../lib/utils';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
    
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      hapticFeedback('error');
    }
  }

  private handleReload = () => {
    hapticFeedback('medium');
    window.location.reload();
  };

  private handleGoHome = () => {
    hapticFeedback('light');
    window.location.href = '/';
  };

  public render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full glass rounded-3xl p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto border border-red-500/20">
              <AlertTriangle className="w-10 h-10 text-red-400" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-serif font-bold">Oops! Etwas ist schiefgelaufen</h1>
              <p className="text-white/60 text-sm">
                Wir entschuldigen uns für die Unannehmlichkeiten. Bitte versuchen Sie es erneut.
              </p>
            </div>

            {error && (
              <details className="text-left bg-black/40 rounded-xl p-4">
                <summary className="text-xs text-white/40 cursor-pointer font-mono">
                  Fehlerdetails anzeigen
                </summary>
                <pre className="mt-2 text-xs text-red-400 font-mono whitespace-pre-wrap">
                  {error.toString()}
                </pre>
              </details>
            )}

            <div className="flex flex-col gap-3 pt-4">
              <button
                onClick={this.handleReload}
                className="w-full bg-white text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/90 transition-all active:scale-[0.98]"
              >
                <RefreshCw className="w-5 h-5" />
                Seite neu laden
              </button>
              <button
                onClick={this.handleGoHome}
                className="w-full bg-white/5 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/10 transition-all active:scale-[0.98]"
              >
                <Home className="w-5 h-5" />
                Zur Startseite
              </button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
