import { ChevronDown, X, List, Settings, Loader2, Save, Plus, Edit2, Trash2, Check, Lightbulb, Sigma } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { getQuestionsForQuiz, addQuestion, deleteQuestion, updateQuestion } from '../../services/quizService';
import { generateQuizForTopic } from '../../services/aiQuizService';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { contentDb as db } from '../../config/firebase';
import 'mathlive';

const CustomDropdown = ({ value, onChange, options, className }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div 
            className={`uqm-custom-dropdown ${className || ''}`}
            tabIndex={0}
            onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                    setIsOpen(false);
                }
            }}
        >
            <div 
                className="uqm-dropdown-header" 
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{value}</span>
                <ChevronDown size={16} className={`uqm-dropdown-icon ${isOpen ? 'open' : ''}`} />
            </div>
            {isOpen && (
                <div className="uqm-dropdown-list">
                    {options.map(opt => (
                        <div 
                            key={opt}
                            className={`uqm-dropdown-item ${value === opt ? 'selected' : ''}`}
                            onClick={() => {
                                onChange(opt);
                                setIsOpen(false);
                            }}
                        >
                            {opt}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const MathFieldRenderer = ({ math, inline }) => {
    const ref = useRef(null);
    useEffect(() => {
        // Inject custom CSS into the MathLive shadow DOM to increase fraction spacing
        const injectStyle = () => {
            if (ref.current && ref.current.shadowRoot) {
                let styleEl = ref.current.shadowRoot.querySelector('#custom-frac-style');
                if (!styleEl) {
                    styleEl = document.createElement('style');
                    styleEl.id = 'custom-frac-style';
                    styleEl.textContent = `
                        .ML__num { transform: translateY(-0.15em) !important; display: inline-block; }
                        .ML__den { transform: translateY(0.15em) !important; display: inline-block; }
                        .ML__frac-line { height: 1.5px !important; background-color: currentColor !important; }
                    `;
                    ref.current.shadowRoot.appendChild(styleEl);
                }
            }
        };

        // It might take a moment for the shadow root to initialize
        if (ref.current) {
            injectStyle();
            // Retry after a short delay in case it's not ready
            setTimeout(injectStyle, 50);
        }
    }, [math]);

    return (
        <math-field 
            ref={ref}
            style={{ 
                display: inline ? 'inline-block' : 'block', 
                backgroundColor: 'transparent', 
                border: 'none', 
                padding: 0, 
                outline: 'none', 
                pointerEvents: 'none', 
                color: 'var(--color-text-main, #000)', 
                verticalAlign: 'middle', 
                margin: inline ? '0 4px' : '0',
                fontSize: inline ? '1.1em' : '1.2em'
            }}
        >
            {inline ? `\\displaystyle ${math}` : math}
        </math-field>
    );
};

const MixedMathText = ({ text }) => {
    if (!text) return null;
    
    // Normalize delimiters
    let normalizedText = text
        .replace(/\\\(/g, '$')
        .replace(/\\\)/g, '$')
        .replace(/\\\[/g, '$$')
        .replace(/\\\]/g, '$$');

    // Split by block math $$...$$
    const blockParts = normalizedText.split(/(\$\$[\s\S]*?\$\$)/);
    
    return (
        <div style={{ lineHeight: '1.6', fontSize: '1rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--color-text-main, #000)' }}>
            {blockParts.map((bPart, bIdx) => {
                if (bPart.startsWith('$$') && bPart.endsWith('$$')) {
                    const math = bPart.slice(2, -2).trim();
                    return (
                        <div key={bIdx} className="my-4 flex justify-center w-full" style={{ overflowX: 'auto', overflowY: 'hidden' }}>
                            <MathFieldRenderer math={math} inline={false} />
                        </div>
                    );
                }
                
                // Split inline math $...$
                const inlineParts = bPart.split(/(\$[\s\S]*?\$)/);
                return inlineParts.map((iPart, iIdx) => {
                    if (iPart.startsWith('$') && iPart.endsWith('$') && iPart !== '$') {
                        const math = iPart.slice(1, -1).trim();
                        return (
                            <MathFieldRenderer key={`${bIdx}-${iIdx}`} math={math} inline={true} />
                        );
                    }
                    return <span key={`${bIdx}-${iIdx}`}>{iPart}</span>;
                });
            })}
        </div>
    );
};

const UnitQuizManager = ({ targetId, targetLabel, targetPath, onClose }) => {
    const [activeTab, setActiveTab] = useState('questions'); // 'questions', 'settings'
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Settings state
    const [settings, setSettings] = useState({
        isEnabled: true,
        passingPercentage: 40,
        maxRetakes: 3
    });
    const [savingSettings, setSavingSettings] = useState(false);

    const [editingQuestion, setEditingQuestion] = useState(null);
    const [newQuestion, setNewQuestion] = useState({
        questionText: '',
        options: ['', '', '', ''],
        correctAnswerIndex: 0,
        hint: '',
        answerExplanation: '',
        difficulty: 'Moderate',
        marks: 1
    });
    const [showForm, setShowForm] = useState(false);
    const [isSavingQuestion, setIsSavingQuestion] = useState(false);
    const [generateDifficulty, setGenerateDifficulty] = useState('Moderate');

    // Math Modal State
    const [showMathModal, setShowMathModal] = useState(false);
    const [mathTarget, setMathTarget] = useState(null);
    const [tempMathValue, setTempMathValue] = useState('');
    const inputRefs = useRef({});

    const openMathModal = (target) => {
        setMathTarget(target);
        setTempMathValue('');
        setShowMathModal(true);
    };

    const handleInsertMath = () => {
        const mathToInsert = `$$${tempMathValue}$$`;
        
        let currentValue = '';
        if (mathTarget === 'questionText') {
            currentValue = newQuestion.questionText;
        } else if (mathTarget && mathTarget.startsWith('option-')) {
            const idx = parseInt(mathTarget.split('-')[1]);
            currentValue = newQuestion.options[idx];
        }

        const ref = inputRefs.current[mathTarget];
        let newValue = currentValue;
        if (ref) {
            const cursorStart = ref.selectionStart;
            newValue = currentValue.substring(0, cursorStart) + ' ' + mathToInsert + ' ' + currentValue.substring(cursorStart);
        } else {
            newValue = currentValue + ' ' + mathToInsert;
        }

        if (mathTarget === 'questionText') {
            setNewQuestion({ ...newQuestion, questionText: newValue });
        } else if (mathTarget && mathTarget.startsWith('option-')) {
            const idx = parseInt(mathTarget.split('-')[1]);
            const updatedOptions = [...newQuestion.options];
            updatedOptions[idx] = newValue;
            setNewQuestion({ ...newQuestion, options: updatedOptions });
        }
        setShowMathModal(false);
    };

    const setMathModalRef = (element) => {
        if (element && !element.hasAttribute('data-configured')) {
            element.smartMode = true;
            element.mathVirtualKeyboardPolicy = "manual";
            element.setAttribute('data-configured', 'true');
            
            // Inject fraction spacing CSS into Modal
            if (element.shadowRoot) {
                let styleEl = element.shadowRoot.querySelector('#custom-frac-style');
                if (!styleEl) {
                    styleEl = document.createElement('style');
                    styleEl.id = 'custom-frac-style';
                    styleEl.textContent = `
                        .ML__num { transform: translateY(-0.15em) !important; display: inline-block; }
                        .ML__den { transform: translateY(0.15em) !important; display: inline-block; }
                        .ML__frac-line { height: 1.5px !important; background-color: currentColor !important; }
                    `;
                    element.shadowRoot.appendChild(styleEl);
                }
            }
        }
    };

    useEffect(() => {
        fetchQuestions();
        fetchSettings();
    }, [targetId]);

    const fetchSettings = async () => {
        try {
            const docRef = doc(db, 'quiz_settings', targetId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setSettings(docSnap.data());
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
        }
    };

    const handleSaveSettings = async () => {
        setSavingSettings(true);
        try {
            await setDoc(doc(db, 'quiz_settings', targetId), settings);
            alert("Settings saved successfully!");
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Failed to save settings.");
        } finally {
            setSavingSettings(false);
        }
    };

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            const data = await getQuestionsForQuiz(targetId);
            setQuestions(data);
        } catch (error) {
            console.error("Error fetching questions", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateAI = async () => {
        setIsGenerating(true);
        try {
            const aiQuestions = await generateQuizForTopic(targetLabel, 5, generateDifficulty); // Generate 5 at a time
            
            // Save them to Firebase
            for (const q of aiQuestions) {
                await addQuestion(targetId, q);
            }
            
            await fetchQuestions();
            alert(`Successfully generated and saved 5 ${generateDifficulty} questions using AI!`);
        } catch (error) {
            console.error("Error generating AI quiz:", error);
            alert("Failed to generate AI questions.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleOptionChange = (index, value) => {
        const updatedOptions = [...newQuestion.options];
        updatedOptions[index] = value;
        setNewQuestion({ ...newQuestion, options: updatedOptions });
    };

    const handleSaveQuestion = async (addAnother = false) => {
        if (!newQuestion.questionText || newQuestion.options.some(opt => !opt.trim())) {
            alert("Please fill all fields and options.");
            return;
        }

        setIsSavingQuestion(true);
        try {
            if (editingQuestion) {
                await updateQuestion(editingQuestion.id, newQuestion);
            } else {
                await addQuestion(targetId, newQuestion);
            }
            
            setEditingQuestion(null);
            setNewQuestion({
                questionText: '',
                options: ['', '', '', ''],
                correctAnswerIndex: 0,
                hint: '',
                answerExplanation: '',
                difficulty: 'Moderate',
                marks: 1
            });
            fetchQuestions();

            if (!addAnother) {
                setShowForm(false);
            }
        } catch (error) {
            console.error("Error saving question:", error);
        } finally {
            setIsSavingQuestion(false);
        }
    };

    const handleEdit = (q) => {
        setEditingQuestion(q);
        setNewQuestion(q);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this question?")) {
            await deleteQuestion(id);
            fetchQuestions();
        }
    };

    return (
        <>
        <style dangerouslySetInnerHTML={{__html: `
.uqm-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 70000;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0;
    animation: fadeIn 0.3s ease;
}

.uqm-overlay::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--color-background);
    opacity: 0.8;
    backdrop-filter: blur(12px);
    z-index: -1;
}

.uqm-modal {
    background: var(--color-surface);
    border: none;
    width: 100vw;
    height: 100vh;
    max-width: none;
    max-height: none;
    border-radius: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.uqm-header {
    padding: 1.5rem 2rem;
    border-bottom: 1px solid var(--color-border);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    background: var(--color-surface);
}

.uqm-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-text-main);
    margin: 0;
}

.uqm-subtitle {
    font-size: 0.875rem;
    color: var(--color-text-main);
    opacity: 0.7;
    margin-top: 0.25rem;
}

.uqm-subtitle-target {
    color: var(--color-primary-400);
    font-weight: 600;
}

.uqm-close-btn {
    background: var(--color-surface-hover);
    border: 1px solid var(--color-border);
    color: var(--color-text-main);
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
}

.uqm-close-btn:hover {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
    transform: rotate(90deg);
}

.uqm-tabs {
    display: flex;
    gap: 1rem;
    padding: 0 2rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-background);
}

.uqm-tab {
    padding: 1rem 0;
    background: none;
    border: none;
    color: var(--color-text-main);
    opacity: 0.7;
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
}

.uqm-tab:hover {
    opacity: 1;
}

.uqm-tab.active {
    opacity: 1;
    color: var(--color-primary-500);
    border-bottom-color: var(--color-primary-500);
}

.uqm-body {
    flex: 1;
    overflow-y: auto;
    padding: 2rem;
}

.uqm-body::-webkit-scrollbar {
    width: 6px;
}
.uqm-body::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
}
.uqm-body::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
}
.uqm-body::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.2);
}

.uqm-actions {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    justify-content: space-between;
    align-items: center;
}

.uqm-btn-primary, .uqm-btn-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: none;
}

.uqm-btn-primary {
    background: linear-gradient(135deg, #8b5cf6, #6d28d9);
    color: white;
    box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
}

.uqm-btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(139, 92, 246, 0.4);
}

.uqm-btn-secondary {
    background: var(--color-surface-hover);
    color: var(--color-text-main);
    border: 1px solid var(--color-border);
}

.uqm-btn-secondary:hover {
    background: var(--color-border);
    transform: translateY(-2px);
}

.uqm-question-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 0.75rem 1rem;
    margin-bottom: 0.75rem;
    transition: all 0.3s;
}

.uqm-question-card:hover {
    border-color: rgba(139, 92, 246, 0.3);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    transform: translateY(-2px);
}

.uqm-q-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
}

.uqm-q-title {
    font-size: 0.95rem;
    color: var(--color-text-main);
    font-weight: 500;
    line-height: 1.4;
}

.uqm-q-badge {
    background: rgba(139, 92, 246, 0.1);
    color: var(--color-primary-600);
    padding: 0.2rem 0.6rem;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 700;
    margin-right: 0.75rem;
}

.uqm-q-actions {
    display: flex;
    gap: 0.5rem;
}

.uqm-action-btn {
    background: var(--color-surface-hover);
    border: 1px solid var(--color-border);
    color: var(--color-text-main);
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
}

.uqm-action-btn:hover {
    background: var(--color-border);
    color: var(--color-primary-600);
}
.uqm-action-btn.delete:hover {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
}

.uqm-options-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.4rem;
    padding-left: 2.5rem;
}

.uqm-option {
    background: var(--color-background);
    border: 1px solid var(--color-border);
    padding: 0.4rem 0.75rem;
    border-radius: 8px;
    font-size: 0.85rem;
    color: var(--color-text-main);
    display: flex;
    align-items: center;
    transition: all 0.2s;
}

.uqm-option-letter {
    font-weight: 700;
    color: var(--color-text-main);
    opacity: 0.7;
    margin-right: 0.75rem;
}

.uqm-option.correct {
    background: rgba(16, 185, 129, 0.1);
    border-color: rgba(16, 185, 129, 0.3);
    color: #10b981;
}

.uqm-option.correct .uqm-option-letter {
    color: #34d399;
}

.uqm-explanation {
    margin-top: 1rem;
    margin-left: 3rem;
    background: rgba(59, 130, 246, 0.05);
    border-left: 3px solid var(--color-primary-500);
    padding: 0.75rem 1rem;
    border-radius: 0 8px 8px 0;
    font-size: 0.85rem;
    color: var(--color-text-main);
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideUp {
    from { opacity: 0; transform: translateY(20px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
}

.uqm-form {
    background: var(--color-surface);
    border: 1px solid var(--color-primary-300);
    border-radius: 16px;
    padding: 1.5rem;
    margin-bottom: 2rem;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    animation: fadeIn 0.3s ease;
}

.uqm-form-title {
    color: var(--color-text-main);
    font-weight: 600;
    margin-bottom: 1.5rem;
    font-size: 1.1rem;
}

.uqm-custom-dropdown {
    position: relative;
    width: 130px;
    outline: none;
}

.uqm-dropdown-header {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-main);
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    transition: all 0.2s ease;
}

.uqm-dropdown-header:hover {
    border-color: var(--color-primary-400);
}

.uqm-dropdown-icon {
    color: var(--color-text-muted);
    transition: transform 0.2s ease;
}
.uqm-dropdown-icon.open {
    transform: rotate(180deg);
}

.uqm-dropdown-list {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    z-index: 50;
    overflow: hidden;
    animation: dropdownFade 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes dropdownFade {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
}

.uqm-dropdown-item {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    color: var(--color-text-main);
    cursor: pointer;
    transition: background-color 0.2s;
}

.uqm-dropdown-item:hover {
    background-color: rgba(139, 92, 246, 0.1);
}
.uqm-dropdown-item.selected {
    color: var(--color-primary-400);
    font-weight: 600;
    background-color: rgba(139, 92, 246, 0.05);
}

.uqm-input-group {
    margin-bottom: 1.25rem;
}

.uqm-label {
    display: block;
    color: var(--color-text-main);
    opacity: 0.7;
    font-size: 0.85rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
}

.uqm-input, .uqm-textarea {
    width: 100%;
    background: var(--color-background);
    border: 1px solid var(--color-border);
    color: var(--color-text-main);
    border-radius: 8px;
    padding: 0.75rem 1rem;
    font-size: 0.95rem;
    transition: all 0.2s;
}

.uqm-input:focus, .uqm-textarea:focus {
    outline: none;
    border-color: var(--color-primary-400);
    background: var(--color-surface-hover);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
}

.uqm-form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 1.5rem;
}

.uqm-btn-outline {
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-text-main);
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.uqm-btn-outline:hover {
    background: var(--color-surface-hover);
}

.uqm-btn-save {
    background: var(--color-primary-500);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.uqm-btn-save:hover {
    background: var(--color-primary-600);
}

.uqm-settings-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    padding: 1.5rem;
}

.uqm-math-modal {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    width: 100%;
    max-width: 650px;
    padding: 1.5rem;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.uqm-math-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.uqm-math-title {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--color-text-main);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
}
.uqm-math-title svg {
    color: var(--color-primary-400);
}

.uqm-math-editor-container {
    background: var(--color-background);
    border-radius: 8px;
    padding: 0.5rem;
    border: 1px solid var(--color-border);
    min-height: 120px;
}

.uqm-math-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 0.5rem;
}

math-field::part(menu-toggle) {
    display: none !important;
}

math-field::part(virtual-keyboard-toggle) {
    display: none !important;
}

math-field::part(mode-toggle) {
    display: none !important;
}
        `}} />
        <div className="uqm-overlay">
            <div className="uqm-modal">
                
                {/* Header */}
                <div className="uqm-header">
                    <div>
                        <h3 className="uqm-title">Manage Quiz Questions</h3>
                        <p className="uqm-subtitle">For: <span className="uqm-subtitle-target">{targetPath || targetLabel}</span></p>
                    </div>
                    <button onClick={onClose} className="uqm-close-btn">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="uqm-tabs">
                    <button 
                        className={`uqm-tab ${activeTab === 'questions' ? 'active' : ''}`}
                        onClick={() => setActiveTab('questions')}
                    >
                        <List size={16} /> Questions List
                    </button>
                    <button 
                        className={`uqm-tab ${activeTab === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('settings')}
                    >
                        <Settings size={16} /> Quiz Settings
                    </button>
                </div>

                {/* Body */}
                <div className="uqm-body">
                    {activeTab === 'settings' ? (
                        <div className="uqm-settings-card">
                            <h3 className="text-lg font-bold mb-6 text-slate-100">Configuration</h3>
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5">
                                    <div>
                                        <h4 className="font-semibold text-slate-100">Enable Quiz</h4>
                                        <p className="text-sm text-slate-400">Allow students to take this quiz.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={settings.isEnabled} onChange={(e) => setSettings({...settings, isEnabled: e.target.checked})} />
                                        <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                    </label>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="uqm-label">Passing Percentage (%)</label>
                                        <input 
                                            type="number" 
                                            min="1" max="100"
                                            className="uqm-input"
                                            value={settings.passingPercentage}
                                            onChange={(e) => setSettings({...settings, passingPercentage: Number(e.target.value)})}
                                        />
                                    </div>
                                    <div>
                                        <label className="uqm-label">Maximum Retakes</label>
                                        <input 
                                            type="number" 
                                            min="1"
                                            className="uqm-input"
                                            value={settings.maxRetakes}
                                            onChange={(e) => setSettings({...settings, maxRetakes: Number(e.target.value)})}
                                        />
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button 
                                        onClick={handleSaveSettings}
                                        disabled={savingSettings}
                                        className="uqm-btn-primary w-48 flex items-center justify-center gap-2"
                                        style={{ opacity: savingSettings ? 0.7 : 1 }}
                                    >
                                        {savingSettings ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} {savingSettings ? 'Saving...' : 'Save Settings'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Action Bar */}
                            <div className="uqm-actions">
                                <button 
                                    onClick={() => {
                                        setEditingQuestion(null);
                                        setNewQuestion({ questionText: '', options: ['', '', '', ''], correctAnswerIndex: 0, hint: '', answerExplanation: '', marks: 1 });
                                        setShowForm(true);
                                    }}
                                    className="uqm-btn-primary"
                                >
                                    <Plus size={20} /> Add New Question
                                </button>
                            </div>

                            {/* Question Form */}
                            {showForm && (
                                <div className="uqm-form">
                                    <h3 className="uqm-form-title">{editingQuestion ? 'Edit Question' : 'New Question'}</h3>
                                    
                                    <div className="uqm-input-group">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="uqm-label mb-0">Question Text</label>
                                            <button type="button" onClick={() => openMathModal('questionText')} className="uqm-btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', gap: '0.25rem' }}>
                                                <Sigma size={14} /> Insert Math
                                            </button>
                                        </div>
                                        <textarea 
                                            ref={el => inputRefs.current['questionText'] = el}
                                            className="uqm-textarea"
                                            rows="2"
                                            value={newQuestion.questionText}
                                            onChange={(e) => setNewQuestion({...newQuestion, questionText: e.target.value})}
                                            placeholder="Type the problem statement here (use LaTeX for math)"
                                            spellCheck="false"
                                            autoCorrect="off"
                                            autoCapitalize="off"
                                            autoComplete="off"
                                        />
                                        {newQuestion.questionText && (
                                            <div className="mt-2 p-3 bg-white/5 border border-white/10 rounded-lg">
                                                <div className="text-xs text-slate-400 mb-2 font-semibold">Math Preview:</div>
                                                <MixedMathText text={newQuestion.questionText} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="uqm-input-group">
                                        <label className="uqm-label">Difficulty Level</label>
                                        <CustomDropdown 
                                            value={newQuestion.difficulty || 'Moderate'}
                                            onChange={(val) => setNewQuestion({...newQuestion, difficulty: val})}
                                            options={['Easy', 'Moderate', 'High']}
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        {newQuestion.options.map((opt, idx) => (
                                            <div key={idx} className="flex items-center gap-3">
                                                <input 
                                                    type="radio" 
                                                    name="correctAnswer" 
                                                    checked={newQuestion.correctAnswerIndex === idx}
                                                    onChange={() => setNewQuestion({...newQuestion, correctAnswerIndex: idx})}
                                                    className="w-5 h-5 text-purple-600 bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-600 focus:ring-purple-500 focus:ring-2"
                                                />
                                                <div className="relative flex-1 flex">
                                                    <input 
                                                        ref={el => inputRefs.current[`option-${idx}`] = el}
                                                        type="text" 
                                                        className="uqm-input flex-1"
                                                        style={{ paddingRight: '2.5rem' }}
                                                        value={opt}
                                                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                                                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                                                    />
                                                    <button type="button" onClick={() => openMathModal(`option-${idx}`)} className="uqm-action-btn" style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent' }} title="Insert Math">
                                                        <Sigma size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="uqm-input-group">
                                        <label className="uqm-label">Hint (Optional)</label>
                                        <input 
                                            type="text" 
                                            className="uqm-input"
                                            value={newQuestion.hint || newQuestion.explanation || ''}
                                            onChange={(e) => setNewQuestion({...newQuestion, hint: e.target.value})}
                                            placeholder="Hint to show students in popup"
                                        />
                                    </div>
                                    
                                    <div className="uqm-input-group">
                                        <label className="uqm-label">Answer Explanation (Optional)</label>
                                        <input 
                                            type="text" 
                                            className="uqm-input"
                                            value={newQuestion.answerExplanation || ''}
                                            onChange={(e) => setNewQuestion({...newQuestion, answerExplanation: e.target.value})}
                                            placeholder="Why is this the correct answer?"
                                        />
                                    </div>

                                    <div className="uqm-form-actions">
                                        <button onClick={() => setShowForm(false)} className="uqm-btn-outline flex items-center justify-center gap-2" disabled={isSavingQuestion}>Cancel</button>
                                        {!editingQuestion && (
                                            <button onClick={() => handleSaveQuestion(true)} disabled={isSavingQuestion} className="uqm-btn-outline flex items-center justify-center gap-2" style={{ color: '#a78bfa', borderColor: '#a78bfa', opacity: isSavingQuestion ? 0.7 : 1 }}>
                                                {isSavingQuestion ? <><Loader2 className="animate-spin" size={18} /> Saving...</> : <><Plus size={18} /> Save & Add Another</>}
                                            </button>
                                        )}
                                        <button onClick={() => handleSaveQuestion(false)} disabled={isSavingQuestion} className="uqm-btn-save flex items-center justify-center gap-2" style={{ opacity: isSavingQuestion ? 0.7 : 1 }}>
                                            {isSavingQuestion ? (
                                                <><Loader2 className="animate-spin" size={18} /> Saving...</>
                                            ) : (
                                                <><Save size={18} /> {editingQuestion ? 'Save Changes' : 'Save & Close'}</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Questions List */}
                            {loading ? (
                                <div className="text-center py-12 text-slate-400">Loading questions...</div>
                            ) : questions.length === 0 && !showForm ? (
                                <div className="text-center py-16 rounded-2xl border border-dashed border-white/10 bg-white/5">
                                    <p className="mb-2 font-medium text-slate-200">No questions added yet.</p>
                                    <p className="text-sm text-slate-400">Add questions manually or use AI to generate them.</p>
                                </div>
                            ) : (
                                <div>
                                    {questions.map((q, index) => (
                                        <div key={q.id} className="uqm-question-card">
                                            <div className="uqm-q-header">
                                                <div className="flex items-start">
                                                    <span className="uqm-q-badge">Q{index + 1}</span>
                                                    <div className="uqm-q-title flex-1">
                                                        <MixedMathText text={q.questionText} />
                                                    </div>
                                                    {q.difficulty && (
                                                        <span className={`ml-3 px-2 py-0.5 text-xs font-semibold rounded-full ${q.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' : q.difficulty === 'Moderate' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                                            {q.difficulty}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="uqm-q-actions">
                                                    <button onClick={() => handleEdit(q)} className="uqm-action-btn edit" title="Edit"><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDelete(q.id)} className="uqm-action-btn delete" title="Delete"><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                            
                                            <div className="uqm-options-grid">
                                                {q.options.map((opt, oIdx) => {
                                                    const isCorrect = q.correctAnswerIndex === oIdx;
                                                    return (
                                                        <div key={oIdx} className={`uqm-option ${isCorrect ? 'correct' : ''}`}>
                                                            <span className="uqm-option-letter">{String.fromCharCode(65 + oIdx)}</span>
                                                            <span className="flex-1">{opt}</span>
                                                            {isCorrect && <Check size={16} className="ml-2" />}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                            
                                            {(q.hint || q.explanation) && (
                                                <div className="uqm-explanation">
                                                    <Lightbulb size={16} style={{ marginTop: '2px', flexShrink: 0, color: 'var(--color-primary-500)' }} />
                                                    <div>
                                                        <span className="font-semibold text-blue-400">Hint:</span> {q.hint || q.explanation}
                                                    </div>
                                                </div>
                                            )}
                                            {q.answerExplanation && (
                                                <div className="uqm-explanation" style={{ background: 'rgba(16, 185, 129, 0.05)', borderLeftColor: '#10b981' }}>
                                                    <Check size={16} style={{ marginTop: '2px', flexShrink: 0, color: '#10b981' }} />
                                                    <div>
                                                        <span className="font-semibold text-green-500">Explanation:</span> {q.answerExplanation}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>

        {showMathModal && (
            <div className="uqm-overlay" style={{ zIndex: 80000 }}>
                <div className="uqm-math-modal">
                    <div className="uqm-math-header">
                        <h3 className="uqm-math-title"><Sigma size={20} /> Equation Builder</h3>
                        <button onClick={() => setShowMathModal(false)} className="uqm-close-btn" style={{ width: '32px', height: '32px' }}><X size={18}/></button>
                    </div>
                    <div className="uqm-math-editor-container">
                        <math-field 
                            ref={setMathModalRef} 
                            style={{ width: '100%', fontSize: '1.5rem', minHeight: '80px', outline: 'none', border: 'none', color: 'var(--color-text-main, #fff)', backgroundColor: 'transparent' }} 
                            onInput={(e) => setTempMathValue(e.target.value)} 
                            value={tempMathValue} 
                        />
                    </div>
                    <div className="uqm-math-actions">
                        <button onClick={() => setShowMathModal(false)} className="uqm-btn-outline">Cancel</button>
                        <button onClick={handleInsertMath} className="uqm-btn-save flex items-center gap-2">
                            <Sigma size={16} /> Insert Formula
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

export default UnitQuizManager;

