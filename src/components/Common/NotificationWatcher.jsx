import { useEffect, useRef } from 'react';
import { db, bulkUploadDb } from '../../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useDownload } from '../../context/DownloadContext';
import { useAuth } from '../../context/AuthContext';

const NotificationWatcher = () => {
    const { notify } = useDownload();
    const { user } = useAuth();
    
    // Refs to track if we've already notified in the current session
    const lastExamUpdateRef = useRef(localStorage.getItem('last_exam_update_seen') || '0');
    const lastSeatingUpdateRef = useRef(localStorage.getItem('last_seating_update_seen') || '0');
    
    // Initial mount flag to prevent notification on first load if already seen
    const isInitialMount = useRef(true);

    useEffect(() => {
        if (!user) return;

        // 1. Watch Exam Schedules
        const unsubExams = onSnapshot(doc(db, 'settings', 'exam_schedule'), (snapshot) => {
            if (!snapshot.exists()) return;
            
            const data = snapshot.data();
            const updatedAt = data.updatedAt || 0;
            const schedules = data.schedules || [];
            
            // Check if this is a new update
            if (updatedAt.toString() !== lastExamUpdateRef.current) {
                // Filter for schedules that are actually visible
                const visibleSchedules = schedules.filter(s => s.isVisible);
                
                // Only notify if there are visible schedules AND it's not a stale update during mount
                if (visibleSchedules.length > 0 && (!isInitialMount.current || updatedAt > parseInt(lastExamUpdateRef.current))) {
                    const latest = visibleSchedules[0];
                    const typeLabel = latest.type === 'semester' ? 'Semester' : 
                                     latest.type === 'mid' ? 'Mid-term' : 'Exam';
                    
                    notify(
                        "Schedule Updated", 
                        `${typeLabel} schedule for ${latest.title} is updated. Please check it out!`
                    );
                    
                    // Mark as seen
                    lastExamUpdateRef.current = updatedAt.toString();
                    localStorage.setItem('last_exam_update_seen', updatedAt.toString());
                } else if (updatedAt.toString() !== lastExamUpdateRef.current) {
                    // If it's a new update but nothing is visible, still mark it as seen to avoid stale notifications later
                    lastExamUpdateRef.current = updatedAt.toString();
                    localStorage.setItem('last_exam_update_seen', updatedAt.toString());
                }
            }
        });

        // 2. Watch Seating Data
        const unsubSeating = onSnapshot(doc(bulkUploadDb, 'settings', 'seating_data'), (snapshot) => {
            if (!snapshot.exists()) return;
            
            const data = snapshot.data();
            const updatedAt = data.updatedAt || 0;
            const isVisible = data.isVisible === true;
            
            // Cases where we update the reference without notifying
            if (updatedAt.toString() !== lastSeatingUpdateRef.current) {
                // If feature is OFF, just mark as seen and return
                if (!isVisible) {
                    lastSeatingUpdateRef.current = updatedAt.toString();
                    localStorage.setItem('last_seating_update_seen', updatedAt.toString());
                    return;
                }

                // If feature is ON, check if it's a fresh update we should notify about
                if (!isInitialMount.current || updatedAt > parseInt(lastSeatingUpdateRef.current)) {
                    const seatingList = data.data || [];
                    const studentId = user?.studentId || user?.email?.split('@')[0]?.toUpperCase();
                    
                    if (studentId) {
                        const mySeating = seatingList.find(s => 
                            s['ID No.']?.toUpperCase() === studentId.toUpperCase() ||
                            s['ID No.']?.toUpperCase() === `RGUKT-${studentId.toUpperCase()}`
                        );
                        
                        if (mySeating) {
                            const subject = mySeating['SUBJECT'] || 'Exam';
                            notify(
                                "Seating Updated", 
                                `${subject}: Your seating position is updated.`
                            );
                        }
                    }
                    
                    // Mark as seen
                    lastSeatingUpdateRef.current = updatedAt.toString();
                    localStorage.setItem('last_seating_update_seen', updatedAt.toString());
                }
            }
        });

        // After initial data fetch setup, set mount flag to false
        // This ensures we only notify on *actual* future changes or if the user hasn't seen the current one
        setTimeout(() => {
            isInitialMount.current = false;
        }, 3000);

        return () => {
            unsubExams();
            unsubSeating();
        };
    }, [user, notify]);

    return null; // This component doesn't render anything
};

export default NotificationWatcher;
