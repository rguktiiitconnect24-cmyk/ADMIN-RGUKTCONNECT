import { Check } from 'lucide-react';
import React, { createContext, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const DownloadContext = createContext({
    startDownload: async () => {},
    startShare: async () => {},
    notify: async () => {},
    triggerSuccessFeedback: () => {}
});

export const useDownload = () => useContext(DownloadContext);

export const DownloadProvider = ({ children }) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [isDownloadSuccess, setIsDownloadSuccess] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [activeFilename, setActiveFilename] = useState('');
    const [isSharing, setIsSharing] = useState(false);
    const [isShareSuccess, setIsShareSuccess] = useState(false);

    const triggerSuccessFeedback = () => {
        // Haptic Feedback
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([80, 40, 80]);
        }

        // Success Sound
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const context = new AudioContext();
            const osc = context.createOscillator();
            const gain = context.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, context.currentTime); 
            osc.frequency.exponentialRampToValueAtTime(1046.50, context.currentTime + 0.1); 
            gain.gain.setValueAtTime(0.15, context.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.25);
            osc.connect(gain);
            gain.connect(context.destination);
            osc.start();
            osc.stop(context.currentTime + 0.25);
        } catch (e) {}
    };

    const showDownloadNotification = async (filename) => {
        if (!Capacitor.isNativePlatform()) return;
        try {
            await LocalNotifications.createChannel({
                id: 'downloads_v4',
                name: 'File Downloads',
                importance: 5,
                visibility: 1,
                vibration: true
            });
            await LocalNotifications.schedule({
                notifications: [{
                    title: 'Download Successful',
                    body: `${filename || 'Document'} has been saved to your device.`,
                    id: Math.floor(Math.random() * 100000),
                    schedule: { at: new Date(Date.now() + 500) },
                    sound: 'default',
                    channelId: 'downloads_v4',
                    smallIcon: 'ic_stat_notification',
                    largeIcon: 'ic_launcher_round',
                    iconColor: '#4f46e5'
                }]
            });
        } catch (error) {}
    };

    const startDownload = async (filename, downloadFn) => {
        console.log("DownloadContext: startDownload triggered for", filename);
        setIsDownloading(true);
        setIsDownloadSuccess(false);
        setActiveFilename(filename);
        setDownloadProgress(0);
        
        const duration = 800;
        const startTime = Date.now();

        // Yield to allow the UI to render the overlay before heavy processing starts
        await new Promise(resolve => setTimeout(resolve, 50));

        // Start a predictive progress bar
        let progress = 0;
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            progress = Math.min(99, (elapsed / duration) * 100);
            setDownloadProgress(Math.floor(progress));
        }, 50);

        try {
            // Wait for the full animation duration first
            const elapsed = Date.now() - startTime;
            if (elapsed < duration) {
                await new Promise(r => setTimeout(r, duration - elapsed));
            }
            clearInterval(interval);
            setDownloadProgress(100);
            // Then trigger actual download
            await downloadFn();

            clearInterval(interval);
            setDownloadProgress(100);
            
            triggerSuccessFeedback();
            showDownloadNotification(filename);
            setIsDownloadSuccess(true);
            setTimeout(() => {
                setIsDownloadSuccess(false);
                setIsDownloading(false);
                setDownloadProgress(0);
            }, 1000); // Reduced from 1500ms
        } catch (error) {
            clearInterval(interval);
            console.error("Global Download Manager Error:", error);
            setIsDownloading(false);
        }
    };

    const startShare = async (filename, shareFn) => {
        setIsSharing(true);
        setIsShareSuccess(false);
        setActiveFilename(filename);
        setDownloadProgress(0);

        const duration = 800;
        const startTime = Date.now();

        // Yield to allow UI render
        await new Promise(resolve => setTimeout(resolve, 50));

        // Start a predictive progress bar
        let progress = 0;
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            progress = Math.min(99, (elapsed / duration) * 100);
            setDownloadProgress(Math.floor(progress));
        }, 50);

        try {
            // Wait for the full animation duration first
            const elapsed = Date.now() - startTime;
            if (elapsed < duration) {
                await new Promise(r => setTimeout(r, duration - elapsed));
            }
            clearInterval(interval);
            setDownloadProgress(100);
            // Start sharing function after delay
            await shareFn();

            clearInterval(interval);
            setDownloadProgress(100);
            
            triggerSuccessFeedback();
            setIsShareSuccess(true);
            setTimeout(() => {
                setIsShareSuccess(false);
                setIsSharing(false);
                setDownloadProgress(0);
            }, 1500); // Reduced from 2500ms
        } catch (error) {
            clearInterval(interval);
            console.error("Global Share Manager Error:", error);
            setIsSharing(false);
        }
    };

    const notify = React.useCallback(async (title, body, icon = 'ic_stat_notification') => {
        if (!Capacitor.isNativePlatform()) {
            console.log("Notification (Web):", title, body);
            return;
        }

        try {
            // 1. Check/Request Permissions (Crucial for Android 13+)
            const perm = await LocalNotifications.checkPermissions();
            if (perm.display !== 'granted') {
                const req = await LocalNotifications.requestPermissions();
                if (req.display !== 'granted') {
                    console.warn("Notification permissions denied");
                    return;
                }
            }

            // 2. Ensure Channel Exists
            await LocalNotifications.createChannel({
                id: 'downloads_v4',
                name: 'App Alerts',
                importance: 5,
                visibility: 1,
                vibration: true
            });

            // 3. Schedule Notification
            await LocalNotifications.schedule({
                notifications: [{
                    title: title || 'RGUKT Connect',
                    body: body || 'Action completed successfully.',
                    id: Math.floor(Math.random() * 100000),
                    schedule: { at: new Date(Date.now() + 500) },
                    sound: 'default',
                    channelId: 'downloads_v4',
                    smallIcon: icon,
                    largeIcon: 'ic_launcher_round',
                    iconColor: '#4f46e5'
                }]
            });
            console.log("Notification scheduled successfully");
        } catch (error) {
            console.error("Failed to schedule notification:", error);
        }
    }, []);

    const contextValue = React.useMemo(() => ({ 
        startDownload, startShare, triggerSuccessFeedback, notify 
    }), [notify]);

    return (
        <DownloadContext.Provider value={contextValue}>
            {children}
            {(isDownloading || isDownloadSuccess || isSharing || isShareSuccess) && createPortal(
                <div className={`pdf-generation-overlay ${(isDownloadSuccess || isShareSuccess) ? 'success-state' : ''}`}>
                    <div className="pdf-overlay-content animate-pop-in">
                        <div className="pdf-overlay-status-icon">
                            {(isDownloadSuccess || isShareSuccess) ? (
                                <div className="success-check-wrapper">
                                    <div className="success-ring"></div>
                                    <Check size={32} className="relative z-10 text-emerald-500" />
                                </div>
                            ) : (
                                <div className="typewriter-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70px', marginBottom: '1.75rem' }}>
                                    <div className="typewriter" style={{ transform: 'scale(0.8)' }}>
                                        <div className="slide"><i></i></div>
                                        <div className="paper"></div>
                                        <div className="keyboard"></div>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <h3 className="pdf-overlay-title">
                            {isDownloadSuccess ? 'File Ready' : 
                             isShareSuccess ? 'Sharing Complete' : 
                             isSharing ? 'System Sharing' : 'Generating PDF'}
                        </h3>
                        
                        <p className="pdf-overlay-desc">
                            {isDownloadSuccess ? 'Your document has been successfully saved to your device.' : 
                             isShareSuccess ? 'The digital record was successfully prepared and sent to the system share.' :
                             `Preparing your official record. Please wait...`}
                        </p>

                        {!(isDownloadSuccess || isShareSuccess) && (
                            <div className="pdf-progress-section">
                                <div className="pdf-progress-track">
                                    <div className="pdf-progress-fill-determinate" style={{ width: `${downloadProgress}%` }}></div>
                                </div>
                                <div className="pdf-progress-status">
                                    <span className="dot-anim">Securely processing data</span>
                                    <span className="progress-percent">{downloadProgress}%</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </DownloadContext.Provider>
    );
};
