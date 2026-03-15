
import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
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
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
          <div className="max-w-xl w-full bg-white rounded-lg shadow-xl overflow-hidden">
            <div className="bg-red-600 px-6 py-4">
              <h1 className="text-white text-xl font-bold flex items-center gap-2">
                <span>⚠️</span> Something went wrong
              </h1>
            </div>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Error Details:</h2>
              <pre className="bg-gray-100 p-4 rounded text-sm text-red-600 overflow-auto whitespace-pre-wrap max-h-64">
                {this.state.error?.toString()}
              </pre>
              {this.state.errorInfo && (
                <details className="mt-4">
                  <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                    Component Stack
                  </summary>
                  <pre className="mt-2 text-xs text-gray-500 overflow-auto max-h-64">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
