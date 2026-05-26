/**
 * Error Boundary Component
 * Catches React errors and displays fallback UI
 */

import React, { ReactNode, ReactElement } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@components/ui';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render(): ReactElement {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full mx-auto p-6 bg-white rounded-lg shadow-lg">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
              Oops! Something went wrong
            </h1>
            <p className="text-center text-gray-600 mb-6">
              We encountered an unexpected error. Please try refreshing the page or
              contact support if the problem persists.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 bg-red-50 p-4 rounded text-sm">
                <summary className="cursor-pointer font-semibold text-red-900">
                  Error Details
                </summary>
                <p className="mt-2 text-red-700 font-mono text-xs whitespace-pre-wrap">
                  {this.state.error.toString()}
                </p>
              </details>
            )}
            <div className="flex gap-3">
              <Button
                variant="outline"
                fullWidth
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={this.handleReset}
              >
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return <>{this.props.children}</>;
  }
}
