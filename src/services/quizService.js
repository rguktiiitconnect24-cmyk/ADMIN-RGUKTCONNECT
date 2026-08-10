import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { contentDb as db } from '../config/firebase';

const QUIZZES_COLLECTION = 'quizzes';
const QUESTIONS_COLLECTION = 'questions';
const ATTEMPTS_COLLECTION = 'quiz_attempts';

// --- QUIZ MANAGEMENT ---

export const createQuiz = async (quizData, adminId) => {
  try {
    const docRef = await addDoc(collection(db, QUIZZES_COLLECTION), {
      ...quizData,
      createdBy: adminId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating quiz:', error);
    throw error;
  }
};

export const updateQuiz = async (quizId, quizData) => {
  try {
    const docRef = doc(db, QUIZZES_COLLECTION, quizId);
    await updateDoc(docRef, {
      ...quizData,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating quiz:', error);
    throw error;
  }
};

export const getQuizzes = async (filters = {}) => {
  try {
    let q = collection(db, QUIZZES_COLLECTION);
    
    // Add filters if needed (e.g., status, targetAudience)
    const constraints = [];
    if (filters.status) constraints.push(where('status', '==', filters.status));
    if (filters.yearId) constraints.push(where('targetAudience.yearId', '==', filters.yearId));
    if (filters.semesterId) constraints.push(where('targetAudience.semesterId', '==', filters.semesterId));
    
    if (constraints.length > 0) {
      q = query(q, ...constraints);
    } else {
      q = query(q, orderBy('createdAt', 'desc'));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    throw error;
  }
};

export const getQuizById = async (quizId) => {
  try {
    const docRef = doc(db, QUIZZES_COLLECTION, quizId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() };
    }
    return null;
  } catch (error) {
    console.error('Error fetching quiz by ID:', error);
    throw error;
  }
};

export const deleteQuiz = async (quizId) => {
  try {
    await deleteDoc(doc(db, QUIZZES_COLLECTION, quizId));
    // Note: In a production environment, you might want to cloud function to delete associated questions and attempts
    return true;
  } catch (error) {
    console.error('Error deleting quiz:', error);
    throw error;
  }
};

// --- QUESTION MANAGEMENT ---

export const addQuestion = async (quizId, questionData) => {
  try {
    const docRef = await addDoc(collection(db, QUESTIONS_COLLECTION), {
      ...questionData,
      quizId,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding question:', error);
    throw error;
  }
};

export const getQuestionsForQuiz = async (quizId) => {
  try {
    const q = query(collection(db, QUESTIONS_COLLECTION), where('quizId', '==', quizId));
    const snapshot = await getDocs(q);
    const questions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return questions.sort((a, b) => {
      if (a.orderIndex !== undefined && b.orderIndex !== undefined) {
        return a.orderIndex - b.orderIndex;
      }
      if (a.orderIndex !== undefined) return -1;
      if (b.orderIndex !== undefined) return 1;
      return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    throw error;
  }
};

export const reorderQuestions = async (questionsList) => {
  try {
    const promises = questionsList.map((q, idx) => {
      const docRef = doc(db, QUESTIONS_COLLECTION, q.id);
      return updateDoc(docRef, { orderIndex: idx });
    });
    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error('Error reordering questions:', error);
    throw error;
  }
};

export const updateQuestion = async (questionId, questionData) => {
  try {
    const docRef = doc(db, QUESTIONS_COLLECTION, questionId);
    await updateDoc(docRef, questionData);
    return true;
  } catch (error) {
    console.error('Error updating question:', error);
    throw error;
  }
};

export const deleteQuestion = async (questionId) => {
  try {
    await deleteDoc(doc(db, QUESTIONS_COLLECTION, questionId));
    return true;
  } catch (error) {
    console.error('Error deleting question:', error);
    throw error;
  }
};


// --- ATTEMPTS AND RESULTS ---

export const submitQuizAttempt = async (attemptData) => {
  try {
    const docRef = await addDoc(collection(db, ATTEMPTS_COLLECTION), {
      ...attemptData,
      submittedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error submitting quiz attempt:', error);
    throw error;
  }
};

export const getAttemptsForUser = async (studentId) => {
  try {
    const q = query(
      collection(db, ATTEMPTS_COLLECTION), 
      where('studentId', '==', studentId),
      orderBy('submittedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching user attempts:', error);
    throw error;
  }
};

export const getQuizLeaderboard = async (quizId, limitCount = 10) => {
  try {
    const q = query(
      collection(db, ATTEMPTS_COLLECTION),
      where('quizId', '==', quizId),
      orderBy('score', 'desc'),
      orderBy('timeTaken', 'asc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    throw error;
  }
};

export const getAllAttemptsForQuiz = async (quizId) => {
    try {
        const q = query(
            collection(db, ATTEMPTS_COLLECTION),
            where('quizId', '==', quizId)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch(error) {
        console.error('Error fetching attempts for quiz:', error);
        throw error;
    }
}
