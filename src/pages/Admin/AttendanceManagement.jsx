import { Database, Upload, Users, CheckCircle2, AlertCircle, Loader2, FileText } from 'lucide-react';
import { useState } from 'react';
import { bulkUploadDb } from '../../config/firebase';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import readXlsxFile from 'read-excel-file';
import { formatAttendancePercent } from '../../utils/formatUtils';
import './AttendanceManagement.css';

const AttendanceManagement = () => {
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

    const formatPercent = (val) => {
        if (val === undefined || val === null) return 0;
        if (typeof val === 'string') {
            return parseFloat(val.replace('%', '')) || 0;
        }
        // If Excel stores it as 0.7069, convert to 70.69
        if (typeof val === 'number' && val <= 1) {
            return parseFloat((val * 100).toFixed(2));
        }
        return parseFloat(val) || 0;
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
            const attendanceRef = collection(bulkUploadDb, 'attendance_rates');

            let count = 0;
            for (const row of dataRows) {
                // Determine if there's a Serial Number column (10 columns vs 9)
                const isShifted = row.length >= 10;
                const offset = isShifted ? 1 : 0;

                const [
                    studentIdRaw, 
                    name, 
                    gender, 
                    className, 
                    campus, 
                    group, 
                    conducted, 
                    present, 
                    consolidated
                ] = row.slice(offset);
                
                const studentId = isShifted ? row[1] : row[0];

                if (!studentId) continue;

                const id = studentId.toString().toUpperCase().trim();
                const docRef = doc(attendanceRef, id);
                
                batch.set(docRef, {
                    studentId: id,
                    name: (name || 'N/A').toString().trim(),
                    gender: (gender || 'N/A').toString().trim(),
                    className: (className || 'N/A').toString().trim(),
                    campus: (campus || 'N/A').toString().trim(),
                    group: (group || 'N/A').toString().trim(),
                    totalConducted: parseFloat(conducted) || 0,
                    totalPresent: parseFloat(present) || 0,
                    consolidated: formatPercent(consolidated),
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
            setStatus({ type: 'success', message: `Successfully updated attendance for ${count} students.` });
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
                    <Database className="header-icon" />
                    <div>
                        <h1>Attendance Management</h1>
                        <p>Upload student attendance rates via Excel (.xlsx)</p>
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
                            <p>Required columns: [ID NUMBER, Name, Gender, CLASS, CAMPUS, GROUP, Cnd, Prs, %]</p>
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
                                        <th>Gen</th>
                                        <th>Class</th>
                                        <th>Camp</th>
                                        <th>Group</th>
                                        <th>Cnd</th>
                                        <th>Prs</th>
                                        <th>%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.map((row, i) => {
                                        const isShifted = row.length >= 10;
                                        const d = isShifted ? row.slice(1) : row;
                                        return (
                                            <tr key={i}>
                                                <td className="font-bold">{d[0]}</td>
                                                <td>{d[1]}</td>
                                                <td>{d[2]}</td>
                                                <td>{d[3]}</td>
                                                <td>{d[4]}</td>
                                                <td>{d[5]}</td>
                                                <td>{formatAttendancePercent(d[6])}</td>
                                                <td>{formatAttendancePercent(d[7])}</td>
                                                <td className="text-primary-600 font-bold">{formatAttendancePercent(d[8])}</td>
                                            </tr>
                                        );
                                    })}
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
                    <div className="template-grid">
                        <div className="template-item"><span>A</span> ID NUMBER</div>
                        <div className="template-item"><span>B</span> Student Name</div>
                        <div className="template-item"><span>C</span> Gender</div>
                        <div className="template-item"><span>D</span> CLASS</div>
                        <div className="template-item"><span>E</span> CAMPUS</div>
                        <div className="template-item"><span>F</span> GROUP</div>
                        <div className="template-item"><span>G</span> Conducted</div>
                        <div className="template-item"><span>H</span> Present</div>
                        <div className="template-item"><span>I</span> Consolidated %</div>
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

export default AttendanceManagement;
