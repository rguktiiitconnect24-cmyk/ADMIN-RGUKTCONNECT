import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

const pucConfig = {
  apiKey: "AIzaSyBuWoWErAlHec_74kEP-USx7igtrCEFq1M",
  authDomain: "puc-list.firebaseapp.com",
  projectId: "puc-list",
  storageBucket: "puc-list.firebasestorage.app",
  messagingSenderId: "706971443859",
  appId: "1:706971443859:web:94da8050d18f25eda0e366",
  measurementId: "G-K77RPG7LM3"
};

const app = initializeApp(pucConfig);
const db = getFirestore(app);

async function updateEmails() {
    console.log("Fetching PUC students...");
    const snapshot = await getDocs(collection(db, 'puc_students'));
    console.log(`Found ${snapshot.size} students. updating...`);

    let updated = 0;
    for (const studentDoc of snapshot.docs) {
        const data = studentDoc.data();
        if (data.id) {
            const generatedEmail = `${data.id.charAt(0).toLowerCase()}${data.id.slice(1)}@rguktrkv.ac.in`;
            if (data.email !== generatedEmail) {
                await updateDoc(doc(db, 'puc_students', studentDoc.id), {
                    email: generatedEmail
                });
                updated++;
                if (updated % 50 === 0) console.log(`Updated ${updated} students...`);
            }
        }
    }
    console.log(`Finished updating ${updated} students.`);
    process.exit(0);
}

updateEmails().catch(err => {
    console.error("Error updating:", err);
    process.exit(1);
});
