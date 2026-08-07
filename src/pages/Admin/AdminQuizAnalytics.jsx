import { Users, TrendingUp, Award, CheckCircle, Clock, Search, Filter, AlertCircle, ChevronUp, ChevronDown, XCircle, Target, HelpCircle, ArrowLeft } from 'lucide-react';
import { Bar } from 'recharts';
import { YAxis } from 'recharts';
import { XAxis } from 'recharts';
import { CartesianGrid } from 'recharts';
import { BarChart } from 'recharts';
import { Legend } from 'recharts';
import { Tooltip as RechartsTooltip } from 'recharts';
import { Cell } from 'recharts';
import { Pie } from 'recharts';
import { PieChart } from 'recharts';
import { ResponsiveContainer } from 'recharts';
import LoadingTransition from '../../components/Common/LoadingTransition';
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db, contentDb } from '../../config/firebase';
import { getModuleById, getUnitById } from '../../utils/academicsUtils';
import { PROGRAMS } from '../../config/academics';
import './AdminQuizAnalytics.css';

const AdminQuizAnalytics = () => {
    const { quizId } = useParams();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [quiz, setQuiz] = useState(null);
    const [attempts, setAttempts] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [usersMap, setUsersMap] = useState({});
    
    // UI State
    const [activeTab, setActiveTab] = useState('students'); // 'students' | 'questions'
    const [expandedRow, setExpandedRow] = useState(null);
    const [expandedQuestion, setExpandedQuestion] = useState(null);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');


    // Fetch initial static data
    useEffect(() => {
        const fetchStaticData = async () => {
            try {
                const [usersSnap] = await Promise.all([
                    getDocs(collection(db, 'users'))
                ]);
                
                // Fetch module or unit logic
                let targetData = await getModuleById(quizId);
                if (!targetData) {
                    targetData = await getUnitById(quizId);
                }
                
                if (!targetData) {
                    // Try static modules/units
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
                    setQuiz({ ...targetData, title: targetData.label, totalMarks: '-' });
                } else {
                    setQuiz({ title: 'Unknown Quiz', totalMarks: '-' });
                }
                
                const uMap = {};
                usersSnap.forEach(doc => {
                    uMap[doc.id] = doc.data();
                });
                setUsersMap(uMap);
                
            } catch (error) {
                console.error("Error fetching static analytics data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStaticData();
    }, [quizId]);

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
        }, (error) => {
            console.error("Error listening to attempts:", error);
        });

        return () => unsubscribe();
    }, [quizId]);

    // Real-time listener for questions
    useEffect(() => {
        if (!quizId) return;
        const q = query(collection(contentDb, 'questions'), where('quizId', '==', quizId));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const liveQuestions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Optional: Sort questions by a specific field if they have an order field,
            // otherwise relying on creation time or default order.
            setQuestions(liveQuestions);
        }, (error) => {
            console.error("Error listening to questions:", error);
        });

        return () => unsubscribe();
    }, [quizId]);

    const formatTime = (seconds) => {
        if (!seconds) return "0m 0s";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}m ${s}s`;
    };

    // --- Student Analytics Calculations ---
    const filteredAttempts = useMemo(() => {
        return attempts.filter(a => {
            const matchesSearch = (a.studentName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  (a.studentId || '').toLowerCase().includes(searchTerm.toLowerCase());
            const isPass = (a.percentage || 0) >= 40;
            const matchesStatus = statusFilter === 'all' || (statusFilter === 'pass' && isPass) || (statusFilter === 'fail' && !isPass);
            return matchesSearch && matchesStatus;
        });
    }, [attempts, searchTerm, statusFilter]);

    const totalParticipants = attempts.length;
    const scores = attempts.map(a => a.score || 0);
    const averageScore = totalParticipants > 0 ? (scores.reduce((a, b) => a + b, 0) / totalParticipants).toFixed(1) : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const passedCount = attempts.filter(a => (a.percentage || 0) >= 40).length;
    const failedCount = totalParticipants - passedCount;
    const passRate = totalParticipants > 0 ? Math.round((passedCount / totalParticipants) * 100) : 0;
    const avgTimeTakenSeconds = totalParticipants > 0 ? attempts.reduce((acc, curr) => acc + (curr.timeTaken || 0), 0) / totalParticipants : 0;

    const pieData = [
        { name: 'Passed', value: passedCount, color: '#10b981' },
        { name: 'Failed', value: failedCount, color: '#ef4444' }
    ];

    const rankedAttempts = [...filteredAttempts].sort((a, b) => (b.score || 0) - (a.score || 0) || (a.timeTaken || 0) - (b.timeTaken || 0));

    // --- Question Analytics Calculations ---
    const questionMetrics = useMemo(() => {
        if (!questions.length || !attempts.length) return [];
        
        return questions.map((q, qIndex) => {
            let attemptedCount = 0;
            let correctCount = 0;
            let optionDistribution = Array(q.options.length).fill(0);
            
            // Map of who answered what
            const studentAnswersList = [];

            attempts.forEach(attempt => {
                if (attempt.answers && attempt.answers.hasOwnProperty(qIndex)) {
                    attemptedCount++;
                    const selectedOpt = attempt.answers[qIndex];
                    const isCorrect = selectedOpt === q.correctAnswerIndex;
                    
                    if (isCorrect) correctCount++;
                    if (selectedOpt >= 0 && selectedOpt < q.options.length) {
                        optionDistribution[selectedOpt]++;
                    }

                    studentAnswersList.push({
                        attemptId: attempt.id,
                        studentId: attempt.studentId,
                        studentName: attempt.studentName,
                        selectedOpt,
                        isCorrect,
                        marks: isCorrect ? (q.marks || 1) : 0,
                        timeTaken: attempt.timeTaken,
                        submittedAt: attempt.submittedAt
                    });
                }
            });

            const incorrectCount = attemptedCount - correctCount;
            const correctPercent = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;
            
            let difficulty = 'Medium';
            if (attemptedCount > 0) {
                if (correctPercent < 40) difficulty = 'Hard';
                else if (correctPercent > 75) difficulty = 'Easy';
            } else {
                difficulty = 'No Data';
            }

            return {
                ...q,
                originalIndex: qIndex,
                attemptedCount,
                correctCount,
                incorrectCount,
                correctPercent,
                difficulty,
                optionDistribution,
                studentAnswersList
            };
        });
    }, [questions, attempts]);

    const mostCorrectQ = [...questionMetrics].sort((a, b) => b.correctPercent - a.correctPercent)[0];
    const mostMissedQ = [...questionMetrics].sort((a, b) => a.correctPercent - b.correctPercent)[0];

    // --- Renderers ---
    if (loading) return <LoadingTransition message="Loading Live Dashboard..." />;
    if (!quiz) return <div className="p-8 text-center text-red-500">Quiz not found.</div>;

    const renderStudentAnalytics = () => (
        <>
            <div className="stats-grid-premium">
                <div className="stat-card-premium" style={{'--card-color': '#3b82f6', '--icon-bg': '#0f172a'}}>
                    <div className="stat-header"><div className="stat-icon-wrapper"><Users size={24} /></div></div>
                    <div className="stat-content">
                        <p className="stat-title">Total Attempts</p>
                        <h3 className="stat-value">{totalParticipants}</h3>
                    </div>
                </div>

                <div className="stat-card-premium" style={{'--card-color': '#8b5cf6', '--icon-bg': '#0f172a'}}>
                    <div className="stat-header"><div className="stat-icon-wrapper"><TrendingUp size={24} /></div></div>
                    <div className="stat-content">
                        <p className="stat-title">Average Score</p>
                        <h3 className="stat-value">{averageScore} <span className="text-gray-500 text-base">/ {questions.reduce((acc, q) => acc + (q.marks || 1), 0)}</span></h3>
                    </div>
                </div>

                <div className="stat-card-premium" style={{'--card-color': '#10b981', '--icon-bg': '#0f172a'}}>
                    <div className="stat-header"><div className="stat-icon-wrapper"><Award size={24} /></div></div>
                    <div className="stat-content">
                        <p className="stat-title">Highest Score</p>
                        <h3 className="stat-value">{highestScore}</h3>
                    </div>
                </div>

                <div className="stat-card-premium" style={{'--card-color': '#f59e0b', '--icon-bg': '#0f172a'}}>
                    <div className="stat-header"><div className="stat-icon-wrapper"><CheckCircle size={24} /></div></div>
                    <div className="stat-content">
                        <p className="stat-title">Pass Rate</p>
                        <h3 className="stat-value">{passRate}%</h3>
                        <span className="stat-subtext bg-green-100 text-green-700 mt-2">{passedCount} Passed</span>
                        <span className="stat-subtext bg-red-100 text-red-700 ml-2 mt-2">{failedCount} Failed</span>
                    </div>
                </div>
            </div>

            {totalParticipants > 0 && (
                <div className="charts-grid">
                    <div className="chart-card">
                        <div className="chart-header"><h3 className="chart-title">Pass vs Fail Distribution</h3></div>
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc', borderRadius: '8px'}} />
                                    <Legend verticalAlign="bottom" height={36}/>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    
                    <div className="chart-card flex flex-col justify-center items-center text-center p-8" style={{background: 'linear-gradient(to bottom right, #1e293b, #0f172a)', borderColor: '#334155'}}>
                         <div className="w-16 h-16 rounded-2xl shadow flex items-center justify-center mb-4 text-blue-500" style={{background: '#0f172a', border: '1px solid #334155'}}>
                             <Clock size={32} />
                         </div>
                         <h3 className="text-xl font-bold text-gray-100 mb-2">Average Time</h3>
                         <p className="text-3xl font-black text-blue-400">{formatTime(avgTimeTakenSeconds)}</p>
                         <p className="text-sm text-gray-400 mt-2">Across all {totalParticipants} attempts</p>
                    </div>
                </div>
            )}

            <div className="filters-bar">
                <div className="search-input-wrapper">
                    <Search size={18} className="search-icon" />
                    <input type="text" placeholder="Search student by name or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                    <Filter size={18} className="text-gray-400" />
                    <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="all">All Statuses</option>
                        <option value="pass">Passed Only</option>
                        <option value="fail">Failed Only</option>
                    </select>
                </div>
            </div>

            <div className="table-container-premium">
                <div className="table-edge-blob"></div>
                <div className="table-edge-bg"></div>
                <div className="table-content-wrapper">
                {rankedAttempts.length === 0 ? (
                    <div className="p-16 text-center flex flex-col items-center">
                        <AlertCircle size={48} className="text-gray-500 mb-4" />
                        <h3 className="text-lg font-bold text-gray-400">No records found</h3>
                    </div>
                ) : (
                    <div style={{overflowX: 'auto'}}>
                        <table className="premium-table">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Student Details</th>
                                    <th style={{textAlign: 'center'}}>Score</th>
                                    <th style={{textAlign: 'center'}}>Status</th>
                                    <th style={{textAlign: 'right'}}>Total Time</th>
                                    <th style={{textAlign: 'center'}}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rankedAttempts.map((attempt, index) => {
                                    const isPass = (attempt.percentage || 0) >= 40;
                                    const isExpanded = expandedRow === attempt.id;
                                    const userProfile = usersMap[attempt.studentId] || {};
                                    const rank = index + 1;
                                    let rankClass = "rank-badge";
                                    if(rank === 1) rankClass += " rank-1";
                                    else if(rank === 2) rankClass += " rank-2";
                                    else if(rank === 3) rankClass += " rank-3";

                                    return (
                                        <React.Fragment key={attempt.id}>
                                            <tr className={`premium-row ${isExpanded ? 'expanded' : ''}`} onClick={() => setExpandedRow(isExpanded ? null : attempt.id)}>
                                                <td><span className={rankClass}>#{rank}</span></td>
                                                <td>
                                                    <div className="student-info-premium">
                                                        <img src={userProfile.avatar || `https://ui-avatars.com/api/?name=${attempt.studentName}&background=random`} alt="avatar" className="student-avatar" />
                                                        <div className="student-details">
                                                            <span className="student-name-premium">{attempt.studentName || 'Unknown Student'}</span>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="student-id-premium">{attempt.studentId}</span>
                                                                {(userProfile.course || userProfile.branch) && (
                                                                    <span className="course-badge">{userProfile.course || ''} {userProfile.branch || ''}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{textAlign: 'center'}}><span className="score-badge">{attempt.score} <span className="text-gray-500 text-sm">/ {attempt.totalMarks || questions.reduce((acc, q) => acc + (q.marks || 1), 0)}</span></span></td>
                                                <td style={{textAlign: 'center'}}><span className={`status-badge ${isPass ? 'status-pass' : 'status-fail'}`}>{isPass ? 'Passed' : 'Failed'}</span></td>
                                                <td style={{textAlign: 'right'}}>
                                                    <div className="date-text">
                                                        <span style={{fontWeight: 600}}>{formatTime(attempt.timeTaken)}</span>
                                                        <span style={{fontSize: '0.75rem', marginTop: '0.1rem'}}>{attempt.submittedAt?.toDate ? attempt.submittedAt.toDate().toLocaleDateString() : 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td style={{textAlign: 'center'}}>
                                                    <button className="expand-btn">{isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</button>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan="6" style={{padding: 0, border: 'none'}}>
                                                        <div className="expanded-details-container">
                                                            <div className="profile-summary-card">
                                                                <img src={userProfile.avatar || `https://ui-avatars.com/api/?name=${attempt.studentName}&background=random`} alt="avatar" style={{width: '80px', height: '80px', borderRadius: '20px'}} />
                                                                <div className="profile-stats">
                                                                    <div className="p-stat"><span>Total Score</span><span>{attempt.score} / {attempt.totalMarks || questions.reduce((acc, q) => acc + (q.marks || 1), 0)}</span></div>
                                                                    <div className="p-stat"><span>Accuracy</span><span style={{color: isPass ? '#4ade80' : '#f87171'}}>{Math.round(attempt.percentage || 0)}%</span></div>
                                                                    <div className="p-stat"><span>Total Time</span><span>{formatTime(attempt.timeTaken)}</span></div>
                                                                    <div className="p-stat"><span>Course</span><span>{userProfile.course || 'N/A'} {userProfile.branch || ''}</span></div>
                                                                </div>
                                                            </div>
                                                            <h4 className="details-title"><CheckCircle size={22} className="text-blue-500" /> Question-by-Question Breakdown</h4>
                                                            {(!attempt.answers || Object.keys(attempt.answers).length === 0) ? (
                                                                <p className="text-gray-500 italic">No detailed answers recorded.</p>
                                                            ) : (
                                                                <div className="questions-grid">
                                                                    {questions.map((q, qIndex) => {
                                                                        const studentAnsIndex = attempt.answers[qIndex];
                                                                        const isCorrect = studentAnsIndex === q.correctAnswerIndex;
                                                                        const isUnanswered = studentAnsIndex === undefined || studentAnsIndex === null;
                                                                        let cardClass = "question-card-premium ";
                                                                        if (isCorrect) cardClass += "correct"; else if (isUnanswered) cardClass += "unanswered"; else cardClass += "incorrect";
                                                                        
                                                                        return (
                                                                            <div key={qIndex} className={cardClass}>
                                                                                <div className="question-header">
                                                                                    <h5 className="question-text-premium"><span className="text-gray-400 mr-1">Q{qIndex + 1}.</span> {q.questionText}</h5>
                                                                                    <span className="q-marks-badge">{isCorrect ? (q.marks || 1) : 0} / {q.marks || 1} Marks</span>
                                                                                </div>
                                                                                <div className="options-list-premium">
                                                                                    {q.options.map((opt, optIdx) => {
                                                                                        let itemClass = "option-item-premium";
                                                                                        let icon = null;
                                                                                        if (optIdx === q.correctAnswerIndex) { itemClass += " correct-answer"; icon = <CheckCircle size={18} />; } 
                                                                                        else if (optIdx === studentAnsIndex && !isCorrect) { itemClass += " student-wrong"; icon = <XCircle size={18} />; }
                                                                                        return (
                                                                                            <div key={optIdx} className={itemClass}>
                                                                                                <span style={{fontWeight: '700', opacity: 0.5}}>{String.fromCharCode(65 + optIdx)}.</span> 
                                                                                                <span style={{flexGrow: 1}}>{opt}</span>
                                                                                                {icon}
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                    {isUnanswered && <div className="text-gray-400 italic text-sm mt-2 font-medium">Student skipped this question.</div>}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                </div>
            </div>
        </>
    );

    const renderQuestionAnalytics = () => (
        <>
            {/* Advanced Highlight Cards */}
            {questions.length > 0 && attempts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/20 border border-green-800/50 rounded-2xl p-6 flex items-center gap-6">
                        <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center flex-shrink-0 border border-green-500/30">
                            <Target size={32} />
                        </div>
                        <div>
                            <p className="text-green-400 text-sm font-bold uppercase tracking-wider mb-1">Most Correctly Answered</p>
                            <h4 className="text-white text-lg font-bold line-clamp-1">{mostCorrectQ?.questionText}</h4>
                            <p className="text-gray-400 text-sm mt-1">{mostCorrectQ?.correctPercent}% Success Rate</p>
                        </div>
                    </div>
                    <div className="bg-gradient-to-r from-red-900/30 to-rose-900/20 border border-red-800/50 rounded-2xl p-6 flex items-center gap-6">
                        <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0 border border-red-500/30">
                            <AlertCircle size={32} />
                        </div>
                        <div>
                            <p className="text-red-400 text-sm font-bold uppercase tracking-wider mb-1">Most Missed Question</p>
                            <h4 className="text-white text-lg font-bold line-clamp-1">{mostMissedQ?.questionText}</h4>
                            <p className="text-gray-400 text-sm mt-1">{100 - (mostMissedQ?.correctPercent || 0)}% Failure Rate</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Questions Grid */}
            <div className="question-perf-grid">
                {questionMetrics.map((q) => {
                    let diffClass = "diff-medium";
                    if(q.difficulty === 'Easy') diffClass = "diff-easy";
                    if(q.difficulty === 'Hard') diffClass = "diff-hard";

                    const isExpanded = expandedQuestion === q.id;

                    return (
                        <div key={q.id} className={`q-perf-card ${isExpanded ? 'expanded' : ''}`} onClick={() => setExpandedQuestion(isExpanded ? null : q.id)}>
                            <div className="q-perf-header">
                                <h3 className="q-perf-title"><span className="text-gray-500 mr-1">Q{q.originalIndex + 1}.</span> {q.questionText}</h3>
                                <span className={`difficulty-badge ${diffClass}`}>{q.difficulty}</span>
                            </div>
                            
                            <div className="q-perf-metrics">
                                <div className="q-metric">
                                    <span className="q-metric-label">Attempts</span>
                                    <span className="q-metric-val">{q.attemptedCount}</span>
                                </div>
                                <div className="q-metric">
                                    <span className="q-metric-label">Correct</span>
                                    <span className="q-metric-val green">{q.correctPercent}%</span>
                                </div>
                                <div className="q-metric">
                                    <span className="q-metric-label">Incorrect</span>
                                    <span className="q-metric-val red">{100 - q.correctPercent}%</span>
                                </div>
                            </div>

                            <div className="mt-4 flex justify-center text-gray-500">
                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                            
                            {isExpanded && (
                                <div className="mt-6 pt-6 border-t border-gray-700/50" onClick={e => e.stopPropagation()}>
                                    <div className="q-expanded-top">
                                        <div>
                                            <h4 className="text-gray-400 text-sm font-bold uppercase mb-4">Options</h4>
                                            <div className="options-list-premium">
                                                {q.options.map((opt, optIdx) => (
                                                    <div key={optIdx} className={`option-item-premium ${optIdx === q.correctAnswerIndex ? 'correct-answer' : ''}`}>
                                                        <span style={{fontWeight: '700', opacity: 0.5}}>{String.fromCharCode(65 + optIdx)}.</span> 
                                                        <span style={{flexGrow: 1}}>{opt}</span>
                                                        {optIdx === q.correctAnswerIndex && <CheckCircle size={18} />}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-gray-400 text-sm font-bold uppercase mb-4">Answer Distribution</h4>
                                            <div style={{height: 200, width: '100%'}}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={q.options.map((opt, idx) => ({ name: String.fromCharCode(65 + idx), count: q.optionDistribution[idx] }))}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                                        <XAxis dataKey="name" stroke="#94a3b8" />
                                                        <YAxis stroke="#94a3b8" allowDecimals={false} />
                                                        <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc', borderRadius: '8px'}} />
                                                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>

                                    <h4 className="text-gray-400 text-sm font-bold uppercase mb-4 mt-8 flex items-center gap-2"><Users size={16} /> Students Who Attempted</h4>
                                    <div className="table-container-premium">
                                        <div className="table-edge-blob blob-purple"></div>
                                        <div className="table-edge-bg"></div>
                                        <div className="table-content-wrapper">
                                            <div style={{overflowX: 'auto'}}>
                                                <table className="premium-table">
                                                <thead>
                                                    <tr>
                                                        <th>Student</th>
                                                        <th>Selected Answer</th>
                                                        <th style={{textAlign: 'center'}}>Result</th>
                                                        <th style={{textAlign: 'right'}}>Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {q.studentAnswersList.map((sa, idx) => {
                                                        const userProf = usersMap[sa.studentId] || {};
                                                        const selectedText = sa.selectedOpt !== undefined && sa.selectedOpt !== null ? q.options[sa.selectedOpt] : "Skipped";
                                                        return (
                                                            <tr className="premium-row" key={idx}>
                                                                <td>
                                                                    <div className="student-info-premium">
                                                                        <img src={userProf.avatar || `https://ui-avatars.com/api/?name=${sa.studentName}&background=random`} alt="avatar" className="student-avatar" style={{width: 32, height: 32}} />
                                                                        <div className="student-details">
                                                                            <span className="student-name-premium">{sa.studentName}</span>
                                                                            <span className="student-id-premium">{sa.studentId}</span>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <span className="text-sm font-medium text-gray-300 line-clamp-2">{selectedText}</span>
                                                                </td>
                                                                <td style={{textAlign: 'center'}}>
                                                                    <span className={`status-badge ${sa.isCorrect ? 'status-pass' : 'status-fail'}`}>{sa.isCorrect ? 'Correct' : 'Incorrect'}</span>
                                                                </td>
                                                                <td style={{textAlign: 'right'}}>
                                                                    <span className="text-sm text-gray-400">{sa.submittedAt?.toDate ? sa.submittedAt.toDate().toLocaleDateString() : 'N/A'}</span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {q.studentAnswersList.length === 0 && (
                                                        <tr><td colSpan="4" className="text-center p-6 text-gray-500">No students have attempted this question yet.</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {questionMetrics.length === 0 && (
                 <div className="p-16 text-center flex flex-col items-center border border-gray-700/50 rounded-2xl bg-gray-800/20">
                     <HelpCircle size={48} className="text-gray-600 mb-4" />
                     <h3 className="text-lg font-bold text-gray-400">No Questions Found</h3>
                 </div>
            )}
        </>
    );



    return (
        <div className="analytics-dashboard-container">
            <div className="premium-header">
                <div className="header-left">
                    <button onClick={() => navigate('/admin/quizzes')} className="back-btn-premium" title="Back to Quizzes">
                        <ArrowLeft size={22} />
                    </button>
                    <div className="header-text-group">
                        <h1>{quiz.title}</h1>
                        <p>Real-time Performance Analytics</p>
                    </div>
                </div>
                <div className="header-right z-10 relative bg-slate-800/80 px-4 py-2 rounded-xl backdrop-blur border border-slate-600/50 flex items-center gap-4">

                    <span className="text-sm font-bold text-blue-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Live Updates Active
                    </span>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="tabs-container">
                <button 
                    className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}
                    onClick={() => setActiveTab('students')}
                >
                    <Users size={18} /> Student Analytics
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'questions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('questions')}
                >
                    <HelpCircle size={18} /> Question Analytics
                </button>
            </div>

            {/* Tab Contents */}
            {activeTab === 'students' ? renderStudentAnalytics() : renderQuestionAnalytics()}
        </div>
    );
};

export default AdminQuizAnalytics;
