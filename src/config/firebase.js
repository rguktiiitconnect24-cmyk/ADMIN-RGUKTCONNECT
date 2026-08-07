import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

export const firebaseConfig = {
    apiKey: "AIzaSyBx2D31HmZ2mQ2ZztvHoLArXoNSQ1e7wCo",
    authDomain: "iiit-connect-d4b88.firebaseapp.com",
    databaseURL: "https://iiit-connect-d4b88-default-rtdb.firebaseio.com",
    projectId: "iiit-connect-d4b88",
    storageBucket: "iiit-connect-d4b88.firebasestorage.app",
    messagingSenderId: "2907414387",
    appId: "1:2907414387:web:0dbaac12825292c7f52f06",
    measurementId: "G-9C23HFGZJ2"
};

// Main App (Connect)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const analytics = getAnalytics(app);
const auth = getAuth(app);

// Complaints App (Dedicated Project)
const complaintsConfig = {
    apiKey: "AIzaSyCkDyBxUmSVOEIw0ftrvqj7h-TyKLp6KnE",
    authDomain: "rc-complaints.firebaseapp.com",
    projectId: "rc-complaints",
    storageBucket: "rc-complaints.firebasestorage.app",
    messagingSenderId: "547660681960",
    appId: "1:547660681960:web:5a8116932d3a0821d8ef5d",
    measurementId: "G-84YK780H5J"
};

const complaintsApp = getApps().find(a => a.name === "complaints") || initializeApp(complaintsConfig, "complaints");
const complaintsDb = getFirestore(complaintsApp);

// Content App (Dedicated Project for PDFs, Semesters, Units)
const contentConfig = {
    apiKey: "AIzaSyDo6b9-klI1cu_3PRnEvh8vp-_ch4ApQMQ",
    authDomain: "rc-content-35e33.firebaseapp.com",
    projectId: "rc-content-35e33",
    storageBucket: "rc-content-35e33.firebasestorage.app",
    messagingSenderId: "871234526994",
    appId: "1:871234526994:web:dbfcb2784c149007fc9dcb",
    measurementId: "G-082D1FVXXK"
};

const contentApp = getApps().find(a => a.name === "content") || initializeApp(contentConfig, "content");
const contentDb = getFirestore(contentApp);
const contentStorage = getStorage(contentApp);

// Bulk Upload App (Dedicated Project for Attendance and Exam Seating)
const bulkUploadConfig = {
    apiKey: "AIzaSyBI3Ic0c2hSAj6m29TEOcUrsROcCqIKnTk",
    authDomain: "blue-sea-restaurant-854b5.firebaseapp.com",
    projectId: "blue-sea-restaurant-854b5",
    storageBucket: "blue-sea-restaurant-854b5.firebasestorage.app",
    messagingSenderId: "454691522253",
    appId: "1:454691522253:web:d4bd7905f10a5d2dddcb84",
    measurementId: "G-E3LCLR9GKX"
};

const bulkUploadApp = getApps().find(a => a.name === "bulkUpload") || initializeApp(bulkUploadConfig, "bulkUpload");
const bulkUploadDb = getFirestore(bulkUploadApp);

// Books App (Dedicated Project for Book Orders)
const booksConfig = {
  apiKey: "AIzaSyBPZaBAB2mFKr9B12dgVhtqVtKR2lZpe-o",
  authDomain: "vnote-a5475.firebaseapp.com",
  projectId: "vnote-a5475",
  storageBucket: "vnote-a5475.firebasestorage.app",
  messagingSenderId: "888917239063",
  appId: "1:888917239063:web:144d05216ee15f7d32c352",
  measurementId: "G-QP7X8JKG4R"
};

const booksApp = getApps().find(a => a.name === "books") || initializeApp(booksConfig, "books");
const booksDb = getFirestore(booksApp);

// Initialize Firestore safely for HMR
let db;
try {
    db = initializeFirestore(app, {
        localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
        })
    });
} catch (error) {
    db = getFirestore(app);
}

const storage = getStorage(app);
const rtdb = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

export { 
    app, analytics, auth, db, storage, rtdb, googleProvider, GoogleAuthProvider,
    complaintsDb,
    contentDb, contentStorage,
    bulkUploadDb,
    booksDb
};
