import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[WarRoom ErrorBoundary caught an error]:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 h-full flex items-center justify-center p-6 bg-[#0f1311] select-none">
          <div className="dossier-card border-2 border-amber-600/70 p-6 rounded max-w-lg w-full text-center space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.8)] relative">
            <div className="absolute top-2 left-2 screw-rivet" />
            <div className="absolute top-2 right-2 screw-rivet" />
            <div className="absolute bottom-2 left-2 screw-rivet" />
            <div className="absolute bottom-2 right-2 screw-rivet" />

            <div className="flex justify-center">
              <div className="p-3 bg-rose-950/60 border border-rose-600/50 rounded-full text-rose-400">
                <AlertTriangle className="w-8 h-8 animate-pulse" />
              </div>
            </div>

            <div>
              <h3 className="text-base font-serif font-bold text-strategy-gold tracking-wide">
                {this.props.fallbackTitle || '指挥所局部战报模组发生异常'}
              </h3>
              <p className="text-xs text-[#8b9b8f] mt-1 font-serif">
                当前模组已触发隔离防护，可尝试重新加载或返回其他战报界面。
              </p>
            </div>

            {this.state.error && (
              <div className="bg-[#131915] border border-[#2d3a30] rounded p-3 text-left overflow-auto max-h-32 text-[11px] font-mono text-rose-300/90 leading-relaxed">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="pt-2 flex justify-center space-x-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 bg-gradient-to-r from-amber-700 to-strategy-gold hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-serif font-bold text-xs rounded-sm shadow flex items-center space-x-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>重新加载该模组</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
