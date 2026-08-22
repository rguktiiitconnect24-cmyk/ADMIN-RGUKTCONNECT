import { Shield, CheckCircle, AlertCircle, Users, BookOpen, MessageSquare, Activity, GraduationCap, FileText, Calendar, RefreshCw, Database, Award, QrCode, UploadCloud } from 'lucide-react';
import LoadingTransition from '../../components/Common/LoadingTransition';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, complaintsDb } from '../../config/firebase';
import { collection, query, getDocs, limit, orderBy } from 'firebase/firestore';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import './Admin.css';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalStudents: 0,
        facultyCount: 0,
        complaintsCount: 0,
        uptime: '99.9%'
    });
    const [recentUsers, setRecentUsers] = useState([]);
    const [recentComplaints, setRecentComplaints] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sessionStart] = useState(Date.now());
    const [liveUptime, setLiveUptime] = useState('00:00:00');

    useEffect(() => {
        const timer = setInterval(() => {
            const diff = Math.floor((Date.now() - sessionStart) / 1000);
            const h = Math.floor(diff / 3600).toString().padStart(2, '0');
            const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
            const s = (diff % 60).toString().padStart(2, '0');
            setLiveUptime(`${h}:${m}:${s}`);
        }, 1000);
        return () => clearInterval(timer);
    }, [sessionStart]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch Users
                const usersRef = collection(db, 'users');
                const usersSnap = await getDocs(usersRef);
                const allUsers = usersSnap.docs.map(doc => doc.data());

                // Fetch Notices
                let noticesCount = 0;
                try {
                    const noticesSnap = await getDocs(collection(db, 'notices'));
                    noticesCount = noticesSnap.size;
                } catch (e) {
                    console.log("Notices collection not found yet.");
                }

                // Fetch Complaints
                let complaintsCount = 0;
                try {
                    const complaintsSnap = await getDocs(collection(complaintsDb, 'complaints'));
                    complaintsCount = complaintsSnap.docs.filter(doc => doc.data().status !== 'resolved').length;
                } catch (e) {
                    console.log("Complaints collection not found yet.");
                }

                setStats({
                    totalStudents: allUsers.filter(u => u.role === 'student' || !u.role).length,
                    facultyCount: allUsers.filter(u => u.role === 'faculty').length,
                    noticesCount: noticesCount,
                    complaintsCount: complaintsCount,
                    uptime: '99.98%'
                });

                // Get 5 most recent users
                const usersQuery = query(usersRef, orderBy('createdAt', 'desc'), limit(5));
                const recentUsersSnap = await getDocs(usersQuery);
                setRecentUsers(recentUsersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

                // Get 5 most recent complaints
                const complaintsRef = collection(complaintsDb, 'complaints');
                const complaintsQuery = query(complaintsRef, orderBy('createdAt', 'desc'), limit(5));
                const recentComplaintsSnap = await getDocs(complaintsQuery);
                setRecentComplaints(recentComplaintsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

                setIsLoading(false);
            } catch (error) {
                console.error("Error fetching admin stats:", error);
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const isSuperAdmin = user?.role === 'admin' && (!user?.permissions || user.permissions.includes('all'));
    const isFaculty = user?.role === 'faculty';
    const isSubAdmin = user?.role === 'admin' && !isSuperAdmin;

    if (isLoading) return <LoadingTransition message="Dashboard Loading" persistent />;

    return (
        <div className="admin-container">
            <div className="page-header-v2">
                <div className="header-accent-bar"></div>
                <div className="header-content-v2">
                    <h1 className="page-title-v2">{isSuperAdmin ? 'Admin Dashboard' : 'Dashboard'}</h1>
                    <p className="page-subtitle-v2">
                        Welcome back, {user?.displayName || user?.fullName || 'Admin'}. 
                        {isSuperAdmin && " System status is optimal."}
                    </p>
                </div>
            </div>

            {isSubAdmin && (
                <div className="sub-admin-welcome-container">
                    <div className="welcome-banner subadmin-banner">
                        <div className="welcome-icon-wrapper">
                            <Shield size={48} />
                        </div>
                        <div className="welcome-text-wrapper">
                            <h2>Welcome, {user?.displayName || user?.fullName || 'Sub-Admin'}!</h2>
                            <p>You are logged in as a Sub-Admin. You have specialized access to manage specific modules.</p>
                        </div>
                    </div>

                    <div className="permissions-section">
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--color-text-main)' }}>Your Authorized Modules</h3>
                        {user?.permissions?.length > 0 ? (
                            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
                                {user.permissions.map((perm, index) => {
                                    let path = perm.replace('admin-', '');
                                    if (path === 'books') path = 'book-orders';
                                    
                                    return (
                                        <div 
                                            key={index} 
                                            className="stat-card" 
                                            style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', cursor: 'pointer', transition: 'all 0.2s ease-in-out' }}
                                            onClick={() => navigate(`/admin/${path}`)}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                        >
                                            <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <CheckCircle size={24} />
                                            </div>
                                            <div style={{ textTransform: 'capitalize', fontWeight: '600', fontSize: '1.1rem', color: 'var(--color-text-main)' }}>
                                                {perm.replace('-', ' ')}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <AlertCircle size={48} style={{ color: 'var(--color-warning)', marginBottom: '1rem' }} />
                                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>No Permissions Assigned</h3>
                                <p style={{ color: 'var(--color-text-muted)' }}>Please contact the Super Admin to request access to modules.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isFaculty && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="sub-admin-welcome-container"
                >
                    <div 
                        className="welcome-banner subadmin-banner" 
                        style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', // Vibrant Emerald Gradient
                            color: '#ffffff',
                            boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.3)'
                        }}
                    >
                        <motion.div 
                            className="welcome-icon-wrapper"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            style={{ background: 'rgba(255, 255, 255, 0.2)' }}
                        >
                            <BookOpen size={48} color="#ffffff" />
                        </motion.div>
                        <div className="welcome-text-wrapper">
                            <motion.h2 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                                style={{ color: '#ffffff', marginBottom: '0.5rem' }}
                            >
                                Welcome, {user?.displayName || user?.fullName || 'Faculty Member'}!
                            </motion.h2>
                            <motion.p
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 }}
                                style={{ color: 'rgba(255, 255, 255, 0.9)' }}
                            >
                                You are logged into the Faculty Portal. Use the sidebar to navigate to your assigned modules and manage your classes.
                            </motion.p>
                        </div>
                    </div>
                </motion.div>
            )}

            {isSuperAdmin && (
                <>
                    <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                        <Users size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>Total Students</h3>
                        <p>{stats.totalStudents}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#eab308' }}>
                        <BookOpen size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>Faculty</h3>
                        <p>{stats.facultyCount}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e' }}>
                        <MessageSquare size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>Active Complaints</h3>
                        <p>{stats.complaintsCount}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
                        <Activity size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>System Uptime</h3>
                        <div className="flex items-baseline gap-2">
                            <p>{stats.uptime}</p>
                            <span className="text-[10px] text-green-500 font-bold uppercase tracking-wider bg-green-500/10 px-1.5 py-0.5 rounded">Live: {liveUptime}</span>
                        </div>
                    </div>
                </div>
                <div className="stat-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin/users')}>
                    <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                        <Users size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>User Management</h3>
                        <p className="text-xs text-[var(--color-text-muted)] font-normal mt-1">Manage accounts</p>
                    </div>
                </div>
                <div className="stat-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin/exams')}>
                    <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
                        <GraduationCap size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>Exam Management</h3>
                        <p className="text-xs text-[var(--color-text-muted)] font-normal mt-1">Schedules & Seating</p>
                    </div>
                </div>
                <div className="stat-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin/quizzes')}>
                    <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                        <BookOpen size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>Quiz Dashboard</h3>
                        <p className="text-xs text-[var(--color-text-muted)] font-normal mt-1">Create & Manage Quizzes</p>
                    </div>
                </div>
                <div className="stat-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin/courses')}>
                    <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
                        <FileText size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>Course Content</h3>
                        <p className="text-xs text-[var(--color-text-muted)] font-normal mt-1">Manage Subjects & Units</p>
                    </div>
                </div>
                <div className="stat-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin/timetable')}>
                    <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                        <Calendar size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>Edit Timetable</h3>
                        <p className="text-xs text-[var(--color-text-muted)] font-normal mt-1">Manage class schedules</p>
                    </div>
                </div>
                <div className="stat-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin/updates')}>
                    <div className="stat-icon" style={{ background: 'rgba(249, 115, 22, 0.1)', color: '#f97316' }}>
                        <RefreshCw size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>App Updates</h3>
                        <p className="text-xs text-[var(--color-text-muted)] font-normal mt-1">Push new version</p>
                    </div>
                </div>
                <div className="stat-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin/feedback')}>
                    <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
                        <MessageSquare size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>App Feedbacks</h3>
                        <p className="text-xs text-[var(--color-text-muted)] font-normal mt-1">View user feedback</p>
                    </div>
                </div>

                <div className="stat-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin/cgpa')}>
                    <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
                        <Award size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>CGPA Management</h3>
                        <p className="text-xs text-[var(--color-text-muted)] font-normal mt-1">Bulk upload Excel</p>
                    </div>
                </div>
                <div className="stat-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin/scanner')}>
                    <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                        <QrCode size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>QR Scanner</h3>
                        <p className="text-xs text-[var(--color-text-muted)] font-normal mt-1">Scan student ID cards</p>
                    </div>
                </div>
                
                {/* NEW TEST UPLOAD CARD ADDED HERE */}
                <div className="stat-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin/test-upload')}>
                    <div className="stat-icon" style={{ background: 'rgba(20, 184, 166, 0.1)', color: '#14b8a6' }}>
                        <UploadCloud size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>Test Upload</h3>
                        <p className="text-xs text-[var(--color-text-muted)] font-normal mt-1">Upload to Scripts API</p>
                    </div>
                </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                {/* Recent Registrations */}
                <div className="section-card">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold text-[var(--color-text-main)]">Recent Registrations</h2>
                        <button
                            onClick={() => navigate('/admin/users')}
                            className="btn-view-all"
                        >
                            View All
                        </button>
                    </div>

                    <div className="admin-table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Role</th>
                                    <th>Joined</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentUsers.map(u => (
                                    <tr key={u.id}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={u.avatar || `https://ui-avatars.com/api/?name=${u.fullName}&background=random`}
                                                    className="user-avatar"
                                                    alt=""
                                                />
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">{u.fullName}</span>
                                                    <span className="text-[10px] text-[var(--color-text-muted)] line-clamp-1">{u.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge badge-${u.role}`}>
                                                {u.role?.charAt(0).toUpperCase() + u.role?.slice(1)}
                                            </span>
                                        </td>
                                        <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</td>
                                    </tr>
                                ))}
                                {recentUsers.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="text-center py-8 text-[var(--color-text-muted)]">No recent users.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Complaints */}
                <div className="section-card">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold text-[var(--color-text-main)]">Recent Complaints</h2>
                        <button
                            onClick={() => navigate('/admin/complaints')}
                            className="btn-view-all"
                        >
                            View All
                        </button>
                    </div>

                    <div className="admin-table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Complaint</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentComplaints.map(complaint => (
                                    <tr key={complaint.id}>
                                        <td>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm line-clamp-1">{complaint.subject}</span>
                                                <span className="text-[10px] text-[var(--color-text-muted)] line-clamp-1">Category: {complaint.category}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${complaint.status}`}>
                                                {complaint.status?.replace('-', ' ')}
                                            </span>
                                        </td>
                                        <td>{complaint.createdAt ? new Date(complaint.createdAt.toDate ? complaint.createdAt.toDate() : complaint.createdAt).toLocaleDateString() : 'N/A'}</td>
                                    </tr>
                                ))}
                                {recentComplaints.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="text-center py-8 text-[var(--color-text-muted)]">No recent complaints.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            </>
            )}
        </div>
    );
};

export default AdminDashboard;
