import { contentDb } from '../config/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';

// --- Caching Service ---
const contentCache = {
    subjects: {}, // semId -> subjects
    units: {},    // subId -> units
    modules: {},  // unitId -> modules
    direct: {
        units: {},   // id -> unit
        modules: {}  // id -> module
    }
};

// --- Subjects ---

export const fetchDynamicSubjects = async (programId, yearId, branchId, semesterId) => {
    const cacheKey = `${programId}_${yearId}_${branchId}_${semesterId}`;
    if (contentCache.subjects[cacheKey]) return contentCache.subjects[cacheKey];

    try {
        let q = query(
            collection(contentDb, 'academic_subjects'),
            where('programId', '==', programId),
            where('yearId', '==', yearId),
            where('semesterId', '==', semesterId)
        );
        if (branchId) {
            q = query(q, where('branchId', '==', branchId));
        }
        
        const snapshot = await getDocs(q);
        const subjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isDynamic: true }));
        const sorted = subjects.sort((a, b) => {
            const orderA = a.order !== undefined ? a.order : 999999;
            const orderB = b.order !== undefined ? b.order : 999999;
            if (orderA !== orderB) return orderA - orderB;
            return (a.createdAt || '').localeCompare(b.createdAt || '');
        });
        
        // Ensure that if branchId wasn't provided, we only return subjects that explicitly lack a branchId 
        // (to prevent fetching BTech subjects for all branches accidentally if queried without one, though the UI prevents this).
        const filtered = branchId ? sorted : sorted.filter(s => !s.branchId);
        
        contentCache.subjects[cacheKey] = filtered;
        return filtered;
    } catch (error) {
        console.error("Error fetching subjects:", error);
        return [];
    }
};

export const createSubject = async (programId, yearId, branchId, semesterId, label) => {
    const payload = {
        programId,
        yearId,
        semesterId,
        label,
        createdAt: new Date().toISOString()
    };
    if (branchId) {
        payload.branchId = branchId;
    }
    
    const res = await addDoc(collection(contentDb, 'academic_subjects'), payload);
    delete contentCache.subjects[`${programId}_${yearId}_${branchId}_${semesterId}`];
    return res;
};

export const updateSubject = async (subjectId, label, yearId, semesterId, programId, branchId) => {
    const docRef = doc(contentDb, 'academic_subjects', subjectId);
    const updateData = { label };
    if (yearId) updateData.yearId = yearId;
    if (semesterId) updateData.semesterId = semesterId;
    if (branchId) updateData.branchId = branchId;
    await updateDoc(docRef, updateData);
    if (programId && yearId && semesterId) {
        delete contentCache.subjects[`${programId}_${yearId}_${branchId}_${semesterId}`];
    }
};

export const updateSubjectOrder = async (subjectId, newOrder, programId, yearId, semesterId, branchId) => {
    const docRef = doc(contentDb, 'academic_subjects', subjectId);
    await updateDoc(docRef, { order: newOrder });
    if (programId && yearId && semesterId) {
        Object.keys(contentCache.subjects).forEach(key => {
            if (key.startsWith(`${programId}_${yearId}_`)) {
                delete contentCache.subjects[key];
            }
        });
    }
};

export const deleteSubject = async (subjectId, programId, yearId, branchId, semesterId) => {
    await deleteDoc(doc(contentDb, 'academic_subjects', subjectId));
    if (programId && yearId && semesterId) {
        delete contentCache.subjects[`${programId}_${yearId}_${branchId}_${semesterId}`];
    }
};

// --- Units ---

export const fetchDynamicUnits = async (subjectId) => {
    if (contentCache.units[subjectId]) return contentCache.units[subjectId];

    try {
        const q = query(
            collection(contentDb, 'academic_units'),
            where('subjectId', '==', subjectId)
        );
        const snapshot = await getDocs(q);
        const units = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isDynamic: true }));
        const sorted = units.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        contentCache.units[subjectId] = sorted;
        return sorted;
    } catch (error) {
        console.error("Error fetching units:", error);
        return [];
    }
};

export const createUnit = async (subjectId, label, videoUrl, pdfUrl, pdfName, additionalNotes = []) => {
    const res = await addDoc(collection(contentDb, 'academic_units'), {
        subjectId,
        label,
        videoUrl: videoUrl || '',
        pdfUrl: pdfUrl || '',
        pdfName: pdfName || '',
        additionalNotes: additionalNotes || [],
        createdAt: new Date().toISOString()
    });
    delete contentCache.units[subjectId];
    return res;
};

export const updateUnit = async (unitId, subjectId, label, videoUrl, pdfUrl, pdfName, additionalNotes = []) => {
    const docRef = doc(contentDb, 'academic_units', unitId);
    await updateDoc(docRef, {
        label,
        videoUrl: videoUrl || '',
        pdfUrl: pdfUrl || '',
        pdfName: pdfName || '',
        additionalNotes: additionalNotes || []
    });
    delete contentCache.units[subjectId];
    delete contentCache.direct.units[unitId];
};

export const deleteUnit = async (unitId, subjectId) => {
    await deleteDoc(doc(contentDb, 'academic_units', unitId));
    delete contentCache.units[subjectId];
    delete contentCache.direct.units[unitId];
};

export const getUnitById = async (unitId) => {
    if (contentCache.direct.units[unitId]) return contentCache.direct.units[unitId];

    try {
        const docRef = doc(contentDb, 'academic_units', unitId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = { id: docSnap.id, ...docSnap.data(), isDynamic: true };
            contentCache.direct.units[unitId] = data;
            return data;
        }
        return null;
    } catch (error) {
        console.error("Error fetching unit:", error);
        return null;
    }
};

// --- Modules ---

export const fetchDynamicModules = async (unitId) => {
    if (contentCache.modules[unitId]) return contentCache.modules[unitId];

    try {
        const q = query(
            collection(contentDb, 'academic_modules'),
            where('unitId', '==', unitId)
        );
        const snapshot = await getDocs(q);
        const modules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isDynamic: true }));
        const sorted = modules.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        contentCache.modules[unitId] = sorted;
        return sorted;
    } catch (error) {
        console.error("Error fetching modules:", error);
        return [];
    }
};

export const getModuleById = async (moduleId) => {
    if (contentCache.direct.modules[moduleId]) return contentCache.direct.modules[moduleId];

    try {
        const docRef = doc(contentDb, 'academic_modules', moduleId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = { id: docSnap.id, ...docSnap.data(), isDynamic: true };
            contentCache.direct.modules[moduleId] = data;
            return data;
        }
        return null;
    } catch (error) {
        console.error("Error fetching module:", error);
        return null;
    }
};

export const createModule = async (unitId, label, videoUrl, pdfUrl, pdfName, handwrittenNotesUrl, handwrittenNotesName, additionalNotes = []) => {
    const res = await addDoc(collection(contentDb, 'academic_modules'), {
        unitId,
        label,
        videoUrl: videoUrl || '',
        pdfUrl: pdfUrl || '',
        pdfName: pdfName || '',
        handwrittenNotesUrl: handwrittenNotesUrl || '',
        handwrittenNotesName: handwrittenNotesName || '',
        additionalNotes: additionalNotes || [],
        createdAt: new Date().toISOString()
    });
    delete contentCache.modules[unitId];
    return res;
};

export const updateModule = async (moduleId, unitId, label, videoUrl, pdfUrl, pdfName, handwrittenNotesUrl, handwrittenNotesName, additionalNotes = []) => {
    const docRef = doc(contentDb, 'academic_modules', moduleId);
    await updateDoc(docRef, {
        label,
        videoUrl: videoUrl || '',
        pdfUrl: pdfUrl || '',
        pdfName: pdfName || '',
        handwrittenNotesUrl: handwrittenNotesUrl || '',
        handwrittenNotesName: handwrittenNotesName || '',
        additionalNotes: additionalNotes || []
    });
    delete contentCache.modules[unitId];
    delete contentCache.direct.modules[moduleId];
};

export const deleteModule = async (moduleId, unitId) => {
    await deleteDoc(doc(contentDb, 'academic_modules', moduleId));
    delete contentCache.modules[unitId];
    delete contentCache.direct.modules[moduleId];
};

// --- Duplicate Operations ---

export const duplicateModule = async (sourceModuleId, destUnitId) => {
    const docRef = doc(contentDb, 'academic_modules', sourceModuleId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    
    return await createModule(
        destUnitId,
        data.label + ' (Copy)',
        data.videoUrl,
        data.pdfUrl,
        data.pdfName,
        data.handwrittenNotesUrl,
        data.handwrittenNotesName,
        data.additionalNotes
    );
};

export const duplicateUnit = async (sourceUnitId, destSubjectId) => {
    const docRef = doc(contentDb, 'academic_units', sourceUnitId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    const data = docSnap.data();

    const newUnitRef = await createUnit(
        destSubjectId,
        data.label + ' (Copy)',
        data.videoUrl,
        data.pdfUrl,
        data.pdfName,
        data.additionalNotes
    );
    const newUnitId = newUnitRef.id;

    const modules = await fetchDynamicModules(sourceUnitId);
    for (const mod of modules) {
        await createModule(
            newUnitId,
            mod.label,
            mod.videoUrl,
            mod.pdfUrl,
            mod.pdfName,
            mod.handwrittenNotesUrl,
            mod.handwrittenNotesName,
            mod.additionalNotes
        );
    }
    return newUnitRef;
};

export const duplicateSubject = async (sourceSubjectId, destProgramId, destYearId, destBranchId, destSemesterId) => {
    const docRef = doc(contentDb, 'academic_subjects', sourceSubjectId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    const data = docSnap.data();

    const newSubjectRef = await createSubject(
        destProgramId,
        destYearId,
        destBranchId,
        destSemesterId,
        data.label + ' (Copy)'
    );
    const newSubjectId = newSubjectRef.id;

    const units = await fetchDynamicUnits(sourceSubjectId);
    for (const unit of units) {
        const newUnitRef = await createUnit(
            newSubjectId,
            unit.label,
            unit.videoUrl,
            unit.pdfUrl,
            unit.pdfName,
            unit.additionalNotes
        );
        const newUnitId = newUnitRef.id;

        const modules = await fetchDynamicModules(unit.id);
        for (const mod of modules) {
            await createModule(
                newUnitId,
                mod.label,
                mod.videoUrl,
                mod.pdfUrl,
                mod.pdfName,
                mod.handwrittenNotesUrl,
                mod.handwrittenNotesName,
                mod.additionalNotes
            );
        }
    }
    return newSubjectRef;
};
