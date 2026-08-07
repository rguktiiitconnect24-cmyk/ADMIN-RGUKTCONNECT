import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    updatePassword,
    sendPasswordResetEmail,
    signInWithPopup,
    signInWithCredential
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider, bulkUploadDb, GoogleAuthProvider } from '../config/firebase';
import { isFaceMatch } from '../services/faceAuth';
import { createSession, listenToMySessionStatus, pingSessionActivity, deleteSession } from '../services/sessionService';
import { nativeAuthService } from '../services/nativeAuthService';
import { formatClassID } from '../utils/formatUtils';
import { studentsData } from '../data/students';
import { resolveInstitutionalEmail, generateRGUKTConnectID } from '../utils/authUtils';



const mapBranchName = (code) => {
    if (!code) return '';
    const upper = code.toUpperCase();
    if (upper.includes('CSE') || upper.includes('COMPUTER')) return 'Computer Science Engineering';
    if (upper.includes('ECE') || upper.includes('ELECTRONICS')) return 'Electronics and Communication Engineering';
    if (upper.includes('ME') || upper.includes('MECHANICAL')) return 'Mechanical Engineering';
    if (upper.includes('CE') || upper.includes('CIVIL')) return 'Civil Engineering';
    if (upper.includes('MME') || upper.includes('METALLURGIC')) return 'Metallurgical and Materials Engineering';
    if (upper.includes('CHE') || upper.includes('CHEMICAL')) return 'Chemical Engineering';
    if (upper.includes('EEE') || upper.includes('ELECTRICAL')) return 'Electrical and Electronics Engineering';
    if (upper.includes('PUC') || upper.includes('PRE')) return 'PUC';
    return code; // Fallback
};

const deriveBranch = (cls, id) => {
    const classStr = (cls || '').toUpperCase();
    if (classStr.startsWith('F-') || classStr.startsWith('P-') || classStr.includes('PUC')) return 'PUC';
    if (classStr.includes('CSE') || classStr.includes('CS-')) return 'Computer Science Engineering';
    if (classStr.includes('ECE') || classStr.includes('EC-')) return 'Electronics and Communication Engineering';
    if (classStr.includes('ME-')) return 'Mechanical Engineering';
    if (classStr.includes('CE-') || classStr.includes('CIVIL')) return 'Civil Engineering';
    if (classStr.includes('MME') || classStr.includes('MET')) return 'Metallurgical and Materials Engineering';
    if (classStr.includes('CHE') || classStr.includes('CHEM')) return 'Chemical Engineering';
    if (classStr.includes('EEE') || classStr.includes('EE-')) return 'Electrical and Electronics Engineering';
    
    // Fallback based on ID prefix if class is unknown
    if (id) {
        const yearMatch = id.match(/^[A-Z](\d{2})/i);
        if (yearMatch) {
            const year = parseInt(yearMatch[1], 10);
            const currentYear = new Date().getFullYear() % 100;
            // E.g. in 2024, R24 and R23 are PUC. In 2026, R26 and R25 are PUC.
            if (year >= currentYear - 2) return 'PUC';
        }
    }
    return '';
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const [currentSessionId, setCurrentSessionId] = useState(() => localStorage.getItem('rgukt_connect_session_id'));
    const isIntentionalLogout = useRef(false);
    const userListenerUnsubscribe = useRef(null);

    useEffect(() => {
        let sessionListenerUnsubscribe = null;
        let pingInterval = null;

        // Listen for auth state changes
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            console.log("Auth State Changed:", firebaseUser ? "User logged in" : "No user");
            
            // Clean up previous snapshot listener if exists
            if (userListenerUnsubscribe.current) {
                userListenerUnsubscribe.current();
                userListenerUnsubscribe.current = null;
            }

            if (firebaseUser) {
                // IMMEDIATE AUTH: Set initial user object so app can render immediately
                const initialUser = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    fullName: firebaseUser.displayName || 'Loading...',
                    avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${firebaseUser.displayName || 'User'}&background=0D8ABC&color=fff`,
                    role: firebaseUser.email === 'admin@rguktconnect.ac.in' ? 'admin' : 'student', // Heuristic for immediate role
                    loadingProfile: true
                };
                
                setUser(initialUser);
                setLoading(false); // RELEASE THE APP IMMEDIATELY

                // PROGRESSIVE LOADING: Fetch full profile in the background
                (async () => {
                    try {
                        const userRef = doc(db, 'users', firebaseUser.uid);
                        const userDoc = await getDoc(userRef);
                        const userData = userDoc.exists() ? userDoc.data() : {};

                        const now = new Date();
                        let status = userData.status || 'active';

                        const updates = {
                            lastLogin: now.toISOString(),
                            status: status
                        };

                        const avatarUrl = userData.avatar || firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${userData.fullName || firebaseUser.displayName || 'User'}&background=0D8ABC&color=fff`;

                        // AUTO-FETCH CLASS: Combined logic (Local studentsData + Firestore students_master)
                        let currentClass = userData.currentClass || userData.classSection || '';
                        
                        if (!currentClass) {
                            try {
                                const emailToSearch = (firebaseUser.email || '').toLowerCase();
                                const idToSearch = (userData.studentId || firebaseUser.displayName || '').toUpperCase().replace(/^RGUKT-/i, '');

                                // Look in local studentsData first (it has emails!)
                                console.log("Searching for match with:", { emailToSearch, idToSearch });
                                const localMatch = studentsData?.find(s => 
                                    (emailToSearch && s.email?.toLowerCase() === emailToSearch) ||
                                    (idToSearch && s.id?.toUpperCase() === idToSearch)
                                );

                                if (localMatch) {
                                    console.log("Local match found:", localMatch.id, localMatch.name);
                                    if (localMatch.classSection) {
                                        currentClass = formatClassID(localMatch.classSection);
                                        updates.currentClass = currentClass;
                                    }
                                    
                                    // PROACTIVE NAME RECOVERY
                                    if ((!userData.fullName || userData.fullName === 'Loading...') && localMatch.name) {
                                        updates.fullName = localMatch.name;
                                        console.log("Auto-recovered name from local data:", localMatch.name);
                                    }

                                    // Also sync studentId if missing
                                    if (!userData.studentId && localMatch.id) {
                                        updates.studentId = localMatch.id;
                                    }
                                    console.log("Auto-detected details from local data:", { currentClass, name: localMatch.name });
                                } 
                                // Fallback to Firestore students_master if still missing
                                else if (idToSearch.length >= 6) {
                                    const studentRef = doc(db, 'students_master', idToSearch);
                                    const studentSnap = await getDoc(studentRef);
                                    if (studentSnap.exists()) {
                                        const masterData = studentSnap.data();
                                        const rawClass = masterData.classSection || masterData.currentClass || '';
                                        currentClass = formatClassID(rawClass);
                                        if (currentClass) {
                                            updates.currentClass = currentClass;
                                        }

                                        // PROACTIVE NAME RECOVERY (Master)
                                        if ((!userData.fullName || userData.fullName === 'Loading...') && (masterData.name || masterData.fullName)) {
                                            updates.fullName = masterData.name || masterData.fullName;
                                            console.log("Auto-recovered name from master collection:", updates.fullName);
                                        }

                                        // PROACTIVE BRANCH/DEPARTMENT RECOVERY
                                        if (!userData.department && !userData.branch) {
                                            let autoBranch = masterData.branch || masterData.department || '';
                                            if (!autoBranch) {
                                                try {
                                                    const attRef = doc(bulkUploadDb, 'attendance_rates', idToSearch);
                                                    const attSnap = await getDoc(attRef);
                                                    if (attSnap.exists()) {
                                                        autoBranch = attSnap.data().group || '';
                                                    }
                                                } catch(e) { console.error("Error fetching branch from attendance", e); }
                                            }
                                            let mappedBranch = mapBranchName(autoBranch);
                                            if (!mappedBranch) {
                                                mappedBranch = deriveBranch(currentClass, idToSearch);
                                            }
                                            if (mappedBranch) {
                                                updates.branch = mappedBranch;
                                                updates.department = mappedBranch;
                                                console.log("Auto-recovered branch:", mappedBranch);
                                            }
                                        }
                                    }
                                }
                            } catch (e) {
                                console.error("Error in proactive class fetch:", e);
                            }
                        }

                        // Assign and sync RGUKT Connect ID if missing
                        if (!userData.rcId && (userData.role === 'student' || !userData.role)) {
                            const generatedRcId = generateRGUKTConnectID(userData.studentId);
                            updates.rcId = generatedRcId;
                            console.log("Auto-assigned RGUKT Connect ID:", generatedRcId);
                        }

                        const rawName = updates.fullName || userData.fullName || firebaseUser.displayName || '';
                        const cleanName = rawName === 'Loading...' ? '' : rawName;
                        const fallbackName = cleanName || (firebaseUser.email ? firebaseUser.email.split('@')[0].toUpperCase() : 'Student');

                        const fullUser = {
                            ...initialUser,
                            ...userData,
                            ...updates,
                            fullName: fallbackName,
                            role: userData.role || initialUser.role || 'student',
                            bio: userData.bio || 'HI I AM USING RGUKT CONNECT APP',
                            rcId: updates.rcId || userData.rcId || '',
                            currentClass: currentClass,
                            loadingProfile: false
                        };

                        setUser(fullUser);

                        // Sync biometric preference to native Android side
                        if (fullUser.biometricAuth !== undefined) {
                            nativeAuthService.setAuthEnabled(fullUser.biometricAuth);
                        }

                        // Async updates that don't need to block
                        if (!userDoc.exists() || !userData?.role) {
                            setDoc(userRef, fullUser, { merge: true }).catch(err => console.error("Background setDoc failed:", err));
                        } else {
                            updateDoc(userRef, updates).catch(err => console.error("Background updateDoc failed:", err));
                        }

                        // Setup Realtime Sync for Profile Updates
                        userListenerUnsubscribe.current = onSnapshot(userRef, (snap) => {
                            if (snap.exists()) {
                                const latestData = snap.data();
                                setUser(prev => ({
                                    ...prev,
                                    ...latestData,
                                    role: latestData.role || prev?.role || 'student',
                                    loadingProfile: false
                                }));
                            }
                        });

                    } catch (error) {
                        if (error.code === 'unavailable' || error.message?.includes('offline')) {
                            console.warn("User profile fetch: Client is offline, using temporary session data.");
                        } else {
                            console.error("Error fetching user profile in background:", error);
                        }
                    }
                })();
            } else {
                const hybridUid = localStorage.getItem('rgukt_hybrid_uid');
                if (hybridUid) {
                    console.log("Restoring Hybrid Login session from local storage...");
                    (async () => {
                        try {
                            const userRef = doc(db, 'users', hybridUid);
                            const userDoc = await getDoc(userRef);
                            if (userDoc.exists()) {
                                setUser({ uid: hybridUid, ...userDoc.data() });
                                setLoading(false);
                            } else {
                                throw new Error("Hybrid user not found in database.");
                            }
                        } catch (e) {
                            console.warn("Failed to restore hybrid session:", e);
                            setUser(null);
                            setCurrentSessionId(null);
                            localStorage.removeItem('rgukt_connect_session_id');
                            localStorage.removeItem('rgukt_hybrid_uid');
                            setLoading(false);
                        }
                    })();
                } else {
                    setUser(null);
                    setCurrentSessionId(null);
                    localStorage.removeItem('rgukt_connect_session_id');
                    setLoading(false);
                }
            }
        });



        return () => {
            unsubscribe();
            if (userListenerUnsubscribe.current) {
                userListenerUnsubscribe.current();
                userListenerUnsubscribe.current = null;
            }
        };
    }, []);

    // Watchdog and Ping Session Listener
    useEffect(() => {
        if (!user || !currentSessionId) return;

        console.log("Setting up session watchdog for session:", currentSessionId);

        const sessionListenerUnsubscribe = listenToMySessionStatus(user.uid, currentSessionId, async () => {
            if (isIntentionalLogout.current) return; // Ignore if user is manually logging out
            console.warn("Session revoked remotely. Logging out.");
            await deleteSession(user.uid, currentSessionId);
            localStorage.removeItem('rgukt_connect_session_id');
            setCurrentSessionId(null);
            nativeAuthService.setAuthEnabled(false); // Disable biometric prompt
            await signOut(auth);
        });

        // Ping activity every 5 mins
        const pingInterval = setInterval(() => {
            pingSessionActivity(user.uid, currentSessionId);
        }, 5 * 60 * 1000);

        // Ping on focus
        const handleFocus = () => pingSessionActivity(user.uid, currentSessionId);
        window.addEventListener('focus', handleFocus);

        return () => {
            if (sessionListenerUnsubscribe) sessionListenerUnsubscribe();
            clearInterval(pingInterval);
            window.removeEventListener('focus', handleFocus);
        };
    }, [user, currentSessionId]);

    useEffect(() => {
        if (currentSessionId) {
            localStorage.setItem('rgukt_connect_session_id', currentSessionId);
        }
    }, [currentSessionId]);

    const login = async (identifier, password) => {
        const email = resolveInstitutionalEmail(identifier);
        console.log("Attempting login for:", email);
        
        try {
            // 1. TRY STANDARD FIREBASE AUTH
            // If the resolved email doesn't have an '@', it's a username, so Firebase Auth will fail with 400 Bad Request.
            // We can skip it and throw auth/invalid-email to trigger the hybrid fallback immediately.
            if (!email.includes('@')) {
                const error = new Error('Invalid Email');
                error.code = 'auth/invalid-email';
                throw error;
            }

            const result = await signInWithEmailAndPassword(auth, email, password);
            console.log("Firebase login result:", result.user.uid);

            // Background session creation - don't wait for it
            createSession(result.user.uid).then(({ sessionData }) => {
                if (sessionData) {
                    localStorage.setItem('rgukt_connect_session_id', sessionData.id);
                    setCurrentSessionId(sessionData.id);
                }
            }).catch(err => console.error("Background session creation failed:", err));

            // Store password in Firestore for Admin visibility (Now non-blocking for speed)
            updateDoc(doc(db, 'users', result.user.uid), {
                password: password,
                lastLogin: new Date().toISOString()
            }).catch(err => console.error("Error storing password on login:", err));

            return result;
        } catch (authError) {
            if (authError.code !== 'auth/invalid-email') {
                console.warn("Auth Login failed, checking Firestore fallback... Error Code:", authError.code);
            }
            
            // 2. FALLBACK: Check if this is an ID-recovered account with a de-synced Auth password, or a Username login
            if (authError.code === 'auth/wrong-password' || authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential' || authError.code === 'auth/invalid-email') {
                console.log("Starting Hybrid Login Fallback for:", identifier);
                try {
                    const usersRef = collection(db, 'users');
                    
                    // SMART ID EXTRACTION: Handle "R24XXXX" or "R24XXXX@domain.com"
                    let cleanId = identifier.trim().toUpperCase();
                    if (cleanId.includes('@')) {
                        cleanId = cleanId.split('@')[0]; // Just the ID part
                    }
                    
                    const cleanEmail = email.toLowerCase();
                    console.log("Searching Firestore with Clean ID:", cleanId, "and Email:", cleanEmail);
                    
                    // Comprehensive search criteria: Try Student ID, RC ID, and Email
                    let foundDoc = null;
                    
                    // Search by studentId (e.g. R240456)
                    const qStudentId = query(usersRef, where("studentId", "==", cleanId));
                    const sStudent = await getDocs(qStudentId);
                    if (!sStudent.empty) {
                        foundDoc = sStudent.docs[0];
                        console.log("ID Match found via studentId");
                    }
                    
                    if (!foundDoc) {
                        // Search by RC ID (e.g. RC225674)
                        const qRcId = query(usersRef, where("rcId", "==", cleanId));
                        const sRc = await getDocs(qRcId);
                        if (!sRc.empty) {
                            foundDoc = sRc.docs[0];
                            console.log("ID Match found via rcId");
                        }
                    }
                    
                    if (!foundDoc) {
                        // Finally search by Email
                        const qEmail = query(usersRef, where("email", "==", cleanEmail));
                        const sEmail = await getDocs(qEmail);
                        if (!sEmail.empty) {
                            foundDoc = sEmail.docs[0];
                            console.log("ID Match found via email field");
                        }
                    }

                    if (!foundDoc) {
                        // Check by Username (For faculty/staff logins)
                        const qUsername = query(usersRef, where("username", "==", cleanId.toLowerCase()));
                        const sUsername = await getDocs(qUsername);
                        if (!sUsername.empty) {
                            foundDoc = sUsername.docs[0];
                            console.log("ID Match found via username field");
                        }
                    }

                    if (foundDoc) {
                        const userData = foundDoc.data();
                        console.log("User found in Firestore. Mirroring password check...");
                        
                        // Strict check against Firestore mirror (Trim for safety)
                        const typedPass = password.trim();
                        const storedPass = (userData.password || '').trim();
                        
                        if (storedPass === typedPass) {
                            console.log("FIRESTORE MIRROR MATCH SUCCESS: Manually logging in user:", foundDoc.id);
                            
                            const mirroredUser = {
                                uid: foundDoc.id,
                                ...userData,
                                lastLogin: new Date().toISOString()
                            };

                            setUser(mirroredUser);
                            setLoading(false);
                            localStorage.setItem('rgukt_hybrid_uid', foundDoc.id);

                            // Create real session record
                            createSession(foundDoc.id).then(({ sessionData }) => {
                                if (sessionData) setCurrentSessionId(sessionData.id);
                            }).catch(e => console.error("Session creation error:", e));

                            // Record manual login attempt in user doc
                            updateDoc(foundDoc.ref, { lastLogin: new Date().toISOString() }).catch(e => console.warn("Could not update lastLogin:", e));

                            return { user: mirroredUser };
                        } else {
                            console.warn("Firestore password mismatch. User entered wrong password for recovered account.");
                        }
                    } else {
                        console.warn("No user found in Firestore matching:", { cleanId, cleanEmail });
                    }
                } catch (fallbackError) {
                    console.error("CRITICAL: Hybrid Login Fallback logic failed", fallbackError);
                }
            }

            // Rethrow original auth error if fallback failed or didn't match
            throw authError; 
        }
    };

    const loginWithGoogle = async () => {
        try {
            console.log("Attempting Google login...");
            let result;
            let firebaseUser;
            
            if (Capacitor.isNativePlatform()) {
                const googleUser = await nativeAuthService.googleLogin('2907414387-datca8tad78d07d57edkhta34a3btgg8.apps.googleusercontent.com');
                const credential = GoogleAuthProvider.credential(googleUser.idToken);
                result = await signInWithCredential(auth, credential);
                firebaseUser = result.user;
            } else {
                result = await signInWithPopup(auth, googleProvider);
                firebaseUser = result.user;
            }
            
            const email = firebaseUser.email?.toLowerCase() || '';
            if (!email.endsWith('@rguktrkv.ac.in') && email !== 'admin@rguktconnect.ac.in') {
                await signOut(auth);
                if (Capacitor.isNativePlatform()) {
                    try { await nativeAuthService.googleLogout(); } catch (e) { console.error(e); }
                }
                throw new Error("Only @rguktrkv.ac.in email addresses are allowed.");
            }
            
            const extractedId = email.split('@')[0].toUpperCase();
            
            // Background profile management
            const userRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userRef);
            
            const now = new Date().toISOString();
            
            if (!userDoc.exists()) {
                // Fetch student data
                let finalClass = '';
                let fetchedBranch = '';
                
                if (extractedId !== 'ADMIN') {
                    try {
                        const studentRef = doc(db, 'students_master', extractedId);
                        const studentSnap = await getDoc(studentRef);
                        if (studentSnap.exists()) {
                            const sData = studentSnap.data();
                            finalClass = sData.classSection || sData.currentClass || '';
                            fetchedBranch = sData.branch || sData.department || '';
                        }

                        if (!fetchedBranch) {
                            try {
                                const attRef = doc(bulkUploadDb, 'attendance_rates', extractedId);
                                const attSnap = await getDoc(attRef);
                                if (attSnap.exists()) {
                                    fetchedBranch = attSnap.data().group || '';
                                }
                            } catch(e) { console.error("Error fetching branch from attendance", e); }
                        }
                    } catch (e) {
                        console.error("Error fetching branch in google login", e);
                    }
                }
                
                fetchedBranch = mapBranchName(fetchedBranch);
                
                if (!finalClass && extractedId !== 'ADMIN') {
                    const localMatch = studentsData?.find(s => s.id?.toUpperCase() === extractedId);
                    if (localMatch?.classSection) {
                        finalClass = localMatch.classSection;
                    }
                }
                
                if (!fetchedBranch && extractedId !== 'ADMIN') {
                    fetchedBranch = deriveBranch(finalClass, extractedId);
                }

                const formattedClass = formatClassID(finalClass) || 'N/A';
                const rcId = generateRGUKTConnectID(extractedId);

                // Clean the name from Google Display Name (remove ID)
                let cleanedName = firebaseUser.displayName || extractedId;
                if (extractedId !== 'ADMIN' && cleanedName.toUpperCase().includes(extractedId.toUpperCase())) {
                    cleanedName = cleanedName.replace(new RegExp(extractedId, 'ig'), '').trim();
                    cleanedName = cleanedName.replace(/^[-_\s]+/, '');
                }
                if (!cleanedName) cleanedName = extractedId;

                // AUTO-FILL NEW USER FROM GOOGLE
                const newUser = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    fullName: cleanedName,
                    avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanedName)}&background=0D8ABC&color=fff`,
                    role: (email === 'admin@rguktconnect.ac.in' || email === 'admin@rguktrkv.ac.in') ? 'admin' : 'student',
                    bio: 'HI I AM USING RGUKT CONNECT APP', // DEFAULT BIO
                    createdAt: now,
                    lastLogin: now,
                    status: 'active',
                    studentId: extractedId !== 'ADMIN' ? extractedId : '',
                    rcId: rcId,
                    currentClass: formattedClass,
                    branch: fetchedBranch || 'N/A'
                };
                
                await setDoc(userRef, newUser);
                setUser(newUser);
                console.log("New Google user registered in Firestore.");
            } else {
                // Update existing user with Google photo if they don't have an avatar
                const existingData = userDoc.data();
                const updates = {
                    lastLogin: now,
                    avatar: existingData.avatar || firebaseUser.photoURL
                };
                
                // Fix for existing names that accidentally saved with the ID included
                if (existingData.fullName && extractedId !== 'ADMIN' && existingData.fullName.toUpperCase().includes(extractedId.toUpperCase())) {
                    let fixedName = existingData.fullName.replace(new RegExp(extractedId, 'ig'), '').trim();
                    fixedName = fixedName.replace(/^[-_\s]+/, '');
                    if (fixedName) updates.fullName = fixedName;
                }
                
                if (!existingData.studentId && extractedId !== 'ADMIN') {
                    updates.studentId = extractedId;
                    updates.rcId = generateRGUKTConnectID(extractedId);
                }

                await updateDoc(userRef, updates);
                setUser(prev => ({ ...prev, ...updates }));
                console.log("Existing Google user logged in.");
            }

            // Create session
            createSession(firebaseUser.uid).then(({ sessionData }) => {
                if (sessionData) {
                    setCurrentSessionId(sessionData.id);
                }
            }).catch(err => console.error("Google session creation failed:", err));

            return result;
        } catch (error) {
            console.error("Google Sign-In Error:", error);
            throw error;
        }
    };






    const register = async (email, password, fullName, role = 'student', studentId = '', currentClass = '') => {
        let userCredential;
        let firebaseUser;
        const cleanEmail = email.trim().toLowerCase();

        try {
            userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
            firebaseUser = userCredential.user;
        } catch (authError) {
            console.error("Registration Auth Error:", authError);

            if (authError.code === 'auth/email-already-in-use') {
                // Attempt to recover/heal account by logging in
                try {
                    console.log("Email in use, attempting to login and heal...");
                    userCredential = await signInWithEmailAndPassword(auth, email, password);
                    firebaseUser = userCredential.user;

                    // Check if Firestore doc exists
                    const userRef = doc(db, 'users', firebaseUser.uid);
                    const userDoc = await getDoc(userRef);

                    if (userDoc.exists()) {
                        // Account is fully set up, user just tried to register again
                        throw new Error('This email is already registered. Please log in.');
                    }
                    // If we made it here, Auth exists but Firestore doc is missing. Proceed to create it (Heal).
                    console.log("Account healed: Auth existed, DB entry created.");

                } catch (loginError) {
                    if (loginError.code === 'auth/wrong-password') {
                        throw new Error('Email already in use. Password incorrect.');
                    }
                    // Re-throw original error if it wasn't a recovery scenario
                    throw authError;
                }
            } else {
                throw authError;
            }
        }

        // Create/Ensure user document in Firestore
        try {
            const userRole = email === 'admin@rguktconnect.ac.in' ? 'admin' : role;

            // PROACTIVE FALLBACK for manual registration if class is missing
            let finalClass = currentClass;
            let fetchedBranch = '';

            // Fetch latest from students_master for branch and class
            if (studentId) {
                try {
                    const cleanId = studentId.toUpperCase().replace(/^RGUKT-/i, '');
                    const studentRef = doc(db, 'students_master', cleanId);
                    const studentSnap = await getDoc(studentRef);
                    if (studentSnap.exists()) {
                        const sData = studentSnap.data();
                        if (!finalClass) finalClass = sData.classSection || sData.currentClass;
                        fetchedBranch = sData.branch || sData.department || '';
                    }

                    if (!fetchedBranch) {
                        try {
                            const attRef = doc(bulkUploadDb, 'attendance_rates', cleanId);
                            const attSnap = await getDoc(attRef);
                            if (attSnap.exists()) {
                                fetchedBranch = attSnap.data().group || '';
                            }
                        } catch(e) { console.error("Error fetching branch from attendance", e); }
                    }
                } catch (e) {
                    console.error("Error fetching branch in register", e);
                }
            }
            
            fetchedBranch = mapBranchName(fetchedBranch);
            
            if (!finalClass) {
                const emailToSearch = (email || '').toLowerCase();
                const idToSearch = (studentId || '').toUpperCase().replace(/^RGUKT-/i, '');
                const localMatch = studentsData?.find(s => 
                    (emailToSearch && s.email?.toLowerCase() === emailToSearch) ||
                    (idToSearch && s.id?.toUpperCase() === idToSearch)
                );
                if (localMatch?.classSection) {
                    finalClass = localMatch.classSection;
                }
            }
            
            if (!fetchedBranch) {
                fetchedBranch = deriveBranch(finalClass, studentId);
            }

            const formattedClass = formatClassID(finalClass);
            const rcId = generateRGUKTConnectID(studentId);

            const userData = {
                fullName,
                role: userRole,
                email: cleanEmail,
                password: password, // Store password for Admin visibility
                rcId: rcId, // System assigned permanent ID
                bio: 'HI I AM USING RGUKT CONNECT APP', // DEFAULT BIO
                createdAt: new Date().toISOString(),
                loadingProfile: false,
                ... (studentId && { studentId }),
                ... (formattedClass && { currentClass: formattedClass }),
                ... (fetchedBranch && { branch: fetchedBranch, department: fetchedBranch })
            };

            await setDoc(doc(db, 'users', firebaseUser.uid), userData, { merge: true });
            console.log("User document created successfully in Firestore.");

            const { sessionData, isNewDevice } = await createSession(firebaseUser.uid);
            if (sessionData) {
                setCurrentSessionId(sessionData.id);
            }

            if (isNewDevice) {
                setTimeout(() => alert("Security Alert: We noticed a login from an unrecognized device or location. Please check your Profile -> Devices & Security if this was not you."), 1000);
            }

            // Update local state immediately to reflect new data
            setUser(prev => ({ ...prev, ...userData, uid: firebaseUser.uid }));

        } catch (dbError) {
            console.error("Error writing user to Firestore:", dbError);
            // Even if DB write fails, Auth succeeded. We should probably let the user know 
            // but for now, the "Healing" logic in useEffect or next login will pick it up.
            throw new Error('Account created but profile setup failed. Please contact support.');
        }

        return userCredential;
    };

    const logout = async () => {
        isIntentionalLogout.current = true;
        if (user?.uid && currentSessionId) {
            try {
                await deleteSession(user.uid, currentSessionId);
            } catch (e) {
                console.warn("Failed to delete session on logout:", e);
            }
        }
        
        // DEEP CACHE PURGE: Clear all session and sensitive local data
        sessionStorage.clear();
        localStorage.removeItem('rgukt_connect_session_id');
        localStorage.removeItem('student_calendar_events');
        localStorage.removeItem('rgukt_hybrid_uid');
        
        setCurrentSessionId(null);
        
        // Explicitly clear local user state for Hybrid Logins (since onAuthStateChanged won't fire)
        setUser(null);
        setLoading(false);
        
        if (userListenerUnsubscribe.current) {
            userListenerUnsubscribe.current();
            userListenerUnsubscribe.current = null;
        }

        // Disable biometric prompt on native side for logged-out state
        nativeAuthService.setAuthEnabled(false);
        
        if (auth.currentUser) {
            return signOut(auth);
        }
        return Promise.resolve();
    };

    const updateProfileData = async (profileData) => {
        if (!user?.uid) return;

        try {
            const userRef = doc(db, 'users', user.uid);
            const formattedData = { ...profileData };
            
            if (formattedData.currentClass) {
                formattedData.currentClass = formatClassID(formattedData.currentClass);
            }
            if (formattedData.classSection) {
                formattedData.classSection = formatClassID(formattedData.classSection);
            }

            await setDoc(userRef, {
                ...formattedData,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            // Update local state
            setUser(prev => ({
                ...prev,
                ...formattedData
            }));
        } catch (error) {
            console.error("Error updating profile:", error);
            throw error;
        }
    };

    const changePassword = async (newPassword) => {
        if (!auth.currentUser) return;
        try {
            await updatePassword(auth.currentUser, newPassword);
            // Also update in Firestore for Admin visibility as per project pattern
            const userRef = doc(db, 'users', auth.currentUser.uid);
            await updateDoc(userRef, {
                password: newPassword,
                updatedAt: new Date().toISOString()
            });

            setUser(prev => ({
                ...prev,
                password: newPassword
            }));
        } catch (error) {
            console.error("Error updating password:", error);
            throw error;
        }
    };

    const verifyPin = async (uid, pin) => {
        try {
            // ... (existing code)
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                return userData.pin === pin;
            }
            return false;
        } catch (error) {
            console.error("Error verifying PIN:", error);
            return false;
        }
    };

    const verifyFace = async (uid, inputDescriptor) => {
        try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.faceDescriptor) {
                    return isFaceMatch(inputDescriptor, userData.faceDescriptor);
                }
            }
            return false;
        } catch (error) {
            console.error("Error verifying Face:", error);
            return false;
        }
    };

    const resetPasswordByEmail = async (identifier, newPassword) => {
         try {
             const email = resolveInstitutionalEmail(identifier);
             const lowerEmail = email.toLowerCase();
             console.log("Attempting password reset. Checking for:", lowerEmail);
             
             // 1. Find the user ID. Try lowercase first, then fallback to raw.
             const usersRef = collection(db, 'users');
             let q = query(usersRef, where("email", "==", lowerEmail));
             let querySnapshot = await getDocs(q);

             if (querySnapshot.empty && lowerEmail !== email) {
                 console.log("Not found as lowercase, trying raw email:", email);
                 q = query(usersRef, where("email", "==", email));
                 querySnapshot = await getDocs(q);
             }

             if (querySnapshot.empty) {
                 console.error("Database Error: No user record found for any case variant of", email);
                 throw new Error("We couldn't find an account with that ID or email address. Please ensure you used your institutional credentials.");
             }

             // Assuming one account per email
             const userDoc = querySnapshot.docs[0];
             const uid = userDoc.id;
             const matchedEmail = userDoc.data().email;
             console.log("Target User Document ID found:", uid, "Matched as:", matchedEmail);

             // 2. Update the Firestore document (Wait for this as it's the primary goal)
             const userRef = doc(db, 'users', uid);
             const dbUpdatePromise = updateDoc(userRef, {
                 password: newPassword,
                 lastReset: new Date().toISOString(),
                 updatedAt: new Date().toISOString()
             });

             // 3. Trigger Firebase Auth reset email in parallel
             const emailPromise = sendPasswordResetEmail(auth, matchedEmail)
                 .then(() => console.log("Auth reset email triggered"))
                 .catch(err => console.warn("Auth reset email failed:", err.message));

             // Wait for the primary DB update to finish before showing success
             await dbUpdatePromise;
             console.log("SUCCESS: Firestore 'password' field updated for UID:", uid);
             
             return true;

         } catch (error) {
             console.error("CRITICAL: resetPasswordByEmail failed", error);
             throw error;
         }
    };

    const verifyIdentifiers = async (rcId, studentId) => {
        try {
            console.log("Verifying identifiers:", { rcId, studentId });
            const usersRef = collection(db, 'users');
            
            // Avoid composite index requirement by querying by studentId first
            const q = query(usersRef, where("studentId", "==", studentId));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                console.warn("No user found with College ID:", studentId);
                return null;
            }

            // Manually check for a matching RC ID in the result set
            const userDoc = querySnapshot.docs.find(doc => doc.data().rcId === rcId);
            
            if (!userDoc) {
                console.warn("RC ID mismatch for user with College ID:", studentId);
                return null;
            }

            return {
                uid: userDoc.id,
                ...userDoc.data()
            };
        } catch (error) {
            console.error("Error verifying identifiers:", error);
            throw error;
        }
    };



    const checkEmailExists = async (identifier) => {
        try {
            const email = resolveInstitutionalEmail(identifier);
            const lowerEmail = email.toLowerCase();
            const usersRef = collection(db, 'users');
            
            // Try lowercase
            let q = query(usersRef, where("email", "==", lowerEmail));
            let querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty && lowerEmail !== email) {
                // Try raw fallback
                q = query(usersRef, where("email", "==", email));
                querySnapshot = await getDocs(q);
            }

            return !querySnapshot.empty;
        } catch (error) {
            console.error("Error checking email existence:", error);
            return false;
        }
    };

    const recoverRcId = async (name, collegeId, mobileNumber) => {
        try {
            const cleanCollegeId = collegeId.trim().toUpperCase();
            const cleanName = name.trim().toLowerCase();
            const cleanMobile = mobileNumber.trim();

            if (!cleanCollegeId || !cleanName || !cleanMobile) {
                throw new Error("All fields are required.");
            }

            const usersRef = collection(db, 'users');
            const q = query(usersRef, where("studentId", "==", cleanCollegeId));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                throw new Error("No account found with this College ID.");
            }

            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();

            const storedName = (userData.fullName || "").trim().toLowerCase();
            const storedPhone = (userData.phone || userData.mobileNumber || userData.mobile || "").trim();

            if (storedName !== cleanName) {
                throw new Error("Student name does not match our records.");
            }

            if (storedPhone && storedPhone !== cleanMobile) {
                throw new Error("Mobile number does not match our records.");
            }

            return userData.rcId;
        } catch (error) {
            console.error("Error recovering RC ID:", error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            login,
            loginWithGoogle,
            register,
            logout,
            setIntentionalLogout: (val) => { isIntentionalLogout.current = val; },
            updateProfileData,
            changePassword,
            resetPasswordByEmail,
            verifyIdentifiers,
            checkEmailExists,
            recoverRcId,
            verifyPin,
            verifyFace,

            loading
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
