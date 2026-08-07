import { Save, Plus, X, ExternalLink, Edit2, Trash2 } from 'lucide-react';
import LoadingTransition from '../../components/Common/LoadingTransition';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import './Admin.css'; // Reusing Admin styles

const ContentManagement = () => {
    const [links, setLinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        url: '',
        category: 'General',
        description: ''
    });

    const { user } = useAuth();
    const [adminUser, setAdminUser] = useState(null);

    const categories = ['General', 'Academic', 'Exam', 'Utility', 'External Resource'];

    useEffect(() => {
        const fetchAdminData = async () => {
            if (!user?.uid) return;
            const snapshot = await getDocs(collection(db, 'users'));
            const data = snapshot.docs.find(doc => doc.id === user.uid)?.data();
            setAdminUser(data);
        };
        fetchAdminData();
    }, [user]);


    useEffect(() => {
        fetchLinks();
    }, []);

    const fetchLinks = async () => {
        try {
            const q = query(collection(db, 'content_links'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const linksData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setLinks(linksData);
        } catch (error) {
            console.error("Error fetching links:", error);
        } finally {
            setTimeout(() => {
                setLoading(false);
            }, 2000);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.url) return;

        try {
            const linkData = {
                ...formData,
                updatedAt: new Date().toISOString()
            };

            if (isEditing && currentId) {
                await updateDoc(doc(db, 'content_links', currentId), linkData);
            } else {
                linkData.createdAt = new Date().toISOString();
                await addDoc(collection(db, 'content_links'), linkData);
            }

            // Reset Form and Refresh
            resetForm();
            fetchLinks();
        } catch (error) {
            console.error("Error saving link:", error);
            alert("Failed to save link. Please try again.");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this link?')) {
            try {
                await deleteDoc(doc(db, 'content_links', id));
                fetchLinks();
            } catch (error) {
                console.error("Error deleting link:", error);
            }
        }
    };

    const handleEdit = (link) => {
        setFormData({
            title: link.title,
            url: link.url,
            category: link.category || 'General',
            description: link.description || ''
        });
        setCurrentId(link.id);
        setIsEditing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setFormData({
            title: '',
            url: '',
            category: 'General',
            description: ''
        });
        setIsEditing(false);
        setCurrentId(null);
    };

    return (
        <div className="admin-container">
            <div className="page-header-v2">
                <div className="header-accent-bar"></div>
                <div className="header-content-v2">
                    <h1 className="page-title-v2">Resource Management</h1>
                    <p className="page-subtitle-v2">Manage quick links and external resources for student access.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Section */}
                <div className="lg:col-span-1">
                    <div className="section-card p-6 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] sticky top-6">
                        <h2 className="text-lg font-semibold mb-4 text-[var(--color-text)]">
                            {isEditing ? 'Edit Link' : 'Add New Link'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Title</label>
                                <input
                                    type="text"
                                    className="w-full p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                                    placeholder="e.g. Exam Schedule"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">URL</label>
                                <input
                                    type="url"
                                    className="w-full p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                                    placeholder="https://"
                                    value={formData.url}
                                    onChange={e => setFormData({ ...formData, url: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Category</label>
                                <select
                                    className="w-full p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Description (Optional)</label>
                                <textarea
                                    className="w-full p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                                    rows="3"
                                    placeholder="Short description..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="submit"
                                    className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                                >
                                    {isEditing ? <Save size={18} /> : <Plus size={18} />}
                                    {isEditing ? 'Update Link' : 'Add Link'}
                                </button>
                                {isEditing && (
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                {/* List Section */}
                <div className="lg:col-span-2">
                    <div className="section-card p-6 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]">
                        <h2 className="text-lg font-semibold mb-4 text-[var(--color-text)]">Existing Links</h2>

                        {loading ? (
                            <LoadingTransition message="System Content Loading" persistent />
                        ) : links.length === 0 ? (
                            <div className="text-center py-8 text-[var(--color-text-muted)]">No links found. Add one to get started.</div>
                        ) : (
                            <div className="space-y-4">
                                {links.map(link => (
                                    <div
                                        key={link.id}
                                        className="flex items-start justify-between p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] hover:shadow-sm transition-shadow"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${link.category === 'Academic' ? 'bg-blue-100 text-blue-700' :
                                                    link.category === 'Exam' ? 'bg-red-100 text-red-700' :
                                                        link.category === 'Utility' ? 'bg-purple-100 text-purple-700' :
                                                            'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {link.category}
                                                </span>
                                                <h3 className="font-semibold text-[var(--color-text)]">{link.title}</h3>
                                            </div>
                                            <p className="text-sm text-[var(--color-text-muted)] mb-2">{link.description}</p>
                                            <a
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-primary-600 hover:underline flex items-center gap-1"
                                            >
                                                {link.url}
                                                <ExternalLink size={12} />
                                            </a>
                                        </div>

                                        <div className="flex gap-2 ml-4">
                                            <button
                                                onClick={() => handleEdit(link)}
                                                className="action-btn text-blue-600"
                                                title="Edit"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(link.id)}
                                                className="action-btn delete"
                                                title="Delete"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContentManagement;
