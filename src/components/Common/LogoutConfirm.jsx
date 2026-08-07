import { LogOut } from 'lucide-react';
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './LogoutConfirm.css';

const LogoutConfirm = ({ isOpen, onConfirm, onCancel }) => {
    const [isInternalLoading, setIsInternalLoading] = React.useState(false);
    const [progress, setProgress] = React.useState(0);
    const [statusText, setStatusText] = React.useState('Ready to sign out');

    useEffect(() => {
        if (!isOpen) {
            setIsInternalLoading(false);
            setProgress(0);
            setStatusText('Ready to sign out');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirmClick = async () => {
        setIsInternalLoading(true);
        const duration = 1200; // Slightly longer for better visual feedback
        const startTime = Date.now();
        
        const statuses = [
            'Securing account...',
            'Clearing session data...',
            'Signing out safely...'
        ];

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const newProgress = Math.min((elapsed / duration) * 100, 100);
            setProgress(newProgress);
            
            // Update status text based on progress
            const statusIndex = Math.floor((newProgress / 100) * statuses.length);
            if (statuses[statusIndex]) setStatusText(statuses[statusIndex]);

            if (elapsed >= duration) {
                clearInterval(interval);
                onConfirm();
            }
        }, 16);
    };

    const modalContent = (
        <div className="logout-modal-overlay animate-fade-in" onClick={onCancel}>
            <div className="logout-modal-content" onClick={e => e.stopPropagation()}>
                <div className="logout-modal-grabber"></div>

                <div className="logout-visual-container">
                    <div className={`logout-ring-wrapper ${isInternalLoading ? 'is-loading' : ''}`}>
                        <svg className="logout-progress-ring" viewBox="0 0 100 100">
                            <circle className="ring-bg" cx="50" cy="50" r="45" />
                            <circle 
                                className="ring-fill" 
                                cx="50" cy="50" r="45" 
                                style={{ strokeDashoffset: 283 - (283 * progress) / 100 }}
                            />
                        </svg>
                        <div className="logout-icon-center">
                            <LogOut size={32} />
                        </div>
                    </div>
                </div>

                <div className="logout-status-area">
                    {isInternalLoading ? (
                        <p className="logout-status-msg animate-pulse-fast">{statusText}</p>
                    ) : (
                        <div className="logout-modal-header">
                            <h2>Sign Out</h2>
                            <p>Are you sure you want to end your session?</p>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="logout-modal-actions">
                    <button 
                        className={`logout-modal-btn confirm ${isInternalLoading ? 'is-loading' : ''}`} 
                        onClick={handleConfirmClick}
                        disabled={isInternalLoading}
                    >
                        {isInternalLoading ? (
                            <span>Signing Out...</span>
                        ) : (
                            <>
                                <span>Yes, Sign Out</span>
                                <LogOut size={18} />
                            </>
                        )}
                    </button>
                    <button 
                        className="logout-modal-btn cancel" 
                        onClick={onCancel}
                        disabled={isInternalLoading}
                    >
                        No, Stay Here
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default LogoutConfirm;
