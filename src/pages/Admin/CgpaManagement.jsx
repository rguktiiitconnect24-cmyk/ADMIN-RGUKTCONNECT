import { Award, Upload, Users, CheckCircle2, AlertCircle, Loader2, FileText } from 'lucide-react';
import { useState } from 'react';
import { bulkUploadDb } from '../../config/firebase';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import readXlsxFile from 'read-excel-file';
import './AttendanceManagement.css'; // Reusing AttendanceManagement CSS

const CgpaManagement = () => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [preview, setPreview] = useState([]);

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setStatus({ type: '', message: '' });

        try {
            const rows = await readXlsxFile(selectedFile);
            setPreview(rows.slice(1, 11)); // Show first 10 for preview
        } catch (error) {
            console.error("Error reading excel:", error);
            setStatus({ type: 'error', message: 'Failed to read Excel file. Ensure it is a valid .xlsx file.' });
        }
    };

    const formatCgpa = (val) => {
        if (val === undefined || val === null) return "0.00";
        let num = parseFloat(val);
        if (isNaN(num)) return "0.00";
        // Ensure CGPA is properly formatted to 2 decimal places
        return num.toFixed(2);
    };

    const handleUpload = async () => {
        if (!file) {
            setStatus({ type: 'error', message: 'Please select an Excel file first.' });
            return;
        }

        setLoading(true);
        setStatus({ type: 'info', message: 'Processing and uploading data...' });

        try {
            const rows = await readXlsxFile(file);
            const dataRows = rows.slice(1);
            let batch = writeBatch(bulkUploadDb);
            const cgpaRef = collection(bulkUploadDb, 'cgpa_records');

            let count = 0;
            for (const row of dataRows) {
                // Ensure at least 3 columns: ID NUMBER, Name, CGPA
                const [studentIdRaw, name, cgpaRaw] = row;
                
                if (!studentIdRaw) continue;

                const id = studentIdRaw.toString().toUpperCase().trim();
                const docRef = doc(cgpaRef, id);
                
                batch.set(docRef, {
                    studentId: id,
                    name: (name || 'N/A').toString().trim(),
                    cgpa: formatCgpa(cgpaRaw),
                    updatedAt: serverTimestamp()
                });
                
                count++;
                
                // Firestore batches are limited to 500 operations
                if (count % 500 === 0) {
                    await batch.commit();
                    batch = writeBatch(bulkUploadDb); // RESET BATCH
                }
            }

            if (count % 500 !== 0) {
                await batch.commit();
            }
            setStatus({ type: 'success', message: `Successfully updated CGPA for ${count} students.` });
            setPreview([]);
            setFile(null);
        } catch (error) {
            console.error("Bulk upload error:", error);
            setStatus({ type: 'error', message: 'An error occurred during upload. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="attendance-mgmt-container animate-fade-in">
            <div className="admin-header">
                <div className="header-content">
                    <Award className="header-icon" />
                    <div>
                        <h1>CGPA Management</h1>
                        <p>Upload student CGPA via Excel (.xlsx)</p>
                    </div>
                </div>
            </div>

            <div className="upload-section card">
                <div className="upload-zone">
                    <input 
                        type="file" 
                        accept=".xlsx" 
                        onChange={handleFileChange} 
                        id="excel-upload"
                        className="hidden-input"
                    />
                    <label htmlFor="excel-upload" className="upload-label">
                        <div className="upload-icon-box">
                            <Upload size={32} />
                        </div>
                        <div className="upload-text">
                            <h3>{file ? file.name : 'Click to select or drag Excel file'}</h3>
                            <p>Required columns: [ID NUMBER, Name, CGPA]</p>
                        </div>
                    </label>
                </div>

                {preview.length > 0 && (
                    <div className="preview-area">
                        <div className="preview-header">
                            <Users size={16} />
                            <span>Preview (Check alignment below)</span>
                        </div>
                        <div className="table-responsive">
                            <table className="preview-table">
                                <thead>
                                    <tr>
                                        <th>ID Number</th>
                                        <th>Name</th>
                                        <th>CGPA</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.map((row, i) => (
                                        <tr key={i}>
                                            <td className="font-bold">{row[0]}</td>
                                            <td>{row[1]}</td>
                                            <td className="text-primary-600 font-bold">{formatCgpa(row[2])}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="action-bar">
                    {status.message && (
                        <div className={`status-pill ${status.type}`}>
                            {status.type === 'success' ? <CheckCircle2 size={16} /> : 
                             status.type === 'error' ? <AlertCircle size={16} /> : 
                             <Loader2 size={16} className="animate-spin" />}
                            <span>{status.message}</span>
                        </div>
                    )}
                    <button 
                        className={`btn btn-primary btn-upload ${loading ? 'loading' : ''}`}
                        onClick={handleUpload}
                        disabled={loading || !file}
                    >
                        {loading ? 'Uploading...' : 'Confirm Bulk Upload'}
                    </button>
                </div>
            </div>

            <div className="instructions card">
                <div className="card-header">
                    <FileText size={18} />
                    <h2>Excel Template Format</h2>
                </div>
                <div className="card-body">
                    <p>Ensure your Excel file follows this structure exactly for successful processing:</p>
                    <div className="template-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        <div className="template-item"><span>A</span> ID NUMBER</div>
                        <div className="template-item"><span>B</span> Student Name</div>
                        <div className="template-item"><span>C</span> CGPA</div>
                    </div>
                    <div className="alert-box info">
                        <AlertCircle size={16} />
                        <span>Existing records with the same Student ID will be overwritten.</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CgpaManagement;
