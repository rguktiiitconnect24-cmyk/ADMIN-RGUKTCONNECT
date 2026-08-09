import { Calendar, Plus, Check, Trash2, Edit2, Loader2, Save, Clock, Link, X, Unlink } from 'lucide-react';
import LoadingTransition from '../../components/Common/LoadingTransition';
import CustomSelect from '../../components/Common/CustomSelect';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { useToast } from '../../context/ToastContext';
import { isDepartmentAllowed } from '../../utils/rbacUtils';
import './Admin.css';

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const periods = ["P1", "P2", "P3", "P4", "P5", "P6", "P7"];

const timeline = [
    { start: '08:30', end: '09:30', label: 'P1', type: 'period', index: 0 },
    { start: '09:30', end: '10:30', label: 'P2', type: 'period', index: 1 },
    { start: '10:30', end: '10:40', label: 'Short Break', type: 'break' },
    { start: '10:40', end: '11:40', label: 'P3', type: 'period', index: 2 },
    { start: '11:40', end: '12:40', label: 'P4', type: 'period', index: 3 },
    { start: '12:40', end: '13:40', label: 'Lunch Break', type: 'break' },
    { start: '13:40', end: '14:40', label: 'P5', type: 'period', index: 4 },
    { start: '14:40', end: '15:40', label: 'P6', type: 'period', index: 5 },
    { start: '15:40', end: '15:50', label: 'Short Break', type: 'break' },
    { start: '15:50', end: '16:50', label: 'P7', type: 'period', index: 6 }
];

const TimetableManagement = () => {
    const { showToast } = useToast();
    const { user } = useAuth();
    const [adminUser, setAdminUser] = useState(null);
    
    const branches = ['CSE(AI&ML)', 'CSE', 'ECE', 'EEE', 'CE', 'ME', 'MME', 'CHE']
        .filter(dept => isDepartmentAllowed(dept, user));
    const branchFullNames = {
        'CSE(AI&ML)': 'Computer Science & Engineering (AI & ML)',
        'CSE': 'Computer Science & Engineering',
        'ECE': 'Electronics & Communication Engineering',
        'EEE': 'Electrical & Electronics Engineering',
        'CE': 'Civil Engineering',
        'ME': 'Mechanical Engineering',
        'MME': 'Metallurgical & Materials Engineering',
        'CHE': 'Chemical Engineering'
    };
    const [selectedBranch, setSelectedBranch] = useState('');
    const [selectedSection, setSelectedSection] = useState('');

    // Dynamically set sections based on selected branch
    const availableSections = selectedBranch === 'CSE(AI&ML)' 
        ? ['AIML'] 
        : (selectedBranch === 'CE' || selectedBranch === 'EEE')
            ? ['A', 'B'] 
            : (selectedBranch === 'CHE' || selectedBranch === 'MME' || selectedBranch === 'ME')
                ? ['A']
                : ['A', 'B', 'C', 'D'];

    // Auto-select initial branch and section
    useEffect(() => {
        if (branches.length > 0 && !selectedBranch) {
            setSelectedBranch(branches[0]);
        }
    }, [branches, selectedBranch]);

    useEffect(() => {
        if (selectedBranch && availableSections.length > 0 && !selectedSection) {
            setSelectedSection(availableSections[0]);
        }
    }, [selectedBranch, availableSections, selectedSection]);
    
    const [schedule, setSchedule] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const [selectedCells, setSelectedCells] = useState([]);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isAutoSave, setIsAutoSave] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        if (isAutoSave && schedule && selectedBranch && selectedSection && isEditMode) {
            const timeout = setTimeout(() => { handleSave(true); }, 1500);
            return () => clearTimeout(timeout);
        }
    }, [schedule, isAutoSave, selectedBranch, selectedSection, isEditMode]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const getCurrentPeriodInfo = () => {
        const now = currentTime;
        const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
        for (const slot of timeline) {
            const [sH, sM] = slot.start.split(':').map(Number);
            const [eH, eM] = slot.end.split(':').map(Number);
            const start = new Date(now); start.setHours(sH, sM, 0, 0);
            const end = new Date(now); end.setHours(eH, eM, 0, 0);
            if (now >= start && now < end) {
                const diff = end - now;
                const mins = Math.floor(diff / 1000 / 60);
                const secs = Math.floor((diff / 1000) % 60);
                const timerStr = `${mins}:${secs.toString().padStart(2, '0')}`;
                return { slot, timerStr, currentDay };
            }
        }
        return null;
    };
    const periodInfo = getCurrentPeriodInfo();

    useEffect(() => {
        const fetchAdminData = async () => {
            if (!user?.uid) return;
            const snapshot = await getDocs(collection(db, 'users'));
            const data = snapshot.docs.find(doc => doc.id === user.uid)?.data();
            setAdminUser(data);
        };
        fetchAdminData();
    }, [user]);

    // Auto-load timetable when branch and section are selected
    useEffect(() => {
        if (selectedBranch && selectedSection) {
            handleLoadTimetable();
        } else {
            setSchedule(null);
            setIsEditMode(false);
        }
    }, [selectedBranch, selectedSection]);

    const handleLoadTimetable = async () => {
        setIsLoading(true);
        setSchedule(null);
        setIsEditMode(false);
        
        try {
            const docRef = doc(db, "timetables", selectedBranch, "sections", selectedSection);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                setSchedule(docSnap.data());
            } else {
                setSchedule(null); // Explicitly null means we show "Create" button
            }
        } catch (error) {
            console.error("Error fetching schedule:", error);
            showToast("Failed to fetch schedule.", "error");
        } finally {
            setTimeout(() => setIsLoading(false), 500);
        }
    };

    const handleCreateNew = () => {
        const emptySchedule = {};
        days.forEach(day => {
            emptySchedule[day] = Array(7).fill("-");
        });
        setSchedule(emptySchedule);
        setIsEditMode(true);
        setSchedule(emptySchedule);
        setIsEditMode(true);
    };



    const handleDelete = async () => {
        if (!window.confirm(`Are you sure you want to permanently delete the timetable for ${selectedBranch} Section ${selectedSection}?`)) return;
        
        setIsLoading(true);
        try {
            const docRef = doc(db, "timetables", selectedBranch, "sections", selectedSection);
            await deleteDoc(docRef);
            showToast("Timetable deleted successfully.");
            setSchedule(null);
            setIsEditMode(false);
        } catch (error) {
            console.error("Error deleting timetable:", error);
            showToast("Failed to delete timetable.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCellClick = (e, day, idx) => {
        if (!isEditMode) return;
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setSelectedCells(prev => {
                const isSelected = prev.some(c => c.day === day && c.idx === idx);
                if (isSelected) return prev.filter(c => !(c.day === day && c.idx === idx));
                if (prev.length > 0 && prev[0].day !== day) return [{day, idx}];
                return [...prev, {day, idx}].sort((a, b) => a.idx - b.idx);
            });
        }
    };

    const handleMerge = () => {
        if (selectedCells.length < 2) return;
        const day = selectedCells[0].day;
        const sortedIdx = selectedCells.map(c => c.idx).sort();
        for (let i = 0; i < sortedIdx.length - 1; i++) {
            if (sortedIdx[i+1] - sortedIdx[i] !== 1) {
                showToast("Only contiguous periods can be merged.", "warning");
                return;
            }
        }
        setSchedule(prev => {
            const newDaySchedule = [...prev[day]];
            for (let i = 1; i < sortedIdx.length; i++) newDaySchedule[sortedIdx[i]] = '\u200B';
            return { ...prev, [day]: newDaySchedule };
        });
        setSelectedCells([]);
    };

    const handleUnmerge = (day, startIdx, colSpan) => {
        setSchedule(prev => {
            const newDaySchedule = [...prev[day]];
            for (let i = 1; i < colSpan; i++) newDaySchedule[startIdx + i] = '-';
            return { ...prev, [day]: newDaySchedule };
        });
        setSelectedCells([]);
    };

    const getCellClass = (value) => {
        if (!value || value === '-' || value.toLowerCase() === 'free') return 'cell-free';
        const val = value.toLowerCase();
        if (val.includes('lab') || val.includes('(l)')) return 'cell-lab';
        if (val.includes('break') || val.includes('(lunch)')) return 'cell-break';
        return 'cell-lecture';
    };

    const handleCellChange = (day, periodIdx, value) => {
        setSchedule(prev => ({
            ...prev, [day]: prev[day].map((item, idx) => idx === periodIdx ? value : item)
        }));
    };

    const handleSave = async (isAutoSaveEvent = false) => {
        if (!selectedBranch || !selectedSection || !schedule) return;
        setIsSaving(true);
        try {
            const docRef = doc(db, "timetables", selectedBranch, "sections", selectedSection);
            // Ensure no history metadata is saved in main document
            const { updatedAt, updatedBy, id, ...cleanSchedule } = schedule; 
            
            await setDoc(docRef, cleanSchedule);

            if (!isAutoSaveEvent) {
                showToast("Timetable saved successfully.");
                setIsEditMode(false);
            }
        } catch (error) {
            console.error("Error saving timetable:", error);
            showToast("Failed to save timetable.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="admin-container p-4 md:p-8">
            <div className="page-header-v2 mb-6">
                <div className="header-accent-bar"></div>
                <div className="header-content-v2 flex flex-col md:flex-row justify-between md:items-center">
                    <div>
                        <h1 className="page-title-v2">Timetable Management</h1>
                        <p className="page-subtitle-v2">Select a branch and section to manage its class schedule.</p>
                    </div>
                </div>
            </div>

            {/* Top Selection Bar */}
            <div className="section-card mb-6 p-4">
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">Branch</label>
                        <CustomSelect 
                            value={selectedBranch}
                            onChange={(val) => {
                                setSelectedBranch(val);
                                setSelectedSection(''); // Reset section when branch changes
                            }}
                            options={[
                                { value: '', label: 'Select Branch' },
                                ...branches.map(b => ({ value: b, label: branchFullNames[b] || b }))
                            ]}
                        />
                    </div>
                    
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">Section</label>
                        <CustomSelect 
                            value={selectedSection}
                            onChange={(val) => setSelectedSection(val)}
                            options={[
                                { value: '', label: 'Select Section' },
                                ...availableSections.map(s => ({
                                    value: s,
                                    label: s === 'AIML' ? 'AIML' : `Section-${s}`
                                }))
                            ]}
                        />
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="section-card min-h-[500px] mb-6 relative">
                {!selectedBranch || !selectedSection ? (
                    // Prompt to Select
                    <div className="absolute inset-0 flex flex-col items-center justify-center animate-fade-in" style={{ color: 'var(--color-text-muted)' }}>
                        <div className="rounded-full flex items-center justify-center mb-6" style={{ width: '5rem', height: '5rem', backgroundColor: 'var(--color-surface-hover)' }}>
                            <Calendar size={40} style={{ opacity: 0.2 }} />
                        </div>
                        <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>Select Branch & Section</h3>
                        <p className="text-sm text-center max-w-sm mt-2">Choose a branch and section from the dropdowns above to view or edit the timetable.</p>
                    </div>
                ) : isLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center animate-fade-in z-10">
                        <Loader2 size={40} className="animate-spin text-[var(--color-primary-500)] mb-4" />
                        <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-muted)' }}>Loading Timetable...</h3>
                    </div>
                ) : !schedule ? (
                    // Create Timetable Prompt
                    <div className="absolute inset-0 flex flex-col items-center justify-center animate-fade-in" style={{ color: 'var(--color-text-muted)' }}>
                        <div className="rounded-full flex items-center justify-center mb-6" style={{ width: '5rem', height: '5rem', backgroundColor: 'var(--color-primary-50)' }}>
                            <Calendar size={40} className="text-[var(--color-primary-500)]" />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-slate-800 dark:text-white">No Timetable Configured</h3>
                        <p className="text-sm text-center max-w-sm mb-6">There is no active class schedule for {selectedBranch} {selectedSection === 'AIML' ? 'AIML' : `Section-${selectedSection}`}.</p>
                        <button 
                            className="btn-primary flex items-center gap-2 px-6 py-3 shadow-lg"
                            onClick={handleCreateNew}
                        >
                            <Plus size={20} />
                            Create New Timetable
                        </button>
                    </div>
                ) : (
                    // Timetable Grid Editor / Viewer
                    <div className="animate-fade-in p-2 md:p-4">
                        <div className="flex flex-row flex-wrap justify-between items-center gap-4 mb-6 bg-[var(--color-background)] p-4 rounded-xl border border-[var(--color-border)] shadow-sm">
                            <div className="flex flex-col gap-4">
                                <h2 className="text-2xl font-black flex items-center gap-3 tracking-tight" style={{ color: 'var(--color-text-main)' }}>
                                    <Calendar size={28} style={{ color: 'var(--color-primary-500)' }} />
                                    {selectedBranch} <span className="mx-1" style={{ color: 'var(--color-text-muted)' }}>|</span> {selectedSection === 'AIML' ? 'AIML' : `Section-${selectedSection}`}
                                </h2>
                                <p className="timetable-badge-active text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-md w-fit shadow-sm">
                                    <Check size={14}/> Active Student Timetable
                                </p>
                            </div>

                            <div className="flex flex-wrap justify-end gap-3 items-center w-auto">
                                {!isEditMode && (
                                    <>
                                        <button className="btn-secondary rounded-full shadow-sm" style={{ color: '#ef4444' }} onClick={handleDelete}>
                                            <Trash2 size={16} /> Delete
                                        </button>
                                        <button className="btn-primary rounded-full shadow-sm" onClick={() => setIsEditMode(true)}>
                                            <Edit2 size={16} /> Edit Schedule
                                        </button>
                                    </>
                                )}
                                {isEditMode && (
                                    <>
                                        <label className="btn-secondary rounded-full flex items-center gap-2 px-4 py-2 cursor-pointer shadow-sm">
                                            <input type="checkbox" className="hidden" checked={isAutoSave} onChange={(e) => setIsAutoSave(e.target.checked)} />
                                            <div className="flex-shrink-0 rounded-full relative transition-colors shadow-inner" style={{ backgroundColor: isAutoSave ? 'var(--color-primary-600)' : 'var(--color-border)', width: '32px', height: '18px', display: 'block' }}>
                                                <div className="absolute rounded-full bg-white transition-all shadow-sm" style={{ left: isAutoSave ? '16px' : '2px', top: '2px', width: '14px', height: '14px' }}></div>
                                            </div>
                                            <span className="font-bold">Auto Save</span>
                                        </label>
                                        <button className="btn-secondary rounded-full shadow-sm" onClick={() => { handleLoadTimetable(); setIsEditMode(false); }}>
                                            Cancel
                                        </button>
                                        <button className="btn-success rounded-full flex items-center gap-2 px-6 py-2 font-bold" onClick={() => handleSave(false)} disabled={isSaving}>
                                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                            {isSaving ? 'Saving...' : 'Save & Publish'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {periodInfo && !isEditMode && (
                            <div className="happening-now-banner animate-elastic-in mb-6 bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-900/20 dark:to-transparent border border-indigo-100 dark:border-indigo-800 p-4 rounded-xl flex justify-between items-center shadow-sm">
                                <div className="live-indicator-group flex items-center gap-3">
                                    <div className="live-pulse-container relative w-3 h-3 flex justify-center items-center">
                                        <span className="live-pulse-ring absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
                                        <span className="live-pulse-dot relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                    </div>
                                    <div className="live-info flex flex-col">
                                        <span className="live-label text-xs font-bold text-red-500 uppercase tracking-wide">Happening Now</span>
                                        <span className="live-subject font-bold text-lg text-slate-800 dark:text-white">
                                            {schedule?.[periodInfo.currentDay]?.[periodInfo.slot.index] || 'Free Period'}
                                        </span>
                                    </div>
                                </div>
                                <div className="live-timer-badge flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-indigo-50 dark:border-slate-700 shadow-sm">
                                    <Clock size={14} className="text-indigo-600" />
                                    <div className="timer-content flex gap-2 items-baseline">
                                        <span className="timer-label text-xs font-medium text-slate-500">Ending In</span>
                                        <span className="timer-value font-bold text-indigo-700 dark:text-indigo-400">{periodInfo.timerStr}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] shadow-sm bg-white dark:bg-[var(--color-surface)]">
                            <table className="timetable-editor-table w-full">
                                <thead>
                                    <tr>
                                        <th className="timetable-header-cell w-24 bg-[var(--color-surface-hover)] p-3 text-left font-bold text-xs uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border)]">Day</th>
                                        {periods.map(p => <th key={p} className="timetable-header-cell bg-[var(--color-surface-hover)] p-3 text-center font-bold text-xs uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border)]">{p}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {days.map(day => {
                                        const cells = [];
                                        const daySchedule = schedule[day] || Array(7).fill('-');
                                        for (let i = 0; i < 7; i++) {
                                            if (daySchedule[i] === '\u200B') continue;
                                            let colSpan = 1;
                                            while (i + colSpan < 7 && daySchedule[i + colSpan] === '\u200B') colSpan++;
                                            
                                            const isSelected = selectedCells.some(c => c.day === day && c.idx === i);
                                            const showMergeBtn = isSelected && selectedCells.length > 1 && selectedCells[0].day === day && i === selectedCells[0].idx;
                                            const showUnmergeBtn = isSelected && colSpan > 1;

                                            cells.push(
                                                <td key={`${day}-${i}`} colSpan={colSpan} className="p-0 border border-[var(--color-border)] relative group">
                                                    <div 
                                                        className={`period-cell-wrapper w-full h-16 relative transition-colors ${isSelected ? 'ring-2 ring-primary-500 bg-primary-50' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                                        onClick={(e) => handleCellClick(e, day, i)}
                                                    >
                                                        {showMergeBtn && (
                                                            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-white dark:bg-slate-800 p-1.5 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 flex items-center gap-1.5 z-20 animate-slide-down">
                                                                <button className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm whitespace-nowrap" onClick={(e) => { e.stopPropagation(); handleMerge(); }}>
                                                                    <Link size={14} /> Merge
                                                                </button>
                                                                <button className="flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 p-1.5 rounded-lg transition-colors" onClick={(e) => { e.stopPropagation(); setSelectedCells([]); }}>
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                        {showUnmergeBtn && (
                                                            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-white dark:bg-slate-800 p-1.5 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 flex items-center gap-1.5 z-20 animate-slide-down">
                                                                <button className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm whitespace-nowrap" onClick={(e) => { e.stopPropagation(); handleUnmerge(day, i, colSpan); }}>
                                                                    <Unlink size={14} /> Unmerge
                                                                </button>
                                                                <button className="flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 p-1.5 rounded-lg transition-colors" onClick={(e) => { e.stopPropagation(); setSelectedCells([]); }}>
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                        <div className={`period-cell h-full w-full flex items-center justify-center p-1 ${getCellClass(daySchedule[i])}`}>
                                                            <input
                                                                type="text"
                                                                className="period-input h-full w-full text-center bg-transparent border-none focus:ring-0 outline-none font-semibold text-sm transition-all"
                                                                value={daySchedule[i] || ''}
                                                                onChange={(e) => handleCellChange(day, i, e.target.value)}
                                                                placeholder="-"
                                                                disabled={!isEditMode}
                                                                style={{ cursor: isEditMode ? (selectedCells.length > 0 ? 'pointer' : 'text') : 'default' }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                            );
                                        }
                                        return (
                                            <tr key={day} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]">
                                                <td className="bg-[var(--color-surface-hover)] font-bold text-xs uppercase text-slate-500 py-3 px-4 border-r border-[var(--color-border)] align-middle">
                                                    {day.substring(0, 3)}
                                                </td>
                                                {cells}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {isEditMode && (
                            <div className="editor-tips animate-slide-down mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-5">
                                <h4 className="text-blue-800 dark:text-blue-300 font-bold mb-3 flex items-center gap-2">
                                    <Edit2 size={16} /> Pro Editing Tips
                                </h4>
                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm text-blue-700 dark:text-blue-200">
                                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>Type <strong>-</strong> or <strong>Free</strong> for periods without lectures.</li>
                                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>Add <strong>(L)</strong> or <strong>Lab</strong> to automatically colorize lab sessions.</li>
                                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span><strong>Ctrl+Click</strong> multiple adjacent cells to Merge them into one long period.</li>
                                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>Remember to <strong>Save & Publish</strong> to sync with the student app.</li>
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimetableManagement;
