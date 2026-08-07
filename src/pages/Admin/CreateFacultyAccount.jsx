import { User, Briefcase, BookOpen, Key, Shield, Camera, AlertCircle, Check, Copy, CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { collection, addDoc } from 'firebase/firestore';

import './CreateFacultyAccount.css';

const steps = [
    { id: 1, title: 'Personal', icon: <User size={24} /> },
    { id: 2, title: 'Professional', icon: <Briefcase size={24} /> },
    { id: 3, title: 'Academic', icon: <BookOpen size={24} /> },
    { id: 4, title: 'Credentials', icon: <Key size={24} /> },
    { id: 5, title: 'Permissions', icon: <Shield size={24} /> }
];

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

const restrictedPermissions = [
    { id: 'admin_settings', label: 'Cannot Access Admin Settings', desc: 'System configuration locked' },
    { id: 'manage_faculty', label: 'Cannot Manage Other Faculty Accounts', desc: 'User management restricted' },
    { id: 'delete_students', label: 'Cannot Delete Student Records', desc: 'Destructive actions disabled' }
];

const CreateFacultyAccount = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [copied, setCopied] = useState(false);

    const [formData, setFormData] = useState({
        // Personal
        fullName: '',
        facultyId: '',
        gender: '',
        dob: '',
        mobile: '',
        email: '',
        // Professional
        department: '',
        designation: '',
        qualification: '',
        experience: '',
        employeeType: 'Permanent',
        // Academic
        assignedCourse: '',
        assignedSemester: '',
        assignedSubject: '',
        // Credentials
        username: '',
        password: '',
        // Settings & Perms
        accountStatus: 'active',
        forcePasswordChange: true,
        permissions: availablePermissions.map(p => p.id) // all checked by default
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
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

    const generateUsername = () => {
        setFormData(prev => {
            if (!prev.fullName) {
                alert("Please enter the Full Name first to generate a username based on it.");
                return prev;
            }
            const cleanName = prev.fullName.replace(/[^a-zA-Z]/g, '').toLowerCase();
            const randomNum = Math.floor(Math.random() * 900) + 100;
            return { ...prev, username: `${cleanName}${randomNum}` };
        });
    };

    const generatePassword = () => {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let pass = "";
        for (let i = 0; i < 12; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData(prev => ({ 
            ...prev, 
            password: pass,
            username: prev.email || `${prev.fullName.split(' ')[0].toLowerCase()}${Math.floor(Math.random() * 100)}`
        }));
    };

    const copyCreds = () => {
        const text = `Welcome to RGUKT Faculty Portal!\n\nLogin URL: https://rgukt-connect.web.app\nUsername: ${formData.username}\nPassword: ${formData.password}\n\nPlease change your password upon first login.`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const nextStep = () => {
        // Basic validation before moving next
        if (currentStep === 1 && (!formData.fullName || !formData.email || !formData.facultyId)) {
            alert("Please fill in required fields (Name, Email, ID)");
            return;
        }
        if (currentStep === 2 && (!formData.department || !formData.designation)) {
            alert("Please fill in required fields (Department, Designation)");
            return;
        }
        setCurrentStep(prev => Math.min(prev + 1, 5));
    };

    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    const handleSubmit = async (e) => {
        e.preventDefault();
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
                fullName: formData.fullName,
                email: formData.email,
                username: formData.username.toLowerCase(),
                password: formData.password,
                role: 'faculty',
                studentId: formData.facultyId, // using studentId field for generic ID
                department: formData.department,
                designation: formData.designation,
                createdAt: new Date().toISOString(),
                status: formData.accountStatus
            });

            setIsSuccess(true);
            
            // Wait 3 seconds then redirect
            setTimeout(() => {
                navigate('/admin');
            }, 3000);

        } catch (error) {
            console.error("Error creating faculty:", error);
            alert("Failed to create faculty account.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Render Steps
    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <h2 className="form-card-title">Personal Information</h2>
                        <p className="form-card-subtitle mb-6">Enter the basic personal details of the faculty member.</p>
                        
                        <div className="photo-upload-container">
                            <div className="photo-preview">
                                <Camera size={32} className="text-[var(--color-text-muted)]" />
                            </div>
                            <div className="photo-upload-actions">
                                <span className="font-semibold text-sm">Profile Photo (Optional)</span>
                                <span className="text-xs text-[var(--color-text-muted)] mb-2">JPG, PNG or GIF up to 2MB</span>
                                <button type="button" className="btn-secondary py-1 text-sm w-fit">Upload Photo</button>
                            </div>
                        </div>

                        <div className="form-grid-2">
                            <div className="form-group">
                                <label className="form-label required">Full Name</label>
                                <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="form-input" placeholder="e.g. Dr. Ramesh Kumar" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label required">Faculty ID</label>
                                <div className="input-with-button">
                                    <input type="text" name="facultyId" value={formData.facultyId} onChange={handleChange} className="form-input" placeholder="e.g. FAC-1234" required />
                                    <button type="button" onClick={generateId} className="btn-secondary">Auto Generate</button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label required">Email Address</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} className="form-input" placeholder="e.g. ramesh@rgukt.ac.in" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label required">Mobile Number</label>
                                <input type="tel" name="mobile" value={formData.mobile} onChange={handleChange} className="form-input" placeholder="+91 XXXXX XXXXX" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Gender</label>
                                <select name="gender" value={formData.gender} onChange={handleChange} className="form-input">
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Date of Birth</label>
                                <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="form-input" />
                            </div>
                        </div>
                    </motion.div>
                );
            case 2:
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <h2 className="form-card-title">Professional Information</h2>
                        <p className="form-card-subtitle mb-6">Specify the faculty's role and experience.</p>
                        
                        <div className="form-grid-2">
                            <div className="form-group">
                                <label className="form-label required">Department</label>
                                <select name="department" value={formData.department} onChange={handleChange} className="form-input" required>
                                    <option value="">Select Department</option>
                                    <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                                    <option value="Electronics & Communication">Electronics & Communication</option>
                                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                                    <option value="Civil Engineering">Civil Engineering</option>
                                    <option value="Electrical Engineering">Electrical Engineering</option>
                                    <option value="Mathematics">Mathematics</option>
                                    <option value="Physics">Physics</option>
                                    <option value="Chemistry">Chemistry</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label required">Designation</label>
                                <input type="text" name="designation" value={formData.designation} onChange={handleChange} className="form-input" placeholder="e.g. Assistant Professor, HOD" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Employee Type</label>
                                <select name="employeeType" value={formData.employeeType} onChange={handleChange} className="form-input">
                                    <option value="Permanent">Permanent</option>
                                    <option value="Contract">Contract</option>
                                    <option value="Guest Faculty">Guest Faculty</option>
                                    <option value="Teaching Assistant">Teaching Assistant</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Experience (Years)</label>
                                <input type="number" name="experience" value={formData.experience} onChange={handleChange} className="form-input" placeholder="e.g. 5" min="0" />
                            </div>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">Highest Qualification</label>
                                <input type="text" name="qualification" value={formData.qualification} onChange={handleChange} className="form-input" placeholder="e.g. Ph.D. in Computer Science" />
                            </div>
                        </div>
                    </motion.div>
                );
            case 3:
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <h2 className="form-card-title">Academic Assignment</h2>
                        <p className="form-card-subtitle mb-6">Assign courses and subjects to the faculty member.</p>
                        
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 flex gap-3 text-blue-800">
                            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                            <p className="text-sm">Assignments can be modified later in the Faculty Management dashboard. You can skip this step if subjects are not yet finalized.</p>
                        </div>

                        <div className="form-grid-3">
                            <div className="form-group">
                                <label className="form-label">Assign Course</label>
                                <select name="assignedCourse" value={formData.assignedCourse} onChange={handleChange} className="form-input">
                                    <option value="">Select Course</option>
                                    <option value="B.Tech">B.Tech</option>
                                    <option value="PUC">PUC</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Assign Semester</label>
                                <select name="assignedSemester" value={formData.assignedSemester} onChange={handleChange} className="form-input">
                                    <option value="">Select Semester</option>
                                    <option value="Semester 1">Semester 1</option>
                                    <option value="Semester 2">Semester 2</option>
                                    <option value="Semester 3">Semester 3</option>
                                    <option value="Semester 4">Semester 4</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Assign Subject</label>
                                <select name="assignedSubject" value={formData.assignedSubject} onChange={handleChange} className="form-input">
                                    <option value="">Select Subject</option>
                                    <option value="Data Structures">Data Structures</option>
                                    <option value="Operating Systems">Operating Systems</option>
                                    <option value="Engineering Mathematics">Engineering Mathematics</option>
                                    <option value="Physics">Physics</option>
                                </select>
                            </div>
                        </div>
                    </motion.div>
                );
            case 4:
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <h2 className="form-card-title">Login Credentials</h2>
                        <p className="form-card-subtitle mb-6">Generate credentials for the faculty portal access.</p>
                        
                        <div className="form-grid-2">
                            <div className="form-group">
                                <label className="form-label required">Username</label>
                                <div className="input-with-button">
                                    <input type="text" name="username" value={formData.username} onChange={handleChange} className="form-input" placeholder="Usually email address" required />
                                    <button type="button" onClick={generateUsername} className="btn-secondary">Auto Generate</button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label required">Password</label>
                                <div className="input-with-button">
                                    <input type="text" name="password" value={formData.password} onChange={handleChange} className="form-input font-mono" required />
                                    <button type="button" onClick={generatePassword} className="btn-secondary">Generate Secure</button>
                                </div>
                            </div>
                        </div>

                        {formData.password && (
                            <div className="creds-box mt-8">
                                <h4 className="font-bold text-[var(--color-text)] mb-2">Credentials Generated!</h4>
                                <p className="text-sm text-[var(--color-text-muted)]">Copy these credentials to send to the faculty member. Note: Using Firebase client auth means they will need to 'Reset Password' if we don't have an admin function.</p>
                                
                                <div className="creds-code">
                                    Username: {formData.username}<br/>
                                    Password: {formData.password}
                                </div>
                                
                                <button type="button" onClick={copyCreds} className="btn-secondary flex items-center gap-2">
                                    {copied ? <Check size={16} className="text-green-600"/> : <Copy size={16} />}
                                    {copied ? 'Copied!' : 'Copy to Clipboard'}
                                </button>
                            </div>
                        )}
                    </motion.div>
                );
            case 5:
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <h2 className="form-card-title">Account Settings & Permissions</h2>
                        <p className="form-card-subtitle mb-6">Configure access levels and account status.</p>
                        
                        <div className="flex gap-6 mb-8 pb-8 border-b border-[var(--color-border)]">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" name="accountStatus" checked={formData.accountStatus === 'active'} onChange={(e) => setFormData({...formData, accountStatus: e.target.checked ? 'active' : 'inactive'})} className="w-5 h-5 accent-[var(--color-primary)]" />
                                <span className="font-medium">Active Account</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" name="forcePasswordChange" checked={formData.forcePasswordChange} onChange={handleChange} className="w-5 h-5 accent-[var(--color-primary)]" />
                                <span className="font-medium">Force Password Change on First Login</span>
                            </label>
                        </div>

                        <h3 className="text-lg font-bold mb-4">Faculty Permissions</h3>
                        <div className="permissions-grid mb-8">
                            {availablePermissions.map(perm => (
                                <div 
                                    key={perm.id} 
                                    className={`permission-checkbox ${formData.permissions.includes(perm.id) ? 'checked' : ''}`}
                                    onClick={() => handlePermissionToggle(perm.id)}
                                >
                                    <input type="checkbox" checked={formData.permissions.includes(perm.id)} readOnly />
                                    <div className="permission-info">
                                        <span className="permission-title">{perm.label}</span>
                                        <span className="permission-desc">{perm.desc}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <h3 className="text-lg font-bold mb-4 text-red-600">Restricted Permissions</h3>
                        <div className="permissions-grid">
                            {restrictedPermissions.map(perm => (
                                <div key={perm.id} className="permission-checkbox restricted-permission">
                                    <input type="checkbox" checked={false} disabled />
                                    <div className="permission-info">
                                        <span className="permission-title line-through">{perm.label}</span>
                                        <span className="permission-desc">{perm.desc}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                );
            default:
                return null;
        }
    };

    if (isSuccess) {
        return (
            <div className="create-faculty-container flex flex-col items-center justify-center min-h-[60vh]">
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }}
                    className="success-card max-w-md w-full"
                >
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <CheckCircle2 size={48} className="text-green-600" />
                    </div>
                    <h2 className="text-3xl font-extrabold mb-2 text-slate-800">Account Created!</h2>
                    <p className="text-[var(--color-text-muted)] mb-8 text-lg">
                        <strong className="text-slate-700">{formData.fullName}</strong>'s faculty account has been successfully created.
                    </p>
                    <p className="text-sm font-semibold mb-8 bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-600">
                        Redirecting to Admin Dashboard...
                    </p>
                    <button onClick={() => navigate('/admin')} className="btn-primary w-full justify-center text-lg py-3 rounded-xl shadow-lg">
                        Return to Dashboard Now
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="create-faculty-container">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => navigate('/admin')} className="btn-ghost p-2 hover:bg-[var(--color-surface)] rounded-full transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-3xl font-bold">Create Faculty Account</h1>
                    <p className="text-[var(--color-text-muted)] mt-1">Onboard new faculty members and assign permissions.</p>
                </div>
            </div>

            {/* Stepper */}
            <div className="stepper-container">
                <div 
                    className="stepper-progress-bar" 
                    style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                ></div>
                {steps.map((step, index) => (
                    <div key={step.id} className={`step-item ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}>
                        <div className="step-circle">
                            {currentStep > step.id ? <Check size={20} /> : step.icon}
                        </div>
                        <div className="step-label">{step.title}</div>
                    </div>
                ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="form-card">
                <AnimatePresence mode="wait">
                    {renderStepContent()}
                </AnimatePresence>

                <div className="form-actions">
                    <button 
                        type="button" 
                        onClick={prevStep} 
                        className={`btn-navigation btn-ghost ${currentStep === 1 ? 'invisible' : ''}`}
                    >
                        <ArrowLeft size={18} /> Back
                    </button>

                    {currentStep < 5 ? (
                        <button type="button" onClick={nextStep} className="btn-navigation btn-primary">
                            Next Step <ArrowRight size={18} />
                        </button>
                    ) : (
                        <button type="submit" disabled={isSubmitting} className="btn-navigation btn-success">
                            {isSubmitting ? 'Creating...' : 'Create Account'} <Check size={18} />
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default CreateFacultyAccount;
