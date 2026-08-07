import { ChevronLeft, Trash2, Loader2, Save, Search, UploadCloud, AlertCircle, CheckCircle, ChevronRight } from 'lucide-react';
import LoadingTransition from '../../components/Common/LoadingTransition';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import readXlsxFile from 'read-excel-file';
import { bulkUploadDb } from '../../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from '../../context/ToastContext';
import './Admin.css';
import './AdminExamSettings.css';

const AdminExamSettings = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSeatingVisible, setIsSeatingVisible] = useState(true);
    const [isImportingSeating, setIsImportingSeating] = useState(false);
    const [seatingData, setSeatingData] = useState([]);
    const [mappingInfo, setMappingInfo] = useState(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 100;
    const seatingInputRef = useRef(null);

    useEffect(() => {
        const fetchSeatingData = async () => {
            try {
                const seatingSnap = await getDoc(doc(bulkUploadDb, 'settings', 'seating_data'));
                if (seatingSnap.exists()) {
                    const data = seatingSnap.data();
                    setSeatingData(data.data || []);
                    setIsSeatingVisible(data.isVisible !== undefined ? data.isVisible : true);
                }
            } catch (error) {
                console.error("Error fetching seating data:", error);
                showToast("Failed to load existing seating data.", "error");
            } finally {
                setIsLoading(false);
            }
        };
        fetchSeatingData();
    }, []);

    const handleSeatingUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsImportingSeating(true);
        try {
            const rows = await readXlsxFile(file);
            if (rows.length < 1) {
                showToast('Excel file is empty.', 'error');
                return;
            }

            const headers = rows[0].map(h => h?.toString().toLowerCase().trim() || '');
            const dataRows = rows.slice(1);

            const findIdx = (keywords) => {
                // Try exact matches first
                const exactMatch = headers.findIndex(h => keywords.some(k => h === k));
                if (exactMatch !== -1) return exactMatch;
                // Fallback to fuzzy matches
                return headers.findIndex(h => keywords.some(k => h.includes(k)));
            };

            const idIdx = findIdx(['id no', 'id no.', 'student id', 'roll', 'reg no']);
            const nameIdx = findIdx(['name', 'student name', 'name of the student']);
            const classIdx = findIdx(['class', 'section', 'branch']);
            const spIdx = findIdx(['sp', 's.p', 's.p.', 'position', 'seat', 'seat no', 'seating position']);
            const hallIdx = findIdx(['hall', 'exam hall', 'room', 'room no']);
            const subjectIdx = findIdx(['subject', 'subject name', 'course']);
            const dateTimeIdx = findIdx(['date & time', 'date/time', 'date and time', 'date', 'time', 'slot']);

            const seating = dataRows.map(row => {
                if (row.every(cell => cell === null || cell === '')) return null;
                
                // Direct mapping from found indices, or standard fallbacks
                // Fallbacks: 0=Sl, 1=ID, 2=Name, 3=Class, 4=SP, 5=Exam, 6=Subject, 7=Hall, 8=Time
                return {
                    'ID No.': idIdx !== -1 ? (row[idIdx]?.toString().trim() || '') : (row[1]?.toString().trim() || ''),
                    'NAME OF THE STUDENT': nameIdx !== -1 ? (row[nameIdx]?.toString().trim() || '') : (row[2]?.toString().trim() || ''),
                    'CLASS': classIdx !== -1 ? (row[classIdx]?.toString().trim() || '') : (row[3]?.toString().trim() || ''),
                    'SP': spIdx !== -1 ? (row[spIdx]?.toString().trim() || '') : (row[4]?.toString().trim() || ''),
                    'EXAM HALL': hallIdx !== -1 ? (row[hallIdx]?.toString().trim() || '') : (row[7]?.toString().trim() || ''),
                    'SUBJECT': subjectIdx !== -1 ? (row[subjectIdx]?.toString().trim() || '') : (row[6]?.toString().trim() || ''),
                    'DATE & TIME': dateTimeIdx !== -1 ? (row[dateTimeIdx]?.toString().trim() || '') : (row[8]?.toString().trim() || '')
                };
            }).filter(Boolean);

            if (seating.length === 0) {
                showToast('No valid seating entries found.', 'warning');
                return;
            }

            setSeatingData(seating);
            setMappingInfo({ 
                'ID': idIdx !== -1, 
                'Name': nameIdx !== -1, 
                'Class': classIdx !== -1, 
                'SP': spIdx !== -1, 
                'Hall': hallIdx !== -1, 
                'Subject': subjectIdx !== -1, 
                'Time': dateTimeIdx !== -1 
            });
            setCurrentPage(1);
            setHasUnsavedChanges(true);
            showToast(`Extracted ${seating.length} records. Please review and click 'Upload to Firebase'.`);
        } catch (error) {
            console.error('Seating Import Error:', error);
            showToast('Failed to read seating Excel.', 'error');
        } finally {
            setIsImportingSeating(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await setDoc(doc(bulkUploadDb, 'settings', 'seating_data'), { 
                data: seatingData,
                isVisible: isSeatingVisible,
                updatedAt: Date.now()
            });
            setHasUnsavedChanges(false);
            showToast("Seating settings successfully saved!");
        } catch (error) {
            console.error("Error saving seating data:", error);
            showToast("Failed to save settings.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const clearData = () => {
        if (window.confirm("Clear all extracted data? This won't affect Firebase until you save.")) {
            setSeatingData([]);
            setMappingInfo(null);
            setCurrentPage(1);
            setHasUnsavedChanges(true);
        }
    };

    const paginatedData = seatingData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const totalPages = Math.ceil(seatingData.length / itemsPerPage);

    if (isLoading) return <LoadingTransition message="Seating Settings Loading" persistent />;

    return (
        <div className="admin-container">
            <div className="page-header-v2">
                <div className="header-accent-bar"></div>
                <div className="header-content-v2">
                    <h1 className="page-title-v2">Exam Seating Positions</h1>
                    <p className="page-subtitle-v2">Upload and manage seating arrangements for upcoming exams.</p>
                </div>
                <div className="header-action-btn">
                    <button 
                        className="btn-labeled" 
                        onClick={() => navigate('/admin/exams')}
                        title="Back to Exams"
                    >
                        <ChevronLeft size={18} />
                        <span>Go Back</span>
                    </button>
                    {seatingData.length > 0 && (
                        <button className="btn-labeled danger" onClick={clearData} title="Clear Data">
                            <Trash2 size={18} />
                            <span>Clear Data</span>
                        </button>
                    )}
                    <button
                        className={`btn-labeled ${hasUnsavedChanges ? 'primary pulse' : ''}`}
                        onClick={handleSave}
                        disabled={isSaving || !hasUnsavedChanges}
                        title="Save Settings"
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                </div>
            </div>

            <div className="settings-single-col">
                {/* Global Visibility Toggle */}
                <div className="section-card mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
                                <Search size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-[var(--color-text-main)]">Exam Seating Status</h3>
                                <p className="text-sm text-[var(--color-text-muted)]">Control if seating search is active for students</p>
                            </div>
                        </div>
                        <div className="status-indicator-group">
                            <span className={`status-badge-mini ${isSeatingVisible ? 'on' : 'off'}`}>
                                {isSeatingVisible ? 'ON' : 'OFF'}
                            </span>
                            <div
                                className={`toggle-switch ${isSeatingVisible ? 'active' : ''}`}
                                onClick={() => {
                                    setIsSeatingVisible(!isSeatingVisible);
                                    setHasUnsavedChanges(true);
                                }}
                            >
                                <div className="toggle-knob"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Seating Arrangement Card */}
                <div className="section-card mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-orange-50 text-orange-600">
                                <UploadCloud size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-[var(--color-text-main)]">Bulk Upload Seating</h3>
                                <p className="text-sm text-[var(--color-text-muted)]">Upload your Excel sheet (.xlsx or .xls)</p>
                            </div>
                        </div>
                        {hasUnsavedChanges && (
                            <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full text-xs font-bold animate-bounce">
                                <AlertCircle size={14} />
                                Unsaved Changes
                            </div>
                        )}
                    </div>

                    <div className="import-zone">
                        <input
                            type="file"
                            ref={seatingInputRef}
                            onChange={handleSeatingUpload}
                            accept=".xlsx, .xls"
                            className="hidden"
                        />
                        <button
                            className="upload-trigger-btn border-orange-200 hover:border-orange-500 hover:bg-orange-50/30"
                            onClick={() => seatingInputRef.current?.click()}
                            disabled={isImportingSeating}
                        >
                            <div className="upload-icon-wrapper bg-orange-50 text-orange-600">
                                {isImportingSeating ? <Loader2 className="animate-spin" /> : <UploadCloud size={32} />}
                            </div>
                            <div className="upload-text">
                                <h4>{isImportingSeating ? 'Extracting Data...' : 'Click to Select Excel File'}</h4>
                                <p>Standard columns: ID No, Student Name, SP, Exam Hall, etc.</p>
                            </div>
                        </button>
                    </div>

                    {mappingInfo && (
                        <div className="mt-4 flex flex-wrap gap-2 items-center">
                            <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase mr-1">Column Mapping:</span>
                            {Object.entries(mappingInfo).map(([label, matched]) => (
                                <span key={label} className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${matched ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-400 opacity-60'}`}>
                                    {matched ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                                    {label}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Preview Table */}
                {seatingData.length > 0 ? (
                    <div className="section-card animate-fade-in overflow-hidden">
                        <div className="flex items-center justify-between mb-6 px-2">
                            <h3 className="text-md font-bold text-[var(--color-text-main)] flex items-center gap-2">
                                <CheckCircle size={18} className="text-green-500" />
                                Extracted Preview 
                                <span className="text-xs font-medium text-[var(--color-text-muted)] bg-[var(--color-surface-hover)] px-2 py-0.5 rounded-md">
                                    {seatingData.length} Records
                                </span>
                            </h3>
                            <p className="text-xs text-[var(--color-text-muted)] italic">
                                * Scroll horizontally to see all columns
                            </p>
                        </div>

                        <div className="preview-table-container">
                            <table className="preview-table">
                                <thead>
                                    <tr>
                                        <th>ID No.</th>
                                        <th>Student Name</th>
                                        <th>Class</th>
                                        <th>Seating Position</th>
                                        <th>Exam Hall</th>
                                        <th>Subject</th>
                                        <th>Date & Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedData.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="font-bold text-blue-600">{item['ID No.']}</td>
                                            <td>{item['NAME OF THE STUDENT']}</td>
                                            <td><span className="badge-outline">{item['CLASS']}</span></td>
                                            <td><span className="badge-solid">{item['SP']}</span></td>
                                            <td className="font-medium">{item['EXAM HALL']}</td>
                                            <td className="text-xs">{item['SUBJECT']}</td>
                                            <td className="text-xs text-muted">{item['DATE & TIME']}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div className="pagination-controls px-4 py-3 flex items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-surface-hover)]">
                                <div className="text-xs font-medium text-[var(--color-text-muted)]">
                                    Showing <span className="text-[var(--color-text-main)]">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-[var(--color-text-main)]">{Math.min(currentPage * itemsPerPage, seatingData.length)}</span> of <span className="text-[var(--color-text-main)]">{seatingData.length}</span> students
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        className="btn-pagination"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft size={16} />
                                        Previous
                                    </button>
                                    <div className="px-3 flex items-center text-xs font-bold bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg">
                                        {currentPage} / {totalPages}
                                    </div>
                                    <button
                                        className="btn-pagination"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        Next
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="empty-preview-state">
                        <Search size={48} className="text-[var(--color-border)] mb-4" />
                        <h3>No Data Extracted</h3>
                        <p>Upload an Excel file to see a preview of the seating arrangement here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminExamSettings;
