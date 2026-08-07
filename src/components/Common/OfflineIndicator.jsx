import { Globe } from 'lucide-react';
import NoInternetScreen from './NoInternetScreen';
import { useState, useEffect, useCallback } from 'react';
import './OfflineIndicator.css';

const OfflineIndicator = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isServerDown, setIsServerDown] = useState(false);
    const [showOverlay, setShowOverlay] = useState(!navigator.onLine);
    const [isBackOnlineBanner, setIsBackOnlineBanner] = useState(false);

    // Function to check server reachability
    const checkServerStatus = useCallback(async () => {
        if (!navigator.onLine) return;
        
        try {
            // Temporarily disabled brittle HEAD request check causing false positives
            setIsServerDown(false);
        } catch (error) {
            console.error("Server reachability check failed:", error);
            // Only set server down if we are sure we have internet but can't reach our host
            // Disabled due to false positives in some environments
            setIsServerDown(false);
        }
    }, []);

    const handleRetry = () => {
        setIsOnline(navigator.onLine);
        if (navigator.onLine) {
            checkServerStatus();
        }
    };

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setIsServerDown(false);
            
            // Show "Back Online" banner briefly
            setIsBackOnlineBanner(true);
            setTimeout(() => {
                setIsBackOnlineBanner(false);
                setShowOverlay(false);
            }, 3000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowOverlay(true);
            setIsBackOnlineBanner(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial check
        if (navigator.onLine) {
            checkServerStatus();
        }

        // Periodic check for server status if online
        const interval = setInterval(() => {
            if (navigator.onLine) {
                checkServerStatus();
            }
        }, 30000); // Check every 30 seconds

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, [checkServerStatus]);

    // Update overlay state when server status or online status changes
    useEffect(() => {
        if (!isOnline || isServerDown) {
            setShowOverlay(true);
        } else if (isOnline && !isServerDown && !isBackOnlineBanner) {
            // Don't hide immediately if we want to show the "Back Online" transition
            // But if we're not in the transition, hide it.
            setShowOverlay(false);
        }
    }, [isOnline, isServerDown, isBackOnlineBanner]);

    return (
        <>
            {/* Full Screen Overlay for primary offline state */}
            {showOverlay && (
                <div className={`offline-overlay-wrapper ${isBackOnlineBanner ? 'fade-out' : ''}`}>
                    <NoInternetScreen 
                        onRetry={handleRetry} 
                        isServerDown={isServerDown} 
                    />
                </div>
            )}

            {/* Brief "Back Online" banner for smooth transition */}
            {isBackOnlineBanner && (
                <div className="offline-indicator is-back-online animate-slide-down">
                    <div className="offline-content">
                        <div className="offline-icon-wrapper online">
                            <Globe size={18} />
                        </div>
                        <span className="offline-text">Connection Restored! Welcome back.</span>
                    </div>
                </div>
            )}
        </>
    );
};


export default OfflineIndicator;

