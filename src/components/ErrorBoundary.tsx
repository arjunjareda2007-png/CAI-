import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    console.error('Application Error Boundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, errorMessage: '' });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#F6F8FB] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8 shadow-sm text-center">
            <div className="w-12 h-12 rounded-full bg-[#FF7A00]/10 text-[#FF7A00] flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-[#071A3D]">
              Something went wrong while loading this view
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] mt-2 leading-relaxed">
              Career Alert India encountered an unexpected client error. Your saved updates and data remain safe.
            </p>
            {this.state.errorMessage && (
              <pre className="mt-4 p-3 rounded-lg bg-[#F6F8FB] border border-[#E2E8F0] text-[11px] font-mono-tabular text-[#64748B] text-left overflow-x-auto max-h-28">
                {this.state.errorMessage}
              </pre>
            )}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="btn-press inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#071A3D] hover:bg-[#0D2758] text-white text-xs font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#FF7A00]" />
                <span>Reload Page</span>
              </button>
              <a
                href="/"
                className="btn-press inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-[#E2E8F0] hover:border-[#071A3D] bg-white text-[#071A3D] text-xs font-semibold"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Go to Homepage</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
