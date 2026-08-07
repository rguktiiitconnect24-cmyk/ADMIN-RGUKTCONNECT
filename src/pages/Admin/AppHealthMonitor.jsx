import { useState, useEffect } from 'react';
import { Activity, Search, Filter, AlertCircle, CheckCircle2, Clock, Smartphone, Wifi, Battery, Zap, X, AlertTriangle, Database, SmartphoneNfc, ServerCrash, CalendarX2, RefreshCcw } from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import CustomSelect from '../../components/Common/CustomSelect';
import LoadingTransition from '../../components/Common/LoadingTransition';
import './Admin.css';
import './AppHealthMonitor.css';

const CAMPUS_OPTIONS = [
    { value: '', label: 'All Campuses' },
    { value: 'RKV', label: 'RK Valley' },
    { value: 'Nuzvid', label: 'Nuzvid' },
    { value: 'Ongole', label: 'Ongole' },
    { value: 'Srikakulam', label: 'Srikakulam' }
];

const PROBLEM_OPTIONS = [
    { value: '', label: 'All Problems' },
    { value: 'none', label: 'No Problem (Healthy)' },
    { value: 'inactive', label: 'Inactive / Offline' },
    { value: 'old_version', label: 'Old App Version' },
    { value: 'sync_failed', label: 'Timetable Sync Failed' },
    { value: 'db_error', label: 'Database Connection Error' },
    { value: 'notifications_disabled', label: 'Notifications Disabled' },
    { value: 'auth_error', label: 'Authentication Problem' },
    { value: 'slow_sync', label: 'Slow Network / Sync Delay' },
    { value: 'incomplete_profile', label: 'Incomplete Profile' },
    { value: 'crash', label: 'App Crash Detected' }
];

const STATUS_OPTIONS = [
    { value: '', label: 'All Statuses' },
    { value: 'Healthy', label: 'Healthy (Green)' },
    { value: 'Warning', label: 'Warning (Yellow)' },
    { value: 'Problem', label: 'Problem (Red)' }
];

const LATEST_APP_VERSION = "1.2.0";

const AppHealthMonitor = () => {
    const [healthData, setHealthData] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCampus, setFilterCampus] = useState('');
    const [filterProblem, setFilterProblem] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);

    useEffect(() => {
        const q = query(collection(db, 'app_health'), orderBy('lastSeen', 'desc'), limit(1000));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = [];
            snapshot.forEach((doc) => {
                data.push({ id: doc.id, ...doc.data() });
            });
            setHealthData(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching health data: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const determineHealthStatus = (data) => {
        let problems = [];
        let status = 'Healthy'; // Default

        const now = Date.now();
        const lastSeenTime = data.lastSeen?.toMillis ? data.lastSeen.toMillis() : now;
        const daysInactive = (now - lastSeenTime) / (1000 * 60 * 60 * 24);

        if (daysInactive >= 7) {
            problems.push('Inactive (>7 days)');
            status = 'Problem';
        } else if (daysInactive >= 3) {
            problems.push('Inactive (>3 days)');
            if (status !== 'Problem') status = 'Problem';
        } else if (daysInactive >= 1) {
            problems.push('Inactive (>1 day)');
            if (status !== 'Problem') status = 'Warning';
        }

        if (data.appVersion && data.appVersion < LATEST_APP_VERSION) {
            problems.push('Old App Version');
            if (status !== 'Problem') status = 'Warning';
        }

        if (data.timetableSyncError) {
            problems.push('Timetable Sync Failed');
            status = 'Problem';
        }

        if (data.firebaseConnectionError) {
            problems.push('Database Connection Error');
            status = 'Problem';
        }

        if (!data.fcmToken) {
            problems.push('Notifications Disabled');
            if (status !== 'Problem') status = 'Warning';
        }
        
        if (data.authError) {
            problems.push('Authentication Problem');
            status = 'Problem';
        }

        if (data.syncDelay > 10000) {
            problems.push('Slow Network / Sync Delay');
            if (status !== 'Problem') status = 'Warning';
        }

        if (data.crashDetected) {
            problems.push('App Crash Detected');
            status = 'Problem';
        }

        if (data.incompleteProfile) {
            problems.push('Incomplete Profile');
            if (status !== 'Problem') status = 'Warning';
        }

        return {
            status,
            problems: problems.length > 0 ? problems : ['None']
        };
    };

    const formatTimeAgo = (timestamp) => {
        if (!timestamp) return 'Never';
        const millis = timestamp.toMillis ? timestamp.toMillis() : Date.now();
        const seconds = Math.floor((Date.now() - millis) / 1000);
        
        if (seconds < 60) return 'Just Now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days === 1) return 'Yesterday';
        return `${days} days ago`;
    };

    const filteredData = healthData.map(d => {
        const computed = determineHealthStatus(d);
        return { ...d, computedStatus: computed.status, computedProblems: computed.problems };
    }).filter(d => {
        const matchesSearch = d.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              d.rollNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              d.id?.toLowerCase().includes(searchTerm.toLowerCase());
                              
        const matchesCampus = filterCampus ? d.campus === filterCampus : true;
        const matchesStatus = filterStatus ? d.computedStatus === filterStatus : true;
        
        let matchesProblem = true;
        if (filterProblem === 'none') {
            matchesProblem = d.computedProblems.includes('None');
        } else if (filterProblem) {
            const probLower = filterProblem.toLowerCase().replace('_', ' ');
            matchesProblem = d.computedProblems.some(p => p.toLowerCase().includes(probLower) || p.toLowerCase().includes(filterProblem.split('_')[0]));
        }

        return matchesSearch && matchesCampus && matchesStatus && matchesProblem;
    });

    const stats = {
        total: healthData.length,
        healthy: healthData.filter(d => determineHealthStatus(d).status === 'Healthy').length,
        warnings: healthData.filter(d => determineHealthStatus(d).status === 'Warning').length,
        problems: healthData.filter(d => determineHealthStatus(d).status === 'Problem').length,
        crashes: healthData.filter(d => d.crashDetected).length,
        syncErrors: healthData.filter(d => d.timetableSyncError).length,
    };

    if (loading) return <LoadingTransition />;

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <div className="header-icon-wrapper">
                    <Activity size={24} className="header-icon" />
                </div>
                <div>
                    <h1 className="admin-title">App Health Monitor</h1>
                    <p className="admin-subtitle">Real-time tracking of student app diagnostics and issues.</p>
                </div>
            </div>

            <div className="health-stats-grid">
                <div className="health-stat-card healthy">
                    <div className="stat-icon"><CheckCircle2 size={20} /></div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.healthy}</span>
                        <span className="stat-label">Healthy Devices</span>
                    </div>
                </div>
                <div className="health-stat-card warning">
                    <div className="stat-icon"><AlertTriangle size={20} /></div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.warnings}</span>
                        <span className="stat-label">Warnings</span>
                    </div>
                </div>
                <div className="health-stat-card problem">
                    <div className="stat-icon"><AlertCircle size={20} /></div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.problems}</span>
                        <span className="stat-label">Problems Detected</span>
                    </div>
                </div>
                <div className="health-stat-card critical">
                    <div className="stat-icon"><ServerCrash size={20} /></div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.crashes}</span>
                        <span className="stat-label">Crash Reports</span>
                    </div>
                </div>
                <div className="health-stat-card info">
                    <div className="stat-icon"><RefreshCcw size={20} /></div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.syncErrors}</span>
                        <span className="stat-label">Sync Errors</span>
                    </div>
                </div>
            </div>

            <div className="admin-filters-section">
                <div className="search-bar">
                    <Search size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by Name, Roll No or UID..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filters-row">
                    <CustomSelect
                        options={CAMPUS_OPTIONS}
                        value={filterCampus}
                        onChange={setFilterCampus}
                        placeholder="Campus"
                    />
                    <CustomSelect
                        options={PROBLEM_OPTIONS}
                        value={filterProblem}
                        onChange={setFilterProblem}
                        placeholder="Problem Type"
                    />
                    <CustomSelect
                        options={STATUS_OPTIONS}
                        value={filterStatus}
                        onChange={setFilterStatus}
                        placeholder="Health Status"
                    />
                </div>
            </div>

            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Status</th>
                            <th>Problem</th>
                            <th>Last Seen</th>
                            <th>App Version</th>
                            <th>Device</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map(item => (
                            <tr key={item.id} onClick={() => setSelectedStudent(item)} className="cursor-pointer hover-bg">
                                <td>
                                    <div className="flex flex-col gap-1">
                                        <div className="font-semibold">{item.name || 'Unknown Student'}</div>
                                        <div className="text-xs text-[var(--color-text-muted)]">{item.rollNo || item.id}</div>
                                    </div>
                                </td>
                                <td>
                                    <div className={`health-badge ${item.computedStatus.toLowerCase()}`}>
                                        <div className="status-dot"></div>
                                        {item.computedStatus}
                                    </div>
                                </td>
                                <td>
                                    <div className="problem-list">
                                        {item.computedProblems.map((prob, i) => (
                                            <span key={i} className={`problem-tag ${prob === 'None' ? 'none' : 'issue'}`}>
                                                {prob}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td>
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} className="text-muted" />
                                        <span className="text-sm">{formatTimeAgo(item.lastSeen)}</span>
                                    </div>
                                </td>
                                <td>
                                    <div className={`version-badge ${item.appVersion < LATEST_APP_VERSION ? 'outdated' : 'current'}`}>
                                        v{item.appVersion || 'Unknown'}
                                    </div>
                                </td>
                                <td>
                                    <div className="flex items-center gap-2 text-sm text-muted">
                                        <Smartphone size={14} />
                                        {item.device || 'Unknown'}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredData.length === 0 && (
                            <tr>
                                <td colSpan="6" className="text-center py-8 text-muted">
                                    No health records found matching your filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {selectedStudent && (
                <div className="health-modal-overlay" onClick={() => setSelectedStudent(null)}>
                    <div className="health-modal-content" onClick={e => e.stopPropagation()}>
                        <button className="health-modal-close" onClick={() => setSelectedStudent(null)}>
                            <X size={20} />
                        </button>
                        
                        <div className="health-modal-header">
                            <h2>Health Report: {selectedStudent.name || 'Unknown'}</h2>
                            <div className="text-sm text-muted">{selectedStudent.rollNo || selectedStudent.id}</div>
                        </div>

                        <div className="health-details-grid">
                            <div className="detail-card">
                                <h3><Smartphone size={16}/> Device Info</h3>
                                <div className="detail-row"><span>Device:</span> <strong>{selectedStudent.device || 'N/A'}</strong></div>
                                <div className="detail-row"><span>Platform:</span> <strong>{selectedStudent.platform || 'N/A'}</strong></div>
                                <div className="detail-row"><span>OS Version:</span> <strong>{selectedStudent.osVersion || 'N/A'}</strong></div>
                                <div className="detail-row"><span>App Version:</span> <strong>v{selectedStudent.appVersion || 'N/A'}</strong></div>
                            </div>
                            
                            <div className="detail-card">
                                <h3><Zap size={16}/> Hardware Metrics</h3>
                                <div className="detail-row"><span>Battery:</span> <strong>{selectedStudent.batteryLevel ? `${(selectedStudent.batteryLevel * 100).toFixed(0)}%` : 'N/A'}</strong></div>
                                <div className="detail-row"><span>Is Charging:</span> <strong>{selectedStudent.isCharging ? 'Yes' : 'No'}</strong></div>
                                <div className="detail-row"><span>Network:</span> <strong>{selectedStudent.networkType || 'N/A'}</strong></div>
                                <div className="detail-row"><span>Connected:</span> <strong>{selectedStudent.isConnected ? 'Yes' : 'No'}</strong></div>
                            </div>

                            <div className="detail-card full-width">
                                <h3><AlertTriangle size={16}/> Diagnostic Status</h3>
                                <div className="diagnostics-list">
                                    <div className={`diag-item ${selectedStudent.computedProblems.includes('None') ? 'ok' : 'err'}`}>
                                        <span>Overall Status</span>
                                        <strong>{selectedStudent.computedStatus}</strong>
                                    </div>
                                    <div className={`diag-item ${selectedStudent.timetableSyncError ? 'err' : 'ok'}`}>
                                        <span>Timetable Sync</span>
                                        <strong>{selectedStudent.timetableSyncError ? 'Failed' : 'Success'}</strong>
                                    </div>
                                    <div className={`diag-item ${!selectedStudent.fcmToken ? 'err' : 'ok'}`}>
                                        <span>Push Notifications</span>
                                        <strong>{selectedStudent.fcmToken ? 'Enabled' : 'Disabled'}</strong>
                                    </div>
                                    <div className={`diag-item ${selectedStudent.crashDetected ? 'err' : 'ok'}`}>
                                        <span>Crash Status</span>
                                        <strong>{selectedStudent.crashDetected ? 'Crash Reported' : 'Clean'}</strong>
                                    </div>
                                </div>
                            </div>

                            {selectedStudent.crashDetected && selectedStudent.crashLogs && (
                                <div className="detail-card full-width error-log">
                                    <h3><ServerCrash size={16}/> Recent Crash Log</h3>
                                    <pre className="crash-dump">{selectedStudent.crashLogs}</pre>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AppHealthMonitor;
