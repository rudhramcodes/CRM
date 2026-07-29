import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './ui/Button';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-8">
          <div className="bg-white rounded-xl border border-zinc-200 p-8 max-w-md w-full text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-900">Something went wrong</h2>
            <p className="text-sm text-zinc-500">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <Button onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}>
              <RefreshCw className="w-4 h-4" /> Restart
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
