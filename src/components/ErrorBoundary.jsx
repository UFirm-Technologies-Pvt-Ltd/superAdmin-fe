import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          background: '#F8FAFC'
        }}>
          <div style={{
            maxWidth: '460px',
            width: '100%',
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '24px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.08)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: '#FEE2E2',
              color: '#DC2626',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px'
            }}>
              <AlertCircle size={22} />
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0F172A', margin: '0 0 6px 0' }}>
              Something went wrong
            </h3>

            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: '0 0 16px 0', lineHeight: '1.4' }}>
              {this.state.error?.message || 'An unexpected rendering error occurred. Please refresh the page.'}
            </p>

            <button
              onClick={this.handleReload}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                background: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={15} />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
