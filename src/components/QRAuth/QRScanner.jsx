import { X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { markSessionAsScanned, awaitAuthenticationPayload } from '../../services/qrAuthService';
import { useAuth } from '../../context/AuthContext';
import './QRAuth.css';

const QRScanner = ({ onClose, onSuccess }) => {
    const { login } = useAuth();
    const [status, setStatus] = useState('initializing'); // initializing, scanning, processing, success, error
    const [errorMessage, setErrorMessage] = useState('');
    const [html5QrCode, setHtml5QrCode] = useState(null);
    const isProcessingRef = useRef(false);

    useEffect(() => {
        const scanner = new Html5Qrcode("reader-container");
        setHtml5QrCode(scanner);

        const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };

        scanner.start(
            { facingMode: "environment" },
            config,
            handleScanSuccess,
            handleScanError
        ).then(() => {
            setStatus('scanning');
        }).catch((err) => {
            console.error(err);
            setStatus('error');
            setErrorMessage("Camera access denied or unavailable.");
        });

        return () => {
            if (scanner && scanner.isScanning) {
                scanner.stop().catch(console.error);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleScanSuccess = async (decodedText) => {
        if (!decodedText.startsWith('rgukt-qr-login|')) return;
        if (isProcessingRef.current) return;

        isProcessingRef.current = true;

        // Stop scanning immediately
        if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode.stop().catch(console.error);
        }

        try {
            setStatus('processing');
            const [, sessionId, encryptionKey] = decodedText.split('|');

            // Signal to Desktop that we have scanned it
            await markSessionAsScanned(sessionId);

            // Wait for Desktop to encrypt and upload the payload
            awaitAuthenticationPayload(
                sessionId,
                encryptionKey,
                async (credentials) => {
                    try {
                        const email = credentials.email;
                        const password = credentials.credentials?.password || credentials.password;

                        await login(email, password);

                        // Only show success after Firebase returns OK
                        setStatus('success');

                        // Wait a moment so the user can see the success animation jumping
                        setTimeout(() => {
                            if (onSuccess) onSuccess();
                        }, 2000);

                    } catch (loginErr) {
                        setStatus('error');
                        setErrorMessage(loginErr.message || "Authentication failed with provided credentials.");
                        isProcessingRef.current = false;
                    }
                },
                (err) => {
                    setStatus('error');
                    setErrorMessage(err.message || "Failed to decrypt secure payload.");
                    isProcessingRef.current = false;
                }
            );

        } catch (err) {
            setStatus('error');
            setErrorMessage(err.message);
            isProcessingRef.current = false;
        }
    };

    const handleScanError = (error) => {
        // Ignored. html5-qrcode fires this continuously on every failed frame.
    };

    return (
        <div className="qr-scanner-container">
            <div className="qr-header">
                <h2>Scan to Login</h2>
                <button className="qr-close-btn flex-shrink-0" onClick={onClose}>
                    <X size={20} />
                </button>
            </div>

            <div className="qr-body" style={{ minHeight: '350px' }}>
                {(status === 'initializing' || status === 'scanning') && (
                    <div style={{ position: 'relative', width: '100%', maxWidth: '300px', margin: '0 auto' }}>
                        <div id="reader-container" style={{ width: '100%', borderRadius: '1rem', overflow: 'hidden' }}></div>
                        {status === 'initializing' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-surface)] z-10" style={{ borderRadius: '1rem' }}>
                                <Loader2 className="animate-spin text-[var(--color-primary-500)] mb-2" size={32} />
                                <p className="text-sm">Requesting Camera...</p>
                            </div>
                        )}
                        <p className="qr-instruction mt-4 text-center">
                            Point your camera at the Desktop QR code.
                        </p>
                    </div>
                )}

                {status === 'processing' && (
                    <div className="qr-loading animate-fade-in flex flex-col items-center py-8">
                        <Loader2 className="animate-spin text-[var(--color-primary-500)]" size={48} />
                        <p className="font-semibold mt-6 text-lg">Authenticating...</p>
                        <p className="text-sm opacity-75 mt-2">Connecting secure session...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="qr-success animate-fade-in flex flex-col items-center py-8 text-green-600">
                        <CheckCircle size={56} />
                        <p className="font-bold mt-6 text-xl">Login Successful!</p>
                        <p className="text-sm text-gray-600 mt-2">Redirecting to Dashboard...</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="qr-error animate-fade-in flex flex-col items-center py-8 text-red-500">
                        <AlertCircle size={56} />
                        <p className="font-bold mt-6 text-xl">Scan Failed</p>
                        <p className="text-sm opacity-80 mt-2 px-6 text-center">{errorMessage || "An unknown error occurred."}</p>
                        <button
                            onClick={onClose}
                            className="uiverse-back-btn w-full"
                        >
                            <div className="svg-wrapper">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 1024 1024"
                                >
                                    <path
                                        d="M224 480h640a32 32 0 1 1 0 64H224a32 32 0 0 1 0-64z"
                                    ></path>
                                    <path
                                        d="m237.248 512 265.408 265.344a32 32 0 0 1-45.312 45.312l-288-288a32 32 0 0 1 0-45.312l288-288a32 32 0 1 1 45.312 45.312L237.248 512z"
                                    ></path>
                                </svg>
                            </div>
                            <p>Go Back</p>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QRScanner;
