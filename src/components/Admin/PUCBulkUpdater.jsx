import { useState } from 'react';
import { pucDb } from '../../config/firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import * as xlsx from 'xlsx';

const PUCBulkUpdater = () => {
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
                
                const cleanData = [];
                let headerMap = null;

                for (let i = 0; i < data.length; i++) {
                    const rawRow = data[i];
                    
                    if (!headerMap && i === 0) {
                        const keys = Object.keys(rawRow);
                        const hasIdKey = keys.some(k => k.toLowerCase().includes('id') || k.toLowerCase().includes('roll'));
                        if (hasIdKey) {
                            headerMap = {};
                            keys.forEach(k => {
                                const kl = k.toLowerCase();
                                if (kl.includes('id') || kl.includes('roll')) headerMap.id = k;
                                else if (kl.includes('name')) headerMap.name = k;
                                else if (kl.includes('gender') || kl.includes('sex')) headerMap.gender = k;
                                else if (kl.includes('branch') || kl.includes('dept') || kl.includes('course')) headerMap.branch = k;
                                else if (kl.includes('section') || kl.includes('class')) headerMap.section = k;
                            });
                        }
                    }
                    
                    if (!headerMap) {
                        const values = Object.values(rawRow).map(v => String(v).trim().toLowerCase());
                        const hasIdVal = values.some(v => v.includes('id') || v.includes('roll'));
                        
                        if (hasIdVal) {
                            headerMap = {};
                            for (const key in rawRow) {
                                const vl = String(rawRow[key]).trim().toLowerCase();
                                if (vl.includes('id') || vl.includes('roll')) headerMap.id = key;
                                else if (vl.includes('name')) headerMap.name = key;
                                else if (vl.includes('gender') || vl.includes('sex')) headerMap.gender = key;
                                else if (vl.includes('branch') || vl.includes('dept') || vl.includes('course')) headerMap.branch = key;
                                else if (vl.includes('section') || vl.includes('class')) headerMap.section = key;
                            }
                            continue; // Skip the header row itself
                        }
                    }
                    
                    if (headerMap) {
                        const idVal = rawRow[headerMap.id];
                        if (idVal) {
                            cleanData.push({
                                id: String(idVal).trim(),
                                name: headerMap.name && rawRow[headerMap.name] ? String(rawRow[headerMap.name]).trim() : '',
                                gender: headerMap.gender && rawRow[headerMap.gender] ? String(rawRow[headerMap.gender]).trim() : '',
                                branch: headerMap.branch && rawRow[headerMap.branch] ? String(rawRow[headerMap.branch]).trim() : '',
                                section: headerMap.section && rawRow[headerMap.section] ? String(rawRow[headerMap.section]).trim() : '',
                                originalData: rawRow
                            });
                        }
                    }
                }
                
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
            alert("No valid student data found! Ensure your Excel has an 'ID' or 'Roll' column.");
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
                // Ensure document ID is valid
                const docId = student.id.replace(/\//g, '_'); 
                const studentRef = doc(pucDb, 'puc_students', docId);
                const snapshot = await getDoc(studentRef);

                const dataToSave = {
                    name: student.name || '',
                    gender: student.gender || '',
                    branch: student.branch || '',
                    classSection: student.section || '',
                    id: student.id,
                    email: student.id ? `${student.id.charAt(0).toLowerCase()}${student.id.slice(1)}@rguktrkv.ac.in` : '',
                    originalData: student.originalData,
                    updatedAt: new Date().toISOString()
                };

                if (snapshot.exists()) {
                    await updateDoc(studentRef, dataToSave);
                } else {
                    await setDoc(studentRef, dataToSave);
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
        alert(`Finished updating PUC Database! Updated: ${current}, Errors: ${errors}`);
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
        <div style={{ padding: '15px', background: '#e2e3e5', border: '1px solid #d6d8db', borderRadius: '5px', marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#383d41' }}>PUC Admin Tool: Excel Bulk Updater</h4>
            
            <div style={{ marginBottom: '15px' }}>
                <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    onChange={handleFileUpload} 
                    style={{ marginBottom: '10px', display: 'block' }}
                />
                <p style={{ margin: '0', color: '#383d41', fontSize: '14px' }}>
                    {fileName ? `Ready to process ${studentsData.length} PUC students from ${fileName}` : 'Please select an Excel file to begin.'}
                </p>
                <p style={{ margin: '5px 0 0 0', color: '#383d41', fontSize: '12px', fontStyle: 'italic' }}>
                    Note: Cannot upload temp files (like ~$Data.xlsx). Make sure file is closed in Excel.
                </p>
            </div>

            <button 
                onClick={runUpdate} 
                disabled={isUpdating || studentsData.length === 0}
                style={{ padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: (isUpdating || studentsData.length === 0) ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
            >
                {isUpdating ? `Updating PUC DB... (${progress.current}/${progress.total})` : 'RUN PUC BULK UPDATE NOW'}
            </button>
            {isUpdating && <span style={{ marginLeft: '10px', color: '#383d41', fontWeight: 'bold' }}>Errors: {progress.errors}</span>}
            {isUpdating && timeLeft !== null && (
                <span style={{ marginLeft: '10px', color: '#383d41', fontWeight: 'bold', background: '#fff', padding: '4px 8px', borderRadius: '4px' }}>
                    ⏳ {formatTime(timeLeft)}
                </span>
            )}
        </div>
    );
};

export default PUCBulkUpdater;
