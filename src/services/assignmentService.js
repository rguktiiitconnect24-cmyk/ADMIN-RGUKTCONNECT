import { db } from '../config/firebase';
import { collection, doc, addDoc, getDocs, query, where, updateDoc, serverTimestamp } from 'firebase/firestore';

export const createAssignment = async (assignmentData) => {
  try {
    const docRef = await addDoc(collection(db, 'assignments'), {
      ...assignmentData,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating assignment:", error);
    throw error;
  }
};

export const getAssignmentsForSubject = async (subjectId) => {
  try {
    const q = query(collection(db, 'assignments'), where("subjectId", "==", subjectId));
    const querySnapshot = await getDocs(q);
    
    let assignments = [];
    querySnapshot.forEach((doc) => {
      assignments.push({ id: doc.id, ...doc.data() });
    });
    return assignments;
  } catch (error) {
    console.error("Error fetching assignments:", error);
    throw error;
  }
};

export const submitAssignment = async (assignmentId, studentId, submissionData) => {
  try {
    const docRef = await addDoc(collection(db, 'assignment_submissions'), {
      assignmentId,
      studentId,
      ...submissionData,
      submittedAt: serverTimestamp(),
      status: 'submitted'
    });
    return docRef.id;
  } catch (error) {
    console.error("Error submitting assignment:", error);
    throw error;
  }
};

export const gradeAssignment = async (submissionId, gradeData) => {
  try {
    const submissionRef = doc(db, 'assignment_submissions', submissionId);
    await updateDoc(submissionRef, {
      ...gradeData,
      status: 'graded',
      gradedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error("Error grading assignment:", error);
    throw error;
  }
};
