import { UserPlus, Briefcase, Key, Shield, Check, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { collection, addDoc } from 'firebase/firestore';
import './CreateAdminAccount.css'; // Inheriting styles from CreateAdminAccount for unified look
import './CreateFacultyAccount.css';

const availablePermissions = [
    { id: 'manage_subjects', label: 'Manage Assigned Subjects', desc: 'Can upload and edit subject materials' },
    { id: 'upload_materials', label: 'Upload Study Materials', desc: 'Upload PDFs, notes, and resources' },
    { id: 'manage_quizzes', label: 'Manage Quizzes', desc: 'Create, edit, and delete quizzes' },
    { id: 'view_analytics', label: 'View Quiz Analytics', desc: 'Access detailed performance reports' },
    { id: 'create_assignments', label: 'Create Assignments', desc: 'Distribute new assignments to students' },
    { id: 'evaluate_assignments', label: 'Evaluate Assignments', desc: 'Grade submissions and provide feedback' },
    { id: 'mark_attendance', label: 'Mark Attendance', desc: 'Record daily student attendance' },
    { id: 'view_performance', label: 'View Student Performance', desc: 'Access comprehensive student records' },
    { id: 'create_notices', label: 'Create Notices', desc: 'Post announcements to assigned classes' },
    { id: 'send_messages', label: 'Send Messages', desc: 'Communicate directly with students' }
];

const CreateFacultyAccount = () => {
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        // Basic Info
        fullName: '',
        facultyId: '',
        gender: '',
        dob: '',
        mobile: '',
        email: '',
        // Professional & Academic
        department: '',
        designation: '',
        qualification: '',
        experience: '',
        employeeType: 'Permanent',
        assignedCourse: '',
        assignedSemester: '',
        assignedSubject: '',
        // Credentials
        username: '',
        password: '',
        usernameCustomized: false,
        // Settings & Perms
        accountStatus: 'active',
        permissions: availablePermissions.map(p => p.id) // all checked by default
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: value };

            // Auto-generate username
            if (name === 'fullName' || name === 'email') {
                if (!prev.usernameCustomized) {
                    const cleanName = newData.fullName ? newData.fullName.replace(/[^a-zA-Z]/g, '').toLowerCase() : '';
                    if (cleanName) {
                        const randomNum = Math.floor(Math.random() * 900) + 100;
                        newData.username = `${cleanName}${randomNum}`;
                    } else {
                        newData.username = '';
                    }
                }
            } else if (name === 'username') {
                newData.usernameCustomized = true;
                if (value.trim() === '') {
                    newData.usernameCustomized = false;
                }
            }

            return newData;
        });
    };

    const handlePermissionToggle = (permId) => {
        setFormData(prev => {
            const perms = prev.permissions.includes(permId)
                ? prev.permissions.filter(id => id !== permId)
                : [...prev.permissions, permId];
            return { ...prev, permissions: perms };
        });
    };

    const generateId = () => {
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        setFormData(prev => ({ ...prev, facultyId: `FAC-${randomNum}` }));
    };

    const generatePassword = () => {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let pass = "";
        for (let i = 0; i < 12; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData(prev => ({ ...prev, password: pass }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        const { fullName, email, mobile, password, username } = formData;

        if (!fullName || !email || !mobile || !password || !username) {
            setError("Please fill in all required fields.");
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setIsSubmitting(true);
        
        try {
            // Save detailed record to `faculties` collection
            const facultyRef = collection(db, 'faculties');
            await addDoc(facultyRef, {
                ...formData,
                createdAt: new Date().toISOString()
            });

            // Save basic stub to `users` collection for core routing
            const userRef = collection(db, 'users');
            await addDoc(userRef, {
                fullName: fullName,
                email: email,
                username: username.toLowerCase(),
                password: password,
                role: 'faculty',
                studentId: `FAC-${Math.floor(1000 + Math.random() * 9000)}`, // auto-generate generic ID
                department: '',
                designation: '',
                createdAt: new Date().toISOString(),
                status: formData.accountStatus
            });

            setSuccess(true);
            setFormData({
                fullName: '', facultyId: '', gender: '', dob: '', mobile: '', email: '',
                department: '', designation: '', qualification: '', experience: '', employeeType: 'Permanent',
                assignedCourse: '', assignedSemester: '', assignedSubject: '',
                username: '', password: '', usernameCustomized: false,
                accountStatus: 'active', permissions: availablePermissions.map(p => p.id)
            });
            
            setTimeout(() => {
                navigate('/admin');
            }, 3000);

        } catch (err) {
            console.error("Error creating faculty:", err);
            setError("Failed to create faculty account. Please try again.");
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="admin-container create-admin-page">
            <div className="page-header-v2">
                <div className="header-accent-bar"></div>
                <div className="header-content-v2">
                    <h1 className="page-title-v2">Create Faculty Account</h1>
                    <p className="page-subtitle-v2">Onboard a new faculty member and configure their access permissions.</p>
                </div>
            </div>

            <div className="create-admin-content">
                <form className="create-admin-form" onSubmit={handleSubmit}>
                    
                    {error && <div className="admin-alert error">{error}</div>}
                    {success && <div className="admin-alert success">Faculty account created successfully! Redirecting to dashboard...</div>}

                    {/* BASIC INFORMATION */}
                    <div className="form-section">
                        <h3 className="section-title">
                            <UserPlus size={18} />
                            Basic Information
                        </h3>
                        <div className="form-grid">
                            <div className="admin-form-group">
                                <label className="admin-form-label">Full Name *</label>
                                <input type="text" name="fullName" className="admin-form-input" value={formData.fullName} onChange={handleChange} placeholder="e.g. Dr. Ramesh Kumar" required />
                            </div>
                            <div className="admin-form-group">
                                <label className="admin-form-label">Email Address *</label>
                                <input type="email" name="email" className="admin-form-input" value={formData.email} onChange={handleChange} placeholder="ramesh@rgukt.ac.in" required />
                            </div>
                            <div className="admin-form-group">
                                <label className="admin-form-label">Mobile Number *</label>
                                <input type="tel" name="mobile" className="admin-form-input" value={formData.mobile} onChange={handleChange} placeholder="+91 XXXXX XXXXX" required />
                            </div>
                            <div className="admin-form-group">
                                <label className="admin-form-label">Gender</label>
                                <select name="gender" className="admin-form-input" value={formData.gender} onChange={handleChange}>
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="admin-form-group">
                                <label className="admin-form-label">Date of Birth</label>
                                <input type="date" name="dob" className="admin-form-input" value={formData.dob} onChange={handleChange} />
                            </div>
                        </div>
                    </div>



                    {/* CREDENTIALS */}
                    <div className="form-section">
                        <h3 className="section-title">
                            <Key size={18} />
                            Login Credentials
                        </h3>
                        <div className="form-grid">
                            <div className="admin-form-group">
                                <label className="admin-form-label">Username *</label>
                                <input type="text" name="username" className="admin-form-input" value={formData.username} onChange={handleChange} placeholder="e.g. ramesh123" required />
                            </div>
                            <div className="admin-form-group">
                                <label className="admin-form-label">Password *</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input type="text" name="password" className="admin-form-input" value={formData.password} onChange={handleChange} placeholder="Set a strong password" required />
                                    <button type="button" onClick={generatePassword} className="btn-secondary" style={{ padding: '0 12px', fontSize: '14px', borderRadius: '8px' }}>Generate</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ACCESS PERMISSIONS */}
                    <div className="form-section">
                        <h3 className="section-title">
                            <Shield size={18} />
                            Access Permissions
                        </h3>
                        <div className="permissions-grid">
                            {availablePermissions.map(item => (
                                <label key={item.id} className={`permission-item ${formData.permissions.includes(item.id) ? 'selected' : ''}`}>
                                    <input 
                                        type="checkbox"
                                        className="hidden-checkbox"
                                        checked={formData.permissions.includes(item.id)}
                                        onChange={() => handlePermissionToggle(item.id)}
                                    />
                                    <div className="perm-item-icon">
                                        <BookOpen size={20} />
                                    </div>
                                    <div className="perm-item-details">
                                        <span className="perm-name">{item.label}</span>
                                        <span className="perm-desc">{item.desc}</span>
                                    </div>
                                    <div className="perm-checkbox-indicator">
                                        <Check size={14} />
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                        <button type="button" onClick={() => navigate(-1)} className="btn-secondary" disabled={isSubmitting}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <><span className="spinner"></span> Creating Account...</>
                            ) : (
                                'Create Faculty Account'
                            )}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default CreateFacultyAccount;
