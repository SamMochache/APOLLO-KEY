import React from 'react';

type State = { hasError: boolean; error: any };

export default class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    console.error('💥 ErrorBoundary caught an error:', error, info);
  }

  handleRetry() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center text-red-600">
          <h2 className="text-xl font-bold mb-2">Something went wrong 😢</h2>
          <p className="text-sm text-gray-700 mb-4">{this.state.error?.message || 'An unexpected error occurred.'}</p>
          <button onClick={this.handleRetry} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}
