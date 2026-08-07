import { User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './ProfileCompletionReminder.css';

const ProfileCompletionReminder = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!user) return;

        // 1. Check if profile is complete
        // Required: Name, Phone, Department, and non-default Avatar
        const isProfileIncomplete = !user.fullName || 
                                   !user.phone || 
                                   !user.department || 
                                   !user.avatar || 
                                   user.avatar.includes('ui-avatars.com');

        if (!isProfileIncomplete) return;

        // 2. Daily limit logic
        const today = new Date().toDateString();
        const lastDate = localStorage.getItem('rgukt_reminder_date');
        let count = parseInt(localStorage.getItem('rgukt_reminder_count') || '0');

        // Reset if it's a new day
        if (lastDate !== today) {
            count = 0;
            localStorage.setItem('rgukt_reminder_date', today);
            localStorage.setItem('rgukt_reminder_count', '0');
        }

        // Only show if daily limit (3) not reached
        if (count >= 3) return;

        // 3. Trigger popup after delay (2-3 seconds)
        const timer = setTimeout(() => {
            setIsVisible(true);
            // Increment and persist count immediately when shown
            localStorage.setItem('rgukt_reminder_count', (count + 1).toString());
        }, 2500);

        return () => clearTimeout(timer);
    }, [user]);

    const handleUpdateNow = () => {
        setIsVisible(false);
        navigate('/profile');
    };

    const handleRemindLater = () => {
        setIsVisible(false);
    };

    const modalContent = (
        <AnimatePresence>
            {isVisible && (
                <div className="profile-reminder-overlay">
                    <motion.div 
                        className="profile-reminder-modal"
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        transition={{ 
                            duration: 0.25, 
                            ease: [0.23, 1, 0.32, 1] // Custom cubic-bezier for premium feel
                        }}
                    >
                        <div className="reminder-icon-container">
                            <User size={32} />
                        </div>
                        
                        <h2 className="reminder-title">Complete Your Profile</h2>
                        
                        <p className="reminder-message">
                            Please update your profile information to ensure full access to features and accurate records.
                        </p>
                        
                        <div className="reminder-actions">
                            <button 
                                className="btn-update-now" 
                                onClick={handleUpdateNow}
                                autoFocus
                            >
                                Update Now
                            </button>
                            <button 
                                className="btn-remind-later" 
                                onClick={handleRemindLater}
                            >
                                Remind Me Later
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
};

export default ProfileCompletionReminder;
