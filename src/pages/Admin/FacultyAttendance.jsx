import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Users, CheckCircle2, XCircle, Save, ArrowLeft, Search, Calendar, Clock, BookOpen, GraduationCap, Trash2, AlertCircle } from 'lucide-react';
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db, pucDb, contentDb } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PROGRAMS } from '../../config/academics';
import './FacultyAttendance.css';
import CustomSelect from '../../components/Common/CustomSelect';
import { fetchDynamicSubjects } from '../../utils/academicsUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const branchIdMap = {
    'CSE': 'cse',
    'ECE': 'ece',
    'EEE': 'eee',
    'Mechanical': 'me',
    'Civil': 'ce',
    'Chemical': 'che',
    'MME': 'mme',
    'AIML': 'aiml'
};

const BRANCHES = ['CSE', 'ECE', 'EEE', 'Mechanical', 'Civil', 'Chemical', 'MME', 'AIML'];
const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7];

const normalizeDept = (rawBranch) => {
    if (!rawBranch) return '';
    const r = String(rawBranch).toUpperCase();
    if (r.includes('AIML') || r.includes('ARTIFICIAL') || r.includes('AI&ML') || r === 'AI') return 'AIML';
    if (r.includes('ECE') || r.includes('ELECTRONIC')) return 'ECE';
    if (r.includes('CSE') || r.includes('COMPUTER') || r === 'CS') return 'CSE';
    if (r.includes('EEE') || r.includes('ELECTRICAL')) return 'EEE';
    if (r.includes('MECH') || r === 'ME' || r === 'M.E') return 'MECH';
    if (r.includes('CIVIL') || r === 'CE' || r === 'C.E') return 'CIVIL';
    if (r.includes('CHEM') || r === 'CHE') return 'CHEM';
    if (r.includes('MME') || r.includes('METALLURG') || r.includes('MATERIAL')) return 'MME';
    return r.replace(/[^A-Z0-9]/g, '');
};

const FacultyAttendance = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [step, setStep] = useState(() => {
        const saved = sessionStorage.getItem('attendanceStep');
        return saved ? parseInt(saved, 10) : 1;
    });
    
    const [selection, setSelection] = useState(() => {
        const saved = sessionStorage.getItem('attendanceSelection');
        return saved ? JSON.parse(saved) : {
            year: '', 
            branch: '',
            section: '',
            subject: '',
            date: new Date().toISOString().split('T')[0],
            period: 1
        };
    });

    useEffect(() => {
        sessionStorage.setItem('attendanceStep', step.toString());
    }, [step]);

    useEffect(() => {
        sessionStorage.setItem('attendanceSelection', JSON.stringify(selection));
    }, [selection]);

    const [students, setStudents] = useState([]);
    const [historicalStudents, setHistoricalStudents] = useState([]);
    const [attendanceData, setAttendanceData] = useState({}); 
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const allStudents = [...students, ...historicalStudents].sort((a, b) => {
        const idA = String(a.studentId || a.id).toUpperCase();
        const idB = String(b.studentId || b.id).toUpperCase();
        return idA.localeCompare(idB);
    });

    const [dynamicSubjects, setDynamicSubjects] = useState([]);
    const [loadingSubjects, setLoadingSubjects] = useState(false);

    // History feature state
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyRecords, setHistoryRecords] = useState([]);
    const [rawHistoryRecords, setRawHistoryRecords] = useState([]);
    
    // Default date range: last 30 days to today
    const [historyStartDate, setHistoryStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [historyEndDate, setHistoryEndDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });

    const [loadingHistory, setLoadingHistory] = useState(false);
    const [isEditingMode, setIsEditingMode] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    
    const location = useLocation();
    const navigate = useNavigate();

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
            
            // Clear state safely using React Router so a refresh doesn't trigger it again,
            // while preserving the history stack and router keys.
            navigate(location.pathname, { replace: true, state: null });
        }
    }, [location.state, location.pathname, navigate]);

    useEffect(() => {
        if (step === 4 && selection.year && selection.branch) {
            setLoadingSubjects(true);
            const programId = selection.year.startsWith('btech') ? 'btech' : 'puc';
            const branchId = branchIdMap[selection.branch];
            
            const q = query(
                collection(contentDb, 'academic_subjects'),
                where('programId', '==', programId),
                where('yearId', '==', selection.year)
            );
            
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const subjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isDynamic: true }));
                
                const filtered = subjects.filter(s => {
                    if (branchId) {
                        return !s.branchId || s.branchId === branchId || s.branchId === '';
                    }
                    return !s.branchId || s.branchId === '';
                });

                const sorted = filtered.sort((a, b) => {
                    const orderA = a.order !== undefined ? a.order : 999999;
                    const orderB = b.order !== undefined ? b.order : 999999;
                    if (orderA !== orderB) return orderA - orderB;
                    return (a.createdAt || '').localeCompare(b.createdAt || '');
                });
                
                const sem1Subs = sorted.filter(s => s.semesterId === 'sem1');
                const sem2Subs = sorted.filter(s => s.semesterId === 'sem2');
                
                setDynamicSubjects([
                    { id: 'sem1', label: 'Semester - I', subjects: sem1Subs },
                    { id: 'sem2', label: 'Semester - II', subjects: sem2Subs }
                ]);
                setLoadingSubjects(false);
            }, (error) => {
                console.error("Failed to sync live subjects:", error);
                setLoadingSubjects(false);
            });
            
            return () => unsubscribe();
        }
    }, [step, selection.year, selection.branch]);

    const updateSelection = (field, value) => {
        setSelection(prev => ({ ...prev, [field]: value }));
    };

    useEffect(() => {
        if (step !== 5 || !selection.year || !selection.section) return;

        setLoading(true);
        let unsubscribe = () => {};

        const setupLiveStudents = async () => {
            try {
                let targetClass = selection.year;
                let targetClasses = [];
                if (targetClass === 'puc1') targetClasses = ['PUC-01', 'PUC1', 'PUC-1', 'PUC 1', 'P1'];
                if (targetClass === 'puc2') targetClasses = ['PUC-02', 'PUC2', 'PUC-2', 'PUC 2', 'P2'];
                if (targetClass === 'btech1') targetClasses = ['BTECH-01', 'BTECH-1', 'B.TECH-1', 'BTECH 1', 'B.TECH 1', 'E-01', 'E1', 'E-1', 'ENGINEERING 1'];
                if (targetClass === 'btech2') targetClasses = ['BTECH-02', 'BTECH-2', 'B.TECH-2', 'BTECH 2', 'B.TECH 2', 'E-02', 'E2', 'E-2', 'ENGINEERING 2'];
                if (targetClass === 'btech3') targetClasses = ['BTECH-03', 'BTECH-3', 'B.TECH-3', 'BTECH 3', 'B.TECH 3', 'E-03', 'E3', 'E-3', 'ENGINEERING 3'];
                if (targetClass === 'btech4') targetClasses = ['BTECH-04', 'BTECH-4', 'B.TECH-4', 'BTECH 4', 'B.TECH 4', 'E-04', 'E4', 'E-4', 'ENGINEERING 4'];

                // Fetch directly from master database as requested
                const isPuc = selection.year.startsWith('puc');
                const masterRef = collection(isPuc ? pucDb : db, isPuc ? 'puc_students' : 'students_master');
                const masterSnap = await getDocs(masterRef);
                
                const masterData = masterSnap.docs.map(doc => {
                    const d = doc.data();
                    const cleanId = String(d.studentId || d.rollNo || doc.id).toUpperCase().replace(/\s+/g, '').replace(/^RGUKT-/i, '');
                    return {
                        ...d,
                        id: cleanId,
                        augmentedClass: d.classSection || d.currentClass || '',
                        augmentedBranch: d.branch || d.department || '',
                        augmentedSection: d.section || ''
                    };
                });

                // Normalize helpers identical to UserManagement.jsx
                const normalizeClass = (rawClass) => {
                    if (!rawClass) return '';
                    const raw = String(rawClass).toUpperCase().trim();
                    const secMatch = raw.match(/^SECTION[\s\-]*([A-Z])$/i);
                    if (secMatch) return `Section ${secMatch[1]}`;
                    return rawClass;
                };

                let data = masterData.filter(s => {
                    const studentIdUpper = String(s.studentId || s.rollNo || s.id || '').toUpperCase();
                    
                    // 1. Check Year (if explicitly specified in master data)
                    let isYearMatch = false;
                    
                    if (s.yearId === selection.year || s.currentYear === selection.year) {
                        isYearMatch = true;
                    } else {
                        const classSec = (s.augmentedClass || '').toUpperCase().replace(/\s+/g, '');
                        isYearMatch = targetClasses.some(tc => {
                            const tcClean = tc.toUpperCase().replace(/\s+/g, '');
                            return classSec === tcClean || classSec.startsWith(tcClean + '-') || classSec.startsWith(tcClean);
                        });
                    }
                    
                    // If year is not explicitly set or matched, try fallback by roll number prefix
                    if (!isYearMatch) {
                        const is26 = studentIdUpper.includes('26') || studentIdUpper.startsWith('R26') || studentIdUpper.startsWith('S26');
                        const is25 = studentIdUpper.includes('25') || studentIdUpper.startsWith('R25') || studentIdUpper.startsWith('S25');
                        const is24 = studentIdUpper.includes('24') || studentIdUpper.startsWith('R24') || studentIdUpper.startsWith('S24');
                        const is23 = studentIdUpper.includes('23') || studentIdUpper.startsWith('R23') || studentIdUpper.startsWith('S23');
                        const is22 = studentIdUpper.includes('22') || studentIdUpper.startsWith('R22') || studentIdUpper.startsWith('S22');
                        const is21 = studentIdUpper.includes('21') || studentIdUpper.startsWith('R21') || studentIdUpper.startsWith('S21');
                        
                        if (selection.year === 'puc1' && is26) isYearMatch = true;
                        if (selection.year === 'puc2' && is25) isYearMatch = true;
                        if (selection.year === 'btech1' && is24) isYearMatch = true;
                        if (selection.year === 'btech2' && is23) isYearMatch = true;
                        if (selection.year === 'btech3' && is22) isYearMatch = true;
                        if (selection.year === 'btech4' && is21) isYearMatch = true;
                    }
                    
                    // UserManagement exact matching fallback: 
                    // If their class perfectly matches the Section string (e.g. "Section B"), allow them into the selected year
                    if (!isYearMatch && selection.section && selection.section !== 'All') {
                        const selSecClean = selection.section.toUpperCase().replace(/^(?:SECTION|SEC)\s*-?\s*/i, '').trim();
                        const normalizedMasterClass = normalizeClass(s.augmentedClass);
                        const expectedSection = `Section ${selSecClean}`;
                        if (normalizedMasterClass === expectedSection || normalizedMasterClass === selSecClean) {
                            isYearMatch = true;
                        }
                    }

                    if (!isYearMatch) return false;

                    // 2. Check Branch
                    if (selection.branch && selection.branch !== 'PUC') {
                        const mappedBranch = branchIdMap[selection.branch] || selection.branch.toLowerCase();
                        if (s.branchId === mappedBranch || s.departmentId === mappedBranch) {
                            // explicit ID match
                        } else {
                            const branch = (s.augmentedBranch || '').toUpperCase();
                            const selBranch = selection.branch.toUpperCase();
                            const normBranch = normalizeDept(branch);
                            const normSelBranch = normalizeDept(selBranch);
                            
                            if (!(branch && (normBranch === normSelBranch || branch === selBranch))) {
                                // If branch fails, check if class name explicitly includes the branch
                                const classSec = (s.augmentedClass || '').toUpperCase().replace(/\s+/g, '');
                                if (!(normalizeDept(classSec) === normSelBranch || classSec.includes(selBranch))) {
                                    return false;
                                }
                            }
                        }
                    }

                    // 3. Check Section
                    if (selection.section && selection.section !== 'All') {
                        const selSecClean = selection.section.toUpperCase().replace(/^(?:SECTION|SEC)\s*-?\s*/i, '').trim();
                        const normalizedMasterClass = normalizeClass(s.augmentedClass);
                        const expectedSection = `Section ${selSecClean}`;
                        
                        // If it matches UserManagement's exact string
                        if (normalizedMasterClass === expectedSection || s.sectionId?.toUpperCase() === selSecClean) {
                            return true;
                        }

                        // Otherwise try to see if it's embedded in the class name (e.g. BTECH1-CSE-B)
                        const classSec = (s.augmentedClass || '').toUpperCase().replace(/\s+/g, '');
                        const targetSec = selection.section.toUpperCase();
                        const normSelBranch = normalizeDept(selection.branch || '');
                        
                        if (classSec.endsWith(`-${targetSec}`)) return true;
                        if (classSec === targetSec) return true;
                        if (classSec.includes(`${normSelBranch}${targetSec}`)) return true;
                        if (classSec.includes(`${normSelBranch}-${targetSec}`)) return true;
                        
                        const branchEndsWithTarget = normSelBranch.endsWith(targetSec);
                        if (classSec.endsWith(targetSec) && !branchEndsWithTarget) return true;
                        if (classSec.endsWith(targetSec) && branchEndsWithTarget) {
                            if (classSec !== normSelBranch) return true;
                        }
                        
                        return false;
                    }
                    
                    return true;
                });

                data.sort((a, b) => (a.id || '').localeCompare(b.id || ''));
                setStudents(data);
                
                setAttendanceData(prev => {
                    const newData = { ...prev };
                    let hasNew = false;
                    data.forEach(s => {
                        if (newData[s.id] === undefined) {
                            newData[s.id] = 'present';
                            hasNew = true;
                        }
                    });
                    return hasNew ? newData : prev;
                });
                
                setLoading(false);
            } catch (error) {
                console.error("Error setting up student sync from master database:", error);
                setLoading(false);
            }
        };

        setupLiveStudents();

        return () => unsubscribe();
    }, [step, selection.year, selection.branch, selection.section, selection.date]);

    const handleNext = () => {
        if (step === 1 && selection.year) {
            if (selection.year.startsWith('puc')) {
                setSelection(prev => ({ ...prev, branch: 'PUC' }));
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
        }
    };

    const handleBack = () => {
        if (step > 1) {
            if (step === 3 && selection.year.startsWith('puc')) {
                setStep(1);
            } else {
                setStep(step - 1);
            }
        }
    };

    const markAll = (status) => {
        const newData = { ...attendanceData };
        allStudents.forEach(s => {
            newData[s.id] = status;
        });
        setAttendanceData(newData);
    };

    const toggleAttendance = (studentId) => {
        setAttendanceData(prev => ({
            ...prev,
            [studentId]: prev[studentId] === 'present' ? 'absent' : 'present'
        }));
    };

    const handlePreSubmit = () => {
        if (!students.length) return;
        setShowConfirmModal(true);
    };

    const handleSubmit = async () => {
        if (!students.length) return;
        
        setShowConfirmModal(false);
        setIsSubmitting(true);
        try {
            const batch = writeBatch(db);
            const attendanceRef = collection(db, 'attendance');

            allStudents.forEach(student => {
                const recordId = `${student.id}_${selection.date}_${selection.subject.replace(/\s+/g, '')}`;
                const docRef = doc(attendanceRef, recordId);
                
                batch.set(docRef, {
                    studentId: student.id,
                    rollNo: student.studentId || student.id,
                    name: student.fullName || student.name || 'Unknown',
                    year: selection.year,
                    branch: selection.branch,
                    section: selection.section,
                    subjectId: selection.subject,
                    date: selection.date,
                    status: attendanceData[student.id] || 'absent',
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
            const attendanceRef = collection(db, 'attendance');
            const q = query(
                attendanceRef,
                where('subjectId', '==', selection.subject),
                where('year', '==', selection.year),
                where('section', '==', selection.section),
                where('date', '==', dateToLoad)
            );
            
            const snapshot = await getDocs(q);
            
            const newAttendanceData = {};
            // First default to present for LIVE students
            currentStudents.forEach(s => {
                newAttendanceData[s.id] = 'present';
            });
            
            const extraStudentsMap = {};

            // Override with saved records
            if (!snapshot.empty) {
                setIsEditingMode(true);
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (newAttendanceData[data.studentId] !== undefined) {
                        newAttendanceData[data.studentId] = data.status;
                    } else {
                        // This student has a record but is not in the live list (e.g. account deleted)
                        newAttendanceData[data.studentId] = data.status;
                        extraStudentsMap[data.studentId] = {
                            id: data.studentId,
                            studentId: data.rollNo || data.studentId,
                            fullName: data.name || 'Unknown (Deleted Account)',
                            isHistorical: true
                        };
                    }
                });
            } else {
                setIsEditingMode(false);
            }
            
            setHistoricalStudents(Object.values(extraStudentsMap));
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
            const attendanceRef = collection(db, 'attendance');
            const q = query(
                attendanceRef,
                where('subjectId', '==', selection.subject),
                where('year', '==', selection.year),
                where('section', '==', selection.section)
            );
            
            const snapshot = await getDocs(q);
            
            // Group by date and keep raw records
            const dateMap = {};
            const rawRecs = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                rawRecs.push(data);
                
                if (!dateMap[data.date]) {
                    dateMap[data.date] = { date: data.date, total: 0, present: 0 };
                }
                dateMap[data.date].total += 1;
                if (data.status === 'present') {
                    dateMap[data.date].present += 1;
                }
            });
            
            // Convert to array and sort descending
            const historyArray = Object.values(dateMap).sort((a, b) => new Date(b.date) - new Date(a.date));
            setHistoryRecords(historyArray);
            setRawHistoryRecords(rawRecs);
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
            const attendanceRef = collection(db, 'attendance');
            const q = query(
                attendanceRef,
                where('subjectId', '==', selection.subject),
                where('year', '==', selection.year),
                where('section', '==', selection.section),
                where('date', '==', dateToDelete)
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
        setIsReadOnly(false);
        setShowHistoryModal(false);
        setSelection(prev => ({ ...prev, date: dateToEdit }));
        await loadSavedAttendance(dateToEdit);
        showToast(`Loaded attendance for ${dateToEdit}`, "info");
    };

    const handleViewHistoryDate = async (dateToView) => {
        setIsReadOnly(true);
        setShowHistoryModal(false);
        setSelection(prev => ({ ...prev, date: dateToView }));
        await loadSavedAttendance(dateToView);
        showToast(`Viewing attendance for ${dateToView}`, "info");
    };

    const filteredStudents = students.filter(s => 
        (s.fullName || s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (s.studentId || s.id || '').toLowerCase().includes(searchTerm.toLowerCase())
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
                                    className={`option-btn ${selection.year === year.id ? 'selected' : ''}`}
                                    onClick={() => { updateSelection('year', year.id); }}
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
                                    className={`option-btn ${selection.branch === branch ? 'selected' : ''}`}
                                    onClick={() => { updateSelection('branch', branch); }}
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
                                    className={`option-btn ${selection.section === section ? 'selected' : ''}`}
                                    onClick={() => { updateSelection('section', section); }}
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
                                                            className={`p-3 text-left border rounded-xl transition-all ${selection.subject === sub.label ? 'border-primary-main bg-primary-50 shadow-sm' : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'}`}
                                                            onClick={() => updateSelection('subject', sub.label)}
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

    const generateReportData = () => {
        // 1. Filter dates based on selected range
        const filteredDates = historyRecords
            .filter(r => r.date >= historyStartDate && r.date <= historyEndDate)
            .map(r => r.date)
            .sort((a, b) => new Date(a) - new Date(b));

        // 2. Build map of student attendance per date
        // rawHistoryRecords contains { studentId, name, rollNo, date, status, ... }
        const attendanceMatrix = {};
        allStudents.forEach(s => {
            const normalizedId = String(s.studentId || s.id).toUpperCase();
            attendanceMatrix[normalizedId] = {
                id: normalizedId,
                name: s.fullName || s.name || 'Unknown',
                dates: {},
                present: 0,
                total: 0
            };
        });

        // Some historical records might belong to students not in allStudents (if we haven't loaded them yet)
        rawHistoryRecords.forEach(record => {
            if (record.date >= historyStartDate && record.date <= historyEndDate) {
                const normalizedId = String(record.rollNo || record.studentId).toUpperCase();
                if (!attendanceMatrix[normalizedId]) {
                    attendanceMatrix[normalizedId] = {
                        id: normalizedId,
                        name: record.name || 'Unknown',
                        dates: {},
                        present: 0,
                        total: 0
                    };
                }
                // Overwrite if same date occurs (keeps latest)
                attendanceMatrix[normalizedId].dates[record.date] = record.status;
            }
        });

        // Calculate totals for each student based ONLY on the dates that actually occurred in this range
        Object.values(attendanceMatrix).forEach(student => {
            filteredDates.forEach(date => {
                if (student.dates[date]) {
                    student.total += 1;
                    if (student.dates[date] === 'present') student.present += 1;
                }
            });
        });

        const sortedStudents = Object.values(attendanceMatrix).sort((a, b) => a.id.localeCompare(b.id));
        return { filteredDates, sortedStudents };
    };

    const handleExportPDF = () => {
        const { filteredDates, sortedStudents } = generateReportData();
        if (filteredDates.length === 0) {
            showToast("No attendance records found for this date range.", "error");
            return;
        }

        const doc = new jsPDF('landscape');
        
        doc.setFontSize(18);
        doc.text(`Attendance Report - ${selection.subject}`, 14, 22);
        
        doc.setFontSize(11);
        doc.text(`Year: ${selection.year} | Branch: ${selection.branch || 'N/A'} | Section: ${selection.section}`, 14, 30);
        doc.text(`Date Range: ${historyStartDate} to ${historyEndDate}`, 14, 36);

        const tableColumn = ["ID", "Name", ...filteredDates.map(d => d.slice(5)), "Total", "Pres", "%"];
        const tableRows = [];

        sortedStudents.forEach(student => {
            const rowData = [
                student.id,
                student.name,
            ];
            
            filteredDates.forEach(date => {
                const status = student.dates[date];
                rowData.push(status === 'present' ? 'P' : (status === 'absent' ? 'A' : '-'));
            });

            rowData.push(student.total.toString());
            rowData.push(student.present.toString());
            
            const percentage = student.total > 0 ? ((student.present / student.total) * 100).toFixed(0) + '%' : '0%';
            rowData.push(percentage);

            tableRows.push(rowData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            styles: { fontSize: 8, cellPadding: 1 },
            headStyles: { fillColor: [79, 70, 229] }, // Indigo-600
        });

        doc.save(`Attendance_${selection.subject}_${selection.year}_${selection.section}.pdf`);
    };

    const handleExportExcel = () => {
        const { filteredDates, sortedStudents } = generateReportData();
        if (filteredDates.length === 0) {
            showToast("No attendance records found for this date range.", "error");
            return;
        }

        const exportData = sortedStudents.map(student => {
            const row = {
                "Student ID": student.id,
                "Student Name": student.name,
            };

            filteredDates.forEach(date => {
                const status = student.dates[date];
                row[date] = status === 'present' ? 'P' : (status === 'absent' ? 'A' : '-');
            });

            row["Total Classes"] = student.total;
            row["Present"] = student.present;
            row["Absent"] = student.total - student.present;
            row["Percentage"] = student.total > 0 ? ((student.present / student.total) * 100).toFixed(2) + '%' : '0%';

            return row;
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
        
        // Auto-size columns slightly
        const wscols = [
            {wch: 15}, // ID
            {wch: 25}, // Name
        ];
        filteredDates.forEach(() => wscols.push({wch: 10}));
        worksheet['!cols'] = wscols;

        XLSX.writeFile(workbook, `Attendance_${selection.subject}_${selection.year}_${selection.section}.xlsx`);
    };

    const renderHistoryPage = () => {
        const displayedHistory = historyRecords.filter(r => r.date >= historyStartDate && r.date <= historyEndDate);

        return (
            <div className="history-page-container animate-fade-in">
                <style>{`
                    .history-header-wrapper {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        margin-bottom: 2rem;
                        padding-bottom: 1.25rem;
                        border-bottom: 1px solid #f3f4f6;
                    }
                    .history-title-group {
                        display: flex;
                        flex-direction: column;
                        gap: 0.25rem;
                    }
                    .history-title {
                        font-size: 1.75rem;
                        font-weight: 800;
                        color: #1e1b4b; /* Navy */
                        display: flex;
                        align-items: center;
                        gap: 0.75rem;
                        margin: 0;
                        letter-spacing: -0.025em;
                        line-height: 1.2;
                    }
                    .history-subtitle {
                        font-size: 0.9rem;
                        color: #6b7280;
                        font-weight: 500;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        flex-wrap: wrap;
                        margin: 0;
                        margin-left: 2.5rem; /* Aligned with text, offset icon */
                    }
                    .history-badge {
                        background-color: #eef2ff;
                        color: #4338ca;
                        padding: 0.25rem 0.75rem;
                        border-radius: 0.375rem;
                        font-size: 0.875rem;
                        font-weight: 600;
                    }
                    .history-close-btn {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 2.5rem;
                        height: 2.5rem;
                        border-radius: 9999px;
                        background: #f9fafb;
                        border: 1px solid #e5e7eb;
                        color: #6b7280;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        flex-shrink: 0;
                    }
                    .history-close-btn:hover {
                        background: #fef2f2;
                        color: #ef4444;
                        border-color: #fecaca;
                        transform: scale(1.05);
                    }
                    
                    /* Card Styles */
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
                    .btn-view {
                        background-color: #f3f4f6;
                        color: #4b5563;
                        border: 1px solid #e5e7eb;
                    }
                    .btn-view:hover {
                        background-color: #e5e7eb;
                        border-color: #d1d5db;
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
                    .history-filters-bar {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 1rem;
                        align-items: flex-end;
                        background-color: #f9fafb;
                        padding: 1rem;
                        border-radius: 0.75rem;
                        border: 1px solid #e5e7eb;
                        margin-bottom: 1.5rem;
                    }
                    .filter-group {
                        display: flex;
                        flex-direction: column;
                        gap: 0.25rem;
                    }
                    .filter-label {
                        font-size: 0.875rem;
                        font-weight: 500;
                        color: #374151;
                    }
                    .filter-input {
                        padding: 0.5rem;
                        border: 1px solid #d1d5db;
                        border-radius: 0.5rem;
                        font-size: 0.875rem;
                        width: 10rem;
                    }
                    .history-exports {
                        display: flex;
                        gap: 0.5rem;
                        margin-left: auto;
                    }
                    .btn-export {
                        padding: 0.5rem 1rem;
                        border-radius: 0.5rem;
                        font-size: 0.875rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                    }
                    .btn-export-pdf {
                        background-color: #fef2f2;
                        color: #b91c1c;
                        border: 1px solid #fecaca;
                    }
                    .btn-export-pdf:hover {
                        background-color: #fee2e2;
                    }
                    .btn-export-excel {
                        background-color: #f0fdf4;
                        color: #15803d;
                        border: 1px solid #bbf7d0;
                    }
                    .btn-export-excel:hover {
                        background-color: #dcfce7;
                    }
                    @media (max-width: 768px) {
                        .history-title {
                            font-size: 1.5rem;
                        }
                        .history-subtitle {
                            margin-left: 0;
                        }
                        .history-filters-bar {
                            flex-direction: column;
                            align-items: stretch;
                        }
                        .history-exports {
                            margin-left: 0;
                            width: 100%;
                            justify-content: space-between;
                        }
                        .btn-export {
                            flex: 1;
                            justify-content: center;
                        }
                    }
                `}</style>
                
                <div className="history-header-wrapper">
                    <div className="history-title-group">
                        <h3 className="history-title premium-font">
                            <Clock className="text-indigo-600" size={28} strokeWidth={2.5} />
                            Attendance History
                        </h3>
                        <div className="history-subtitle">
                            <span className="font-bold text-gray-700">{selection.year} • Sec {selection.section}</span> 
                            <span className="text-gray-300">—</span> 
                            <span className="history-badge">{selection.subject}</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowHistoryModal(false)}
                        className="history-close-btn"
                        aria-label="Close History"
                    >
                        <XCircle size={22} strokeWidth={2} />
                    </button>
                </div>

                {/* Filters & Export Options */}
                <div className="history-filters-bar">
                    <div className="filter-group">
                        <label className="filter-label">Start Date</label>
                        <input 
                            type="date"
                            value={historyStartDate}
                            onChange={(e) => setHistoryStartDate(e.target.value)}
                            className="filter-input"
                        />
                    </div>
                    <div className="filter-group">
                        <label className="filter-label">End Date</label>
                        <input 
                            type="date"
                            value={historyEndDate}
                            onChange={(e) => setHistoryEndDate(e.target.value)}
                            className="filter-input"
                        />
                    </div>
                    <div className="history-exports">
                        <button 
                            onClick={handleExportPDF}
                            className="btn-export btn-export-pdf"
                        >
                            Export PDF
                        </button>
                        <button 
                            onClick={handleExportExcel}
                            className="btn-export btn-export-excel"
                        >
                            Export Excel
                        </button>
                    </div>
                </div>
                
                <div className="history-list-container">
                    {loadingHistory ? (
                        <div className="flex justify-center p-16">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : displayedHistory.length === 0 ? (
                        <div className="text-center p-16 text-gray-500 border border-dashed border-gray-300 rounded-xl bg-gray-50">
                            <Clock className="mx-auto mb-4 text-gray-400" size={48} />
                            <p className="text-lg">No attendance history found for this date range.</p>
                        </div>
                    ) : (
                        <div>
                            {displayedHistory.map(record => (
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
                                            onClick={() => handleViewHistoryDate(record.date)}
                                            className="history-btn btn-view"
                                        >
                                            View
                                        </button>
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
                    backgroundColor: '#fff',
                    padding: '1.5rem',
                    borderRadius: '1rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                    border: '1px solid #f3f4f6',
                    marginBottom: '1.5rem',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '4px',
                        background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)'
                    }}></div>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <button onClick={() => {
                                setIsReadOnly(false);
                                navigate('/admin/users');
                            }} style={{
                                background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer',
                                fontSize: '0.875rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem',
                                padding: 0, alignSelf: 'flex-start'
                            }}>
                                <ArrowLeft size={14} /> Back to Class Selection
                            </button>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1f2937', margin: 0, letterSpacing: '-0.025em', lineHeight: '1.2' }}>
                                {selection.year} {selection.branch !== 'PUC' ? `• ${selection.branch}` : ''} • Sec {selection.section?.replace(/^(?:SECTION|SEC)\s*-?\s*/i, '').trim() || ''}
                            </h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontWeight: '500', flexWrap: 'wrap' }}>
                                <BookOpen size={16} color="#6366f1"/> 
                                <span style={{ backgroundColor: '#e0e7ff', color: '#4338ca', padding: '0.25rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.875rem' }}>
                                    {selection.subject}
                                </span>
                                <span style={{ backgroundColor: '#f3f4f6', color: '#4b5563', padding: '0.25rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                    <Users size={14} color="#6b7280"/>
                                    {filteredStudents.length} {filteredStudents.length === 1 ? 'Student' : 'Students'}
                                </span>
                            </div>
                        </div>
                        
                        <div style={{
                            display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem',
                            backgroundColor: '#f9fafb', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #f3f4f6',
                            width: '100%', boxSizing: 'border-box'
                        }}>
                            <div style={{ display: 'flex', flex: '1 1 auto', minWidth: '200px' }}>
                                <div style={{ width: '100%', backgroundColor: '#fff', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Calendar size={16} color="#6366f1"/>
                                    <input 
                                        type="date" 
                                        style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.875rem', fontWeight: '600', color: '#374151', cursor: 'pointer', width: '100%' }}
                                        value={selection.date}
                                        onChange={(e) => updateSelection('date', e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', flex: '1 1 auto' }}>
                                <button 
                                    style={{
                                        flex: '1 1 auto', backgroundColor: '#fff', color: '#4b5563', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #d1d5db',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: '600', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                    }}
                                    onClick={fetchHistory}
                                    disabled={loading || students.length === 0}
                                >
                                    <Clock size={16}/> History
                                </button>
                                {!isReadOnly && (
                                    <>
                                        <button onClick={() => markAll('present')} style={{
                                            flex: '1 1 auto', backgroundColor: '#10b981', color: '#fff', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
                                        }}>
                                            <CheckCircle2 size={16}/> All Present
                                        </button>
                                        <button onClick={() => markAll('absent')} style={{
                                            flex: '1 1 auto', backgroundColor: '#f43f5e', color: '#fff', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 4px rgba(244, 63, 94, 0.2)'
                                        }}>
                                            <XCircle size={16}/> All Absent
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                    <div style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                        <Search color="#9ca3af" size={18} />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Search students by Name or ID..." 
                        style={{
                            width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', backgroundColor: '#fff',
                            border: '1px solid #e5e7eb', borderRadius: '0.75rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                            outline: 'none', transition: 'border-color 0.2s', fontSize: '0.95rem'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}

                    />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                    {filteredStudents.map(student => (
                        <div key={student.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '1rem', backgroundColor: '#fff', borderRadius: '0.75rem',
                            border: `1px solid ${attendanceData[student.id] === 'absent' ? '#fecdd3' : '#e5e7eb'}`,
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'all 0.2s',
                            borderLeft: `4px solid ${attendanceData[student.id] === 'absent' ? '#f43f5e' : '#10b981'}`
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <img 
                                    src={student.avatar || `https://ui-avatars.com/api/?name=${student.fullName || student.name || 'User'}&background=random`} 
                                    alt="" 
                                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                                />
                                <div>
                                    <div style={{ fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>{student.fullName || student.name || 'Unknown'}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.125rem' }}>{student.studentId || student.id}</div>
                                </div>
                            </div>
                            <button
                                onClick={() => !isReadOnly && toggleAttendance(student.id)}
                                disabled={isReadOnly}
                                style={{
                                    padding: '0.5rem', borderRadius: '0.5rem', cursor: isReadOnly ? 'default' : 'pointer', transition: 'all 0.2s',
                                    border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    backgroundColor: attendanceData[student.id] === 'absent' ? '#fff1f2' : '#ecfdf5',
                                    color: attendanceData[student.id] === 'absent' ? '#f43f5e' : '#10b981',
                                    opacity: isReadOnly ? 0.8 : 1
                                }}
                            >
                                {attendanceData[student.id] === 'absent' ? <XCircle size={24} /> : <CheckCircle2 size={24} />}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="faculty-attendance-page min-h-screen flex flex-col" style={{ background: "var(--color-bg)" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
                .premium-font { font-family: 'Outfit', sans-serif; }
                
                /* Class Attendance Top Header Styling */
                .top-header-container {
                    padding: 0 0 1rem 0 !important;
                    margin-bottom: 0 !important;
                }
                .top-header-container .flex.items-center.gap-4 {
                    gap: 0.75rem !important;
                    align-items: center !important;
                }
                .top-header-container .bg-white.p-3 {
                    padding: 0.6rem !important;
                    border-radius: 0.75rem !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                }
                .top-header-icon {
                    width: 26px !important;
                    height: 26px !important;
                }
                .top-header-title {
                    font-size: 38px !important;
                    font-weight: 600 !important;
                    color: #0f172a !important; /* Professional Dark Navy */
                    letter-spacing: -0.02em !important;
                    line-height: 1.1 !important;
                }
                .top-header-title + p {
                    font-size: 17px !important;
                    color: #64748b !important; /* Lighter emphasis */
                    margin-top: 6px !important;
                }
                .top-header-container .flex-col {
                    justify-content: center !important;
                }
                
                /* Responsive Top Header Adjustments */
                @media (max-width: 768px) {
                    .top-header-container {
                        padding-top: 0 !important;
                    }
                    .top-header-title {
                        font-size: 30px !important;
                    }
                    .top-header-title + p {
                        font-size: 15px !important;
                    }
                    .top-header-icon {
                        width: 22px !important;
                        height: 22px !important;
                    }
                }
                @media (max-width: 480px) {
                    .top-header-title {
                        font-size: 26px !important;
                    }
                    .top-header-title + p {
                        font-size: 14px !important;
                    }
                }
            `}</style>

            <div className="flex-grow pb-12">
            {/* Transparent Premium Page Header */}
            {!showHistoryModal && (
                <div className="top-header-container pt-8 pb-2 mb-2">
                    <div className="max-w-full mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                                <h1 className="top-header-title premium-font text-3xl font-extrabold text-[#1e1b4b] tracking-tight leading-tight m-0">
                                    Class Attendance
                                </h1>
                                <p className="text-[#6b7280] font-medium text-sm m-0 mt-0.5">
                                    Record real-time attendance directly to the cloud.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-full mx-auto px-4 md:px-8">
                <div className={`attendance-content-wrapper mx-auto bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] ${showHistoryModal ? 'p-4 pt-1 sm:p-6 sm:pt-2' : 'p-6'} ${step < 5 && !showHistoryModal ? 'max-w-4xl' : 'max-w-full'}`}>
                    {showHistoryModal ? renderHistoryPage() : step < 5 ? renderWizard() : renderAttendanceSheet()}
                </div>
                
                {step === 5 && !showHistoryModal && !loading && !isReadOnly && (
                    <div className="mt-8 mb-12 flex justify-end max-w-full mx-auto">
                        <button 
                            className="btn-submit-attendance"
                            onClick={handlePreSubmit}
                            disabled={isSubmitting}
                        >
                            <Save size={22} className="save-icon" />
                            <span>{isSubmitting ? 'Saving...' : 'Submit Attendance'}</span>
                        </button>
                    </div>
                )}
                
                {showConfirmModal && createPortal(
                    <div style={{
                        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center',
                        alignItems: 'center', zIndex: 999999, padding: '1rem', backdropFilter: 'blur(4px)'
                    }}>
                        <div style={{
                            backgroundColor: '#fff', borderRadius: '1rem', padding: '2rem', maxWidth: '400px', width: '100%',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                            animation: 'fade-in 0.2s ease-out'
                        }}>
                            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: 'bold', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <AlertCircle color="#f59e0b" size={24} /> Confirm Attendance
                            </h3>
                            <p style={{ margin: '0 0 1.5rem 0', color: '#4b5563', lineHeight: '1.5' }}>
                                You are about to submit the attendance for <strong>{selection.subject}</strong> on <strong>{selection.date}</strong>.
                            </p>
                            
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{ flex: 1, backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '1rem', borderRadius: '0.75rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>
                                        {Object.values(attendanceData).filter(s => s === 'present').length}
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: '500' }}>Present</div>
                                </div>
                                <div style={{ flex: 1, backgroundColor: '#fff1f2', border: '1px solid #fecdd3', padding: '1rem', borderRadius: '0.75rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#e11d48' }}>
                                        {Object.values(attendanceData).filter(s => s === 'absent').length}
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: '#f43f5e', fontWeight: '500' }}>Absent</div>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#374151', fontWeight: '600', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none', backgroundColor: '#4f46e5', color: '#fff', fontWeight: '600', cursor: 'pointer', boxShadow: '0 1px 2px rgba(79, 70, 229, 0.2)' }}
                                >
                                    Confirm & Submit
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
            </div>
        </div>
    );
};

export default FacultyAttendance;
