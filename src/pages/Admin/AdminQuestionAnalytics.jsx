import { ArrowLeft, CheckCircle, Users, Clock, AlertCircle } from 'lucide-react';
import { Cell } from 'recharts';
import { Bar } from 'recharts';
import { Tooltip as RechartsTooltip } from 'recharts';
import { YAxis } from 'recharts';
import { XAxis } from 'recharts';
import { CartesianGrid } from 'recharts';
import { BarChart } from 'recharts';
import { ResponsiveContainer } from 'recharts';
import LoadingTransition from '../../components/Common/LoadingTransition';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db, contentDb } from '../../config/firebase';
import { getQuestionsForQuiz } from '../../services/quizService';
import { getModuleById, getUnitById } from '../../utils/academicsUtils';
import { PROGRAMS } from '../../config/academics';
import './AdminQuizAnalytics.css'; // Reuse styles

const AdminQuestionAnalytics = () => {
    const { quizId, questionIndex } = useParams();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [quiz, setQuiz] = useState(null);
    const [attempts, setAttempts] = useState([]);
    const [question, setQuestion] = useState(null);
    const [usersMap, setUsersMap] = useState({});

    // Fetch initial static data
    useEffect(() => {
        const fetchStaticData = async () => {
            try {
                const [usersSnap, questionsSnap] = await Promise.all([
                    getDocs(collection(db, 'users')),
                    getQuestionsForQuiz(quizId)
                ]);
                
                const qIdx = parseInt(questionIndex, 10);
                if (questionsSnap && questionsSnap.length > qIdx) {
                    setQuestion({ ...questionsSnap[qIdx], originalIndex: qIdx });
                }

                // Fetch module or unit logic
                let targetData = await getModuleById(quizId);
                if (!targetData) {
                    targetData = await getUnitById(quizId);
                }
                
                if (!targetData) {
                    let found = false;
                    for (const p of PROGRAMS) {
                        for (const y of p.years) {
                            for (const s of y.semesters) {
                                for (const sub of (s.subjects || [])) {
                                    for (const u of (sub.units || [])) {
                                        const matchMod = (u.modules || []).find(m => m.id === quizId);
                                        if (matchMod) {
                                            targetData = matchMod;
                                            found = true;
                                            break;
                                        }
                                        if (u.id === quizId) {
                                            targetData = u;
                                            found = true;
                                            break;
                                        }
                                    }
                                    if (found) break;
                                }
                                if (found) break;
                            }
                            if (found) break;
                        }
                        if (found) break;
                    }
                }

                if (targetData) {
                    setQuiz({ ...targetData, title: targetData.label });
                } else {
                    setQuiz({ title: 'Unknown Quiz' });
                }
                
                const uMap = {};
                usersSnap.forEach(doc => {
                    uMap[doc.id] = doc.data();
                });
                setUsersMap(uMap);
                
            } catch (error) {
                console.error("Error fetching question analytics data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStaticData();
    }, [quizId, questionIndex]);

    // Real-time listener for attempts
    useEffect(() => {
        if (!quizId) return;
        const q = query(collection(contentDb, 'quiz_attempts'), where('quizId', '==', quizId));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            let liveAttempts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Filter out dummy students
            liveAttempts = liveAttempts.filter(a => !(a.studentId && a.studentId.startsWith('STU')));
            liveAttempts.sort((a, b) => {
                const timeA = a.submittedAt?.toMillis ? a.submittedAt.toMillis() : 0;
                const timeB = b.submittedAt?.toMillis ? b.submittedAt.toMillis() : 0;
                return timeB - timeA;
            });
            setAttempts(liveAttempts);
        });

        return () => unsubscribe();
    }, [quizId]);

    const formatTime = (seconds) => {
        if (!seconds) return "0m 0s";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}m ${s}s`;
    };

    // Calculate Question Metrics
    const metrics = useMemo(() => {
        if (!question || !attempts.length) return null;
        
        let attemptedCount = 0;
        let correctCount = 0;
        let optionDistribution = Array(question.options.length).fill(0);
        const studentAnswersList = [];

        attempts.forEach(attempt => {
            if (attempt.answers && attempt.answers.hasOwnProperty(question.originalIndex)) {
                attemptedCount++;
                const selectedOpt = attempt.answers[question.originalIndex];
                const isCorrect = selectedOpt === question.correctAnswerIndex;
                
                if (isCorrect) correctCount++;
                if (selectedOpt >= 0 && selectedOpt < question.options.length) {
                    optionDistribution[selectedOpt]++;
                }

                studentAnswersList.push({
                    attemptId: attempt.id,
                    studentId: attempt.studentId,
                    studentName: attempt.studentName,
                    selectedOpt,
                    isCorrect,
                    marks: isCorrect ? (question.marks || 1) : 0,
                    timeTaken: attempt.timeTaken,
                    submittedAt: attempt.submittedAt
                });
            }
        });

        const incorrectCount = attemptedCount - correctCount;
        const correctPercent = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;
        const incorrectPercent = attemptedCount > 0 ? Math.round((incorrectCount / attemptedCount) * 100) : 0;

        return {
            attemptedCount,
            correctCount,
            incorrectCount,
            correctPercent,
            incorrectPercent,
            optionDistribution,
            studentAnswersList
        };
    }, [question, attempts]);

    if (loading) return <LoadingTransition message="Loading Question Analytics..." />;
    if (!quiz || !question) return <div className="p-8 text-center text-red-500">Question not found.</div>;

    return (
        <div className="analytics-dashboard-container">
            <div className="premium-header">
                <div className="header-left">
                    <button onClick={() => navigate('/admin/quizzes')} className="back-btn-premium" title="Back to Dashboard">
                        <ArrowLeft size={22} />
                    </button>
                    <div className="header-text-group">
                        <h1 style={{fontSize: '1.25rem', marginBottom: '0.25rem'}}>{quiz.title}</h1>
                        <p style={{fontSize: '0.875rem', opacity: 0.8}}>Question {question.originalIndex + 1} Analytics</p>
                    </div>
                </div>
            </div>

            {/* Question Details Card */}
            <div className="single-question-card">
                <div className="single-question-header">
                    <div>
                        <span className="text-gray-400 font-bold uppercase tracking-wider text-xs mb-2 block">Question {question.originalIndex + 1}</span>
                        <h2 className="single-question-text">{question.questionText}</h2>
                    </div>
                    <div className="single-question-marks">
                        <span className="single-question-marks-label">Marks</span>
                        <span className="single-question-marks-value">{question.marks || 1}</span>
                    </div>
                </div>
                
                <div className="single-question-body">
                    <div>
                        <h4 className="single-question-section-title">Options</h4>
                        <div className="options-list-premium">
                            {question.options.map((opt, optIdx) => {
                                const isCorrect = optIdx === question.correctAnswerIndex;
                                return (
                                    <div key={optIdx} className={`option-item-premium ${isCorrect ? 'correct-answer' : ''}`}>
                                        <span style={{fontWeight: '700', opacity: 0.5}}>{String.fromCharCode(65 + optIdx)}.</span>
                                        <span style={{flexGrow: 1}}>{opt}</span>
                                        {isCorrect && <CheckCircle size={18} className="text-green-500" />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    
                    {metrics && (
                        <div>
                            <h4 className="single-question-section-title">Overall Performance</h4>
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="single-question-stat-box">
                                    <span className="sq-stat-label">Total Attempts</span>
                                    <span className="sq-stat-value">{metrics.attemptedCount}</span>
                                </div>
                                <div className="single-question-stat-box">
                                    <span className="sq-stat-label green">Correct Rate</span>
                                    <span className="sq-stat-value green">{metrics.correctPercent}%</span>
                                </div>
                            </div>
                            
                            <h4 className="single-question-section-title">Answer Distribution</h4>
                            <div style={{height: 150, width: '100%'}}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={question.options.map((opt, idx) => ({ name: String.fromCharCode(65 + idx), count: metrics.optionDistribution[idx], isCorrect: idx === question.correctAnswerIndex }))}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="name" stroke="#94a3b8" />
                                        <YAxis stroke="#94a3b8" allowDecimals={false} width={30} />
                                        <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc', borderRadius: '8px'}} />
                                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                            {question.options.map((entry, index) => (
                                              <Cell key={`cell-${index}`} fill={index === question.correctAnswerIndex ? '#22c55e' : '#3b82f6'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Student Responses Table */}
            <div className="mt-8 animate-fade-in" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
                <div className="flex items-center gap-3 mb-4 pl-2">
                    <Users size={20} className="text-blue-500" />
                    <h3 className="text-lg font-bold text-white">Student Responses</h3>
                </div>
                
                <div className="table-container-premium">
                    <div className="table-edge-blob"></div>
                    <div className="table-edge-bg"></div>
                    <div className="table-content-wrapper">
                        <div style={{overflowX: 'auto'}}>
                            <table className="premium-table">
                            <thead>
                                <tr>
                                    <th>Student Details</th>
                                    <th>Selected Answer</th>
                                    <th style={{textAlign: 'center'}}>Result</th>
                                    <th style={{textAlign: 'center'}}>Marks Awarded</th>
                                    <th style={{textAlign: 'right'}}>Total Quiz Time</th>
                                    <th style={{textAlign: 'right'}}>Submitted Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {metrics && metrics.studentAnswersList.map((sa, idx) => {
                                    const userProf = usersMap[sa.studentId] || {};
                                    const selectedText = sa.selectedOpt !== undefined && sa.selectedOpt !== null ? question.options[sa.selectedOpt] : "Skipped";
                                    const isCorrect = sa.isCorrect;
                                    
                                    return (
                                        <tr className="premium-row" key={idx}>
                                            <td>
                                                <div className="student-info-premium">
                                                    <img src={userProf.avatar || `https://ui-avatars.com/api/?name=${sa.studentName}&background=random`} alt="avatar" className="student-avatar" style={{width: 36, height: 36}} />
                                                    <div className="student-details">
                                                        <span className="student-name-premium">{sa.studentName}</span>
                                                        <span className="student-id-premium text-xs">{sa.studentId}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    {sa.selectedOpt !== undefined && sa.selectedOpt !== null && (
                                                        <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${isCorrect ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                                            {String.fromCharCode(65 + sa.selectedOpt)}
                                                        </span>
                                                    )}
                                                    <span className="text-sm font-medium text-gray-300 line-clamp-2 max-w-[200px]" title={selectedText}>{selectedText}</span>
                                                </div>
                                            </td>
                                            <td style={{textAlign: 'center'}}>
                                                <span className={`status-badge ${isCorrect ? 'status-pass' : 'status-fail'}`}>
                                                    {isCorrect ? 'Correct' : 'Incorrect'}
                                                </span>
                                            </td>
                                            <td style={{textAlign: 'center'}}>
                                                <span className={`font-bold ${isCorrect ? 'text-green-400' : 'text-gray-500'}`}>{sa.marks}</span>
                                                <span className="text-gray-500 text-xs ml-1">/ {question.marks || 1}</span>
                                            </td>
                                            <td style={{textAlign: 'right'}}>
                                                <div className="flex items-center justify-end gap-1 text-gray-400">
                                                    <Clock size={14} />
                                                    <span className="text-sm font-medium">{formatTime(sa.timeTaken)}</span>
                                                </div>
                                            </td>
                                            <td style={{textAlign: 'right'}}>
                                                <span className="text-sm text-gray-400">{sa.submittedAt?.toDate ? sa.submittedAt.toDate().toLocaleString() : 'N/A'}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {(!metrics || metrics.studentAnswersList.length === 0) && (
                                    <tr>
                                        <td colSpan="6" className="text-center p-8">
                                            <AlertCircle size={32} className="mx-auto text-gray-500 mb-3" />
                                            <p className="text-gray-400 font-medium">No students have attempted this question yet.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
};

export default AdminQuestionAnalytics;
