import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="bg-slate-800 rounded-xl p-8 max-w-lg text-center">
            <div className="text-red-400 text-lg font-semibold mb-2">Something went wrong</div>
            <div className="text-slate-400 text-sm font-mono">{this.state.error.message}</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
