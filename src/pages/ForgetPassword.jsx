import { AlertCircle, ShieldCheck, User, ArrowRight, CheckCircle2, Link, ArrowLeft } from 'lucide-react';
import AppFooter from '../components/Common/AppFooter';
import Branding from '../components/Branding';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import './ForgetPassword.css';

const ForgetPassword = () => {
    const [step, setStep] = useState(1); // 1: IDs, 2: Verifying, 3: Success (Email Sent)
    const [rcId, setRcId] = useState('');
    const [studentId, setStudentId] = useState('');
    const [targetUser, setTargetUser] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isMismatch, setIsMismatch] = useState(false);
    
    const { verifyIdentifiers, recoverRcId } = useAuth();
    const navigate = useNavigate();

    const [showRcIdModal, setShowRcIdModal] = useState(false);
    const [rcIdName, setRcIdName] = useState('');
    const [rcIdCollegeId, setRcIdCollegeId] = useState('');
    const [rcIdMobile, setRcIdMobile] = useState('');
    const [recoveredRcId, setRecoveredRcId] = useState('');
    const [rcIdError, setRcIdError] = useState('');
    const [rcIdLoading, setRcIdLoading] = useState(false);

    // Clear mismatch state when typing
    useEffect(() => {
        if (isMismatch) setIsMismatch(false);
    }, [rcId, studentId]);

    const handleRecoverRcId = async (e) => {
        e.preventDefault();
        setRcIdError('');
        setRecoveredRcId('');

        if (!rcIdName || !rcIdCollegeId || !rcIdMobile) {
            setRcIdError('All fields are required.');
            return;
        }

        setRcIdLoading(true);
        try {
            const result = await recoverRcId(rcIdName, rcIdCollegeId, rcIdMobile);
            setRecoveredRcId(result);
            setRcIdLoading(false);
        } catch (err) {
            setRcIdLoading(false);
            setRcIdError(err.message || 'Failed to recover RC ID.');
        }
    };

    const handleVerifyIdentifiers = async (e) => {
        e.preventDefault();
        setError('');
        setIsMismatch(false);
        
        const cleanRcId = rcId.trim().toUpperCase();
        const cleanStudentId = studentId.trim().toUpperCase();

        if (!cleanRcId || !cleanStudentId) {
            setError('Please enter both your RGUKT Connect ID and College ID.');
            return;
        }

        setIsLoading(true);

        try {
            // "Perfectly match" verification
            const matchedUser = await verifyIdentifiers(cleanRcId, cleanStudentId);
            
            if (!matchedUser) {
                setIsMismatch(true);
                setError('Identity mismatch! The provided RC ID and College ID do not match any registered account.');
                setIsLoading(false);
                return;
            }

            // Identification success
            setTargetUser(matchedUser);
            setStep(2); 

            // Verification animation delay
            setTimeout(async () => {
                try {
                    await sendPasswordResetEmail(auth, matchedUser.email);
                    setIsLoading(false);
                    setStep(3); // Move to success step (email sent)
                } catch (emailErr) {
                    setIsLoading(false);
                    setError('Failed to send reset email. Please try again later.');
                }
            }, 1800);

        } catch (err) {
            setIsLoading(false);
            setError('An error occurred during secure verification. Please try again.');
        }
    };

    return (
        <div className={`forget-container ${isMismatch ? 'red-alert-active' : ''}`}>
            <div className="forget-card">
                <div className="forget-branding-wrapper">
                    <Branding size="md" />
                </div>

                {error && (
                    <div className={`forget-error ${isMismatch ? 'error-urgent' : ''}`}>
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                {step === 1 && (
                    <div className="forget-step animate-fade-in">
                        <div className="step-header">
                            <div className="step-icon-wrapper">
                                <ShieldCheck size={28} />
                            </div>
                            <h2>Identity Verification</h2>
                            <p>Verify your account using your unique platform identifiers.</p>
                        </div>

                        <form onSubmit={handleVerifyIdentifiers} className="forget-form" noValidate>
                            <div className="form-group">
                                <label htmlFor="rcId">RGUKT Connect ID</label>
                                <div className="input-wrapper">
                                    <ShieldCheck className="input-icon" size={18} />
                                    <input
                                        type="text"
                                        id="rcId"
                                        name="rc_id_field"
                                        placeholder="RCXXXXXX"
                                        value={rcId}
                                        onChange={(e) => setRcId(e.target.value)}
                                        className={isMismatch ? 'input-error' : ''}
                                        disabled={isLoading}
                                        autoFocus
                                        required
                                        autoComplete="off"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="studentId">College ID</label>
                                <div className="input-wrapper">
                                    <User className="input-icon" size={18} />
                                    <input
                                        type="text"
                                        id="studentId"
                                        name="student_id_field"
                                        placeholder="RXXXXXX"
                                        value={studentId}
                                        onChange={(e) => setStudentId(e.target.value)}
                                        className={isMismatch ? 'input-error' : ''}
                                        disabled={isLoading}
                                        required
                                        autoComplete="off"
                                    />
                                </div>
                            </div>

                            <button type="submit" className={`forget-btn ${isMismatch ? 'btn-urgent' : ''}`} disabled={isLoading || !rcId || !studentId}>
                                <span>Verify Identity</span>
                                <ArrowRight size={18} />
                            </button>
                            
                            <div className="forget-links" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
                                <button type="button" className="rc-id-recovery-link" onClick={() => setShowRcIdModal(true)}>
                                    Don't know your RC ID?
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {step === 2 && (
                    <div className="forget-step verifying-step animate-fade-in">
                        <div className="verification-animation">
                            <div className="pulse-ring verify-pulse-1"></div>
                            <div className="pulse-ring verify-pulse-2"></div>
                            <div className="verify-icon">
                                <ShieldCheck size={32} className="text-white" />
                            </div>
                        </div>
                        <h3>Establishing Secure Link</h3>
                        <p>Authenticating credentials for <strong>{targetUser?.fullName}</strong>...</p>
                    </div>
                )}

                {step === 3 && (
                    <div className="forget-step success-step animate-fade-in">
                        <div className="step-icon-wrapper success-icon">
                            <CheckCircle2 size={32} />
                        </div>
                        <h2>Verification Successful</h2>
                        <p style={{ marginTop: '1rem', lineHeight: '1.6' }}>
                            Identity confirmed for <strong>{targetUser?.fullName}</strong>.
                        </p>
                        <div className="forget-success-box" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                            <p>We have securely sent a password reset link to your institutional email:</p>
                            <h4 style={{ color: 'var(--color-primary-600)', marginTop: '0.5rem', wordBreak: 'break-all' }}>
                                {targetUser?.email}
                            </h4>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-light)' }}>
                            Please check your inbox and click the link to choose a new password.
                        </p>
                        <button className="forget-btn" onClick={() => navigate('/login')} style={{ marginTop: '2rem' }}>
                            Return to Login
                        </button>
                    </div>
                )}

                {step !== 4 && step !== 2 && (
                    <div className="forget-footer">
                        <Link to="/login" className="back-link">
                            <ArrowLeft size={16} />
                            <span>Back to Login</span>
                        </Link>
                    </div>
                )}
            </div>
            <AppFooter />

            {showRcIdModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Recover RC ID</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>Enter your details to recover your RGUKT Connect ID.</p>
                        
                        {rcIdError && (
                            <div className="forget-error error-urgent" style={{ marginBottom: '1rem' }}>
                                <AlertCircle size={18} />
                                <span>{rcIdError}</span>
                            </div>
                        )}

                        {recoveredRcId ? (
                            <div className="success-box" style={{ padding: '1rem', background: 'var(--color-success)', color: 'white', borderRadius: 'var(--radius-md)', textAlign: 'center', marginBottom: '1rem' }}>
                                <p>Your RC ID is:</p>
                                <h2 style={{ color: 'white', margin: '0.5rem 0' }}>{recoveredRcId}</h2>
                                <button className="btn btn-secondary" style={{ marginTop: '0.5rem', width: '100%', color: 'var(--color-text-main)' }} onClick={() => {
                                    setRcId(recoveredRcId);
                                    setShowRcIdModal(false);
                                }}>Use this ID</button>
                            </div>
                        ) : (
                            <form onSubmit={handleRecoverRcId}>
                                <div className="form-group" style={{ marginBottom: '1rem' }}>
                                    <label>Student Name</label>
                                    <input type="text" className="input" value={rcIdName} onChange={e => setRcIdName(e.target.value)} required />
                                </div>
                                <div className="form-group" style={{ marginBottom: '1rem' }}>
                                    <label>College ID (RXXXXXX)</label>
                                    <input type="text" className="input" value={rcIdCollegeId} onChange={e => setRcIdCollegeId(e.target.value)} required />
                                </div>
                                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                    <label>Mobile Number</label>
                                    <input type="tel" className="input" value={rcIdMobile} onChange={e => setRcIdMobile(e.target.value)} required />
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowRcIdModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={rcIdLoading}>
                                        {rcIdLoading ? 'Searching...' : 'Find ID'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ForgetPassword;

