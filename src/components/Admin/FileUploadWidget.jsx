import { UploadCloud, FileText, X, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { pdfService } from '../../services/pdfService';
import { resolveBackendUrl } from '../../config/driveBackends';

const FileUploadWidget = ({ 
    onUploadSuccess, 
    metadata, 
    selectedProgramId,
    label = "Upload PDF", 
    accept = "application/pdf",
    onSuccess,
    onError
}) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [progressMsg, setProgressMsg] = useState('');
    const [uploadPercent, setUploadPercent] = useState(0);

    const handleSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUploadClick = async () => {
        if (!selectedFile) return;
        setIsUploading(true);
        setProgressMsg('Starting upload...');
        setUploadPercent(0);
        
        // Start simulated progress for fetch
        let simProgress = 0;
        const progressInterval = setInterval(() => {
            simProgress += (90 - simProgress) * 0.1; // Asymptotic approach to 90%
            if (simProgress > 90) simProgress = 90;
            setUploadPercent(Math.round(simProgress));
        }, 300);
        
        try {
            const backendUrl = resolveBackendUrl(selectedProgramId, metadata.year, metadata.branch);
            if (!backendUrl) {
                throw new Error("Automated uploads are not configured for this section.");
            }

            // We only need the message updates now
            const uploadResult = await pdfService.uploadFileToDrive(selectedFile, metadata, (msg) => {
                setProgressMsg(msg);
            }, backendUrl);
            
            clearInterval(progressInterval);
            setProgressMsg('Saving metadata...');
            setUploadPercent(95);
            
            const firestoreResult = await pdfService.uploadPdfMetadata({
                gdFileId: uploadResult.fileId || '',
                fileName: uploadResult.fileName || selectedFile.name,
                publicViewUrl: uploadResult.fileUrl || uploadResult.url || uploadResult.link || '',
                embedUrl: uploadResult.embedUrl || '',
                downloadUrl: uploadResult.downloadUrl || '',
                size: uploadResult.size || selectedFile.size || 0,
                mimeType: uploadResult.mimeType || selectedFile.type || 'application/pdf',
                backendUrl: backendUrl,
                ...metadata
            });

            if (firestoreResult.success) {
                setUploadPercent(100);
                if (onSuccess) onSuccess('File uploaded successfully!');
                onUploadSuccess(firestoreResult.id);
                setSelectedFile(null); // Reset after successful upload
            } else {
                throw new Error('Metadata save failed');
            }
        } catch (error) {
            clearInterval(progressInterval);
            console.error('Upload Error:', error);
            if (onError) onError(error.message);
        } finally {
            setIsUploading(false);
            setProgressMsg('');
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '16px',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
            {!selectedFile ? (
                <label className="upload-area-horizontal group">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-primary-500)' }}>
                            <UploadCloud size={20} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--color-text-main)' }}>{label}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>Click to browse files</span>
                        </div>
                    </div>
                    <div className="hidden sm:block" style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        padding: '6px 12px',
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text-main)',
                        borderRadius: '8px',
                        border: '1px solid var(--color-border)'
                    }}>
                        Browse
                    </div>
                    <input type="file" accept={accept} className="hidden" onChange={handleSelect} />
                </label>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
                    <div className="uploaded-doc-card" style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                            <FileText size={20} style={{ color: 'var(--color-primary-500)', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--color-text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={selectedFile.name}>
                                {selectedFile.name}
                            </span>
                        </div>
                        {!isUploading && (
                            <button 
                                type="button" 
                                onClick={() => setSelectedFile(null)} 
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '6px',
                                    color: 'var(--color-text-muted)',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    borderRadius: '6px'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                                title="Remove File"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>

                    {isUploading ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            width: '100%',
                            padding: '16px',
                            marginTop: '12px',
                            backgroundColor: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-main)', fontSize: '0.875rem', fontWeight: '600' }}>
                                    <span>{progressMsg}</span>
                                    {uploadPercent > 0 && uploadPercent < 100 && (
                                        <span style={{
                                            backgroundColor: 'var(--color-primary-600)',
                                            color: 'white',
                                            padding: '2px 8px',
                                            borderRadius: '999px',
                                            fontSize: '0.75rem',
                                            fontWeight: 'bold'
                                        }}>
                                            {uploadPercent}%
                                        </span>
                                    )}
                                </div>
                                <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-primary-500)', flexShrink: 0 }} />
                            </div>
                            <div className="upload-progress-container" style={{ width: '100%' }}>
                                <div 
                                    className="upload-progress-fill" 
                                    style={{ 
                                        width: `${uploadPercent > 0 ? uploadPercent : 100}%`,
                                        transition: 'width 0.3s ease-out'
                                    }}
                                ></div>
                            </div>
                        </div>
                    ) : (
                        <button 
                            type="button" 
                            onClick={handleUploadClick} 
                            className="btn-upload-primary self-end"
                        >
                            <UploadCloud size={18} /> Upload File
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default FileUploadWidget;
