import { X, Camera, Cropper, AlertCircle, Check, Crop, Upload } from 'lucide-react';
import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import getCroppedImg from '../../utils/cropImage';
import { generateCloudinarySignature } from '../../utils/cloudinaryUtils';
import './ImageUploadModal.css';

const ImageUploadModal = ({ isOpen, onClose, currentPreview, onUploadSuccess, userId }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [rawImageSrc, setRawImageSrc] = useState(null);
    
    // Cropper states
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const [error, setError] = useState('');
    const [status, setStatus] = useState('idle'); // idle, uploading, success
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef(null);

    const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dzbmrdpzu/image/upload';
    // Requires your Cloudinary API Key and Secret (Get these from your Dashboard)
    const CLOUDINARY_API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY || ''; 
    const CLOUDINARY_API_SECRET = import.meta.env.VITE_CLOUDINARY_API_SECRET || '';
    
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setError('');

        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            setError('Please select a valid image format (jpg, jpeg, png, webp).');
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            setError('File size must be less than 2 MB.');
            return;
        }

        setSelectedFile(file);
        
        const reader = new FileReader();
        reader.onloadend = () => setRawImageSrc(reader.result);
        reader.readAsDataURL(file);
    };

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleCropAndUpload = async () => {
        if (!rawImageSrc || !croppedAreaPixels) return;

        if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
            setError('Missing VITE_CLOUDINARY_API_KEY or SECRET in your .env file. Required for overriding.');
            return;
        }

        setStatus('uploading');
        setProgress(0);
        setError('');

        try {
            const croppedBlob = await getCroppedImg(rawImageSrc, croppedAreaPixels);
            
            // Build Signed Upload Request
            const timestamp = Math.round((new Date()).getTime() / 1000);
            const safeUserId = userId ? userId.toString().replace(/[^a-zA-Z0-9_-]/g, '') : 'default_user';
            const public_id = `avatar_${safeUserId}`;
            
            // Generate SHA-1 Hash
            const signature = await generateCloudinarySignature(public_id, timestamp, CLOUDINARY_API_SECRET);

            const formData = new FormData();
            formData.append('file', croppedBlob, 'profile.jpg');
            formData.append('api_key', CLOUDINARY_API_KEY);
            formData.append('timestamp', timestamp);
            formData.append('signature', signature);
            formData.append('public_id', public_id);
            // Notice we do NOT include 'upload_preset' in the signature generation if it's not signed, 
            // standard signed uploads override securely.

            const xhr = new XMLHttpRequest();
            xhr.open('POST', CLOUDINARY_URL, true);

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percentComplete = Math.round((e.loaded / e.total) * 100);
                    setProgress(percentComplete);
                }
            };

            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const response = JSON.parse(xhr.responseText);
                    setStatus('success');
                    onUploadSuccess(response.secure_url);
                    
                    setTimeout(() => {
                        handleClose();
                    }, 2000);
                } else {
                    setStatus('idle');
                    setError('Signed Upload failed. Check your API Keys.');
                    console.error('Cloudinary Error:', xhr.responseText);
                }
            };

            xhr.onerror = function() {
                setStatus('idle');
                setError('Upload failed. Please check your internet connection.');
            };

            xhr.send(formData);

        } catch (e) {
            console.error(e);
            setStatus('idle');
            setError('Failed to crop image. Please try another photo.');
        }
    };

    const handleClose = () => {
        setSelectedFile(null);
        setRawImageSrc(null);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setError('');
        setStatus('idle');
        setProgress(0);
        onClose();
    };

    return createPortal(
        <div className="image-upload-overlay animate-fade-in">
            <div className="image-upload-modal animate-slide-up">
                
                <div className="image-upload-header">
                    <h3 className="section-title !mb-0 text-lg">Update Profile Photo</h3>
                    <button onClick={handleClose} disabled={status === 'uploading'} className="modal-close-btn">
                        <X size={20} />
                    </button>
                </div>

                <div className="image-upload-body">
                    {/* View Area */}
                    {!rawImageSrc ? (
                        <div className="upload-preview-container">
                            <img 
                                src={currentPreview || 'https://ui-avatars.com/api/?name=User'} 
                                alt="Profile Preview" 
                                className="upload-preview-avatar"
                            />
                            {status === 'idle' && (
                                <button 
                                    className="upload-select-btn" 
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Change avatar"
                                >
                                    <Camera size={18} />
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="cropper-container">
                            <div className="cropper-workspace">
                                <Cropper
                                    image={rawImageSrc}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={3/4}
                                    cropShape="rect"
                                    showGrid={false}
                                    onCropChange={setCrop}
                                    onCropComplete={onCropComplete}
                                    onZoomChange={setZoom}
                                />
                            </div>
                            {/* Zoom Control */}
                            <div className="zoom-control-container">
                                <span className="text-xs font-semibold text-slate-500">Zoom</span>
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    aria-labelledby="Zoom"
                                    onChange={(e) => setZoom(e.target.value)}
                                    className="zoom-slider"
                                />
                            </div>
                        </div>
                    )}

                    <input 
                        type="file" 
                        accept=".jpg,.jpeg,.png,.webp" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        onChange={handleFileChange} 
                    />

                    {error && (
                        <div className="upload-error-msg animate-fade-in">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}
                    
                    {status === 'uploading' && (
                        <div className="upload-progress-container animate-fade-in">
                            <div className="flex justify-between items-center text-xs mb-1 font-bold text-slate-600 dark:text-slate-300">
                                <span>Uploading...</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="upload-progress-bar-bg">
                                <div 
                                    className="upload-progress-bar-fill" 
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="upload-success-msg animate-slide-up">
                            <Check size={18} />
                            <span>Photo uploaded successfully</span>
                        </div>
                    )}

                    {/* Action Area */}
                    <div className="upload-action-area">
                        {status === 'idle' && (
                            <>
                                {rawImageSrc ? (
                                    <button className="btn-primary w-full py-3 flex items-center justify-center gap-2" onClick={handleCropAndUpload}>
                                        <Crop size={18} />
                                        Crop & Upload
                                    </button>
                                ) : (
                                    <button className="upload-action-btn w-full flex items-center justify-center gap-2" onClick={() => fileInputRef.current?.click()}>
                                        <Upload size={20} />
                                        Select New Photo
                                    </button>
                                )}
                                {!rawImageSrc && (
                                    <p className="text-[12px] text-center text-slate-400 mt-5 mb-2 font-medium">
                                        JPG, PNG, or WEBP. Max size: 2 MB
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                </div>

            </div>
        </div>,
        document.body
    );
};

export default ImageUploadModal;
