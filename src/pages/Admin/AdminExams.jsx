import LoadingTransition from '../../components/Common/LoadingTransition';
import CustomSelect from '../../components/Common/CustomSelect';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, FileText, ClipboardList, Zap, MapPinIcon, Trash2, Loader2, Save, Plus, ArrowUp, ArrowDown, Copy, Edit3, Calendar } from 'lucide-react';
import { db } from '../../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { isDepartmentAllowed } from '../../utils/rbacUtils';
import './Admin.css';
import './AdminExams.css';

const EXAM_TYPES = [
    { value: 'semester', label: 'Semester Exam', badge: 'SEM', icon: GraduationCap, color: 'type-semester' },
    { value: 'mid', label: 'Mid-term Exam', badge: 'MID', icon: FileText, color: 'type-mid' },
    { value: 'supply', label: 'Supply / Re-exam', badge: 'SUP', icon: Zap, color: 'type-supply' },
    { value: 'others', label: 'Others / Regular', badge: 'REG', icon: ClipboardList, color: 'type-others' },
];

const DEPARTMENT_OPTIONS = [
    { value: 'all', label: 'All Departments' },
    { value: 'CSE', label: 'Computer Science (CSE)' },
    { value: 'ECE', label: 'Electronics (ECE)' },
    { value: 'EEE', label: 'Electrical (EEE)' },
    { value: 'MECH', label: 'Mechanical (MECH)' },
    { value: 'CIVIL', label: 'Civil (CIVIL)' },
    { value: 'MME', label: 'Metallurgy (MME)' },
    { value: 'CHEM', label: 'Chemical (CHEM)' },
    { value: 'AIML', label: 'AI & ML (AIML)' }
];

const DAY_OPTIONS = [
    { value: 'Monday', label: 'Monday' },
    { value: 'Tuesday', label: 'Tuesday' },
    { value: 'Wednesday', label: 'Wednesday' },
    { value: 'Thursday', label: 'Thursday' },
    { value: 'Friday', label: 'Friday' },
    { value: 'Saturday', label: 'Saturday' },
    { value: 'Sunday', label: 'Sunday' }
];

const convertTo24Hour = (time12h) => {
    if (!time12h) return '';
    const [time, modifier] = time12h.split(' ');
    if (!time || !modifier) return '';
    let [hours, minutes] = time.split(':');
    if (hours === '12') {
        hours = modifier === 'AM' ? '00' : '12';
    } else if (modifier === 'PM') {
        hours = parseInt(hours, 10) + 12;
    }
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
};

const convertTo12Hour = (time24h) => {
    if (!time24h) return '';
    let [hours, minutes] = time24h.split(':');
    hours = parseInt(hours, 10);
    const modifier = hours >= 12 ? 'PM' : 'AM';
    if (hours === 0) hours = 12;
    if (hours > 12) hours -= 12;
    return `${hours.toString().padStart(2, '0')}:${minutes} ${modifier}`;
};

const QUICK_TEMPLATES = [
    {
        type: 'semester',
        label: 'Semester',
        title: 'Semester Examinations',
        subtitle: 'Regular • April 2026',
        icon: GraduationCap,
    },
    {
        type: 'mid',
        label: 'Mid-term',
        title: 'Mid-term Examinations',
        subtitle: 'MID-1 • 2024 Batch',
        icon: FileText,
    },
];

const DEFAULT_EXAM_ITEM = {
    date: '',
    day: '',
    code: '',
    subject: '',
    credits: '',
    time: '09:30 AM - 12:30 PM'
};

const makeSchedule = (overrides = {}) => ({
    id: Date.now() + Math.random(),
    isVisible: true,
    type: 'others',
    title: 'New Schedule',
    subtitle: '',
    department: 'all',
    exams: [{ ...DEFAULT_EXAM_ITEM }],
    ...overrides,
});

const convertDateFormat = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
};

const AdminExams = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('all');

    const allowedDepartments = DEPARTMENT_OPTIONS.filter(dept => {
        if (dept.value === 'all') {
            return !user?.targetDepartments || user.targetDepartments.length === 0 || user.permissions?.includes('all');
        }
        return isDepartmentAllowed(dept.value, user);
    });
    const [schedules, setSchedules] = useState([]);

    useEffect(() => {
        const fetchExamSchedules = async () => {
            try {
                const docSnap = await getDoc(doc(db, 'settings', 'exam_schedule'));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.schedules && Array.isArray(data.schedules)) {
                        setSchedules(data.schedules.map(s => ({ type: 'others', ...s })));
                    } else if (data.exams) {
                        setSchedules([makeSchedule({
                            id: Date.now(),
                            isVisible: data.isVisible !== undefined ? data.isVisible : true,
                            title: data.title || 'Examinations Schedule',
                            subtitle: data.subtitle || '',
                            type: 'semester',
                            exams: data.exams || [],
                        })]);
                    } else {
                        setSchedules([makeSchedule()]);
                    }
                } else {
                    const initial = [makeSchedule()];
                    setSchedules(initial);
                    await setDoc(doc(db, 'settings', 'exam_schedule'), { schedules: initial });
                }
            } catch (error) {
                console.error('Error fetching exams:', error);
                showToast('Failed to load exam schedules.', 'error');
            } finally {
                setIsLoading(false);
            }
        };
        fetchExamSchedules();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await setDoc(doc(db, 'settings', 'exam_schedule'), { 
                schedules: schedules,
                updatedAt: Date.now()
            });
            showToast('Exam schedules updated successfully!');
        } catch (error) {
            console.error('Error saving exams:', error);
            showToast('Failed to save exam schedules.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddSchedule = (template = null) => {
        const newSchedule = template
            ? makeSchedule({ type: template.type, title: template.title, subtitle: template.subtitle, exams: [], department: activeTab !== 'all' ? activeTab : 'all' })
            : makeSchedule({ title: `Schedule ${schedules.length + 1}`, department: activeTab !== 'all' ? activeTab : 'all' });
        setSchedules(prev => [...prev, newSchedule]);
        showToast(`"${newSchedule.title}" added.`);
    };

    const handleRemoveSchedule = (index) => {
        if (window.confirm('Remove this entire schedule section?')) {
            setSchedules(prev => prev.filter((_, i) => i !== index));
        }
    };

    const handleDuplicateSchedule = (index) => {
        const original = schedules[index];
        const copy = { ...original, id: Date.now() + Math.random(), title: `${original.title} (Copy)` };
        setSchedules(prev => [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)]);
        showToast('Schedule duplicated!');
    };

    const handleMoveSchedule = (index, direction) => {
        const newIdx = index + direction;
        if (newIdx < 0 || newIdx >= schedules.length) return;
        const updated = [...schedules];
        [updated[index], updated[newIdx]] = [updated[newIdx], updated[index]];
        setSchedules(updated);
    };

    const handleScheduleChange = (index, field, value) => {
        setSchedules(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
    };

    const handleAddExam = (scheduleIndex) => {
        setSchedules(prev => prev.map((s, i) =>
            i === scheduleIndex ? { ...s, exams: [...s.exams, { ...DEFAULT_EXAM_ITEM }] } : s
        ));
    };

    const handleRemoveExam = (scheduleIndex, examIndex) => {
        setSchedules(prev => prev.map((s, i) =>
            i === scheduleIndex ? { ...s, exams: s.exams.filter((_, ei) => ei !== examIndex) } : s
        ));
    };

    const handleExamChange = (scheduleIndex, examIndex, field, value) => {
        setSchedules(prev => prev.map((s, i) => {
            if (i !== scheduleIndex) return s;
            return { ...s, exams: s.exams.map((exam, ei) => ei === examIndex ? { ...exam, [field]: value } : exam) };
        }));
    };

    const getTypeInfo = (type) => EXAM_TYPES.find(t => t.value === type) || EXAM_TYPES[3];

    if (isLoading) return <LoadingTransition message="Exam Management Loading" persistent />;

    return (
        <div className="admin-container">
            <div className="page-header-v2">
                <div className="header-accent-bar"></div>
                <div className="header-content-v2">
                    <h1 className="page-title-v2">Exam Management</h1>
                    <p className="page-subtitle-v2">Configure and release examination schedules for all students.</p>
                </div>
                <div className="header-action-btn">
                    <button
                        className="btn-labeled"
                        onClick={() => navigate('/admin/exams/settings')}
                        title="Exam Seating Settings"
                    >
                        <MapPinIcon size={18} />
                        <span>Seating</span>
                    </button>
                    <button
                        className="btn-labeled danger"
                        onClick={() => {
                            if (window.confirm('Are you sure you want to PERMANENTLY delete ALL exam schedules? This cannot be undone.')) {
                                setSchedules([makeSchedule()]);
                                handleSave();
                            }
                        }}
                        title="Clear All Schedules"
                    >
                        <Trash2 size={18} />
                        <span>Clear All</span>
                    </button>
                    <button
                        className="btn-labeled primary"
                        onClick={handleSave}
                        disabled={isSaving}
                        title="Save Changes"
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                </div>
            </div>

            <div className="admin-tabs scrollable-tabs mb-6">
                {allowedDepartments.map(dept => (
                    <button 
                        key={dept.value}
                        className={`admin-tab ${activeTab === dept.value ? 'active' : ''}`}
                        onClick={() => setActiveTab(dept.value)}
                    >
                        {dept.label}
                    </button>
                ))}
            </div>

            <div className="exam-header-actions mb-8 animate-fade-in">
                <div className="quick-add-group">
                    <span className="quick-add-label">Quick Add:</span>
                    {QUICK_TEMPLATES.map((template, idx) => {
                        const TemplateIcon = template.icon;
                        const typeClass = template.type === 'semester' ? 'semester' : 'mid';
                        return (
                            <button
                                key={idx}
                                className={`quick-add-btn quick-add-${typeClass}`}
                                onClick={() => handleAddSchedule(template)}
                            >
                                <TemplateIcon size={14} />
                                {template.label}
                            </button>
                        );
                    })}
                    <button
                        className="quick-add-btn quick-add-custom"
                        onClick={() => handleAddSchedule()}
                    >
                        <Plus size={14} />
                        Custom Section
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-10">
                {schedules.filter(s => activeTab === 'all' || s.department === activeTab).length === 0 && (
                    <div className="empty-exams-state">
                        <div className="empty-exams-icon">
                            <Calendar size={48} strokeWidth={1.5} />
                        </div>
                        <h3>No Schedules Found</h3>
                        <p>There are no schedules for {activeTab === 'all' ? 'any department' : 'this department'}. Use the Quick Add templates above to create one.</p>
                    </div>
                )}
                {schedules.map((schedule, sIdx) => {
                    if (activeTab !== 'all' && schedule.department !== activeTab) return null;
                    if (schedule.department === 'all' && (!user?.targetDepartments || user.targetDepartments.length === 0 || user.permissions?.includes('all')) === false) return null;
                    if (schedule.department !== 'all' && !isDepartmentAllowed(schedule.department, user)) return null;
                    
                    
                    const typeInfo = getTypeInfo(schedule.type);
                    const TypeIcon = typeInfo.icon;
                    return (
                        <div key={schedule.id || sIdx} className={`schedule-section-wrapper ${typeInfo.color}-border animate-fade-in`}>
                            <div className="schedule-section-header">
                                <div className="flex items-center gap-3">
                                    <div className={`schedule-type-badge ${typeInfo.color}`}>
                                        <TypeIcon size={14} />
                                        {typeInfo.badge}
                                    </div>
                                    <h2 className="text-xl font-bold text-[var(--color-text-main)]">
                                        {schedule.title || 'Untitled Schedule'}
                                    </h2>
                                    {!schedule.isVisible && (
                                        <span className="hidden-badge">OFF</span>
                                    )}
                                </div>
                                <div className="section-actions">
                                    <button
                                        className="section-action-btn"
                                        onClick={() => handleMoveSchedule(sIdx, -1)}
                                        disabled={sIdx === 0}
                                        title="Move Up"
                                    >
                                        <ArrowUp size={16} />
                                    </button>
                                    <button
                                        className="section-action-btn"
                                        onClick={() => handleMoveSchedule(sIdx, 1)}
                                        disabled={sIdx === schedules.length - 1}
                                        title="Move Down"
                                    >
                                        <ArrowDown size={16} />
                                    </button>
                                    <button
                                        className="section-action-btn"
                                        onClick={() => handleDuplicateSchedule(sIdx)}
                                        title="Duplicate Section"
                                    >
                                        <Copy size={16} />
                                    </button>
                                    <button
                                        className="section-action-btn danger"
                                        onClick={() => handleRemoveSchedule(sIdx)}
                                        title="Delete Section"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Settings Card */}
                                <div className="section-card lg:col-span-1 h-fit">
                                    <h3 className="text-md font-bold text-[var(--color-text-main)] mb-6 flex items-center gap-2">
                                        <Edit3 size={18} />
                                        Section Settings
                                    </h3>

                                    <div className="flex flex-col gap-5">
                                        {/* Visibility */}
                                        <div className="visibility-card">
                                            <div>
                                                <h4 className="visibility-title">Status</h4>
                                                <p className="visibility-desc">Turn ON to release to students</p>
                                            </div>
                                            <div className="status-indicator-group">
                                                <span className={`status-badge-mini ${schedule.isVisible ? 'on' : 'off'}`}>
                                                    {schedule.isVisible ? 'ON' : 'OFF'}
                                                </span>
                                                <div
                                                    className={`toggle-switch ${schedule.isVisible ? 'active' : ''}`}
                                                    onClick={() => handleScheduleChange(sIdx, 'isVisible', !schedule.isVisible)}
                                                >
                                                    <div className="toggle-knob"></div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Exam Type */}
                                        <div className="admin-form-group mb-0">
                                            <CustomSelect
                                                label="Exam Type"
                                                options={EXAM_TYPES}
                                                value={schedule.type || 'others'}
                                                onChange={(val) => handleScheduleChange(sIdx, 'type', val)}
                                            />
                                        </div>

                                        {/* Target Department */}
                                        <div className="admin-form-group mb-0">
                                            <CustomSelect
                                                label="Target Department"
                                                options={allowedDepartments}
                                                value={schedule.department || 'all'}
                                                onChange={(val) => handleScheduleChange(sIdx, 'department', val)}
                                                upward={true}
                                            />
                                        </div>

                                        {/* Title */}
                                        <div className="admin-form-group mb-0">
                                            <label className="admin-form-label">Schedule Title</label>
                                            <input
                                                type="text"
                                                className="admin-form-input"
                                                value={schedule.title}
                                                onChange={(e) => handleScheduleChange(sIdx, 'title', e.target.value)}
                                                placeholder="e.g. Semester Examinations"
                                            />
                                        </div>

                                        {/* Subtitle */}
                                        <div className="admin-form-group mb-0">
                                            <label className="admin-form-label">Subtitle / Batch Info</label>
                                            <input
                                                type="text"
                                                className="admin-form-input"
                                                value={schedule.subtitle}
                                                onChange={(e) => handleScheduleChange(sIdx, 'subtitle', e.target.value)}
                                                placeholder="e.g. 2024 Batch • April 2026"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Timetable Entries */}
                                <div className="section-card lg:col-span-2">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-md font-bold text-[var(--color-text-main)] flex items-center gap-2">
                                            <Calendar size={18} />
                                            Timetable Entries
                                            <span className="entry-count-badge">{schedule.exams.length}</span>
                                        </h3>
                                        <button
                                            className="bg-[var(--color-brand)] text-white p-2 rounded-lg hover:opacity-90 transition-opacity"
                                            onClick={() => handleAddExam(sIdx)}
                                            title="Add New Exam Entry"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        {schedule.exams.length === 0 ? (
                                            <div className="empty-exams-state">
                                                No exams added yet. Click + to add an entry.
                                            </div>
                                        ) : (
                                            schedule.exams.map((exam, eIdx) => (
                                                <div key={eIdx} className="exam-card-item">
                                                    <button
                                                        className="btn-remove-exam"
                                                        onClick={() => handleRemoveExam(sIdx, eIdx)}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>

                                                    <div className="exam-editor-grid">
                                                        <div className="admin-form-group mb-0 col-span-1">
                                                            <label className="admin-form-label">Date</label>
                                                            <input type="date" className="admin-form-input" 
                                                                value={convertDateFormat(exam.date)}
                                                                onChange={(e) => handleExamChange(sIdx, eIdx, 'date', convertDateFormat(e.target.value))}
                                                                placeholder="DD-MM-YYYY" />
                                                        </div>
                                                        <div className="admin-form-group mb-0 col-span-1">
                                                            <CustomSelect
                                                                label="Day"
                                                                options={DAY_OPTIONS}
                                                                value={exam.day || 'Monday'}
                                                                onChange={(val) => handleExamChange(sIdx, eIdx, 'day', val)}
                                                                upward={true}
                                                            />
                                                        </div>
                                                        <div className="admin-form-group mb-0 col-span-2">
                                                            <label className="admin-form-label">Subject</label>
                                                            <input type="text" className="admin-form-input" value={exam.subject}
                                                                onChange={(e) => handleExamChange(sIdx, eIdx, 'subject', e.target.value)}
                                                                placeholder="Subject Name" />
                                                        </div>
                                                        <div className="admin-form-group mb-0 col-span-1">
                                                            <label className="admin-form-label">Code</label>
                                                            <input type="text" className="admin-form-input" value={exam.code}
                                                                onChange={(e) => handleExamChange(sIdx, eIdx, 'code', e.target.value)}
                                                                placeholder="Code" />
                                                        </div>
                                                        <div className="admin-form-group mb-0 col-span-1">
                                                            <label className="admin-form-label">Credits</label>
                                                            <input type="text" className="admin-form-input" value={exam.credits}
                                                                onChange={(e) => handleExamChange(sIdx, eIdx, 'credits', e.target.value)}
                                                                placeholder="4" />
                                                        </div>
                                                        <div className="admin-form-group mb-0 col-span-3">
                                                            <label className="admin-form-label">Start Time</label>
                                                            <input type="time" className="admin-form-input" 
                                                                value={convertTo24Hour(exam.time?.split(' - ')[0]) || ''}
                                                                onChange={(e) => {
                                                                    const parts = exam.time ? exam.time.split(' - ') : ['', ''];
                                                                    const newStart = convertTo12Hour(e.target.value);
                                                                    handleExamChange(sIdx, eIdx, 'time', `${newStart} - ${parts[1] || '12:30 PM'}`);
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="admin-form-group mb-0 col-span-3">
                                                            <label className="admin-form-label">End Time</label>
                                                            <input type="time" className="admin-form-input" 
                                                                value={convertTo24Hour(exam.time?.split(' - ')[1]) || ''}
                                                                onChange={(e) => {
                                                                    const parts = exam.time ? exam.time.split(' - ') : ['09:30 AM', ''];
                                                                    const newEnd = convertTo12Hour(e.target.value);
                                                                    handleExamChange(sIdx, eIdx, 'time', `${parts[0] || '09:30 AM'} - ${newEnd}`);
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AdminExams;
