import { Save, Send } from 'lucide-react';
import React, { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { noticeService } from '../../services/noticeService';
import { isDepartmentAllowed } from '../../utils/rbacUtils';
import './CreateNotice.css';

const CATEGORIES = ['Academic', 'Exams', 'Events', 'Placements', 'Circulars', 'Assignments'];
const PRIORITIES = ['Normal', 'Medium', 'High'];

const CreateNotice = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user } = useAuth();
    
    const isSuperAdmin = !user?.targetDepartments || user.targetDepartments.length === 0 || user.permissions?.includes('all');
    const isPucAdmin = user?.targetDepartments?.includes('PUC');
    
    const ALL_BTECH_DEPTS = ['CSE(AI&ML)', 'CSE', 'ECE', 'EEE', 'CE', 'ME', 'MME', 'CHE'];
    const ALL_PUC_CLASSES = [
        'G-008', 'G-011', 'G-012', 'G-013', 'G-014', 'G-015', 
        'K-1', 'K-2', 'K-3', 'K-4', 'K-5', 'K-6', 
        'Phi-10', 'Phi-4', 'Phi-5', 'Phi-6', 'Phi-7', 'Phi-8', 'Phi-9'
    ];
    
    let ALL_TARGETS = [];
    if (isSuperAdmin) {
        ALL_TARGETS = [...ALL_BTECH_DEPTS, ...ALL_PUC_CLASSES];
    } else if (isPucAdmin) {
        ALL_TARGETS = ALL_PUC_CLASSES;
    } else {
        ALL_TARGETS = ALL_BTECH_DEPTS;
    }
    
    const allowedDepts = isSuperAdmin ? ALL_TARGETS : ALL_TARGETS.filter(dept => isDepartmentAllowed(dept, user));

    const fileInputRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        category: 'Academic',
        priority: 'Normal',
        expiryDate: '',
        targetAll: isSuperAdmin ? true : false,
        targetRoles: [],
        targetClasses: [],
        targetDepartments: isSuperAdmin ? [] : allowedDepts
    });
    
    const [driveLink, setDriveLink] = useState('');

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    React.useEffect(() => {
        const fetchNotice = async () => {
            if (!id) return;
            try {
                const notice = await noticeService.getNoticeById(id);
                if (notice) {
                    setFormData({
                        title: notice.title || '',
                        content: notice.content || '',
                        category: notice.category || 'Academic',
                        priority: notice.priority || 'Normal',
                        expiryDate: notice.expiryDate ? (notice.expiryDate.toDate ? notice.expiryDate.toDate().toISOString().split('T')[0] : new Date(notice.expiryDate.seconds * 1000).toISOString().split('T')[0]) : '',
                        targetAll: isSuperAdmin ? (notice.targetAudience?.targetAll ?? true) : false,
                        targetRoles: notice.targetAudience?.roles || [],
                        targetClasses: notice.targetAudience?.classes || [],
                        targetDepartments: isSuperAdmin ? (notice.targetAudience?.departments || []) : (notice.targetAudience?.departments?.length > 0 ? notice.targetAudience.departments.filter(d => allowedDepts.includes(d)) : allowedDepts)
                    });
                    if (notice.attachments && notice.attachments.length > 0) {
                        setDriveLink(notice.attachments[0].url || '');
                    }
                }
            } catch (error) {
                console.error("Failed to fetch notice for edit:", error);
            }
        };
        fetchNotice();
    }, [id]);
    const handleSubmit = async (status) => {
        if (!formData.title || !formData.content) {
            alert("Title and Content are required.");
            return;
        }

        setLoading(true);
        try {
            const noticePayload = {
                title: formData.title,
                content: formData.content,
                category: formData.category,
                priority: formData.priority,
                postedBy: user?.displayName || user?.fullName || 'Admin',
                status: status,
                targetAudience: {
                    targetAll: isSuperAdmin ? formData.targetAll : false,
                    roles: formData.targetRoles,
                    classes: formData.targetClasses,
                    departments: isSuperAdmin ? formData.targetDepartments : formData.targetDepartments.filter(d => allowedDepts.includes(d))
                }
            };

            if (formData.expiryDate) {
                noticePayload.expiryDate = new Date(formData.expiryDate);
            }

            let attachments = [];
            if (driveLink) {
                const fileIdMatch = driveLink.match(/\/d\/([a-zA-Z0-9-_]+)/);
                const fileId = fileIdMatch ? fileIdMatch[1] : null;
                if (fileId) {
                    attachments.push({
                        name: 'Attached Document',
                        type: 'drive-link',
                        size: 0,
                        url: driveLink,
                        previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
                        downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`
                    });
                } else {
                    attachments.push({
                        name: 'Attached Link',
                        type: 'link',
                        size: 0,
                        url: driveLink,
                        previewUrl: driveLink,
                        downloadUrl: driveLink
                    });
                }
            }

            if (id) {
                await noticeService.updateNotice(id, noticePayload, attachments);
            } else {
                await noticeService.createNotice(noticePayload, attachments);
            }
            navigate('/admin/notices');
        } catch (error) {
            console.error("Failed to save notice:", error);
            alert("Failed to save notice. See console for details.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-width-wrapper create-notice-page animate-fade-in">
            <div className="page-header-v2">
                <div className="header-accent-bar"></div>
                <div className="header-content-v2">
                    <h1 className="page-title-v2">{id ? 'Edit Notice' : 'Create Notice'}</h1>
                    <p className="page-subtitle-v2">{id ? 'Update the details of this announcement' : 'Publish a new announcement to the campus'}</p>
                </div>
            </div>

            <div className="cn-form-container">
                <div className="cn-section">
                    <h2 className="cn-section-title">Notice Details</h2>
                    
                    <div className="cn-form-group">
                        <label>Notice Title</label>
                        <input 
                            type="text" 
                            className="cn-input" 
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            placeholder="Enter a descriptive title"
                        />
                    </div>

                    <div className="cn-grid-2">
                        <div className="cn-form-group">
                            <label>Category</label>
                            <select className="cn-select" name="category" value={formData.category} onChange={handleInputChange}>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="cn-form-group">
                            <label>Priority</label>
                            <select className="cn-select" name="priority" value={formData.priority} onChange={handleInputChange}>
                                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="cn-form-group">
                        <label>Content</label>
                        <textarea 
                            className="cn-textarea" 
                            name="content"
                            value={formData.content}
                            onChange={handleInputChange}
                            placeholder="Write the full notice content here..."
                        ></textarea>
                    </div>

                    <div className="cn-form-group">
                        <label>Expiry Date (Optional)</label>
                        <input 
                            type="date" 
                            className="cn-input" 
                            name="expiryDate"
                            value={formData.expiryDate}
                            onChange={handleInputChange}
                            style={{ maxWidth: '200px' }}
                        />
                    </div>
                </div>

                <div className="cn-section">
                    <h2 className="cn-section-title">Target Audience</h2>
                    {isSuperAdmin && (
                        <div className="cn-form-group">
                            <label className="cn-premium-checkbox">
                                <input 
                                    type="checkbox" 
                                    name="targetAll"
                                    checked={formData.targetAll}
                                    onChange={handleInputChange}
                                    className="cn-premium-input"
                                />
                                <div className="cn-premium-box">
                                    <svg viewBox="0 0 24 24" className="cn-premium-check">
                                        <path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                <span className="cn-premium-text">Publish to All Students & Faculty</span>
                            </label>
                        </div>
                    )}
                    
                    {!formData.targetAll && (
                        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            <div className="cn-form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.95rem', color: 'var(--color-text-main)' }}>Target {isPucAdmin && !isSuperAdmin ? 'Classes' : 'Departments & Classes'}</label>
                                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Select which {isPucAdmin && !isSuperAdmin ? 'classes' : 'departments'} should see this notice. Leave empty for all.</p>
                                <div className="cn-chip-container">
                                    {allowedDepts.map(dept => {
                                        const isSelected = formData.targetDepartments.includes(dept);
                                        return (
                                            <div 
                                                key={dept}
                                                className={`cn-chip ${isSelected ? 'active' : ''}`}
                                                onClick={() => {
                                                    const newDepts = isSelected 
                                                        ? formData.targetDepartments.filter(d => d !== dept)
                                                        : [...formData.targetDepartments, dept];
                                                    setFormData({ ...formData, targetDepartments: newDepts });
                                                }}
                                            >
                                                {dept}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="cn-form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.95rem', color: 'var(--color-text-main)' }}>Target Sections</label>
                                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Select specific sections, or type custom ones below.</p>
                                <div className="cn-chip-container" style={{ marginBottom: '1rem' }}>
                                    {['A', 'B', 'C', 'D', 'AIML'].filter(sec => sec !== 'AIML' || allowedDepts.includes('CSE(AI&ML)')).map(sec => {
                                        const isSelected = formData.targetClasses.includes(sec);
                                        return (
                                            <div 
                                                key={sec}
                                                className={`cn-chip ${isSelected ? 'active' : ''}`}
                                                onClick={() => {
                                                    const newSecs = isSelected 
                                                        ? formData.targetClasses.filter(s => s !== sec)
                                                        : [...formData.targetClasses, sec];
                                                    setFormData({ ...formData, targetClasses: newSecs });
                                                }}
                                            >
                                                {sec}
                                            </div>
                                        );
                                    })}
                                </div>
                                <input 
                                    type="text" 
                                    className="cn-input" 
                                    placeholder="Or type custom classes (e.g. F-08, F-09) comma separated"
                                    value={formData.targetClasses.filter(c => !['A', 'B', 'C', 'D', 'AIML'].includes(c)).join(', ')}
                                    onChange={(e) => {
                                        const custom = e.target.value.split(',').map(s=>s.trim()).filter(Boolean);
                                        const standard = formData.targetClasses.filter(c => ['A', 'B', 'C', 'D', 'AIML'].includes(c));
                                        setFormData({...formData, targetClasses: [...new Set([...standard, ...custom])]});
                                    }}
                                />
                            </div>

                            <div className="cn-form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.95rem', color: 'var(--color-text-main)' }}>Target Roles</label>
                                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Who should receive this? Leave empty for everyone.</p>
                                <div className="cn-chip-container">
                                    {['student', 'faculty'].map(role => {
                                        const isSelected = formData.targetRoles.includes(role);
                                        return (
                                            <div 
                                                key={role}
                                                className={`cn-chip ${isSelected ? 'active' : ''}`}
                                                style={{ textTransform: 'capitalize' }}
                                                onClick={() => {
                                                    const newRoles = isSelected 
                                                        ? formData.targetRoles.filter(r => r !== role)
                                                        : [...formData.targetRoles, role];
                                                    setFormData({ ...formData, targetRoles: newRoles });
                                                }}
                                            >
                                                {role}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="cn-section">
                    <h2 className="cn-section-title">Attachments</h2>
                    <div className="cn-form-group">
                        <label>Google Drive Link (Optional)</label>
                        <input 
                            type="text" 
                            className="cn-input" 
                            value={driveLink}
                            onChange={(e) => setDriveLink(e.target.value)}
                            placeholder="Paste Google Drive link here"
                        />
                        <p className="cn-file-upload-subtext" style={{ marginTop: '0.5rem', textAlign: 'left' }}>
                            Paste a Google Drive file link. It will automatically be embedded with View and Download buttons.
                        </p>
                    </div>
                </div>

                <div className="cn-actions">
                    <button 
                        className="cn-btn cn-btn-secondary" 
                        onClick={() => navigate('/admin/notices')}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button 
                        className="cn-btn cn-btn-secondary" 
                        onClick={() => handleSubmit('draft')}
                        disabled={loading}
                    >
                        <Save size={18} style={{ marginRight: '0.5rem', display: 'inline' }} />
                        Save Draft
                    </button>
                    <button 
                        className="cn-btn cn-btn-primary" 
                        onClick={() => handleSubmit('published')}
                        disabled={loading}
                    >
                        {loading ? 'Publishing...' : (
                            <><Send size={18} style={{ marginRight: '0.5rem', display: 'inline' }} /> Publish Notice</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateNotice;
