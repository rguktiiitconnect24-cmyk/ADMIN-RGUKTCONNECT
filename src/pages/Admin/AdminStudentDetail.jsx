import { RefreshCw, AlertCircle, ChevronLeft, QrCode, GraduationCap, CheckCircle, XCircle, TrendingUp, CreditCard, User, Mail, Phone, MapPin, BookOpen, Calendar, Shield, Clock, Bell, Users } from 'lucide-react';
import QRCode from 'react-qr-code';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

import './AdminStudentDetail.css';

const AdminStudentDetail = () => {
    const { uid } = useParams();
    const navigate = useNavigate();
    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);

    useEffect(() => {
        if (!uid) { setNotFound(true); setLoading(false); return; }

        const unsubscribe = onSnapshot(
            doc(db, 'users', uid),
            (snap) => {
                if (!snap.exists()) {
                    setNotFound(true);
                    setLoading(false);
                    return;
                }
                const data = { uid: snap.id, ...snap.data() };
                setStudent(data);
                setLastUpdated(new Date());
                setLoading(false);
                setNotFound(false);
            },
            (err) => {
                console.error('Firestore listener error:', err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [uid]);

    if (loading) {
        return (
            <div className="asd-loading">
                <RefreshCw size={32} className="asd-spin" />
                <p>Fetching student data…</p>
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="asd-not-found">
                <AlertCircle size={48} />
                <h2>Student Not Found</h2>
                <p>No profile exists for UID: <code>{uid}</code></p>
                <button onClick={() => navigate('/admin/scanner')} className="asd-back-btn">
                    <ChevronLeft size={16} /> Back to Scanner
                </button>
            </div>
        );
    }

    const qrValue = `STUDENT_ID:${uid}`;
    const feeStatus = student.feeStatus || 'pending';
    const attendance = student.attendance?.overall ?? student.attendancePercent ?? null;
    const isVerified = student.isVerified ?? (student.status === 'active');

    const feeColor = feeStatus === 'paid' ? 'success' : feeStatus === 'partial' ? 'warning' : 'danger';
    const attendanceColor = attendance === null ? 'neutral' : attendance >= 75 ? 'success' : attendance >= 60 ? 'warning' : 'danger';

    return (
        <div className="asd-page">
            {/* Top bar */}
            <div className="asd-topbar">
                <button className="asd-back-btn-top" onClick={() => navigate(-1)}>
                    <ChevronLeft size={20} />
                </button>
                <div className="asd-topbar-text">
                    <h1 className="asd-topbar-title">Student Profile</h1>
                    <p className="asd-topbar-sub">
                        <span className="asd-live-dot" /> Live — updates in real-time
                    </p>
                </div>
                <button className="asd-qr-btn" onClick={() => navigate('/admin/scanner')}>
                    <QrCode size={18} />
                </button>
            </div>

            <div className="asd-content">

                {/* Hero card */}
                <div className="asd-hero-card">
                    <div className="asd-hero-bg" />
                    <div className="asd-hero-body">
                        <div className="asd-avatar-wrapper">
                            {student.avatar ? (
                                <img src={student.avatar} alt={student.fullName} className="asd-avatar" />
                            ) : (
                                <div className="asd-avatar-placeholder">
                                    {(student.fullName || 'S').split(' ').map(n => n[0]).slice(0, 2).join('')}
                                </div>
                            )}
                            <div className={`asd-status-dot ${isVerified ? 'verified' : 'unverified'}`} />
                        </div>
                        <div className="asd-hero-info">
                            <h2 className="asd-student-name">{student.fullName || '—'}</h2>
                            <div className="asd-student-id-pill">{student.studentId || uid.slice(0, 12)}</div>
                            <div className="asd-dept-row">
                                <GraduationCap size={12} />
                                <span>{student.department || student.branch || 'B.Tech'}</span>
                            </div>
                            <div className={`asd-verified-badge ${isVerified ? 'v-active' : 'v-inactive'}`}>
                                {isVerified ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                {isVerified ? 'Verified Student' : 'Unverified'}
                            </div>
                        </div>

                        {/* QR mini */}
                        <div className="asd-mini-qr">
                            <QRCode value={qrValue} size={64} level="M" fgColor="#1e293b" bgColor="#fff" />
                        </div>
                    </div>
                </div>

                {/* Status row */}
                <div className="asd-status-row">
                    <div className={`asd-status-chip asd-chip-${attendanceColor}`}>
                        <TrendingUp size={14} />
                        <span>{attendance !== null ? `${attendance}% Attendance` : 'Attendance N/A'}</span>
                    </div>
                    <div className={`asd-status-chip asd-chip-${feeColor}`}>
                        <CreditCard size={14} />
                        <span>Fee: {feeStatus.charAt(0).toUpperCase() + feeStatus.slice(1)}</span>
                    </div>
                </div>

                {/* Contact info */}
                <div className="asd-section-card">
                    <h3 className="asd-section-title">
                        <User size={15} /> Contact Information
                    </h3>
                    <div className="asd-info-grid">
                        <InfoRow icon={<Mail size={13} />} label="Email" value={student.email || '—'} />
                        <InfoRow icon={<Phone size={13} />} label="Phone" value={student.phone ? `+91 ${student.phone}` : '—'} />
                        <InfoRow icon={<MapPin size={13} />} label="Campus" value={(student.campus || '').replace('RGUKT ', '') || '—'} />
                        <InfoRow icon={<MapPin size={13} />} label="Address" value={student.address || '—'} />
                    </div>
                </div>

                {/* Academic info */}
                <div className="asd-section-card">
                    <h3 className="asd-section-title">
                        <BookOpen size={15} /> Academic Details
                    </h3>
                    <div className="asd-info-grid">
                        <InfoRow icon={<GraduationCap size={13} />} label="Department" value={student.department || student.branch || '—'} />
                        <InfoRow icon={<Calendar size={13} />} label="Academic Year" value={student.academicYear || '2023 – 2027'} />
                        <InfoRow icon={<Shield size={13} />} label="Class / Section" value={student.currentClass || student.classSection || '—'} />
                        <InfoRow icon={<BookOpen size={13} />} label="RC ID" value={student.rcId || '—'} />
                    </div>
                </div>

                {/* Security / account */}
                <div className="asd-section-card">
                    <h3 className="asd-section-title">
                        <Shield size={15} /> Account & Security
                    </h3>
                    <div className="asd-info-grid">
                        <InfoRow icon={<User size={13} />} label="Role" value={(student.role || 'student').toUpperCase()} />
                        <InfoRow icon={<Clock size={13} />} label="Account Status" value={student.status || 'active'} />
                        <InfoRow icon={<Clock size={13} />} label="Last Login" value={student.lastLogin ? new Date(student.lastLogin).toLocaleString() : '—'} />
                        <InfoRow icon={<Clock size={13} />} label="Joined" value={student.createdAt ? new Date(student.createdAt).toLocaleDateString() : '—'} />
                    </div>
                </div>

                {/* Emergency contact */}
                {(student.emergencyContact || student.guardianName) && (
                    <div className="asd-section-card">
                        <h3 className="asd-section-title">
                            <Bell size={15} /> Emergency Contact
                        </h3>
                        <div className="asd-info-grid">
                            <InfoRow icon={<Users size={13} />} label="Guardian" value={student.guardianName || student.emergencyContact || '—'} />
                            <InfoRow icon={<Phone size={13} />} label="Guardian Phone" value={student.guardianPhone ? `+91 ${student.guardianPhone}` : '—'} />
                        </div>
                    </div>
                )}

                {/* Last updated */}
                {lastUpdated && (
                    <p className="asd-last-updated">
                        <Clock size={11} />
                        Data last refreshed: {lastUpdated.toLocaleTimeString()}
                    </p>
                )}

                {/* UID reference */}
                <div className="asd-uid-box">
                    <p className="asd-uid-label">Firebase UID</p>
                    <p className="asd-uid-value">{uid}</p>
                </div>
            </div>
        </div>
    );
};

const InfoRow = ({ icon, label, value }) => (
    <div className="asd-info-row">
        <div className="asd-info-icon">{icon}</div>
        <div className="asd-info-content">
            <span className="asd-info-label">{label}</span>
            <span className="asd-info-value">{value}</span>
        </div>
    </div>
);

export default AdminStudentDetail;
