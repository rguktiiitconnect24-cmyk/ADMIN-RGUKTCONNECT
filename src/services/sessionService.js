import { db } from '../config/firebase';
import { collection, doc, setDoc, updateDoc, getDocs, query, orderBy, deleteDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { UAParser } from 'ua-parser-js';

// Helper to generate a unique local session ID
const generateSessionId = () => {
    return 'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Fetch IP Address
const fetchIpAddress = async () => {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (err) {
        console.warn("Failed to fetch IP address:", err);
        return 'Unknown IP';
    }
};

/**
 * Creates a new session document in Firestore and returns the sessionId.
 * @param {string} userId
 */
export const createSession = async (userId) => {
    try {
        const parser = new UAParser();
        const result = parser.getResult();
        const sessionId = generateSessionId();

        const browser = `${result.browser.name || 'Unknown Browser'} ${result.browser.version ? result.browser.version.split('.')[0] : ''}`;
        const os = `${result.os.name || 'Unknown OS'} ${result.os.version || ''}`.trim();

        let deviceType = result.device.type || 'desktop';
        let deviceName = `${os} ${deviceType === 'desktop' ? 'PC/Laptop' : deviceType.charAt(0).toUpperCase() + deviceType.slice(1)}`;

        if (result.device.vendor && result.device.model) {
            deviceName = `${result.device.vendor} ${result.device.model}`;
        }

        const sessionData = {
            id: sessionId,
            userId,
            deviceName,
            deviceType,
            browser,
            os,
            ipAddress: 'Detecting...',
            loginTime: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            status: 'active',
            trusted: false,
        };

        const sessionRef = doc(db, 'users', userId, 'sessions', sessionId);

        // Create the session document in the background for absolute speed
        // Firestore's offline persistence handles this gracefully
        setDoc(sessionRef, sessionData).catch(err => console.warn("Initial session write failed:", err));

        // Run IP fetch and security checks in the background
        (async () => {
            try {
                const ipAddress = await fetchIpAddress();
                const existingSessions = await getUserSessions(userId);
                let isNewDevice = false;

                if (existingSessions.length > 0) {
                    const hasSeenThisDevice = existingSessions.some(
                        s => s.os === os && s.browser === browser
                    );
                    if (!hasSeenThisDevice) {
                        isNewDevice = true;
                        const notifRef = doc(collection(db, 'users', userId, 'notifications'));
                        setDoc(notifRef, {
                            type: 'security_alert',
                            title: 'New Login Detected',
                            message: `New login from ${deviceName} (${browser}) at ${ipAddress}.`,
                            timestamp: new Date().toISOString(),
                            read: false,
                            icon: 'ShieldAlert'
                        }).catch(() => {});
                    }
                }

                // Update session with correct IP
                updateDoc(sessionRef, { ipAddress }).catch(() => {});
            } catch (bgError) {
                console.warn("Background session tasks failed:", bgError);
            }
        })();

        // Store sessionId locally
        localStorage.setItem('rgukt_connect_session_id', sessionId);
        
        return { sessionData, isNewDevice: false }; 
    } catch (err) {
        console.error("Failed to create session:", err);
        return { sessionData: null, isNewDevice: false };
    }
};

/**
 * Ping the current session to update lastActive time
 * @param {string} userId
 * @param {string} sessionId
 */
export const pingSessionActivity = async (userId, sessionId) => {
    if (!userId || !sessionId) return;
    try {
        const sessionRef = doc(db, 'users', userId, 'sessions', sessionId);
        await updateDoc(sessionRef, {
            lastActive: new Date().toISOString()
        });
    } catch (err) {
        console.error("Failed to ping session:", err);
    }
};

/**
 * Fetch all sessions for a user
 */
export const getUserSessions = async (userId) => {
    if (!userId) return [];
    try {
        const sessionsRef = collection(db, 'users', userId, 'sessions');
        const q = query(sessionsRef, orderBy('lastActive', 'desc'));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        }));
    } catch (err) {
        console.error("Failed to fetch sessions:", err);
        return [];
    }
};

/**
 * Revokes a specific session (kicks the device out)
 */
export const revokeSession = async (userId, sessionId) => {
    try {
        const sessionRef = doc(db, 'users', userId, 'sessions', sessionId);
        await deleteDoc(sessionRef);
        return true;
    } catch (err) {
        console.error("Failed to revoke session:", err);
        return false;
    }
};

/**
 * Completely deletes a session document (used for manual signouts to clean up the DB)
 */
export const deleteSession = async (userId, sessionId) => {
    try {
        const sessionRef = doc(db, 'users', userId, 'sessions', sessionId);
        await deleteDoc(sessionRef);
        return true;
    } catch (err) {
        console.error("Failed to delete session:", err);
        return false;
    }
};

/**
 * Revokes all sessions EXCEPT the current one
 */
export const revokeAllOtherSessions = async (userId, currentSessionId) => {
    try {
        const sessions = await getUserSessions(userId);
        const promises = sessions
            .filter(s => s.id !== currentSessionId)
            .map(s => deleteSession(userId, s.id));

        await Promise.all(promises);
        return true;
    } catch (err) {
        console.error("Failed to revoke other sessions:", err);
        return false;
    }
};

/**
 * Update session details (e.g., Name, Trusted status)
 */
export const updateSessionDetails = async (userId, sessionId, updates) => {
    try {
        const sessionRef = doc(db, 'users', userId, 'sessions', sessionId);
        await updateDoc(sessionRef, updates);
        return true;
    } catch (err) {
        console.error("Failed to update session details:", err);
        return false;
    }
};

/**
 * Real-time listener for current session status.
 * If status changes to 'revoked', triggering callback (e.g., force logout)
 */
export const listenToMySessionStatus = (userId, sessionId, onRevoked) => {
    if (!userId || !sessionId) return () => { };

    let isFirstSnapshot = true;

    const sessionRef = doc(db, 'users', userId, 'sessions', sessionId);
    const unsubscribe = onSnapshot(sessionRef, (docSnap) => {
        if (!docSnap.exists()) {
            if (isFirstSnapshot) {
                // Race condition: sometimes Firebase snapshot returns !exists() immediately 
                // before the local setDoc cache is fully registered for the listener.
                isFirstSnapshot = false;

                // Double check if it REALLY doesn't exist after a larger delay to allow for slow sync
                setTimeout(async () => {
                    const checkRef = doc(db, 'users', userId, 'sessions', sessionId);
                    const checkSnap = await getDoc(checkRef).catch(() => null);
                    if (!checkSnap?.exists()) {
                        console.warn("Session watchdog: Session definitely missing after 5s check. Logging out.");
                        onRevoked();
                    }
                }, 5000);
                return;
            }
            // Document was actively deleted by a remote logout action
            onRevoked();
        } else {
            isFirstSnapshot = false;
            const data = docSnap.data();
            if (data.status === 'revoked') {
                onRevoked();
            }
        }
    });

    return unsubscribe;
};
