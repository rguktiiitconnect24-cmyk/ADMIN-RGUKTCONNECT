import { useEffect, useState } from 'react';
import './AnimatedSplash.css';
const AnimatedSplash = ({ onFinish }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {

        // 2. Control the animation duration
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => {
                if (onFinish) onFinish();
            }, 1000); // Exiting duration
        }, 3200);

        return () => clearTimeout(timer);
    }, [onFinish]);

    return (
        <div className={`splash-overlay ${isExiting ? 'fade-out' : ''}`}>
            {/* dynamic mesh background */}
            <div className="mesh-gradient">
                <div className="color-blob blob-1"></div>
                <div className="color-blob blob-2"></div>
                <div className="color-blob blob-3"></div>
            </div>

            <div className="splash-content">
                <div className="logo-wrapper">
                    <img src="/logo.svg" alt="RGUKT Logo" className="brand-logo" />
                    <div className="ripple"></div>
                    <div className="ripple ripple-delay"></div>
                </div>

                <div className="brand-text-container">
                    <h1 className="brand-title">
                        <span className="word word-left">RGUKT</span>
                        <span className="word word-right">CONNECT</span>
                    </h1>
                    <p className="brand-subtitle">Stay Connected. Stay Ahead.</p>
                </div>

                <div className="modern-loader">
                    <div className="loader-line"></div>
                </div>
            </div>
        </div>
    );
};

export default AnimatedSplash;
