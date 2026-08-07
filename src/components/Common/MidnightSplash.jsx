import ModernLoader from './ModernLoader';
import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useTheme } from '../../context/ThemeContext';
import './MidnightSplash.css';

const MidnightSplash = ({ onFinish }) => {
    const { theme } = useTheme();
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => {
                if (onFinish) onFinish();
            }, 800); // Handover to app
        }, 2800);

        return () => clearTimeout(timer);
    }, [onFinish]);

    return ReactDOM.createPortal(
        <div className={`midnight-splash ${theme} ${isExiting ? 'exit' : ''}`}>
            {/* dynamic mesh background */}
            <div className="mesh-gradient">
                <div className="color-blob blob-1"></div>
                <div className="color-blob blob-2"></div>
                <div className="color-blob blob-3"></div>
            </div>

            <div className="splash-center">
                <div className="logo-section">
                    <img src="/logo.svg" alt="Logo" className="splash-logo" />
                    <div className="logo-ripple"></div>
                </div>

                <div className="loader-section">
                    <ModernLoader showText={true} />
                </div>
            </div>
        </div>,
        document.getElementById('loader-root')
    );
};

export default MidnightSplash;
