import { X, User, GraduationCap, AlertCircle, Info } from 'lucide-react';
import { PieChart } from 'recharts';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { bulkUploadDb } from '../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { formatAttendancePercent, normalizeAttendanceValue } from '../../utils/formatUtils';
import './AttendanceBottomSheet.css';

const AttendanceBottomSheet = ({ isOpen, onClose, user }) => {
    const [attendance, setAttendance] = useState(null);
    const [loading, setLoading] = useState(false);
    const [shouldRender, setShouldRender] = useState(isOpen);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            setIsClosing(false);
            fetchAttendance();
        } else if (shouldRender) {
            setIsClosing(true);
            const timer = setTimeout(() => {
                setShouldRender(false);
                setIsClosing(false);
            }, 400);
            return () => clearTimeout(timer);
        }
    }, [isOpen, shouldRender]);

    const fetchAttendance = async () => {
        setLoading(true);
        if (!user?.studentId) {
            setLoading(false);
            return;
        }
        try {
            const id = user.studentId.toUpperCase().replace(/^RGUKT-/i, '').trim();
            const docSnap = await getDoc(doc(bulkUploadDb, 'attendance_rates', id));
            if (docSnap.exists()) {
                setAttendance(docSnap.data());
            }
        } catch (error) {
            console.error("Error fetching attendance:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!shouldRender) return null;

    const { consolidated = 0, totalConducted = 0, totalPresent = 0, className = 'N/A', campus = 'N/A', group = 'N/A', gender = 'N/A', name = 'N/A', studentId = 'N/A', updatedAt } = attendance || {};
    const normalizedConsolidated = normalizeAttendanceValue(consolidated);
    const absentCount = totalConducted - totalPresent;
    const attendanceColor = normalizedConsolidated >= 75 ? '#10b981' : normalizedConsolidated >= 65 ? '#f59e0b' : '#ef4444';

    const sheetContent = (
        <div className={`attendance-sheet-overlay ${isClosing ? 'is-closing' : ''}`} onClick={onClose}>
            <div 
                className={`attendance-sheet-content ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`} 
                onClick={e => e.stopPropagation()}
            >
                <div className="attendance-sheet-grabber"></div>
                
                <header className="attendance-sheet-header">
                    <div className="header-title-box">
                        <div className="icon-circle">
                            <PieChart size={20} />
                        </div>
                        <div className="text-box">
                            <h3>Full Attendance Report</h3>
                            <p>Official records from university portal</p>
                        </div>
                    </div>
                    <button className="close-circle-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </header>

                <div className="attendance-sheet-body">
                    {loading ? (
                        <div className="sheet-loading-state">
                            <div className="sheet-loader"></div>
                            <p>Fetching your records...</p>
                        </div>
                    ) : attendance ? (
                        <div className="sheet-data-container animate-fade-in">
                            {/* Main Progress Card */}
                            <div className="sheet-main-card" style={{ '--accent-color': attendanceColor }}>
                                <div className="circular-progress-box">
                                    <svg viewBox="0 0 100 100">
                                        <circle className="bg" cx="50" cy="50" r="45" />
                                        <circle 
                                            className="progress" 
                                            cx="50" cy="50" r="45" 
                                            style={{ 
                                                strokeDasharray: '283',
                                                strokeDashoffset: 283 - (283 * normalizedConsolidated) / 100,
                                                stroke: attendanceColor
                                            }} 
                                        />
                                    </svg>
                                    <div className="progress-value-box">
                                        <span className="value bungee-regular">{formatAttendancePercent(consolidated)}</span>
                                        <span className="label">Consolidated</span>
                                    </div>
                                </div>

                                <div className="quick-stats-grid">
                                    <div className="q-stat">
                                        <span className="q-val">{formatAttendancePercent(totalPresent)}</span>
                                        <span className="q-lab">Present</span>
                                    </div>
                                    <div className="q-divider"></div>
                                    <div className="q-stat">
                                        <span className="q-val">{formatAttendancePercent(absentCount)}</span>
                                        <span className="q-lab">Absent</span>
                                    </div>
                                    <div className="q-divider"></div>
                                    <div className="q-stat">
                                        <span className="q-val">{formatAttendancePercent(totalConducted)}</span>
                                        <span className="q-lab">Total</span>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Profile */}
                            <div className="sheet-section">
                                <div className="section-title">
                                    <User size={14} />
                                    <span>Personal Information</span>
                                </div>
                                <div className="sheet-info-list">
                                    <div className="info-row">
                                        <div className="info-details">
                                            <span className="info-label">Full Name</span>
                                            <span className="info-value">{name}</span>
                                        </div>
                                        <div className="info-details text-right">
                                            <span className="info-label">Gender</span>
                                            <span className="info-value">{gender}</span>
                                        </div>
                                    </div>
                                    <div className="info-row">
                                        <div className="info-details">
                                            <span className="info-label">Student ID</span>
                                            <span className="info-value">{studentId}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Academic */}
                            <div className="sheet-section">
                                <div className="section-title">
                                    <GraduationCap size={14} />
                                    <span>Academic Context</span>
                                </div>
                                <div className="sheet-info-list">
                                    <div className="info-row">
                                        <div className="info-details">
                                            <span className="info-label">Class & Section</span>
                                            <span className="info-value">{className}</span>
                                        </div>
                                        <div className="info-details text-right">
                                            <span className="info-label">Group</span>
                                            <span className="info-value">{group}</span>
                                        </div>
                                    </div>
                                    <div className="info-row">
                                        <div className="info-details">
                                            <span className="info-label">Campus</span>
                                            <span className="info-value">{campus}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Status & Update Time */}
                            <div className="sheet-footer-box">
                                <div className="sheet-footer-notice" style={{ backgroundColor: `${attendanceColor}10`, color: attendanceColor }}>
                                    <AlertCircle size={14} />
                                    <span>{normalizedConsolidated >= 75 ? 'Qualified for semester examinations.' : 'Shortage of attendance detected.'}</span>
                                </div>
                                {updatedAt && (
                                    <p className="sheet-update-ts">
                                        Last updated: {updatedAt.toDate().toLocaleDateString()} at {updatedAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="sheet-empty-state">
                            <Info size={40} opacity={0.3} />
                            <p>No attendance records found for your ID.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(sheetContent, document.body);
};

export default AttendanceBottomSheet;
