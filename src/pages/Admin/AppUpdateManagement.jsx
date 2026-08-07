import { RefreshCw, Download, FileCode, Hash, LinkIcon, MessageSquare, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { db, rtdb } from '../../config/firebase';
import { ref, get, set } from 'firebase/database';
import { 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    orderBy, 
    limit, 
    serverTimestamp 
} from 'firebase/firestore';


import { useAuth } from '../../context/AuthContext';
import packageJson from '../../../package.json';
import './AppUpdateManagement.css';

const AppUpdateManagement = () => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [updateHistory, setUpdateHistory] = useState([]);
    
    const [updateInfo, setUpdateInfo] = useState({
        latest_version: 1,
        app_version: '',
        apk_url: '',
        force_update: false,
        update_message: ''
    });

    useEffect(() => {
        const init = async () => {
            await fetchCurrentUpdateInfo();
            await fetchHistory();
        };
        init();
    }, []);

    const fetchCurrentUpdateInfo = async () => {
        try {
            const rtdbRef = ref(rtdb, 'app_update');
            const snapshot = await get(rtdbRef);
            if (snapshot.exists()) {
                setUpdateInfo(snapshot.val());
            }
        } catch (error) {
            console.error("Error fetching update info:", error);
            setStatus({ type: 'error', message: 'Failed to load update info' });
        } finally {
            setIsLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const q = query(collection(db, 'update_history'), orderBy('timestamp', 'desc'), limit(10));
            const snapshot = await getDocs(q);
            const history = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setUpdateHistory(history);
        } catch (error) {
            console.error("Error fetching history:", error);
        }
    };

    const handleUrlChange = (e) => {
        let url = e.target.value;
        
        // Auto-convert Google Drive share links to direct download links
        const driveRegex = /https:\/\/drive\.google\.com\/file\/d\/([^\/]+)/;
        const driveMatch = url.match(driveRegex);
        
        if (driveMatch && driveMatch[1]) {
            url = `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
        }

        // Auto-convert GitHub blob links to raw links for direct download
        if (url.includes('github.com') && url.includes('/blob/')) {
            url = url.replace('/blob/', '/raw/');
        }
        
        setUpdateInfo({...updateInfo, apk_url: url});
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setStatus({ type: '', message: '' });

        try {
            const rtdbRef = ref(rtdb, 'app_update');
            const newConfig = {
                ...updateInfo,
                latest_version: parseInt(updateInfo.latest_version)
            };
            
            // 1. Update RTDB (Live Update)
            await set(rtdbRef, newConfig);
            
            // 2. Log to Firestore History
            await addDoc(collection(db, 'update_history'), {
                ...newConfig,
                timestamp: serverTimestamp(),
                publishedBy: user?.email || 'Admin'
            });
            
            setStatus({ type: 'success', message: 'Update configuration published successfully!' });
            await fetchHistory(); // Refresh history list
        } catch (error) {
            console.error("Error saving update info:", error);
            setStatus({ type: 'error', message: 'Failed to publish update' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="admin-loading">
                <RefreshCw className="animate-spin" />
                <span>Loading configuration...</span>
            </div>
        );
    }

    return (
        <div className="update-mgmt-container">
            <header className="update-mgmt-header">
                <div className="header-icon-box">
                    <Download className="header-icon" />
                </div>
                <div className="header-text">
                    <h1>App Update Management</h1>
                    <p>Control the native update system for all users</p>
                </div>
            </header>

            <div className="update-mgmt-grid">
                {/* Configuration Form */}
                <motion.div 
                    className="mgmt-card form-card"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <div className="card-header">
                        <FileCode className="card-icon" />
                        <h2>Update Configuration</h2>
                    </div>

                    <form onSubmit={handleSave} className="update-form">
                        <div className="input-group">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="input-group" style={{ marginBottom: 0 }}>
                                    <label>Version Code (Internal)</label>
                                    <div className="input-wrapper">
                                        <Hash className="input-icon" />
                                        <input 
                                            type="number" 
                                            value={updateInfo.latest_version}
                                            onChange={(e) => setUpdateInfo({...updateInfo, latest_version: parseInt(e.target.value) || 0})}
                                            placeholder="e.g. 19"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="input-group" style={{ marginBottom: 0 }}>
                                    <label>App Version (Public)</label>
                                    <div className="input-wrapper">
                                        <Hash className="input-icon" />
                                        <input 
                                            type="text" 
                                            value={updateInfo.app_version || ''}
                                            onChange={(e) => setUpdateInfo({...updateInfo, app_version: e.target.value})}
                                            placeholder="e.g. 3.4.0"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                                <span className="input-hint">Must be higher than the current build to trigger update</span>
                                <button 
                                    type="button" 
                                    onClick={() => setUpdateInfo(prev => ({...prev, app_version: packageJson.version, latest_version: prev.latest_version + 1}))}
                                    style={{ padding: '0.25rem 0.75rem', background: 'var(--primary-color, #4f46e5)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}
                                >
                                    Auto Sync from Source (v{packageJson.version})
                                </button>
                            </div>
                        </div>

                        <div className="input-group">
                            <label>APK Direct Link (Drive/GitHub auto-convert)</label>
                            <div className="input-wrapper">
                                <LinkIcon className="input-icon" />
                                <input 
                                    type="url" 
                                    value={updateInfo.apk_url}
                                    onChange={handleUrlChange}
                                    placeholder="Paste Google Drive or GitHub link here..."
                                    required
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label>Update Message</label>
                            <div className="input-wrapper textarea-wrapper">
                                <MessageSquare className="input-icon" />
                                <textarea 
                                    value={updateInfo.update_message}
                                    onChange={(e) => setUpdateInfo({...updateInfo, update_message: e.target.value})}
                                    placeholder="Describe what's new in this version..."
                                    rows="4"
                                    required
                                />
                            </div>
                        </div>

                        <div className="toggle-group">
                            <div className="toggle-info">
                                <ShieldAlert className="toggle-icon" />
                                <div className="toggle-text">
                                    <h3>Force Update</h3>
                                    <p>Prevents users from using the app without updating</p>
                                </div>
                            </div>
                            <label className="switch">
                                <input 
                                    type="checkbox" 
                                    checked={updateInfo.force_update}
                                    onChange={(e) => setUpdateInfo({...updateInfo, force_update: e.target.checked})}
                                />
                                <span className="slider round"></span>
                            </label>
                        </div>

                        <AnimatePresence>
                            {status.message && (
                                <motion.div 
                                    className={`status-message ${status.type}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                >
                                    {status.type === 'success' ? <CheckCircle2 /> : <AlertTriangle />}
                                    {status.message}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button 
                            type="submit" 
                            className={`save-btn ${isSaving ? 'loading' : ''}`}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <RefreshCw className="animate-spin" />
                            ) : (
                                <>
                                    Publish Update <ArrowRight />
                                </>
                            )}
                        </button>
                    </form>
                </motion.div>

                {/* Preview Card */}
                <motion.div 
                    className="mgmt-card preview-card"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <div className="card-header">
                        <Smartphone className="card-icon" />
                        <h2>Mobile Preview</h2>
                    </div>
                    
                    <div className="preview-phone-mockup">
                        <div className="phone-screen">
                            <div className="mock-app-bg">
                                <div className="mock-nav"></div>
                                <div className="mock-content"></div>
                            </div>
                            
                            {/* The Update Popup Preview */}
                            <motion.div 
                                className="preview-overlay"
                                key={JSON.stringify(updateInfo)}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <motion.div 
                                    className="preview-bottom-sheet"
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    transition={{ type: "spring", damping: 25, stiffness: 200, delay: 0.1 }}
                                >
                                    <div className="sheet-handle"></div>
                                    <div className="sheet-icon-box">
                                        <Download className="animate-bounce-soft" />
                                    </div>
                                    <h3 className="sheet-title">Update Available</h3>
                                    <p className="sheet-version">v{updateInfo.app_version || '3.4.0'} available</p>
                                    <p className="sheet-message">{updateInfo.update_message || "New features added, performance improved"}</p>
                                    
                                    <div className="sheet-buttons">
                                        <div className="sheet-btn-primary animate-pulse-soft">Update Now</div>
                                        {!updateInfo.force_update && (
                                            <div className="sheet-btn-secondary">Later</div>
                                        )}
                                    </div>
                                </motion.div>
                            </motion.div>
                        </div>
                    </div>
                    <p className="preview-hint">This is how the popup will look on Android devices</p>
                </motion.div>
            </div>

            {/* Update History Section */}
            <motion.div 
                className="mgmt-card history-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <div className="card-header">
                    <RefreshCw className="card-icon" />
                    <h2>Release History</h2>
                </div>

                <div className="history-table-wrapper">
                    <table className="history-table">
                        <thead>
                            <tr>
                                <th>Version</th>
                                <th>Release Date</th>
                                <th>Message</th>
                                <th>Force</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {updateHistory.length > 0 ? (
                                updateHistory.map((item) => (
                                    <tr key={item.id}>
                                        <td>
                                            <span className="version-badge">v{item.latest_version}</span>
                                        </td>
                                        <td>
                                            <div className="date-info">
                                                {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleDateString() : 'Just now'}
                                                <small>{item.timestamp?.toDate ? item.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</small>
                                            </div>
                                        </td>
                                        <td className="msg-cell">{item.update_message}</td>
                                        <td>
                                            <span className={`force-badge ${item.force_update ? 'yes' : 'no'}`}>
                                                {item.force_update ? 'YES' : 'NO'}
                                            </span>
                                        </td>
                                        <td>
                                            <button 
                                                className="restore-btn"
                                                onClick={() => {
                                                    setUpdateInfo({
                                                        latest_version: item.latest_version,
                                                        apk_url: item.apk_url,
                                                        force_update: item.force_update,
                                                        update_message: item.update_message
                                                    });
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                            >
                                                Reuse
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="empty-history">No release history found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
};

export default AppUpdateManagement;
