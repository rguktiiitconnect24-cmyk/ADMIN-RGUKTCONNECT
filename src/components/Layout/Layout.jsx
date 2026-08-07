import BottomNav from './BottomNav';
import AppFooter from '../Common/AppFooter';
import Sidebar from './Sidebar';
import LogoutConfirm from '../Common/LogoutConfirm';
import ProfileBottomSheet from './ProfileBottomSheet';
import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
// import { Menu, Sun, Moon, Bell, ProfileBottomSheet, LogoutConfirm, Sidebar, Outlet, AppFooter, BottomNav } from 'lucide-react'; // Unused custom icons removed
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(true); // Default to collapsed
    const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const { user, logout, setIntentionalLogout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 15);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const isContentPage = location.pathname.includes('/courses/') && 
                         (location.pathname.split('/').filter(Boolean).length >= 5); // /courses/:year/:sem/:sub/:unit (length 5 after filter)
                         
    const showNav = user !== null && location.pathname !== '/';

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
        <div className={`app-layout ${!showNav ? 'no-sidebar' : isCollapsed ? 'sidebar-collapsed' : ''} overflow-x-hidden min-h-screen`}>
            {/* Portals / Modals */}
            <ProfileBottomSheet 
                isOpen={isProfileSheetOpen} 
                onClose={() => setIsProfileSheetOpen(false)}
                user={user}
                onLogout={() => setIsLogoutModalOpen(true)}
            />
            <LogoutConfirm 
                isOpen={isLogoutModalOpen} 
                onConfirm={handleLogoutConfirm} 
                onCancel={() => setIsLogoutModalOpen(false)}
            />

            {/* Mobile Notch Fade removed as per user request */}

            {/* Desktop Sidebar */}
            {showNav && (
                <div className="hidden md:block">
                    <Sidebar
                        isOpen={true}
                        onClose={() => { }}
                        isCollapsed={isCollapsed}
                        toggleCollapse={() => setIsCollapsed(!isCollapsed)}
                    />
                </div>
            )}

            {/* Main Content Area */}
            <div className={`main-content flex-1 flex flex-col min-w-0 transition-all duration-300 relative ${showNav ? 'md:pb-0' : ''}`}>
                
                {/* Dashboard Top Branding Bar */}
                {showNav && location.pathname === '/dashboard' && (
                    <>
                        <div className="dashboard-appbar">
                            <div className="appbar-brand">
                                <img src="/logo.svg" alt="RGUKT Connect Logo" className="appbar-logo" />
                                <span className="appbar-title">RGUKT CONNECT</span>
                            </div>
                            
                            <button 
                                onClick={() => setIsProfileSheetOpen(true)}
                                className="appbar-profile-btn"
                            >
                                {user?.avatar ? (
                                    <img src={user.avatar} alt="Profile" className="appbar-avatar" />
                                ) : (
                                    <div className="appbar-avatar-placeholder">
                                        {user?.fullName?.charAt(0).toUpperCase() || 'S'}
                                    </div>
                                )}
                            </button>
                        </div>
                        <div className="dashboard-appbar-spacer"></div>
                    </>
                )}


                {/* Page Content */}
                <main className={`flex-1 w-full max-w-full overflow-x-hidden px-4 pt-0 pb-12 sm:p-6 md:p-8 animate-fade-in relative z-0 ${showNav ? 'pb-nav-gap' : ''}`}>
                    <div className="container-fluid mx-auto">
                        <Outlet />
                    </div>
                    
                    <AppFooter />
                </main>
            </div>

            {/* Mobile Bottom Navigation */}
            {showNav && <BottomNav />}
        </div>
    );
};

export default Layout;
