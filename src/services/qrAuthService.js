import { db } from '../config/firebase';
import { doc, setDoc, getDoc, onSnapshot, deleteDoc, updateDoc } from 'firebase/firestore';
import CryptoJS from 'crypto-js';

const COLLECTION_NAME = 'qr_sessions';

/**
 * Generate a random string of given length
 */
const generateRandomString = (length = 32) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

/**
 * Initiates a new QR Login Session from the Desktop/Laptop.
 * @param {string} userId - The UID of the currently logged-in user.
 * @returns {object} { sessionId, encryptionKey, qrString }
 */
export const initiateQRSession = async (userId) => {
    const sessionId = generateRandomString(24);
    const encryptionKey = generateRandomString(32); // Key stays strictly on device and in QR
    const qrString = `rgukt-qr-login|${sessionId}|${encryptionKey}`;

    // Expires in 2 minutes
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();

    await setDoc(doc(db, COLLECTION_NAME, sessionId), {
        status: 'pending', // pending -> scanned -> authenticated
        expiresAt,
        userId,
        createdAt: new Date().toISOString()
    });

    return { sessionId, encryptionKey, qrString };
};

/**
 * Subscribe to the QR Session to wait for mobile scan.
 * @param {string} sessionId
 * @param {function} onScanned - Callback when mobile scans the QR
 * @param {function} onExpired - Callback when session expires
 */
export const listenToQRSession = (sessionId, onScanned, onExpired) => {
    const unsubscribe = onSnapshot(doc(db, COLLECTION_NAME, sessionId), (docSnap) => {
        if (!docSnap.exists()) {
            // Document was deleted (either consumed or manually removed)
            return;
        }

        const data = docSnap.data();
        const now = new Date();
        const expiry = new Date(data.expiresAt);

        if (now > expiry) {
            onExpired();
            unsubscribe();
            // Clean up
            deleteDoc(doc(db, COLLECTION_NAME, sessionId)).catch(console.error);
            return;
        }

        if (data.status === 'scanned') {
            onScanned();
        }
    });

    return unsubscribe;
};

/**
 * Confirm the scan from Desktop and provide the encrypted credentials.
 * @param {string} sessionId
 * @param {string} encryptionKey
 * @param {object} credentials - { email, password }
 */
export const provideEncryptedCredentials = async (sessionId, encryptionKey, credentials) => {
    const stringifiedCreds = JSON.stringify(credentials);
    const encryptedPayload = CryptoJS.AES.encrypt(stringifiedCreds, encryptionKey).toString();

    await updateDoc(doc(db, COLLECTION_NAME, sessionId), {
        status: 'authenticated',
        encryptedPayload
    });
};

/**
 * Called by Mobile Device after scanning the QR code to signal readiness.
 * @param {string} sessionId
 */
export const markSessionAsScanned = async (sessionId) => {
    const docRef = doc(db, COLLECTION_NAME, sessionId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        throw new Error("Invalid or expired QR code.");
    }

    const data = docSnap.data();
    if (new Date() > new Date(data.expiresAt)) {
        throw new Error("QR code has expired.");
    }

    if (data.status !== 'pending') {
        throw new Error("QR code has already been used.");
    }

    // Set user agent or basic device info (optional)
    const deviceInfo = navigator.userAgent;

    await updateDoc(docRef, {
        status: 'scanned',
        deviceInfo
    });
};

/**
 * Mobile Device awaits the payload after marking as scanned.
 * @param {string} sessionId
 * @param {string} encryptionKey
 * @param {function} onSuccess - Callback with decrypted credentials { email, password }
 * @param {function} onError
 */
export const awaitAuthenticationPayload = (sessionId, encryptionKey, onSuccess, onError) => {
    const unsubscribe = onSnapshot(doc(db, COLLECTION_NAME, sessionId), (docSnap) => {
        if (!docSnap.exists()) return;

        const data = docSnap.data();
        if (data.status === 'authenticated' && data.encryptedPayload) {
            try {
                // Decrypt
                const bytes = CryptoJS.AES.decrypt(data.encryptedPayload, encryptionKey);
                const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
                const credentials = JSON.parse(decryptedStr);

                // Immediately delete the session to prevent replay
                deleteDoc(doc(db, COLLECTION_NAME, sessionId)).catch(console.error);

                unsubscribe();
                onSuccess(credentials);
            } catch (err) {
                unsubscribe();
                onError(new Error("Failed to decrypt credentials. Invalid QR code."));
            }
        }
    });

    return unsubscribe;
};
