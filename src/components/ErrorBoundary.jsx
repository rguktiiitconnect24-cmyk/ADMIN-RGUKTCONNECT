import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem',
                    background: 'var(--color-background)',
                    color: 'var(--color-text-main)',
                    fontFamily: 'Inter, system-ui, sans-serif'
                }}>
                    <div style={{
                        maxWidth: '600px',
                        width: '100%',
                        background: 'var(--color-surface)',
                        padding: '2.5rem',
                        borderRadius: '16px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                        border: '1px solid var(--color-border)',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.5rem',
                            fontSize: '2rem'
                        }}>
                            !
                        </div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Something went wrong.</h1>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>An unexpected error occurred in the application.</p>
                        
                        <div style={{
                            background: 'rgba(0,0,0,0.2)',
                            padding: '1rem',
                            borderRadius: '8px',
                            border: '1px solid var(--color-border)',
                            color: '#fca5a5',
                            fontFamily: 'monospace',
                            fontSize: '0.875rem',
                            textAlign: 'left',
                            overflowX: 'auto',
                            marginBottom: '2rem'
                        }}>
                            {this.state.error && this.state.error.toString()}
                        </div>
                        
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                background: 'var(--color-primary-600)',
                                color: 'white',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '8px',
                                border: 'none',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.background = 'var(--color-primary-500)'}
                            onMouseOut={(e) => e.target.style.background = 'var(--color-primary-600)'}
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
