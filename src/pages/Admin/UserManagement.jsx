import { MoreVertical, Search, Filter, Mail, Download, Eye, MailCheck, Edit2, Trash2, X, AlertCircle, Monitor, AlertTriangle, Check, LogIn, Database } from 'lucide-react';
import CustomSelect from '../../components/Common/CustomSelect';
import LoadingTransition from '../../components/Common/LoadingTransition';
import BulkUpdater from '../../components/Admin/BulkUpdater';
import PUCBulkUpdater from '../../components/Admin/PUCBulkUpdater';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { db, functions, pucDb } from '../../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { formatClassID } from '../../utils/formatUtils';
import './Admin.css';
import './CreateAdminAccount.css';
import { deleteProfileImage } from '../../services/imageService';
import { NAV_ITEMS } from '../../config/navigation';
import AdminAppointmentLetter from '../../components/Admin/AdminAppointmentLetter';

const UserManagement = () => {
    const navigate = useNavigate();
    const { user, register, logout, forceLoginAsUser } = useAuth();
    const isSuperAdmin = !user?.targetDepartments || user.targetDepartments.length === 0 || user.permissions?.includes('all');
    const { theme } = useTheme();
    const [users, setUsers] = useState([]);
    const [masterStudents, setMasterStudents] = useState([]);
    const [pucStudents, setPucStudents] = useState([]);
    const [activeSection, setActiveSection] = useState('BTECH');
    const [pucAuthUsers, setPucAuthUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMasterLoading, setIsMasterLoading] = useState(true);
    const [isPucLoading, setIsPucLoading] = useState(true);
    const [isPucAuthLoading, setIsPucAuthLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('');
    const [selectedMailStatus, setSelectedMailStatus] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewUser, setViewUser] = useState(null);
    const [editUser, setEditUser] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
    const [userToDelete, setUserToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [animatingOutId, setAnimatingOutId] = useState(null);
    const toastTimerRef = useRef(null);

    const formatStudentId = (id) => {
        if (!id) return 'N/A';
        return id.replace(/^RGUKT-/i, '');
    };

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        role: 'student'
    });

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleOpenAddModal = (role) => {
        setFormData(prev => ({ ...prev, role }));
        setIsModalOpen(true);
        setIsMenuOpen(false);
    };

    const showToast = (message, type = 'success') => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast({ visible: true, message, type });
        toastTimerRef.current = setTimeout(() => {
            setToast(prev => ({ ...prev, visible: false }));
            // Clear message after animation finishes
            setTimeout(() => {
                setToast(prev => ({ ...prev, message: '' }));
            }, 500);
        }, 3000);
    };

    // Clean up timer on unmount
    useEffect(() => {
        return () => {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        };
    }, []);

    useEffect(() => {
        // Load from cache first
        const cachedUsers = sessionStorage.getItem('admin_users_cache');
        if (cachedUsers) {
            setUsers(JSON.parse(cachedUsers));
            setIsLoading(false);
        }

        let isInitialLoad = true;
        const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(data);
            sessionStorage.setItem('admin_users_cache', JSON.stringify(data));

            if (isInitialLoad) {
                setTimeout(() => {
                    setIsLoading(false);
                    isInitialLoad = false;
                }, 1000); // Reduced delay for better feel
            } else {
                setIsLoading(false);
            }
        }, (error) => {
            console.error("Error fetching users:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        // Load from cache first
        const cachedMaster = sessionStorage.getItem('admin_master_students_cache');
        if (cachedMaster) {
            setMasterStudents(JSON.parse(cachedMaster));
            setIsMasterLoading(false);
        }

        const unsubscribe = onSnapshot(collection(db, 'students_master'), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMasterStudents(data);
            sessionStorage.setItem('admin_master_students_cache', JSON.stringify(data));
            setIsMasterLoading(false);
        }, (error) => {
            console.error("Error fetching master students:", error);
            setIsMasterLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        // Load from cache first
        const cachedPuc = sessionStorage.getItem('admin_puc_students_cache');
        if (cachedPuc) {
            setPucStudents(JSON.parse(cachedPuc));
            setIsPucLoading(false);
        }

        const unsubscribe = onSnapshot(collection(pucDb, 'puc_students'), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPucStudents(data);
            sessionStorage.setItem('admin_puc_students_cache', JSON.stringify(data));
            setIsPucLoading(false);
        }, (error) => {
            console.error("Error fetching puc students:", error);
            setIsPucLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const cachedPucUsers = sessionStorage.getItem('admin_puc_users_cache');
        if (cachedPucUsers) {
            setPucAuthUsers(JSON.parse(cachedPucUsers));
            setIsPucAuthLoading(false);
        }

        let isInitialLoad = true;
        const unsubscribe = onSnapshot(collection(pucDb, 'users'), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPucAuthUsers(data);
            sessionStorage.setItem('admin_puc_users_cache', JSON.stringify(data));

            if (isInitialLoad) {
                setTimeout(() => {
                    setIsPucAuthLoading(false);
                    isInitialLoad = false;
                }, 1000);
            } else {
                setIsPucAuthLoading(false);
            }
        }, (error) => {
            console.error("Error fetching puc users:", error);
            setIsPucAuthLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // fetchUsers function is no longer needed as onSnapshot handles it, 
    // but we might keep it if other functions call it. 
    // Actually, other functions call fetchUsers(). We should remove those calls 
    // or make fetchUsers a no-op / rely on the listener.
    // Let's just remove the explicit fetchUsers calls in handleAddUser functions 
    // since the listener will auto-update.

    const handleAddUser = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            let autoId = '';
            if (formData.role === 'faculty') {
                const randomNum = Math.floor(1000 + Math.random() * 9000);
                autoId = `FAC-${randomNum}`;
            }

            const newUser = {
                fullName: formData.fullName,
                email: formData.email,
                role: formData.role,
                ...(autoId && { studentId: autoId }),
                createdAt: new Date().toISOString(),
                status: 'active'
            };

            await addDoc(collection(db, 'users'), newUser);
            showToast("User record created! Note: Auth entry still needed.");

            setIsModalOpen(false);
            setFormData({ fullName: '', email: '', password: '', role: 'student' });
        } catch (error) {
            console.error("Error adding user:", error);
            showToast("Failed to add user record.", "error");
        } finally {
            setIsSaving(false);
        }
    };
    const handleOpenEdit = (userToEdit) => {
        setEditUser({
            ...userToEdit,
            targetDepartments: userToEdit.targetDepartments || []
        });
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;

        if (userToDelete.id === user?.uid) {
            showToast("You cannot delete your own admin account.", "error");
            setUserToDelete(null);
            return;
        }

        try {
            setIsDeleting(true);
            
            // Delete profile image if exists
            if (userToDelete.avatar || userToDelete.photo) {
                const photoUrl = userToDelete.avatar || userToDelete.photo;
                await deleteProfileImage(photoUrl);
            }

            let collectionName = 'users';
            if (activeTab === 'master') collectionName = 'students_master';
            if (activeTab === 'puc') collectionName = 'puc_students';
            
            const targetDb = activeSection === 'BTECH' ? db : pucDb;
            
            // If deleting an admin, completely wipe their Firebase Authentication account via our Cloud Function
            if (activeTab === 'admin' && collectionName === 'users') {
                try {
                    const deleteAdminFn = httpsCallable(functions, 'deleteAdminUser');
                    await deleteAdminFn({ uid: userToDelete.id });
                } catch (fnError) {
                    console.error("Cloud Function failed:", fnError);
                    showToast("Warning: Could not wipe Auth account. Is the Cloud Function deployed?", "error");
                }
            }

            await deleteDoc(doc(targetDb, collectionName, userToDelete.id));
            
            showToast("User record deleted successfully.");
            setIsDeleting(false);
            setUserToDelete(null);
            
            // Trigger row animation
            setAnimatingOutId(userToDelete.id);

            // Wait for animation to finish before removing from local state
            setTimeout(() => {
                setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
                setAnimatingOutId(null);
                showToast("User successfully deleted", "success");
            }, 500); // Matches rowExit animation duration

        } catch (error) {
            console.error("Error deleting user:", error);
            showToast("Failed to delete user", "error");
            setIsDeleting(false);
            setUserToDelete(null);
        }
    };

    const handleToggleMailStatus = async (userItem) => {
        try {
            const newStatus = !userItem.mailSent;
            let collectionName = 'users';
            if (activeTab === 'master') collectionName = 'students_master';
            if (activeTab === 'puc') collectionName = 'puc_students';
            
            const targetDb = activeSection === 'BTECH' ? db : pucDb;
            
            await updateDoc(doc(targetDb, collectionName, userItem.id), {
                mailSent: newStatus
            });

            if (userItem.email) {
                await navigator.clipboard.writeText(userItem.email);
                showToast(`Status updated to ${newStatus ? 'Sent' : 'Not Sent'} & Email copied!`, 'success');
            } else {
                showToast(`Mail status updated to ${newStatus ? 'Sent' : 'Not Sent'}`, 'success');
            }
        } catch (error) {
            console.error("Error updating mail status:", error);
            showToast("Failed to update mail status", 'error');
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();

        // Safety check for role changes
        if (editUser.id === user?.uid && editUser.role !== 'admin') {
            const confirmed = window.confirm("WARNING: You are about to change your own role to 'Student'. This will IMMEDIATELY remove your access to the Admin Panel. are you sure you want to proceed?");
            if (!confirmed) return;
        }

        setIsSaving(true);
        try {
            const targetDb = activeSection === 'BTECH' ? db : pucDb;
            const userRef = doc(targetDb, 'users', editUser.id);
            const studentIdToSave = editUser.studentId ? editUser.studentId.replace(/^RGUKT-/i, '') : '';

            await updateDoc(userRef, {
                fullName: editUser.fullName,
                email: editUser.email,
                role: editUser.role,
                phone: editUser.phone || '',
                bio: editUser.bio || '',
                department: editUser.department || '',
                designation: editUser.designation || '',
                studentId: studentIdToSave,
                language: editUser.language || 'English',
                timezone: editUser.timezone || 'IST (UTC+05:30)',
                currentClass: formatClassID(editUser.currentClass),
                rcId: editUser.rcId || '',
                status: editUser.status || 'active',
                ...(editUser.role === 'admin' && { 
                    permissions: editUser.permissions || [],
                    targetDepartments: editUser.targetDepartments || [] 
                })
            });

            showToast("User updated successfully!");
            setEditUser(null);

            // If user updated their own role, they might need to be redirected
            if (editUser.id === user?.uid && editUser.role !== 'admin') {
                window.location.reload(); // Force reload to trigger role-based route protection
            }
        } catch (error) {
            console.error("Error updating user:", error);
            showToast("Failed to update user.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDownload = () => {
        if (filteredData.length === 0) {
            showToast("No data to download", "error");
            return;
        }

        const headers = activeTab === 'master'
            ? ['Student ID', 'Name', 'Class/Section', 'Email']
            : ['Full Name', 'Email', 'Role', 'Student ID', 'Department', 'Status'];

        const csvContent = [
            headers.join(','),
            ...filteredData.map(item => {
                if (activeTab === 'master') {
                    return [
                        formatStudentId(item.id),
                        `"${item.name || ''}"`,
                        `"${item.classSection || ''}"`,
                        item.email || ''
                    ].join(',');
                } else {
                    return [
                        `"${item.fullName || ''}"`,
                        item.email || '',
                        item.role || '',
                        formatStudentId(item.studentId),
                        `"${getUserBranch(item) || ''}"`,
                        item.status || 'active'
                    ].join(',');
                }
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `students_${activeTab}_list_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("Download started!");
    };

    useEffect(() => {
        // Window resize listener removed as mobile access is now allowed
    }, []);

    // Mobile access blocker removed

    const [activeTab, setActiveTab] = useState('student');

    const normalizeDept = (rawBranch) => {
        if (!rawBranch) return '';
        const raw = rawBranch.toUpperCase();
        if (/CSE\(AI&ML\)|CSC \(AI&ML\)|AIML/i.test(raw)) return 'AIML';
        if (/ECE|E\.C\.E|ELECTRONICS/i.test(raw)) return 'ECE';
        if (/CSE|C\.S\.E|COMPUTER/i.test(raw)) return 'CSE';
        if (/CIVIL/i.test(raw)) return 'CIVIL';
        if (/MECH|M\.E/i.test(raw)) return 'MECH';
        if (/MME|METALLURGY|MATERIAL/i.test(raw)) return 'MME';
        if (/CHEM/i.test(raw)) return 'CHEM';
        if (/EEE|E\.E\.E|ELECTRICAL/i.test(raw)) return 'EEE';
        return rawBranch;
    };

    const getUserBranch = (user) => {
        if (user.department) return user.department;
        if (user.branch) return user.branch;
        
        if (user.studentId) {
            const id = formatStudentId(user.studentId);
            const currentMaster = activeSection === 'BTECH' ? masterStudents : pucStudents;
            const masterRecord = currentMaster.find(m => m.id === id);
            if (masterRecord) {
                return masterRecord.department || masterRecord.branch || '';
            }
        }
        return '';
    };

    const getFilteredData = () => {
        let data = [];
        if (activeTab === 'puc' && activeSection === 'PUC') {
            data = pucStudents.filter(s =>
                s.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.classSection?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            if (selectedClass) data = data.filter(s => s.classSection === selectedClass);
            if (selectedBranch) data = data.filter(s => normalizeDept(s.branch) === selectedBranch);
            if (selectedMailStatus) data = data.filter(s => selectedMailStatus === 'sent' ? s.mailSent === true : s.mailSent !== true);
            return data;
        }

        if (activeTab === 'master' && activeSection === 'BTECH') {
            data = masterStudents.filter(s =>
                s.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.classSection?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            if (selectedClass) data = data.filter(s => s.classSection === selectedClass);
            if (selectedBranch) data = data.filter(s => normalizeDept(s.branch) === selectedBranch);
            if (selectedMailStatus) data = data.filter(s => selectedMailStatus === 'sent' ? s.mailSent === true : s.mailSent !== true);
            return data;
        }

        const currentUsers = activeSection === 'BTECH' ? users : pucAuthUsers;
        data = currentUsers.filter(user =>
            user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.studentId?.toLowerCase().includes(searchTerm.toLowerCase())
        ).filter(user => {
            if (activeTab === 'student') return user.role === 'student' || !user.role;
            if (activeTab === 'faculty') return user.role === 'faculty';
            if (activeTab === 'admin') return user.role === 'admin';
            return false;
        });

        if (selectedClass) data = data.filter(user => user.currentClass === selectedClass);
        if (selectedBranch) data = data.filter(user => normalizeDept(getUserBranch(user)) === selectedBranch);
        if (selectedMailStatus) data = data.filter(user => selectedMailStatus === 'sent' ? user.mailSent === true : user.mailSent !== true);
        
        return data;
    };

    const filteredData = getFilteredData();

    const currentUsers = activeSection === 'BTECH' ? users : pucAuthUsers;
    const currentMaster = activeSection === 'BTECH' ? masterStudents : pucStudents;

    const availableClasses = Array.from(new Set([
        ...currentUsers.map(u => u.currentClass),
        ...currentMaster.map(m => m.classSection)
    ])).filter(Boolean).sort();
    
    const availableBranches = Array.from(new Set([
        ...currentUsers.map(u => normalizeDept(getUserBranch(u))),
        ...currentMaster.map(m => normalizeDept(m.branch))
    ])).filter(Boolean).sort();
    
    const branchFullNames = {
        'AIML': 'Computer Science & Engineering (AI & ML)',
        'CSE': 'Computer Science & Engineering',
        'ECE': 'Electronics & Communication Engineering',
        'EEE': 'Electrical & Electronics Engineering',
        'CIVIL': 'Civil Engineering',
        'MECH': 'Mechanical Engineering',
        'MME': 'Metallurgical & Materials Engineering',
        'CHEM': 'Chemical Engineering'
    };

    return (
        <div className="admin-container">
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', marginBottom: '1rem', justifyContent: 'center' }}>
                <button
                    className={activeSection === 'BTECH' ? 'btn-primary' : 'btn-secondary'}
                    onClick={() => { setActiveSection('BTECH'); setActiveTab('student'); }}
                    style={{ 
                        padding: '0.75rem 2rem', 
                        fontSize: '1.05rem', 
                        fontWeight: '600', 
                        borderRadius: '8px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px'
                    }}
                >
                    <Database size={18} />
                    BTECH Database
                </button>
                <button
                    className={activeSection === 'PUC' ? 'btn-primary' : 'btn-secondary'}
                    onClick={() => { setActiveSection('PUC'); setActiveTab('student'); }}
                    style={{ 
                        padding: '0.75rem 2rem', 
                        fontSize: '1.05rem', 
                        fontWeight: '600', 
                        borderRadius: '8px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px'
                    }}
                >
                    <Database size={18} />
                    PUC Database
                </button>
            </div>
            
            {activeSection === 'BTECH' && <BulkUpdater />}
            {activeSection === 'PUC' && <PUCBulkUpdater />}
            <div className="page-header-v2">
                <div className="header-accent-bar"></div>
                <div className="header-content-v2">
                    <h1 className="page-title-v2">{activeSection === 'BTECH' ? 'BTECH User Management' : 'PUC User Management'}</h1>
                    <p className="page-subtitle-v2">Manage and monitor {activeSection === 'BTECH' ? 'BTECH' : 'PUC'} student and staff accounts.</p>
                </div>
                <div className="header-action-btn" ref={menuRef}>
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="btn-labeled primary"
                        title="Add New..."
                    >
                        <MoreVertical size={18} />
                        <span>Add New Account</span>
                    </button>
                    {isMenuOpen && (
                        <div
                            className="admin-action-dropdown"
                            style={{
                                background: theme === 'dark' ? '#1e293b' : 'var(--color-surface)',
                                borderColor: theme === 'dark' ? '#334155' : 'var(--color-border)'
                            }}
                        >
                            <button
                                onClick={() => handleOpenAddModal('student')}
                                className="admin-action-item"
                                style={{
                                    color: theme === 'dark' ? '#f8fafc' : 'inherit',
                                    background: theme === 'dark' ? 'transparent' : 'inherit'
                                }}
                            >
                                <span className="action-dot student"></span> Add Student
                            </button>
                            <button
                                onClick={() => navigate('/admin/faculty/new')}
                                className="admin-action-item"
                                style={{
                                    color: theme === 'dark' ? '#f8fafc' : 'inherit',
                                    background: theme === 'dark' ? 'transparent' : 'inherit'
                                }}
                            >
                                <span className="action-dot faculty"></span> Add Faculty
                            </button>
                            <button
                                onClick={() => navigate('/admin/new')}
                                className="admin-action-item"
                                style={{
                                    color: theme === 'dark' ? '#f8fafc' : 'inherit',
                                    background: theme === 'dark' ? 'transparent' : 'inherit'
                                }}
                            >
                                <span className="action-dot admin"></span> Add Admin
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="admin-tabs">
                <button
                    className={`admin-tab ${activeTab === 'student' ? 'active' : ''}`}
                    onClick={() => setActiveTab('student')}
                >
                    Students
                    <span className="count">{(activeSection === 'BTECH' ? users : pucAuthUsers).filter(u => u.role === 'student' || !u.role).length}</span>
                </button>
                <button
                    className={`admin-tab ${activeTab === 'faculty' ? 'active' : ''}`}
                    onClick={() => setActiveTab('faculty')}
                >
                    Faculty
                    <span className="count">{(activeSection === 'BTECH' ? users : pucAuthUsers).filter(u => u.role === 'faculty').length}</span>
                </button>
                <button
                    className={`admin-tab ${activeTab === 'admin' ? 'active' : ''}`}
                    onClick={() => setActiveTab('admin')}
                >
                    Administrators
                    <span className="count">{(activeSection === 'BTECH' ? users : pucAuthUsers).filter(u => u.role === 'admin').length}</span>
                </button>
                {activeSection === 'BTECH' && (
                    <button
                        className={`admin-tab ${activeTab === 'master' ? 'active' : ''}`}
                        onClick={() => setActiveTab('master')}
                    >
                        Master Database
                        <span className="count">{masterStudents.length}</span>
                    </button>
                )}
                {activeSection === 'PUC' && (
                    <button
                        className={`admin-tab ${activeTab === 'puc' ? 'active' : ''}`}
                        onClick={() => setActiveTab('puc')}
                    >
                        PUC Database
                        <span className="count">{pucStudents.length}</span>
                    </button>
                )}
            </div>

            <div className="admin-filters-container">
                <div className="admin-search-wrapper">
                    <Search className="admin-search-icon" size={20} />
                    <input
                        type="text"
                        placeholder="Search students by name, email or ID..."
                        className="form-input admin-search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="admin-filter-wrapper">
                    <Filter className="admin-filter-icon" size={20} />
                    <select
                        className="form-select admin-filter-select"
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                    >
                        <option value="">All Branches</option>
{availableBranches.map(branch => (
                            <option key={branch} value={branch} className="select-option">{branchFullNames[branch] || branch}</option>
                        ))}
                    </select>
                </div>
                <div className="admin-filter-wrapper">
                    <Filter className="admin-filter-icon" size={20} />
                    <select
                        className="form-select admin-filter-select"
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                    >
                        <option value="">All Classes</option>
                        {availableClasses.map(cls => (
                            <option key={cls} value={cls} className="select-option">{cls}</option>
                        ))}
                    </select>
                </div>
                <div className="admin-filter-wrapper">
                    <Mail className="admin-filter-icon" size={20} />
                    <select
                        className="form-select admin-filter-select"
                        value={selectedMailStatus}
                        onChange={(e) => setSelectedMailStatus(e.target.value)}
                    >
                        <option value="">All Mail Status</option>
                        <option value="sent">Mail Sent</option>
                        <option value="not_sent">Mail Not Sent</option>
                    </select>
                </div>
                <button
                    className="btn-filter admin-download-btn"
                    title="Download List"
                    onClick={handleDownload}
                >
                    <Download size={20} />
                </button>
            </div>

            <div className="admin-table-container">
                {(activeTab === 'master' ? isMasterLoading : activeTab === 'puc' ? isPucLoading : (activeSection === 'BTECH' ? isLoading : isPucAuthLoading)) ? (
                    <LoadingTransition message="User Database Loading" persistent />
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                {(activeTab === 'master' || activeTab === 'puc') && <th>College ID</th>}
                                <th>{(activeTab === 'master' || activeTab === 'puc') ? 'Name' : (activeTab === 'student' ? 'Student' : (activeTab === 'faculty' ? 'Faculty Member' : 'Administrator'))}</th>
                                <th>{(activeTab === 'master' || activeTab === 'puc') ? 'Class' : (activeTab === 'student' ? 'ID & Dept' : 'Role')}</th>
                                <th>RC ID</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.length > 0 ? (
                                filteredData.map((item, index) => (
                                    <tr key={item.id || index}>
                                        {(activeTab === 'master' || activeTab === 'puc') && (
                                            <td>
                                                <div className="font-medium text-sm">{formatStudentId(item.studentId || item.id)}</div>
                                            </td>
                                        )}
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={item.avatar || `https://ui-avatars.com/api/?name=${item.fullName || item.name || 'User'}&background=random`}
                                                    className="user-avatar"
                                                    alt=""
                                                />
                                                <div>
                                                    <div className="font-semibold">{item.fullName || item.name || 'Unknown User'}</div>
                                                    <div className="text-xs text-[var(--color-text-muted)]">{item.email || item.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            {activeTab === 'student' ? (
                                                <>
                                                    <div className="font-medium text-sm">{formatStudentId(item.studentId)}</div>
                                                    <div className="text-xs text-[var(--color-text-muted)]">{getUserBranch(item) || 'Not Assigned'}</div>
                                                </>
                                            ) : (activeTab === 'master' || activeTab === 'puc') ? (
                                                <>
                                                    <div className="font-medium text-sm">{item.classSection || 'No Class'}</div>
                                                    <div className="text-xs text-[var(--color-text-muted)]">{getUserBranch(item) || 'Not Assigned'}</div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="font-medium text-sm capitalize">
                                                        {item.role === 'faculty' 
                                                            ? (item.designation ? `${item.role} - ${item.designation}` : item.role) 
                                                            : (item.role === 'admin' 
                                                                ? ((item.permissions?.includes('all') || item.email === 'admin@rguktconnect.ac.in') ? 'Super Admin' : 'Semi Admin') 
                                                                : item.role)}
                                                    </div>
                                                    <div className="text-xs text-[var(--color-text-muted)]">{item.role === 'faculty' && item.studentId ? `${item.studentId} • ${item.email}` : (item.role === 'admin' ? item.email : item.email)}</div>
                                                </>
                                            )}
                                        </td>
                                        <td>
                                            <div className="flex flex-col gap-1">
                                                {item.rcId ? (
                                                    <span className="text-xs font-mono font-bold text-primary-600 bg-primary-100/50 px-2 py-0.5 rounded border border-primary-200 w-fit">
                                                        {item.rcId}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-[var(--color-text-muted)] italic">Not Set</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${item.status === 'inactive' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                        {(item.status || 'active').toUpperCase()}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="action-buttons">
                                                        {isSuperAdmin && item.role === 'admin' && item.id !== user.uid && (
                                                            <button
                                                                className="action-btn"
                                                                title="Direct Login as this Admin"
                                                                onClick={async () => {
                                                                    if (window.confirm(`Are you sure you want to log in as ${item.fullName}? Your current super admin session will be suspended.`)) {
                                                                        try {
                                                                            await forceLoginAsUser(item.id);
                                                                            navigate('/admin/dashboard');
                                                                        } catch(e) {
                                                                            alert("Failed to spoof login: " + e.message);
                                                                        }
                                                                    }
                                                                }}
                                                                style={{ color: 'var(--color-primary)' }}
                                                            >
                                                                <LogIn size={18} />
                                                            </button>
                                                        )}
                                                        <button
                                                            className="action-btn view"
                                                            title="View Details"
                                                            onClick={() => setViewUser(item)}
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                        <button
                                                            className="action-btn"
                                                            title={item.mailSent ? "Mail Sent" : "Mail Not Sent"}
                                                            onClick={() => handleToggleMailStatus(item)}
                                                            style={{ color: item.mailSent ? 'var(--color-success)' : 'var(--color-text-muted)' }}
                                                        >
                                                            {item.mailSent ? <MailCheck size={18} /> : <Mail size={18} />}
                                                        </button>
                                                        <button
                                                            className="action-btn edit"
                                                            title="Edit User"
                                                            onClick={() => handleOpenEdit(item)}
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button
                                                            className="action-btn delete"
                                                            title="Delete User"
                                                            onClick={() => setUserToDelete(item)}
                                                            style={{ color: 'var(--color-danger)' }}
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
                                        No logins yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Add User Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Add New Student</h2>
                            <button onClick={() => setIsModalOpen(false)} className="btn-ghost">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleAddUser} noValidate>
                            <div className="admin-form-group">
                                <label className="admin-form-label">Full Name</label>
                                <input
                                    type="text"
                                    className="admin-form-input"
                                    required
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                />
                            </div>
                            <div className="admin-form-group">
                                <label className="admin-form-label">Email Address</label>
                                <input
                                    type="email"
                                    className="admin-form-input"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="admin-form-group">
                                <label className="admin-form-label">Role</label>
                                <select
                                    className="admin-form-input"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="student">Student</option>
                                    <option value="faculty">Faculty</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="mt-8 flex gap-3">
                                <button
                                    type="button"
                                    className="flex-1 btn-secondary"
                                    onClick={() => setIsModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 btn-primary"
                                    disabled={isSaving}
                                >
                                    {isSaving ? 'Creating...' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View User Modal */}
            {viewUser && createPortal(
                viewUser.role === 'admin' ? (
                    <AdminAppointmentLetter 
                        adminData={{
                            fullName: viewUser.fullName,
                            email: viewUser.email,
                            adminId: viewUser.adminId || '',
                            password: viewUser.password || '',
                            departments: viewUser.targetDepartments || [],
                            campus: viewUser.campus || 'RGUKT RK Valley',
                            date: viewUser.createdAt ? new Date(viewUser.createdAt).toLocaleDateString() : new Date().toLocaleDateString()
                        }}
                        onClose={() => setViewUser(null)}
                    />
                ) : (
                <div className="modal-overlay" onClick={() => setViewUser(null)}>
                    <div className="modal-content full-screen max-w-4xl user-details-modal" onClick={e => e.stopPropagation()}>
                        <div className="user-details-header">
                            <h2 className="user-details-title">Comprehensive User Details</h2>
                            <button onClick={() => setViewUser(null)} className="modal-close-btn">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="user-details-grid custom-scrollbar">
                            {/* Left Column: Profile Card & Bio */}
                            <div className="user-card-col">
                                <div className="profile-card-vibrant">
                                    <div className="profile-avatar-wrapper">
                                        <img
                                            src={viewUser.avatar || `https://ui-avatars.com/api/?name=${viewUser.fullName}&background=random`}
                                            className="profile-avatar-img"
                                            alt="Profile"
                                        />
                                    </div>
                                    <h3 className="profile-name-vibrant">{viewUser.fullName}</h3>
                                    <p className="profile-email-vibrant">{viewUser.email}</p>
                                    <div className="profile-tags">
                                        <span className={`tag-vibrant ${viewUser.role === 'admin' ? 'tag-role' : viewUser.role === 'faculty' ? 'tag-role' : 'tag-role'}`}>
                                            {viewUser.role}
                                        </span>
                                        <span className={`tag-vibrant ${viewUser.status === 'inactive' ? 'tag-status-inactive' : 'tag-status'}`}>
                                            {viewUser.status || 'ACTIVE'}
                                        </span>
                                    </div>
                                </div>

                                <div className="user-card-col" style={{ gap: '16px' }}>
                                    <div className="detail-card-vibrant">
                                        <div className="detail-card-header indigo">
                                            <AlertCircle size={16} /> Bio
                                        </div>
                                        <div className="bio-content-vibrant">
                                            {viewUser.bio || <span className="italic opacity-60">No bio provided.</span>}
                                        </div>
                                    </div>
                                    
                                    <div className="info-grid-2">
                                        <div className="info-box-vibrant orange">
                                            <span className="info-label-vibrant orange">Phone</span>
                                            <span className="info-value-vibrant">{viewUser.phone ? `+91 ${viewUser.phone}` : 'N/A'}</span>
                                        </div>
                                        <div className="info-box-vibrant emerald">
                                            <span className="info-label-vibrant emerald">Joined</span>
                                            <span className="info-value-vibrant">{viewUser.createdAt ? new Date(viewUser.createdAt).toLocaleString() : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Settings & Academic */}
                            <div className="user-card-col">
                                <div className="detail-card-vibrant">
                                    <h4 className="detail-card-header blue">
                                        <Monitor size={16} /> Academic Details
                                    </h4>
                                    <div className="info-grid-2">
                                        <div className="info-box-vibrant blue">
                                            <span className="info-label-vibrant blue">Department</span>
                                            <span className="info-value-vibrant">{getUserBranch(viewUser) || 'Not Assigned'}</span>
                                        </div>
                                        <div className="info-box-vibrant blue">
                                            <span className="info-label-vibrant blue">Class / Section</span>
                                            <span className="info-value-vibrant">{viewUser.currentClass || 'N/A'}</span>
                                        </div>
                                        <div className="info-box-vibrant indigo">
                                            <span className="info-label-vibrant indigo">ID Number</span>
                                            <span className="info-value-vibrant mono">{formatStudentId(viewUser.studentId)}</span>
                                        </div>
                                        {viewUser.role === 'faculty' && viewUser.designation && (
                                            <div className="info-box-vibrant purple">
                                                <span className="info-label-vibrant purple">Designation</span>
                                                <span className="info-value-vibrant">{viewUser.designation}</span>
                                            </div>
                                        )}
                                        {viewUser.rcId && (
                                            <div className="info-box-vibrant fuchsia">
                                                <span className="info-label-vibrant fuchsia">RC ID</span>
                                                <span className="info-value-vibrant mono">{viewUser.rcId}</span>
                                            </div>
                                        )}
                                        {viewUser.role === 'admin' && viewUser.pin && (
                                            <div className="info-box-vibrant rose">
                                                <span className="info-label-vibrant rose">Admin PIN</span>
                                                <span className="info-value-vibrant mono">{viewUser.pin}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="info-grid-2">
                                    <div className="detail-card-vibrant">
                                        <h4 className="detail-card-header teal">Preferences</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div className="info-box-vibrant teal">
                                                <span className="info-label-vibrant teal">Language</span>
                                                <span className="info-value-vibrant">{viewUser.language || 'English'}</span>
                                            </div>
                                            <div className="info-box-vibrant teal">
                                                <span className="info-label-vibrant teal">Timezone</span>
                                                <span className="info-value-vibrant">{viewUser.timezone || 'IST'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="detail-card-vibrant" style={{ borderColor: 'rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)' }}>
                                        <h4 className="detail-card-header red" style={{ borderBottomColor: 'rgba(239, 68, 68, 0.2)' }}>
                                            <AlertTriangle size={16} /> Recovery
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div className="info-box-vibrant red" style={{ background: 'var(--color-surface)' }}>
                                                <span className="info-label-vibrant red">User Password</span>
                                                <code className="info-value-vibrant mono" style={{ color: '#ef4444', userSelect: 'all' }}>
                                                    {viewUser.password || 'Not Stored'}
                                                </code>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer-vibrant">
                            <button
                                className="btn-primary"
                                onClick={() => setViewUser(null)}
                            >
                                <Check size={18} /> Done
                            </button>
                        </div>
                    </div>
                </div>
                ),
                document.body
            )}

            {/* Edit User Modal */}
            {editUser && (
                <div className="modal-overlay">
                    <div className="modal-content wide">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Edit User Settings</h2>
                            <button onClick={() => setEditUser(null)} className="btn-ghost hover:text-red-500">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateUser} className="modal-grid" noValidate>
                            {/* Left Column: Basic Info */}
                            <div className="space-y-4">
                                <div className="admin-form-group">
                                    <label className="admin-form-label">Full Name</label>
                                    <input
                                        type="text"
                                        className="admin-form-input"
                                        required
                                        value={editUser.fullName}
                                        onChange={(e) => setEditUser({ ...editUser, fullName: e.target.value })}
                                    />
                                </div>
                                <div className="admin-form-group">
                                    <label className="admin-form-label">Email Address</label>
                                    <input
                                        type="email"
                                        className="admin-form-input"
                                        required
                                        value={editUser.email}
                                        onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="admin-form-group">
                                        <label className="admin-form-label">Role</label>
                                        <select
                                            className="admin-form-input"
                                            value={editUser.role}
                                            onChange={(e) => setEditUser({ 
                                                ...editUser, 
                                                role: e.target.value,
                                                ...(e.target.value === 'admin' && !editUser.permissions && { permissions: ['all'] })
                                            })}
                                        >
                                            <option value="student">Student</option>
                                            <option value="faculty">Faculty</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <div className="admin-form-group">
                                        <label className="admin-form-label">Account Status</label>
                                        <select
                                            className="admin-form-input"
                                            value={editUser.status || 'active'}
                                            onChange={(e) => setEditUser({ ...editUser, status: e.target.value })}
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>

                                {editUser.role === 'admin' && (
                                    <div className="admin-form-group" style={{ marginTop: '1rem' }}>
                                        <label className="admin-form-label">Target Departments (Max 3)</label>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                                            Restrict this admin to specific departments. Leave empty for all.
                                        </p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {['CSE(AI&ML)', 'CSE', 'ECE', 'EEE', 'CE', 'ME', 'MME', 'CHE'].map(dept => {
                                                const isSelected = editUser.targetDepartments?.includes(dept);
                                                const isDisabled = !isSelected && (editUser.targetDepartments?.length >= 3);
                                                return (
                                                    <div 
                                                        key={dept}
                                                        onClick={() => {
                                                            if (isDisabled) return;
                                                            const current = editUser.targetDepartments || [];
                                                            setEditUser({
                                                                ...editUser,
                                                                targetDepartments: isSelected 
                                                                    ? current.filter(d => d !== dept)
                                                                    : [...current, dept]
                                                            });
                                                        }}
                                                        style={{
                                                            padding: '0.35rem 0.75rem',
                                                            borderRadius: '1rem',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '600',
                                                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                            border: `1px solid ${isSelected ? 'var(--color-brand, #6366f1)' : 'var(--color-border)'}`,
                                                            backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                                            color: isSelected ? 'var(--color-brand, #6366f1)' : (isDisabled ? 'var(--color-text-muted)' : 'inherit'),
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        {dept}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="admin-form-group">
                                    <label className="admin-form-label">Bio (Short summary)</label>
                                    <textarea
                                        className="admin-form-input admin-form-textarea"
                                        value={editUser.bio || ''}
                                        onChange={(e) => setEditUser({ ...editUser, bio: e.target.value })}
                                        placeholder="Max 300 characters..."
                                        maxLength={300}
                                    />
                                </div>
                            </div>

                            {/* Right Column: Profile & Settings */}
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="admin-form-group">
                                        <label className="admin-form-label">Student / Faculty ID</label>
                                        <input
                                            type="text"
                                            className="admin-form-input font-mono"
                                            value={editUser.studentId || ''}
                                            onChange={(e) => setEditUser({ ...editUser, studentId: e.target.value })}
                                        />
                                    </div>
                                    <div className="admin-form-group">
                                        <label className="admin-form-label">RGUKT Connect ID (RC ID)</label>
                                        <input
                                            type="text"
                                            className="admin-form-input font-mono text-primary-600 font-bold"
                                            value={editUser.rcId || ''}
                                            onChange={(e) => setEditUser({ ...editUser, rcId: e.target.value })}
                                            placeholder="e.g. RC-XXXXXX"
                                        />
                                    </div>
                                    <div className="admin-form-group">
                                        <label className="admin-form-label">Phone (+91)</label>
                                        <input
                                            type="tel"
                                            className="admin-form-input"
                                            value={editUser.phone || ''}
                                            onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <CustomSelect
                                    label="Department / Current Level"
                                    value={editUser.department || ''}
                                    onChange={(val) => setEditUser({ ...editUser, department: val })}
                                    options={[
                                        { value: "", label: "Not Assigned" },
                                        { value: "PUC-1 Semester 1", label: "PUC-1 Semester 1" },
                                        { value: "PUC-1 Semester 2", label: "PUC-1 Semester 2" },
                                        { value: "PUC-2 Semester 1", label: "PUC-2 Semester 1" },
                                        { value: "PUC-2 Semester 2", label: "PUC-2 Semester 2" },
                                        { value: "Computer Science & Engineering", label: "Computer Science & Engineering" },
                                        { value: "Electronics & Communication", label: "Electronics & Communication" },
                                        { value: "Mechanical Engineering", label: "Mechanical Engineering" },
                                        { value: "Civil Engineering", label: "Civil Engineering" },
                                        { value: "Electrical Engineering", label: "Electrical Engineering" },
                                        { value: "Business Administration", label: "Business Administration" },
                                    ]}
                                />

                                {editUser.role === 'faculty' && (
                                    <div className="admin-form-group">
                                        <label className="admin-form-label">Faculty Designation</label>
                                        <input
                                            type="text"
                                            className="admin-form-input"
                                            value={editUser.designation || ''}
                                            onChange={(e) => setEditUser({ ...editUser, designation: e.target.value })}
                                            placeholder="e.g. Assistant Professor, HOD"
                                        />
                                    </div>
                                )}

                                {editUser.role === 'admin' && (
                                    <div className="admin-form-group">
                                        <label className="admin-form-label flex items-center justify-between">
                                            Admin Permissions
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 text-blue-600 rounded border-gray-300"
                                                    checked={(editUser.permissions || []).includes('all')}
                                                    onChange={(e) => {
                                                        setEditUser({ 
                                                            ...editUser, 
                                                            permissions: e.target.checked ? ['all'] : [] 
                                                        })
                                                    }}
                                                />
                                                <span className="text-sm font-semibold text-blue-600">Super Admin (All Access)</span>
                                            </label>
                                        </label>
                                        
                                        {!(editUser.permissions || []).includes('all') && (
                                            <div className="permissions-grid mt-3">
                                                {NAV_ITEMS.filter(item => item.adminOnly && item.id !== 'admin-dashboard').map(item => {
                                                    const isSelected = (editUser.permissions || []).includes(item.id);
                                                    return (
                                                        <label key={item.id} className={`permission-item ${isSelected ? 'selected' : ''}`}>
                                                            <input 
                                                                type="checkbox"
                                                                className="hidden-checkbox"
                                                                checked={isSelected}
                                                                onChange={(e) => {
                                                                    const perms = editUser.permissions || [];
                                                                    if (e.target.checked) {
                                                                        setEditUser({ ...editUser, permissions: [...perms, item.id] });
                                                                    } else {
                                                                        setEditUser({ ...editUser, permissions: perms.filter(p => p !== item.id) });
                                                                    }
                                                                }}
                                                            />
                                                            <div className="perm-item-icon">
                                                                <item.icon size={20} />
                                                            </div>
                                                            <div className="perm-item-details">
                                                                <span className="perm-name">{item.label}</span>
                                                            </div>
                                                            <div className="perm-checkbox-indicator">
                                                                <Check size={14} />
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="admin-form-group">
                                    <label className="admin-form-label">Specific Class / Section</label>
                                    <input
                                        type="text"
                                        className="admin-form-input"
                                        value={editUser.currentClass || ''}
                                        onChange={(e) => setEditUser({ ...editUser, currentClass: e.target.value })}
                                        placeholder="e.g. F-04, CSE-3"
                                    />
                                </div>

                                <h4 className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider mt-6 mb-2">Detailed Settings</h4>

                                <div className="setting-row">
                                    <div className="setting-info">
                                        <h4>Email Notifications</h4>
                                        <p>Send summary and alert emails</p>
                                    </div>
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            checked={editUser.emailNotifs}
                                            onChange={(e) => setEditUser({ ...editUser, emailNotifs: e.target.checked })}
                                        />
                                        <span className="slider"></span>
                                    </label>
                                </div>

                                <div className="setting-row">
                                    <div className="setting-info">
                                        <h4>Security Alerts</h4>
                                        <p>Notify on suspicious logins</p>
                                    </div>
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            checked={editUser.securityAlerts}
                                            onChange={(e) => setEditUser({ ...editUser, securityAlerts: e.target.checked })}
                                        />
                                        <span className="slider"></span>
                                    </label>
                                </div>

                                <div className="mt-6 flex gap-3 pt-4 border-t border-[var(--color-border)]">
                                    <button
                                        type="button"
                                        className="flex-1 btn-secondary"
                                        onClick={() => setEditUser(null)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-[2] btn-primary btn-success justify-center"
                                        disabled={isSaving}
                                    >
                                        {isSaving ? 'Saving Changes...' : 'Update User Settings'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* User Deletion Custom Alert */}
            {userToDelete && createPortal(
                <div className="alert-modal-overlay">
                    <div className="alert-modal-content">
                        <div className="alert-modal-header">
                            <div className="alert-modal-icon">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="alert-modal-title">Delete Account?</h3>
                            <p className="alert-modal-message">
                                Are you sure you want to delete <strong>{userToDelete.fullName}</strong>?
                                This action is permanent and cannot be undone.
                            </p>
                        </div>

                        <div className="alert-modal-actions">
                            <button
                                className="btn-secondary"
                                onClick={() => setUserToDelete(null)}
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-destructive"
                                onClick={handleDeleteUser}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <>
                                        <Trash2 size={18} className="animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={18} />
                                        Confirm Delete
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            , document.body)}

            {/* Toast Notification */}
            <div className={`toast-container`}>
                <div className={`toast ${toast.type} ${toast.visible ? 'visible' : ''}`}>
                    <div className="toast-icon">
                        {toast.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                    </div>
                    <div className="toast-content">
                        <h4>{toast.type === 'success' ? 'Success' : 'Error'}</h4>
                        <p>{toast.message}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
