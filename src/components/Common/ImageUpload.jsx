import { Upload, X, Loader, Check, ImageIcon } from 'lucide-react';
import { useState, useRef } from 'react';
import { auth } from '../../config/firebase';
import * as imageService from '../../services/imageService';
import './ImageUpload.css';

const ImageUpload = ({
    onUploadComplete,
    userId: propUserId, // Allow passing userId as prop, or use current auth user
    path = 'uploads/profile_images/',
    maxSizeMB = 2,
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
}) => {
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const fileInputRef = useRef(null);

    const effectiveUserId = propUserId || auth.currentUser?.uid;

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        // Reset states
        setError(null);
        setSuccess(false);
        setProgress(0);

        // Type Validation
        if (!allowedTypes.includes(selectedFile.type)) {
            setError('Invalid file type. Please upload JPG, PNG, or WebP.');
            return;
        }

        // Initial Size Check (pre-optimization)
        // We'll optimize later, but if it's monstrously large, we might warn.
        // But let's stick to the 2MB limit for the FINAL saved file.

        setFile(selectedFile);

        // Create preview
        const objectUrl = URL.createObjectURL(selectedFile);
        setPreviewUrl(objectUrl);
    };

    const handleClear = () => {
        setFile(null);
        setPreviewUrl(null);
        setError(null);
        setSuccess(false);
        setProgress(0);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleUpload = async () => {
        if (!file || !effectiveUserId) {
            setError("Authentication required or no file selected.");
            return;
        }

        setUploading(true);
        setError(null);
        setProgress(0);

        try {
            // 1. Optimize image (Resize & Compress)
            const optimizedBlob = await imageService.optimizeImage(file, 1200, 0.8);
            
            // 2. Final Size Check (2MB limit as per requirements)
            if (optimizedBlob.size > maxSizeMB * 1024 * 1024) {
                setError(`Optimized file still exceeds ${maxSizeMB}MB. Please try a different image.`);
                setUploading(false);
                return;
            }

            // 3. Upload to Server (Firebase Storage) with progress
            const downloadUrl = await imageService.uploadProfileImage(
                effectiveUserId, 
                optimizedBlob, 
                (p) => setProgress(Math.round(p))
            );

            // 4. Save to Database (Firestore)
            await imageService.updateUserProfilePhoto(effectiveUserId, downloadUrl);

            setSuccess(true);
            if (onUploadComplete) {
                onUploadComplete(downloadUrl);
            }
        } catch (err) {
            console.error("Upload failed:", err);
            setError("Upload failed. Please check your connection and try again.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="image-upload-container">
            {!previewUrl ? (
                <label className="upload-dropzone" htmlFor="profile-image-upload-input">
                    <div className="upload-icon-ring">
                        <Upload size={32} className="upload-icon" />
                    </div>
                    <p className="upload-text">Select Profile Photo</p>
                    <p className="upload-limit">Max size: {maxSizeMB}MB (Auto-optimized)</p>
                    <input
                        id="profile-image-upload-input"
                        type="file"
                        onChange={handleFileSelect}
                        accept={allowedTypes.join(',')}
                        className="hidden-input"
                    />
                </label>
            ) : (
                <div className="preview-card">
                    <div className="preview-image-container">
                        <img src={previewUrl} alt="Preview" className="preview-image" />
                        
                        {uploading && (
                            <div className="upload-overlay">
                                <div className="progress-ring-container">
                                    <svg viewBox="0 0 36 36" className="circular-chart">
                                        <path className="circle-bg"
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        />
                                        <path className="circle"
                                            strokeDasharray={`${progress}, 100`}
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        />
                                    </svg>
                                    <span className="progress-text">{progress}%</span>
                                </div>
                            </div>
                        )}

                        {!uploading && !success && (
                            <button
                                className="remove-btn"
                                onClick={handleClear}
                                title="Change photo"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    <div className="preview-actions">
                        {uploading ? (
                            <div className="loading-state">
                                <Loader size={20} className="animate-spin" />
                                <span>Optimizing & Uploading...</span>
                            </div>
                        ) : success ? (
                            <div className="success-state">
                                <Check size={20} />
                                <span>Profile Updated!</span>
                            </div>
                        ) : (
                            <button
                                className="upload-btn"
                                onClick={handleUpload}
                            >
                                <ImageIcon size={18} />
                                Upload & Save
                            </button>
                        )}
                    </div>
                </div>
            )}

            {error && <div className="error-message-upload">{error}</div>}
        </div>
    );
};

export default ImageUpload;
