import { functions, auth } from '../config/firebase';
import { getFunctions, httpsCallable as httpsCallableFunc } from 'firebase/functions';
import { collection, query, getDocs, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { contentDb as db } from '../config/firebase';

const funcs = getFunctions();

export const generateDriveAuthUrl = async () => {
    const generateUrl = httpsCallableFunc(funcs, 'generateDriveAuthUrl');
    const result = await generateUrl();
    return result.data.url;
};

export const linkDriveAccount = async (code) => {
    const linkAccount = httpsCallableFunc(funcs, 'linkDriveAccount');
    const result = await linkAccount({ code });
    return result.data;
};

export const subscribeToDriveAccounts = (callback) => {
    const q = query(collection(db, 'drive_accounts'));
    return onSnapshot(q, (snapshot) => {
        const accounts = [];
        snapshot.forEach(doc => {
            accounts.push(doc.data());
        });
        callback(accounts);
    });
};

export const subscribeToImages = (callback) => {
    const q = query(collection(db, 'images'));
    return onSnapshot(q, (snapshot) => {
        const images = [];
        snapshot.forEach(doc => {
            images.push({ id: doc.id, ...doc.data() });
        });
        // Sort by createdAt descending locally
        images.sort((a, b) => {
            if (!a.createdAt || !b.createdAt) return 0;
            return b.createdAt.toMillis() - a.createdAt.toMillis();
        });
        callback(images);
    });
};

export const deleteImage = async (imageId, driveFileId, cloudinaryPublicId) => {
    // Ideally this should also be a cloud function to securely delete from Drive/Cloudinary
    // We'll implement the metadata deletion here for now
    await deleteDoc(doc(db, 'images', imageId));
    return true;
};

import { addDoc } from 'firebase/firestore';

export const uploadImageFile = async (file, category, targetAccountId = null, onProgress = null) => {
    if (!auth.currentUser) throw new Error("Must be logged in.");
    
    // Cloudinary Credentials from env
    const cloudName = import.meta.env.VITE_CSE_QUIZ_CLOUDINARY_CLOUD_NAME || 'pnjsjwb8';
    const apiKey = import.meta.env.VITE_CSE_QUIZ_CLOUDINARY_API_KEY || '299693132632874';
    const apiSecret = import.meta.env.VITE_CSE_QUIZ_CLOUDINARY_API_SECRET || 'KvMvRcV5rau8ZEy2LhSzORln_1E';
    
    const timestamp = Math.round((new Date()).getTime() / 1000);
    const folder = 'rgukt-connect/uploads';
    
    // Generate signature using Web Crypto API
    const signatureString = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(signatureString);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
        
        xhr.open('POST', url);
        
        if (onProgress) {
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    onProgress(percentComplete);
                }
            };
        }
        
        xhr.onload = async () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                const response = JSON.parse(xhr.responseText);
                
                try {
                    const imageDoc = {
                        name: file.name,
                        category: category || "Other",
                        cloudinaryPublicId: response.public_id,
                        cloudinaryUrl: response.secure_url,
                        width: response.width,
                        height: response.height,
                        format: response.format,
                        size: response.bytes,
                        status: "active",
                        createdAt: new Date(),
                        uploadedBy: auth.currentUser ? auth.currentUser.uid : "admin"
                    };
                    
                    const docRef = await addDoc(collection(db, "images"), imageDoc);
                    
                    resolve({
                        success: true,
                        imageId: docRef.id,
                        ...imageDoc
                    });
                } catch (err) {
                    console.error("Firestore save error:", err);
                    reject(new Error("Failed to save image metadata to Firestore."));
                }
            } else {
                reject(new Error(`Upload failed: ${xhr.responseText}`));
            }
        };
        
        xhr.onerror = () => reject(new Error('Network error during upload'));
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', apiKey);
        formData.append('timestamp', timestamp);
        formData.append('signature', signature);
        formData.append('folder', folder);
        
        xhr.send(formData);
    });
};

export const deleteImageFromCloudinaryUrl = async (imageUrl) => {
    if (!imageUrl) return false;
    try {
        const cloudName = import.meta.env.VITE_CSE_QUIZ_CLOUDINARY_CLOUD_NAME || 'pnjsjwb8';
        const apiKey = import.meta.env.VITE_CSE_QUIZ_CLOUDINARY_API_KEY || '299693132632874';
        const apiSecret = import.meta.env.VITE_CSE_QUIZ_CLOUDINARY_API_SECRET || 'KvMvRcV5rau8ZEy2LhSzORln_1E';
        
        const urlParts = imageUrl.split('/');
        const uploadIndex = urlParts.findIndex(part => part === 'upload');
        if (uploadIndex === -1) return false;
        
        let startIndex = uploadIndex + 1;
        if (urlParts[startIndex].match(/^v\d+$/)) {
            startIndex++;
        }
        
        const pathParts = urlParts.slice(startIndex);
        let publicIdWithExt = pathParts.join('/');
        
        const lastDot = publicIdWithExt.lastIndexOf('.');
        const publicId = lastDot !== -1 ? publicIdWithExt.substring(0, lastDot) : publicIdWithExt;

        const timestamp = Math.round((new Date()).getTime() / 1000);
        
        const signatureString = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
        const encoder = new TextEncoder();
        const data = encoder.encode(signatureString);
        const hashBuffer = await crypto.subtle.digest('SHA-1', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const formData = new FormData();
        formData.append('public_id', publicId);
        formData.append('api_key', apiKey);
        formData.append('timestamp', timestamp);
        formData.append('signature', signature);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        return result.result === 'ok';
    } catch(e) {
        console.error("Failed to delete from cloudinary", e);
        return false;
    }
};
