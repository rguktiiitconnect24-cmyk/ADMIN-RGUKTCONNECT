import { Clock, Calendar, Share2, Download } from 'lucide-react';
import './TimetableDashboardHeader.css';

const TimetableDashboardHeader = ({ user, currentDay, schedule, onShare, onDownload, onShowCalendar }) => {
    const dateString = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const todayClasses = schedule && schedule !== 'NOT_FOUND' ? (schedule[currentDay] || []).filter(c => c && c !== '-' && c !== 'Free').length : 0;

    return (
        <div className="td-outer-card">
            {/* Top Title Section */}
            <div className="td-top-bar">
                <div className="td-title-section">
                    <div className="td-title-text">
                        <h1>Time Table: {user?.currentClass || 'F-08'}</h1>
                        <p>2026 Semester Schedule</p>
                    </div>
                    <div className="td-header-icon" style={{ width: '120px', height: '90px', marginLeft: '15px' }}>
                        <svg viewBox="0 0 400 300" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                          <rect x="90" y="55" width="220" height="190" rx="20" fill="#ffffff" stroke="#1e3a8a" strokeWidth="3.5" />
                          <path d="M90,75 A20,20 0 0,1 110,55 L290,55 A20,20 0 0,1 310,75 L310,95 L90,95 Z" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="3.5" />
                          <circle cx="120" cy="55" r="6" fill="#ffffff" stroke="#1e3a8a" strokeWidth="2.5" />
                          <circle cx="160" cy="55" r="6" fill="#ffffff" stroke="#1e3a8a" strokeWidth="2.5" />
                          <circle cx="200" cy="55" r="6" fill="#ffffff" stroke="#1e3a8a" strokeWidth="2.5" />
                          <rect x="105" y="110" width="190" height="34" rx="10" fill="#dbeafe" stroke="#1e3a8a" strokeWidth="1.5" />
                          <circle cx="125" cy="127" r="10" fill="#3b82f6" />
                          <rect x="235" y="119" width="50" height="16" rx="8" fill="#10b981" />
                          <rect x="105" y="152" width="190" height="34" rx="10" fill="#dbeafe" opacity="0.6" stroke="#1e3a8a" strokeWidth="1.5" />
                          <rect x="105" y="194" width="190" height="34" rx="10" fill="#dbeafe" stroke="#1e3a8a" strokeWidth="1.5" />
                          <circle cx="310" cy="100" r="28" fill="#ffffff" stroke="#1e3a8a" strokeWidth="3.5" />
                          <circle cx="310" cy="100" r="22" fill="#dbeafe" />
                          <path d="M310,88 L310,100 L320,104" fill="none" stroke="#1e3a8a" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Inner Day Card */}
            <div className="td-inner-card">
                <div className="td-card-content">
                    {/* Left content */}
                    <div className="td-info-side td-info-side-minimal">
                        <div className="td-current-day-row">
                            <div className="td-clock-icon-wrapper">
                                <div className="td-clock-bg-shape"></div>
                                <Clock size={32} color="#4f46e5" strokeWidth={2.5} />
                            </div>
                            <div className="td-day-text">
                                <div className="td-current-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>CURRENT DAY</span>
                                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#cbd5e1' }}></span>
                                    <span style={{ color: '#64748b', fontWeight: 600, letterSpacing: '0.02em' }}>{dateString}</span>
                                </div>
                                <h2>{currentDay}</h2>
                                <div className="td-day-line">
                                    <div className="td-day-line-fill"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button className="td-calendar-btn-inner" onClick={onShowCalendar}>
                        <Calendar size={24} color="#4f46e5" />
                    </button>

                </div>
            </div>
            
            {/* Bottom Action Buttons */}
            <div className="td-action-buttons td-action-buttons-bottom">
                <button className="td-btn-share" onClick={onShare}>
                    <Share2 size={18} />
                    <span>Share</span>
                </button>
                <button className="td-btn-download" onClick={onDownload}>
                    <Download size={18} />
                    <span>Download</span>
                </button>
            </div>
        </div>
    );
};

export default TimetableDashboardHeader;
