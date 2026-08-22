import { Check, AlertCircle, Mail, UserCircle, Link, Lock, EyeOff, Eye, ArrowRight, Sparkle, Sparkles, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react';
import AppFooter from '../components/Common/AppFooter';
import Branding from '../components/Branding';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useDownload } from '../context/DownloadContext';
import { useNavigate } from 'react-router-dom';
import { AutofillService } from '../services/autofillService';
import { nativeAuthService } from '../services/nativeAuthService';
import { Capacitor } from '@capacitor/core';
import './Login.css';

const Login = () => {
    const { login, loginWithGoogle, user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    // PIN Verification State
    const [showPinModal, setShowPinModal] = useState(false);
    const [pin, setPin] = useState(['', '', '', '', '', '']);
    const [tempUserUid, setTempUserUid] = useState(null);
    const pinInputRefs = React.useRef([]);
    const { verifyPin, verifyFace } = useAuth();

    // Track if admin has verified in this session (local state for now, assuming refresh clears it effectively forces re-login flow on this page)
    // Actually, if we want to force it on every refresh, we just need to NOT redirect if admin until they verify here.
    const [isAdminVerified, setIsAdminVerified] = useState(false);
    const [showAutofillPrompt, setShowAutofillPrompt] = useState(false);
    const [showSavePrompt, setShowSavePrompt] = useState(false);
    const [isSavingSuccess, setIsSavingSuccess] = useState(false);
    const [savedData, setSavedData] = useState([]); // Array of profiles
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [profileToDelete, setProfileToDelete] = useState(null);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteError, setDeleteError] = useState('');
    const [isDeletingSuccess, setIsDeletingSuccess] = useState(false);
    const [isDeletingInProgress, setIsDeletingInProgress] = useState(false);
    const [isDirectLoggingIn, setIsDirectLoggingIn] = useState(false);
    const longPressTimerRef = useRef(null);
    const isLongPressActive = useRef(false);
    const { triggerSuccessFeedback, notify } = useDownload();

    // Force light theme on mobile for login page
    useEffect(() => {
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
            const root = window.document.documentElement;
            const originalTheme = root.getAttribute('data-theme');
            root.setAttribute('data-theme', 'light');
            
            return () => {
                // Restore original theme on unmount
                if (originalTheme) {
                    root.setAttribute('data-theme', originalTheme);
                }
            };
        }
    }, [theme]);

    // Autofill Logic
    useEffect(() => {
        const checkAutofill = async () => {
            const data = await AutofillService.get();
            if (data && data.length > 0) {
                setSavedData(data);
                if (Capacitor.getPlatform() === 'web') {
                    setShowAutofillPrompt(true);
                }
            }
        };
        checkAutofill();
    }, []);

    const applyAutofill = async (profile) => {
        const authenticated = await nativeAuthService.authenticate();
        
        if (authenticated) {
            if (profile && profile.email) {
                // Show dedicated direct login overlay
                setIsDirectLoggingIn(true);
                setShowAutofillPrompt(false);
                
                // Trigger immediate login
                handleLogin(null, profile.email, profile.password, true);
            }
        }
    };

    useEffect(() => {
        // Only auto-redirect if NOT in the middle of a process
        if (user && !showSavePrompt && !isSuccess && !isLoading && !isDirectLoggingIn) {
            // Wait for the full profile to load from Firestore before rejecting
            if (user.loadingProfile) return;

            if (user.role === 'admin' || user.role === 'faculty') {
                navigate('/admin/dashboard', { replace: true });
            } else {
                logout();
                setError('Access Denied: This portal is exclusively for Administrators and Faculty.');
            }
        } else if (!user) {
            setShowPinModal(false);
            setIsAdminVerified(false);
        }
    }, [user, navigate, isAdminVerified, showSavePrompt, isSuccess, isLoading, logout]);

    const handleLogin = async (e, directEmail = null, directPassword = null, isAutofill = false) => {
        if (e) e.preventDefault();
        
        const loginEmail = directEmail || formData.email;
        const loginPassword = directPassword || formData.password;

        if (!loginEmail || !loginPassword) return;

        console.log("Login attempt for:", loginEmail);
        setError('');
        setIsLoading(true);

        try {
            const result = await login(loginEmail, loginPassword);
            console.log("Login successful, result user:", result.user.uid);

            // Check if we should show the save prompt BEFORE updating success states
            const profiles = await AutofillService.get();
            // Show prompt if profile doesn't exist OR if password has changed
            const existingProfile = profiles.find(p => p.email.toLowerCase() === loginEmail.toLowerCase());
            const needsSave = !existingProfile || existingProfile.password !== loginPassword;

            if (needsSave) {
                setShowSavePrompt(true);
            }

            setIsLoading(false);
            setIsSuccess(true);

            // Notify user of successful login
            notify('Login Successful ✅', `Welcome back! You are now logged in as ${loginEmail}.`, 'ic_stat_notification');

            if (!needsSave) {
                // Already saved, just clear success delay to let useEffect handle it dynamically based on the fetched user.role
                setTimeout(() => {
                    setIsSuccess(false);
                    if (isAutofill) setIsDirectLoggingIn(false);
                }, 1000);
            }
        } catch (err) {
            console.error("Login catch block error:", err);
            setIsLoading(false);
            if (isAutofill) setIsDirectLoggingIn(false);

            if (isAutofill && (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential')) {
                // Automatically remove the invalid/deleted account from saved data
                const currentProfiles = await AutofillService.get();
                const updatedProfiles = currentProfiles.filter(p => p.email.toLowerCase() !== loginEmail.toLowerCase());
                
                const { Preferences } = await import('@capacitor/preferences');
                await Preferences.set({
                    key: 'rgukt_autofill_data',
                    value: JSON.stringify(updatedProfiles)
                });
                
                setSavedData(updatedProfiles);
                if (updatedProfiles.length === 0) {
                    setShowAutofillPrompt(false);
                }
                
                setError(`Account ${loginEmail} is no longer valid or has been deleted. It has been removed from saved accounts.`);
                return;
            }

            if (loginEmail === 'admin@rguktconnect.ac.in' && (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential')) {
                setError('Admin account not found. Please click "Create Account" below and register as a Student first (you will be auto-elevated to Admin).');
            } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setError('Invalid email or password.');
            } else if (err.code === 'auth/invalid-email') {
                setError('Please provide a valid institutional email.');
            } else {
                setError(`Authentication failed: ${err.code} - ${err.message}`);
            }
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setIsLoading(true);
        try {
            await loginWithGoogle();
            setIsLoading(false);
            setIsSuccess(true);
            setTimeout(() => {
                setIsSuccess(false);
            }, 1000);
        } catch (err) {
            console.error("Google login error:", err);
            setError(`Google Sign-In failed: ${err.message || 'Unknown error'}`);
            setIsLoading(false);
        }
    };

    const handlePinChange = (index, value) => {
        if (isNaN(value)) return;
        const newPin = [...pin];
        newPin[index] = value;
        setPin(newPin);

        // Auto-focus next input
        if (value && index < 5) {
            pinInputRefs.current[index + 1].focus();
        }

        // Auto-validate if all digits are filled
        const filledPin = newPin.join('');
        if (filledPin.length === 6) {
            verifyAdminPin(filledPin);
        }
    };

    const handlePinKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            pinInputRefs.current[index - 1].focus();
        }
    };

    const verifyAdminPin = async (manualPin = null) => {
        const enteredPin = manualPin || pin.join('');
        if (enteredPin.length < 4) {
            setError('Please enter a valid PIN.');
            return;
        }

        setIsLoading(true);
        const isValid = await verifyPin(tempUserUid, enteredPin);

        if (isValid) {
            setIsLoading(false);
            setIsSuccess(true);
            setTimeout(() => {
                setIsAdminVerified(true);
                navigate('/admin', { replace: true });
            }, 1000);
        } else {
            setError('Incorrect PIN. Please try again.');
            setIsLoading(false);
            setPin(['', '', '', '', '', '']);
            pinInputRefs.current[0]?.focus();
        }
    };



    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        if (error) setError('');
    };

    const handleSaveConfirm = async () => {
        setIsSavingSuccess(true);
        await AutofillService.save({ 
            email: formData.email,
            password: formData.password, // Save password for full autofill
            avatar: user?.avatar || null // Save profile photo for the selector
        });
        
        // Wait for animation
        setTimeout(() => {
            setShowSavePrompt(false);
            setIsSavingSuccess(false);
            if (isDirectLoggingIn) setIsDirectLoggingIn(false);
            setIsSuccess(false);
        }, 1500);
    };

    const handleSaveDecline = () => {
        setShowSavePrompt(false);
        if (isDirectLoggingIn) setIsDirectLoggingIn(false);
        setIsSuccess(false);
    };

    const handleTouchStart = (e, profile) => {
        isLongPressActive.current = false;
        longPressTimerRef.current = setTimeout(() => {
            isLongPressActive.current = true;
            // Haptic Feedback for long press
            if (window.navigator.vibrate) window.navigator.vibrate(50);
            console.log("Long press detected for:", profile.email);
            handleDeleteRequest(profile);
        }, 600); // 600ms for long press
    };

    const handleTouchEnd = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const handleDeleteRequest = (profile) => {
        console.log("Showing delete confirmation for:", profile.email);
        setProfileToDelete(profile);
        setShowDeleteConfirm(true);
        setDeletePassword('');
        setDeleteError('');
    };

    const handleConfirmDelete = async () => {
        if (!profileToDelete) return;
        
        if (deletePassword !== profileToDelete.password) {
            setDeleteError('Incorrect password. Please verify your identity.');
            return;
        }

        setIsDeletingInProgress(true);
        
        // Artificial delay for the 2-second deleting animation
        await new Promise(resolve => setTimeout(resolve, 2000));

        setIsDeletingInProgress(false);
        setIsDeletingSuccess(true);
        
        // Remove from storage
        const currentProfiles = await AutofillService.get();
        const updatedProfiles = currentProfiles.filter(p => p.email.toLowerCase() !== profileToDelete.email.toLowerCase());
        
        const { Preferences } = await import('@capacitor/preferences');
        await Preferences.set({
            key: 'rgukt_autofill_data',
            value: JSON.stringify(updatedProfiles)
        });

        // Trigger notification
        notify('Account Removed', `Account ${profileToDelete.email} has been deleted from this device.`, 'ic_stat_notification');

        // Wait for animation
        setTimeout(() => {
            setSavedData(updatedProfiles);
            setIsDeletingSuccess(false);
            setShowDeleteConfirm(false);
            setProfileToDelete(null);
            
            if (updatedProfiles.length === 0) {
                setShowAutofillPrompt(false);
            }
        }, 1500);
    };

    return (
        <div className="login-container">
            {/* Background Pattern & Overlay - Moved logic slightly to CSS for split styling */}

            <div className="login-split-wrapper">
                {/* Visual Banner Side (Desktop Only) */}
                <div className="login-banner-side">
                    <div className="banner-content">
                        <Branding size="xl" className="banner-branding" />
                        <h1 className="banner-title">Welcome back to Your Campus Portal</h1>
                        <p className="banner-subtitle">
                            Access your courses, check grades, and connect with the university community seamlessly through RGUKT CONNECT.
                        </p>
                        
                        <div className="banner-features">
                            <div className="feature-item">
                                <span className="feature-icon"><Check size={16} /></span>
                                <span>Real-time Timetable & Notes</span>
                            </div>
                            <div className="feature-item">
                                <span className="feature-icon"><Check size={16} /></span>
                                <span>Quick Complaint Register</span>
                            </div>
                            <div className="feature-item">
                                <span className="feature-icon"><Check size={16} /></span>
                                <span>Seamless Admin Portal</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Login Form Side */}
                <div className="login-form-side">
                    <div className="login-content">
                        {/* Login Card */}
                        <div className="login-card">
                            <div className="login-card-body">
                                {/* Mobile Branding (Hidden on desktop banner view) */}
                                <div className="mobile-branding-wrapper">
                                    <Branding size="md" variant="auto" />
                                </div>

                                {/* Login Header (Logo removed) */}
                                <div className="login-header" style={{ marginTop: '2rem' }}>
                                    <h1 className="login-title">Welcome Back</h1>
                                    <p className="login-subtitle">Sign in to your institutional account</p>
                                </div>


                        {error && (
                            <div className="animate-fade-in" style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '1rem',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '0.75rem',
                                color: '#ef4444',
                                fontSize: '0.85rem',
                                marginBottom: '1.5rem'
                            }}>
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-4" noValidate>
                            <div className="login-form-group">
                                <label className="login-label" htmlFor="email">Admin ID / Email ID</label>
                                <div className="login-input-wrapper">
                                    <div className="login-input-icon">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        id="email"
                                        name="email"
                                        type="text"
                                        className="login-input"
                                        placeholder="ADM-XXXX or admin@rgukt.ac.in"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        style={{ paddingRight: savedData.length > 0 ? '4.5rem' : '12px' }}
                                    />
                                    {savedData.length > 0 && (
                                        <button 
                                            type="button"
                                            className="autofill-trigger-badge"
                                            onClick={() => setShowAutofillPrompt(true)}
                                        >
                                            <UserCircle size={14} />
                                            <span>Saved</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="login-form-group">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <label className="login-label" style={{ marginBottom: 0 }} htmlFor="password">Password</label>
                                    <Link to="/forgot-password" className="login-forgot-link">Forgot password?</Link>
                                </div>
                                <div className="login-input-wrapper" style={{ position: 'relative' }}>
                                    <div className="login-input-icon">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        className="login-input"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={handleChange}
                                        style={{ paddingRight: '5rem' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: '10px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: 'var(--color-slate-400)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '4px'
                                        }}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="login-btn"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span className="animate-spin" style={{ border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', width: '1rem', height: '1rem' }}></span>
                                        Signing in...
                                    </span>
                                ) : (
                                    <>
                                        <span>Sign In securely</span>
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>









                            <div className="login-divider">
                                <span>or continue with</span>
                            </div>

                            <button
                                type="button"
                                className="google-login-btn"
                                onClick={handleGoogleLogin}
                                disabled={isLoading}
                            >
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
                                <span>Sign In with Google</span>
                            </button>
                        </form>
                    </div>

                    <div className="login-footer-bar">
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-slate-500)', fontWeight: '500' }}>Don't have an account?</span>
                        <Link to="/register" className="login-footer-btn">Create Account</Link>
                    </div>
                </div>

                {/* Comprehensive Footer */}
                        <AppFooter />
            </div>

            {/* PIN Verification Modal */}
            {showPinModal && (
                <div className="auth-modal-overlay">
                    <div className="auth-modal-content">
                        {isSuccess ? (
                            <div className="success-animation-container">
                                <div className="success-wrapper-horizontal">
                                    <div className="checkmark-circle">
                                        <svg className="w-12 h-12 text-[var(--color-slate-900)]" viewBox="0 0 24 24">
                                            <path className="checkmark-svg" d="M20 6L9 17L4 12" style={{ stroke: 'currentColor' }} />
                                        </svg>
                                    </div>
                                    <div className="sparkles-side-container">
                                        <div className="sparkle-accent ss1"><Sparkle size={14} fill="currentColor" /></div>
                                        <div className="sparkle-accent ss2"><Sparkles size={22} fill="currentColor" /></div>
                                        <div className="sparkle-accent ss3"><Sparkle size={12} fill="currentColor" /></div>
                                    </div>
                                </div>
                                <h3 className="success-text">Verified!</h3>
                                <p className="success-subtext">Redirecting to dashboard...</p>
                            </div>
                        ) : (
                            <>
                                <div className="text-center mb-6">
                                    <div className="auth-modal-icon-wrapper">
                                        <Lock size={32} />
                                    </div>
                                    <h3 className="auth-modal-title">Admin Verification</h3>
                                    <p className="auth-modal-desc">
                                        Please enter your 6-digit PIN to continue.
                                    </p>
                                </div>

                                <div className="pin-input-container">
                                    {pin.map((digit, index) => (
                                        <input
                                            key={index}
                                            ref={el => pinInputRefs.current[index] = el}
                                            type="password"
                                            maxLength={1}
                                            className="pin-input-field"
                                            value={digit}
                                            onChange={(e) => handlePinChange(index, e.target.value)}
                                            onKeyDown={(e) => handlePinKeyDown(index, e)}
                                            autoFocus={index === 0}
                                        />
                                    ))}
                                </div>

                                {error && (
                                    <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm text-center flex items-center justify-center gap-2">
                                        <AlertCircle size={16} />
                                        {error}
                                    </div>
                                )}

                                <button
                                    onClick={verifyAdminPin}
                                    className="login-btn"
                                    style={{ marginBottom: '1rem' }}
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Verifying...' : 'Verify Access'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}


        </div>
        </div>

            {/* Direct Login Overlay */}
            {isDirectLoggingIn && (
                <div className="direct-login-overlay animate-fade-in">
                    <div className="direct-login-content">
                        <div className="direct-login-spinner"></div>
                        <div className="direct-login-text">
                            <h3>Please wait</h3>
                            <p>Account logging in...</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Account Selector Bottom Sheet (Autofill) */}
            {showAutofillPrompt && savedData && (
                <div className="save-prompt-overlay" onClick={() => setShowAutofillPrompt(false)}>
                    <div className="save-prompt-sheet animate-slide-up-bottom" onClick={e => e.stopPropagation()}>
                        <div className="save-prompt-header">
                            <div className="save-prompt-icon">
                                <UserCircle size={28} />
                            </div>
                            <div className="save-prompt-titles">
                                <h3>Choose an account</h3>
                                <p>Continue with your saved credentials</p>
                            </div>
                        </div>

                        <div className="account-selector-hint">
                            <ShieldAlert size={12} />
                            <span>Long press an account to remove it</span>
                        </div>
                        
                        <div className="account-selector-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {savedData.map((profile, idx) => (
                                <div 
                                    key={idx} 
                                    className="account-item" 
                                    onClick={() => {
                                        if (!isLongPressActive.current) {
                                            applyAutofill(profile);
                                        }
                                    }}
                                    onTouchStart={(e) => handleTouchStart(e, profile)}
                                    onTouchEnd={handleTouchEnd}
                                    onTouchMove={handleTouchEnd} // Cancel on scroll/move
                                    onContextMenu={(e) => e.preventDefault()} // Disable native menu
                                >
                                    <div className="account-avatar">
                                        {profile.avatar ? (
                                            <img 
                                                src={profile.avatar} 
                                                alt="Profile" 
                                                className="account-photo-img"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            profile.email.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div className="account-info">
                                        <span className="account-email">{profile.email}</span>
                                        <span className="account-status">Saved on this device</span>
                                    </div>
                                    <div className="account-actions">
                                        <ArrowRight size={18} className="account-arrow" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="save-prompt-actions">
                            <button onClick={() => setShowAutofillPrompt(false)} className="btn-save-decline">Use another account</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Save Credentials Bottom Sheet */}
            {showSavePrompt && (
                <div className="save-prompt-overlay">
                    <div className="save-prompt-sheet animate-slide-up-bottom">
                        <div className="save-prompt-header">
                            <div className={`save-prompt-icon ${isSavingSuccess ? 'success-mode' : ''}`}>
                                {isSavingSuccess ? <Check size={24} /> : <ShieldCheck size={24} />}
                            </div>
                            <div className="save-prompt-titles">
                                <h3>{isSavingSuccess ? 'Saved successfully!' : 'Save details?'}</h3>
                                <p>{isSavingSuccess ? 'Your credentials are now secure.' : 'Autofill will be available next time you log in.'}</p>
                            </div>
                        </div>
                        
                        <div className="save-prompt-preview">
                            <div className="preview-item">
                                <Mail size={16} />
                                <span>{formData.email}</span>
                            </div>
                        </div>

                        <div className="save-prompt-actions">
                            <button onClick={handleSaveDecline} className="btn-save-decline">Decline</button>
                            <button onClick={handleSaveConfirm} className="btn-save-confirm">Save Details</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="save-prompt-overlay" style={{ zIndex: 3000 }} onClick={() => !isDeletingSuccess && setShowDeleteConfirm(false)}>
                    <div className="save-prompt-sheet animate-slide-up-bottom" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
                        {isDeletingInProgress ? (
                            <div className="save-success-container">
                                <div className="deleting-spinner-wrapper">
                                    <div className="deleting-spinner-ring"></div>
                                    <Trash2 size={40} className="deleting-icon-anim" />
                                </div>
                                <h3 style={{ color: 'var(--color-red-600)', fontWeight: 800 }}>Deleting Account</h3>
                                <p style={{ color: 'var(--color-slate-500)' }}>Permanently removing credentials...</p>
                            </div>
                        ) : isDeletingSuccess ? (
                            <div className="save-success-container">
                                <div className="success-tick-wrapper">
                                    <div className="success-ring"></div>
                                    <Check size={48} className="success-tick animate-scale-in-check" />
                                </div>
                                <h3 style={{ color: 'var(--color-emerald-600)', fontWeight: 800 }}>Account Deleted</h3>
                                <p style={{ fontSize: '1rem', color: 'var(--color-slate-500)' }}>Successfully removed from this device</p>
                            </div>
                        ) : (
                            <>
                                <div className="delete-profile-preview">
                                    <div className="delete-avatar-wrapper">
                                        {profileToDelete?.avatar ? (
                                            <img src={profileToDelete.avatar} alt="Profile" className="delete-avatar-img" />
                                        ) : (
                                            <div className="delete-avatar-initial">
                                                {profileToDelete?.email.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="delete-warning-badge">
                                            <ShieldAlert size={14} />
                                        </div>
                                    </div>
                                    <div className="delete-profile-details">
                                        <h4>{profileToDelete?.email}</h4>
                                        <p>This account will be removed from this device</p>
                                    </div>
                                </div>
                                
                                <div className="delete-confirm-content">
                                    <div className="input-group-v2">
                                        <label className="input-label-v2">Identity Verification</label>
                                        <div className={`input-wrapper-v2 ${deleteError ? 'error' : ''}`}>
                                            <Lock className="input-icon-v2" size={20} />
                                            <input 
                                                type="password"
                                                placeholder="Enter account password"
                                                value={deletePassword}
                                                onChange={(e) => {
                                                    setDeletePassword(e.target.value);
                                                    if (deleteError) setDeleteError('');
                                                }}
                                                className="input-field-v2"
                                            />
                                        </div>
                                        {deleteError && <p className="error-text-v2"><AlertCircle size={14} /> {deleteError}</p>}
                                    </div>
                                </div>

                                <div className="save-prompt-actions" style={{ marginTop: '1rem' }}>
                                    <button 
                                        onClick={() => setShowDeleteConfirm(false)} 
                                        className="btn-save-decline"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleConfirmDelete} 
                                        className="btn-save-confirm btn-danger"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;
