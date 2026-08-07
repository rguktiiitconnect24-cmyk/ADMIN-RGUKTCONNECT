
const Branding = ({ showLogo = true, size = "md", className = "", variant = "dark" }) => {
    const isLight = variant === "light";
    const isAuto = variant === "auto";
    const iconSize = size === "xl" ? 56 : size === "lg" ? 48 : size === "md" ? 32 : 24;
    const textSize = size === "xl" ? '2.85rem' : size === "lg" ? '1.75rem' : '1.25rem';
    const subTextSize = size === "xl" ? '1.15rem' : '0.75rem';

    return (
        <div className={`branding-container ${className}`} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: size === "xl" ? '1.25rem' : '0.75rem',
            marginBottom: size === "xl" ? '0.5rem' : '1.5rem'
        }}>
            {showLogo && (
                <div className="branding-logo" style={{
                    width: `${iconSize * 1.8}px`,
                    height: `${iconSize * 1.8}px`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <img src="/logo.svg" alt="RGUKT Connect Logo" style={{ width: '100%', height: '100%' }} />
                </div>
            )}
            <div className="branding-text" style={{ textAlign: 'center' }}>
                <h1 style={{
                    fontSize: textSize,
                    fontWeight: '800',
                    color: isAuto ? 'var(--color-text-main)' : (isLight ? 'var(--color-slate-900)' : 'var(--color-slate-50)'),
                    fontFamily: 'Inter, system-ui, sans-serif',
                    letterSpacing: '-0.03em',
                    margin: 0,
                    textShadow: !isLight && !isAuto && size === "xl" ? '0 2px 10px rgba(0,0,0,0.1)' : 'none'
                }}>RGUKT <span style={{ color: 'var(--color-primary-600)' }}>CONNECT</span></h1>
                <p style={{
                    fontSize: subTextSize,
                    color: isAuto ? 'var(--color-text-muted)' : (isLight ? 'var(--color-slate-500)' : 'var(--color-slate-300)'),
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    margin: size === "xl" ? '0.75rem 0 0 0' : '0.25rem 0 0 0'
                }}>Official Digital Campus</p>
            </div>
        </div>
    );
};

export default Branding;
