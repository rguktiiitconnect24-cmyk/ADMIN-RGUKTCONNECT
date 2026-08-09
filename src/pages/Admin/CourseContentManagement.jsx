import { ClipboardPaste, Copy, Scissors, ChevronRight, Trash2, Plus, Edit2, HelpCircle, Video, FileText, X, BookOpen, AlertCircle, Loader2, GripVertical, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import UnitQuizManager from '../../components/Admin/UnitQuizManager';
import FileUploadWidget from '../../components/Admin/FileUploadWidget';
import CustomSelect from '../../components/Common/CustomSelect';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { collection, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { PROGRAMS } from '../../config/academics';
import {
    fetchDynamicSubjects, createSubject, updateSubject, deleteSubject, updateSubjectOrder,
    fetchDynamicUnits, createUnit, updateUnit, deleteUnit,
    fetchDynamicModules, createModule, updateModule, deleteModule,
    duplicateSubject, duplicateUnit, duplicateModule
} from '../../utils/academicsUtils';
import { pdfService } from '../../services/pdfService';
import { isDepartmentAllowed } from '../../utils/rbacUtils';
import './Admin.css';

const convertDriveLink = (url) => {
    if (!url) return url;
    // Check if it's a Google Drive link that isn't already a direct download link
    if (url.includes('drive.google.com') && !url.includes('export=download')) {
        const match = url.match(/(?:\/d\/|id=)([-\w]{25,})/);
        if (match && match[1]) {
            return `https://drive.google.com/uc?export=download&id=${match[1]}`;
        }
    }
    return url;
};

const CourseContentManagement = () => {
    // Selection State
    const [selectedProgram, setSelectedProgram] = useState(PROGRAMS[0]);
    const [selectedYear, setSelectedYear] = useState(PROGRAMS[0].years[0]);
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [selectedSemester, setSelectedSemester] = useState(PROGRAMS[0].years[0].semesters[0]);

    // Data State
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [units, setUnits] = useState([]);
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [modules, setModules] = useState([]);
    
    // Drag state
    const [draggedSubjectIndex, setDraggedSubjectIndex] = useState(null);
    const [dragOverSubjectIndex, setDragOverSubjectIndex] = useState(null);

    // Multi-select State
    const [selectedSubjectIds, setSelectedSubjectIds] = useState(new Set()); // Set of IDs
    const [isBulkMoving, setIsBulkMoving] = useState(false);

    // Loading State
    const [loadingSubjects, setLoadingSubjects] = useState(false);
    const [loadingUnits, setLoadingUnits] = useState(false);
    const [loadingModules, setLoadingModules] = useState(false);

    // Form Modal State
    const [activeModal, setActiveModal] = useState(null); // 'subject', 'unit', 'module'
    const [editingItem, setEditingItem] = useState(null); // Item being edited
    const [newItemLabel, setNewItemLabel] = useState('');
    const [newModuleVideo, setNewModuleVideo] = useState('');
    const [newModulePdf, setNewModulePdf] = useState('');
    const [newModulePdfName, setNewModulePdfName] = useState('');
    const [newModuleHandwrittenNotes, setNewModuleHandwrittenNotes] = useState('');
    const [newModuleHandwrittenNotesName, setNewModuleHandwrittenNotesName] = useState('');
    const [additionalNotes, setAdditionalNotes] = useState([]); // [{ label, url }]
    const [newUnitIsQuizEnabled, setNewUnitIsQuizEnabled] = useState(true);

    const [deleteConfirmation, setDeleteConfirmation] = useState({
        isOpen: false,
        type: null, // 'subject', 'unit', 'module'
        id: null,
        title: ''
    });

    const [isDeleting, setIsDeleting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Accordion State
    const [isResourcesExpanded, setIsResourcesExpanded] = useState(true);

    const [deletingFileUrl, setDeletingFileUrl] = useState(null);
    const [fileDeleteModal, setFileDeleteModal] = useState({
        isOpen: false,
        fileIdOrUrl: null,
        onConfirm: null
    });


    // Modal State for Move/Add Subject
    const [targetYear, setTargetYear] = useState('');
    const [targetSemester, setTargetSemester] = useState('');

    // Quiz Manager State
    const [quizManagerTarget, setQuizManagerTarget] = useState(null); // { id, label }

    const { user } = useAuth();
    const [adminUser, setAdminUser] = useState(null);

    const isSuperAdmin = !user?.targetDepartments || user.targetDepartments.length === 0 || user.permissions?.includes('all');
    
    const allowedPrograms = PROGRAMS.filter(p => {
        if (isSuperAdmin) return true;
        if (p.id === 'puc') {
            return user.targetDepartments.some(d => d.toLowerCase() === 'puc');
        }
        if (p.id === 'btech') {
            return user.targetDepartments.some(d => d.toLowerCase() !== 'puc');
        }
        return true;
    });

    // Clipboard State
    const [clipboard, setClipboard] = useState(null); // { type: 'subject' | 'unit' | 'module', id: '...' }

    // Toast State
    const [toast, setToast] = useState({
        visible: false,
        message: '',
        type: 'success' // 'success' or 'error'
    });

    const showToast = (message, type = 'success') => {
        setToast({ visible: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    };

    // --- Effects ---

    const getAllowedBranches = (branches) => {
        if (!branches) return null;
        return branches.filter(b => isDepartmentAllowed(b.id, user) || isDepartmentAllowed(b.label, user));
    };

    // Ensure selected program is an allowed program
    useEffect(() => {
        if (allowedPrograms.length > 0 && !allowedPrograms.find(p => p.id === selectedProgram.id)) {
            const firstAllowed = allowedPrograms[0];
            setSelectedProgram(firstAllowed);
            setSelectedYear(firstAllowed.years[0]);
            
            // Allow the other useEffect (on line 234) to handle branch/semester init
        }
    }, [user, selectedProgram]);

    // Ensure selected branch is auto-selected if available and currently null
    useEffect(() => {
        if (selectedYear?.branches && !selectedBranch) {
            const branches = getAllowedBranches(selectedYear.branches);
            if (branches && branches.length > 0) {
                setSelectedBranch(branches[0]);
                setSelectedSemester(branches[0].semesters[0]);
            }
        }
    }, [user, selectedYear, selectedBranch]);

    // Load Subjects when hierarchy changes
    useEffect(() => {
        // If the current year has branches, wait until a branch is selected
        if (selectedYear?.branches && !selectedBranch) {
            setSubjects([]);
            return;
        }
        if (selectedSemester) {
            loadSubjects();
        }
        setSelectedSubject(null);
        setSelectedUnit(null);
        setSelectedSubjectIds(new Set()); // Clear selection on view change
    }, [selectedProgram, selectedYear, selectedBranch, selectedSemester]);

    // Load Units when Subject changes
    useEffect(() => {
        if (selectedSubject) {
            loadUnits();
            setSelectedUnit(null);
        } else {
            setUnits([]);
        }
    }, [selectedSubject]);

    // Load Modules when Unit changes
    useEffect(() => {
        if (selectedUnit) {
            loadModules();
        } else {
            setModules([]);
        }
    }, [selectedUnit]);

    // --- Loading & Utility Functions ---

    const promptFileDelete = (fileIdOrUrl, setUrlState) => {
        if (!fileIdOrUrl) return;
        if (fileIdOrUrl.startsWith('http')) {
            setUrlState('');
            return;
        }
        setFileDeleteModal({
            isOpen: true,
            fileIdOrUrl,
            onConfirm: setUrlState
        });
    };

    const confirmFileDelete = async () => {
        const { fileIdOrUrl, onConfirm } = fileDeleteModal;
        if (!fileIdOrUrl || !onConfirm) return;

        setDeletingFileUrl(fileIdOrUrl);
        // We do not close the modal here, we let the button show "Deleting..."

        try {
            const docRef = doc(db, 'pdfs', fileIdOrUrl);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.gdFileId && data.backendUrl) {
                    if (typeof pdfService.deleteFileFromDrive === 'function') {
                        try {
                            await pdfService.deleteFileFromDrive(data.gdFileId, data.backendUrl);
                        } catch (e) {
                            console.error("Drive deletion failed", e);
                        }
                    } else {
                        console.warn("deleteFileFromDrive not implemented in pdfService");
                    }
                }
                await deleteDoc(docRef);
            }
            
            onConfirm('');
            if (window.showToast) window.showToast('File completely deleted', 'success');
        } catch (error) {
            console.error('Delete error:', error);
            if (window.showToast) window.showToast('Failed to delete from server, but removed from module', 'error');
            onConfirm('');
        } finally {
            setDeletingFileUrl(null);
            setFileDeleteModal({ isOpen: false, fileIdOrUrl: null, onConfirm: null });
        }
    };

    const loadSubjects = async () => {
        if (!selectedSemester) return;
        setLoadingSubjects(true);
        // Combine static and dynamic
        const staticSubjects = selectedSemester.subjects || [];
        const dynamic = await fetchDynamicSubjects(selectedProgram.id, selectedYear.id, selectedBranch?.id || null, selectedSemester.id);
        setSubjects([...staticSubjects, ...dynamic]);

        setTimeout(() => {
            setLoadingSubjects(false);
        }, 2000);
    };

    const loadUnits = async () => {
        setLoadingUnits(true);
        const staticUnits = selectedSubject.units || [];
        // Even if subject is static, we can check for dynamic units added to it (using its ID)
        const dynamic = await fetchDynamicUnits(selectedSubject.id);
        setUnits([...staticUnits, ...dynamic]);
        setLoadingUnits(false);
    };

    const loadModules = async () => {
        setLoadingModules(true);
        const staticModules = selectedUnit.modules || [];
        const dynamic = await fetchDynamicModules(selectedUnit.id);
        setModules([...staticModules, ...dynamic]);
        setLoadingModules(false);
    };

    // --- Security ---
    useEffect(() => {
        const fetchAdminData = async () => {
            if (!user?.uid) return;
            const snapshot = await getDocs(collection(db, 'users'));
            const data = snapshot.docs.find(doc => doc.id === user.uid)?.data();
            setAdminUser(data);
        };
        fetchAdminData();
    }, [user]);


    // --- Actions ---

    const openAddModal = (type) => {
        setEditingItem(null);
        setNewModuleVideo('');
        setNewModulePdf('');
        setNewModulePdfName('');
        setNewModuleHandwrittenNotes('');
        setNewModuleHandwrittenNotesName('');
        setAdditionalNotes([]);

        // Default target to current selection
        if (type === 'subject') {
            setNewItemLabel('');
            setTargetYear(selectedYear.id);
            setTargetSemester(selectedSemester.id);
        } else if (type === 'unit') {
            setNewItemLabel(`unit-${units.length + 1}`);
        } else {
            setNewItemLabel('');
        }

        setActiveModal(type);
    };

    const openEditModal = (item, type) => {
        setEditingItem(item);
        setNewItemLabel(item.label);
        setNewModuleVideo(item.videoUrl || '');
        setNewModulePdf(item.pdfUrl || '');
        setNewModulePdfName(item.pdfName || '');
        setNewModuleHandwrittenNotes(item.handwrittenNotesUrl || '');
        setNewModuleHandwrittenNotesName(item.handwrittenNotesName || '');
        setAdditionalNotes(item.additionalNotes || []);
        setNewUnitIsQuizEnabled(item.isQuizEnabled !== false);

        if (type === 'subject') {
            setTargetYear(item.yearId || selectedYear.id);
            setTargetSemester(item.semesterId || selectedSemester.id);
        }

        setActiveModal(type);
    };

    const handleSave = async () => {
        if (!newItemLabel.trim()) return;

        setIsSaving(true);
        try {
            if (activeModal === 'subject') {
                if (editingItem) {
                    await updateSubject(editingItem.id, newItemLabel, targetYear, targetSemester, selectedProgram.id, selectedBranch?.id || null);
                    showToast('Subject updated successfully');
                } else {
                    await createSubject(selectedProgram.id, targetYear || selectedYear.id, selectedBranch?.id || null, targetSemester || selectedSemester.id, newItemLabel);
                    showToast('Subject created successfully');
                }
                loadSubjects();
            } else if (activeModal === 'unit') {
                if (editingItem) {
                    await updateUnit(editingItem.id, selectedSubject.id, newItemLabel, newModuleVideo, newModulePdf, newModulePdfName, additionalNotes, newUnitIsQuizEnabled);
                    showToast('Unit updated successfully');
                } else {
                    await createUnit(selectedSubject.id, newItemLabel, newModuleVideo, newModulePdf, newModulePdfName, additionalNotes, newUnitIsQuizEnabled);
                    showToast('Unit created successfully');
                }
                loadUnits();
                setSelectedUnit(null); // Reset unit selection to avoid stale state if needed, though mostly safe
            } else if (activeModal === 'module') {
                if (editingItem) {
                    await updateModule(editingItem.id, selectedUnit.id, newItemLabel, newModuleVideo, newModulePdf, newModulePdfName, newModuleHandwrittenNotes, newModuleHandwrittenNotesName, additionalNotes);
                    showToast('Module updated successfully');
                } else {
                    await createModule(selectedUnit.id, newItemLabel, newModuleVideo, newModulePdf, newModulePdfName, newModuleHandwrittenNotes, newModuleHandwrittenNotesName, additionalNotes);
                    showToast('Module created successfully');
                }
                loadModules();
            }

            setActiveModal(null);
            setEditingItem(null);
            setNewItemLabel('');
            setNewModuleVideo('');
            setNewModulePdf('');
            setNewModulePdfName('');
            setNewModuleHandwrittenNotes('');
            setNewModuleHandwrittenNotesName('');
            setAdditionalNotes([]);
            setNewUnitIsQuizEnabled(true);
        } catch (error) {
            console.error("Save failed:", error);
            showToast('Failed to save item', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteSubject = (id, isDynamic, label) => {
        if (!isDynamic) {
            alert("Cannot delete static subjects defined in config.");
            return;
        }
        setDeleteConfirmation({
            isOpen: true,
            type: 'subject',
            id,
            title: label
        });
    };

    const handleDeleteUnit = (id, isDynamic, label) => {
        if (!isDynamic) {
            alert("Cannot delete static units defined in config.");
            return;
        }
        setDeleteConfirmation({
            isOpen: true,
            type: 'unit',
            id,
            title: label
        });
    };

    const handleDeleteModule = (id, isDynamic, label) => {
        if (!isDynamic) {
            alert("Cannot delete static modules defined in config.");
            return;
        }
        setDeleteConfirmation({
            isOpen: true,
            type: 'module',
            id,
            title: label
        });
    };

    // --- Bulk Actions ---

    const toggleSelectAllSubjects = () => {
        if (selectedSubjectIds.size === subjects.filter(s => s.isDynamic).length && subjects.filter(s => s.isDynamic).length > 0) {
            setSelectedSubjectIds(new Set());
        } else {
            const dynamicIds = subjects.filter(s => s.isDynamic).map(s => s.id);
            setSelectedSubjectIds(new Set(dynamicIds));
        }
    };

    const toggleSubjectSelection = (id) => {
        const newSet = new Set(selectedSubjectIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedSubjectIds(newSet);
    };

    const handleBulkDelete = () => {
        if (selectedSubjectIds.size === 0) return;
        setDeleteConfirmation({
            isOpen: true,
            type: 'bulk_subjects',
            id: null,
            title: `${selectedSubjectIds.size} subjects`
        });
    };

    const openBulkMoveModal = () => {
        if (selectedSubjectIds.size === 0) return;
        setIsBulkMoving(true);
        setTargetYear(selectedYear.id);
        setTargetSemester(selectedSemester.id);
        setActiveModal('bulk_move_subjects');
    };

    const handleBulkMoveSave = async () => {
        setIsSaving(true);
        try {
            const updatePromises = Array.from(selectedSubjectIds).map(id =>
                updateSubject(id, subjects.find(s => s.id === id)?.label, targetYear, targetSemester, selectedProgram.id, selectedBranch?.id || null)
            );
            await Promise.all(updatePromises);
            showToast(`Moved ${selectedSubjectIds.size} subjects successfully`);
            setSelectedSubjectIds(new Set());
            setActiveModal(null);
            setIsBulkMoving(false);
            loadSubjects();
        } catch (error) {
            console.error("Bulk move failed:", error);
            showToast("Failed to move subjects", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDelete = async () => {
        setIsDeleting(true);
        const { type, id } = deleteConfirmation;

        try {
            if (type === 'subject') {
                await deleteSubject(id, selectedProgram.id, selectedYear.id, selectedBranch?.id || null, selectedSemester.id);
                if (selectedSubject?.id === id) setSelectedSubject(null);
                loadSubjects();
                showToast('Subject deleted successfully');
            } else if (type === 'bulk_subjects') {
                const deletePromises = Array.from(selectedSubjectIds).map(id => deleteSubject(id, selectedProgram.id, selectedYear.id, selectedBranch?.id || null, selectedSemester.id));
                await Promise.all(deletePromises);
                setSelectedSubjectIds(new Set());
                setSelectedSubject(null);
                loadSubjects();
                showToast('Selected subjects deleted successfully');
            } else if (type === 'unit') {
                await deleteUnit(id, selectedSubject.id);
                if (selectedUnit?.id === id) setSelectedUnit(null);
                loadUnits();
                showToast('Unit deleted successfully');
            } else if (type === 'module') {
                await deleteModule(id, selectedUnit.id);
                loadModules();
                showToast('Module deleted successfully');
            }
            setDeleteConfirmation({ isOpen: false, type: null, id: null, title: '' });
        } catch (error) {
            console.error("Delete failed:", error);
            showToast('Failed to delete item', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    // --- Paste/Copy ---
    const handleCopy = (type, id) => {
        setClipboard({ type, id });
        showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} copied to clipboard`, 'success');
    };

    const handleBulkClipboard = (operation) => {
        const items = Array.from(selectedSubjectIds).map(id => {
            const subject = subjects.find(s => s.id === id);
            return { id, label: subject?.label };
        });
        setClipboard({ type: 'bulk_subject', items, operation });
        showToast(`Selected subjects ready to ${operation}`, 'success');
        setSelectedSubjectIds(new Set());
    };

    const handleDragStart = (e, index) => {
        setDraggedSubjectIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        // Add a class after a tiny delay so the dragged ghost image looks normal
        setTimeout(() => {
            if (e.target) e.target.classList.add('dragging');
        }, 0);
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (draggedSubjectIndex === null) return;
        if (dragOverSubjectIndex !== index) {
            setDragOverSubjectIndex(index);
        }
    };

    const handleDragEnd = (e) => {
        setDraggedSubjectIndex(null);
        setDragOverSubjectIndex(null);
        if (e.target) e.target.classList.remove('dragging');
    };

    const handleDropSubject = async (e, dropIndex) => {
        e.preventDefault();
        const dragIndex = draggedSubjectIndex;
        setDraggedSubjectIndex(null);
        setDragOverSubjectIndex(null);
        if (e.target) e.target.classList.remove('dragging');

        if (dragIndex === null || dragIndex === dropIndex) return;

        const newSubjects = [...subjects];
        const [movedItem] = newSubjects.splice(dragIndex, 1);
        newSubjects.splice(dropIndex, 0, movedItem);

        // Reassign all orders based on new array
        let orderChanged = false;
        newSubjects.forEach((sub, i) => {
            if (sub.order !== i) {
                sub.order = i;
                orderChanged = true;
            }
        });

        if (!orderChanged) return;

        // Optimistic UI update
        setSubjects(newSubjects);

        try {
            // Bulk update all subjects to be safe
            await Promise.all(newSubjects.map(sub => 
                updateSubjectOrder(sub.id, sub.order, selectedProgram.id, selectedYear.id, selectedSemester.id)
            ));
            showToast('Subject order updated successfully', 'success');
        } catch (error) {
            console.error("Failed to reorder:", error);
            showToast('Failed to update order', 'error');
            loadSubjects(); // Revert on failure
        }
    };

    const handlePaste = async (targetType) => {
        if (!clipboard) return;
        setIsSaving(true);
        try {
            if (targetType === 'subject' && clipboard.type === 'bulk_subject') {
                if (clipboard.operation === 'copy') {
                    for (const item of clipboard.items) {
                        await duplicateSubject(item.id, selectedProgram.id, selectedYear.id, selectedBranch?.id || null, selectedSemester.id);
                    }
                    showToast(`Copied ${clipboard.items.length} subjects successfully`);
                } else if (clipboard.operation === 'cut') {
                    for (const item of clipboard.items) {
                        await updateSubject(item.id, item.label, selectedYear.id, selectedSemester.id, selectedProgram.id, selectedBranch?.id || null);
                    }
                    showToast(`Moved ${clipboard.items.length} subjects successfully`);
                }
                loadSubjects();
            } else if (targetType === 'subject' && clipboard.type === 'subject') {
                await duplicateSubject(clipboard.id, selectedProgram.id, selectedYear.id, selectedBranch?.id || null, selectedSemester.id);
                loadSubjects();
                showToast('Subject pasted successfully');
            } else if (targetType === 'unit' && clipboard.type === 'unit') {
                await duplicateUnit(clipboard.id, selectedSubject.id);
                loadUnits();
                showToast('Unit pasted successfully');
            } else if (targetType === 'module' && clipboard.type === 'module') {
                await duplicateModule(clipboard.id, selectedUnit.id);
                loadModules();
                showToast('Module pasted successfully');
            }
            setClipboard(null);
        } catch (error) {
            console.error("Paste failed:", error);
            showToast('Failed to paste item', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // --- Helpers ---

    const handleProgramChange = (val) => {
        const prog = PROGRAMS.find(p => p.id === val);
        const firstYear = prog.years[0];
        setSelectedProgram(prog);
        setSelectedYear(firstYear);
        const allowedBranches = getAllowedBranches(firstYear.branches);
        if (allowedBranches && allowedBranches.length > 0) {
            setSelectedBranch(allowedBranches[0]);
            setSelectedSemester(allowedBranches[0].semesters[0]);
        } else {
            setSelectedBranch(null);
            setSelectedSemester(firstYear.semesters[0]);
        }
    };

    const handleYearChange = (val) => {
        const yr = selectedProgram.years.find(y => y.id === val);
        setSelectedYear(yr);
        const allowedBranches = getAllowedBranches(yr.branches);
        if (allowedBranches && allowedBranches.length > 0) {
            setSelectedBranch(allowedBranches[0]);
            setSelectedSemester(allowedBranches[0].semesters[0]);
        } else {
            setSelectedBranch(null);
            setSelectedSemester(yr.semesters[0]);
        }
    };

    const handleSemesterChange = (val) => {
        const semesters = selectedBranch ? selectedBranch.semesters : selectedYear.semesters;
        const sem = semesters.find(s => s.id === val);
        setSelectedSemester(sem);
    };

    const handleBranchChange = (val) => {
        const branch = selectedYear.branches.find(b => b.id === val);
        setSelectedBranch(branch);
        setSelectedSemester(branch.semesters[0]);
    };

    const handleAddNote = () => {
        setAdditionalNotes([...additionalNotes, { label: '', url: '' }]);
    };

    const handleRemoveNote = (index) => {
        const updated = [...additionalNotes];
        updated.splice(index, 1);
        setAdditionalNotes(updated);
    };

    const handleNoteChange = (index, field, value) => {
        const updated = [...additionalNotes];
        updated[index] = { ...updated[index], [field]: value };
        setAdditionalNotes(updated);
    };

    return (
        <div className="admin-container">
            <div className="page-header-v2">
                <div className="header-accent-bar"></div>
                <div className="header-content-v2">
                    <h1 className="page-title-v2">Course Content Manager</h1>
                    <p className="page-subtitle-v2">Manage subjects, units, and learning materials effectively.</p>
                </div>
            </div>

            {/* Hierarchy Selectors */}
            <div className="section-card selectors-wrapper bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] mb-8 flex flex-col md:flex-row gap-4 p-4 z-20 items-center justify-between">
                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <CustomSelect 
                        label="Degree Program"
                        options={allowedPrograms.map(p => ({ value: p.id, label: p.label }))} 
                        value={selectedProgram.id} 
                        onChange={handleProgramChange} 
                    />
                    <CustomSelect 
                        label="Academic Year"
                        options={selectedProgram.years.map(y => ({ value: y.id, label: y.label }))} 
                        value={selectedYear.id} 
                        onChange={handleYearChange} 
                    />
                    {selectedYear.branches && (
                        <CustomSelect 
                            label="Branch"
                            options={getAllowedBranches(selectedYear.branches).map(b => ({ value: b.id, label: b.label }))} 
                            value={selectedBranch?.id || ''} 
                            onChange={handleBranchChange} 
                        />
                    )}
                    {(!selectedYear.branches || selectedBranch) && (
                        <CustomSelect 
                            label="Active Semester"
                            options={(selectedBranch ? selectedBranch.semesters : selectedYear.semesters).map(s => ({ value: s.id, label: s.label }))} 
                            value={selectedSemester?.id || ''} 
                            onChange={handleSemesterChange} 
                        />
                    )}
                </div>
            </div>

            {(!selectedYear.branches || selectedBranch) && (
                <div className="course-manager-grid">

                {/* Column 1: Subjects */}
                <div className="manager-column">
                    <div className="column-header flex-wrap" style={{ gap: '8px', rowGap: '12px' }}>
                        <div className="flex items-start gap-2 min-w-max">
                            <input
                                type="checkbox"
                                className="custom-checkbox mt-1"
                                checked={subjects.length > 0 && subjects.filter(s => s.isDynamic).length > 0 && selectedSubjectIds.size === subjects.filter(s => s.isDynamic).length}
                                onChange={toggleSelectAllSubjects}
                                disabled={subjects.filter(s => s.isDynamic).length === 0}
                            />
                            <div className="flex flex-col">
                                <h3 className="whitespace-nowrap m-0 leading-tight text-[1.1rem]">Subjects</h3>
                                {selectedSubjectIds.size > 0 && <span className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">selected {selectedSubjectIds.size}</span>}
                            </div>
                        </div>
                        <div className="flex flex-wrap justify-end ml-auto items-center" style={{ gap: '10px' }}>
                            {(clipboard?.type === 'subject' || clipboard?.type === 'bulk_subject') && (
                                <button onClick={() => handlePaste('subject')} className="action-btn !w-7 !h-7 text-blue-600 bg-blue-50 hover:bg-blue-100" title="Paste Subject">
                                    <ClipboardPaste size={14} />
                                </button>
                            )}
                            {selectedSubjectIds.size > 0 && (
                                <>
                                    <button onClick={() => handleBulkClipboard('copy')} className="action-btn !w-7 !h-7 text-green-600 bg-green-50 hover:bg-green-100" title="Copy Selected">
                                        <Copy size={14} />
                                    </button>
                                    <button onClick={() => handleBulkClipboard('cut')} className="action-btn !w-7 !h-7 text-orange-600 bg-orange-50 hover:bg-orange-100" title="Cut Selected">
                                        <Scissors size={14} />
                                    </button>
                                    <button onClick={openBulkMoveModal} className="action-btn !w-7 !h-7 text-blue-600 bg-blue-50 hover:bg-blue-100" title="Move Selected">
                                        <ChevronRight size={14} />
                                    </button>
                                    <button onClick={handleBulkDelete} className="action-btn !w-7 !h-7 text-red-600 bg-red-50 hover:bg-red-100" title="Delete Selected">
                                        <Trash2 size={14} />
                                    </button>
                                </>
                            )}
                            <button onClick={() => openAddModal('subject')} className="add-btn flex items-center justify-center !w-7 !h-7"><Plus size={14} /></button>
                        </div>
                    </div>
                    <div className="column-content">
                        {loadingSubjects ? (
                            <div className="space-y-2">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="manager-item" style={{ pointerEvents: 'none' }}>
                                        <div className="skeleton" style={{ width: i % 2 === 0 ? '60%' : '80%', height: '20px', borderRadius: '4px' }}></div>
                                    </div>
                                ))}
                            </div>
                        ) :
                            subjects.length === 0 ? <div className="empty-state">No subjects</div> :
                                subjects.map((sub, index) => (
                                    <div
                                        key={sub.id}
                                        className={`manager-item ${selectedSubject?.id === sub.id ? 'active' : ''} ${draggedSubjectIndex === index ? 'dragging' : ''} ${dragOverSubjectIndex === index ? 'drag-over' : ''}`}
                                        onClick={() => setSelectedSubject(sub)}
                                        draggable={sub.isDynamic}
                                        onDragStart={(e) => handleDragStart(e, index)}
                                        onDragOver={(e) => handleDragOver(e, index)}
                                        onDragEnd={handleDragEnd}
                                        onDrop={(e) => handleDropSubject(e, index)}
                                    >
                                        {sub.isDynamic && (
                                            <div onClick={e => e.stopPropagation()} className="mr-3 flex items-center gap-3">
                                                <div className="drag-handle text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                                    <GripVertical size={16} />
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    className="custom-checkbox"
                                                    checked={selectedSubjectIds.has(sub.id)}
                                                    onChange={() => toggleSubjectSelection(sub.id)}
                                                />
                                            </div>
                                        )}
                                        <span className="flex-1 truncate">{sub.label}</span>
                                        {sub.isDynamic && (
                                            <div className="flex gap-2">
                                                <button onClick={(e) => { e.stopPropagation(); handleCopy('subject', sub.id); }} className="action-btn text-green-500" title="Copy Subject">
                                                    <Copy size={14} />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); openEditModal(sub, 'subject'); }} className="action-btn text-blue-500">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteSubject(sub.id, true, sub.label) }} className="action-btn delete">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))
                        }
                    </div>
                </div>

                {/* Column 2: Units */}
                <div className="manager-column">
                    <div className="column-header">
                        <h3>Units</h3>
                        <div className="flex gap-3">
                            {selectedSubject && clipboard?.type === 'unit' && (
                                <button onClick={() => handlePaste('unit')} className="action-btn text-blue-600 bg-blue-50 hover:bg-blue-100" title="Paste Unit">
                                    <ClipboardPaste size={16} />
                                </button>
                            )}
                            {selectedSubject && <button onClick={() => openAddModal('unit')} className="add-btn"><Plus size={16} /></button>}
                        </div>
                    </div>
                    <div className="column-content">
                        {!selectedSubject ? <div className="empty-state">Select a Subject</div> :
                            loadingUnits ? (
                                <div className="space-y-2">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="manager-item" style={{ pointerEvents: 'none' }}>
                                            <div className="skeleton" style={{ width: i % 2 === 0 ? '70%' : '50%', height: '20px', borderRadius: '4px' }}></div>
                                        </div>
                                    ))}
                                </div>
                            ) :
                                units.length === 0 ? <div className="empty-state">No units found</div> :
                                    units.map(unit => (
                                        <div
                                            key={unit.id}
                                            className={`manager-item ${selectedUnit?.id === unit.id ? 'active' : ''}`}
                                            onClick={() => setSelectedUnit(unit)}
                                        >
                                            <span className="flex-1 truncate">{unit.label}</span>
                                            {unit.isDynamic && (
                                                <div className="flex gap-2">
                                                    <button onClick={(e) => { e.stopPropagation(); handleCopy('unit', unit.id); }} className="action-btn text-green-500" title="Copy Unit">
                                                        <Copy size={14} />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); setQuizManagerTarget({ id: unit.id, label: unit.label, path: [selectedBranch?.label, selectedSemester?.label, selectedSubject?.label, unit.label].filter(Boolean).join(' / ') }); }} className="action-btn quiz" title="Manage Unit Quiz">
                                                        <HelpCircle size={14} />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); openEditModal(unit, 'unit'); }} className="action-btn edit">
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteUnit(unit.id, true, unit.label) }} className="action-btn delete">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                        }
                    </div>
                </div>

                {/* Column 3: Modules */}
                <div className="manager-column expanded">
                    <div className="column-header">
                        <h3>Modules</h3>
                        <div className="flex gap-3">
                            {selectedUnit && clipboard?.type === 'module' && (
                                <button onClick={() => handlePaste('module')} className="action-btn text-blue-600 bg-blue-50 hover:bg-blue-100" title="Paste Module">
                                    <ClipboardPaste size={16} />
                                </button>
                            )}
                            {selectedUnit && <button onClick={() => openAddModal('module')} className="add-btn"><Plus size={16} /></button>}
                        </div>
                    </div>
                    <div className="column-content">
                        {!selectedUnit ? <div className="empty-state">Select a Unit</div> :
                            loadingModules ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="module-item" style={{ pointerEvents: 'none' }}>
                                            <div className="module-header mb-3">
                                                <div className="skeleton" style={{ width: i === 2 ? '40%' : '70%', height: '20px', borderRadius: '4px' }}></div>
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="skeleton" style={{ width: '70px', height: '24px', borderRadius: '12px' }}></div>
                                                <div className="skeleton" style={{ width: '80px', height: '24px', borderRadius: '12px' }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) :
                                modules.length === 0 ? <div className="empty-state">No modules found</div> :
                                    modules.map(mod => (
                                        <div key={mod.id} className="module-item">
                                            <div className="module-header">
                                                <span className="font-medium">{mod.label}</span>
                                                {mod.isDynamic && (
                                                    <div className="flex gap-2">
                                                        <button onClick={(e) => { e.stopPropagation(); handleCopy('module', mod.id); }} className="action-btn text-green-500" title="Copy Module">
                                                            <Copy size={14} />
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); setQuizManagerTarget({ id: mod.id, label: mod.label, path: [selectedBranch?.label, selectedSemester?.label, selectedSubject?.label, selectedUnit?.label, mod.label].filter(Boolean).join(' / ') }); }} className="action-btn quiz" title="Manage Module Quiz">
                                                            <HelpCircle size={14} />
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); openEditModal(mod, 'module'); }} className="action-btn edit">
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button onClick={() => handleDeleteModule(mod.id, true, mod.label)} className="action-btn delete">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="module-links">
                                                {mod.videoUrl && (
                                                    <a href={mod.videoUrl} target="_blank" rel="noopener noreferrer" className="link-badge video">
                                                        <Video size={12} /> Video
                                                    </a>
                                                )}
                                                {mod.pdfUrl && (
                                                    <a href={mod.pdfUrl} target="_blank" rel="noopener noreferrer" className="link-badge pdf">
                                                        <FileText size={12} /> Notes
                                                    </a>
                                                )}
                                                {mod.handwrittenNotesUrl && (
                                                    <a href={mod.handwrittenNotesUrl} target="_blank" rel="noopener noreferrer" className="link-badge pdf">
                                                        <FileText size={12} /> Handwritten
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))
                        }
                    </div>
                </div>
            </div>
            )}

            {/* Modals */}
            {activeModal && createPortal(
                <div className={`modal-overlay ${(activeModal === 'unit' || activeModal === 'module') ? 'full-screen-overlay' : ''}`}>
                    <div className={`modal-content ${(activeModal === 'unit' || activeModal === 'module') ? 'full-screen' : ''}`}>
                        <div className="modal-header">
                            <h3>
                                {activeModal === 'bulk_move_subjects'
                                    ? 'Move Subjects'
                                    : (editingItem ? 'Edit' : 'Add') + ' ' + (activeModal === 'subject' ? 'Subject' : activeModal === 'unit' ? 'Unit' : 'Module')}
                            </h3>
                            <button 
                                onClick={() => setActiveModal(null)} 
                                className="modal-close-btn"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body space-y-4">
                            {activeModal === 'bulk_move_subjects' ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="admin-form-label">Year</label>
                                        <select
                                            className="admin-form-input"
                                            value={targetYear}
                                            onChange={(e) => {
                                                setTargetYear(e.target.value);
                                                const yr = selectedProgram.years.find(y => y.id === e.target.value);
                                                if (yr) setTargetSemester(yr.semesters[0].id);
                                            }}
                                        >
                                            {selectedProgram.years.map(y => (
                                                <option key={y.id} value={y.id}>{y.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="admin-form-label">Semester</label>
                                        <select
                                            className="admin-form-input"
                                            value={targetSemester}
                                            onChange={(e) => setTargetSemester(e.target.value)}
                                        >
                                            {selectedProgram.years.find(y => y.id === targetYear)?.semesters.map(s => (
                                                <option key={s.id} value={s.id}>{s.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ) : activeModal === 'subject' ? (
                                <div className="space-y-4">
                                    <div className="admin-form-group">
                                        <label className="admin-form-label">Name/Title</label>
                                        <input
                                            type="text"
                                            className="admin-form-input"
                                            value={newItemLabel}
                                            onChange={e => setNewItemLabel(e.target.value)}
                                            placeholder="Enter subject name"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="admin-form-label">Year</label>
                                            <select
                                                className="admin-form-input"
                                                value={targetYear}
                                                onChange={(e) => {
                                                    setTargetYear(e.target.value);
                                                    const yr = selectedProgram.years.find(y => y.id === e.target.value);
                                                    if (yr) setTargetSemester(yr.semesters[0].id);
                                                }}
                                            >
                                                {selectedProgram.years.map(y => (
                                                    <option key={y.id} value={y.id}>{y.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="admin-form-label">Semester</label>
                                            <select
                                                className="admin-form-input"
                                                value={targetSemester}
                                                onChange={(e) => setTargetSemester(e.target.value)}
                                            >
                                                {selectedProgram.years.find(y => y.id === targetYear)?.semesters.map(s => (
                                                    <option key={s.id} value={s.id}>{s.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ) : (activeModal === 'module' || activeModal === 'unit') && (
                                <div className="space-y-6">
                                    {/* Primary Info Section */}
                                    <div className="premium-card">
                                        <div className="admin-section-header mb-6">
                                            <BookOpen size={20} className="text-purple-500 mr-2" />
                                            <h4 className="text-lg font-bold">Core Materials</h4>
                                        </div>
                                        <div className="space-y-6">
                                            <div className="admin-form-group">
                                                <label className="admin-form-label">Name/Title</label>
                                                <input
                                                    type="text"
                                                    className="premium-input"
                                                    value={newItemLabel}
                                                    onChange={e => setNewItemLabel(e.target.value)}
                                                    placeholder={`Enter ${activeModal} name`}
                                                    autoFocus
                                                />
                                            </div>
                                            {activeModal === 'unit' && (
                                                <div className="admin-form-group">
                                                    <label className="admin-form-label flex items-center gap-2 cursor-pointer w-fit p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-colors">
                                                        <input 
                                                            type="checkbox" 
                                                            className="custom-checkbox !w-5 !h-5"
                                                            checked={newUnitIsQuizEnabled}
                                                            onChange={e => setNewUnitIsQuizEnabled(e.target.checked)}
                                                        />
                                                        <span className="text-sm font-semibold text-slate-200">Enable "Test Your Knowledge" Quiz</span>
                                                    </label>
                                                    <p className="text-xs text-slate-400 mt-2 ml-1">If unchecked, the quiz section will be completely hidden from students for this unit.</p>
                                                </div>
                                            )}
                                            <div className="admin-form-group">
                                                <label className="admin-form-label flex items-center gap-2">
                                                    <Video size={14} /> Video URL (YouTube/MP4)
                                                </label>
                                                <input
                                                    type="url"
                                                    className="premium-input"
                                                    value={newModuleVideo}
                                                    onChange={e => setNewModuleVideo(e.target.value)}
                                                    placeholder="https://youtube.com/..."
                                                />
                                                {newModuleVideo && !newModuleVideo.startsWith('http') && (
                                                    <div className="url-validation-hint invalid">
                                                        <AlertCircle size={10} /> Enter a valid URL starting with http
                                                    </div>
                                                )}
                                            </div>
                                            <div className="admin-form-group">
                                                <label className="admin-form-label flex items-center gap-2 mb-2">
                                                    <FileText size={14} /> Main Lecture Notes (PDF/Drive)
                                                </label>
                                                <input
                                                    type="text"
                                                    className="premium-input w-full mb-3"
                                                    value={newModulePdfName}
                                                    onChange={e => setNewModulePdfName(e.target.value)}
                                                    placeholder="Custom Document Name (e.g., Chapter 1 Notes)"
                                                />
                                                {newModulePdf ? (
                                                    <div className="uploaded-doc-card">
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <div className="w-10 h-10 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                                                                <FileText size={20} />
                                                            </div>
                                                            <div className="overflow-hidden">
                                                                <p className="text-sm font-semibold text-slate-200">Uploaded Document</p>
                                                                {newModulePdf.startsWith('http') ? (
                                                                    <a href={newModulePdf} target="_blank" rel="noreferrer" className="text-xs text-purple-400 hover:text-purple-300 hover:underline truncate block max-w-[200px] md:max-w-[300px]">
                                                                        {newModulePdf}
                                                                    </a>
                                                                ) : (
                                                                    <span className="text-xs text-slate-400 truncate block max-w-[200px] md:max-w-[300px]" title={newModulePdf}>
                                                                        ID: {newModulePdf}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => promptFileDelete(newModulePdf, setNewModulePdf)} 
                                                            className={`remove-doc-btn flex items-center justify-center ${deletingFileUrl === newModulePdf ? 'opacity-70 cursor-not-allowed w-24 bg-red-500/20 text-red-400' : ''}`} 
                                                            title="Remove PDF"
                                                            disabled={deletingFileUrl === newModulePdf}
                                                        >
                                                            {deletingFileUrl === newModulePdf ? (
                                                                <>
                                                                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} className="mr-1" />
                                                                    <span className="text-xs font-semibold">Deleting</span>
                                                                </>
                                                            ) : (
                                                                <Trash2 size={16} />
                                                            )}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-4 mt-1">
                                                        <input
                                                            type="url"
                                                            className="premium-input w-full"
                                                            value={newModulePdf}
                                                            onChange={e => setNewModulePdf(convertDriveLink(e.target.value))}
                                                            placeholder="Paste Google Drive URL..."
                                                        />
                                                        <div className="flex items-center gap-4 my-1">
                                                            <div className="flex-1 h-px bg-slate-700/50"></div>
                                                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">OR</span>
                                                            <div className="flex-1 h-px bg-slate-700/50"></div>
                                                        </div>
                                                        <FileUploadWidget
                                                            selectedProgramId={selectedProgram?.id}
                                                            metadata={{
                                                                program: selectedProgram?.id,
                                                                year: targetYear || selectedYear?.id,
                                                                branch: selectedBranch?.id || null,
                                                                semester: targetSemester || selectedSemester?.id,
                                                                subject: selectedSubject?.id || null,
                                                                unit: selectedUnit?.id || null,
                                                                moduleName: newItemLabel || 'Untitled Module',
                                                                type: 'lecture_notes'
                                                            }}
                                                            label="Upload PDF Note"
                                                            onUploadSuccess={(id) => setNewModulePdf(id)}
                                                            onSuccess={(msg) => showToast(msg, 'success')}
                                                            onError={(msg) => showToast(msg, 'error')}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {activeModal === 'module' && (
                                                <div className="admin-form-group">
                                                    <label className="admin-form-label flex items-center gap-2 mb-2">
                                                        <Edit2 size={14} /> Handwritten Notes
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="premium-input w-full mb-3"
                                                        value={newModuleHandwrittenNotesName}
                                                        onChange={e => setNewModuleHandwrittenNotesName(e.target.value)}
                                                        placeholder="Custom Document Name (e.g., Class Notes)"
                                                    />
                                                    {newModuleHandwrittenNotes ? (
                                                        <div className="uploaded-doc-card">
                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                <div className="w-10 h-10 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                                                                    <FileText size={20} />
                                                                </div>
                                                                <div className="overflow-hidden">
                                                                    <p className="text-sm font-semibold text-slate-200">Uploaded Notes</p>
                                                                    {newModuleHandwrittenNotes.startsWith('http') ? (
                                                                        <a href={newModuleHandwrittenNotes} target="_blank" rel="noreferrer" className="text-xs text-purple-400 hover:text-purple-300 hover:underline truncate block max-w-[200px] md:max-w-[300px]">
                                                                            {newModuleHandwrittenNotes}
                                                                        </a>
                                                                    ) : (
                                                                        <span className="text-xs text-slate-400 truncate block max-w-[200px] md:max-w-[300px]" title={newModuleHandwrittenNotes}>
                                                                            ID: {newModuleHandwrittenNotes}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => promptFileDelete(newModuleHandwrittenNotes, setNewModuleHandwrittenNotes)} 
                                                                className={`remove-doc-btn flex items-center justify-center ${deletingFileUrl === newModuleHandwrittenNotes ? 'opacity-70 cursor-not-allowed w-24 bg-red-500/20 text-red-400' : ''}`} 
                                                                title="Remove Notes"
                                                                disabled={deletingFileUrl === newModuleHandwrittenNotes}
                                                            >
                                                                {deletingFileUrl === newModuleHandwrittenNotes ? (
                                                                    <>
                                                                        <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} className="mr-1" />
                                                                        <span className="text-xs font-semibold">Deleting</span>
                                                                    </>
                                                                ) : (
                                                                    <Trash2 size={16} />
                                                                )}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-4 mt-1">
                                                            <input
                                                                type="url"
                                                                className="premium-input w-full"
                                                                value={newModuleHandwrittenNotes}
                                                                onChange={e => setNewModuleHandwrittenNotes(convertDriveLink(e.target.value))}
                                                                placeholder="Paste URL..."
                                                            />
                                                            <div className="flex items-center gap-4 my-1">
                                                                <div className="flex-1 h-px bg-slate-700/50"></div>
                                                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">OR</span>
                                                                <div className="flex-1 h-px bg-slate-700/50"></div>
                                                            </div>
                                                            <FileUploadWidget
                                                                selectedProgramId={selectedProgram?.id}
                                                                metadata={{
                                                                    program: selectedProgram?.id,
                                                                    year: targetYear || selectedYear?.id,
                                                                    branch: selectedBranch?.id || null,
                                                                    semester: targetSemester || selectedSemester?.id,
                                                                    subject: selectedSubject?.id || null,
                                                                    unit: selectedUnit?.id || null,
                                                                    moduleName: newItemLabel || 'Untitled Module',
                                                                    type: 'handwritten_notes'
                                                                }}
                                                                label="Upload Handwritten Note"
                                                                onUploadSuccess={(id) => setNewModuleHandwrittenNotes(id)}
                                                                onSuccess={(msg) => showToast(msg, 'success')}
                                                                onError={(msg) => showToast(msg, 'error')}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Additional Notes Section */}
                                    <div className="premium-accordion">
                                        <div 
                                            className="premium-accordion-header"
                                            onClick={() => setIsResourcesExpanded(!isResourcesExpanded)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Plus size={20} className="text-purple-500" />
                                                <h4 className="text-lg font-bold text-slate-200">Additional Resources</h4>
                                                <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-1 rounded-full">{additionalNotes.length}</span>
                                            </div>
                                            <ChevronDown size={20} className={`text-slate-400 transition-transform ${isResourcesExpanded ? 'rotate-180' : ''}`} />
                                        </div>

                                        {isResourcesExpanded && (
                                            <div className="premium-accordion-content space-y-6">
                                                {additionalNotes.map((note, index) => (
                                                    <React.Fragment key={index}>
                                                        <div className="premium-card !mb-0 relative group">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    if (window.confirm('Remove this note?')) {
                                                                        handleRemoveNote(index);
                                                                    }
                                                                }}
                                                                className="btn-remove-card"
                                                                title="Remove Note"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                            
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                                                <div className="admin-form-group !mb-0">
                                                                    <label className="admin-form-label">Resource Label</label>
                                                                    <input
                                                                        type="text"
                                                                        className="premium-input"
                                                                        value={note.label}
                                                                        onChange={e => handleNoteChange(index, 'label', e.target.value)}
                                                                        placeholder="e.g. Worksheet, Reference"
                                                                    />
                                                                </div>
                                                                <div className="admin-form-group !mb-0">
                                                                    <label className="admin-form-label">Resource File / URL</label>
                                                                    {note.url ? (
                                                                        <div className="flex items-center gap-3 p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl relative group">
                                                                            <FileText size={24} className="text-red-400" />
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-sm font-medium text-slate-200 truncate">Resource Linked</p>
                                                                                <p className="text-xs text-slate-500 truncate">{note.url}</p>
                                                                            </div>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => promptFileDelete(note.url, (newVal) => handleNoteChange(index, 'url', newVal))}
                                                                                className="btn-remove-file"
                                                                                style={{
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'center',
                                                                                    flexShrink: 0,
                                                                                    width: '32px',
                                                                                    height: '32px',
                                                                                    borderRadius: '50%',
                                                                                    background: 'transparent',
                                                                                    color: '#ef4444',
                                                                                    border: 'none',
                                                                                    cursor: deletingFileUrl === note.url ? 'not-allowed' : 'pointer',
                                                                                    opacity: deletingFileUrl === note.url ? 0.7 : 1,
                                                                                    transition: 'all 0.2s ease',
                                                                                }}
                                                                                onMouseEnter={(e) => {
                                                                                    if (deletingFileUrl !== note.url) {
                                                                                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                                                                        e.currentTarget.style.transform = 'scale(1.1)';
                                                                                    }
                                                                                }}
                                                                                onMouseLeave={(e) => {
                                                                                    if (deletingFileUrl !== note.url) {
                                                                                        e.currentTarget.style.background = 'transparent';
                                                                                        e.currentTarget.style.transform = 'scale(1)';
                                                                                    }
                                                                                }}
                                                                                disabled={deletingFileUrl === note.url}
                                                                                title="Delete File"
                                                                            >
                                                                                {deletingFileUrl === note.url ? (
                                                                                    <Loader2 size={16} className="animate-spin" />
                                                                                ) : (
                                                                                    <Trash2 size={18} />
                                                                                )}
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                            <div className="space-y-4">
                                                                                <input
                                                                                    type="url"
                                                                                    className="premium-input w-full"
                                                                                    value={note.url}
                                                                                    onChange={e => handleNoteChange(index, 'url', convertDriveLink(e.target.value))}
                                                                                    placeholder="Paste External Link..."
                                                                                />
                                                                                <div className="flex items-center gap-4 my-1">
                                                                                    <div className="flex-1 h-px bg-slate-700/50"></div>
                                                                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">OR</span>
                                                                                    <div className="flex-1 h-px bg-slate-700/50"></div>
                                                                                </div>
                                                                                <FileUploadWidget
                                                                                    selectedProgramId={selectedProgram?.id}
                                                                                    metadata={{
                                                                                        program: selectedProgram?.id,
                                                                                        year: targetYear || selectedYear?.id,
                                                                                        branch: selectedBranch?.id || null,
                                                                                        semester: targetSemester || selectedSemester?.id,
                                                                                        subject: selectedSubject?.id || null,
                                                                                        unit: selectedUnit?.id || null,
                                                                                        moduleName: newItemLabel || 'Untitled Module',
                                                                                        type: 'additional_resource'
                                                                                    }}
                                                                                    label="Upload Resource"
                                                                                    onUploadSuccess={(id) => handleNoteChange(index, 'url', id)}
                                                                                    onSuccess={(msg) => showToast(msg, 'success')}
                                                                                    onError={(msg) => showToast(msg, 'error')}
                                                                                />
                                                                            </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Inline Add Button only below the LAST note */}
                                                        {index === additionalNotes.length - 1 && (
                                                            <div className="flex justify-center -mt-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={handleAddNote}
                                                                    className="btn-add-colorful"
                                                                    title="Add another note below"
                                                                >
                                                                    <Plus size={14} /> Add Resource
                                                                </button>
                                                            </div>
                                                        )}
                                                    </React.Fragment>
                                                ))}

                                                {additionalNotes.length === 0 && (
                                                    <div className="py-12 border-2 border-dashed border-white/10 rounded-2xl bg-black/20" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                        <p className="text-sm text-slate-400 font-bold uppercase tracking-wider mb-6">No additional resources added yet.</p>
                                                        <button 
                                                            type="button"
                                                            onClick={handleAddNote}
                                                            className="btn-primary"
                                                        >
                                                            <Plus size={16} /> Add Your First Resource
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className={`modal-footer ${(activeModal === 'unit' || activeModal === 'module') ? 'full-screen-footer' : ''}`}>
                            <button onClick={() => setActiveModal(null)} className="btn-secondary" disabled={isSaving}>Cancel</button>
                            <button
                                onClick={activeModal === 'bulk_move_subjects' ? handleBulkMoveSave : handleSave}
                                className="btn-primary"
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <div className="flex items-center gap-2 justify-center">
                                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                        <span>Saving...</span>
                                    </div>
                                ) : (
                                    activeModal === 'bulk_move_subjects' ? `Move ${selectedSubjectIds.size} Subjects` : 'Save Changes'
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmation.isOpen && createPortal(
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '400px' }}>
                        <div className="modal-header text-red-600">
                            <h3 className="flex items-center gap-2">
                                <AlertCircle size={24} />
                                Delete {deleteConfirmation.type.charAt(0).toUpperCase() + deleteConfirmation.type.slice(1)}
                            </h3>
                        </div>
                        <div className="modal-body">
                            <p className="text-[var(--color-text)] mb-2">
                                Are you sure you want to delete <span className="font-bold">{deleteConfirmation.title}</span>?
                            </p>
                            <p className="text-sm text-[var(--color-text-muted)]">
                                This action cannot be undone. All associated content will be permanently removed.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button
                                onClick={() => setDeleteConfirmation({ isOpen: false, type: null, id: null, title: '' })}
                                className="btn-secondary"
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="btn-destructive"
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                        Deleting...
                                    </>
                                ) : (
                                    'Delete'
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Toast Notification */}
            {createPortal(
                <div className={`toast-container ${toast.visible ? 'visible' : ''}`}>
                <div className={`toast ${toast.visible ? 'visible' : ''} ${toast.type}`}>
                    <div className="toast-icon-wrapper">
                        <div className="toast-icon">
                            {toast.type === 'success' ? <CheckCircle size={40} strokeWidth={3} /> : <XCircle size={40} strokeWidth={3} />}
                        </div>
                    </div>
                    <div className="toast-content">
                        <h4>{toast.type === 'success' ? 'Success!' : 'Error'}</h4>
                        <p>{toast.message}</p>
                    </div>
                </div>
                </div>,
                document.body
            )}


            {/* File Delete Confirmation */}
            {fileDeleteModal.isOpen && createPortal(
                <div className="modal-overlay" style={{ zIndex: 999999 }}>
                    <div className="modal-content" style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <div className="flex items-center gap-3 text-red-400">
                                <Trash2 size={24} />
                                <h3>Permanently Delete File?</h3>
                            </div>
                        </div>
                        <div className="modal-body">
                            <p className="text-slate-300 mb-2">Are you sure you want to delete this file from Google Drive and Firebase? This action cannot be undone.</p>
                        </div>
                        <div className="modal-footer">
                            <button 
                                onClick={() => setFileDeleteModal({ isOpen: false, fileIdOrUrl: null, onConfirm: null })} 
                                className="btn-secondary"
                                disabled={deletingFileUrl !== null}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmFileDelete} 
                                disabled={deletingFileUrl !== null} 
                                className="btn-destructive"
                            >
                                {deletingFileUrl !== null ? (
                                    <>
                                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                        Deleting...
                                    </>
                                ) : (
                                    'Delete File'
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Quiz Manager Overlay */}
            {quizManagerTarget && createPortal(
                <UnitQuizManager
                    targetId={quizManagerTarget.id}
                    targetLabel={quizManagerTarget.label}
                    targetPath={quizManagerTarget.path}
                    onClose={() => setQuizManagerTarget(null)}
                />,
                document.body
            )}
        </div>
    );
};

export default CourseContentManagement;
