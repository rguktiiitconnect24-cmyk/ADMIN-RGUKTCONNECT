import { UserPlus, Shield, Check } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, pucDb } from '../../config/firebase';
import { createUserWithEmailAndPassword, updateProfile, getAuth } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { firebaseConfig } from '../../config/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { NAV_ITEMS } from '../../config/navigation';
import AdminAppointmentLetter from '../../components/Admin/AdminAppointmentLetter';
import './CreateAdminAccount.css';

const CreateAdminAccount = () => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [createdAdminData, setCreatedAdminData] = useState(null);
    
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        mobileNumber: '',
        password: '',
        adminId: '',
        adminIdCustomized: false
    });

    // We get all admin specific nav items from configuration
    const availablePermissions = NAV_ITEMS.filter(item => item.adminOnly && item.id !== 'admin-dashboard');

    const [selectedPermissions, setSelectedPermissions] = useState([]);
    const [selectedDepartments, setSelectedDepartments] = useState([]);
    const [isSuperAdmin, setIsSuperAdmin] = useState(true);
    const [adminScope, setAdminScope] = useState('BTECH');

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
        setFormData(prev => {
            const newData = { ...prev, [name]: value };
            
            // Auto-generate adminId if it hasn't been manually customized
            if (name === 'fullName' || name === 'email') {
                if (!prev.adminIdCustomized) {
                    const namePart = newData.fullName ? newData.fullName.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';
                    const emailPart = newData.email ? newData.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';
                    
                    if (namePart) {
                        newData.adminId = `ADM-${namePart}`;
                    } else if (emailPart) {
                        newData.adminId = `ADM-${emailPart.substring(0, 5)}`;
                    } else {
                        newData.adminId = '';
                    }
                }
            } else if (name === 'adminId') {
                // If user types manually, mark as customized to stop auto-generation
                newData.adminIdCustomized = true;
                // If they clear it entirely, reset customization so it can auto-generate again
                if (value.trim() === '') {
                    newData.adminIdCustomized = false;
                }
            }
            
            return newData;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        const cleanedEmail = formData.email?.trim();
        const cleanedName = formData.fullName?.trim();
        const cleanedAdminId = formData.adminId?.trim();
        const cleanedMobile = formData.mobileNumber?.trim();

        if (!cleanedName || !cleanedEmail || !cleanedMobile || !formData.password || !cleanedAdminId) {
            setError("Please fill in all required fields (Name, Email, Mobile Number, Password, Admin ID).");
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanedEmail)) {
            setError("Please enter a valid email address.");
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        if (!isSuperAdmin && selectedPermissions.length === 0) {
            setError("Please select at least one module access permission for the semi-admin.");
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setIsLoading(true);
        try {
            // 1. Initialize Secondary App to prevent logging out the current admin
            const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp" + Date.now());
            const secondaryAuth = getAuth(secondaryApp);

            // 2. Create auth user on secondary app
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, cleanedEmail, formData.password);
            const user = userCredential.user;

            // 3. Update profile
            await updateProfile(user, {
                displayName: cleanedName
            });

            // 4. Sign out and delete secondary app
            await secondaryAuth.signOut();
            await deleteApp(secondaryApp);

            // 3. Save to Firestore
            const permissionsToSave = isSuperAdmin ? ['all'] : selectedPermissions;
            let departmentsToSave = isSuperAdmin ? [] : [...selectedDepartments];
            if (!isSuperAdmin && adminScope === 'PUC' && !departmentsToSave.includes('PUC')) {
                departmentsToSave.push('PUC');
            }
            
            const targetDb = (!isSuperAdmin && adminScope === 'PUC') ? pucDb : db;
            await setDoc(doc(targetDb, 'users', user.uid), {
                fullName: cleanedName,
                email: cleanedEmail,
                mobileNumber: cleanedMobile,
                role: 'admin',
                adminId: cleanedAdminId || '',
                permissions: permissionsToSave,
                targetDepartments: departmentsToSave,
                createdAt: serverTimestamp(),
                createdBy: currentUser?.uid,
                status: 'active'
            });

            setSuccess(true);
            setCreatedAdminData({
                fullName: cleanedName,
                email: cleanedEmail,
                mobileNumber: cleanedMobile,
                adminId: cleanedAdminId || '',
                password: formData.password,
                departments: departmentsToSave,
                campus: 'RGUKT RK Valley'
            });
            setFormData({ fullName: '', email: '', mobileNumber: '', password: '', adminId: '' });
            setSelectedPermissions([]);
            setSelectedDepartments([]);
            setIsSuperAdmin(true);
            
            // Remove the auto-navigate to let them see the letter
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
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
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
                                <label className="admin-form-label">Mobile Number *</label>
                                <input
                                    type="tel"
                                    name="mobileNumber"
                                    className="admin-form-input"
                                    value={formData.mobileNumber}
                                    onChange={handleChange}
                                    placeholder="e.g. 9876543210"
                                    required
                                />
                            </div>
                            <div className="admin-form-group">
                                <label className="admin-form-label">Admin ID *</label>
                                <input
                                    type="text"
                                    name="adminId"
                                    className="admin-form-input"
                                    value={formData.adminId}
                                    onChange={handleChange}
                                    placeholder="e.g. ADM-JOHN"
                                    required
                                />
                            </div>
                            <div className="admin-form-group">
                                <label className="admin-form-label">Password *</label>
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
                        
                        {!isSuperAdmin && (
                            <div className="admin-form-group" style={{ marginTop: '2rem' }}>
                                <label className="admin-form-label">Admin Scope</label>
                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => { setAdminScope('BTECH'); setSelectedDepartments([]); }}
                                        className={adminScope === 'BTECH' ? 'btn-primary' : 'btn-secondary'}
                                        style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', fontSize: '0.9rem' }}
                                    >
                                        BTECH Admin
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setAdminScope('PUC'); setSelectedDepartments([]); }}
                                        className={adminScope === 'PUC' ? 'btn-primary' : 'btn-secondary'}
                                        style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', fontSize: '0.9rem' }}
                                    >
                                        PUC Admin
                                    </button>
                                </div>
                                <label className="admin-form-label">
                                    Target {adminScope === 'BTECH' ? 'Departments' : 'Classes'} (Max 3)
                                </label>
                                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                                    Restrict this admin to specific {adminScope === 'BTECH' ? 'departments' : 'classes'}. Leave empty for all {adminScope === 'BTECH' ? 'departments' : 'classes'}.
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {(adminScope === 'BTECH' 
                                        ? ['CSE(AI&ML)', 'CSE', 'ECE', 'EEE', 'CE', 'ME', 'MME', 'CHE']
                                        : [
                                            'G-008', 'G-011', 'G-012', 'G-013', 'G-014', 'G-015', 
                                            'K-1', 'K-2', 'K-3', 'K-4', 'K-5', 'K-6', 
                                            'Phi-10', 'Phi-4', 'Phi-5', 'Phi-6', 'Phi-7', 'Phi-8', 'Phi-9'
                                          ]
                                    ).map(dept => {
                                        const isSelected = selectedDepartments.includes(dept);
                                        const isDisabled = !isSelected && selectedDepartments.length >= 3;
                                        return (
                                            <div 
                                                key={dept}
                                                style={{
                                                    padding: '0.5rem 1.25rem',
                                                    borderRadius: '2rem',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '600',
                                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                    border: `1px solid ${isSelected ? 'var(--color-brand, #6366f1)' : 'var(--color-border)'}`,
                                                    backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'var(--color-surface)',
                                                    color: isSelected ? 'var(--color-brand, #6366f1)' : (isDisabled ? 'var(--color-text-muted)' : 'var(--color-text-main)'),
                                                    opacity: isDisabled ? 0.5 : 1,
                                                    transition: 'all 0.2s ease',
                                                    userSelect: 'none'
                                                }}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedDepartments(prev => prev.filter(d => d !== dept));
                                                    } else if (!isDisabled) {
                                                        setSelectedDepartments(prev => [...prev, dept]);
                                                    }
                                                }}
                                            >
                                                {dept}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="form-actions" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
                        {error && <div className="admin-alert error" style={{ width: '100%', marginBottom: '1rem' }}>{error}</div>}
                        <div style={{ display: 'flex', gap: '1rem' }}>
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
                    </div>
                </form>
            </div>
        </div>
        {createdAdminData && (
            <AdminAppointmentLetter 
                adminData={createdAdminData} 
                onClose={() => {
                    setCreatedAdminData(null);
                    navigate('/admin/users');
                }} 
            />
        )}
        </>
    );
};

export default CreateAdminAccount;
