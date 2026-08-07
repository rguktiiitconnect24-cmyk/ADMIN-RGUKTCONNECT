import { storage, db } from '../config/firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';

/**
 * Optimizes an image using the Canvas API
 * @param {File} file - The original file
 * @param {number} maxWidth - Maximum width (default 1000px)
 * @param {number} quality - Compression quality (0 to 1)
 * @returns {Promise<Blob>} - Compressed image blob
 */
export const optimizeImage = (file, maxWidth = 1000, quality = 0.8) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Scale down if wider than maxWidth
                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Canvas toBlob failed'));
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
};

/**
 * Uploads an optimized image to Firebase Storage with progress tracking
 * @param {string} userId - Current user's ID
 * @param {Blob|File} file - The image to upload
 * @param {Function} onProgress - Callback for upload progress
 * @returns {Promise<string>} - The public download URL
 */
export const uploadProfileImage = (userId, file, onProgress) => {
    return new Promise((resolve, reject) => {
        const timestamp = Date.now();
        const filename = `${userId}_${timestamp}.jpg`;
        const storagePath = `uploads/profile_images/${filename}`;
        const storageRef = ref(storage, storagePath);
        
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (onProgress) onProgress(progress);
            },
            (error) => {
                console.error("Upload error:", error);
                reject(error);
            },
            async () => {
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(downloadURL);
                } catch (err) {
                    reject(err);
                }
            }
        );
    });
};

/**
 * Updates the user's photo URL in Firestore
 * @param {string} userId - Current user's ID
 * @param {string} photoUrl - The new photo URL
 */
export const updateUserProfilePhoto = async (userId, photoUrl) => {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            photo: photoUrl,
            updatedAt: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error("Firestore update error:", error);
        throw error;
    }
};

/**
 * Deletes a user's profile image from Firebase Storage
 * @param {string} photoUrl - The public download URL of the photo to delete
 * @returns {Promise<boolean>}
 */
export const deleteProfileImage = async (photoUrl) => {
    if (!photoUrl || !photoUrl.includes('firebasestorage.googleapis.com')) return false;
    try {
        const fileRef = ref(storage, photoUrl);
        await deleteObject(fileRef);
        return true;
    } catch (error) {
        console.error("Error deleting image from storage:", error);
        return false;
    }
};
