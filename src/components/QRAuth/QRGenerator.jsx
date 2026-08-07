import { X, RefreshCw, QRCode, Smartphone, CheckCircle, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { initiateQRSession, listenToQRSession, provideEncryptedCredentials } from '../../services/qrAuthService';
import { db } from '../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import './QRAuth.css';

const QRGenerator = ({ onClose }) => {
    const { user } = useAuth();
    const [sessionData, setSessionData] = useState(null);
    const [status, setStatus] = useState('generating'); // generating, ready, scanned, success, expired, error
    const [errorMessage, setErrorMessage] = useState('');
    const [timeLeft, setTimeLeft] = useState(120); // 2 minutes

    useEffect(() => {
        if (user?.uid) {
            generateSession();
        }
        return () => {
            // Unsubscribe happens implicitly on component unmount if we stored the fn, 
            // but we handle expiration in the service anyway.
        };
    }, [user]);

    useEffect(() => {
        let timer;
        if (status === 'ready' && timeLeft > 0) {
            timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        } else if (timeLeft === 0 && status === 'ready') {
            setStatus('expired');
        }
        return () => clearInterval(timer);
    }, [status, timeLeft]);

    const generateSession = async () => {
        try {
            setStatus('generating');
            setTimeLeft(120);
            const data = await initiateQRSession(user.uid);
            setSessionData(data);
            setStatus('ready');

            // Start listening
            listenToQRSession(data.sessionId, () => handleScanned(data), () => setStatus('expired'));
        } catch (err) {
            console.error(err);
            setErrorMessage("Failed to initiate secure session.");
            setStatus('error');
        }
    };

    const handleScanned = async (currentSessionData) => {
        setStatus('scanned');
        try {
            // Fetch credentials to encrypt and pass
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const userData = userDoc.data();

            if (!userData.password) {
                throw new Error("Missing password payload. Please log out and back in once to initialize your credential sync, or login manually on your mobile.");
            }

            const credentials = {
                email: userData.email,
                password: userData.password
            };

            await provideEncryptedCredentials(currentSessionData.sessionId, currentSessionData.encryptionKey, credentials);
            setStatus('success');

            setTimeout(() => {
                if (onClose) onClose();
            }, 3000);
        } catch (err) {
            console.error("Payload execution failed:", err);
            setErrorMessage(err.message);
            setStatus('error');
        }
    };

    return (
        <div className="qr-generator-container">
            <div className="qr-header">
                <h2>Cross-Device Login</h2>
                {onClose && (
                    <button className="qr-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                )}
            </div>

            <div className="qr-body">
                {status === 'generating' && (
                    <div className="qr-loading">
                        <RefreshCw className="animate-spin" size={32} />
                        <p>Generating Secure Session...</p>
                    </div>
                )}

                {status === 'ready' && sessionData && (
                    <div className="qr-ready-state">
                        <div className="qr-code-wrapper animate-fade-in">
                            <QRCode
                                value={sessionData.qrString}
                                size={220}
                                level="H"
                                fgColor="#1e293b"
                                bgColor="#ffffff"
                            />
                            <div className="qr-logo-overlay">
                                <img src="/logo.svg" alt="Logo" className="w-6 h-6 object-contain" />
                            </div>
                        </div>
                        <p className="qr-instruction">
                            Scan this code with your mobile device to log in instantly.
                        </p>
                        <div className="qr-timer">
                            Expires in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                        </div>
                    </div>
                )}

                {status === 'scanned' && (
                    <div className="qr-loading animate-fade-in text-blue-600">
                        <Smartphone className="animate-bounce" size={48} />
                        <p className="font-semibold mt-4">Device Connected!</p>
                        <p className="text-sm opacity-75">Transferring secure session...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="qr-success animate-fade-in text-green-600">
                        <CheckCircle size={48} />
                        <p className="font-semibold mt-4">Login Transferred!</p>
                        <p className="text-sm opacity-75">You are now logged in on your mobile device.</p>
                    </div>
                )}

                {status === 'expired' && (
                    <div className="qr-expired animate-fade-in text-gray-500">
                        <AlertCircle size={48} />
                        <p className="font-semibold mt-4">Session Expired</p>
                        <button className="btn btn-secondary mt-4" onClick={generateSession}>
                            <RefreshCw size={16} /> Generate New Code
                        </button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="qr-error animate-fade-in text-red-500">
                        <AlertCircle size={48} />
                        <p className="font-semibold mt-4">Transfer Failed</p>
                        <p className="text-sm opacity-75 mt-2 px-6 text-center">{errorMessage || "Could not authenticate the mobile device."}</p>
                        <button className="btn btn-secondary mt-4 w-full" style={{ justifyContent: 'center' }} onClick={generateSession}>
                            Try Again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QRGenerator;
