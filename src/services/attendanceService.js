import { db } from '../config/firebase';
import { collection, doc, getDoc, getDocs, query, where, setDoc, serverTimestamp } from 'firebase/firestore';

export const markAttendance = async (attendanceData) => {
  try {
    // attendanceData: { classId, subjectId, date, records: [{ studentId, status: 'present'|'absent' }] }
    // Using a composite ID format: classId_subjectId_YYYY-MM-DD
    const recordId = `${attendanceData.classId}_${attendanceData.subjectId}_${attendanceData.date}`;
    
    const docRef = doc(db, 'attendance', recordId);
    await setDoc(docRef, {
      ...attendanceData,
      recordedAt: serverTimestamp()
    });
    return recordId;
  } catch (error) {
    console.error("Error marking attendance:", error);
    throw error;
  }
};

export const getAttendanceRecord = async (classId, subjectId, date) => {
  try {
    const recordId = `${classId}_${subjectId}_${date}`;
    const docRef = doc(db, 'attendance', recordId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error("Error fetching attendance:", error);
    throw error;
  }
};

export const getStudentAttendance = async (studentId, subjectId) => {
    // Logic to aggregate a specific student's attendance for a subject
    try {
        const q = query(collection(db, 'attendance'), where("subjectId", "==", subjectId));
        const querySnapshot = await getDocs(q);
        
        let totalClasses = 0;
        let attendedClasses = 0;
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            totalClasses++;
            const studentRecord = data.records?.find(r => r.studentId === studentId);
            if (studentRecord && studentRecord.status === 'present') {
                attendedClasses++;
            }
        });
        
        return {
            totalClasses,
            attendedClasses,
            percentage: totalClasses === 0 ? 0 : (attendedClasses / totalClasses) * 100
        };
    } catch (error) {
        console.error("Error fetching student attendance:", error);
        throw error;
    }
};
