import { X, User, ChevronRight, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react'; 
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import './ProfileBottomSheet.css';

const ProfileBottomSheet = ({ isOpen, onClose, user, onLogout }) => {
    const navigate = useNavigate();
    const [shouldRender, setShouldRender] = useState(isOpen);
    const [isClosing, setIsClosing] = useState(false);
    const [showFullPhoto, setShowFullPhoto] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            setIsClosing(false);
        } else if (shouldRender) {
            setIsClosing(true);
            const timer = setTimeout(() => {
                setShouldRender(false);
                setIsClosing(false);
                setShowFullPhoto(false);
            }, 400); // Matches CSS animation duration
            return () => clearTimeout(timer);
        }
    }, [isOpen, shouldRender]);

    if (!shouldRender) return null;

    const modalContent = (
        <div className={`profile-sheet-overlay ${isClosing ? 'is-closing' : ''}`} onClick={onClose}>
            {/* Full Photo Preview Overlay */}
            {showFullPhoto && user?.avatar && (
                <div className="full-photo-overlay animate-fade-in" onClick={(e) => { e.stopPropagation(); setShowFullPhoto(false); }}>
                    <div className="full-photo-container">
                        <img src={user.avatar} alt="Full Profile" className="full-photo-img animate-zoom-in" />
                        <button className="full-photo-close" onClick={() => setShowFullPhoto(false)}>
                            <X size={24} />
                        </button>
                    </div>
                </div>
            )}

            <div 
                className={`profile-sheet-content ${isClosing ? 'animate-pop-out' : 'animate-pop-in'}`} 
                onClick={e => e.stopPropagation()}
            >
                {/* Drag Handle */}
                <div className="profile-sheet-handle"></div>

                {/* Header */}
                <div className="profile-sheet-header">
                    <div className="profile-sheet-user-info">
                        <button 
                            className="profile-sheet-avatar-btn"
                            onClick={() => setShowFullPhoto(true)}
                            title="View full photo"
                        >
                            <div className="profile-sheet-avatar-wrapper">
                                {user?.avatar ? (
                                    <img src={user.avatar} alt="Profile" className="profile-sheet-avatar" />
                                ) : (
                                    <div className="profile-sheet-avatar-placeholder">
                                        {user?.fullName?.charAt(0).toUpperCase() || 'S'}
                                    </div>
                                )}
                            </div>
                        </button>
                        <div className="profile-sheet-text-info">
                            <h3>{user?.fullName || 'User'}</h3>
                            <p>{user?.studentId || user?.email}</p>
                        </div>
                    </div>
                    <button className="profile-sheet-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Actions */}
                <div className="profile-sheet-actions">
                    <div className="animate-fade-in flex flex-col gap-3">
                            <button 
                                className="profile-sheet-action-btn" 
                                onClick={() => {
                                    navigate('/profile');
                                    onClose();
                                }}
                            >
                                <div className="action-icon-box profile">
                                    <User size={20} />
                                </div>
                                <div className="action-label">
                                    <span>View Profile</span>
                                    <p>Manage your account settings</p>
                                </div>
                                <ChevronRight size={18} className="action-arrow" />
                            </button>

                            <button 
                                className="profile-sheet-action-btn logout" 
                                onClick={() => {
                                    onLogout();
                                    onClose();
                                }}
                            >
                                <div className="action-icon-box logout">
                                    <LogOut size={20} />
                                </div>
                                <div className="action-label">
                                    <span>Sign Out</span>
                                    <p>Securely end your session</p>
                                </div>
                                <ChevronRight size={18} className="action-arrow" />
                            </button>
                        </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default ProfileBottomSheet;
