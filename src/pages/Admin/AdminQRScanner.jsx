import { X, AlertCircle, RefreshCw, QrCode } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import './AdminQRScanner.css';

const AdminQRScanner = () => {
    const navigate = useNavigate();
    const [scannerState, setScannerState] = useState('idle'); // idle | scanning | success | error
    const [errorMsg, setErrorMsg] = useState('');
    const [torchOn, setTorchOn] = useState(false);
    const scannerRef = useRef(null);
    const html5QrRef = useRef(null);

    const startScanner = async () => {
        setScannerState('scanning');
        setErrorMsg('');

        try {
            const cameras = await Html5Qrcode.getCameras();
            if (!cameras || cameras.length === 0) {
                setErrorMsg('No camera found on this device.');
                setScannerState('error');
                return;
            }

            // Prefer back camera
            const backCamera = cameras.find(c =>
                c.label?.toLowerCase().includes('back') ||
                c.label?.toLowerCase().includes('rear') ||
                c.label?.toLowerCase().includes('environment')
            ) || cameras[cameras.length - 1];

            html5QrRef.current = new Html5Qrcode('qr-scanner-region');

            await html5QrRef.current.start(
                { deviceId: { exact: backCamera.id } },
                {
                    fps: 12,
                    qrbox: { width: 240, height: 240 },
                    aspectRatio: 1.0,
                },
                (decodedText) => handleScanSuccess(decodedText),
                () => { /* quiet scan errors */ }
            );
        } catch (err) {
            console.error('Scanner start failed:', err);
            setErrorMsg('Could not access camera. Please grant camera permission.');
            setScannerState('error');
        }
    };

    const stopScanner = async () => {
        if (html5QrRef.current) {
            try {
                await html5QrRef.current.stop();
                html5QrRef.current.clear();
                html5QrRef.current = null;
            } catch (e) {
                console.warn('Scanner stop error:', e);
            }
        }
    };

    const handleScanSuccess = async (raw) => {
        await stopScanner();
        setScannerState('success');

        let uid = null;

        // Parse formats: "STUDENT_ID:{uid}" or a URL ending in /student/{uid}
        if (raw.startsWith('STUDENT_ID:')) {
            uid = raw.replace('STUDENT_ID:', '').trim();
        } else {
            const urlMatch = raw.match(/\/student\/([a-zA-Z0-9_-]{20,})/);
            if (urlMatch) uid = urlMatch[1];
        }

        if (uid) {
            setTimeout(() => navigate(`/admin/student/${uid}`), 800);
        } else {
            setErrorMsg(`Unrecognized QR format:\n"${raw}"`);
            setScannerState('error');
        }
    };

    const handleReset = async () => {
        await stopScanner();
        setScannerState('idle');
        setErrorMsg('');
    };

    useEffect(() => {
        startScanner();
        return () => { stopScanner(); };
    }, []);

    return (
        <div className="qr-scan-page">
            <div className="qr-scan-header">
                <button className="qr-scan-back" onClick={() => { stopScanner(); navigate('/admin/dashboard'); }}>
                    <X size={20} />
                </button>
                <div>
                    <h1 className="qr-scan-title">QR Scanner</h1>
                    <p className="qr-scan-sub">Scan student ID card QR code</p>
                </div>
            </div>

            <div className="qr-scan-body">
                {/* Camera view */}
                <div className="qr-scan-viewport">
                    <div id="qr-scanner-region" className="qr-scanner-region" />

                    {/* Overlay corners */}
                    {scannerState === 'scanning' && (
                        <>
                            <div className="qr-corner qr-corner-tl" />
                            <div className="qr-corner qr-corner-tr" />
                            <div className="qr-corner qr-corner-bl" />
                            <div className="qr-corner qr-corner-br" />
                            <div className="qr-scan-line" />
                        </>
                    )}

                    {/* Success overlay */}
                    {scannerState === 'success' && (
                        <div className="qr-scan-status-overlay success">
                            <div className="qr-status-icon success-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                            <p>QR Detected!</p>
                            <p className="qr-status-sub">Loading student profile…</p>
                        </div>
                    )}

                    {/* Error overlay */}
                    {scannerState === 'error' && (
                        <div className="qr-scan-status-overlay error">
                            <AlertCircle size={48} />
                            <p>{errorMsg || 'Scan failed'}</p>
                            <button className="qr-retry-btn" onClick={handleReset}>
                                <RefreshCw size={14} /> Try Again
                            </button>
                        </div>
                    )}

                    {/* Idle overlay */}
                    {scannerState === 'idle' && (
                        <div className="qr-scan-status-overlay idle">
                            <QrCode size={48} className="qr-idle-icon" />
                            <p>Starting camera…</p>
                            <button className="qr-retry-btn" onClick={startScanner}>
                                <RefreshCw size={14} /> Start Scanner
                            </button>
                        </div>
                    )}
                </div>

                {/* Instructions */}
                <div className="qr-scan-instructions">
                    <div className="qr-instruction-item">
                        <div className="qr-instr-dot" />
                        <span>Point camera at student's digital ID card QR code</span>
                    </div>
                    <div className="qr-instruction-item">
                        <div className="qr-instr-dot" />
                        <span>Hold steady — scan happens automatically</span>
                    </div>
                    <div className="qr-instruction-item">
                        <div className="qr-instr-dot" />
                        <span>QR always shows live data — no regeneration needed</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminQRScanner;
