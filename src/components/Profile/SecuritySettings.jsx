import { Fingerprint, Lock, EyeOff, Eye } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { nativeAuthService } from '../../services/nativeAuthService';

const SecuritySettings = () => {
    const { user, updateProfileData, changePassword } = useAuth();
    const { showToast } = useToast();
    const [isPasswordUpdating, setIsPasswordUpdating] = useState(false);
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [passwordError, setPasswordError] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);

    const handlePasswordUpdate = async () => {
        if (!passwords.current || !passwords.new || !passwords.confirm) {
            setPasswordError('Please fill all password fields.');
            return;
        }
        if (passwords.new !== passwords.confirm) {
            setPasswordError('New passwords do not match.');
            return;
        }
        if (passwords.new.length < 6) {
            setPasswordError('Password must be at least 6 characters.');
            return;
        }

        setIsPasswordUpdating(true);
        setPasswordError('');
        try {
            await changePassword(passwords.current, passwords.new);
            showToast("Password updated successfully!", "success");
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (err) {
            setPasswordError(err.message || "Failed to update password.");
        } finally {
            setIsPasswordUpdating(false);
        }
    };

    return (
        <div className="space-y-6 pb-8">
            {/* Biometric Section */}
            <div className="settings-section-card">
                <div className="settings-item-row">
                    <div className="settings-item-info">
                        <div className="settings-item-icon biometric">
                            <Fingerprint size={22} />
                        </div>
                        <div>
                            <h3 className="settings-item-title">Biometric Unlock</h3>
                            <p className="settings-item-desc">Secure access with fingerprint/FaceID</p>
                        </div>
                    </div>
                    <label className="premium-toggle">
                        <input 
                            type="checkbox" 
                            checked={user?.biometricAuth || false}
                            onChange={async (e) => {
                                const isChecked = e.target.checked;
                                try {
                                    await nativeAuthService.setAuthEnabled(isChecked);
                                    await updateProfileData({ biometricAuth: isChecked });
                                    showToast(isChecked ? "Biometrics enabled!" : "Biometrics disabled", "success");
                                } catch (err) {
                                    showToast("Biometric update failed", "error");
                                }
                            }}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
            </div>

            {/* Password Update Card */}
            <div className="settings-section-card">
                <div className="settings-item-header">
                    <div className="settings-item-icon security">
                        <Lock size={20} />
                    </div>
                    <div className="flex-1">
                        <h3 className="settings-item-title">Change Password</h3>
                        <p className="settings-item-desc">Keep your account secure</p>
                    </div>
                </div>

                <div className="settings-form-container">
                    <div className="premium-input-group">
                        <label>Current Password</label>
                        <div className="premium-input-wrapper">
                            <input
                                type={showPasswords ? "text" : "password"}
                                placeholder="Current password"
                                value={passwords.current}
                                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                            />
                        </div>
                    </div>
                    
                    <div className="premium-input-group">
                        <label>New Password</label>
                        <div className="premium-input-wrapper">
                            <input
                                type={showPasswords ? "text" : "password"}
                                placeholder="New password"
                                value={passwords.new}
                                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="premium-input-group">
                        <label>Confirm New Password</label>
                        <div className="premium-input-wrapper">
                            <input
                                type={showPasswords ? "text" : "password"}
                                placeholder="Confirm new password"
                                value={passwords.confirm}
                                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPasswords(!showPasswords)}
                                className="input-action-btn"
                            >
                                {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {passwordError && (
                        <p className="settings-error-text">{passwordError}</p>
                    )}

                    <button
                        className="premium-save-btn"
                        onClick={handlePasswordUpdate}
                        disabled={isPasswordUpdating}
                    >
                        {isPasswordUpdating ? (
                            <span className="flex items-center gap-2 justify-center">
                                <div className="btn-spinner"></div>
                                Updating...
                            </span>
                        ) : 'Save New Password'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SecuritySettings;
