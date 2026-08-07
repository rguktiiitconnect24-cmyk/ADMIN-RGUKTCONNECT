import { UserX, User, ArrowLeft, ArrowUpRight, AlertTriangle, CheckCircle, BarChart2, ChevronDown, CheckSquare, XCircle, Search, Filter, MessageSquare, AlertCircle, Clock, Trash2, Settings, Send, RefreshCw, ShieldX } from 'lucide-react';
import LoadingTransition from '../../components/Common/LoadingTransition';
import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, arrayUnion, deleteDoc, getDoc } from 'firebase/firestore';
import { db, complaintsDb } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { createPortal } from 'react-dom';
import './ComplaintsManagement.css';
import { deleteProfileImage } from '../../services/imageService';

const ComplaintsManagement = () => {
    const { user } = useAuth();
    const [complaints, setComplaints] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [activeTab, setActiveTab] = useState('new'); // 'new' (pending/active) or 'history' (resolved)
    const [selectedId, setSelectedId] = useState(null); // Track only ID
    const [selectedComplaint, setSelectedComplaint] = useState(null); // Full data via dedicated listener
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [adminReply, setAdminReply] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [showResolveModal, setShowResolveModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [complaintToDelete, setComplaintToDelete] = useState(null);
    const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all'); // 'all', 'academic', 'hostel', 'mess', 'transport', 'wifi/network', 'facilities', 'examination', 'other', 'follow-up'

    // New Admin Controls State
    const [editStatus, setEditStatus] = useState('pending');
    const [editAssigneeName, setEditAssigneeName] = useState('');
    const [editAssigneeRole, setEditAssigneeRole] = useState('');
    const [editEta, setEditEta] = useState('');
    const [editPriority, setEditPriority] = useState('Medium');
    const [editCategory, setEditCategory] = useState('academic');
    const [showUpdateStatusModal, setShowUpdateStatusModal] = useState(false);

    const chatContainerRef = useRef(null);
    const filterDropdownRef = useRef(null);

    // Section tabs: 'complaints' | 'deletions'
    const [sectionTab, setSectionTab] = useState('complaints');

    // Deletion Requests State
    const [deletionRequests, setDeletionRequests] = useState([]);
    const [isDeletionLoading, setIsDeletionLoading] = useState(true);
    const [selectedDeletion, setSelectedDeletion] = useState(null);
    const [isDeletionProcessing, setIsDeletionProcessing] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectNote, setRejectNote] = useState('');
    const [deletionFilter, setDeletionFilter] = useState('pending');

    // List Listener
    useEffect(() => {
        const q = query(collection(complaintsDb, 'complaints'), orderBy('createdAt', 'desc'));
        let isInitialLoad = true;
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setComplaints(data);

            if (isInitialLoad) {
                setTimeout(() => {
                    setIsLoading(false);
                    isInitialLoad = false;
                }, 2000);
            } else {
                setIsLoading(false);
            }
        });

        const handleClickOutside = (event) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            unsubscribe();
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Deletion Requests Listener
    useEffect(() => {
        const q = query(collection(db, 'deletion_requests'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setDeletionRequests(data);
            setIsDeletionLoading(false);
        }, () => setIsDeletionLoading(false));
        return () => unsubscribe();
    }, []);

    const handleApproveDeletion = async () => {
        if (!selectedDeletion) return;
        setIsDeletionProcessing(true);
        try {
            // Fetch user to get avatar
            const userRef = doc(db, 'users', selectedDeletion.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const userData = userSnap.data();
                if (userData.avatar || userData.photo) {
                    const photoUrl = userData.avatar || userData.photo;
                    await deleteProfileImage(photoUrl);
                }
            }
            
            // Delete the user document from Firestore
            await deleteDoc(userRef);
            // Mark the request as approved
            await updateDoc(doc(db, 'deletion_requests', selectedDeletion.id), {
                status: 'approved',
                resolvedAt: serverTimestamp(),
                resolvedBy: user?.uid || 'admin'
            });
            setShowApproveModal(false);
            setSelectedDeletion(null);
        } catch (err) {
            console.error('Approve deletion error:', err);
            alert('Failed to approve deletion: ' + err.message);
        } finally {
            setIsDeletionProcessing(false);
        }
    };

    const handleRejectDeletion = async () => {
        if (!selectedDeletion) return;
        setIsDeletionProcessing(true);
        try {
            await updateDoc(doc(db, 'deletion_requests', selectedDeletion.id), {
                status: 'rejected',
                adminNote: rejectNote.trim() || null,
                resolvedAt: serverTimestamp(),
                resolvedBy: user?.uid || 'admin'
            });
            setShowRejectModal(false);
            setRejectNote('');
            setSelectedDeletion(null);
        } catch (err) {
            console.error('Reject deletion error:', err);
            alert('Failed to reject deletion: ' + err.message);
        } finally {
            setIsDeletionProcessing(false);
        }
    };

    const handleUpdateProgress = async (newStep) => {
        if (!selectedDeletion) return;
        setIsDeletionProcessing(true);
        try {
            await updateDoc(doc(db, 'deletion_requests', selectedDeletion.id), {
                progressStep: newStep
            });
            // Update local state for immediate feedback
            setSelectedDeletion(prev => ({ ...prev, progressStep: newStep }));
        } catch (err) {
            console.error('Update progress error:', err);
            alert('Failed to update progress: ' + err.message);
        } finally {
            setIsDeletionProcessing(false);
        }
    };

    const REASON_LABELS = {
        graduated: 'Graduated / No longer a student',
        privacy: 'Privacy concerns',
        duplicate: 'Duplicate account',
        not_using: 'No longer using the app',
        data_concerns: 'Data / security concerns',
        other: 'Other'
    };

    // Selected Complaint Detail Listener
    useEffect(() => {
        if (!selectedId) {
            setSelectedComplaint(null);
            setIsDetailLoading(false);
            return;
        }

        setIsDetailLoading(true);
        const unsubscribe = onSnapshot(doc(complaintsDb, 'complaints', selectedId), (docSnap) => {
            if (docSnap.exists()) {
                const data = { id: docSnap.id, ...docSnap.data() };
                if (data.messages) {
                    data.messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                }
                setSelectedComplaint(data);
                
                // Populate Edit States
                setEditStatus(data.status || 'pending');
                setEditAssigneeName(data.assigneeName || '');
                setEditAssigneeRole(data.assigneeRole || '');
                setEditPriority(data.priority || 'Medium');
                setEditCategory(data.category || 'academic');
                if (data.etaDate) {
                    try {
                        const d = data.etaDate?.toDate ? data.etaDate.toDate() : new Date(data.etaDate);
                        if (!isNaN(d.getTime())) {
                            // format to YYYY-MM-DDThh:mm
                            setEditEta(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16));
                        }
                    } catch (e) {
                        setEditEta('');
                    }
                } else {
                    setEditEta('');
                }
            }
            setIsDetailLoading(false);
        });

        return () => unsubscribe();
    }, [selectedId]);

    const handleUpdateStatus = async (id, newStatus) => {
        // Optimistic UI update for immediate feedback
        if (newStatus === 'resolved') {
            setShowSuccessModal(true);
            setTimeout(() => setShowSuccessModal(false), 2000); // Auto hide after 2s
        }

        try {
            const updateData = {
                status: newStatus,
                updatedAt: serverTimestamp(),
                [`statusHistory.${newStatus}`]: serverTimestamp()
            };

            if (newStatus === 'resolved') {
                const resolutionMessage = {
                    senderId: 'system',
                    senderRole: 'system',
                    senderName: 'System',
                    text: 'Complaint marked as resolved.',
                    type: 'resolution',
                    createdAt: new Date().toISOString()
                };
                updateData.messages = arrayUnion(resolutionMessage);
            }

            await updateDoc(doc(complaintsDb, 'complaints', id), updateData);
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status.");
            if (newStatus === 'resolved') setShowSuccessModal(false); // Revert on error
        }
    };

    const handleSaveControls = async () => {
        if (!selectedComplaint) return;
        setIsUpdating(true);
        try {
            const updateData = {
                status: editStatus,
                assigneeName: editAssigneeName.trim(),
                assigneeRole: editAssigneeRole.trim(),
                priority: editPriority,
                category: editCategory,
                etaDate: editEta ? new Date(editEta) : null,
                updatedAt: serverTimestamp(),
                ...(editStatus !== selectedComplaint?.status ? { [`statusHistory.${editStatus}`]: serverTimestamp() } : {})
            };
            
            if (editStatus === 'resolved' && selectedComplaint.status !== 'resolved') {
                 const resolutionMessage = {
                    senderId: 'system',
                    senderRole: 'system',
                    senderName: 'System',
                    text: 'Complaint marked as resolved.',
                    type: 'resolution',
                    createdAt: new Date().toISOString()
                };
                updateData.messages = arrayUnion(resolutionMessage);
                setShowSuccessModal(true);
                setTimeout(() => setShowSuccessModal(false), 2000);
            }

            await updateDoc(doc(complaintsDb, 'complaints', selectedComplaint.id), updateData);
            alert("Complaint details saved successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to save complaint details.");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteClick = (e, id) => {
        e.stopPropagation();
        setComplaintToDelete(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!complaintToDelete) return;

        try {
            await deleteDoc(doc(complaintsDb, 'complaints', complaintToDelete));

            // If the deleted complaint was selected, clear selection
            if (selectedId === complaintToDelete) {
                setSelectedId(null);
                setSelectedComplaint(null);
            }

            setShowDeleteModal(false);
            setComplaintToDelete(null);

            // Show red success animation
            setShowDeleteSuccess(true);
            setTimeout(() => setShowDeleteSuccess(false), 2000);
        } catch (error) {
            console.error("Error deleting complaint:", error);
            alert("Failed to delete complaint.");
        }
    };

    const handleSendReply = async () => {
        if (!selectedComplaint || !adminReply.trim()) return;

        setIsUpdating(true);
        try {
            const newMessage = {
                id: Date.now().toString(),
                senderId: user.uid,
                senderRole: 'admin',
                senderName: 'Admin',
                text: adminReply.trim(),
                createdAt: new Date().toISOString()
            };

            const isFollowUpActive = selectedComplaint.followUpEnquiry && selectedComplaint.followUpEnquiry.isActive;

            // Optimistic update
            if (isFollowUpActive) {
                const updatedMessages = [...(selectedComplaint.followUpEnquiry.messages || []), newMessage];
                setSelectedComplaint(prev => ({
                    ...prev,
                    followUpEnquiry: {
                        ...prev.followUpEnquiry,
                        messages: updatedMessages,
                        status: 'replied'
                    }
                }));

                setAdminReply('');

                await updateDoc(doc(complaintsDb, 'complaints', selectedComplaint.id), {
                    'followUpEnquiry.messages': updatedMessages,
                    'followUpEnquiry.status': 'replied',
                    updatedAt: serverTimestamp()
                });
            } else {
                setSelectedComplaint(prev => ({
                    ...prev,
                    messages: [...(prev.messages || []), newMessage]
                }));

                setAdminReply('');

                await updateDoc(doc(complaintsDb, 'complaints', selectedComplaint.id), {
                    messages: arrayUnion(newMessage),
                    hasUnreadReply: true, // Notify student
                    updatedAt: serverTimestamp()
                });
            }
        } catch (error) {
            console.error("Detailed error sending reply:", error);
            alert("Failed to send reply: " + error.message);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleActivateAccount = async (complaint) => {
        if (!complaint.uid) return;

        setIsUpdating(true);
        try {
            // 1. Activate the user
            const userRef = doc(db, 'users', complaint.uid);
            await updateDoc(userRef, {
                status: 'active',
                updatedAt: serverTimestamp()
            });

            // 2. Resolve the complaint
            await handleUpdateStatus(complaint.id, 'resolved');

            alert("Account activated successfully!");
        } catch (error) {
            console.error("Error activating account:", error);
            alert("Failed to activate account.");
        } finally {
            setIsUpdating(false);
        }
    };

    const messagesEndRef = useRef(null);

    // Auto-scroll effect
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [selectedComplaint?.messages]);

    const [isFocused, setIsFocused] = useState(false);

    const getFormattedId = (c) => {
        if (c.complaintId) return c.complaintId;
        // Fallback for older complaints
        const shortId = c.id ? c.id.slice(-4).toUpperCase() : 'UNK';
        return `ID-${shortId}`;
    };

    const filteredComplaints = complaints.filter(c => {
        // First filter by section
        if (activeTab === 'new') {
            if (c.status === 'resolved') return false;
        } else { // history
            if (c.status !== 'resolved') return false;
        }

        // Then filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const formattedId = getFormattedId(c).toLowerCase();
            const matchesId = formattedId.includes(query) || (c.id?.toLowerCase().includes(query));
            const matchesName = c.studentName?.toLowerCase().includes(query);
            const matchesSubject = c.subject?.toLowerCase().includes(query);
            if (!matchesId && !matchesName && !matchesSubject) return false;
        }

        // Then filter by status if applicable (within the section)
        if (filter !== 'all' && c.status !== filter) return false;

        // Then filter by category
        if (categoryFilter !== 'all') {
            if (categoryFilter === 'follow-up') {
                if (!c.followUpEnquiry || !c.followUpEnquiry.isActive) return false;
            } else {
                if (c.category?.toLowerCase() !== categoryFilter.toLowerCase()) return false;
            }
        }

        return true;
    });

    // Counts for badges
    const newCount = complaints.filter(c => c.status !== 'resolved').length;
    const historyCount = complaints.filter(c => c.status === 'resolved').length;

    const quickReplies = [
        "Your issue has been resolved. Let us know if you need anything else.",
        "We are looking into this and will get back to you soon.",
        "Please provide more details or a screenshot of the issue.",
        "This has been forwarded to the relevant department."
    ];

    if (isLoading) return <LoadingTransition message="Complaints Database Loading" persistent />;

    const pendingDeletionCount = deletionRequests.filter(r => r.status === 'pending').length;
    const filteredDeletions = deletionRequests.filter(r => {
        if (deletionFilter === 'all') return true;
        return r.status === deletionFilter;
    });

    return (
        <div className="admin-container">
            {!selectedId && !selectedDeletion && (
                <>
                    <div className="page-header-v2">
                        <div className="header-accent-bar"></div>
                        <div className="header-content-v2">
                            <h1 className="page-title-v2">Complaints Management</h1>
                            <p className="page-subtitle-v2">Listen to student concerns and resolve issues effectively.</p>
                        </div>
                    </div>

                    {/* Section Tabs */}
                    <div className="sidebar-tabs-container" style={{ marginBottom: '1.5rem', maxWidth: 400 }}>
                        <button
                            className={`sidebar-tab ${sectionTab === 'complaints' ? 'active' : ''}`}
                            onClick={() => setSectionTab('complaints')}
                        >
                            <span className="tab-label">Complaints</span>
                            {complaints.filter(c => c.status !== 'resolved').length > 0 && (
                                <span className="tab-badge">{complaints.filter(c => c.status !== 'resolved').length}</span>
                            )}
                        </button>
                        <button
                            className={`sidebar-tab ${sectionTab === 'deletions' ? 'active' : ''}`}
                            onClick={() => setSectionTab('deletions')}
                        >
                            <span className="tab-label">Deletion Requests</span>
                            {pendingDeletionCount > 0 && (
                                <span className="tab-badge" style={{ background: '#ef4444' }}>{pendingDeletionCount}</span>
                            )}
                        </button>
                    </div>
                </>
            )}

            {sectionTab === 'deletions' ? (
                /* ===== DELETION REQUESTS PANEL ===== */
                <div className="complaints-mgmt-layout full-width-mode">
                    {!selectedDeletion ? (
                    <div className="complaints-sidebar section-card flex flex-col w-full h-full">
                        <div className="sidebar-tabs-container">
                            {['pending','approved','rejected','all'].map(f => (
                                <button
                                    key={f}
                                    className={`sidebar-tab ${deletionFilter === f ? 'active' : ''}`}
                                    style={{ fontSize: '0.7rem', padding: '0.5rem 0.6rem' }}
                                    onClick={() => setDeletionFilter(f)}
                                >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                    {f === 'pending' && pendingDeletionCount > 0 && (
                                        <span className="tab-badge" style={{ background: '#ef4444', marginLeft: 4 }}>{pendingDeletionCount}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="complaints-mgmt-list">
                            {isDeletionLoading ? (
                                <div className="p-8 text-center text-slate-400">Loading...</div>
                            ) : filteredDeletions.length === 0 ? (
                                <div style={{ padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', height: '100%', flex: 1, textAlign: 'center' }}>
                                    <div style={{ background: '#f1f5f9', padding: '1.25rem', borderRadius: '50%', marginBottom: '1rem' }}>
                                        <UserX size={48} color="#94a3b8" />
                                    </div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>No Requests Found</h3>
                                    <p style={{ fontSize: '0.85rem', color: '#64748b' }}>There are no {deletionFilter === 'all' ? 'account deletion' : `${deletionFilter} deletion`} requests at this time.</p>
                                </div>
                            ) : filteredDeletions.map(req => (
                                <div
                                    key={req.id}
                                    className={`cm-premium-card ${selectedDeletion?.id === req.id ? 'active' : ''}`}
                                    onClick={() => setSelectedDeletion(req)}
                                >
                                    <div className="cm-card-content">
                                        <div className="cm-card-left">
                                            <div className="cm-card-header" style={{ marginBottom: '0.25rem' }}>
                                                <span className={`detail-metadata-pill ${
                                                    req.status === 'pending' ? 'priority-medium' :
                                                    req.status === 'approved' ? 'priority-low' :
                                                    'priority-high'
                                                }`} style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                                                    {req.status?.toUpperCase()}
                                                </span>
                                            </div>
                                            <h3 className="cm-title truncate" style={{ fontSize: '0.9rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                <User size={14} color="#94a3b8" />
                                                {req.studentName}
                                            </h3>
                                            <div className="text-sm font-semibold truncate text-red-600" style={{ fontSize: '0.8rem', color: '#ef4444' }}>
                                                {REASON_LABELS[req.reason] || req.reason}
                                            </div>
                                        </div>
                                        <div className="cm-card-right">
                                            <div className="cm-date-label">
                                                {req.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    ) : (
                    <div className="complaint-detail-container section-card no-padding flex flex-col h-full overflow-hidden relative w-full animate-slide-in">
                        <div style={{ padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid #e2e8f0', background: '#ffffff', flexShrink: 0 }}>
                            <button 
                                onClick={() => setSelectedDeletion(null)}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: '#f1f5f9', color: '#0f172a', border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}
                                onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
                                onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}
                            >
                                <ArrowLeft size={20} strokeWidth={2.5} />
                            </button>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.025em', lineHeight: 1 }}>Request Details</h2>
                        </div>
                        {selectedDeletion ? (
                            <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', overflowY: 'auto', background: '#f8fafc' }}>
                                {/* Top Header Breadcrumb & Status */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                                        <span>Requests</span>
                                        <span>›</span>
                                        <span style={{ color: '#3b82f6' }}>Deletion Request #{selectedDeletion.id.slice(0, 5).toUpperCase()}</span>
                                    </div>
                                    <span className={`detail-metadata-pill ${
                                        selectedDeletion.status === 'pending' ? 'priority-medium' :
                                        selectedDeletion.status === 'approved' ? 'priority-low' :
                                        'priority-high'
                                    }`} style={{ fontSize: '0.7rem', padding: '0.3rem 0.75rem', textTransform: 'uppercase', borderRadius: '1rem', background: selectedDeletion.status === 'pending' ? '#ffedd5' : selectedDeletion.status === 'approved' ? '#dcfce7' : '#fee2e2', color: selectedDeletion.status === 'pending' ? '#ea580c' : selectedDeletion.status === 'approved' ? '#16a34a' : '#ef4444' }}>
                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block', marginRight: 6 }}></div>
                                        {selectedDeletion.status?.toUpperCase()}
                                    </span>
                                </div>

                                {/* Main 2-Column Layout */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                                    
                                    {/* LEFT COLUMN */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        
                                        {/* Profile Card */}
                                        <div style={{ background: '#ffffff', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <UserX size={28} color="#ef4444" />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', margin: 0, marginBottom: '0.15rem' }}>{selectedDeletion.studentName}</h2>
                                                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, marginBottom: '0.5rem' }}>{selectedDeletion.studentEmail}</p>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, background: '#f1f5f9', color: '#64748b', padding: '0.2rem 0.5rem', borderRadius: '0.25rem' }}>STUDENT ID: {selectedDeletion.studentId}</span>
                                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, background: '#dcfce7', color: '#16a34a', padding: '0.2rem 0.5rem', borderRadius: '0.25rem' }}>ACTIVE STATUS</span>
                                                </div>
                                            </div>
                                            <div style={{ alignSelf: 'flex-start' }}>
                                                <ArrowUpRight size={20} color="#3b82f6" />
                                            </div>
                                        </div>

                                        {/* Request Details Card */}
                                        <div style={{ background: '#ffffff', borderRadius: '0.5rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                            <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9' }}>
                                                <div style={{ flex: 1, padding: '1.25rem', borderRight: '1px solid #f1f5f9' }}>
                                                    <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Reason</p>
                                                    <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ef4444', margin: 0 }}>{REASON_LABELS[selectedDeletion.reason] || selectedDeletion.reason}</p>
                                                </div>
                                                <div style={{ flex: 1, padding: '1.25rem' }}>
                                                    <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Submitted</p>
                                                    <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155', margin: 0 }}>
                                                        {selectedDeletion.createdAt?.toDate?.()?.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div style={{ padding: '1.25rem' }}>
                                                <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Student Comments</p>
                                                <p style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic', margin: 0, padding: '1rem', background: '#f8fafc', borderRadius: '0.25rem', border: '1px solid #f1f5f9' }}>
                                                    "{selectedDeletion.comments || 'No comments provided.'}"
                                                </p>
                                            </div>
                                        </div>

                                        {/* Impact Assessment Card */}
                                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '1.25rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                                <AlertTriangle size={18} color="#ef4444" />
                                                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#dc2626', margin: 0 }}>Impact Assessment</h3>
                                            </div>
                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8rem', color: '#334155' }}>
                                                    <CheckCircle size={14} color="#ef4444" style={{ marginTop: 2, flexShrink: 0 }} />
                                                    Access to portal will be permanently revoked.
                                                </li>
                                                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8rem', color: '#334155' }}>
                                                    <CheckCircle size={14} color="#ef4444" style={{ marginTop: 2, flexShrink: 0 }} />
                                                    All academic history will be archived but inaccessible to the student.
                                                </li>
                                                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8rem', color: '#334155' }}>
                                                    <CheckCircle size={14} color="#ef4444" style={{ marginTop: 2, flexShrink: 0 }} />
                                                    Linked email alias will be decommissioned.
                                                </li>
                                            </ul>
                                        </div>

                                    </div>

                                    {/* RIGHT COLUMN */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        
                                        {/* Status Track */}
                                        <div style={{ background: '#ffffff', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '1.25rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{ background: '#eff6ff', padding: '0.5rem', borderRadius: '0.5rem' }}>
                                                        <BarChart2 size={18} color="#3b82f6" />
                                                    </div>
                                                    <div>
                                                        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>Status Track</h3>
                                                        <p style={{ fontSize: '0.65rem', color: '#94a3b8', margin: 0 }}>Lifecycle monitoring</p>
                                                    </div>
                                                </div>
                                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '0.2rem 0.5rem', borderRadius: '1rem' }}>Step {selectedDeletion.progressStep || 1}/11</span>
                                            </div>

                                            {/* Timeline Visual */}
                                            <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                                <div style={{ position: 'relative', paddingLeft: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                    <div style={{ position: 'absolute', left: '0.8rem', top: '0.5rem', bottom: '1.5rem', width: 2, background: '#e2e8f0', zIndex: 0 }}></div>
                                                    
                                                    {[
                                                    { step: 1, label: 'Submitted', desc: 'Request received' },
                                                    { step: 2, label: 'Received', desc: 'System acknowledged' },
                                                    { step: 3, label: 'Verification', desc: 'Checking details' },
                                                    { step: 4, label: 'Under Review', desc: 'Admin assessing' },
                                                    { step: 5, label: 'Data Assessment', desc: 'Identifying data' },
                                                    { step: 6, label: 'Awaiting Decision', desc: 'Pending approval' },
                                                    { step: 7, label: 'Approved/Rejected', desc: 'Decision made' },
                                                    { step: 8, label: 'Processing', desc: 'Executing deletion' },
                                                    { step: 9, label: 'Authentication Removed', desc: 'Access revoked' },
                                                    { step: 10, label: 'User Notified', desc: 'Confirmation sent' },
                                                    { step: 11, label: 'Completed', desc: 'Fully resolved' }
                                                ].map((item, index) => {
                                                    const currentStep = selectedDeletion.progressStep || 1;
                                                    const isCompleted = item.step < currentStep;
                                                    const isCurrent = item.step === currentStep;
                                                    const isPending = item.step > currentStep;
                                                    
                                                    let circleColor = '#e2e8f0';
                                                    let outlineColor = '#cbd5e1';
                                                    if (isCompleted) {
                                                        circleColor = '#16a34a';
                                                        outlineColor = '#16a34a';
                                                    } else if (isCurrent) {
                                                        circleColor = '#16a34a';
                                                        outlineColor = '#86efac';
                                                    }

                                                    return (
                                                        <div key={item.step} style={{ display: 'flex', gap: '1rem', position: 'relative', zIndex: 1, opacity: isPending ? 0.4 : 1, paddingBottom: index === 10 ? 0 : '0.25rem' }}>
                                                            <div style={{ width: 12, height: 12, borderRadius: '50%', background: circleColor, border: '2px solid #ffffff', outline: `2px solid ${outlineColor}`, marginTop: 2, flexShrink: 0 }}></div>
                                                            <div>
                                                                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{item.label}</p>
                                                                <p style={{ fontSize: '0.7rem', color: '#64748b', margin: 0 }}>
                                                                    {item.step === 1 ? (selectedDeletion.createdAt?.toDate?.()?.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) || 'N/A') : item.desc}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Update Progress Dropdown */}
                                        <div style={{ background: '#ffffff', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '1.25rem' }}>
                                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Update Step Progress</label>
                                            <div style={{ position: 'relative' }}>
                                                <select 
                                                    value={selectedDeletion.progressStep || 1} 
                                                    onChange={(e) => handleUpdateProgress(Number(e.target.value))}
                                                    disabled={isDeletionProcessing}
                                                    style={{ 
                                                        width: '100%', 
                                                        padding: '0.75rem 1rem', 
                                                        borderRadius: '0.375rem', 
                                                        border: '1px solid #cbd5e1', 
                                                        backgroundColor: '#f8fafc', 
                                                        color: '#334155', 
                                                        fontSize: '0.875rem',
                                                        fontWeight: 600,
                                                        appearance: 'none',
                                                        outline: 'none',
                                                        cursor: isDeletionProcessing ? 'not-allowed' : 'pointer',
                                                        opacity: isDeletionProcessing ? 0.6 : 1
                                                    }}
                                                >
                                                    <option value={1}>1. Submitted</option>
                                                    <option value={2}>2. Received</option>
                                                    <option value={3}>3. Verification</option>
                                                    <option value={4}>4. Under Review</option>
                                                    <option value={5}>5. Data Assessment</option>
                                                    <option value={6}>6. Awaiting Decision</option>
                                                    <option value={7}>7. Approved/Rejected</option>
                                                    <option value={8}>8. Processing</option>
                                                    <option value={9}>9. Authentication Removed</option>
                                                    <option value={10}>10. User Notified</option>
                                                    <option value={11}>11. Completed</option>
                                                </select>
                                                <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                                                    <ChevronDown size={16} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        {selectedDeletion.status === 'pending' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                <button
                                                    onClick={() => setShowApproveModal(true)}
                                                    disabled={isDeletionProcessing}
                                                    style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', background: 'linear-gradient(to bottom, #dc2626, #b91c1c)', color: 'white', border: '1px solid #991b1b', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.9rem', boxShadow: '0 2px 4px rgba(220,38,38,0.2)' }}
                                                >
                                                    <CheckSquare size={16} /> Approve Deletion
                                                </button>
                                                <button
                                                    onClick={() => setShowRejectModal(true)}
                                                    disabled={isDeletionProcessing}
                                                    style={{ width: '100%', padding: '0.875rem', borderRadius: '0.5rem', background: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.9rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                                >
                                                    <XCircle size={16} /> Reject Request
                                                </button>
                                            </div>
                                        )}

                                        {/* Info Footer */}
                                        <div style={{ marginTop: '0.5rem', background: '#f1f5f9', borderRadius: '0.5rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>
                                                <span>Request ID</span>
                                                <span style={{ color: '#3b82f6' }}>#DEL-{selectedDeletion.id.slice(0, 5).toUpperCase()}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>
                                                <span>Wait Time</span>
                                                <span style={{ color: '#1e293b' }}>2 hours</span>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-12 text-center">
                                <UserX size={48} className="mb-4 opacity-40" />
                                <h3 className="text-lg font-bold text-slate-600 mb-2">Request Not Found</h3>
                            </div>
                        )}
                    </div>
                    )}
                </div>
            ) : (
            <div className="complaints-mgmt-layout full-width-mode">
                {!selectedId ? (
                <div className="complaints-sidebar section-card flex flex-col w-full h-full">
                    <div className="sidebar-tabs-container">
                        <button
                            className={`sidebar-tab ${activeTab === 'new' ? 'active' : ''}`}
                            onClick={() => {
                                setActiveTab('new');
                                setFilter('all');
                            }}
                        >
                            <span className="tab-label">New Complaints</span>
                            {newCount > 0 && <span className="tab-badge">{newCount}</span>}
                        </button>
                        <button
                            className={`sidebar-tab ${activeTab === 'history' ? 'active' : ''}`}
                            onClick={() => {
                                setActiveTab('history');
                                setFilter('all');
                            }}
                        >
                            <span className="tab-label">History</span>
                            {historyCount > 0 && <span className="tab-badge history">{historyCount}</span>}
                        </button>
                    </div>

                    <div className="flex items-center justify-between border-b" style={{ padding: '1rem 1.5rem 0.5rem 1.5rem' }}>
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                            {activeTab === 'new' ? 'Active Tickets' : 'Resolved Archive'}
                        </h2>
                        <div className="flex items-center gap-2">
                            {/* Search Bar */}
                            <div className={`admin-search-box ${searchQuery ? 'has-value' : ''}`}>
                                <Search size={14} className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search ID/Name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="admin-search-input"
                                />
                                {searchQuery && (
                                    <button className="clear-search" onClick={() => setSearchQuery('')}>×</button>
                                )}
                            </div>

                            {activeTab === 'new' && (
                                <div className="admin-filter-wrapper" ref={filterDropdownRef}>
                                    <button
                                        className={`admin-filter-trigger compact ${isFilterOpen ? 'active' : ''}`}
                                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                                    >
                                        <Filter size={12} className="text-slate-400" />
                                        <span className="capitalize text-xs">{filter}</span>
                                        <ChevronDown size={12} className={`trigger-chevron ${isFilterOpen ? 'rotate' : ''}`} />
                                    </button>

                                    {isFilterOpen && (
                                        <div className="admin-filter-options animate-scale-up">
                                            {[
                                                { id: 'all', label: 'All Active', icon: <MessageSquare size={14} /> },
                                                { id: 'pending', label: 'Pending Only', icon: <AlertCircle size={14} className="text-amber-500" /> },
                                                { id: 'in-progress', label: 'In Progress', icon: <Clock size={14} className="text-blue-500" /> }
                                            ].map((opt) => (
                                                <button
                                                    key={opt.id}
                                                    className={`admin-filter-opt ${filter === opt.id ? 'active' : ''}`}
                                                    onClick={() => {
                                                        setFilter(opt.id);
                                                        setIsFilterOpen(false);
                                                    }}
                                                >
                                                    <span className="opt-icon">{opt.icon}</span>
                                                    <span className="opt-label">{opt.label}</span>
                                                    {filter === opt.id && <div className="active-dot" />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Category Filters */}
                    <div className="admin-category-filters overflow-x-auto whitespace-nowrap px-4 py-3 border-b flex gap-2 hide-scrollbar">
                        <button
                            className={`admin-cat-pill ${categoryFilter === 'all' ? 'active' : ''}`}
                            onClick={() => setCategoryFilter('all')}
                        >
                            All
                        </button>
                        {['Academic', 'Hostel', 'Mess', 'Transport', 'WiFi/Network', 'Facilities', 'Examination', 'Other'].map(cat => (
                            <button
                                key={cat}
                                className={`admin-cat-pill ${categoryFilter.toLowerCase() === cat.toLowerCase() ? 'active' : ''}`}
                                onClick={() => setCategoryFilter(cat.toLowerCase())}
                            >
                                {cat}
                            </button>
                        ))}
                        <button
                            className={`admin-cat-pill follow-up ${categoryFilter === 'follow-up' ? 'active' : ''}`}
                            onClick={() => setCategoryFilter('follow-up')}
                        >
                            Follow-ups
                        </button>
                    </div>

                    <div className="complaints-mgmt-list">
                        {filteredComplaints.length === 0 ? (
                                <div style={{ padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', height: '100%', flex: 1, textAlign: 'center' }}>
                                    <div style={{ background: '#f1f5f9', padding: '1.25rem', borderRadius: '50%', marginBottom: '1rem' }}>
                                        <MessageSquare size={48} color="#94a3b8" />
                                    </div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>No Complaints</h3>
                                    <p style={{ fontSize: '0.85rem', color: '#64748b' }}>There are no {categoryFilter === 'all' ? '' : `${categoryFilter} `}complaints matching your filters.</p>
                                </div>
                        ) : (
                            filteredComplaints.map(c => (
                                <div
                                    key={c.id}
                                    className={`cm-premium-card ${selectedId === c.id ? 'active' : ''} bg-grad-${(c.category || 'other').toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                    onClick={() => {
                                        setSelectedId(c.id);
                                        setAdminReply('');
                                    }}
                                >
                                    {/* Main Content Area: 2 Columns */}
                                    <div className="cm-card-content">
                                        
                                        {/* Left Column: Info */}
                                        <div className="cm-card-left">
                                            <div className="cm-card-header">
                                                <div className="cm-icon-container">
                                                    <MessageSquare size={14} className="cm-main-icon" />
                                                </div>
                                                <span className="cm-id-label">{getFormattedId(c)}</span>
                                            </div>
                                            
                                            <h3 className="cm-title truncate">{c.subject}</h3>
                                            
                                            <div className="cm-meta-row">
                                                <span className="cm-meta-item">
                                                    <User size={12} className="cm-meta-icon" />
                                                    <span className="truncate max-w-[100px]">{c.studentName}</span>
                                                </span>
                                                <span className="cm-meta-divider">•</span>
                                                <span className="cm-meta-item">
                                                    <Clock size={12} className="cm-meta-icon" />
                                                    <span>{c.createdAt?.toDate()?.toLocaleDateString([], { month: 'short', day: 'numeric' }) || 'Recent'}</span>
                                                </span>
                                                {c.priority && (
                                                    <>
                                                        <span className="cm-meta-divider">•</span>
                                                        <span className={`cm-priority-pill ${c.priority.toLowerCase()}`}>
                                                            {c.priority}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right Column: Status & Actions */}
                                        <div className="cm-card-right flex flex-col items-end gap-2">
                                            <span className={`cm-status-badge ${c.status}`}>
                                                <div className="cm-status-glow" />
                                                {c.status === 'in-progress' ? 'In Progress' : c.status === 'under_review' ? 'Under Review' : c.status}
                                            </span>
                                            {c.followUpEnquiry && c.followUpEnquiry.isActive && (
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                                                    Follow-up
                                                </span>
                                            )}
                                            
                                            <button
                                                className="cm-delete-btn"
                                                onClick={(e) => handleDeleteClick(e, c.id)}
                                                title="Delete Complaint"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Bottom: Progress Indicator */}
                                    <div className="cm-progress-bar-container">
                                        <div 
                                            className={`cm-progress-fill ${c.status}`} 
                                            style={{ 
                                                width: c.status === 'resolved' ? '100%' : 
                                                       c.status === 'in-progress' ? '75%' : 
                                                       (c.status === 'under_review' || c.status === 'assigned') ? '50%' : '25%' 
                                            }}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                ) : (
                <div className="complaint-detail-container section-card no-padding flex flex-col h-full overflow-hidden relative w-full animate-slide-in">
                    {isDetailLoading ? (
                        <div className="p-8 flex flex-col space-y-8 h-full">
                            <div className="flex justify-between items-start">
                                <div className="space-y-3 w-1/2">
                                    <div className="h-8 skeleton w-full rounded-xl"></div>
                                    <div className="h-4 skeleton w-3/4 rounded-md"></div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="h-10 skeleton w-20 rounded-xl"></div>
                                    <div className="h-10 skeleton w-20 rounded-xl"></div>
                                    <div className="h-10 skeleton w-20 rounded-xl"></div>
                                </div>
                            </div>
                            <div className="flex-1 space-y-6 overflow-hidden">
                                <div className="h-20 skeleton w-2/3 rounded-2xl opacity-60"></div>
                                <div className="h-16 skeleton w-3/4 rounded-2xl ml-auto opacity-40"></div>
                                <div className="h-24 skeleton w-1/2 rounded-2xl opacity-50"></div>
                                <div className="h-20 skeleton w-2/3 rounded-2xl ml-auto opacity-30"></div>
                            </div>
                        </div>
                    ) : selectedComplaint ? (
                        <>
                            {/* Header - Fixed at Top */}
                            <div className="complaint-detail-header p-6 z-10 relative">
                                <div className="flex items-center mb-2" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                    <button 
                                        onClick={() => { setSelectedId(null); setSelectedComplaint(null); }}
                                        className="flex items-center justify-center p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                                    >
                                        <ArrowLeft size={20} />
                                    </button>
                                    <h2 className="text-2xl font-extrabold text-[#1e293b] tracking-tight truncate mb-1" title={selectedComplaint.subject}>{selectedComplaint.subject}</h2>
                                </div>
                                <div className="flex justify-between items-start" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div className="min-w-0 flex-1 mr-4 ml-10">
                                        <div className="complaint-metadata-bar">
                                            <span className="detail-metadata-pill highlight">
                                                <User size={14} />
                                                {selectedComplaint.studentName}
                                            </span>
                                            <span className="detail-metadata-pill">
                                                <Clock size={12} />
                                                {selectedComplaint.createdAt?.toDate()?.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) || 'Recently'}
                                            </span>
                                            <span className="detail-metadata-pill id-pill">
                                                {getFormattedId(selectedComplaint)}
                                            </span>
                                            <span className="detail-metadata-pill" style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 800 }}>
                                                {selectedComplaint.category || 'N/A'}
                                            </span>
                                            {selectedComplaint.priority && (
                                                <span className={`detail-metadata-pill ${
                                                    selectedComplaint.priority.toLowerCase() === 'high' ? 'priority-high' :
                                                    selectedComplaint.priority.toLowerCase() === 'medium' ? 'priority-medium' :
                                                    'priority-low'
                                                }`} style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 800 }}>
                                                    {selectedComplaint.priority} Priority
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button 
                                            onClick={() => setShowUpdateStatusModal(true)}
                                            className="admin-update-status-btn"
                                        >
                                            <Settings size={16} className="mr-1.5" />
                                            Update Status
                                        </button>
                                        {selectedComplaint.category === 'activation' && selectedComplaint.status !== 'resolved' && (
                                            <button
                                                onClick={() => handleActivateAccount(selectedComplaint)}
                                                disabled={isUpdating}
                                                className="status-btn resolved active"
                                                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none' }}
                                            >
                                                Approve & Activate
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="complaint-chat-history flex-1 overflow-y-auto p-6" ref={chatContainerRef}>
                                {/* Admin Advanced Controls Modal Trigger is in Header now */}


                                {(selectedComplaint.messages || []).map((msg, idx) => {
                                    if (msg.type === 'resolution') {
                                        return (
                                            <div key={`res-${idx}`} className="resolution-message-container">
                                                <div className="resolution-animation-wrapper">
                                                    <div className="checkmark-circle small">
                                                        <svg className="checkmark-svg" viewBox="0 0 52 52">
                                                            <circle className="checkmark-circle-stroke" cx="26" cy="26" r="25" fill="none" />
                                                            <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                                                        </svg>
                                                    </div>
                                                </div>
                                                <p className="resolution-message-text">Complaint Resolved / Closed</p>
                                                <span className="resolution-time">{msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ''}</span>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div key={`msg-${idx}`} className={`chat-bubble ${msg.senderRole}`}>
                                            <div className="chat-bubble-info">
                                                <span className="sender">{msg.senderRole === 'admin' ? 'You' : msg.senderName}</span>
                                                <span className="time">{msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ''}</span>
                                            </div>
                                            <p className="chat-text">{msg.text}</p>
                                        </div>
                                    );
                                })}
                                
                                {/* Follow-up Thread Rendering */}
                                {selectedComplaint.followUpEnquiry && selectedComplaint.followUpEnquiry.messages && (
                                    <>
                                        <div className="flex items-center my-6">
                                            <div className="flex-1 border-t border-slate-200 dark:border-slate-700"></div>
                                            <span className="px-4 text-xs font-bold uppercase text-amber-600 bg-amber-50 rounded-full py-1 border border-amber-200">
                                                Follow-up Enquiry: {selectedComplaint.followUpEnquiry.subject}
                                            </span>
                                            <div className="flex-1 border-t border-slate-200 dark:border-slate-700"></div>
                                        </div>
                                        {selectedComplaint.followUpEnquiry.messages.map((msg, idx) => (
                                            <div key={`fu-${idx}`} className={`chat-bubble ${msg.senderRole}`}>
                                                <div className="chat-bubble-info">
                                                    <span className="sender">{msg.senderRole === 'admin' ? 'You' : msg.senderName}</span>
                                                    <span className="time">{msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ''}</span>
                                                </div>
                                                <p className="chat-text">{msg.text}</p>
                                            </div>
                                        ))}
                                    </>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Reply Box - Fixed at Bottom of Flex Container */}
                            <div className="complaint-detail-footer p-5 z-10 relative">
                                <div className={`response-box-wrapper-single ${isFocused ? 'focused' : ''}`}>
                                    <input
                                        type="text"
                                        className="single-line-reply-input"
                                        placeholder="Type your reply..."
                                        value={adminReply}
                                        onChange={(e) => setAdminReply(e.target.value)}
                                        onFocus={() => setIsFocused(true)}
                                        onBlur={() => setIsFocused(false)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendReply()}
                                    />
                                    <button
                                        className="send-reply-btn"
                                        onClick={handleSendReply}
                                        disabled={isUpdating || !adminReply.trim()}
                                        title="Send Reply"
                                    >
                                        <Send size={20} />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 p-12 text-center animate-fade-in">
                            <div className="empty-chat-icon-wrapper">
                                <MessageSquare size={48} className="mb-4 opacity-40" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-600 mb-2">No Ticket Selected</h3>
                            <p className="max-w-xs text-sm text-slate-400">Select a complaint from the sidebar to view the discussion thread and respond.</p>
                        </div>
                    )}
                </div>
                )}
            </div>
            )}

            {/* ===== APPROVE DELETION MODAL ===== */}
            {showApproveModal && createPortal(
                <div className="delete-modal-overlay animate-fade-in" onClick={() => setShowApproveModal(false)}>
                    <div className="delete-modal-content animate-scale-up" onClick={e => e.stopPropagation()}>
                        <div className="delete-modal-icon" style={{ background: 'rgba(239,68,68,0.1)', borderRadius: '50%', width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                            <UserX size={32} color="#ef4444" />
                        </div>
                        <h3 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>Approve Account Deletion?</h3>
                        <p style={{ marginBottom: '1.5rem', lineHeight: 1.5 }}>
                            This will <strong>permanently delete</strong> the Firestore data for <strong>{selectedDeletion?.studentName}</strong> ({selectedDeletion?.studentEmail}). The student will lose access to the platform. This action <strong>cannot be undone</strong>.
                        </p>
                        <div className="delete-modal-actions">
                            <button onClick={() => setShowApproveModal(false)} className="btn-cancel" disabled={isDeletionProcessing}>Cancel</button>
                            <button
                                onClick={handleApproveDeletion}
                                className="btn-delete"
                                disabled={isDeletionProcessing}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                {isDeletionProcessing ? <RefreshCw size={16} className="animate-spin" /> : <UserX size={16} />}
                                {isDeletionProcessing ? 'Processing...' : 'Yes, Delete Account'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ===== REJECT DELETION MODAL ===== */}
            {showRejectModal && createPortal(
                <div className="delete-modal-overlay animate-fade-in" onClick={() => { setShowRejectModal(false); setRejectNote(''); }}>
                    <div className="delete-modal-content animate-scale-up" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <div className="delete-modal-icon" style={{ background: 'rgba(100,116,139,0.1)', borderRadius: '50%', width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                            <ShieldX size={32} color="#64748b" />
                        </div>
                        <h3 style={{ marginBottom: '0.5rem' }}>Reject Deletion Request?</h3>
                        <p style={{ marginBottom: '1rem', lineHeight: 1.5, color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                            The request will be marked as rejected and the student will retain their account.
                        </p>
                        <textarea
                            placeholder="Optional: Reason for rejection (visible to student)"
                            value={rejectNote}
                            onChange={e => setRejectNote(e.target.value)}
                            maxLength={300}
                            style={{ width: '100%', height: 90, padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text-main)', fontFamily: 'inherit', fontSize: '0.875rem', resize: 'none', outline: 'none', marginBottom: '1.25rem', boxSizing: 'border-box' }}
                        />
                        <div className="delete-modal-actions">
                            <button onClick={() => { setShowRejectModal(false); setRejectNote(''); }} className="btn-cancel" disabled={isDeletionProcessing}>Cancel</button>
                            <button
                                onClick={handleRejectDeletion}
                                disabled={isDeletionProcessing}
                                style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg,#64748b,#475569)', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                            >
                                {isDeletionProcessing ? <RefreshCw size={16} className="animate-spin" /> : <ShieldX size={16} />}
                                {isDeletionProcessing ? 'Processing...' : 'Reject Request'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Update Status Modal */}
            {showUpdateStatusModal && createPortal(
                <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]" style={{ zIndex: 999999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)' }}>
                    <div 
                        className="admin-premium-controls-card m-0 w-full overflow-y-auto shadow-2xl relative animate-[slideUp_0.3s_ease-out]"
                        style={{ maxWidth: '600px', maxHeight: '90vh' }}
                    >
                        <div className="admin-controls-header flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <div className="admin-controls-icon-bg flex-shrink-0">
                                    <Settings size={22} className="text-indigo-500 animate-[spin_4s_linear_infinite]" />
                                </div>
                                <div>
                                    <h3 className="admin-controls-title">Complaint Configuration</h3>
                                    <p className="admin-controls-subtitle">Real-time sync with student timeline</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowUpdateStatusModal(false)}
                                className="admin-close-btn"
                            >
                                <span className="text-2xl leading-none">&times;</span>
                            </button>
                        </div>
                        
                        <div className="admin-controls-grid">
                            <div className="admin-input-group">
                                <label>Timeline Status</label>
                                <div className="admin-select-wrapper">
                                    <select 
                                        className="admin-premium-input cursor-pointer"
                                        value={editStatus}
                                        onChange={(e) => setEditStatus(e.target.value)}
                                    >
                                        <option value="pending">Submitted</option>
                                        <option value="viewed">Viewed by Admin</option>
                                        <option value="under_review">Under Review</option>
                                        <option value="in-progress">In Progress</option>
                                        <option value="resolved">Resolved</option>
                                        <option value="closed">Closed</option>
                                    </select>
                                    <ChevronDown size={16} className="admin-select-icon" />
                                </div>
                            </div>

                            <div className="admin-input-group">
                                <label>Estimated Resolution (ETA)</label>
                                <input 
                                    type="datetime-local" 
                                    className="admin-premium-input cursor-pointer"
                                    value={editEta}
                                    onChange={(e) => setEditEta(e.target.value)}
                                />
                            </div>

                            <div className="admin-input-group">
                                <label>Priority</label>
                                <div className="admin-select-wrapper">
                                    <select 
                                        className="admin-premium-input cursor-pointer"
                                        value={editPriority}
                                        onChange={(e) => setEditPriority(e.target.value)}
                                    >
                                        <option value="High">High Priority</option>
                                        <option value="Medium">Medium Priority</option>
                                        <option value="Low">Low Priority</option>
                                    </select>
                                    <ChevronDown size={16} className="admin-select-icon" />
                                </div>
                            </div>

                            <div className="admin-input-group">
                                <label>Category</label>
                                <div className="admin-select-wrapper">
                                    <select 
                                        className="admin-premium-input cursor-pointer"
                                        value={editCategory}
                                        onChange={(e) => setEditCategory(e.target.value)}
                                    >
                                        <option value="academic">Academic & Classes</option>
                                        <option value="facilities">Facilities & Infrastructure</option>
                                        <option value="hostel">Hostel & Accommodation</option>
                                        <option value="mess">Mess & Food</option>
                                        <option value="it">IT & Network</option>
                                        <option value="administration">Administration</option>
                                        <option value="other">Other</option>
                                    </select>
                                    <ChevronDown size={16} className="admin-select-icon" />
                                </div>
                            </div>

                            <div className="admin-input-group">
                                <label>Assignee Name</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Mr. Arjun Sharma"
                                    className="admin-premium-input"
                                    value={editAssigneeName}
                                    onChange={(e) => setEditAssigneeName(e.target.value)}
                                />
                            </div>

                            <div className="admin-input-group">
                                <label>Assignee Role</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Network Administrator"
                                    className="admin-premium-input"
                                    value={editAssigneeRole}
                                    onChange={(e) => setEditAssigneeRole(e.target.value)}
                                />
                            </div>
                        </div>
                        
                        <div className="admin-controls-footer">
                            <button 
                                onClick={() => setShowUpdateStatusModal(false)}
                                className="admin-premium-cancel-btn"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => {
                                    handleSaveControls();
                                    setShowUpdateStatusModal(false);
                                }}
                                disabled={isUpdating}
                                className="admin-premium-save-btn flex items-center gap-2"
                            >
                                {isUpdating ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} strokeWidth={2.5} />}
                                {isUpdating ? 'Synchronizing...' : 'Save & Publish Timeline'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Resolution Confirmation Modal */}
            {showResolveModal && (
                <div className="resolve-modal-overlay">
                    <div className="resolve-modal-content">
                        <div className="resolve-modal-header">
                            <AlertCircle size={24} />
                            <h3>Mark as Resolved?</h3>
                        </div>
                        <p className="resolve-modal-text">
                            Are you sure you want to mark this complaint as resolved? This will signal to the student that the issue has been addressed.
                        </p>
                        <div className="resolve-modal-actions">
                            <button
                                onClick={() => setShowResolveModal(false)}
                                className="btn-cancel"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    handleUpdateStatus(selectedComplaint.id, 'resolved');
                                    setShowResolveModal(false);
                                }}
                                className="btn-confirm-resolve"
                            >
                                Yes, Resolve
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Animation Modal */}
            {showSuccessModal && (
                <div className="success-modal-overlay">
                    <div className="success-modal-content">
                        <div className="success-animation-container">
                            <div className="checkmark-circle">
                                <svg className="checkmark-svg" viewBox="0 0 52 52">
                                    <circle className="checkmark-circle-stroke" cx="26" cy="26" r="25" fill="none" />
                                    <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                                </svg>
                            </div>
                            <h3 className="success-text">Resolved!</h3>
                            <p className="success-subtext">Complaint has been marked as resolved.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && createPortal(
                <div className="delete-modal-overlay animate-fade-in">
                    <div className="delete-modal-content animate-scale-up">
                        <div className="delete-modal-icon">
                            <Trash2 size={32} className="text-red-500 animate-bounce-short" />
                        </div>
                        <h3>Delete Complaint?</h3>
                        <p>This will permanently remove the complaint and all its messages. This action cannot be undone.</p>
                        <div className="delete-modal-actions">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="btn-cancel"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="btn-delete"
                            >
                                <Trash2 size={18} />
                                Delete Permanently
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Delete Success Animation */}
            {showDeleteSuccess && createPortal(
                <div className="delete-modal-overlay success-red-theme animate-fade-in">
                    <div className="delete-modal-content success-red-theme">
                        <div className="delete-modal-icon icon-red-bg">
                            <Trash2 size={40} className="text-red-600 animate-bounce-short" />
                        </div>
                        <h3 className="text-red-700">Deleted!</h3>
                        <p className="text-red-600 mb-0">The complaint has been permanently removed.</p>
                    </div>
                </div>,
                document.body
            )}
        </div >
    );
};

export default ComplaintsManagement;
