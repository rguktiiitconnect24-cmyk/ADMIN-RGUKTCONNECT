import { useState } from 'react';
import { db } from '../../config/firebase';
import { doc, updateDoc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import * as xlsx from 'xlsx';

const BulkUpdater = () => {
    const [progress, setProgress] = useState({ total: 0, current: 0, errors: 0 });
    const [isUpdating, setIsUpdating] = useState(false);
    const [studentsData, setStudentsData] = useState([]);
    const [fileName, setFileName] = useState('');
    const [timeLeft, setTimeLeft] = useState(null); // 'calculating' or seconds

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setFileName(file.name);
        
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const workbook = xlsx.read(bstr, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const data = xlsx.utils.sheet_to_json(sheet);
                
                const cleanData = data.map(rawRow => {
                    let idVal = '';
                    let nameVal = '';
                    let genderVal = '';
                    let branchVal = '';
                    let sectionVal = '';
                    
                    for (const rawKey in rawRow) {
                        const key = rawKey.trim().toLowerCase();
                        const val = String(rawRow[rawKey]).trim();
                        
                        if (key.includes('id') || key.includes('roll')) idVal = val;
                        else if (key.includes('name')) nameVal = val;
                        else if (key.includes('gender') || key.includes('sex')) genderVal = val;
                        else if (key.includes('branch') || key.includes('dept') || key.includes('department')) branchVal = val;
                        else if (key.includes('section') || key.includes('class')) sectionVal = val;
                    }
                    
                    const branchRaw = branchVal;
                    
                    return {
                        id: idVal,
                        name: nameVal,
                        gender: genderVal,
                        branch: branchRaw.toUpperCase() === 'AIML' || branchRaw.toLowerCase() === 'ai&ml' ? 'CSC (AI&ML)' : branchRaw,
                        section: sectionVal
                    };
                }).filter(s => s.id); // Filter out rows without IDs immediately
                
                setStudentsData(cleanData);
            } catch (error) {
                console.error("Error parsing excel:", error);
                alert("Failed to parse Excel file. Make sure it's a valid .xlsx file.");
            }
        };
        reader.readAsBinaryString(file);
    };

    const runUpdate = async () => {
        if (studentsData.length === 0) {
            alert("No valid student data found! Ensure your Excel has an 'ID' column.");
            return;
        }

        setIsUpdating(true);
        let current = 0;
        let errors = 0;
        setProgress({ total: studentsData.length, current, errors });
        setTimeLeft('calculating');
        const startTime = Date.now();

        for (const student of studentsData) {
            try {
                const docId = student.id;
                const studentRef = doc(db, 'students_master', docId);
                const snapshot = await getDoc(studentRef);

                const dataToSave = {
                    name: student.name || '',
                    gender: student.gender || '',
                    branch: student.branch || '',
                    classSection: student.section || '',
                    id: student.id,
                    updatedAt: new Date().toISOString()
                };

                if (snapshot.exists()) {
                    await updateDoc(studentRef, dataToSave);
                } else {
                    await setDoc(studentRef, dataToSave);
                }

                const q = query(collection(db, 'users'), where('studentId', '==', docId));
                const userSnapshot = await getDocs(q);
                if (!userSnapshot.empty) {
                    const userDoc = userSnapshot.docs[0];
                    await updateDoc(doc(db, 'users', userDoc.id), {
                        fullName: student.name || '',
                        department: student.branch || '',
                        currentClass: student.section || '',
                        gender: student.gender || ''
                    });
                }

                current++;
                setProgress({ total: studentsData.length, current, errors });
                
                // Calculate time left
                if (current > 0) {
                    const elapsed = Date.now() - startTime;
                    const avgTimePerItem = elapsed / current;
                    const remainingItems = studentsData.length - current;
                    const estimatedRemainingTimeMs = avgTimePerItem * remainingItems;
                    setTimeLeft(Math.max(0, Math.round(estimatedRemainingTimeMs / 1000)));
                }

            } catch (err) {
                console.error(`Failed to update ${student.id}:`, err);
                errors++;
                setProgress({ total: studentsData.length, current, errors });
            }
        }

        setIsUpdating(false);
        setTimeLeft(null);
        alert(`Finished updating! Updated: ${current}, Errors: ${errors}`);
    };

    const formatTime = (val) => {
        if (val === null) return '';
        if (val === 'calculating') return 'Calculating time remaining...';
        const seconds = parseInt(val, 10);
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        if (m > 0) return `${m}m ${s}s remaining`;
        return `${s}s remaining`;
    };

    return (
        <div style={{ padding: '15px', background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '5px', marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#721c24' }}>Admin Tool: Live Excel Bulk Updater</h4>
            
            <div style={{ marginBottom: '15px' }}>
                <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    onChange={handleFileUpload} 
                    style={{ marginBottom: '10px', display: 'block' }}
                />
                <p style={{ margin: '0', color: '#721c24', fontSize: '14px' }}>
                    {fileName ? `Ready to process ${studentsData.length} students from ${fileName}` : 'Please select an Excel file to begin.'}
                </p>
                <p style={{ margin: '5px 0 0 0', color: '#721c24', fontSize: '12px', fontStyle: 'italic' }}>
                    Note: Cannot upload temp files (like ~$ECE.xlsx). Make sure file is closed in Excel.
                </p>
            </div>

            <button 
                onClick={runUpdate} 
                disabled={isUpdating || studentsData.length === 0}
                style={{ padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: (isUpdating || studentsData.length === 0) ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
            >
                {isUpdating ? `Updating... (${progress.current}/${progress.total})` : 'RUN BULK UPDATE NOW'}
            </button>
            {isUpdating && <span style={{ marginLeft: '10px', color: '#721c24', fontWeight: 'bold' }}>Errors: {progress.errors}</span>}
            {isUpdating && timeLeft !== null && (
                <span style={{ marginLeft: '10px', color: '#856404', fontWeight: 'bold', background: '#fff3cd', padding: '4px 8px', borderRadius: '4px' }}>
                    ⏳ {formatTime(timeLeft)}
                </span>
            )}
        </div>
    );
};

export default BulkUpdater;
