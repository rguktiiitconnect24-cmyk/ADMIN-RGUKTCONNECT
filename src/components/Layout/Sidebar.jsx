import { GraduationCap, ChevronRight, ChevronLeft, Sun, Moon, LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import LogoutConfirm from '../Common/LogoutConfirm';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { complaintsDb } from '../../config/firebase';
import { Badge } from '@capawesome/capacitor-badge';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useAuth } from '../../context/AuthContext';


import { useTheme } from '../../context/ThemeContext';
import { NAV_ITEMS, FACULTY_NAV_ITEMS } from '../../config/navigation';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose, isCollapsed, toggleCollapse }) => {
    const { user, logout, setIntentionalLogout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    const [activeComplaintsCount, setActiveComplaintsCount] = useState(0);
    const [hasUnreadStudentReply, setHasUnreadStudentReply] = useState(false);

    // Complaint Count Listener (Admin Only)
    useEffect(() => {
        if (user?.role !== 'admin') {
            setActiveComplaintsCount(0);
            return;
        }

        const q = query(
            collection(complaintsDb, 'complaints'),
            where('status', 'in', ['pending', 'in-progress'])
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setActiveComplaintsCount(snapshot.size);
        }, (error) => {
            console.error("Error listening to complaints:", error);
        });

        return () => unsubscribe();
    }, [user]);

    // Student Unread Reply Listener
    useEffect(() => {
        if (!user || user?.role === 'admin') {
            setHasUnreadStudentReply(false);
            return;
        }

        const setupNotifications = async () => {
            if (!Capacitor.isNativePlatform()) return;
            try {
                const permStatus = await LocalNotifications.checkPermissions();
                if (permStatus.display !== 'granted') {
                    await LocalNotifications.requestPermissions();
                }

                await LocalNotifications.createChannel({
                    id: 'silent_badge_channel',
                    name: 'App Badges',
                    description: 'Silent notifications used only to trigger app icon badges',
                    importance: 2,
                    vibration: false
                });
            } catch (err) {
                console.warn("LocalNotifications setup skipped (Web/Unsupported):", err.message);
            }
        };

        setupNotifications();

        const q = query(
            collection(complaintsDb, 'complaints'),
            where('uid', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            let hasUnread = false;
            snapshot.forEach(doc => {
                if (doc.data().hasUnreadReply === true) {
                    hasUnread = true;
                }
            });
            setHasUnreadStudentReply(hasUnread);
            
            try {
                if (hasUnread) {
                    await Badge.set({ count: 1 });
                    
                    await LocalNotifications.schedule({
                        notifications: [
                            {
                                title: 'New Reply',
                                body: 'An admin has replied to your complaint.',
                                id: 9999,
                                channelId: 'silent_badge_channel',
                                schedule: { at: new Date(Date.now() + 1000) }
                            }
                        ]
                    });
                } else {
                    await Badge.clear();
                    await LocalNotifications.cancel({ notifications: [{ id: 9999 }] });
                }
            } catch (err) {
                console.log("Badge/Notification API not supported/failed:", err);
            }
        });

        return () => unsubscribe();
    }, [user]);


    // Filter items based on role and hideForAdmin flag
    const visibleItems = (() => {
        const userRole = (user?.role || '').toLowerCase();
        
        if (userRole === 'faculty') {
            return FACULTY_NAV_ITEMS;
        }

        return NAV_ITEMS.filter(item => {
            if (item.adminOnly && userRole !== 'admin') return false;
            if (userRole === 'admin' && item.hideForAdmin) return false;
            
            // Check semi-admin permissions
            if (userRole === 'admin' && item.adminOnly && user?.permissions && user.permissions.length > 0) {
                if (!user.permissions.includes('all') && !user.permissions.includes(item.id) && item.id !== 'admin-dashboard') {
                    return false;
                }
            }
            
            return true;
        });
    })();


    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

    const handleLogoutConfirm = async () => {
        try {
            setIntentionalLogout(true);
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Logout failed:", error);
            setIsLogoutModalOpen(false);
        }
    };

    return (
        <>
            <LogoutConfirm 
                isOpen={isLogoutModalOpen} 
                onConfirm={handleLogoutConfirm} 
                onCancel={() => setIsLogoutModalOpen(false)}
            />
            {/* Sidebar Container */}
            <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
                {/* Brand */}
                <div className="sidebar-brand">
                    <GraduationCap className="brand-icon" size={28} />
                    {!isCollapsed && (
                        <div className="brand-name">
                            <span className="brand-part">RGUKT</span>
                            <span className="brand-part">CONNECT</span>
                        </div>
                    )}
                </div>

                {/* Unified Toggle / Close Button */}
                <button
                    onClick={() => {
                        if (window.innerWidth < 768) {
                            onClose();
                        } else {
                            toggleCollapse();
                        }
                    }}
                    className="collapse-toggle-btn"
                    title={
                        window.innerWidth < 768
                            ? "Close Sidebar"
                            : isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"
                    }
                >
                    {/* On Desktop: Left/Right based on collapse. On Mobile: Always Left (Close) */}
                    {window.innerWidth >= 768 && isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                {/* Navigation */}
                <nav className="sidebar-nav">
                    {!isCollapsed && (
                        <div className="mb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider animate-fade-in hidden">
                            Menu
                        </div>
                    )}

                    {visibleItems.map((item) => {
                        const showBadge = (item.id === 'admin-complaints' && activeComplaintsCount > 0);
                        const badgeValue = activeComplaintsCount;

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `nav-item ${isActive ? 'active' : ''} ${item.path === '/profile' ? 'user-profile-link' : ''}`
                                }
                                title={item.label}
                            >
                                <div className="nav-icon-container">
                                    {item.id === 'profile' && user?.avatar ? (
                                        <img src={user.avatar} className="nav-avatar" alt="" />
                                    ) : (
                                        <item.icon size={22} className="shrink-0" />
                                    )}
                                    {showBadge && (
                                        <span className={`nav-badge ${isCollapsed ? 'collapsed' : ''}`}>
                                            {badgeValue > 9 ? '9+' : badgeValue}
                                        </span>
                                    )}
                                    {item.id === 'complaints' && hasUnreadStudentReply && user?.role !== 'admin' && (
                                        <span className={`unread-pulse-badge ${isCollapsed ? 'collapsed' : ''}`}></span>
                                    )}
                                </div>
                                <span className={`nav-label whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto ml-3'}`}>
                                    {item.label}
                                </span>
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Footer / User Wrapper */}
                <div className="sidebar-footer">


                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="sidebar-footer-btn mb-2 theme-toggle-btn"
                        title="Toggle Theme"
                    >
                        {theme === 'dark' ? <Sun size={20} className="shrink-0" /> : <Moon size={20} className="shrink-0" />}
                        <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto ml-2'}`}>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>

                    <button
                        onClick={() => setIsLogoutModalOpen(true)}
                        className="sidebar-footer-btn logout btn-click-effect"
                        title="Sign Out"
                    >
                        <LogOut size={20} className="shrink-0" />
                        <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto ml-2'}`}>Sign Out</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
