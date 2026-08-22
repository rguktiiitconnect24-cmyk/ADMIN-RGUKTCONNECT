import React, { useState, useEffect } from \'react\';
import { useLocation } from \'react-router-dom\';
import { ChevronRight, Users, CheckCircle2, XCircle, Save, ArrowLeft, Search, Calendar, Clock, BookOpen, GraduationCap, Trash2 } from \'lucide-react\';
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp } from \'firebase/firestore\';
import { db, pucDb } from \'../../config/firebase\';
import { useAuth } from \'../../context/AuthContext\';
import { useToast } from \'../../context/ToastContext\';
import { PROGRAMS } from \'../../config/academics\';
import \'./FacultyAttendance.css\';
import CustomSelect from \'../../components/Common/CustomSelect\';
import { fetchDynamicSubjects } from \'../../utils/academicsUtils\';

const branchIdMap = {
    \'CSE\': \'cse\',
    \'ECE\': \'ece\',
    \'EEE\': \'eee\',
    \'Mechanical\': \'me\',
    \'Civil\': \'ce\',
    \'Chemical\': \'che\',
    \'MME\': \'mme\',
    \'AIML\': \'aiml\'
};

const BRANCHES = [\'CSE\', \'ECE\', \'EEE\', \'Mechanical\', \'Civil\', \'Chemical\', \'MME\'];
const SECTIONS = [\'A\', \'B\', \'C\', \'D\', \'E\', \'F\'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7];

const FacultyAttendance = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [step, setStep] = useState(1);
    
    const [selection, setSelection] = useState({
        year: \'\', 
        branch: \'\',
        section: \'\',
        subject: \'\',
        date: new Date().toISOString().split(\'T\')[0],
        period: 1
    });

    const [students, setStudents] = useState([]);
    const [attendanceData, setAttendanceData] = useState({}); 
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState(\'\');

    const [dynamicSubjects, setDynamicSubjects] = useState([]);
    const [loadingSubjects, setLoadingSubjects] = useState(false);

    // History feature state
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyRecords, setHistoryRecords] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [isEditingMode, setIsEditingMode] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const location = useLocation();

    useEffect(() => {
        if (step === 5 && students.length > 0) {
            loadSavedAttendance(selection.date, students);
        }
    }, [selection.date]);

    useEffect(() => {
        if (location.state && location.state.step) {
            setSelection(prev => ({
                ...prev,
                year: location.state.year || prev.year,
                branch: location.state.branch || prev.branch,
                section: location.state.section || prev.section,
                subject: location.state.subject || prev.subject
            }));
            setStep(location.state.step);
            
            // Clear state so a refresh doesn\'t trigger it again
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    useEffect(() => {
        if (step === 5 && students.length === 0 && !loading && selection.year && selection.section) {
            fetchStudents();
        }
    }, [step, selection.year, selection.section]);

    useEffect(() => {
        if (step === 4 && selection.year && selection.branch) {
            const loadSubjects = async () => {
                setLoadingSubjects(true);
                try {
                    const programId = selection.year.startsWith(\'btech\') ? \'btech\' : \'puc\';
                    const branchId = branchIdMap[selection.branch];
                    
                    const sem1Subs = await fetchDynamicSubjects(programId, selection.year, branchId, \'sem1\');
                    const sem2Subs = await fetchDynamicSubjects(programId, selection.year, branchId, \'sem2\');
                    
                    setDynamicSubjects([
                        { id: \'sem1\', label: \'Semester - I\', subjects: sem1Subs },
                        { id: \'sem2\', label: \'Semester - II\', subjects: sem2Subs }
                    ]);
                } catch (error) {
                    console.error("Failed to load subjects", error);
                } finally {
                    setLoadingSubjects(false);
                }
            };
            loadSubjects();
        }
    }, [step, selection.year, selection.branch]);

    const updateSelection = (field, value) => {
        setSelection(prev => ({ ...prev, [field]: value }));
    };

    const fetchStudents = async () => {
        if (!selection.year || !selection.section) return;
        
        setLoading(true);
        try {
            let targetClass = selection.year;
            let targetClasses = [];
            if (targetClass === \'puc1\') targetClasses = [\'PUC-01\', \'PUC1\', \'PUC-1\', \'PUC 1\', \'P1\'];
            if (targetClass === \'puc2\') targetClasses = [\'PUC-02\', \'PUC2\', \'PUC-2\', \'PUC 2\', \'P2\'];
            if (targetClass === \'btech1\') targetClasses = [\'BTECH-01\', \'BTECH-1\', \'B.TECH-1\', \'BTECH 1\', \'B.TECH 1\', \'E-01\', \'E1\', \'E-1\', \'ENGINEERING 1\'];
            if (targetClass === \'btech2\') targetClasses = [\'BTECH-02\', \'BTECH-2\', \'B.TECH-2\', \'BTECH 2\', \'B.TECH 2\', \'E-02\', \'E2\', \'E-2\', \'ENGINEERING 2\'];
            if (targetClass === \'btech3\') targetClasses = [\'BTECH-03\', \'BTECH-3\', \'B.TECH-3\', \'BTECH 3\', \'B.TECH 3\', \'E-03\', \'E3\', \'E-3\', \'ENGINEERING 3\'];
            if (targetClass === \'btech4\') targetClasses = [\'BTECH-04\', \'BTECH-4\', \'B.TECH-4\', \'BTECH 4\', \'B.TECH 4\', \'E-04\', \'E4\', \'E-4\', \'ENGINEERING 4\'];

            let usersRef = collection(db, \'users\');
            
            // Optimize: Query only users with role \'student\' to massively reduce the download size
            const q = query(usersRef, where(\'role\', \'==\', \'student\'));
            const snapshot = await getDocs(q);
            
            // Filter locally by class/year, branch, and section
            let data = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(s => {
                    const classSec = (s.classSection || s.currentClass || \'\').toUpperCase().replace(/\\s+/g, \'\');
                    
                    // 1. Check Year Match
                    let isYearMatch = targetClasses.some(tc => {
                        const tcClean = tc.toUpperCase().replace(/\\s+/g, \'\');
                        return classSec === tcClean || classSec.startsWith(tcClean + \'-\') || classSec.startsWith(tcClean);
                    });
                    
                    // Fallback: If DB is messy and currentClass is just the branch/section name without a year
                    const hasYearIndicator = [\'E1\',\'E2\',\'E3\',\'E4\',\'E-\',\'P1\',\'P2\',\'PUC\',\'BTECH\'].some(y => classSec.includes(y));
                    if (!isYearMatch && !hasYearIndicator) {
                        if (selection.section && classSec.includes(selection.section.toUpperCase().replace(/\\s+/g, \'\'))) {
                            isYearMatch = true;
                        }
                        if (selection.branch && classSec.includes(selection.branch.toUpperCase().replace(/\\s+/g, \'\'))) {
                            isYearMatch = true;
                        }
                    }

                    if (!isYearMatch) return false;

                    // 2. Check Branch Match
                    if (selection.branch && selection.branch !== \'PUC\') {
                        const branch = (s.branch || s.department || \'\').toUpperCase();
                        const selBranch = selection.branch.toUpperCase();
                        if (!branch.includes(selBranch) && !selBranch.includes(branch) && !classSec.includes(selBranch)) {
                            return false;
                        }
                    }

                    // 3. Check Section Match
                    if (selection.section && selection.section !== \'All\') {
                        const sec = (s.section || \'\').toUpperCase();
                        const selSec = selection.section.toUpperCase();
                        
                        const classSecMatchesSection = classSec.endsWith(`-${selSec}`) || classSec.endsWith(selSec) || classSec.includes(selSec) || classSec === selSec;
                        
                        if (sec !== selSec && !classSecMatchesSection) {
                            return false;
                        }
                    }
                    
                    return true;
                });

            data.sort((a, b) => (a.id || \'\').localeCompare(b.id || \'\'));

            setStudents(data);
            
            // Load saved attendance for the current date, if any
            await loadSavedAttendance(selection.date, data);
            
        } catch (error) {
            console.error("Error fetching students:", error);
            showToast("Failed to load students", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        if (step === 1 && selection.year) {
            if (selection.year.startsWith(\'puc\')) {
                setSelection(prev => ({ ...prev, branch: \'PUC\' }));
                setStep(3);
            } else {
                setStep(2);
            }
        } else if (step === 2 && selection.branch) {
            setStep(3);
        } else if (step === 3 && selection.section) {
            setStep(4);
        } else if (step === 4 && selection.subject && selection.date && selection.period) {
            setStep(5);
            fetchStudents();
        }
    };

    const handleBack = () => {
        if (step > 1) {
            if (step === 3 && selection.year.startsWith(\'puc\')) {
                setStep(1);
            } else {
                setStep(step - 1);
            }
        }
    };

    const markAll = (status) => {
        const newData = { ...attendanceData };
        students.forEach(s => {
            newData[s.id] = status;
        });
        setAttendanceData(newData);
    };

    const toggleAttendance = (studentId) => {
        setAttendanceData(prev => ({
            ...prev,
            [studentId]: prev[studentId] === \'present\' ? \'absent\' : \'present\'
        }));
    };

    const handleSubmit = async () => {
        if (!students.length) return;
        
        setIsSubmitting(true);
        try {
            const batch = writeBatch(db);
            const attendanceRef = collection(db, \'attendance\');

            students.forEach(student => {
                const recordId = `${student.id}_${selection.date}_${selection.subject.replace(/\\s+/g, \'\')}`;
                const docRef = doc(attendanceRef, recordId);
                
                batch.set(docRef, {
                    studentId: student.id,
                    rollNo: student.studentId || student.id,
                    name: student.fullName || student.name || \'Unknown\',
                    year: selection.year,
                    branch: selection.branch,
                    section: selection.section,
                    subjectId: selection.subject,
                    date: selection.date,
                    status: attendanceData[student.id] || \'absent\',
                    facultyId: user.studentId || user.uid,
                    timestamp: serverTimestamp()
                });
            });

            await batch.commit();
            showToast("Attendance submitted successfully!", "success");
            
        } catch (error) {
            console.error("Error submitting attendance:", error);
            showToast("Failed to submit attendance", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // History Functions
    const loadSavedAttendance = async (dateToLoad, currentStudents = students) => {
        if (!currentStudents.length) return;
        setLoading(true);
        try {
            const attendanceRef = collection(db, \'attendance\');
            const q = query(
                attendanceRef,
                where(\'subjectId\', \'==\', selection.subject),
                where(\'year\', \'==\', selection.year),
                where(\'section\', \'==\', selection.section),
                where(\'date\', \'==\', dateToLoad)
            );
            
            const snapshot = await getDocs(q);
            
            const newAttendanceData = {};
            // First default to present
            currentStudents.forEach(s => {
                newAttendanceData[s.id] = \'present\';
            });
            
            // Override with saved records
            if (!snapshot.empty) {
                setIsEditingMode(true);
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (newAttendanceData[data.studentId] !== undefined) {
                        newAttendanceData[data.studentId] = data.status;
                    }
                });
            } else {
                setIsEditingMode(false);
            }
            
            setAttendanceData(newAttendanceData);
        } catch (error) {
            console.error("Error loading saved attendance:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        setLoadingHistory(true);
        setShowHistoryModal(true);
        try {
            const attendanceRef = collection(db, \'attendance\');
            const q = query(
                attendanceRef,
                where(\'subjectId\', \'==\', selection.subject),
                where(\'year\', \'==\', selection.year),
                where(\'section\', \'==\', selection.section)
            );
            
            const snapshot = await getDocs(q);
            
            // Group by date
            const dateMap = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                if (!dateMap[data.date]) {
                    dateMap[data.date] = { date: data.date, total: 0, present: 0 };
                }
                dateMap[data.date].total += 1;
                if (data.status === \'present\') {
                    dateMap[data.date].present += 1;
                }
            });
            
            // Convert to array and sort descending
            const historyArray = Object.values(dateMap).sort((a, b) => new Date(b.date) - new Date(a.date));
            setHistoryRecords(historyArray);
        } catch (error) {
            console.error("Error fetching history:", error);
            showToast("Failed to load attendance history", "error");
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleDeleteHistoryDate = async (dateToDelete) => {
        if (!window.confirm(`Are you sure you want to delete all attendance records for ${selection.subject} on ${dateToDelete}?`)) return;

        setLoadingHistory(true);
        try {
            const attendanceRef = collection(db, \'attendance\');
            const q = query(
                attendanceRef,
                where(\'subjectId\', \'==\', selection.subject),
                where(\'year\', \'==\', selection.year),
                where(\'section\', \'==\', selection.section),
                where(\'date\', \'==\', dateToDelete)
            );
            
            const snapshot = await getDocs(q);
            const batch = writeBatch(db);
            
            snapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            showToast(`Attendance for ${dateToDelete} deleted`, "success");
            
            // If deleting currently viewed date, reload its attendance (which will now default to present)
            if (dateToDelete === selection.date) {
                await loadSavedAttendance(selection.date);
            }
            
            // Refresh history list
            await fetchHistory();
            
        } catch (error) {
            console.error("Error deleting date attendance:", error);
            showToast("Failed to delete attendance", "error");
            setLoadingHistory(false); // only on error since fetchHistory clears it on success
        }
    };

    const handleEditHistoryDate = async (dateToEdit) => {
        setShowHistoryModal(false);
        setSelection(prev => ({ ...prev, date: dateToEdit }));
        await loadSavedAttendance(dateToEdit);
        showToast(`Loaded attendance for ${dateToEdit}`, "info");
    };

    const filteredStudents = students.filter(s => 
        (s.fullName || \'\').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (s.studentId || s.id).toLowerCase().includes(searchTerm.toLowerCase())
    );

    const renderWizard = () => {
        return (
            <div className="attendance-wizard">
                <div className="wizard-progress">
                    <div className="progress-bar" style={{ width: `${((step - 1) / 4) * 100}%` }}></div>
                </div>

                {step === 1 && (
                    <div className="wizard-step animate-fade-in">
                        <h3>Select Academic Year</h3>
                        <div className="grid-options">
                            {PROGRAMS.map(prog => prog.years.map(year => (
                                <button 
                                    key={year.id}
                                    className={`option-btn ${selection.year === year.id ? \'selected\' : \'\'}`}
                                    onClick={() => { updateSelection(\'year\', year.id); }}
                                >
                                    <GraduationCap size={24} className="mb-2 mx-auto" />
                                    <span>{year.label}</span>
                                </button>
                            )))}
                        </div>
                        <button 
                            className="btn-primary mt-6 w-full flex-center gap-2 py-3"
                            disabled={!selection.year}
                            onClick={handleNext}
                        >
                            Next <ChevronRight size={18} />
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="wizard-step animate-fade-in">
                        <div className="flex items-center gap-4 mb-4">
                            <button onClick={handleBack} className="btn-icon"><ArrowLeft size={20} /></button>
                            <h3>Select Branch</h3>
                        </div>
                        <div className="grid-options">
                            {BRANCHES.map(branch => (
                                <button 
                                    key={branch}
                                    className={`option-btn ${selection.branch === branch ? \'selected\' : \'\'}`}
                                    onClick={() => { updateSelection(\'branch\', branch); }}
                                >
                                    <span>{branch}</span>
                                </button>
                            ))}
                        </div>
                        <button 
                            className="btn-primary mt-6 w-full flex-center gap-2 py-3"
                            disabled={!selection.branch}
                            onClick={handleNext}
                        >
                            Next <ChevronRight size={18} />
                        </button>
                    </div>
                )}

                {step === 3 && (
                    <div className="wizard-step animate-fade-in">
                        <div className="flex items-center gap-4 mb-4">
                            <button onClick={handleBack} className="btn-icon"><ArrowLeft size={20} /></button>
                            <h3>Select Section</h3>
                        </div>
                        <div className="grid-options">
                            {SECTIONS.map(section => (
                                <button 
                                    key={section}
                                    className={`option-btn ${selection.section === section ? \'selected\' : \'\'}`}
                                    onClick={() => { updateSelection(\'section\', section); }}
                                >
                                    <span className="text-xl font-bold">Section {section}</span>
                                </button>
                            ))}
                        </div>
                        <button 
                            className="btn-primary mt-6 w-full flex-center gap-2 py-3"
                            disabled={!selection.section}
                            onClick={handleNext}
                        >
                            Next <ChevronRight size={18} />
                        </button>
                    </div>
                )}

                {step === 4 && (
                    <div className="wizard-step animate-fade-in">
                        <div className="flex items-center gap-4 mb-6">
                            <button onClick={handleBack} className="btn-icon"><ArrowLeft size={20} /></button>
                            <h3>Class Details</h3>
                        </div>
                        
                        <div className="form-group mb-6">
                            <label className="mb-2 block"><BookOpen size={16}/> Select Subject</label>
                            {loadingSubjects ? (
                                <div className="text-center py-4 text-gray-500">Loading subjects...</div>
                            ) : (
                                <div className="space-y-6">
                                    {dynamicSubjects.map(semester => (
                                        semester.subjects.length > 0 && (
                                            <div key={semester.id}>
                                                <h4 className="font-semibold text-gray-800 mb-3 border-b pb-2">{semester.label}</h4>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                    {semester.subjects.map(sub => (
                                                        <button
                                                            key={sub.id}
                                                            className={`p-3 text-left border rounded-xl transition-all ${selection.subject === sub.label ? \'border-primary-main bg-primary-50 shadow-sm\' : \'border-gray-200 hover:border-primary-300 hover:bg-gray-50\'}`}
                                                            onClick={() => updateSelection(\'subject\', sub.label)}
                                                        >
                                                            <div className="font-semibold text-gray-800 text-sm">{sub.label}</div>
                                                            <div className="text-xs text-gray-500 mt-1 flex gap-2">
                                                                {sub.credits && <span>{sub.credits} CREDITS</span>}
                                                                {sub.type && <span>• {sub.type.toUpperCase()}</span>}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    ))}
                                    {dynamicSubjects.every(sem => sem.subjects.length === 0) && (
                                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                                            No subjects found for this branch. Please assign subjects in Course Content Management.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        {/* Date and Period inputs moved to Step 5 */}

                        <button 
                            className="btn-primary w-full flex-center gap-2 py-3 flex justify-center"
                            disabled={!selection.subject}
                            onClick={handleNext}
                        >
                            Load Students <ChevronRight size={18} />
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const renderHistoryPage = () => {
        return (
            <div className="history-page-container animate-fade-in py-2">
                <style>{`
                    .history-card {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 1.25rem 1.5rem;
                        background-color: #ffffff;
                        border: 1px solid #e5e7eb;
                        border-radius: 0.75rem;
                        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                        transition: all 0.2s ease;
                        margin-bottom: 1rem;
                        flex-wrap: wrap;
                        gap: 1rem;
                    }
                    .history-card:hover {
                        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                        border-color: #c7d2fe;
                        transform: translateY(-1px);
                    }
                    .history-date {
                        font-size: 1.125rem;
                        font-weight: 700;
                        color: #1f2937;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        margin-bottom: 0.25rem;
                    }
                    .history-stats {
                        font-size: 0.9rem;
                        color: #6b7280;
                    }
                    .history-stats strong {
                        color: #059669;
                    }
                    .history-actions {
                        display: flex;
                        gap: 0.75rem;
                        align-items: center;
                    }
                    .history-btn {
                        padding: 0.6rem 1.5rem;
                        border-radius: 0.5rem;
                        font-weight: 600;
                        font-size: 0.875rem;
                        cursor: pointer;
                        transition: all 0.2s;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 0.375rem;
                    }
                    .btn-edit {
                        background-color: #eff6ff;
                        color: #2563eb;
                        border: 1px solid #bfdbfe;
                    }
                    .btn-edit:hover {
                        background-color: #dbeafe;
                        border-color: #93c5fd;
                    }
                    .btn-delete {
                        background-color: #fff1f2;
                        color: #e11d48;
                        border: 1px solid #fecdd3;
                    }
                    .btn-delete:hover {
                        background-color: #ffe4e6;
                        border-color: #fda4af;
                    }
                `}</style>
                <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                            <Clock className="text-indigo-600" size={28} />
                            Attendance History
                        </h3>
                        <div className="mt-2 text-sm text-gray-600 font-medium flex items-center gap-2">
                            <span className="font-bold text-gray-800">{selection.year} • Sec {selection.section}</span> 
                            <span className="text-gray-400">—</span> 
                            <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-md">{selection.subject}</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowHistoryModal(false)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-800"
                    >
                        <XCircle size={28} />
                    </button>
                </div>
                
                <div className="history-list-container">
                    {loadingHistory ? (
                        <div className="flex justify-center p-16">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : historyRecords.length === 0 ? (
                        <div className="text-center p-16 text-gray-500 border border-dashed border-gray-300 rounded-xl bg-gray-50">
                            <Clock className="mx-auto mb-4 text-gray-400" size={48} />
                            <p className="text-lg">No attendance history found for this class and subject.</p>
                        </div>
                    ) : (
                        <div>
                            {historyRecords.map(record => (
                                <div key={record.date} className="history-card">
                                    <div>
                                        <div className="history-date">
                                            <Calendar size={18} color="#6366f1" />
                                            {record.date}
                                        </div>
                                        <div className="history-stats">
                                            <strong>{record.present} / {record.total} Present</strong> ({(record.present/record.total*100).toFixed(0)}%)
                                        </div>
                                    </div>
                                    <div className="history-actions">
                                        <button
                                            onClick={() => handleEditHistoryDate(record.date)}
                                            className="history-btn btn-edit"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteHistoryDate(record.date)}
                                            className="history-btn btn-delete"
                                        >
                                            <Trash2 size={16} /> Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderAttendanceSheet = () => {
        return (
            <div className="attendance-sheet animate-fade-in">
                <div style={{
                    backgroundColor: \'#fff\',
                    padding: \'1.5rem\',
                    borderRadius: \'1rem\',
                    boxShadow: \'0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)\',
                    border: \'1px solid #f3f4f6\',
                    marginBottom: \'1.5rem\',
                    position: \'relative\',
                    overflow: \'hidden\'
                }}>
                    <div style={{
                        position: \'absolute\', top: 0, left: 0, width: \'100%\', height: \'4px\',
                        background: \'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)\'
                    }}></div>
                    
                    <div style={{ display: \'flex\', flexWrap: \'wrap\', justifyContent: \'space-between\', alignItems: \'flex-start\', gap: \'1.5rem\' }}>
                        <div>
                            <button onClick={handleBack} style={{
                                background: \'none\', border: \'none\', color: \'#4f46e5\', cursor: \'pointer\',
                                fontSize: \'0.875rem\', fontWeight: \'600\', display: \'flex\', alignItems: \'center\', gap: \'0.25rem\',
                                marginBottom: \'0.75rem\', padding: 0
                            }}>
                                <ArrowLeft size={14} /> Back to Class Selection
                            </button>
                            <h2 style={{ fontSize: \'1.5rem\', fontWeight: \'800\', color: \'#1f2937\', margin: \'0 0 0.5rem 0\', letterSpacing: \'-0.025em\' }}>
                                {selection.year} {selection.branch !== \'PUC\' ? `• ${selection.branch}` : \'\'} • Sec {selection.section}
                            </h2>
                            <div style={{ display: \'flex\', alignItems: \'center\', gap: \'0.5rem\', color: \'#6b7280\', fontWeight: \'500\', flexWrap: \'wrap\' }}>
                                <BookOpen size={16} color="#6366f1"/> 
                                <span style={{ backgroundColor: \'#e0e7ff\', color: \'#4338ca\', padding: \'0.25rem 0.75rem\', borderRadius: \'0.375rem\', fontSize: \'0.875rem\' }}>
                                    {selection.subject}
                                </span>
                                <span style={{ backgroundColor: \'#f3f4f6\', color: \'#4b5563\', padding: \'0.25rem 0.75rem\', borderRadius: \'0.375rem\', fontSize: \'0.875rem\', display: \'flex\', alignItems: \'center\', gap: \'0.375rem\' }}>
                                    <Users size={14} color="#6b7280"/>
                                    {filteredStudents.length} {filteredStudents.length === 1 ? \'Student\' : \'Students\'}
                                </span>
                            </div>
                        </div>
                        
                        <div style={{
                            display: \'flex\', flexWrap: \'wrap\', alignItems: \'center\', gap: \'1rem\',
                            backgroundColor: \'#f9fafb\', padding: \'0.75rem\', borderRadius: \'0.75rem\', border: \'1px solid #f3f4f6\'
                        }}>
                            <div style={{ display: \'flex\', alignItems: \'center\', gap: \'0.5rem\', borderRight: \'1px solid #e5e7eb\', paddingRight: \'1rem\' }}>
                                <div style={{ backgroundColor: \'#fff\', padding: \'0.5rem\', borderRadius: \'0.5rem\', border: \'1px solid #e5e7eb\', display: \'flex\', alignItems: \'center\', gap: \'0.5rem\' }}>
                                    <Calendar size={16} color="#6366f1"/>
                                    <input 
                                        type="date" 
                                        style={{ border: \'none\', outline: \'none\', background: \'transparent\', fontSize: \'0.875rem\', fontWeight: \'600\', color: \'#374151\', cursor: \'pointer\' }}
                                        value={selection.date}
                                        onChange={(e) => updateSelection(\'date\', e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            <div style={{ display: \'flex\', gap: \'0.5rem\' }}>
                                <button 
                                    style={{
                                        backgroundColor: \'#fff\', color: \'#4b5563\', padding: \'0.5rem 1rem\', borderRadius: \'0.5rem\', border: \'1px solid #d1d5db\',
                                        display: \'flex\', alignItems: \'center\', gap: \'0.5rem\', fontWeight: \'600\', cursor: \'pointer\', boxShadow: \'0 1px 2px rgba(0, 0, 0, 0.05)\'
                                    }}
                                    onClick={fetchHistory}
                                    disabled={loading || students.length === 0}
                                >
                                    <Clock size={16}/> History
                                </button>
                                <button onClick={() => markAll(\'present\')} style={{
                                    backgroundColor: \'#10b981\', color: \'#fff\', padding: \'0.5rem 1rem\', borderRadius: \'0.5rem\', border: \'none\',
                                    display: \'flex\', alignItems: \'center\', gap: \'0.5rem\', fontWeight: \'600\', cursor: \'pointer\', boxShadow: \'0 2px 4px rgba(16, 185, 129, 0.2)\'
                                }}>
                                    <CheckCircle2 size={16}/> All Present
                                </button>
                                <button onClick={() => markAll(\'absent\')} style={{
                                    backgroundColor: \'#f43f5e\', color: \'#fff\', padding: \'0.5rem 1rem\', borderRadius: \'0.5rem\', border: \'none\',
                                    display: \'flex\', alignItems: \'center\', gap: \'0.5rem\', fontWeight: \'600\', cursor: \'pointer\', boxShadow: \'0 2px 4px rgba(244, 63, 94, 0.2)\'
                                }}>
                                    <XCircle size={16}/> All Absent
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ position: \'relative\', marginBottom: \'1.5rem\' }}>
                    <div style={{ position: \'absolute\', top: \'50%\', left: \'1rem\', transform: \'translateY(-50%)\', pointerEvents: \'none\', display: \'flex\', alignItems: \'center\' }}>
                        <Search color="#9ca3af" size={18} />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Search students by Name or ID..." 
                        style={{
                            width: \'100%\', padding: \'0.75rem 1rem 0.75rem 2.75rem\', backgroundColor: \'#fff\',
                            border: \'1px solid #e5e7eb\', borderRadius: \'0.75rem\', boxShadow: \'0 1px 2px 0 rgba(0, 0, 0, 0.05)\',
                            outline: \'none\', transition: \'border-color 0.2s\', fontSize: \'0.95rem\'
                        }}
                        onFocus={(e) => e.target.style.borderColor = \'#6366f1\'}
                        onBlur={(e) => e.target.style.borderColor = \'#e5e7eb\'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}