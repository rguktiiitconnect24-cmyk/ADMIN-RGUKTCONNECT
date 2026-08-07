import { X, GraduationCap, ChevronRight, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { pdfService } from '../../services/pdfService';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share as CapacitorShare } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import './CgpaModal.css';

const LOGO_DATA_URI = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHJlY3Qgd2lkdGg9IjUxMiIgaGVpZ2h0PSI1MTIiIHJ4PSIxMjgiIGZpbGw9InVybCgjcGFpbnQwX2xpbmVhcikiLz4KICA8cGF0aCBkPSJNMjU2IDEyMEw2NCAyMTBMMjU2IDMwMEw0NDggMjEwTDI1NiAxMjBaIiBmaWxsPSJ3aGl0ZSIvPgogIDxwYXRoIGQ9Ik0xMjggMjQwVjMyMEMxMjggMzIwIDE4MCAzNzAgMjU2IDM3MEMzMzIgMzcwIDM4NCAzMjAgMzg0IDMyMFYyNDBMMjU2IDMwMEwxMjggMjQwWiIgZmlsbD0id2hpdGUiLz4KICA8cGF0aCBkPSJNNDE2IDIxMFYzNDAiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMjAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogIDxjaXJjbGUgY3g9IjQxNiIgY3k9IjM1MCIgcj0iMTUiIGZpbGw9IndoaGl0ZSIvPgogIDxkZWZzPgog   PGxpbmVhckdyYWRpZW50IGlkPSJwYWludDBfbGluZWFyIiB4MT0iMCIgeTE9IjAiIHgyPSI1MTIiIHkyPSI1MTIiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgICAgPHN0b3Agc3RvcC1jb2xvcj0iIzRmNDZlNSIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMzNzMwYTMiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgPC9kZWZzPgo8L3N2Zz4=`;

const svgToPng = (svgDataUri) => {
    return new Promise((resolve) => {
        const img = new Image();
        const timeout = setTimeout(() => resolve(null), 3000);
        img.onload = () => {
            clearTimeout(timeout);
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            } catch (e) {
                resolve(null);
            }
        };
        img.onerror = () => {
            clearTimeout(timeout);
            resolve(null);
        };
        img.src = svgDataUri;
    });
};

const urlToBase64 = (url) => {
    return new Promise((resolve) => {
        if (!url) return resolve(null);
        if (url.startsWith('data:')) return resolve(url);
        
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        const timeout = setTimeout(() => resolve(null), 3000);
        
        img.onload = () => {
            clearTimeout(timeout);
            try {
                const canvas = document.createElement('canvas');
                const maxDim = 400;
                const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            } catch (e) {
                resolve(null);
            }
        };
        img.onerror = () => {
            clearTimeout(timeout);
            resolve(null);
        };
        img.src = url;
    });
};

const CgpaModal = ({ isOpen, onClose, cgpaValue = '0.00', cgpaRecord = null, studentId = '', user = null }) => {
    const [isRendered, setIsRendered] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [animatedCgpa, setAnimatedCgpa] = useState(0);

    const cgpaNum = parseFloat(cgpaValue) || 0;
    const maxCgpa = 10.0;
    const progressPercentage = (cgpaNum / maxCgpa) * 100;

    let performanceBadge = { label: 'Average', color: 'text-orange-500', bg: 'bg-orange-500/10' };
    if (cgpaNum >= 8.5) performanceBadge = { label: 'Excellent', color: 'text-green-500', bg: 'bg-green-500/10' };
    else if (cgpaNum >= 7.0) performanceBadge = { label: 'Good', color: 'text-blue-500', bg: 'bg-blue-500/10' };

    const totalCredits = cgpaRecord?.subjects?.reduce((acc, curr) => acc + (parseInt(curr.credits) || 0), 0) || 0;
    const sgpaValue = cgpaRecord?.sgpa || '0.00';

    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsRendered(true);
            setTimeout(() => {
                setIsVisible(true);
                document.body.style.overflow = 'hidden';
                
                // Animate CGPA Number
                let start = 0;
                const duration = 1500; // ms
                const increment = cgpaNum / (duration / 16);
                const timer = setInterval(() => {
                    start += increment;
                    if (start >= cgpaNum) {
                        setAnimatedCgpa(cgpaNum);
                        clearInterval(timer);
                    } else {
                        setAnimatedCgpa(start);
                    }
                }, 16);
                
                return () => clearInterval(timer);
            }, 10);
            
            const handleKeyDown = (e) => {
                if (e.key === 'Escape') {
                    handleClose();
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            
            return () => {
                window.removeEventListener('keydown', handleKeyDown);
            };
        } else {
            setIsVisible(false);
            document.body.style.overflow = '';
            setTimeout(() => setIsRendered(false), 300); // match transition duration
        }
    }, [isOpen, cgpaNum]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => onClose(), 300);
    };

    const handleDownloadReport = async () => {
        if (!cgpaRecord) return;
        setIsDownloading(true);
        try {
            const pngLogo = await svgToPng(LOGO_DATA_URI);
            const userMock = user || { studentId: studentId }; 
            
            // Get base64 avatar
            let base64Avatar = null;
            if (user?.avatar) {
                base64Avatar = await urlToBase64(user.avatar);
            } else if (userMock.fullName) {
                base64Avatar = await urlToBase64(`https://ui-avatars.com/api/?name=${encodeURIComponent(userMock.fullName)}&background=random`);
            }
            
            const doc = await pdfService.generateAcademicReportPdf(cgpaRecord, userMock, pngLogo, base64Avatar);
            
            const filename = `${studentId || 'Student'}_Academic_Report.pdf`;

            if (Capacitor.isNativePlatform()) {
                const pdfBase64 = doc.output('datauristring').split(',')[1];
                const fileResult = await Filesystem.writeFile({
                    path: filename,
                    data: pdfBase64,
                    directory: Directory.Cache
                });
                await CapacitorShare.share({
                    title: 'Academic Performance Report',
                    text: `Sharing Academic Report for ${studentId || 'Student'}`,
                    url: fileResult.uri,
                });
            } else {
                doc.save(filename);
            }
        } catch (e) {
            console.error('Failed to generate PDF', e);
        } finally {
            setIsDownloading(false);
        }
    };

    if (!isRendered) return null;

    return (
        <div className={`cgpa-modal-overlay ${isVisible ? 'visible' : ''}`} onClick={handleClose}>
            <div className={`cgpa-modal-content ${isVisible ? 'visible' : ''}`} onClick={e => e.stopPropagation()}>
                
                <button className="cgpa-close-btn" onClick={handleClose}>
                    <X size={20} />
                </button>

                <div className="cgpa-modal-header">
                    <div className="cgpa-icon-wrapper floating-icon">
                        <GraduationCap size={32} className="text-purple-500" />
                    </div>
                    <h2>Current CGPA</h2>
                    <p>Academic Performance</p>
                </div>

                <div className="cgpa-progress-section">
                    <div className="cgpa-ring-container">
                        <svg className="cgpa-progress-ring" width="160" height="160">
                            <circle
                                className="cgpa-ring-bg"
                                cx="80" cy="80" r="70"
                            />
                            <circle
                                className="cgpa-ring-fill"
                                cx="80" cy="80" r="70"
                                style={{ strokeDashoffset: isVisible ? `calc(440 - (440 * ${progressPercentage}) / 100)` : 440 }}
                            />
                        </svg>
                        <div className="cgpa-ring-content">
                            <span className="cgpa-number glow-text">{animatedCgpa.toFixed(2)}</span>
                            <span className="cgpa-max">/ 10.0</span>
                        </div>
                    </div>
                    
                    <div className={`cgpa-badge ${performanceBadge.bg} ${performanceBadge.color}`}>
                        {performanceBadge.label}
                    </div>
                </div>



                <div className="w-full">
                    {cgpaRecord?.subjects?.length > 0 ? (
                        (() => {
                            let currentGroup = 'PUC-1 (Sem-1)';
                            const groupedSubjects = { 
                                'PUC-1 (Sem-1)': [], 
                                'PUC-1 (Sem-2)': [], 
                                'PUC-2 (Sem-1)': [], 
                                'PUC-2 (Sem-2)': [] 
                            };
                            
                            cgpaRecord.subjects.forEach(s => {
                                const name = (s.subject || '').toUpperCase().trim();
                                const match = name.match(/-(I|II|III|IV)$/);
                                if (match) {
                                    const numeral = match[1];
                                    if (numeral === 'I') currentGroup = 'PUC-1 (Sem-1)';
                                    else if (numeral === 'II') currentGroup = 'PUC-1 (Sem-2)';
                                    else if (numeral === 'III') currentGroup = 'PUC-2 (Sem-1)';
                                    else if (numeral === 'IV') currentGroup = 'PUC-2 (Sem-2)';
                                }
                                groupedSubjects[currentGroup].push(s);
                            });

                            return ['PUC-1 (Sem-1)', 'PUC-1 (Sem-2)', 'PUC-2 (Sem-1)', 'PUC-2 (Sem-2)'].map(groupName => (
                                groupedSubjects[groupName].length > 0 && (
                                    <div key={groupName} className="cgpa-semesters-section mb-6">
                                        <h3 className="text-lg font-bold mb-4">{groupName} Subjects</h3>
                                        <div className="cgpa-sem-list">
                                            {groupedSubjects[groupName].map((s, i) => (
                                                <div key={i} className="cgpa-sem-item flex-col items-start gap-1 p-3">
                                                    <div className="flex justify-between w-full">
                                                        <span className="sem-name font-semibold">{s.subject}</span>
                                                        <span className="sem-gpa">{s.grade}</span>
                                                    </div>
                                                    <div className="flex justify-between w-full text-xs text-gray-500 mt-1">
                                                        <span>Credits: {s.credits}</span>
                                                        <span>Internal: {s.internal} | {s.status}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            ));
                        })()
                    ) : (
                        <div className="text-center text-sm text-gray-500 py-4">
                            No detailed subject records found for student ID: {studentId || 'Unknown'}
                        </div>
                    )}
                </div>

                <div className="cgpa-actions">
                    <button className="cgpa-btn-primary ripple" onClick={handleClose}>
                        Done <ChevronRight size={16} />
                    </button>
                    <button 
                        className="cgpa-btn-secondary ripple" 
                        onClick={handleDownloadReport}
                        disabled={isDownloading || !cgpaRecord?.subjects?.length}
                    >
                        <Download size={18} />
                        {isDownloading ? 'Generating...' : 'Download Academic Report'}
                    </button>
                </div>
                
                <div className="cgpa-footer">
                    Last updated: {new Date().toLocaleDateString()}
                </div>
            </div>
        </div>
    );
};

export default CgpaModal;
