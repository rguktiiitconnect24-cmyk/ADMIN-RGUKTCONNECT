import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

// Initialize Gemini API (Uses the environment variable from Vite)
// Fallback to a placeholder if not set, but ensure you set VITE_GEMINI_API_KEY in .env
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

/**
 * Generates an MCQ quiz based on a given topic/module label.
 * @param {string} topic The topic to generate the quiz for.
 * @param {number} numQuestions The number of questions to generate (default 10).
 * @param {string} difficulty The difficulty level (Easy, Moderate, High).
 * @returns {Promise<Array>} Array of question objects.
 */
export const generateQuizForTopic = async (topic, numQuestions = 10, difficulty = 'Moderate') => {
    try {
        if (!import.meta.env.VITE_GEMINI_API_KEY) {
            throw new Error("Gemini API key is missing. Please set VITE_GEMINI_API_KEY in your .env file.");
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.ARRAY,
                    description: "A list of multiple choice questions.",
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            questionText: { type: SchemaType.STRING, description: "The text of the question." },
                            options: {
                                type: SchemaType.ARRAY,
                                description: "Exactly 4 options for the question.",
                                items: { type: SchemaType.STRING }
                            },
                            correctAnswerIndex: { type: SchemaType.INTEGER, description: "The index of the correct option (0, 1, 2, or 3)." },
                            explanation: { type: SchemaType.STRING, description: "A brief explanation of why the correct answer is right." },
                            difficulty: { type: SchemaType.STRING, description: "The difficulty level of the question: Easy, Moderate, or High." },
                            marks: { type: SchemaType.INTEGER, description: "Marks for this question (default 1)." }
                        },
                        required: ["questionText", "options", "correctAnswerIndex", "explanation", "difficulty", "marks"]
                    }
                }
            }
        });

        const prompt = `Generate a ${numQuestions}-question multiple choice quiz on the topic of "${topic}".
                        The difficulty of these questions should be exactly: ${difficulty}. 
                        Tailor the vocabulary, complexity, and distractors to this difficulty level.
                        Make sure the options are plausible but only one is clearly correct.`;

        const result = await model.generateContent(prompt);
        let responseText = result.response.text();
        
        // Sometimes the AI returns the JSON wrapped in markdown blocks
        responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        
        const quizData = JSON.parse(responseText);
        
        return quizData;

    } catch (error) {
        console.error("Error generating quiz:", error);
        throw error;
    }
};

/**
 * Analyzes the student's answers and generates feedback on strengths and weaknesses.
 */
export const analyzeQuizResults = async (questions, answers) => {
    try {
        if (!import.meta.env.VITE_GEMINI_API_KEY) return null;

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        strengths: { type: SchemaType.STRING, description: "A short 1-2 sentence summary of what the student did well." },
                        weaknesses: { type: SchemaType.STRING, description: "A short 1-2 sentence summary of areas to improve." },
                        recommendation: { type: SchemaType.STRING, description: "A short tip for next time." }
                    },
                    required: ["strengths", "weaknesses", "recommendation"]
                }
            }
        });

        // Map data to a simple format for AI
        const analysisData = questions.map((q, i) => ({
            question: q.questionText,
            isCorrect: answers[i] === q.correctAnswerIndex
        }));

        const prompt = `Analyze the following quiz attempt and provide feedback identifying strengths and weaknesses.
        Data: ${JSON.stringify(analysisData)}`;

        const result = await model.generateContent(prompt);
        return JSON.parse(result.response.text());
    } catch (error) {
        console.error("Error analyzing quiz:", error);
        return null;
    }
};
