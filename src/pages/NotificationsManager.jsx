import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../config/firebase'; // Ensure app is exported in your firebase config
import { Send, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import './NotificationsManager.css';

export default function NotificationsManager() {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [targetBranch, setTargetBranch] = useState('all');
    const [status, setStatus] = useState({ loading: false, error: null, success: null });

    const handleSend = async (e) => {
        e.preventDefault();
        setStatus({ loading: true, error: null, success: null });

        try {
            const functions = getFunctions(app);
            const sendManualNotification = httpsCallable(functions, 'sendManualNotification');
            
            const result = await sendManualNotification({
                title,
                body,
                imageUrl,
                targetBranch
            });

            setStatus({ 
                loading: false, 
                error: null, 
                success: result.data.message || 'Notification sent successfully!' 
            });
            setTitle('');
            setBody('');
            setImageUrl('');
        } catch (error) {
            console.error('Error sending notification:', error);
            setStatus({ 
                loading: false, 
                error: error.message || 'Failed to send notification.', 
                success: null 
            });
        }
    };

    return (
        <div className="nm-page">
            <div className="nm-header">
                <h1>
                    <div className="nm-icon-wrapper">
                        <Send size={28} />
                    </div>
                    Push Notifications
                </h1>
                <p>
                    Send manual push notifications to users' devices instantly.
                </p>
            </div>

            <div className="nm-form-card">
                <form onSubmit={handleSend}>
                    <div className="nm-form-group">
                        <label>Target Audience</label>
                        <select
                            value={targetBranch}
                            onChange={(e) => setTargetBranch(e.target.value)}
                            className="nm-select"
                        >
                            <option value="all">All Students</option>
                            <option value="PUC">PUC (Pre-University)</option>
                            <option value="CSE(AI&ML)">CSE (AI & ML)</option>
                            <option value="CSE">CSE</option>
                            <option value="ECE">ECE</option>
                            <option value="EEE">EEE</option>
                            <option value="CE">CE (Civil)</option>
                            <option value="ME">ME (Mechanical)</option>
                            <option value="MME">MME (Metallurgy)</option>
                            <option value="CHE">CHE (Chemical)</option>
                        </select>
                    </div>

                    <div className="nm-form-group">
                        <label>Notification Title</label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Important Announcement"
                            className="nm-input"
                        />
                    </div>

                    <div className="nm-form-group">
                        <label>Notification Message (Body)</label>
                        <textarea
                            required
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="Type your detailed message here..."
                            className="nm-textarea"
                        ></textarea>
                    </div>

                    <div className="nm-form-group">
                        <label>Image URL (Optional)</label>
                        <input
                            type="url"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="e.g., https://example.com/image.png"
                            className="nm-input"
                        />
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', marginTop: '0.4rem' }}>
                            Paste a direct link to an image (JPEG, PNG, WebP) to display it in the notification.
                        </p>
                    </div>

                    {status.error && (
                        <div className="nm-alert nm-alert-error">
                            <AlertCircle size={20} className="nm-alert-icon" />
                            <span>{status.error}</span>
                        </div>
                    )}

                    {status.success && (
                        <div className="nm-alert nm-alert-success">
                            <CheckCircle2 size={20} className="nm-alert-icon" />
                            <span>{status.success}</span>
                        </div>
                    )}

                    <div style={{ marginTop: '2rem' }}>
                        <button
                            type="submit"
                            disabled={status.loading || !title || !body}
                            className="nm-btn-submit"
                        >
                            {status.loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send size={20} />
                                    Send Notification
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
