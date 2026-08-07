import { MessageSquare, CheckCircle2, Search, User, Star, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

const AdminFeedback = () => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const q = query(collection(db, 'feedbacks'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fbData = [];
            snapshot.forEach((doc) => {
                fbData.push({ id: doc.id, ...doc.data() });
            });
            setFeedbacks(fbData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching feedbacks:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const markAsRead = async (id, currentStatus) => {
        try {
            await updateDoc(doc(db, 'feedbacks', id), {
                read: !currentStatus
            });
        } catch (error) {
            console.error("Error updating feedback status:", error);
        }
    };

    const filteredFeedbacks = feedbacks.filter(fb => 
        fb.studentId?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        fb.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fb.feedback?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="admin-container animate-fade-in" style={{ fontFamily: 'Inter, sans-serif' }}>
            <div className="page-header-v2">
                <div className="header-accent-bar"></div>
                <div className="header-content-v2">
                    <h1 className="page-title-v2">App Feedbacks</h1>
                    <p className="page-subtitle-v2">View and manage feedback submitted by students.</p>
                </div>
            </div>

            {/* Dashboard Stats */}
            <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                        <MessageSquare size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>Total Feedbacks</h3>
                        <p>{feedbacks.length}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                        <CheckCircle2 size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>Unread Feedbacks</h3>
                        <p>{feedbacks.filter(f => !f.read).length}</p>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-surface)', padding: '0.875rem 1.25rem', borderRadius: '1rem', border: '1px solid var(--color-border)', marginBottom: '2rem', gap: '0.75rem', boxShadow: 'var(--shadow-sm)' }}>
                <Search size={20} style={{ color: 'var(--color-text-muted)' }} />
                <input 
                    type="text" 
                    placeholder="Search feedbacks by ID, name, or text..." 
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--color-text-main)', fontSize: '1rem' }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Feedbacks List */}
            <div className="section-card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading feedbacks...</div>
                ) : filteredFeedbacks.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No feedbacks found.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {filteredFeedbacks.map((fb, index) => (
                            <div key={fb.id} style={{ 
                                padding: '1.5rem 2rem', 
                                borderBottom: index === filteredFeedbacks.length - 1 ? 'none' : '1px solid var(--color-border)', 
                                background: fb.read ? 'transparent' : 'rgba(59, 130, 246, 0.05)',
                                transition: 'background 0.2s ease'
                            }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                                            <User size={24} />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, fontWeight: 600, color: 'var(--color-text-main)', fontSize: '1.1rem' }}>{fb.studentName || 'Unknown Student'}</h3>
                                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{fb.studentId} • {fb.studentEmail}</p>
                                            {fb.rating && (
                                                <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.5rem', gap: '4px' }}>
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star 
                                                            key={i} 
                                                            size={14} 
                                                            style={{ 
                                                                color: i < fb.rating ? '#fbbf24' : 'var(--color-border)', 
                                                                fill: i < fb.rating ? '#fbbf24' : 'var(--color-border)' 
                                                            }} 
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                            <Calendar size={14} />
                                            {fb.createdAt ? new Date(fb.createdAt.toDate ? fb.createdAt.toDate() : fb.createdAt).toLocaleString() : 'Just now'}
                                        </div>
                                        <button 
                                            onClick={() => markAsRead(fb.id, fb.read)}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                borderRadius: '0.5rem',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                border: 'none',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                background: fb.read ? 'var(--color-surface-hover)' : 'rgba(59, 130, 246, 0.1)',
                                                color: fb.read ? 'var(--color-text-muted)' : '#3b82f6',
                                            }}
                                            onMouseOver={(e) => {
                                                if (fb.read) {
                                                    e.currentTarget.style.background = 'var(--color-border)';
                                                    e.currentTarget.style.color = 'var(--color-text-main)';
                                                } else {
                                                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                                                }
                                            }}
                                            onMouseOut={(e) => {
                                                if (fb.read) {
                                                    e.currentTarget.style.background = 'var(--color-surface-hover)';
                                                    e.currentTarget.style.color = 'var(--color-text-muted)';
                                                } else {
                                                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                                                }
                                            }}
                                        >
                                            {fb.read ? 'Mark Unread' : 'Mark Read'}
                                        </button>
                                    </div>
                                </div>
                                <div style={{ paddingLeft: '4rem' }}>
                                    <p style={{ margin: 0, color: 'var(--color-text-main)', whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.95rem' }}>{fb.feedback}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminFeedback;
