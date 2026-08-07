import { useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import './LoadingTransition.css';

const LoadingTransition = ({ onFinish, message, persistent = false, variant }) => {
    const { theme } = useTheme();

    useEffect(() => {
        if (persistent) return;

        const timer = setTimeout(() => {
            if (onFinish) onFinish();
        }, 250);

        return () => clearTimeout(timer);
    }, [onFinish, persistent]);

    // Guess variant based on message or current URL path
    let currentVariant = variant;
    if (!currentVariant) {
        const path = (window.location.hash || window.location.pathname).toLowerCase();
        if (message) {
            const msg = message.toLowerCase();
            if (msg.includes('time table') || msg.includes('database') || msg.includes('registry') || msg.includes('management') || msg.includes('attendance')) {
                currentVariant = 'table';
            } else if (msg.includes('content') || msg.includes('analytics') || msg.includes('fetching') || msg.includes('complaint') || msg.includes('notice')) {
                currentVariant = 'list';
            }
        }
        
        if (!currentVariant) {
            if (path.includes('timetable') || path.includes('attendance') || path.includes('users') || path.includes('management')) {
                currentVariant = 'table';
            } else if (path.includes('subject') || path.includes('unit') || path.includes('module') || path.includes('complaint') || path.includes('notice') || path.includes('content') || path.includes('library')) {
                currentVariant = 'list';
            } else {
                currentVariant = 'grid';
            }
        }
    }

    const renderSkeleton = () => {
        if (currentVariant === 'table') {
            return (
                <div style={{ marginTop: '2rem' }}>
                    <div className="skeleton" style={{ width: '100%', height: '50px', borderRadius: '8px', marginBottom: '1rem' }}></div>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="skeleton" style={{ width: '100%', height: '70px', borderRadius: '8px', marginBottom: '0.5rem' }}></div>
                    ))}
                </div>
            );
        }
        
        if (currentVariant === 'list' || currentVariant === 'book') {
            return (
                <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="skeleton" style={{ width: '100%', height: '100px', borderRadius: '12px' }}></div>
                    ))}
                </div>
            );
        }

        // Default: grid (cards)
        return (
            <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="skeleton" style={{ minHeight: '90px', borderRadius: 'var(--radius-xl)' }}></div>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="skeleton" style={{ height: '240px', borderRadius: 'var(--radius-xl)' }}></div>
                    ))}
                </div>
            </>
        );
    };

    return (
        <div className={`animate-fade-in ${theme}`} style={{ width: '100%', padding: '2rem 0', minHeight: '80vh' }}>
            <div className="cmp-top-bar" style={{marginBottom: '2rem'}}>
                <div className="cmp-title-section">
                    <div className="cmp-title-text" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div className="skeleton" style={{ width: '200px', height: '32px', borderRadius: '8px' }}></div>
                        <div className="skeleton" style={{ width: '250px', height: '16px', borderRadius: '6px' }}></div>
                    </div>
                    <div className="cmp-header-icon skeleton" style={{ width: '100px', height: '80px', borderRadius: '16px' }}></div>
                </div>
            </div>

            {renderSkeleton()}
            
            {message && (
                <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    {message}
                </div>
            )}
        </div>
    );
};

export default LoadingTransition;
