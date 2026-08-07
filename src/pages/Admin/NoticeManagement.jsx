import { Plus, Eye, BarChart2, Edit2, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { noticeService } from '../../services/noticeService';
import { format } from 'date-fns';
import './NoticeManagement.css';

const CATEGORIES = ['All', 'Academic', 'Exams', 'Events', 'Placements', 'Circulars', 'Assignments'];

const NoticeManagement = () => {
    const navigate = useNavigate();
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('All');

    useEffect(() => {
        fetchNotices();
    }, []);

    const fetchNotices = async () => {
        setLoading(true);
        try {
            const fetched = await noticeService.getAllNotices();
            setNotices(fetched);
        } catch (error) {
            console.error("Failed to fetch notices:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, attachments) => {
        if (window.confirm('Are you sure you want to delete this notice?')) {
            try {
                await noticeService.deleteNotice(id, attachments);
                setNotices(notices.filter(n => n.id !== id));
            } catch (error) {
                console.error("Failed to delete notice:", error);
                alert("Failed to delete notice");
            }
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'Draft';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return format(date, 'MMM dd, yyyy');
    };

    return (
        <div className="max-width-wrapper notice-management-page animate-fade-in">
            <div className="nm-header-wrapper">
                <div className="page-header-v2" style={{ marginBottom: 0 }}>
                    <div className="header-accent-bar"></div>
                    <div className="header-content-v2">
                        <h1 className="page-title-v2">Notice Management</h1>
                        <p className="page-subtitle-v2">Create and manage campus announcements</p>
                    </div>
                </div>
                <button className="nm-create-btn" onClick={() => navigate('/admin/notices/create')}>
                    <Plus size={20} /> <span>Create New Notice</span>
                </button>
            </div>

            <div className="nm-header-actions">
                <div className="nm-filters">
                    {CATEGORIES.map(category => (
                        <button
                            key={category}
                            className={`nm-filter-chip ${activeCategory === category ? 'active' : ''}`}
                            onClick={() => setActiveCategory(category)}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            </div>

            <div className="nm-table-container">
                {loading ? (
                    <div style={{ padding: '1.5rem 2rem' }}>
                        <div className="skeleton" style={{ width: '100%', height: '48px', marginBottom: '1rem', borderRadius: '8px' }}></div>
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="skeleton" style={{ width: '100%', height: '70px', marginBottom: '0.5rem', borderRadius: '8px' }}></div>
                        ))}
                    </div>
                ) : notices.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="nm-table">
                            <thead>
                                <tr>
                                    <th>Notice</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th>Audience</th>
                                    <th>Stats</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {notices.filter(notice => activeCategory === 'All' || notice.category === activeCategory).map(notice => (
                                    <tr key={notice.id}>
                                        <td>
                                            <div className="nm-title-cell">
                                                <span className="nm-title">{notice.title}</span>
                                                <span className="nm-category">{notice.category} • {notice.priority || 'Normal'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`nm-status-badge ${notice.status === 'published' ? 'nm-status-published' : 'nm-status-draft'}`}>
                                                {notice.status}
                                            </span>
                                        </td>
                                        <td>
                                            {formatDate(notice.publishedAt || notice.createdAt)}
                                        </td>
                                        <td>
                                            {notice.targetAudience?.targetAll ? 'All Students' : 'Targeted'}
                                        </td>
                                        <td>
                                            <div className="nm-stats-cell">
                                                <div className="nm-stats-item" title="Total Views">
                                                    <Eye size={14} /> <span>{notice.viewCount || 0}</span>
                                                </div>
                                                <div className="nm-stats-item" title="Read Count">
                                                    <BarChart2 size={14} /> <span>{notice.readCount || 0}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="nm-actions-cell">
                                                <button className="nm-icon-btn" title="View Details" onClick={() => navigate(`/notices/${notice.id}`)}>
                                                    <Eye size={18} />
                                                </button>
                                                <button className="nm-icon-btn" title="Edit Notice" onClick={() => navigate(`/admin/notices/edit/${notice.id}`)}>
                                                    <Edit2 size={18} />
                                                </button>
                                                <button className="nm-icon-btn delete" title="Delete Notice" onClick={() => handleDelete(notice.id, notice.attachments)}>
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        No notices found. Click "Create New Notice" to add one.
                    </div>
                )}
            </div>
        </div>
    );
};

export default NoticeManagement;
