import { BarChart2, BookOpen, ChevronRight, AlertCircle, ChevronDown, HelpCircle, Users, CheckCircle } from 'lucide-react';
import LoadingTransition from '../../components/Common/LoadingTransition';
import CustomSelect from '../../components/Common/CustomSelect';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PROGRAMS } from '../../config/academics';
import { fetchDynamicSubjects, fetchDynamicUnits, fetchDynamicModules } from '../../utils/academicsUtils';
import { getQuestionsForQuiz, getAllAttemptsForQuiz } from '../../services/quizService';
import './Admin.css';

const AdminQuizList = () => {
    const navigate = useNavigate();
    
    // Selection State
    const [selectedProgram, setSelectedProgram] = useState(PROGRAMS[0]);
    const [selectedYear, setSelectedYear] = useState(PROGRAMS[0].years[0]);
    const [selectedSemester, setSelectedSemester] = useState(PROGRAMS[0].years[0].semesters[0]);
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [selectedSubject, setSelectedSubject] = useState(null);
    
    // Data State
    const [subjects, setSubjects] = useState([]);
    const [unitsData, setUnitsData] = useState([]);
    const [expandedUnits, setExpandedUnits] = useState(new Set());
    const [expandedModules, setExpandedModules] = useState(new Set()); // Added expandedModules
    const [loadingSubjects, setLoadingSubjects] = useState(false);
    const [loadingUnits, setLoadingUnits] = useState(false);

    // Helper to enrich questions with attempt stats
    const enrichQuestions = (questions, attempts) => {
        return questions.map((q, qIndex) => {
            let correctCount = 0;
            let answeredCount = 0;
            attempts.forEach(a => {
                if (a.answers && a.answers[qIndex] !== undefined) {
                    answeredCount++;
                    if (a.answers[qIndex] === q.correctAnswerIndex) {
                        correctCount++;
                    }
                }
            });
            const incorrectCount = answeredCount - correctCount;
            return {
                ...q,
                qIndex,
                totalAttempts: answeredCount,
                correctPercentage: answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0,
                incorrectPercentage: answeredCount > 0 ? Math.round((incorrectCount / answeredCount) * 100) : 0
            };
        });
    };

    // Load Subjects
    useEffect(() => {
        const loadSubjects = async () => {
            setLoadingSubjects(true);
            try {
                const staticSubjects = selectedSemester.subjects || [];
                const dynamic = await fetchDynamicSubjects(selectedProgram.id, selectedYear.id, selectedBranch?.id || null, selectedSemester.id);
                setSubjects([...staticSubjects, ...dynamic]);
            } catch (error) {
                console.error("Error loading subjects:", error);
            } finally {
                setLoadingSubjects(false);
            }
        };
        loadSubjects();
        setSelectedSubject(null);
        setUnitsData([]);
    }, [selectedProgram, selectedYear, selectedSemester, selectedBranch]);

    // Load Units & Analytics
    useEffect(() => {
        if (!selectedSubject) return;
        
        const loadUnitsAndAnalytics = async () => {
            setLoadingUnits(true);
            try {
                // 1. Fetch Units
                const staticUnits = selectedSubject.units || [];
                const dynamicUnits = await fetchDynamicUnits(selectedSubject.id);
                const allUnits = [...staticUnits, ...dynamicUnits];

                // 2. Fetch Modules and Analytics for each Unit
                const enrichedUnits = await Promise.all(allUnits.map(async (unit) => {
                    // Fetch Unit-level Quiz Analytics
                    const [unitQuestions, unitAttempts] = await Promise.all([
                        getQuestionsForQuiz(unit.id),
                        getAllAttemptsForQuiz(unit.id)
                    ]);
                    
                    const unitQuizMetrics = {
                        totalQuestions: unitQuestions.length,
                        totalAttempts: unitAttempts.length,
                        averageScore: 0,
                        passPercentage: 0,
                        maxMarks: unitQuestions.reduce((acc, q) => acc + (q.marks || 1), 0),
                        questions: enrichQuestions(unitQuestions, unitAttempts)
                    };
                    
                    if (unitQuizMetrics.totalAttempts > 0) {
                        const totalScore = unitAttempts.reduce((acc, a) => acc + (a.score || 0), 0);
                        unitQuizMetrics.averageScore = (totalScore / unitQuizMetrics.totalAttempts).toFixed(1);
                        const passedCount = unitAttempts.filter(a => (a.percentage || 0) >= 40).length;
                        unitQuizMetrics.passPercentage = Math.round((passedCount / unitQuizMetrics.totalAttempts) * 100);
                    }

                    const staticModules = unit.modules || [];
                    const dynamicModules = await fetchDynamicModules(unit.id);
                    const allModules = [...staticModules, ...dynamicModules];

                    const enrichedModules = await Promise.all(allModules.map(async (mod) => {
                        const [questions, attempts] = await Promise.all([
                            getQuestionsForQuiz(mod.id),
                            getAllAttemptsForQuiz(mod.id)
                        ]);

                        const totalQuestions = questions.length;
                        const totalAttempts = attempts.length;
                        
                        let averageScore = 0;
                        let passPercentage = 0;

                        if (totalAttempts > 0) {
                            const totalScore = attempts.reduce((acc, a) => acc + (a.score || 0), 0);
                            averageScore = (totalScore / totalAttempts).toFixed(1);
                            
                            const passedCount = attempts.filter(a => (a.percentage || 0) >= 40).length;
                            passPercentage = Math.round((passedCount / totalAttempts) * 100);
                        }

                        return {
                            ...mod,
                            totalQuestions,
                            totalAttempts,
                            averageScore,
                            passPercentage,
                            maxMarks: questions.reduce((acc, q) => acc + (q.marks || 1), 0),
                            questions: enrichQuestions(questions, attempts)
                        };
                    }));

                    return {
                        ...unit,
                        unitQuizMetrics,
                        modulesData: enrichedModules
                    };
                }));

                setUnitsData(enrichedUnits);
            } catch (error) {
                console.error("Error loading units & analytics:", error);
            } finally {
                setLoadingUnits(false);
            }
        };

        loadUnitsAndAnalytics();
    }, [selectedSubject]);

    const toggleUnit = (unitId) => {
        const newExpanded = new Set(expandedUnits);
        if (newExpanded.has(unitId)) {
            newExpanded.delete(unitId);
        } else {
            newExpanded.add(unitId);
        }
        setExpandedUnits(newExpanded);
    };

    const toggleModule = (moduleId) => {
        const newExpanded = new Set(expandedModules);
        if (newExpanded.has(moduleId)) {
            newExpanded.delete(moduleId);
        } else {
            newExpanded.add(moduleId);
        }
        setExpandedModules(newExpanded);
    };

    const handleProgramChange = (val) => {
        const prog = PROGRAMS.find(p => p.id === val);
        const firstYear = prog.years[0];
        setSelectedProgram(prog);
        setSelectedYear(firstYear);
        if (firstYear.branches) {
            setSelectedBranch(firstYear.branches[0]);
            setSelectedSemester(firstYear.branches[0].semesters[0]);
        } else {
            setSelectedBranch(null);
            setSelectedSemester(firstYear.semesters[0]);
        }
    };

    const handleYearChange = (val) => {
        const yr = selectedProgram.years.find(y => y.id === val);
        setSelectedYear(yr);
        if (yr.branches) {
            setSelectedBranch(yr.branches[0]);
            setSelectedSemester(yr.branches[0].semesters[0]);
        } else {
            setSelectedBranch(null);
            setSelectedSemester(yr.semesters[0]);
        }
    };

    const handleBranchChange = (val) => {
        const branch = selectedYear.branches.find(b => b.id === val);
        setSelectedBranch(branch);
        setSelectedSemester(branch.semesters[0]);
    };

    const handleSemesterChange = (val) => {
        const semesters = selectedBranch ? selectedBranch.semesters : selectedYear.semesters;
        const sem = semesters.find(s => s.id === val);
        setSelectedSemester(sem);
    };

    const renderQuestions = (questions, parentId) => {
        if (!questions || questions.length === 0) return (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                No questions found.
            </div>
        );
        return (
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0 0.5rem 1rem 0.5rem' }}>
                {questions.map((q) => (
                    <div key={q.qIndex} className="quiz-question-card" style={{ background: 'var(--color-background)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s ease' }}>
                        <div style={{ flex: 1, paddingRight: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                <span style={{ fontWeight: 800, color: 'var(--color-text-main)', fontSize: '0.875rem' }}>Q{q.qIndex + 1}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>• {q.totalAttempts} Attempts</span>
                            </div>
                            <p style={{ margin: 0, color: 'var(--color-text-main)', fontSize: '0.9375rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{q.questionText}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.125rem' }}>Correct</p>
                                <p style={{ fontWeight: 800, color: '#22c55e', fontSize: '1rem' }}>{q.correctPercentage}%</p>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.125rem' }}>Incorrect</p>
                                <p style={{ fontWeight: 800, color: '#ef4444', fontSize: '1rem' }}>{q.incorrectPercentage}%</p>
                            </div>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/admin/quizzes/${parentId}/question/${q.qIndex}`);
                                }}
                                style={{ padding: '0.5rem 1rem', background: 'var(--color-primary-50)', color: 'var(--color-primary-600)', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <BarChart2 size={16} /> Analytics
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="admin-container">
            <div className="page-header-v2">
                <div className="header-accent-bar"></div>
                <div className="header-content-v2">
                    <h1 className="page-title-v2">Quiz Analytics Dashboard</h1>
                    <p className="page-subtitle-v2">Explore courses to view real-time student performance and question analytics across units.</p>
                </div>
            </div>

            {/* Hierarchy Selectors */}
            <div className="section-card quiz-dashboard-selectors">
                <CustomSelect 
                    label="Degree Program"
                    options={PROGRAMS.map(p => ({ value: p.id, label: p.label }))} 
                    value={selectedProgram.id} 
                    onChange={handleProgramChange} 
                />
                <CustomSelect 
                    label="Academic Year"
                    options={selectedProgram.years.map(y => ({ value: y.id, label: y.label }))} 
                    value={selectedYear.id} 
                    onChange={handleYearChange} 
                />
                {selectedYear.branches && (
                    <CustomSelect 
                        label="Branch"
                        options={selectedYear.branches.map(b => ({ value: b.id, label: b.label }))} 
                        value={selectedBranch?.id || ''} 
                        onChange={handleBranchChange} 
                    />
                )}
                {(!selectedYear.branches || selectedBranch) && (
                    <CustomSelect 
                        label="Active Semester"
                        options={(selectedBranch ? selectedBranch.semesters : selectedYear.semesters).map(s => ({ value: s.id, label: s.label }))} 
                        value={selectedSemester?.id || ''} 
                        onChange={handleSemesterChange} 
                    />
                )}
            </div>

            <div className="quiz-dashboard-grid">
                {/* Subjects Column */}
                <div>
                    <div className="quiz-subject-panel">
                        <div className="quiz-subject-header">
                            <BookOpen size={18} className="text-blue-500" /> Subjects
                        </div>
                        <div className="quiz-subject-list">
                            {loadingSubjects ? (
                                <div className="p-4 text-center text-gray-500 text-sm">Loading subjects...</div>
                            ) : subjects.length === 0 ? (
                                <div className="p-4 text-center text-gray-500 text-sm">No subjects found.</div>
                            ) : (
                                subjects.map(sub => (
                                    <button
                                        key={sub.id}
                                        onClick={() => setSelectedSubject(sub)}
                                        className={`quiz-subject-btn ${selectedSubject?.id === sub.id ? 'active' : ''}`}
                                    >
                                        <span className="truncate pr-2">{sub.label}</span>
                                        <ChevronRight size={16} style={{ opacity: selectedSubject?.id === sub.id ? 1 : 0.5 }} />
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Units Analytics Area */}
                <div>
                    {!selectedSubject ? (
                        <div className="quiz-unit-empty">
                            <BookOpen size={48} className="text-gray-600 mb-4" />
                            <h3 className="text-lg font-bold text-[var(--color-text-main)] mb-2">Select a Subject</h3>
                            <p className="text-[var(--color-text-muted)] text-center max-w-sm">Choose a subject from the left panel to view its units and associated quiz analytics.</p>
                        </div>
                    ) : (
                        <div className="quiz-unit-area">
                            <div style={{ marginBottom: '2rem' }}>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-main)' }}>{selectedSubject.label}</h2>
                                <p style={{ color: 'var(--color-text-muted)' }}>Unit Analytics & Performance</p>
                            </div>

                            {loadingUnits ? (
                                <LoadingTransition message="Fetching Unit Analytics..." />
                            ) : unitsData.length === 0 ? (
                                <div className="p-12 text-center">
                                    <AlertCircle size={48} style={{ margin: '0 auto', color: 'gray', marginBottom: '1rem' }} />
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '0.5rem' }}>No Units Found</h3>
                                    <p style={{ color: 'var(--color-text-muted)' }}>This subject doesn't have any units yet. Add units in Course Management.</p>
                                </div>
                            ) : (
                                <div>
                                    {unitsData.map(unit => (
                                        <div key={unit.id} style={{ marginBottom: '1.5rem', background: 'var(--color-surface)', borderRadius: '1rem', padding: '1rem', border: '1px solid var(--color-border)' }}>
                                            {/* Unit Header (Accordion Toggle) */}
                                            <div 
                                                onClick={() => toggleUnit(unit.id)}
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', paddingBottom: expandedUnits.has(unit.id) ? '1rem' : '0', borderBottom: expandedUnits.has(unit.id) ? '1px solid var(--color-border)' : 'none' }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem', background: 'var(--color-primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary-600)' }}>
                                                        <BookOpen size={18} />
                                                    </div>
                                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-main)', margin: 0 }}>{unit.label}</h3>
                                                </div>
                                                <ChevronDown size={20} style={{ transform: expandedUnits.has(unit.id) ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease', color: 'var(--color-text-muted)' }} />
                                            </div>

                                            {/* Accordion Content */}
                                            {expandedUnits.has(unit.id) && (
                                                <div style={{ paddingTop: '1.5rem' }} className="animate-fade-in">
                                                    
                                                    {/* If NO Modules exist, just render Questions directly! */}
                                                    {unit.modulesData.length === 0 ? (
                                                        <>
                                                            {unit.unitQuizMetrics && unit.unitQuizMetrics.totalQuestions > 0 ? (
                                                                renderQuestions(unit.unitQuizMetrics.questions, unit.id)
                                                            ) : (
                                                                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem', background: 'var(--color-background)', borderRadius: '1rem', border: '1px dashed var(--color-border)' }}>
                                                                    No modules or questions in this unit.
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            {/* Unit Quiz Card (if it has questions AND there are modules, treat Unit Quiz like a module) */}
                                                            {unit.unitQuizMetrics && unit.unitQuizMetrics.totalQuestions > 0 && (
                                                                <div className="quiz-unit-card" style={{ border: '2px solid var(--color-primary-500)', cursor: 'pointer', flexDirection: 'column', alignItems: 'stretch' }} onClick={() => toggleModule(unit.id)}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                                                        <div className="quiz-unit-info" style={{ flex: 1 }}>
                                                                            <h3 className="quiz-unit-title">
                                                                                <span style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: 'var(--color-primary-600)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', flexShrink: 0 }}>U</span>
                                                                                {unit.label} (Unit Quiz)
                                                                            </h3>
                                                                            <div className="quiz-unit-badge-group">
                                                                                <div className="quiz-unit-badge">
                                                                                    <HelpCircle size={14} style={{ color: '#a855f7' }} />
                                                                                    <span>{unit.unitQuizMetrics.totalQuestions}</span> <span style={{ opacity: 0.7 }}>Questions</span>
                                                                                </div>
                                                                                <div className="quiz-unit-badge">
                                                                                    <Users size={14} style={{ color: '#3b82f6' }} />
                                                                                    <span>{unit.unitQuizMetrics.totalAttempts}</span> <span style={{ opacity: 0.7 }}>Attempts</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        {/* Middle: Metrics */}
                                                                        <div className="quiz-unit-metrics" style={{ flex: 1 }}>
                                                                            <div className="quiz-metric-item">
                                                                                <p className="quiz-metric-label">Avg Score</p>
                                                                                <p className="quiz-metric-value">{unit.unitQuizMetrics.averageScore} <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>/ {unit.unitQuizMetrics.maxMarks || '-'}</span></p>
                                                                            </div>
                                                                            <div className="quiz-metric-item">
                                                                                <p className="quiz-metric-label">Pass Rate</p>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', justifyContent: 'center' }}>
                                                                                    <CheckCircle size={14} style={{ color: unit.unitQuizMetrics.passPercentage >= 40 ? '#22c55e' : '#ef4444' }} />
                                                                                    <p style={{ fontSize: '1.25rem', fontWeight: 900, color: unit.unitQuizMetrics.passPercentage >= 40 ? '#4ade80' : '#f87171' }}>
                                                                                        {unit.unitQuizMetrics.passPercentage}%
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        {/* Right: Action */}
                                                                        <div className="quiz-unit-action">
                                                                            <ChevronDown size={20} style={{ transform: expandedModules.has(unit.id) ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease', color: 'var(--color-text-muted)' }} />
                                                                        </div>
                                                                    </div>
                                                                    {expandedModules.has(unit.id) && (
                                                                        <div className="animate-fade-in" style={{ width: '100%', borderTop: '1px solid var(--color-border)', marginTop: '1rem', paddingTop: '0.5rem' }}>
                                                                            {renderQuestions(unit.unitQuizMetrics.questions, unit.id)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* Modules List Header */}
                                                            {unit.modulesData.length > 0 && (
                                                                <div style={{ marginTop: '2rem', marginBottom: '1rem', paddingLeft: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                                                                    <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                                                        Module Quizzes
                                                                    </h4>
                                                                </div>
                                                            )}

                                                            {/* Modules List */}
                                                            {unit.modulesData.map(mod => (
                                                                <div key={mod.id} className="quiz-unit-card" style={{ cursor: 'pointer', flexDirection: 'column', alignItems: 'stretch' }} onClick={() => toggleModule(mod.id)}>
                                                                    
                                                                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                                                        {/* Left: Module Info */}
                                                                        <div className="quiz-unit-info" style={{ flex: 1 }}>
                                                                            <h3 className="quiz-unit-title">
                                                                                <span style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', flexShrink: 0 }}>M</span>
                                                                                {mod.label}
                                                                            </h3>
                                                                            
                                                                            <div className="quiz-unit-badge-group">
                                                                                <div className="quiz-unit-badge">
                                                                                    <HelpCircle size={14} style={{ color: '#a855f7' }} />
                                                                                    <span>{mod.totalQuestions}</span> <span style={{ opacity: 0.7 }}>Questions</span>
                                                                                </div>
                                                                                <div className="quiz-unit-badge">
                                                                                    <Users size={14} style={{ color: '#3b82f6' }} />
                                                                                    <span>{mod.totalAttempts}</span> <span style={{ opacity: 0.7 }}>Attempts</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Middle: Metrics */}
                                                                        <div className="quiz-unit-metrics" style={{ flex: 1 }}>
                                                                            <div className="quiz-metric-item">
                                                                                <p className="quiz-metric-label">Avg Score</p>
                                                                                <p className="quiz-metric-value">{mod.averageScore} <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>/ {mod.maxMarks || '-'}</span></p>
                                                                            </div>
                                                                            <div className="quiz-metric-item">
                                                                                <p className="quiz-metric-label">Pass Rate</p>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', justifyContent: 'center' }}>
                                                                                    <CheckCircle size={14} style={{ color: mod.passPercentage >= 40 ? '#22c55e' : '#ef4444' }} />
                                                                                    <p style={{ fontSize: '1.25rem', fontWeight: 900, color: mod.passPercentage >= 40 ? '#4ade80' : '#f87171' }}>
                                                                                        {mod.passPercentage}%
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Right: Action */}
                                                                        <div className="quiz-unit-action">
                                                                            <ChevronDown size={20} style={{ transform: expandedModules.has(mod.id) ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease', color: 'var(--color-text-muted)' }} />
                                                                        </div>
                                                                    </div>
                                                                    {expandedModules.has(mod.id) && (
                                                                        <div className="animate-fade-in" style={{ width: '100%', borderTop: '1px solid var(--color-border)', marginTop: '1rem', paddingTop: '0.5rem' }}>
                                                                            {renderQuestions(mod.questions, mod.id)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminQuizList;
