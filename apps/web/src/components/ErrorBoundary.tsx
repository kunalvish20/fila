import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface ErrorBoundaryProps {
  children: ReactNode;
  resetKey: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundaryInner extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page render error:', error, info.componentStack);
  }

  componentDidUpdate(previousProps: ErrorBoundaryProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <section className="panel">
          <h2>Page could not render</h2>
          <p>{this.state.error.message || 'Unexpected page error.'}</p>
          <button onClick={() => this.setState({ error: null })}>Try again</button>
        </section>
      );
    }

    return this.props.children;
  }
}

export function ErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  return <ErrorBoundaryInner resetKey={location.pathname}>{children}</ErrorBoundaryInner>;
}
