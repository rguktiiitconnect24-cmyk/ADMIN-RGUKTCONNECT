import { db } from '../config/firebase';
import { collection, doc, getDoc, getDocs, query, where, setDoc } from 'firebase/firestore';

// Fetch the faculty profile
export const getFacultyProfile = async (uid) => {
  try {
    const docRef = doc(db, 'faculty_profiles', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching faculty profile:", error);
    throw error;
  }
};

// Update faculty profile
export const updateFacultyProfile = async (uid, data) => {
  try {
    const docRef = doc(db, 'faculty_profiles', uid);
    await setDoc(docRef, data, { merge: true });
    
    // Sync critical data back to main user record if needed
    if (data.name || data.department) {
        const userRef = doc(db, 'users', uid);
        await setDoc(userRef, {
            ...(data.name && { fullName: data.name }),
            ...(data.department && { department: data.department }),
        }, { merge: true });
    }
    
    return true;
  } catch (error) {
    console.error("Error updating faculty profile:", error);
    throw error;
  }
};

// Fetch assigned subjects
export const getAssignedSubjects = async (uid) => {
  try {
    // We assume subjects have an 'assignedTo' array or string field
    const q = query(collection(db, 'subjects'), where("assignedTo", "array-contains", uid));
    const querySnapshot = await getDocs(q);
    
    let subjects = [];
    querySnapshot.forEach((doc) => {
      subjects.push({ id: doc.id, ...doc.data() });
    });
    
    return subjects;
  } catch (error) {
    console.error("Error fetching assigned subjects:", error);
    throw error;
  }
};

// Get Dashboard Stats
export const getFacultyDashboardStats = async (uid) => {
  try {
    const subjects = await getAssignedSubjects(uid);
    
    // Dummy implementation for now - replace with actual counts
    return {
      totalSubjects: subjects.length,
      totalClasses: subjects.length * 2, // Assuming 2 classes per subject
      totalStudents: 120, // Dummy
      totalAssignments: 5,
      totalQuizzes: 3,
      pendingEvaluations: 12,
      recentNoticesCount: 2
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    throw error;
  }
};
