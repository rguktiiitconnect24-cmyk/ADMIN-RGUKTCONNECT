import { useEffect, useState } from 'react';
import { SplashScreen } from '@capacitor/splash-screen';
import './ProfessionalSplash.css';

const ProfessionalSplash = ({ onFinish }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        SplashScreen.hide().catch(() => {});
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => {
                if (onFinish) onFinish();
            }, 300); // Fade out duration
        }, 200); // Display duration

        return () => clearTimeout(timer);
    }, [onFinish]);

    return (
        <div className={`professional-splash-container ${isExiting ? 'exit' : ''}`}>
            <div className="splash-content">
                <div className="logo-container">
                    <img src="/logo.svg" alt="App Logo" className="splash-logo" />
                </div>
                <div className="brand-info">
                    <h1 className="brand-name">RGUKT CONNECT</h1>
                    <p className="brand-tagline">Excellence in Connectivity</p>
                </div>
                <div className="splash-loader">
                    <div className="loader-bar"></div>
                </div>
            </div>
            <div className="splash-footer">
                <p>© 2024 RGUKT CONNECT. All Rights Reserved.</p>
            </div>
        </div>
    );
};

export default ProfessionalSplash;
