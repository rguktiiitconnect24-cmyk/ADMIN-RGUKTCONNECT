import { UploadCloud, X, File, ImageIcon, AlertCircle, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './TestFileUpload.css';

const TestFileUpload = () => {
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [uploadedDriveUrl, setUploadedDriveUrl] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [dragActive, setDragActive] = useState(false);

    // New required fields for GAS
    const [formData, setFormData] = useState({
        branch: 'CSE',
        year: 'E1',
        semester: 'Sem-1',
        subject: 'Test Subject'
    });

    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw3zrX5t7EDSfe_KU2VaGQVisqUmZ1Tmv9hRCI9lWPC3QtuNfb0oMG1ITV2TbMc96e4/exec";

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleFile = (selectedFile) => {
        if (selectedFile) {
            setFile(selectedFile);
            setStatus({ type: '', message: '' });
            setUploadedDriveUrl(null); // Reset drive link on new file selection
            if (selectedFile.type.startsWith('image/')) {
                setPreviewUrl(URL.createObjectURL(selectedFile));
            } else {
                setPreviewUrl(null);
            }
        }
    }

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };
    
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };
    
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const clearFile = () => {
        setFile(null);
        setPreviewUrl(null);
        setUploadedDriveUrl(null);
    };

    const getDriveEmbedLink = (url) => {
        if (!url) return null;
        // Try to match the ID from /d/ID/view or /open?id=ID
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
            return `https://drive.google.com/file/d/${match[1]}/preview`;
        }
        return url;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) {
            setStatus({ type: 'error', message: 'Please select a file first.' });
            return;
        }

        setUploading(true);
        setStatus({ type: '', message: '' });

        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64Data = event.target.result.split(',')[1];
                
                try {
                    const response = await fetch(SCRIPT_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'text/plain;charset=utf-8',
                        },
                        body: JSON.stringify({
                            fileName: file.name,
                            fileBase64: base64Data,
                            branch: formData.branch,
                            year: formData.year,
                            semester: formData.semester,
                            subject: formData.subject
                        })
                    });

                    const result = await response.text();
                    
                    let jsonResult;
                    try {
                        jsonResult = JSON.parse(result);
                    } catch (e) {
                        console.log("GAS Non-JSON Response:", result);
                    }

                    if (response.ok && (!jsonResult || jsonResult.status === 'success')) {
                        setStatus({ type: 'success', message: 'File uploaded successfully! Check Google Drive.' });
                        if (jsonResult) {
                            const rawUrl = jsonResult.fileUrl || jsonResult.url || jsonResult.link || jsonResult.fileLink;
                            if (rawUrl) {
                                setUploadedDriveUrl(rawUrl);
                            }
                        }
                    } else if (jsonResult && jsonResult.status === 'error') {
                        setStatus({ type: 'error', message: 'Script error: ' + jsonResult.message });
                    } else {
                        setStatus({ type: 'error', message: 'Server returned an error: ' + response.status });
                    }
                } catch (err) {
                    console.error("Upload error:", err);
                    setStatus({ type: 'error', message: 'Failed to upload file. Check console for details.' });
                } finally {
                    setUploading(false);
                }
            };
            
            reader.onerror = () => {
                setStatus({ type: 'error', message: 'Failed to read file.' });
                setUploading(false);
            };

            reader.readAsDataURL(file);

        } catch (error) {
            console.error('Error in upload process:', error);
            setStatus({ type: 'error', message: 'An unexpected error occurred.' });
            setUploading(false);
        }
    };

    return (
        <div className="tfu-wrapper">
            <div className="tfu-container">
                
                <div className="tfu-header">
                    <div>
                        <h1 className="tfu-title">Test File Upload</h1>
                        <p className="tfu-subtitle">
                            Upload a file to test the Google Apps Script endpoint. Try uploading an image to see the dynamic preview.
                        </p>
                    </div>
                    <button 
                        onClick={() => navigate('/admin/dashboard')} 
                        className="tfu-back-btn"
                    >
                        <span>&larr;</span> Back to Dashboard
                    </button>
                </div>

                <div className="tfu-card">
                    <div className="tfu-blob-1"></div>
                    <div className="tfu-blob-2"></div>
                    
                    <form onSubmit={handleUpload} className="tfu-form">
                        
                        <div className="tfu-grid">
                            {[
                                { label: 'Branch', name: 'branch' },
                                { label: 'Year', name: 'year' },
                                { label: 'Semester', name: 'semester' },
                                { label: 'Subject', name: 'subject' }
                            ].map((field) => (
                                <div key={field.name} className="tfu-field-group">
                                    <label className="tfu-label">
                                        {field.label}
                                    </label>
                                    <input 
                                        type="text" 
                                        name={field.name} 
                                        value={formData[field.name]} 
                                        onChange={handleInputChange}
                                        className="tfu-input"
                                        required
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="tfu-upload-section">
                            <label className="tfu-label" style={{display: 'block', marginBottom: '0.75rem'}}>Select File</label>
                            
                            {!file ? (
                                <div 
                                    className={`tfu-dropzone ${dragActive ? 'active' : ''}`}
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                >
                                    <input 
                                        id="file-upload" 
                                        name="file-upload" 
                                        type="file" 
                                        className="tfu-file-input" 
                                        onChange={handleFileChange} 
                                    />
                                    <div className="tfu-upload-icon">
                                        <UploadCloud size={40} strokeWidth={1.5} />
                                    </div>
                                    <p className="tfu-upload-text">
                                        <span>Click to upload</span> or drag and drop
                                    </p>
                                    <p className="tfu-upload-subtext">
                                        Any file up to 10MB
                                    </p>
                                </div>
                            ) : (
                                <div className="tfu-preview-card">
                                    <button 
                                        type="button"
                                        onClick={clearFile}
                                        className="tfu-clear-btn"
                                    >
                                        <X size={16} />
                                    </button>
                                    
                                    {previewUrl ? (
                                        <div className="tfu-image-preview">
                                            <img src={previewUrl} alt="Preview" />
                                        </div>
                                    ) : (
                                        <div className="tfu-file-placeholder">
                                            <File size={48} strokeWidth={1.5} />
                                        </div>
                                    )}
                                    
                                    <div className="tfu-file-info">
                                        <div className="tfu-file-details">
                                            {previewUrl ? <ImageIcon className="tfu-file-icon" size={20} /> : <File className="tfu-file-icon" size={20} />}
                                            <div className="tfu-file-name-container">
                                                <p className="tfu-file-name">{file.name}</p>
                                                <p className="tfu-file-size">{(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type || 'Unknown type'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {status.message && (
                            <div className={`tfu-status ${status.type === 'error' ? 'tfu-status-error' : 'tfu-status-success'}`}>
                                {status.type === 'error' ? <AlertCircle size={20} style={{marginTop: '0.125rem'}} /> : <CheckCircle size={20} style={{marginTop: '0.125rem'}} />}
                                <p>{status.message}</p>
                            </div>
                        )}

                        <div className="tfu-actions">
                            <button
                                type="submit"
                                disabled={uploading || !file}
                                className="tfu-submit-btn"
                            >
                                {uploading && (
                                    <svg className="tfu-spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                )}
                                {uploading ? 'Uploading securely...' : 'Test Upload'}
                            </button>
                        </div>
                    </form>

                    {uploadedDriveUrl && (
                        <div className="tfu-drive-section">
                            <h2 className="tfu-drive-title">
                                <ImageIcon size={20} color="#60a5fa" />
                                Uploaded Image from Drive
                            </h2>
                            <div className="tfu-drive-image-container" style={{ padding: '0.5rem', border: '1px solid #334155' }}>
                                <iframe 
                                    src={getDriveEmbedLink(uploadedDriveUrl)} 
                                    className="tfu-drive-embed"
                                    title="Google Drive Embedded View"
                                    allow="autoplay"
                                    style={{ width: '100%', height: '400px', border: 'none', borderRadius: '0.5rem' }}
                                ></iframe>
                            </div>
                            <div style={{textAlign: 'center'}}>
                                <a href={uploadedDriveUrl} target="_blank" rel="noopener noreferrer" className="tfu-drive-link">
                                    Open in Google Drive &nearr;
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TestFileUpload;
