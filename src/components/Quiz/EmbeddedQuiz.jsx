import { RefreshCw, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { submitQuizAttempt } from '../../services/quizService';
import { analyzeQuizResults } from '../../services/aiQuizService';
import { useAuth } from '../../context/AuthContext';
import './EmbeddedQuiz.css';

// Utility to shuffle array
const shuffleArray = (array) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
};

const EmbeddedQuiz = ({ moduleId, moduleTitle, questions: initialQuestions, onClose, passingPercentage = 40 }) => {
    const { user } = useAuth();
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes default
    const [aiFeedback, setAiFeedback] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // Auto-save key
    const progressKey = `quiz_progress_${moduleId}`;

    // Initialization & Resume Logic
    useEffect(() => {
        const savedProgress = localStorage.getItem(progressKey);
        let loadedQuestions = initialQuestions;

        if (savedProgress) {
            const parsed = JSON.parse(savedProgress);
            if (window.confirm("You have an unfinished quiz attempt. Would you like to resume?")) {
                setAnswers(parsed.answers || {});
                setTimeLeft(parsed.timeLeft || 15 * 60);
                setCurrentQuestionIndex(parsed.currentQuestionIndex || 0);
                loadedQuestions = parsed.questions || initialQuestions;
            } else {
                localStorage.removeItem(progressKey);
                loadedQuestions = shuffleArray(initialQuestions);
            }
        } else {
            loadedQuestions = shuffleArray(initialQuestions);
        }
        
        setQuestions(loadedQuestions);
    }, [initialQuestions, moduleId]);

    // Timer Logic
    useEffect(() => {
        if (isSubmitted || questions.length === 0) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isSubmitted, questions.length]);

    // Auto-save Logic
    useEffect(() => {
        if (!isSubmitted && questions.length > 0) {
            localStorage.setItem(progressKey, JSON.stringify({
                answers,
                timeLeft,
                currentQuestionIndex,
                questions
            }));
        }
    }, [answers, timeLeft, currentQuestionIndex, isSubmitted, questions]);

    const handleOptionSelect = (optionIndex) => {
        if (isSubmitted) return;
        setAnswers({
            ...answers,
            [currentQuestionIndex]: optionIndex
        });
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleSubmit = async () => {
        let calculatedScore = 0;
        questions.forEach((q, index) => {
            if (answers[index] === q.correctAnswerIndex) {
                calculatedScore += q.marks || 1;
            }
        });

        setScore(calculatedScore);
        setIsSubmitted(true);

        const finalScore = calculatedScore;
        const totalM = questions.reduce((acc, q) => acc + (q.marks || 1), 0);
        
        try {
            await submitQuizAttempt({
                quizId: moduleId, // Ensure it's compatible with dashboard query
                moduleId,
                studentId: user?.uid,
                studentName: user?.fullName || 'Student',
                answers,
                score: finalScore,
                totalMarks: totalM,
                percentage: (finalScore / totalM) * 100,
                timeTaken: (15 * 60) - timeLeft
            });
            localStorage.removeItem(progressKey); // Clear progress on submit
        } catch (error) {
            console.error("Failed to save attempt:", error);
        }

        // Fetch AI Analysis
        setIsAnalyzing(true);
        const analysis = await analyzeQuizResults(questions, answers);
        setAiFeedback(analysis);
        setIsAnalyzing(false);
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (questions.length === 0) return <div className="p-8 text-center">Loading quiz...</div>;

    const currentQuestion = questions[currentQuestionIndex];
    const totalMarks = questions.reduce((acc, q) => acc + (q.marks || 1), 0);
    const percentage = isSubmitted ? Math.round((score / totalMarks) * 100) : 0;
    const isPass = percentage >= passingPercentage;

    if (isSubmitted) {
        return (
            <div className="embedded-quiz-container results-mode">
                <div className="quiz-header">
                    <h2>Quiz Results: {moduleTitle}</h2>
                    <button onClick={onClose} className="btn-close-quiz">Close</button>
                </div>
                
                <div className="score-card">
                    <div className={`score-circle ${isPass ? 'pass' : 'fail'}`}>
                        <span className="score-val">{percentage}%</span>
                        <span className="score-sub">{score} / {totalMarks}</span>
                    </div>
                    <div className="score-details">
                        <h3>{isPass ? 'Great Job!' : 'Keep Practicing!'}</h3>
                        <p className={`score-status ${isPass ? 'pass' : 'fail'}`}>
                            {isPass ? 'Status: Passed' : 'Status: Failed'}
                        </p>
                        <p className="score-time">You completed the quiz in {formatTime((15 * 60) - timeLeft)}</p>
                    </div>
                </div>

                {/* AI Feedback Section */}
                <div className="ai-feedback-container">
                    <h3 className="ai-feedback-title">
                        <RefreshCw className={isAnalyzing ? "animate-spin" : ""} size={22} />
                        AI Performance Analysis
                    </h3>
                    {isAnalyzing ? (
                        <p className="ai-analyzing-text animate-pulse">Analyzing your strengths and weaknesses...</p>
                    ) : aiFeedback ? (
                        <div className="ai-feedback-content">
                            <div className="ai-feedback-block strengths">
                                <h4>Strengths</h4>
                                <p>{aiFeedback.strengths}</p>
                            </div>
                            <div className="ai-feedback-block weaknesses">
                                <h4>Areas to Improve</h4>
                                <p>{aiFeedback.weaknesses}</p>
                            </div>
                            <div className="ai-feedback-block recommendation">
                                <h4>Recommendation</h4>
                                <p>{aiFeedback.recommendation}</p>
                            </div>
                        </div>
                    ) : (
                        <p className="ai-unavailable-text">Analysis unavailable at this time.</p>
                    )}
                </div>

                <div className="review-section">
                    <h3 className="text-lg font-bold mb-4">Review Answers</h3>
                    {questions.map((q, qIndex) => {
                        const studentAnswer = answers[qIndex];
                        const isCorrect = studentAnswer === q.correctAnswerIndex;
                        const isUnanswered = studentAnswer === undefined;

                        return (
                            <div key={qIndex} className={`review-question-card ${isCorrect ? 'correct' : (isUnanswered ? 'unanswered' : 'incorrect')}`}>
                                <div className="rq-header">
                                    <span className="rq-number">Q{qIndex + 1}</span>
                                    <p className="rq-text">{q.questionText}</p>
                                </div>
                                <div className="rq-options">
                                    {q.options.map((opt, oIndex) => {
                                        let optClass = 'opt-review ';
                                        if (oIndex === q.correctAnswerIndex) {
                                            optClass += 'opt-correct';
                                        } else if (oIndex === studentAnswer && !isCorrect) {
                                            optClass += 'opt-wrong';
                                        }

                                        return (
                                            <div key={oIndex} className={optClass}>
                                                {oIndex === q.correctAnswerIndex && <CheckCircle size={16} className="text-green-600 inline mr-2" />}
                                                {oIndex === studentAnswer && !isCorrect && <XCircle size={16} className="text-red-600 inline mr-2" />}
                                                {opt}
                                            </div>
                                        );
                                    })}
                                </div>
                                {q.explanation && (
                                    <div className="rq-explanation">
                                        <strong>Explanation:</strong> {q.explanation}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="embedded-quiz-container">
            <div className="quiz-header">
                <div>
                    <h2 className="quiz-title">Test Your Knowledge</h2>
                    <div className="quiz-progress">Question {currentQuestionIndex + 1} of {questions.length}</div>
                </div>
                <div className="quiz-timer">
                    <Clock size={16} />
                    <span>{formatTime(timeLeft)}</span>
                </div>
            </div>

            <div className="quiz-progress-bar">
                <div 
                    className="quiz-progress-fill" 
                    style={{ width: `${((currentQuestionIndex) / questions.length) * 100}%` }}
                ></div>
            </div>

            <div className="question-card">
                <h3 className="question-text">{currentQuestion.questionText}</h3>
                <div className="options-list">
                    {currentQuestion.options.map((option, index) => (
                        <button
                            key={index}
                            className={`option-btn ${answers[currentQuestionIndex] === index ? 'selected' : ''}`}
                            onClick={() => handleOptionSelect(index)}
                        >
                            <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                            <span className="option-text">{option}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="quiz-footer">
                <button 
                    className="btn-nav prev" 
                    onClick={handlePrev} 
                    disabled={currentQuestionIndex === 0}
                >
                    <ChevronLeft size={18} /> Previous
                </button>
                
                {currentQuestionIndex === questions.length - 1 ? (
                    <button className="btn-submit" onClick={handleSubmit}>
                        Submit Quiz
                    </button>
                ) : (
                    <button className="btn-nav next" onClick={handleNext}>
                        Next <ChevronRight size={18} />
                    </button>
                )}
            </div>
            
            <div className="quiz-meta-footer">
                <span className="quiz-auto-save">
                    <Save size={14} /> Progress is auto-saved
                </span>
                <button onClick={onClose} className="btn-save-close">Save & Close</button>
            </div>
        </div>
    );
};

export default EmbeddedQuiz;
