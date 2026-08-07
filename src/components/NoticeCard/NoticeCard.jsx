import { Tag, Calendar, Clock, Paperclip, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import './NoticeCard.css';

const NoticeCard = ({ notice, isRead }) => {
    const navigate = useNavigate();

    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        let date;
        if (timestamp.toDate) {
            date = timestamp.toDate();
        } else if (timestamp.seconds !== undefined) {
            date = new Date(timestamp.seconds * 1000);
        } else {
            date = new Date(timestamp);
        }
        return format(date, 'MMM dd, yyyy');
    };

    const isUrgent = notice.priority === 'High';
    const isMedium = notice.priority === 'Medium';

    return (
        <div 
            className={`notice-card ${!isRead ? 'unread' : ''}`}
            onClick={() => navigate(`/notices/${notice.id}`)}
        >
            <div className="notice-card-header">
                <div className="notice-title-wrap">
                    <span className="notice-category">
                        <Tag size={12} />
                        {notice.category}
                    </span>
                    <h3 className="notice-title">{notice.title}</h3>
                </div>
                
                <div className="notice-badges">
                    {!isRead && <div className="unread-dot" title="Unread Notice" />}
                    <span className={`priority-badge ${isUrgent ? 'priority-high' : isMedium ? 'priority-medium' : 'priority-normal'}`}>
                        {notice.priority || 'Normal'}
                    </span>
                </div>
            </div>

            <div className="notice-card-footer">
                <div className="notice-meta">
                    <div className="meta-item">
                        <Calendar size={14} />
                        <span>{formatDate(notice.publishedAt || notice.createdAt)}</span>
                    </div>
                    {notice.expiryDate && (
                        <div className="meta-item" style={{ color: '#ef4444' }}>
                            <Clock size={14} />
                            <span>Exp: {formatDate(notice.expiryDate)}</span>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {notice.attachments && notice.attachments.length > 0 && (
                        <div className="attachment-indicator">
                            <Paperclip size={14} />
                            <span>{notice.attachments.length}</span>
                        </div>
                    )}
                    <ChevronRight size={18} style={{ color: 'var(--color-text-muted)' }} />
                </div>
            </div>
        </div>
    );
};

export default NoticeCard;
