import { Clock, BookOpen, CheckCircle, XCircle, Search, Loader, Trash2, Library } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { booksDb } from '../../config/firebase';
import './BookOrdersManagement.css';

const BookOrdersManagement = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [savingNotes, setSavingNotes] = useState(false);

    useEffect(() => {
        const q = query(collection(booksDb, 'bookOrders'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const ordersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date()
            }));
            setOrders(ordersData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching book orders: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleUpdateStatus = async (orderId, newStatus) => {
        try {
            const orderRef = doc(booksDb, 'bookOrders', orderId);
            await updateDoc(orderRef, { status: newStatus });
        } catch (error) {
            console.error("Error updating order status: ", error);
            alert("Failed to update status. Please try again.");
        }
    };

    const handleSaveAdminNotes = async () => {
        if (!selectedOrder) return;
        setSavingNotes(true);
        try {
            const orderRef = doc(booksDb, 'bookOrders', selectedOrder.id);
            await updateDoc(orderRef, { adminNotes: adminNotes });
            alert("Admin notes updated successfully.");
            setSelectedOrder(prev => ({...prev, adminNotes: adminNotes}));
            // Update in local state to reflect immediately
            setOrders(prev => prev.map(o => o.id === selectedOrder.id ? {...o, adminNotes: adminNotes} : o));
        } catch (error) {
            console.error("Error updating admin notes:", error);
            alert("Failed to update admin notes.");
        } finally {
            setSavingNotes(false);
        }
    };

    const handleDeleteOrder = async (orderId) => {
        if (!window.confirm("Are you sure you want to delete this order? This action cannot be undone.")) return;
        try {
            await deleteDoc(doc(booksDb, 'bookOrders', orderId));
        } catch (error) {
            console.error("Error deleting order: ", error);
            alert("Failed to delete order. Please try again.");
        }
    };

    const getStatusBadge = (status) => {
        switch(status) {
            case 'Pending':
                return <span className="status-badge pending"><Clock size={14}/> Pending</span>;
            case 'Approved':
                return <span className="status-badge approved"><BookOpen size={14}/> Approved</span>;
            case 'Completed':
                return <span className="status-badge completed"><CheckCircle size={14}/> Completed</span>;
            case 'Rejected':
                return <span className="status-badge rejected"><XCircle size={14}/> Rejected</span>;
            default:
                return <span className="status-badge"><Clock size={14}/> {status}</span>;
        }
    };

    const filteredOrders = orders.filter(order => 
        order.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.studentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.bookTitle?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="book-orders-container">
            <div className="book-orders-header">
                <div className="header-title-section">
                    <div className="header-icon-box">
                        <Library size={24} />
                    </div>
                    <div className="header-title-text">
                        <h1>Book Orders Management</h1>
                        <p>View and manage book requests from students.</p>
                    </div>
                </div>

                <div className="search-bar-wrapper">
                    <input 
                        type="text" 
                        placeholder="Search orders..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                    <Search className="search-icon" size={18} />
                </div>
            </div>

            <div className="orders-table-card">
                <div className="orders-table-wrapper">
                    <table className="orders-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Student</th>
                                <th>Book Info</th>
                                <th>Notes</th>
                                <th>Status</th>
                                <th style={{textAlign: 'right'}}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6">
                                        <div className="empty-state">
                                            <Loader className="animate-spin" size={32} />
                                            <span>Loading orders...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="6">
                                        <div className="empty-state">
                                            <div className="empty-icon-box">
                                                <Library size={32} />
                                            </div>
                                            <h3>No book orders found</h3>
                                            <p>There are currently no orders matching your search.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map(order => (
                                    <tr 
                                        key={order.id} 
                                        onClick={() => { setSelectedOrder(order); setAdminNotes(order.adminNotes || ''); }}
                                        style={{ cursor: 'pointer' }}
                                        className="order-row"
                                    >
                                        <td>
                                            <div className="primary-text">{order.createdAt.toLocaleDateString()}</div>
                                            <div className="secondary-text">
                                                {order.createdAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="primary-text">{order.studentName}</div>
                                            <div className="highlight-tag">{order.studentId}</div>
                                        </td>
                                        <td style={{maxWidth: '250px'}}>
                                            <div className="primary-text" style={{wordBreak: 'break-word'}}>{order.bookTitle}</div>
                                            {order.author && <div className="secondary-text">By {order.author}</div>}
                                            <div className="highlight-tag" style={{color: 'var(--color-primary-600, #4f46e5)', background: 'rgba(99, 102, 241, 0.1)'}}>Qty: {order.quantity}</div>
                                        </td>
                                        <td style={{maxWidth: '250px'}}>
                                            <div className="secondary-text" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: order.adminNotes ? '0.4rem' : '0'}}>
                                                {order.notes || <span style={{fontStyle: 'italic', opacity: 0.7}}>No notes</span>}
                                            </div>
                                            {order.adminNotes && (
                                                <div style={{
                                                    backgroundColor: '#fffbeb', 
                                                    borderLeft: '3px solid #fbbf24', 
                                                    padding: '0.3rem 0.5rem', 
                                                    borderRadius: '0 4px 4px 0',
                                                    fontSize: '0.75rem',
                                                    color: '#92400e',
                                                    display: '-webkit-box', 
                                                    WebkitLineClamp: 2, 
                                                    WebkitBoxOrient: 'vertical', 
                                                    overflow: 'hidden',
                                                    marginTop: '0.25rem'
                                                }}>
                                                    <span style={{fontWeight: '700', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '0.1rem'}}>Admin Note</span>
                                                    {order.adminNotes}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            {getStatusBadge(order.status)}
                                        </td>
                                        <td>
                                            <div className="action-buttons" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }}
                                                    className="action-btn delete-btn"
                                                    title="Delete Order"
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        padding: '0.4rem',
                                                        backgroundColor: '#fef2f2',
                                                        color: '#ef4444',
                                                        border: '1px solid #fca5a5',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Order Details Modal */}
            {selectedOrder && createPortal(
                <div className="admin-modal-overlay" onClick={() => setSelectedOrder(null)}>
                    <div className="admin-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <h2>Order Details</h2>
                            <button className="admin-modal-close" onClick={() => setSelectedOrder(null)}>
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="admin-modal-body">
                            <div className="admin-modal-grid">
                                <div className="admin-modal-section-title">Order Information</div>
                                <div className="admin-modal-field">
                                    <label>Order ID</label>
                                    <div>{selectedOrder.id}</div>
                                </div>
                                <div className="admin-modal-field">
                                    <label>Status</label>
                                    <div>
                                        <select 
                                            value={selectedOrder.status || 'Pending'}
                                            onChange={(e) => {
                                                handleUpdateStatus(selectedOrder.id, e.target.value);
                                                setSelectedOrder({...selectedOrder, status: e.target.value});
                                            }}
                                            className={`status-select-dropdown status-badge-${(selectedOrder.status || 'pending').toLowerCase()}`}
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="Approved">Approved</option>
                                            <option value="Completed">Completed</option>
                                            <option value="Rejected">Rejected</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="admin-modal-field">
                                    <label>Book Title</label>
                                    <div>{selectedOrder.bookTitle}</div>
                                </div>
                                <div className="admin-modal-field">
                                    <label>Author</label>
                                    <div>{selectedOrder.author || 'N/A'}</div>
                                </div>
                                <div className="admin-modal-field">
                                    <label>Quantity</label>
                                    <div>{selectedOrder.quantity}</div>
                                </div>
                                
                                <div className="admin-modal-section-title">Customer & Delivery Info</div>
                                <div className="admin-modal-field">
                                    <label>Student Name</label>
                                    <div>{selectedOrder.studentName}</div>
                                </div>
                                <div className="admin-modal-field">
                                    <label>Student ID</label>
                                    <div>{selectedOrder.studentId}</div>
                                </div>
                                <div className="admin-modal-field">
                                    <label>Mobile Number</label>
                                    <div>{selectedOrder.mobileNumber || 'N/A'}</div>
                                </div>
                                <div className="admin-modal-field">
                                    <label>Payment Method</label>
                                    <div style={{ textTransform: 'uppercase' }}>{selectedOrder.paymentMethod || 'N/A'}</div>
                                </div>
                                <div className="admin-modal-field full-width">
                                    <label>Delivery Address</label>
                                    <div className="notes-box">{selectedOrder.address || 'N/A'}</div>
                                </div>

                                <div className="admin-modal-section-title">Notes & Remarks</div>
                                <div className="admin-modal-field full-width">
                                    <label>Student Notes</label>
                                    <div className="notes-box">{selectedOrder.notes || 'No notes provided by student.'}</div>
                                </div>
                                <div className="admin-modal-field full-width">
                                    <label>Admin Remarks (Internal)</label>
                                    <textarea 
                                        value={adminNotes}
                                        onChange={(e) => setAdminNotes(e.target.value)}
                                        placeholder="Add notes for this order (e.g. tracking number, reasons for rejection, location)..."
                                        className="admin-notes-textarea"
                                    />
                                    <button 
                                        className="admin-btn-save"
                                        onClick={handleSaveAdminNotes}
                                        disabled={savingNotes}
                                    >
                                        {savingNotes ? <Loader size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                        {savingNotes ? 'Saving...' : 'Save Notes'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default BookOrdersManagement;
