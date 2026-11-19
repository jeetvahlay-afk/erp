import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error('Uncaught UI error', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="erp-fatal-page">
        <section className="erp-fatal-card">
          <span><AlertTriangle size={31} aria-hidden="true" /></span>
          <h1>The workspace encountered an error</h1>
          <p>Your data was not changed. Refresh the application to restore the workspace.</p>
          {import.meta.env.DEV && this.state.error?.message && (
            <pre className="erp-fatal-details">{this.state.error.message}</pre>
          )}
          <button type="button" onClick={() => window.location.reload()} className="erp-btn erp-btn-primary">
            <RefreshCw size={15} /> Refresh application
          </button>
        </section>
      </main>
    );
  }
}

export default ErrorBoundary;
