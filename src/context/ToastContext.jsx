import { createContext, useContext, useState, useRef, useCallback } from 'react';
import { db } from '../config/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { CheckCircle2, XCircle, AlertTriangle, Trash2, Info, RotateCcw, X } from 'lucide-react';

const ToastContext = createContext();

const TOAST_CONFIG = {
    success: {
        icon: CheckCircle2,
        gradient: 'linear-gradient(135deg, #10b981, #059669)',
        glow: 'rgba(16, 185, 129, 0.2)',
        accent: '#10b981',
        lightBg: 'rgba(16, 185, 129, 0.08)',
        label: 'Success',
    },
    error: {
        icon: XCircle,
        gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
        glow: 'rgba(239, 68, 68, 0.2)',
        accent: '#ef4444',
        lightBg: 'rgba(239, 68, 68, 0.08)',
        label: 'Error',
    },
    warning: {
        icon: AlertTriangle,
        gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
        glow: 'rgba(245, 158, 11, 0.2)',
        accent: '#f59e0b',
        lightBg: 'rgba(245, 158, 11, 0.08)',
        label: 'Warning',
    },
    info: {
        icon: Info,
        gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
        glow: 'rgba(59, 130, 246, 0.2)',
        accent: '#3b82f6',
        lightBg: 'rgba(59, 130, 246, 0.08)',
        label: 'Info',
    },
    undo: {
        icon: Trash2,
        gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
        glow: 'rgba(239, 68, 68, 0.2)',
        accent: '#ef4444',
        lightBg: 'rgba(239, 68, 68, 0.08)',
        label: 'Deleted',
    },
};

const triggerSuccessAudio = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([80, 40, 80]);
    }
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

export const ToastProvider = ({ children }) => {
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success', id: null });
    const [pendingDeletion, setPendingDeletion] = useState(null);
    const toastTimerRef = useRef(null);
    const deleteTimerRef = useRef(null);

    const showToast = useCallback((message, type = 'success') => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        const id = Date.now();
        setToast({ visible: true, message, type, id });

        if (type === 'success') {
            triggerSuccessAudio();
        }

        if (type !== 'undo') {
            toastTimerRef.current = setTimeout(() => {
                setToast(prev => ({ ...prev, visible: false }));
            }, 3500);
        }
    }, []);

    const showUndoToast = useCallback((message, itemData, onRestore) => {
        if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);

        const id = Date.now();
        setPendingDeletion({ ...itemData, onRestore });
        setToast({ visible: true, message, type: 'undo', id });

        deleteTimerRef.current = setTimeout(async () => {
            try {
                if (itemData.collection && itemData.docId) {
                    await deleteDoc(doc(db, itemData.collection, itemData.docId));
                }
                setPendingDeletion(null);
                setToast(prev => prev.id === id ? { ...prev, visible: false } : prev);
            } catch (error) {
                console.error("Error finalizing deletion:", error);
                showToast("Failed to permanently delete item.", "error");
            }
        }, 10000);
    }, [showToast]);

    const handleUndo = useCallback(() => {
        if (!pendingDeletion) return;
        if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        const { onRestore, name } = pendingDeletion;
        if (onRestore) onRestore(pendingDeletion);
        setPendingDeletion(null);
        setToast({ visible: false, message: '', type: 'success', id: null });
        showToast(`Restored ${name || 'item'}`);
    }, [pendingDeletion, showToast]);

    const hideToast = useCallback(() => {
        setToast(prev => ({ ...prev, visible: false }));
    }, []);

    const config = TOAST_CONFIG[toast.type] || TOAST_CONFIG.success;
    const Icon = config.icon;

    return (
        <ToastContext.Provider value={{ showToast, showUndoToast, handleUndo, hideToast, toast }}>
            {children}

            {/* Global Toast Container */}
            <div className="toast-container" aria-live="polite">
                {toast.type === 'success' ? (
                    <div className={`success-toast-card ${toast.visible ? 'visible' : ''}`}>
                        <svg className="success-wave" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg">
                            <path d="M0,192L60,192C120,192,240,192,360,176C480,160,600,128,720,128C840,128,960,160,1080,176C1200,192,1320,192,1380,192L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"></path>
                        </svg>
                        <div className="success-icon-container">
                            <svg className="success-icon-svg" viewBox="0 0 512 512" fill="currentColor">
                                <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"></path>
                            </svg>
                        </div>
                        <div className="success-message-text-container">
                            <p className="success-message-text">{toast.message}</p>
                        </div>
                        <X className="success-cross-icon" onClick={hideToast} size={18} />
                    </div>
                ) : (
                    <div className={`premium-toast ${toast.visible ? 'visible' : ''}`}
                        style={{ '--toast-accent': config.accent, '--toast-glow': config.glow, '--toast-light-bg': config.lightBg }}
                    >
                        {/* Left accent bar */}
                        <div className="toast-accent-bar" style={{ background: config.gradient }} />

                        {/* Icon */}
                        <div className="toast-icon-wrap" style={{ background: config.lightBg }}>
                            <Icon size={20} style={{ color: config.accent }} strokeWidth={2.5} />
                        </div>

                        {/* Content */}
                        <div className="toast-body">
                            <span className="toast-label" style={{ color: config.accent }}>{config.label}</span>
                            <p className="toast-msg">{toast.message}</p>
                        </div>

                        {/* Undo button */}
                        {toast.type === 'undo' && (
                            <button className="toast-undo-btn" onClick={handleUndo}>
                                <RotateCcw size={13} />
                                Undo
                            </button>
                        )}

                        {/* Close */}
                        <button className="toast-close-btn" onClick={hideToast} aria-label="Close notification">
                            <X size={15} />
                        </button>

                        {/* Progress bar */}
                        {toast.visible && (
                            <div
                                className={`toast-progress ${toast.type === 'undo' ? 'undo-progress' : ''}`}
                                style={{ background: config.gradient }}
                            />
                        )}
                    </div>
                )}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within a ToastProvider');
    return context;
};
