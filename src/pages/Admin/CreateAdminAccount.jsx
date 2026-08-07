import { UserPlus, Shield, Check } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { createUserWithEmailAndPassword, updateProfile, getAuth } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { firebaseConfig } from '../../config/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { NAV_ITEMS } from '../../config/navigation';
import './CreateAdminAccount.css';

const CreateAdminAccount = () => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        adminId: ''
    });

    // We get all admin specific nav items from configuration
    const availablePermissions = NAV_ITEMS.filter(item => item.adminOnly && item.id !== 'admin-dashboard');

    const [selectedPermissions, setSelectedPermissions] = useState([]);
    const [isSuperAdmin, setIsSuperAdmin] = useState(true);

    const handlePermissionToggle = (id) => {
        setSelectedPermissions(prev => {
            if (prev.includes(id)) {
                return prev.filter(p => p !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        if (!formData.fullName || !formData.email || !formData.password) {
            setError("Please fill in all required fields.");
            return;
        }

        if (!isSuperAdmin && selectedPermissions.length === 0) {
            setError("Please select at least one permission for the semi-admin.");
            return;
        }

        setIsLoading(true);
        try {
            // 1. Initialize Secondary App to prevent logging out the current admin
            const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp" + Date.now());
            const secondaryAuth = getAuth(secondaryApp);

            // 2. Create auth user on secondary app
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
            const user = userCredential.user;

            // 3. Update profile
            await updateProfile(user, {
                displayName: formData.fullName
            });

            // 4. Sign out and delete secondary app
            await secondaryAuth.signOut();
            await deleteApp(secondaryApp);

            // 3. Save to Firestore
            const permissionsToSave = isSuperAdmin ? ['all'] : selectedPermissions;
            
            await setDoc(doc(db, 'users', user.uid), {
                fullName: formData.fullName,
                email: formData.email,
                role: 'admin',
                adminId: formData.adminId || '',
                permissions: permissionsToSave,
                createdAt: serverTimestamp(),
                createdBy: currentUser?.uid,
                status: 'active'
            });

            setSuccess(true);
            setFormData({ fullName: '', email: '', password: '', adminId: '' });
            setSelectedPermissions([]);
            setIsSuperAdmin(true);
            
            setTimeout(() => {
                navigate('/admin/users');
            }, 2000);
            
        } catch (err) {
            console.error("Error creating admin account:", err);
            // Translate Firebase Auth errors to readable messages
            if (err.code === 'auth/email-already-in-use') {
                setError("An account with this email already exists.");
            } else if (err.code === 'auth/weak-password') {
                setError("Password should be at least 6 characters.");
            } else {
                setError(err.message || "Failed to create admin account. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="admin-container create-admin-page">
            <div className="page-header-v2">
                <div className="header-accent-bar"></div>
                <div className="header-content-v2">

                    <h1 className="page-title-v2">Create Admin Account</h1>
                    <p className="page-subtitle-v2">Add a new administrator with specific access permissions.</p>
                </div>
            </div>

            <div className="create-admin-content">
                <form className="create-admin-form" onSubmit={handleSubmit}>
                    
                    {error && <div className="admin-alert error">{error}</div>}
                    {success && <div className="admin-alert success">Admin account created successfully! Redirecting...</div>}

                    <div className="form-section">
                        <h3 className="section-title">
                            <UserPlus size={18} />
                            Basic Information
                        </h3>
                        <div className="form-grid">
                            <div className="admin-form-group">
                                <label className="admin-form-label">Full Name *</label>
                                <input
                                    type="text"
                                    name="fullName"
                                    className="admin-form-input"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    placeholder="Enter full name"
                                    required
                                />
                            </div>
                            <div className="admin-form-group">
                                <label className="admin-form-label">Email Address *</label>
                                <input
                                    type="email"
                                    name="email"
                                    className="admin-form-input"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="admin@rgukt.ac.in"
                                    required
                                />
                            </div>
                            <div className="admin-form-group">
                                <label className="admin-form-label">Admin ID (Optional)</label>
                                <input
                                    type="text"
                                    name="adminId"
                                    className="admin-form-input"
                                    value={formData.adminId}
                                    onChange={handleChange}
                                    placeholder="e.g. ADM-001"
                                />
                            </div>
                            <div className="admin-form-group">
                                <label className="admin-form-label">Temporary Password *</label>
                                <input
                                    type="password"
                                    name="password"
                                    className="admin-form-input"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Set a strong password"
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3 className="section-title">
                            <Shield size={18} />
                            Access Permissions
                        </h3>
                        
                        <div className="permission-type-selector">
                            <label className={`perm-type-card ${isSuperAdmin ? 'active' : ''}`}>
                                <input 
                                    type="radio" 
                                    name="adminType"
                                    checked={isSuperAdmin}
                                    onChange={() => setIsSuperAdmin(true)}
                                    className="hidden-radio"
                                />
                                <div className="perm-card-content">
                                    <div className="perm-card-header">
                                        <div className="radio-circle"></div>
                                        <h4>Super Admin</h4>
                                    </div>
                                    <p>Has unrestricted access to all features and modules in the admin panel.</p>
                                </div>
                            </label>
                            
                            <label className={`perm-type-card ${!isSuperAdmin ? 'active' : ''}`}>
                                <input 
                                    type="radio" 
                                    name="adminType"
                                    checked={!isSuperAdmin}
                                    onChange={() => setIsSuperAdmin(false)}
                                    className="hidden-radio"
                                />
                                <div className="perm-card-content">
                                    <div className="perm-card-header">
                                        <div className="radio-circle"></div>
                                        <h4>Semi-Admin (Custom Access)</h4>
                                    </div>
                                    <p>Select specific modules this administrator is allowed to access.</p>
                                </div>
                            </label>
                        </div>

                        {!isSuperAdmin && (
                            <div className="permissions-grid">
                                {availablePermissions.map(item => (
                                    <label key={item.id} className={`permission-item ${selectedPermissions.includes(item.id) ? 'selected' : ''}`}>
                                        <input 
                                            type="checkbox"
                                            className="hidden-checkbox"
                                            checked={selectedPermissions.includes(item.id)}
                                            onChange={() => handlePermissionToggle(item.id)}
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
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="form-actions">
                        <button 
                            type="button" 
                            className="btn-secondary" 
                            onClick={() => navigate(-1)}
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="btn-primary" 
                            disabled={isLoading}
                        >
                            {isLoading ? 'Creating Account...' : 'Create Admin Account'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateAdminAccount;
