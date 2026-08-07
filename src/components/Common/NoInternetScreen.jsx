import { Globe, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import Branding from '../Branding';
import { useState } from 'react';
import './NoInternetScreen.css';

const NoInternetScreen = ({ onRetry, isServerDown = false }) => {
    const [isRetrying, setIsRetrying] = useState(false);

    const handleRetry = () => {
        setIsRetrying(true);
        // Simulate a check before calling the parent retry
        setTimeout(() => {
            setIsRetrying(false);
            if (onRetry) onRetry();
        }, 800);
    };

    return (
        <div className="no-internet-overlay animate-fade-in">
            <div className="no-internet-content">
                {/* Logo Section */}
                <div className="offline-branding animate-slide-up">
                    <Branding size="lg" showLogo={true} variant="light" />
                </div>

                {/* Animated Illustration */}
                <div className="illustration-wrapper animate-slide-up-delay-1">
                    <div className="illustration-blob"></div>
                    <div className="illustration-icon">
                        {isServerDown ? (
                            <Globe size={80} className="pulse-animation text-primary-500" />
                        ) : (
                            <WifiOff size={80} className="pulse-animation text-slate-400" />
                        )}
                    </div>
                    {/* Decorative waves */}
                    <div className="wave wave-1"></div>
                    <div className="wave wave-2"></div>
                </div>

                {/* Text Content */}
                <div className="text-content animate-slide-up-delay-2">
                    <h2 className="offline-title">
                        {isServerDown ? "Server Unavailable" : "No Internet Connection"}
                    </h2>
                    <p className="offline-subtitle">
                        {isServerDown 
                            ? "We're having trouble connecting to our systems. Please try again later."
                            : "Please check your network and try again."}
                    </p>
                </div>

                {/* Action Button */}
                <div className="action-wrapper animate-slide-up-delay-3">
                    <button 
                        className={`retry-btn ${isRetrying ? 'loading' : ''}`} 
                        onClick={handleRetry}
                        disabled={isRetrying}
                    >
                        {isRetrying ? (
                            <RefreshCw size={20} className="spinner" />
                        ) : (
                            <RefreshCw size={20} />
                        )}
                        <span>{isRetrying ? 'Checking...' : 'Retry'}</span>
                    </button>
                    
                    {!isServerDown && (
                        <p className="connectivity-hint">
                            <AlertCircle size={14} />
                            Check your WiFi or Mobile Data
                        </p>
                    )}
                </div>
            </div>

            {/* Footer decoration */}
            <div className="offline-footer">
                <div className="footer-line"></div>
                <span className="footer-text">OFFLINE MODE</span>
                <div className="footer-line"></div>
            </div>
        </div>
    );
};

export default NoInternetScreen;
