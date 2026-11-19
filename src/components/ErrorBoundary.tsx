import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  declare state: ErrorBoundaryState;
  declare props: Readonly<ErrorBoundaryProps>;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: null,
    };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage:
        error instanceof Error ? error.message : 'Unexpected render error',
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    console.error('HavenBlocks ErrorBoundary caught error:', error, info);
  }

  handleRestart = (): void => {
    this.setState({ hasError: false, errorMessage: null });
    window.location.reload();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          data-testid="error-boundary-fallback"
          className="min-h-screen w-full flex items-center justify-center p-4 bg-[#F6EFE4] text-[#2A1F15]"
        >
          <div className="w-full max-w-sm rounded-2xl p-6 border shadow-xl bg-[#FAF5EC] border-[#D4C0A3] text-center">
            <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-amber-500/20 text-amber-800">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="font-display text-xl font-bold mb-1.5">
              A Block Tumbled Off the Table
            </h1>
            <p className="text-xs text-[#6E5A46] mb-4 leading-relaxed">
              Your Cozy Room and progress are safely saved on your device. Tap
              below to tidy the board and resume playing.
            </p>
            <button
              type="button"
              data-testid="error-boundary-restart-btn"
              onClick={this.handleRestart}
              className="w-full inline-flex items-center justify-center gap-2 min-h-[46px] px-5 py-2.5 rounded-xl font-semibold text-sm text-[#FDF8F2] bg-[#1E3A2F] hover:bg-[#274C3D]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restart HavenBlocks</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
