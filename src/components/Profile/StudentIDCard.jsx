import { X, GraduationCap, Shield, Calendar, Phone, MapPin, QRCode, RefreshCw, Download, Share2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Share as CapacitorShare } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import html2canvas from 'html2canvas';
import './StudentIDCard.css';

const StudentIDCard = ({ user, formData, previewUrl, onClose }) => {
    const cardRef = useRef(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [isFlipped, setIsFlipped] = useState(false);

    const qrValue = `STUDENT_ID:${user?.uid || 'UNKNOWN'}`;

    const studentName = formData?.fullName || user?.fullName || 'Student Name';
    const studentId = formData?.studentId || user?.studentId || '—';
    const department = formData?.department || user?.department || 'B.Tech';
    const email = formData?.email || user?.email || '—';
    const phone = formData?.phone ? `+91 ${formData.phone}` : (user?.phone ? `+91 ${user.phone}` : '—');
    const campus = (formData?.campus || user?.campus || 'RGUKT').replace('RGUKT ', '');
    const year = formData?.academicYear || user?.academicYear || '2023 – 2027';
    const avatar = previewUrl || user?.avatar || null;

    const captureCard = async () => {
        if (!cardRef.current) return null;
        const canvas = await html2canvas(cardRef.current, {
            scale: 3,
            useCORS: true,
            backgroundColor: null,
            logging: false,
        });
        return canvas;
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const canvas = await captureCard();
            if (!canvas) return;

            if (Capacitor.isNativePlatform()) {
                const base64 = canvas.toDataURL('image/png').split(',')[1];
                const fileName = `Student_ID_${studentId}.png`;
                await Filesystem.writeFile({
                    path: fileName,
                    data: base64,
                    directory: Directory.Documents,
                });
            } else {
                const link = document.createElement('a');
                link.download = `Student_ID_${studentId}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            }
        } catch (err) {
            console.error('Download failed:', err);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleShare = async () => {
        setIsSharing(true);
        try {
            const canvas = await captureCard();
            if (!canvas) return;
            const base64 = canvas.toDataURL('image/png').split(',')[1];
            const fileName = `Student_ID_${studentId}.png`;

            if (Capacitor.isNativePlatform()) {
                const fileResult = await Filesystem.writeFile({
                    path: fileName,
                    data: base64,
                    directory: Directory.Cache,
                });
                await CapacitorShare.share({
                    title: 'My Student ID Card',
                    text: `${studentName} — ${department}`,
                    url: fileResult.uri,
                });
            } else {
                // Web fallback
                const blob = await (await fetch(canvas.toDataURL('image/png'))).blob();
                if (navigator.share && navigator.canShare?.({ files: [new File([blob], fileName)] })) {
                    await navigator.share({ files: [new File([blob], fileName, { type: 'image/png' })], title: 'My Student ID' });
                } else {
                    handleDownload();
                }
            }
        } catch (err) {
            console.error('Share failed:', err);
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <div className="id-card-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="id-card-modal">
                {/* Close button */}
                <button className="id-card-close" onClick={onClose}>
                    <X size={20} />
                </button>

                <p className="id-card-label">Digital Student ID</p>

                {/* ── THE CARD ── */}
                <div className={`id-card-scene ${isFlipped ? 'is-flipped' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
                    <div className="id-card-wrapper flip-card-inner" ref={cardRef}>
                        
                        {/* --- FRONT OF CARD --- */}
                        <div className="flip-card-face flip-card-front premium-glass-card landscape-layout">
                            {/* Decorative Background Elements */}
                            <div className="glass-blob glass-blob-tr"></div>
                            <div className="glass-blob glass-blob-bl"></div>
                            <div className="glass-noise-overlay"></div>

                            {/* Header */}
                            <div className="glass-card-header landscape-header">
                                <div className="glass-logo-container">
                                    <GraduationCap size={18} color="#ffffff" strokeWidth={2} />
                                </div>
                                <div className="glass-header-text">
                                    <h3>RGUKT CONNECT</h3>
                                    <p>OFFICIAL STUDENT ID</p>
                                </div>
                            </div>

                            {/* Body (Row based for landscape) */}
                            <div className="glass-card-body landscape-body">
                                <div className="glass-avatar-container landscape-avatar">
                                    <div className="glass-avatar-ring">
                                        {avatar ? (
                                            <img src={avatar} alt="Student" className="glass-avatar-img" crossOrigin="anonymous" />
                                        ) : (
                                            <div className="glass-avatar-placeholder">
                                                {studentName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                            </div>
                                        )}
                                    </div>
                                    <div className="glass-verified-pill">
                                        <Shield size={10} />
                                        <span>VERIFIED</span>
                                    </div>
                                </div>

                                <div className="glass-student-info landscape-info">
                                    <h2 className="glass-student-name">{studentName}</h2>
                                    <div className="glass-id-badge">{studentId}</div>
                                    
                                    <div className="glass-details-grid landscape-grid">
                                        <div className="glass-detail-item">
                                            <div className="glass-detail-icon-wrapper">
                                                <GraduationCap size={12} className="glass-detail-icon" />
                                            </div>
                                            <span>{department}</span>
                                        </div>
                                        <div className="glass-detail-item">
                                            <div className="glass-detail-icon-wrapper">
                                                <Calendar size={12} className="glass-detail-icon" />
                                            </div>
                                            <span>{year}</span>
                                        </div>
                                        <div className="glass-detail-item">
                                            <div className="glass-detail-icon-wrapper">
                                                <Phone size={12} className="glass-detail-icon" />
                                            </div>
                                            <span>{phone}</span>
                                        </div>
                                        <div className="glass-detail-item">
                                            <div className="glass-detail-icon-wrapper">
                                                <MapPin size={12} className="glass-detail-icon" />
                                            </div>
                                            <span className="glass-truncate">{campus}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* --- BACK OF CARD --- */}
                        <div className="flip-card-face flip-card-back premium-glass-card landscape-layout">
                            {/* Decorative Background Elements */}
                            <div className="glass-blob glass-blob-tr"></div>
                            <div className="glass-blob glass-blob-bl"></div>
                            <div className="glass-noise-overlay"></div>

                            <div className="glass-back-content">
                                <h3 className="glass-back-title">Scan to Verify</h3>
                                <div className="glass-qr-container-large">
                                    <QRCode
                                        value={qrValue}
                                        size={140}
                                        level="H"
                                        fgColor="#0f172a"
                                        bgColor="#ffffff"
                                        className="glass-qr-code-large"
                                    />
                                </div>
                                <div className="glass-back-footer">
                                    <div className="glass-barcode-aesthetic back-barcode">
                                        {Array.from({ length: 30 }).map((_, i) => (
                                            <div key={i} className="glass-bar" style={{ height: `${Math.random() * 60 + 40}%`, opacity: Math.random() * 0.4 + 0.3 }} />
                                        ))}
                                    </div>
                                    <span className="glass-back-uid">UID: {user?.uid?.toUpperCase() || '—'}</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Action buttons */}
                <div className="id-card-actions">
                    <button className="id-card-action-btn" onClick={handleDownload} disabled={isDownloading}>
                        {isDownloading ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                        <span>{isDownloading ? 'Saving…' : 'Download'}</span>
                    </button>
                    <button className="id-card-action-btn id-card-action-share" onClick={handleShare} disabled={isSharing}>
                        {isSharing ? <RefreshCw size={16} className="animate-spin" /> : <Share2 size={16} />}
                        <span>{isSharing ? 'Sharing…' : 'Share'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StudentIDCard;
