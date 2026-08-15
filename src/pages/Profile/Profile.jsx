import StudentIDCard from '../../components/Profile/StudentIDCard';
import ImageUploadModal from '../../components/Profile/ImageUploadModal';
import QRGenerator from '../../components/QRAuth/QRGenerator';
import LogoutConfirm from '../../components/Common/LogoutConfirm';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import CustomSelect from '../../components/Common/CustomSelect';
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { User, Settings, Shield, Mail, Moon, Check, Key, HelpCircle, ShieldAlert, ShieldCheck, Info, ArrowUpRight, Trash2, Cog, Zap, Sunrise, Clock, Compass, Layout, Bell, Orbit, BookOpen, Award, MessageSquare, Search, ChevronRight, Sun, Pointer, Wind, Highlighter, Maximize, Camera, Lock, Fingerprint, EyeOff, Eye, FileDown, LoadingSpinner, Share2, LogoutConfirm, GraduationCap, Phone, Calendar, MapPin, Download, QrCode, Headphones, LogOut, X, ChevronLeft, XCircle, QRGenerator, ImageUploadModal, StudentIDCard } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';

import { Capacitor } from '@capacitor/core';
import { Share as CapacitorShare } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';
import { useDownload } from '../../context/DownloadContext';
import { nativeAuthService } from '../../services/nativeAuthService';
import { studentsData } from '../../data/students';
import { formatClassID } from '../../utils/formatUtils';
import { nativePermissionsService } from '../../services/nativePermissions';
import { nativeFileService } from '../../services/nativeFileService';
import { pdfService } from '../../services/pdfService';
import './Profile.css';
import { rtdb, db } from '../../config/firebase';
import { ref, get } from 'firebase/database';
import { collection, addDoc, getDocs, query, where, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';



const LOGO_DATA_URI = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHJlY3Qgd2lkdGg9IjUxMiIgaGVpZ2h0PSI1MTIiIHJ4PSIxMjgiIGZpbGw9InVybCgjcGFpbnQwX2xpbmVhcikiLz4KICA8cGF0aCBkPSJNMjU2IDEyMEw2NCAyMTBMMjU2IDMwMEw0NDggMjEwTDI1NiAxMjBaIiBmaWxsPSJ3aGl0ZSIvPgogIDxwYXRoIGQ9Ik0xMjggMjQwVjMyMEMxMjggMzIwIDE4MCAzNzAgMjU2IDM3MEMzMzIgMzcwIDM4NCAzMjAgMzg0IDMyMFYyNDBMMjU2IDMwMEwxMjggMjQwWiIgZmlsbD0id2hpdGUiLz4KICA8cGF0aCBkPSJNNDE2IDIxMFYzNDAiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMjAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogIDxjaXJjbGUgY3g9IjQxNiIgY3k9IjM1MCIgcj0iMTUiIGZpbGw9IndoaGl0ZSIvPgogIDxkZWZzPgog   PGxpbmVhckdyYWRpZW50IGlkPSJwYWludDBfbGluZWFyIiB4MT0iMCIgeTE9IjAiIHgyPSI1MTIiIHkyPSI1MTIiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgICAgPHN0b3Agc3RvcC1jb2xvcj0iIzRmNDZlNSIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMzNzMwYTMiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgPC9kZWZzPgo8L3N2Zz4=`;

const Profile = () => {
    const [activeTab, setActiveTab] = useState('personal');
    const { user, logout, updateProfileData, changePassword, setIntentionalLogout } = useAuth();
    const { showToast } = useToast();
    const { theme, themeMode, setThemeMode } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [isLoading, setIsLoading] = React.useState(false);

    React.useLayoutEffect(() => {
        // Handle URL-based tab switching
        if (location.pathname === '/profile/settings') {
            setActiveTab('settings_menu');
        } else if (location.pathname === '/profile') {
            // Only set to personal if we aren't already in a sub-setting (like navigation)
            // unless we specifically navigated to /profile
            setActiveTab('personal');
        }

        // Handle state-based tab switching (legacy fallback or specific deep-links)
        if (location.state?.initialTab) {
            setActiveTab(location.state.initialTab);
            window.history.replaceState({}, document.title);
        }
    }, [location.pathname, location.state]);
    const [isSaved, setIsSaved] = useState(false);
    const [showQRGenerator, setShowQRGenerator] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [showImageUpload, setShowImageUpload] = useState(false);
    const [showGoogleFormModal, setShowGoogleFormModal] = useState(false);
    const [showIDCard, setShowIDCard] = useState(false);
    const { startDownload, startShare, notify } = useDownload() || {};

    // Account Deletion States
    const [showDeleteRequestModal, setShowDeleteRequestModal] = useState(false);
    const [showPendingStatusModal, setShowPendingStatusModal] = useState(false);
    const [deletionReason, setDeletionReason] = useState('');
    const [deletionComments, setDeletionComments] = useState('');
    const [isSubmittingDeletion, setIsSubmittingDeletion] = useState(false);
    const [isRestoringAccount, setIsRestoringAccount] = useState(false);
    const [restoringStep, setRestoringStep] = useState(1);
    const [hasPendingDeletionRequest, setHasPendingDeletionRequest] = useState(false);
    const [pendingRequestData, setPendingRequestData] = useState(null);
    const [confirmDeletionCheckbox, setConfirmDeletionCheckbox] = useState(false);

    useEffect(() => {
        if (!user?.uid) return;
        const fetchPendingRequest = async () => {
            try {
                const q = query(
                    collection(db, 'deletion_requests'),
                    where('uid', '==', user.uid),
                    where('status', '==', 'pending')
                );
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    setHasPendingDeletionRequest(true);
                    const docSnap = querySnapshot.docs[0];
                    setPendingRequestData({ id: docSnap.id, ...docSnap.data() });
                } else {
                    setHasPendingDeletionRequest(false);
                    setPendingRequestData(null);
                }
            } catch (err) {
                console.error("Error checking deletion requests:", err);
            }
        };
        fetchPendingRequest();
    }, [user]);

    const handleOpenDeleteRequest = () => {
        if (hasPendingDeletionRequest) {
            setShowPendingStatusModal(true);
        } else {
            setDeletionReason('');
            setDeletionComments('');
            setConfirmDeletionCheckbox(false);
            setShowDeleteRequestModal(true);
        }
    };

    const handleSubmitDeletionRequest = async () => {
        if (!deletionReason) {
            showToast("Please select a reason for deletion.", "error");
            return;
        }
        if (!confirmDeletionCheckbox) {
            showToast("Please confirm that you understand the terms.", "error");
            return;
        }

        setIsSubmittingDeletion(true);
        try {
            const requestData = {
                uid: user.uid,
                studentId: user.studentId || user.uid,
                studentName: user.fullName || 'User',
                studentEmail: user.email || '',
                reason: deletionReason,
                comments: deletionComments,
                status: 'pending',
                createdAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, 'deletion_requests'), requestData);
            
            setHasPendingDeletionRequest(true);
            setPendingRequestData({ id: docRef.id, ...requestData });
            setShowDeleteRequestModal(false);
            setShowPendingStatusModal(true);
            showToast("Deletion request submitted successfully.", "success");
            if (notify) {
                notify("Account Deletion Requested", "Your account deletion request has been submitted for administrator review.");
            }
        } catch (error) {
            console.error("Error submitting deletion request:", error);
            showToast("Failed to submit request. Please try again.", "error");
        } finally {
            setIsSubmittingDeletion(false);
        }
    };

    const handleCancelDeletionRequest = async () => {
        setIsSubmittingDeletion(true);
        setIsRestoringAccount(true);
        setRestoringStep(1);

        try {
            await new Promise(r => setTimeout(r, 800));
            setRestoringStep(2);
            await new Promise(r => setTimeout(r, 800));
            setRestoringStep(3);
            await new Promise(r => setTimeout(r, 800));
            setRestoringStep(4);
            await new Promise(r => setTimeout(r, 800));
            setRestoringStep(5);
            await new Promise(r => setTimeout(r, 1000));

            let docId = pendingRequestData?.id;
            
            if (!docId) {
                const q = query(
                    collection(db, 'deletion_requests'),
                    where('uid', '==', user.uid),
                    where('status', '==', 'pending')
                );
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    docId = querySnapshot.docs[0].id;
                }
            }

            if (!docId) {
                showToast("Could not find the deletion request.", "error");
                setIsSubmittingDeletion(false);
                setIsRestoringAccount(false);
                return;
            }

            await deleteDoc(doc(db, 'deletion_requests', docId));
            setHasPendingDeletionRequest(false);
            setPendingRequestData(null);
            setShowPendingStatusModal(false);
            setIsRestoringAccount(false);
            setRestoringStep(1);
            showToast("Account restored and deletion request cancelled successfully.", "success");
            if (notify) {
                notify("Request Cancelled", "Your account deletion request has been cancelled.");
            }
        } catch (error) {
            console.error("Error cancelling deletion request:", error);
            showToast("Failed to cancel request. Please try again.", "error");
            setIsRestoringAccount(false);
        } finally {
            setIsSubmittingDeletion(false);
        }
    };

    // Custom Dropdown States
    const [isCampusOpen, setIsCampusOpen] = useState(false);
    const campusRef = useRef(null);

    const campusOptions = [
        'RGUKT Nuzvid',
        'RGUKT RK Valley',
        'RGUKT Srikakulam',
        'RGUKT Ongole'
    ];

    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    const [isPasswordUpdating, setIsPasswordUpdating] = useState(false);
    const [passwordError, setPasswordError] = useState('');

    // Independent states for PIN buttons feedback
    const [isLoadingActionPin, setIsLoadingActionPin] = useState(false);
    const [isActionPinSaved, setIsActionPinSaved] = useState(false);
    const [isLoadingLoginPin, setIsLoadingLoginPin] = useState(false);
    const [isLoginPinSaved, setIsLoginPinSaved] = useState(false);
    const [showPinSettings, setShowPinSettings] = useState(false);

    // PIN Visibility Protection States
    const [isVerifiedToView, setIsVerifiedToView] = useState(false);
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [verifyPassword, setVerifyPassword] = useState('');
    const [verifyError, setVerifyError] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [showFounderModal, setShowFounderModal] = useState(false);

    const bioRef = useRef(null);
    const [previewUrl, setPreviewUrl] = useState(user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || user?.name || 'User')}`);
    const [pdfAvatar, setPdfAvatar] = useState(null);

    const urlToBase64 = (url) => {
        return new Promise((resolve) => {
            if (!url) return resolve(null);
            if (url.startsWith('data:')) return resolve(url);
            
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxDim = 400;
                const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = () => resolve(url);
            img.src = url;
        });
    };

    const svgToPng = (svgDataUri) => {
        return new Promise((resolve) => {
            if (!svgDataUri || !svgDataUri.includes('svg')) return resolve(svgDataUri);
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 512;
                canvas.height = 512;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, 512, 512);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(null);
            img.src = svgDataUri;
        });
    };

    // useEffect(() => {
    //     if (previewUrl) {
    //         urlToBase64(previewUrl).then(setPdfAvatar);
    //     }
    // }, [previewUrl]);
    const [showMobileDetail, setShowMobileDetail] = useState(false);

    // Permissions State
    const [permissions, setPermissions] = useState({ notifications: 'prompt', storage: 'prompt' });
    const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);
    const [appInfo, setAppInfo] = useState({ version: '2.8.3', build: '17' });

    const [isReferring, setIsReferring] = useState(false);

    const handleReferApp = async () => {
        setIsReferring(true);
        try {
            const snapshot = await get(ref(rtdb, 'app_update'));
            if (snapshot.exists()) {
                const data = snapshot.val();
                const apkUrl = data.apk_url;
                
                await CapacitorShare.share({
                    title: 'RGUKT CONNECT',
                    text: 'Hey! Check out the new RGUKT CONNECT app for students. Download it here:',
                    url: apkUrl,
                    dialogTitle: 'Refer App'
                });
            } else {
                showToast("Could not fetch the download link. Please try again.", "error");
            }
        } catch (error) {
            console.error("Error fetching refer link:", error);
            showToast("Failed to share app. Check your connection.", "error");
        } finally {
            setIsReferring(false);
        }
    };

    // Fetch App Info
    useEffect(() => {
        const fetchAppInfo = async () => {
            if (Capacitor.isNativePlatform()) {
                try {
                    const info = await App.getInfo();
                    setAppInfo(info);
                } catch (e) {
                    console.error("Failed to fetch app info:", e);
                }
            }
        };
        fetchAppInfo();
    }, []);

    const [formData, setFormData] = useState({
        fullName: user?.fullName || user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        bio: user?.bio || '',
        department: user?.department || '',
        studentId: user?.studentId || '',
        language: user?.language || 'English',
        timezone: user?.timezone || 'IST (UTC+05:30)',
        emailNotifs: user?.emailNotifs !== undefined ? user?.emailNotifs : true,
        securityAlerts: user?.securityAlerts !== undefined ? user?.securityAlerts : true,
        pin: user?.pin || '', // Security PIN
        loginPin: user?.loginPin || '', // Login PIN
        pinGuardSettings: user?.pinGuardSettings || {
            userManagement: true,
            courseContent: true,
            criticalDeletions: true
        },
        biometricAuth: user?.biometricAuth || false,
        currentClass: user?.currentClass || '',
        rcId: user?.rcId || '',
        campus: user?.campus || 'RGUKT Nuzvid',
        edgeLightingColor: user?.edgeLightingColor || '#ff0000',
    });

    const formatStudentId = (id) => {
        if (!id) return '';
        return id.replace(/^RGUKT-/i, '');
    };

    // Update preview when user avatar changes (external update or initial load)
    useEffect(() => {
        if (user?.avatar) {
            setPreviewUrl(user.avatar);
        } else if (formData.fullName) {
            setPreviewUrl(`https://ui-avatars.com/api/?name=${encodeURIComponent(formData.fullName)}&background=random`);
        } else if (user?.fullName || user?.name) {
            setPreviewUrl(`https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || user.name)}&background=random`);
        } else {
            setPreviewUrl(`https://ui-avatars.com/api/?name=User`);
        }
    }, [user?.avatar, formData.fullName, user?.fullName, user?.name]);
    
    // Proactive Notification Permission Request
    useEffect(() => {
        const proactivelyPermitNotifications = async () => {
            if (Capacitor.isNativePlatform()) {
                try {
                    const status = await LocalNotifications.checkPermissions();
                    if (status.display === 'prompt' || status.display === 'prompt-with-rationale') {
                        await LocalNotifications.requestPermissions();
                    }
                } catch (e) {
                    console.error("Proactive permission check failed:", e);
                }
            }
        };
        proactivelyPermitNotifications();
    }, []);

    // Sync formData when user context changes
    useEffect(() => {
        if (user) {
            let classFromData = '';
            let nameFromData = '';
            console.log('Matching user against studentsData:', studentsData?.length);

            // Try to find student in static data
            const studentRecord = studentsData?.find(s =>
                s.email.toLowerCase() === user.email.toLowerCase() ||
                (user.studentId && s.id.toLowerCase() === user.studentId.toLowerCase())
            );

            console.log('Found student record:', studentRecord);

            if (studentRecord) {
                classFromData = studentRecord.classSection;
                nameFromData = studentRecord.name;
            }

            setFormData({
                fullName: user.fullName || user.name || nameFromData || '',
                email: user.email || '',
                phone: user.phone || '',
                bio: user.bio || '',
                department: user.department || user.branch || '',
                studentId: user.studentId || '',
                language: user.language || 'English',
                timezone: user.timezone || 'IST (UTC+05:30)',
                emailNotifs: user.emailNotifs !== undefined ? user.emailNotifs : true,
                securityAlerts: user.securityAlerts !== undefined ? user.securityAlerts : true,
                pin: user.pin || '',
                loginPin: user.loginPin || '',
                pinGuardSettings: user.pinGuardSettings || {
                    userManagement: true,
                    courseContent: true,
                    criticalDeletions: true
                },
                biometricAuth: user.biometricAuth || false,
                currentClass: formatClassID(user.currentClass || classFromData || ''),
                rcId: user.rcId || '',
                campus: user.campus || 'RGUKT Nuzvid',
                edgeLightingColor: user.edgeLightingColor || '#ff0000',
            });
        }
    }, [user]);

    // Auto-save form data changes with a debounce to instantly update the website
    useEffect(() => {
        if (!user) return;
        const timeoutId = setTimeout(() => {
            // Check for meaningful changes to prevent infinite loops
            const hasChanges = ['fullName', 'email', 'phone', 'bio', 'department', 'studentId', 'currentClass', 'campus'].some(key => {
                const formVal = formData[key] || '';
                const userVal = user[key] || '';
                return formVal !== userVal;
            });

            if (hasChanges) {
                const dataToSave = { ...formData };
                if (dataToSave.studentId) {
                    dataToSave.studentId = dataToSave.studentId.replace(/^RGUKT-/i, '');
                }
                updateProfileData(dataToSave).catch(e => console.error("Auto-save failed:", e));
            }
        }, 800);
        return () => clearTimeout(timeoutId);
    }, [formData]);


    // Auto-resize bio textarea
    useEffect(() => {
        if (activeTab === 'personal' && bioRef.current) {
            bioRef.current.style.height = 'auto';
            bioRef.current.style.height = bioRef.current.scrollHeight + 'px';
        }
    }, [formData.bio, activeTab]);

    // Outside Click Handling for Custom Dropdowns
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (campusRef.current && !campusRef.current.contains(event.target)) {
                setIsCampusOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // PIN Visibility Timer Logic
    useEffect(() => {
        let timer;
        if (isVerifiedToView && countdown > 0) {
            timer = setInterval(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
        } else if (countdown === 0 && isVerifiedToView) {
            setIsVerifiedToView(false);
        }
        return () => clearInterval(timer);
    }, [isVerifiedToView, countdown]);

    // Background Scroll Lock Logic
    useEffect(() => {
        if (showVerifyModal || showPinSettings || showFounderModal || showQRGenerator || isLogoutModalOpen || showGoogleFormModal || showImageUpload) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showVerifyModal, showPinSettings, showFounderModal, showQRGenerator, isLogoutModalOpen, showGoogleFormModal, showImageUpload]);

    // Mobile Back Gesture / History Management
    useEffect(() => {
        const handlePopState = (event) => {
            // When user uses back gesture, close all overlays
            setShowMobileDetail(false);
            setShowVerifyModal(false);
            setShowPinSettings(false);
            setShowFounderModal(false);
            setShowQRGenerator(false);
            setIsLogoutModalOpen(false);
            setShowGoogleFormModal(false);
            setShowImageUpload(false);

            setActiveTab(prev => {
                if (['theme', 'pin', 'permissions', 'about', 'security', 'notifications', 'navigation', 'edge_lighting', 'dashboard'].includes(prev)) {
                    return 'settings_menu';
                }
                return prev;
            });
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // Watch for overlay changes to push history state
    const prevOverlayState = useRef(false);
    useEffect(() => {
        const isSubSettingActive = ['theme', 'pin', 'permissions', 'about', 'security', 'notifications', 'navigation', 'edge_lighting', 'dashboard'].includes(activeTab);
        const isAnyOverlayOpen = !!(showMobileDetail || showVerifyModal || showPinSettings || showFounderModal || showQRGenerator || isLogoutModalOpen || showGoogleFormModal || showImageUpload || isSubSettingActive);
        
        if (isAnyOverlayOpen && !prevOverlayState.current) {
            // Just opened an overlay, push state
            window.history.pushState({ overlay: true }, '');
        } else if (!isAnyOverlayOpen && prevOverlayState.current) {
            // Just closed all overlays manually, if history state is still 'overlay', go back
            if (window.history.state?.overlay) {
                window.history.back();
            }
        }
        prevOverlayState.current = isAnyOverlayOpen;
    }, [showMobileDetail, showVerifyModal, showPinSettings, showFounderModal, showQRGenerator, isLogoutModalOpen, showGoogleFormModal, showImageUpload, activeTab]);


    // Permissions Logic
    useEffect(() => {
        if (activeTab === 'permissions') {
            const checkPerms = async () => {
                setIsCheckingPermissions(true);
                const status = await nativePermissionsService.checkAllPermissions();
                setPermissions(status);
                setIsCheckingPermissions(false);
            };
            checkPerms();
        }
    }, [activeTab]);

    const handleRequestPermission = async (type) => {
        const newStatus = await nativePermissionsService.requestPermission(type);
        setPermissions(prev => ({ ...prev, [type]: newStatus }));
    };

    const handleOpenSettings = async () => {
        await nativePermissionsService.openSettings();
    };

    const handleLogoutConfirm = async () => {
        try {
            setIntentionalLogout(true);
            await logout();
            navigate('/');
        } catch (error) {
            console.error("Logout failed:", error);
            setIsLogoutModalOpen(false);
        }
    };

    const handleActionPinSave = async () => {
        setIsLoadingActionPin(true);
        setIsActionPinSaved(false);
        try {
            console.log('Saving Action PIN:', {
                pinValue: formData.pin,
                pinType: typeof formData.pin,
                pinLength: formData.pin?.length
            });
            await updateProfileData({ pin: formData.pin });
            setIsLoadingActionPin(false);
            setIsActionPinSaved(true);
            setIsSaved(true);
            setTimeout(() => {
                setIsSaved(false);
                setIsActionPinSaved(false);
            }, 1500);
        } catch (error) {
            console.error("Failed to save action PIN:", error);
            setIsLoadingActionPin(false);
            showToast("Failed to save action PIN. Please try again.", "error");
        }
    };

    const handleLoginPinSave = async () => {
        setIsLoadingLoginPin(true);
        setIsLoginPinSaved(false);
        try {
            await updateProfileData({ loginPin: formData.loginPin });
            setIsLoadingLoginPin(false);
            setIsLoginPinSaved(true);
            setIsSaved(true);
            setTimeout(() => {
                setIsSaved(false);
                setIsLoginPinSaved(false);
            }, 1500);
        } catch (error) {
            console.error("Failed to save login PIN:", error);
            setIsLoadingLoginPin(false);
            showToast("Failed to save login PIN. Please try again.", "error");
        }
    };

    const handlePinSettingsSave = async () => {
        setIsLoading(true);
        try {
            await updateProfileData({ pinGuardSettings: formData.pinGuardSettings });
            setIsLoading(false);
            setShowPinSettings(false);
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 1500);
        } catch (error) {
            console.error("Failed to save PIN guard settings:", error);
            setIsLoading(false);
            showToast("Failed to save PIN guard settings. Please try again.", "error");
        }
    };

    const handleVerifyPassword = async () => {
        if (!verifyPassword) {
            setVerifyError('Please enter your password.');
            return;
        }

        if (verifyPassword === user.password) {
            setIsVerifiedToView(true);
            setCountdown(15);
            setShowVerifyModal(false);
            setVerifyPassword('');
            setVerifyError('');
        } else {
            setVerifyError('Incorrect password. Please try again.');
        }
    };

    const handlePasswordUpdate = async (e) => {
        if (e) e.preventDefault();
        setPasswordError('');

        if (!passwords.current || !passwords.new || !passwords.confirm) {
            setPasswordError('All password fields are required.');
            return;
        }

        if (passwords.new !== passwords.confirm) {
            setPasswordError('New passwords do not match.');
            return;
        }

        if (passwords.new.length < 6) {
            setPasswordError('Password must be at least 6 characters.');
            return;
        }

        // Verify current password (using the one stored in profileData for simplicity in this flow,
        // though Firebase re-authentication is the "proper" way, this matches the project's pattern)
        if (passwords.current !== user.password) {
            setPasswordError('Current password incorrect.');
            return;
        }

        setIsPasswordUpdating(true);
        try {
            await changePassword(passwords.new);
            setIsPasswordUpdating(false);
            setPasswords({ current: '', new: '', confirm: '' });
            setIsSaved(true);
            showToast("Password updated successfully!", "success");
            notify("Security Update", "Your account password has been changed successfully.");
            setTimeout(() => setIsSaved(false), 1500);
        } catch (error) {
            console.error("Password update error:", error);
            setPasswordError(error.message || 'Failed to update password.');
            setIsPasswordUpdating(false);
        }
    };

    const handleRemovePhoto = async () => {
        setIsLoading(true);
        try {
            await updateProfileData({ avatar: '' });
            showToast("Profile photo removed successfully!", "success");
            notify("Profile Photo Removed", "Your profile photo has been removed.");
        } catch (error) {
            console.error("Failed to remove profile photo:", error);
            showToast("Failed to remove profile photo. Please try again.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsLoading(true);
        setIsSaved(false);
        try {
            const dataToSave = { ...formData };
            if (dataToSave.studentId) {
                dataToSave.studentId = dataToSave.studentId.replace(/^RGUKT-/i, '');
            }
            await updateProfileData(dataToSave);
            setIsLoading(false);
            setIsSaved(true);
            showToast("Profile updated successfully!", "success");
            notify("Profile Updated", "Your profile changes have been saved successfully.");
            setTimeout(() => {
                setIsSaved(false);
            }, 1500);
        } catch (error) {
            console.error("Failed to save profile:", error);
            setIsLoading(false);
            showToast("Failed to save changes. Please try again.", "error");
        }
    };

    const handleDownloadProfileData = async () => {
        const filename = `Student_Profile_${formData.studentId || 'Report'}.pdf`;
        const element = document.getElementById('profile-pdf-template');
        
        if (!element) {
            showToast("PDF template not found", "error");
            return;
        }

        await startDownload(filename, async () => {
            // Process images for PDF
            let currentAvatar = pdfAvatar;
            if (!currentAvatar && previewUrl) {
                currentAvatar = await urlToBase64(previewUrl);
            }

            // Prepare Logo (Convert SVG to PNG for Native PDF compatibility)
            const pngLogo = await svgToPng(LOGO_DATA_URI);

            // Generate Native Vector PDF
            const doc = await pdfService.generateStudentProfilePdf(formData, user, pngLogo, currentAvatar);
            
            if (Capacitor.isNativePlatform()) {
                // For native: get as base64 string
                const pdfBase64 = doc.output('datauristring').split(',')[1];
                await nativeFileService.savePdfToDownloads(filename, pdfBase64);
            } else {
                // For web: standard save
                doc.save(filename);
            }
        });
    };

    const handleShareProfilePdf = async () => {
        if (!Capacitor.isNativePlatform()) {
            handleDownloadProfileData();
            return;
        }

        const filename = `Official_Profile_${formData.studentId || 'Report'}.pdf`;
        const element = document.getElementById('profile-pdf-template');

        if (!element) {
            showToast("PDF template not found", "error");
            return;
        }

        await startShare(filename, async () => {
            // Process images for PDF
            let currentAvatar = pdfAvatar;
            if (!currentAvatar && previewUrl) {
                currentAvatar = await urlToBase64(previewUrl);
            }

            // Prepare Logo
            const pngLogo = await svgToPng(LOGO_DATA_URI);

            // Generate Native Vector PDF
            const doc = await pdfService.generateStudentProfilePdf(formData, user, pngLogo, currentAvatar);
            const pdfBase64 = doc.output('datauristring').split(',')[1];

            const fileResult = await Filesystem.writeFile({
                path: filename,
                data: pdfBase64,
                directory: Directory.Cache
            });

            await CapacitorShare.share({
                title: 'Official Student Profile Report',
                text: `Sharing Official Profile of ${formData.fullName}`,
                url: fileResult.uri,
            });
        });
    };


    const { navSettings, updateNavSetting: baseUpdateNavSetting } = useNavigation();
    const defaultCardPrefs = { ongoing: true, courses: true, attendance: true, cgpa: true, support: true };
    const [cardPrefs, setCardPrefs] = useState(() => {
        try {
            const saved = localStorage.getItem('dashboard_card_prefs');
            return saved ? { ...defaultCardPrefs, ...JSON.parse(saved) } : defaultCardPrefs;
        } catch (e) { return defaultCardPrefs; }
    });

    const handleToggleCard = (key) => {
        const newPrefs = { ...cardPrefs, [key]: !cardPrefs[key] };
        setCardPrefs(newPrefs);
        localStorage.setItem('dashboard_card_prefs', JSON.stringify(newPrefs));
        window.dispatchEvent(new Event('dashboardSettingsChanged'));
    };

    const updateNavSetting = (key, value) => {
        baseUpdateNavSetting(key, value);
    };

    const tabs = [
        { id: 'personal', label: 'Update Profile', icon: User, desc: 'Update your personal information', themeColor: '#3b82f6' },
        { id: 'account', label: 'Account Settings', icon: Settings, desc: 'Manage your account settings', themeColor: '#8b5cf6' },
        { id: 'settings_menu', label: 'Settings', icon: Cog, desc: 'App preferences, modes, and security', mobileOnly: true, themeColor: '#64748b' },
        { id: 'navigation', label: 'Navigation', icon: Compass, desc: 'Customize navigation feel and style', isSubSetting: true, themeColor: '#6366f1' },
        { id: 'dashboard', label: 'Quick Cards', icon: Layout, desc: 'Configure quick cards appearance', isSubSetting: true, themeColor: '#10b981' },
        { id: 'security', label: 'Security', icon: ShieldCheck, desc: 'Update your security settings', isSubSetting: true, themeColor: '#ef4444' },
        ...(user?.role === 'admin' ? [{ id: 'pin', label: 'Admin PIN', icon: Shield, desc: 'Manage your administration PIN', isSubSetting: true, themeColor: '#3b82f6' }] : []),
        { id: 'permissions', label: 'Permissions', icon: ShieldAlert, desc: 'Manage application permissions', isSubSetting: true, mobileOnly: true, themeColor: '#d946ef' },
        { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Customize your notification preferences', isSubSetting: true, themeColor: '#f97316' },
        { id: 'theme', label: 'Modes', icon: Moon, desc: 'Change application appearance', isSubSetting: true, mobileOnly: true, themeColor: '#eab308' },
        { id: 'edge_lighting', label: 'Edge Lighting', icon: Zap, desc: 'Customize profile edge glow', isSubSetting: true, themeColor: '#06b6d4' },
        { id: 'about', label: 'About App', icon: Info, desc: 'App version and developer info', mobileOnly: true, themeColor: '#14b8a6' },
    ];

    const tabsRef = useRef([]);
    const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0, opacity: 0 });
    const [settingsSearch, setSettingsSearch] = useState('');

    const renderTabContent = () => (
        <>
            {/* Settings Sub-Menu View */}
            {activeTab === 'settings_menu' && (
                <div className="animate-fade-in">
                    <div className="settings-search-container">
                        <div className="settings-search-icon">
                            <Search size={18} />
                        </div>
                        <input
                            type="text"
                            className="settings-search-input"
                            placeholder="Search settings..."
                            value={settingsSearch}
                            onChange={(e) => setSettingsSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-3">
                        {tabs.filter(t => t.isSubSetting && (t.label.toLowerCase().includes(settingsSearch.toLowerCase()) || t.desc.toLowerCase().includes(settingsSearch.toLowerCase()))).map((tab) => (
                            <button
                                key={tab.id}
                                className="profile-menu-item"
                                style={tab.themeColor ? { '--card-theme': tab.themeColor } : {}}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <div className="menu-item-icon-wrapper">
                                    {typeof tab.icon === 'function' ? tab.icon() : <tab.icon size={22} />}
                                </div>
                                <div className="menu-item-content">
                                    <h3 className="menu-item-title">{tab.label}</h3>
                                    <p className="menu-item-desc">{tab.desc}</p>
                                </div>
                                <div className="menu-item-chevron">
                                    <ChevronRight size={20} />
                                </div>
                            </button>
                        ))}
                        {tabs.filter(t => t.isSubSetting && (t.label.toLowerCase().includes(settingsSearch.toLowerCase()) || t.desc.toLowerCase().includes(settingsSearch.toLowerCase()))).length === 0 && (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <Search size={32} className="mx-auto mb-3 opacity-20" />
                                <p>No settings found for "{settingsSearch}"</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Theme Tab Content */}
            {activeTab === 'theme' && (
                <div className="animate-fade-in theme-selection-view">

                    <div className="theme-options-grid">
                        {/* System Theme */}
                        <button 
                            className={`theme-card ${themeMode === 'system' ? 'active' : ''}`}
                            style={{ '--card-theme': '#64748b' }}
                            onClick={() => setThemeMode('system')}
                        >
                            <div className="theme-card-preview system-preview">
                                <div className="preview-shape shape-1"></div>
                                <div className="preview-shape shape-2"></div>
                            </div>
                            <div className="theme-card-info">
                                <div className="theme-card-title-row">
                                    <Settings size={16} />
                                    <span>System Default</span>
                                </div>
                                <p>Syncs with device settings</p>
                            </div>
                            <div className="theme-card-check">
                                <Check size={14} />
                            </div>
                        </button>

                        {/* Light Theme */}
                        <button 
                            className={`theme-card ${themeMode === 'light' ? 'active' : ''}`}
                            style={{ '--card-theme': '#f59e0b' }}
                            onClick={() => setThemeMode('light')}
                        >
                            <div className="theme-card-preview light-preview">
                                <div className="preview-shape shape-1"></div>
                                <div className="preview-shape shape-2"></div>
                            </div>
                            <div className="theme-card-info">
                                <div className="theme-card-title-row">
                                    <Sun size={16} />
                                    <span>Light Mode</span>
                                </div>
                                <p>Clean and bright interface</p>
                            </div>
                            <div className="theme-card-check">
                                <Check size={14} />
                            </div>
                        </button>

                        {/* Dark Theme */}
                        <button 
                            className={`theme-card ${themeMode === 'dark' ? 'active' : ''}`}
                            style={{ '--card-theme': '#6366f1' }}
                            onClick={() => setThemeMode('dark')}
                        >
                            <div className="theme-card-preview dark-preview">
                                <div className="preview-shape shape-1"></div>
                                <div className="preview-shape shape-2"></div>
                            </div>
                            <div className="theme-card-info">
                                <div className="theme-card-title-row">
                                    <Moon size={16} />
                                    <span>Dark Mode</span>
                                </div>
                                <p>Easy on the eyes at night</p>
                            </div>
                            <div className="theme-card-check">
                                <Check size={14} />
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* Edge Lighting Tab Content */}
            {activeTab === 'edge_lighting' && (
                <div className="animate-fade-in space-y-8 pb-8">
                    <div className="mb-6">
                        <h2 className="section-title">Edge Lighting</h2>
                        <p className="section-desc">Customize the glowing border animation of your profile card.</p>
                    </div>

                    <div className="nav-setting-card" style={{ '--card-theme': '#f59e0b' }}>
                        <div className="setting-header">
                            <div className="setting-icon-box p-3 rounded-2xl flex-shrink-0 transition-transform duration-300">
                                <Zap size={20} />
                            </div>
                            <div className="setting-text">
                                <h4 className="font-bold">Glow Color</h4>
                                <p className="text-xs text-muted">Select a predefined color or pick a custom one.</p>
                            </div>
                        </div>
                        <div className="setting-options-grid-3 mt-4">
                            {[
                                { name: 'Vibrant Red', hex: '#ff0000' },
                                { name: 'Neon Blue', hex: '#00f3ff' },
                                { name: 'Cyber Purple', hex: '#8b5cf6' },
                                { name: 'Emerald Green', hex: '#10b981' },
                                { name: 'Sunset Orange', hex: '#f97316' },
                                { name: 'Electric Pink', hex: '#ec4899' },
                            ].map(color => (
                                <button 
                                    key={color.name}
                                    className={`setting-option-btn flex items-center justify-center gap-2 ${formData.edgeLightingColor === color.hex ? 'active' : ''}`}
                                    onClick={() => {
                                        setFormData(prev => ({ ...prev, edgeLightingColor: color.hex }));
                                        showToast(`Changed to ${color.name}`, 'success');
                                    }}
                                >
                                    <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: color.hex, display: 'inline-block' }}></span>
                                    {color.name}
                                </button>
                            ))}
                        </div>
                        
                        {/* Custom Color Selector */}
                        <div className="nav-setting-card mt-6" style={{ '--card-theme': '#ec4899' }}>
                            <div className="setting-header">
                                <div className="setting-icon-box p-3 rounded-2xl flex-shrink-0 transition-transform duration-300">
                                    <Pointer size={20} />
                                </div>
                                <div className="setting-text">
                                    <h4 className="font-bold">Custom Edge Color</h4>
                                    <p className="text-xs text-muted">Tap the circle below to open the color picker</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 mt-4 p-4 border border-[var(--color-border)] rounded-xl bg-[var(--color-background)]">
                                <div className="relative cursor-pointer hover:scale-105 transition-transform" style={{ width: '56px', height: '56px' }}>
                                    <input 
                                        type="color" 
                                        value={formData.edgeLightingColor}
                                        onChange={(e) => setFormData(prev => ({ ...prev, edgeLightingColor: e.target.value }))}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div 
                                        className="absolute inset-0 rounded-full shadow-inner border-4 border-white dark:border-slate-700 flex items-center justify-center"
                                        style={{ backgroundColor: formData.edgeLightingColor }}
                                    >
                                        <Pointer size={18} className="text-white mix-blend-difference opacity-80" />
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-[var(--color-text-main)]">Selected Color</span>
                                    <span className="text-sm font-mono text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">{formData.edgeLightingColor}</span>
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end">
                            <button
                                onClick={async () => {
                                    try {
                                        await updateProfileData({ edgeLightingColor: formData.edgeLightingColor });
                                        showToast('Edge lighting saved successfully!', 'success');
                                    } catch (err) {
                                        showToast('Failed to save edge lighting.', 'error');
                                    }
                                }}
                                className="btn-primary py-2 px-6 font-bold"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation Tab Content */}
            {activeTab === 'navigation' && (
                <div className="animate-fade-in space-y-8 pb-8">

                    {/* Live Preview Card */}
                    <div className="nav-preview-card">
                        <div className="preview-label">Live Preview</div>
                        <div className="preview-nav-container" data-nav-mode={navSettings.mode} data-nav-highlight={navSettings.highlight} data-nav-icon={navSettings.iconSize}>
                            <div className="preview-nav-content">
                                <div className="preview-nav-pill-wrapper" style={{ transform: 'translateX(0%)' }}>
                                    <div className="mobile-nav-pill"></div>
                                </div>
                                {[
                                    { icon: Layout, active: true },
                                    { icon: Sunrise, active: false },
                                    { icon: Compass, active: false },
                                    { icon: User, active: false }
                                ].map((item, idx) => (
                                    <div key={idx} className={`preview-nav-item ${item.active ? 'active' : ''}`}>
                                        <div className="mobile-nav-icon-wrapper">
                                            <item.icon size={20} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <p className="text-[10px] text-center mt-3 text-muted opacity-60">Interactive preview of your current settings</p>
                    </div>

                    <div className="space-y-6">
                        {/* Navigation Mode */}
                        <div className="nav-setting-card" style={{ '--card-theme': '#6366f1' }}>
                            <div className="setting-header">
                                <div className="setting-icon-box p-3 rounded-2xl flex-shrink-0 transition-transform duration-300">
                                    <Layout size={20} />
                                </div>
                                <div className="setting-text">
                                    <h4 className="font-bold">Navigation Mode</h4>
                                    <p className="text-xs text-muted">Choose between spacious or compact layout</p>
                                </div>
                            </div>
                            <div className="setting-options-row">
                                {['standard', 'compact'].map(mode => (
                                    <button 
                                        key={mode}
                                        className={`setting-option-btn ${navSettings.mode === mode ? 'active' : ''}`}
                                        onClick={() => updateNavSetting('mode', mode)}
                                    >
                                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Navigation Animation */}
                        <div className="nav-setting-card" style={{ '--card-theme': '#3b82f6' }}>
                            <div className="setting-header">
                                <div className="setting-icon-box p-3 rounded-2xl flex-shrink-0 transition-transform duration-300">
                                    <Wind size={20} />
                                </div>
                                <div className="setting-text">
                                    <h4 className="font-bold">Transition Speed</h4>
                                    <p className="text-xs text-muted">Controls the speed of screen animations</p>
                                </div>
                            </div>
                            <div className="setting-options-row">
                                {['smooth', 'fast', 'minimal'].map(anim => (
                                    <button 
                                        key={anim}
                                        className={`setting-option-btn ${navSettings.animation === anim ? 'active' : ''}`}
                                        onClick={() => updateNavSetting('animation', anim)}
                                    >
                                        {anim.charAt(0).toUpperCase() + anim.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Highlight Style */}
                        <div className="nav-setting-card" style={{ '--card-theme': '#10b981' }}>
                            <div className="setting-header">
                                <div className="setting-icon-box p-3 rounded-2xl flex-shrink-0 transition-transform duration-300">
                                    <Highlighter size={20} />
                                </div>
                                <div className="setting-text">
                                    <h4 className="font-bold">Highlight Style</h4>
                                    <p className="text-xs text-muted">How active menu items are visually marked</p>
                                </div>
                            </div>
                            <div className="setting-options-grid-3">
                                {['underline', 'filled', 'soft-glow', 'neo-pop', 'glass', 'gradient', 'floating-pill', 'liquid', 'minimal'].map(style => (
                                    <button 
                                        key={style}
                                        className={`setting-option-btn ${navSettings.highlight === style ? 'active' : ''}`}
                                        onClick={() => updateNavSetting('highlight', style)}
                                    >
                                        {style.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Icon Size */}
                        <div className="nav-setting-card" style={{ '--card-theme': '#a855f7' }}>
                            <div className="setting-header">
                                <div className="setting-icon-box p-3 rounded-2xl flex-shrink-0 transition-transform duration-300">
                                    <Maximize size={20} />
                                </div>
                                <div className="setting-text">
                                    <h4 className="font-bold">Icon Size</h4>
                                    <p className="text-xs text-muted">Adjust the size of navigation icons</p>
                                </div>
                            </div>
                            <div className="setting-options-row">
                                {['small', 'medium', 'large'].map(size => (
                                    <button 
                                        key={size}
                                        className={`setting-option-btn ${navSettings.iconSize === size ? 'active' : ''}`}
                                        onClick={() => updateNavSetting('iconSize', size)}
                                    >
                                        {size.charAt(0).toUpperCase() + size.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            )}
            {/* Dashboard Tab Content */}
            {activeTab === 'dashboard' && (
                <div className="animate-fade-in space-y-8 pb-8">
                    <div className="mb-6">
                        <h2 className="section-title">Quick Cards</h2>
                        <p className="section-desc">Configure quick cards appearance.</p>
                    </div>

                    <div className="flex flex-col gap-3">
                        {[ 
                            { key: 'ongoing', icon: Orbit, title: 'Ongoing Class', desc: 'Live countdown for the current ongoing class or exam', themeColor: '#6366f1' },
                            { key: 'courses', icon: BookOpen, title: 'Registered Courses', desc: 'Quick link to view your enrolled subjects', themeColor: '#3b82f6' },
                            { key: 'attendance', icon: Clock, title: 'Attendance Rate', desc: 'Display your overall attendance percentage', themeColor: '#10b981' },
                            { key: 'cgpa', icon: Award, title: 'Current CGPA', desc: 'Show your latest academic performance score', themeColor: '#a855f7' },
                            { key: 'support', icon: MessageSquare, title: 'Support & Issues', desc: 'Quick access to the Help Desk and complaints', themeColor: '#f97316' }
                        ].map((card) => (
                            <label 
                                key={card.key} 
                                className="quick-card-setting-item"
                                style={{ '--card-theme': card.themeColor }}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="setting-icon-box p-3 rounded-2xl flex-shrink-0 transition-transform duration-300">
                                        <card.icon size={22} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-[var(--color-text-main)] text-sm sm:text-base">{card.title}</h4>
                                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5 sm:mt-1 max-w-[200px] sm:max-w-xs">
                                            {card.desc}
                                        </p>
                                    </div>
                                </div>
                                <div className="settings-toggle-switch flex-shrink-0 ml-3">
                                    <input 
                                        type="checkbox" 
                                        checked={cardPrefs[card.key]}
                                        onChange={() => handleToggleCard(card.key)}
                                    />
                                    <span className="settings-toggle-slider"></span>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'personal' && (
                <div className="animate-fade-in">
                    <div className="mb-10">
                        <h2 className="section-title">Personal Information</h2>
                        <p className="section-desc">Update your personal details here.</p>
                    </div>

                    <div className="profile-form-grid">
                        {/* Profile Photo Upload Option */}
                        <div className="form-full-width flex flex-col md:flex-row items-center gap-6 mb-4 p-5 rounded-3xl border border-[var(--color-primary-500)]/30 bg-[var(--color-primary-50)]/50 dark:bg-[var(--color-primary-900)]/10 shadow-lg shadow-indigo-500/5 transition-all duration-300 hover:border-[var(--color-primary-500)]/60 hover:-translate-y-1">
                            <div className="relative group">
                                <img 
                                    src={previewUrl || 'https://ui-avatars.com/api/?name=User'} 
                                    alt="Profile" 
                                    className="rounded-2xl border-[3px] border-[var(--color-primary-500)]/30 object-cover shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:border-[var(--color-primary-500)] flex-shrink-0 group-hover:shadow-[var(--color-primary-500)]/30"
                                    style={{ width: '80px', height: '80px' }}
                                />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h3 className="font-bold text-[var(--color-text-main)] text-lg">Profile Photo</h3>
                                <p className="text-xs text-[var(--color-text-muted)] mb-4 md:mb-0 mt-1">Upload a real-photo or an avatar to represent you</p>
                            </div>
                            <div className="flex w-full md:w-auto gap-3">
                                <button 
                                    type="button"
                                    className="btn-secondary whitespace-nowrap px-5 py-2.5 text-sm flex items-center gap-2 font-bold flex-1 md:flex-initial justify-center rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-[var(--color-primary-500)]/20 hover:text-[var(--color-primary-600)] hover:border-[var(--color-primary-500)]/40 bg-[var(--color-surface)]"
                                    onClick={() => setShowImageUpload(true)}
                                >
                                    <Camera size={16} />
                                    Update Photo
                                </button>
                                <button 
                                    type="button"
                                    className="btn-secondary whitespace-nowrap px-5 py-2.5 text-sm flex items-center gap-2 font-bold flex-1 md:flex-initial justify-center text-red-500 border-red-500/20 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-red-500/20 hover:border-red-500/40 bg-[var(--color-surface)]"
                                    onClick={handleRemovePhoto}
                                    title="Remove Photo"
                                    disabled={isLoading}
                                >
                                    <Trash2 size={16} />
                                    Remove
                                </button>
                            </div>
                        </div>

                        <div className="profile-form-group">
                            <label className="profile-form-label">Full Name</label>
                            <input
                                type="text"
                                className="profile-form-input"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            />
                        </div>

                        <div className="profile-form-group">
                            <label className="profile-form-label">Email Address</label>
                            <div className="input-group-with-icon">
                                <Mail className="input-icon" size={18} />
                                <input
                                    type="email"
                                    className="profile-form-input input-with-icon"
                                    value={formData.email}
                                    disabled
                                />
                            </div>
                            <span className="text-xs text-amber-600 mt-1">Contact admin to change email</span>
                        </div>

                        <div className="profile-form-group">
                            <label className="profile-form-label">Phone Number</label>
                            <div className="input-with-fixed-prefix">
                                <span className="input-prefix">+91</span>
                                <input
                                    type="tel"
                                    className="profile-form-input"
                                    value={formData.phone}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').substring(0, 10);
                                        setFormData({ ...formData, phone: val });
                                    }}
                                    placeholder="Enter 10 digit number"
                                />
                            </div>
                        </div>

                        <CustomSelect
                            label="Academic Level / Department"
                            value={formData.department}
                            onChange={(val) => setFormData({ ...formData, department: val })}
                            options={[
                                { value: "PUC-1 Semester 1", label: "PUC-1 Semester 1" },
                                { value: "PUC-1 Semester 2", label: "PUC-1 Semester 2" },
                                { value: "PUC-2 Semester 1", label: "PUC-2 Semester 1" },
                                { value: "PUC-2 Semester 2", label: "PUC-2 Semester 2" },
                                { value: "Computer Science & Engineering", label: "Computer Science & Engineering" },
                                { value: "Electronics & Communication", label: "Electronics & Communication" },
                                { value: "Mechanical Engineering", label: "Mechanical Engineering" },
                                { value: "Civil Engineering", label: "Civil Engineering" },
                                { value: "Electrical Engineering", label: "Electrical Engineering" },
                                { value: "Business Administration", label: "Business Administration" },
                            ]}
                            placeholder="Select Academic Level"
                        />

                        <div className="profile-form-group">
                            <label className="profile-form-label">Class / Section (Auto)</label>
                            <input
                                type="text"
                                className="profile-form-input"
                                value={formData.currentClass}
                                onChange={(e) => setFormData({ ...formData, currentClass: e.target.value })}
                                placeholder="e.g. F-04, CSE-3"
                            />
                        </div>

                        {/* Custom Campus Dropdown */}
                        <div className="profile-form-group" ref={campusRef}>
                            <label className="profile-form-label">Campus</label>
                            <div className="custom-dropdown-container">
                                <button 
                                    className={`custom-dropdown-trigger ${isCampusOpen ? 'active' : ''}`}
                                    onClick={() => setIsCampusOpen(!isCampusOpen)}
                                    type="button"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="dropdown-icon-wrapper">
                                            <i className="fa-solid fa-school"></i>
                                        </div>
                                        <span>{formData.campus || 'Select Campus'}</span>
                                    </div>
                                    <i className={`fa-solid fa-chevron-down dropdown-arrow ${isCampusOpen ? 'rotated' : ''}`}></i>
                                </button>
                                
                                {isCampusOpen && (
                                    <div className="custom-dropdown-menu animate-slide-down">
                                        {campusOptions.map((option) => (
                                            <div 
                                                key={option} 
                                                className={`custom-dropdown-item ${formData.campus === option ? 'selected' : ''}`}
                                                onMouseDown={(e) => {
                                                    e.preventDefault(); // Prevent blur of other elements
                                                    setFormData({ ...formData, campus: option });
                                                    setIsCampusOpen(false);
                                                }}
                                                onClick={() => {
                                                    setFormData({ ...formData, campus: option });
                                                    setIsCampusOpen(false);
                                                }}
                                            >
                                                <span>{option}</span>
                                                {formData.campus === option && <Check size={16} />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="profile-form-group">
                            <label className="profile-form-label">Student ID</label>
                            <input
                                type="text"
                                className="profile-form-input"
                                value={formatStudentId(formData.studentId)}
                                onChange={(e) => {
                                    let val = e.target.value;
                                    setFormData({ ...formData, studentId: val });
                                }}
                                placeholder="e.g. S123456"
                            />
                        </div>

                        <div className="profile-form-group">
                            <label className="profile-form-label flex justify-between items-center">
                                <span>RGUKT Connect ID</span>
                                <span className="profile-tag-permanent">Permanent</span>
                            </label>
                            <div className="input-with-icon-right">
                                <input
                                    type="text"
                                    className="profile-form-input profile-input-readonly-premium"
                                    value={formData.rcId}
                                    readOnly
                                    disabled
                                />
                                <Lock className="input-icon-right" size={14} />
                            </div>
                            <p className="profile-form-help-text">This unique identifier is used for official campus verification.</p>
                        </div>

                        <div className="profile-form-group form-full-width">
                            <label className="profile-form-label">Bio</label>
                            <textarea
                                ref={bioRef}
                                className="profile-form-input profile-form-textarea"
                                value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                maxLength={300}
                                rows={1}
                                style={{ overflow: 'hidden' }}
                            />
                            <div className="text-right text-xs text-[var(--color-text-muted)] mt-1">
                                {formData.bio.length}/300
                            </div>
                        </div>


                    </div>
                </div>
            )}


            {activeTab === 'account' && (
                <div className="animate-fade-in">
                    <div className="mb-10">
                        <h2 className="section-title">Account Settings</h2>
                        <p className="section-desc">Manage your account preferences.</p>
                    </div>

                    <div className="profile-form-grid">
                        <CustomSelect
                            label="Language"
                            value={formData.language}
                            onChange={(val) => setFormData({ ...formData, language: val })}
                            options={[
                                { value: "English", label: "English" },
                                { value: "Hindi", label: "Hindi" },
                                { value: "Telugu", label: "Telugu" },
                            ]}
                        />

                        <CustomSelect
                            label="Timezone"
                            value={formData.timezone}
                            onChange={(val) => setFormData({ ...formData, timezone: val })}
                            options={[
                                { value: "IST (UTC+05:30)", label: "IST (UTC+05:30)" },
                                { value: "UTC", label: "UTC" },
                            ]}
                        />
                    </div>

                </div>
            )}

            {activeTab === 'security' && (
                <div className="animate-fade-in">
                    <div className="mb-10">
                        <h2 className="section-title">Security Settings</h2>
                        <p className="section-desc">Manage your account protection and device access.</p>
                    </div>

                    <div className="space-y-8 max-w-lg">
                        {/* Biometric Section */}
                        <div className={`card p-6 border-2 rounded-2xl animate-slide-up transition-colors duration-500 ${formData.biometricAuth ? 'border-emerald-500 bg-emerald-50/20 shadow-md shadow-emerald-500/10' : 'border-slate-200 bg-slate-50/20'}`}>
                            <div className="flex items-center gap-4 mb-6">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 ${formData.biometricAuth ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                    <Fingerprint 
                                        size={28} 
                                        color={formData.biometricAuth ? "#10b981" : "#64748b"} 
                                        style={{ 
                                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                            transform: formData.biometricAuth ? 'scale(1.15)' : 'scale(1)',
                                            filter: formData.biometricAuth ? 'drop-shadow(0 0 8px rgba(16,185,129,0.5))' : 'none'
                                        }} 
                                    />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Device Authentication</h3>
                                    <p className="text-xs text-slate-500">Use biometric or screen lock for sign-in</p>
                                </div>
                            </div>

                            <div className="toggle-row !border-none !p-0">
                                <div className="toggle-info">
                                    <h4 className="font-bold">Biometric Access</h4>
                                    <p className="text-xs">Enable fingerprint or face recognition</p>
                                </div>
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        checked={formData.biometricAuth}
                                        onChange={async (e) => {
                                            const isChecked = e.target.checked;
                                            setFormData({ ...formData, biometricAuth: isChecked });
                                            // Show optimistic toast immediately
                                            showToast(`Biometric authentication ${isChecked ? 'enabled' : 'disabled'}!`, "success");
                                            
                                            // Sync to native Android and Firebase in background
                                            try {
                                                await nativeAuthService.setAuthEnabled(isChecked);
                                                await updateProfileData({ biometricAuth: isChecked });
                                            } catch (err) {
                                                setFormData({ ...formData, biometricAuth: !isChecked }); // Rollback
                                                showToast("Failed to update biometric settings.", "error");
                                            }
                                        }}
                                    />
                                    <span className="slider"></span>
                                </label>
                            </div>
                        </div>

                        {/* Password Section */}
                        <div className="password-security-section card p-6 border-2 border-slate-100 bg-slate-50/20 rounded-2xl animate-slide-up" style={{ animationDelay: '0.1s' }}>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                                    <Lock size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Change Password</h3>
                                    <p className="text-xs text-slate-500">Update your account login password</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="profile-form-group">
                                    <label className="profile-form-label">Current Password</label>
                                    <input
                                        type="password"
                                        className="profile-form-input"
                                        placeholder="••••••••"
                                        value={passwords.current}
                                        onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                                    />
                                </div>
                                <div className="profile-form-group">
                                    <label className="profile-form-label">New Password</label>
                                    <input
                                        type="password"
                                        className="profile-form-input"
                                        placeholder="••••••••"
                                        value={passwords.new}
                                        onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                    />
                                </div>
                                <div className="profile-form-group">
                                    <label className="profile-form-label">Confirm New Password</label>
                                    <input
                                        type="password"
                                        className="profile-form-input"
                                        placeholder="••••••••"
                                        value={passwords.confirm}
                                        onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                    />
                                </div>

                                {passwordError && (
                                    <p className="text-red-500 text-xs font-medium animate-shake">{passwordError}</p>
                                )}

                                <button
                                    className="btn-primary w-full py-4 flex items-center justify-center gap-2"
                                    onClick={handlePasswordUpdate}
                                    disabled={isPasswordUpdating}
                                >
                                    {isPasswordUpdating ? 'Updating...' : 'Update Password'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'pin' && user?.role === 'admin' && (
                <div className="animate-fade-in">
                    <div className="mb-10">
                        <h2 className="section-title">Admin PIN</h2>
                        <p className="section-desc">Manage your administrative verification code.</p>
                    </div>

                    <div className="space-y-6 max-w-lg">
                        <div className="admin-security-section card p-6 border-2 border-primary-100 bg-primary-50/20 rounded-2xl mb-6 animate-slide-up relative">
                            <button
                                className="pin-settings-button"
                                title="Security Settings"
                                onClick={() => setShowPinSettings(true)}
                            >
                                <Settings size={20} />
                            </button>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
                                    <Shield size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Security & Action PIN</h3>
                                    <p className="text-xs text-slate-500">Access code for administrative modifications</p>
                                </div>
                            </div>

                            <div className="profile-form-group">
                                <div className="profile-form-label flex justify-between items-center">
                                    <span>Action PIN</span>
                                    {isVerifiedToView ? (
                                        <div className="pin-timer-badge">
                                            <div className="pin-timer-dot"></div>
                                            <span>Masking in {countdown}s</span>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] font-bold bg-primary-600 text-white px-2 py-0.5 rounded">MODIFICATION GUARD</span>
                                    )}
                                </div>
                                <div className="relative">
                                    <input
                                        type={isVerifiedToView ? "text" : "password"}
                                        className="profile-form-input text-2xl tracking-[0.6em] font-black text-center px-12"
                                        placeholder="● ● ● ●"
                                        value={formData.pin}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                            setFormData({ ...formData, pin: val });
                                        }}
                                        maxLength={4}
                                    />
                                    <button
                                        className="pin-reveal-toggle"
                                        onClick={() => isVerifiedToView ? setIsVerifiedToView(false) : setShowVerifyModal(true)}
                                    >
                                        {isVerifiedToView ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <p className="text-xs text-[var(--color-text-muted)] mt-2 leading-relaxed">
                                    Requested before any "Edit" or "Modify" actions across the platform.
                                </p>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={handleActionPinSave}
                                    disabled={isLoadingActionPin}
                                    className={`btn-pin-save ${isActionPinSaved ? 'btn-success' : 'btn-pin-save-primary'}`}
                                >
                                    {isLoadingActionPin ? (
                                        <>
                                            <div className="save-loader-mini"></div>
                                            <span>Saving...</span>
                                        </>
                                    ) : isActionPinSaved ? (
                                        <span>Updated!</span>
                                    ) : (
                                        <span>Update Action PIN</span>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="admin-login-section card p-6 border-2 rounded-2xl animate-slide-up" style={{ animationDelay: '0.1s' }}>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                                    <Key size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Admin Login PIN</h3>
                                    <p className="text-xs text-slate-500">Secondary authentication for admin login</p>
                                </div>
                            </div>

                            <div className="profile-form-group">
                                <div className="profile-form-label flex justify-between items-center">
                                    <span>Login PIN</span>
                                    {isVerifiedToView ? (
                                        <div className="pin-timer-badge">
                                            <div className="pin-timer-dot"></div>
                                            <span>Masking in {countdown}s</span>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded">6-DIGIT GUARD</span>
                                    )}
                                </div>
                                <div className="relative">
                                    <input
                                        type={isVerifiedToView ? "text" : "password"}
                                        className="profile-form-input text-2xl tracking-[0.6em] font-black text-center px-12"
                                        placeholder="● ● ● ● ● ●"
                                        value={formData.loginPin}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                            setFormData({ ...formData, loginPin: val });
                                        }}
                                        maxLength={6}
                                    />
                                    <button
                                        className="pin-reveal-toggle pin-reveal-toggle-indigo"
                                        onClick={() => isVerifiedToView ? setIsVerifiedToView(false) : setShowVerifyModal(true)}
                                    >
                                        {isVerifiedToView ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <p className="text-xs text-[var(--color-text-muted)] mt-2 leading-relaxed">
                                    An additional 6-digit PIN required during the administrative login process.
                                </p>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={handleLoginPinSave}
                                    disabled={isLoadingLoginPin}
                                    className={`btn-pin-save ${isLoginPinSaved ? 'btn-success' : 'btn-pin-save-indigo'}`}
                                >
                                    {isLoadingLoginPin ? (
                                        <>
                                            <div className="save-loader-mini"></div>
                                            <span>Saving...</span>
                                        </>
                                    ) : isLoginPinSaved ? (
                                        <span>Updated!</span>
                                    ) : (
                                        <span>Update Login PIN</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'notifications' && (
                <div className="animate-fade-in pb-8">
                    <div className="mb-6">
                        <h2 className="section-title">Notifications</h2>
                        <p className="section-desc">Control how you receive alerts.</p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <label className="quick-card-setting-item" style={{ '--card-theme': '#3b82f6' }}>
                            <div className="flex items-center gap-4">
                                <div className="setting-icon-box p-3 rounded-2xl flex-shrink-0 transition-transform duration-300">
                                    <Mail size={22} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-[var(--color-text-main)] text-sm sm:text-base">Email Notifications</h4>
                                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5 sm:mt-1 max-w-[200px] sm:max-w-xs">
                                        Receive daily summaries and important alerts.
                                    </p>
                                </div>
                            </div>
                            <div className="settings-toggle-switch flex-shrink-0 ml-3">
                                <input
                                    type="checkbox"
                                    checked={formData.emailNotifs}
                                    onChange={(e) => setFormData({ ...formData, emailNotifs: e.target.checked })}
                                />
                                <span className="settings-toggle-slider"></span>
                            </div>
                        </label>

                        <label className="quick-card-setting-item" style={{ '--card-theme': '#ef4444' }}>
                            <div className="flex items-center gap-4">
                                <div className="setting-icon-box p-3 rounded-2xl flex-shrink-0 transition-transform duration-300">
                                    <ShieldAlert size={22} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-[var(--color-text-main)] text-sm sm:text-base">Security Alerts</h4>
                                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5 sm:mt-1 max-w-[200px] sm:max-w-xs">
                                        Get notified about suspicious logins.
                                    </p>
                                </div>
                            </div>
                            <div className="settings-toggle-switch flex-shrink-0 ml-3">
                                <input
                                    type="checkbox"
                                    checked={formData.securityAlerts}
                                    onChange={(e) => setFormData({ ...formData, securityAlerts: e.target.checked })}
                                />
                                <span className="settings-toggle-slider"></span>
                            </div>
                        </label>
                    </div>
                </div>
            )}

            {activeTab === 'permissions' && (
                <div className="animate-fade-in pb-8">
                    <div className="mb-6">
                        <h2 className="section-title">Device Permissions</h2>
                        <p className="section-desc">Manage the hardware and software permissions granted to this app.</p>
                    </div>

                    <div className="flex flex-col gap-3">
                        {isCheckingPermissions ? (
                            <div className="flex justify-center py-10">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                            </div>
                        ) : (
                            <>
                                {/* Notifications Permission */}
                                <div className="quick-card-setting-item cursor-default" style={{ '--card-theme': '#f43f5e' }}>
                                    <div className="flex items-center gap-4">
                                        <div className="setting-icon-box p-3 rounded-2xl flex-shrink-0 transition-transform duration-300">
                                            <Bell size={22} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-[var(--color-text-main)] flex items-center gap-1.5 text-sm sm:text-base">
                                                Push Notifications
                                                {permissions.notifications === 'granted' && (
                                                    <span className="flex items-center text-emerald-500 ml-0.5">
                                                        <ShieldCheck size={15} />
                                                    </span>
                                                )}
                                            </h4>
                                            <p className="text-xs text-[var(--color-text-muted)] mt-0.5 sm:mt-1 max-w-[200px] sm:max-w-xs">Needed for important alerts and class updates.</p>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 ml-3">
                                        {permissions.notifications === 'granted' ? (
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 cursor-pointer hover:scale-105 transition-transform" onClick={handleOpenSettings} title="Click to open system settings">
                                                <Check size={14} strokeWidth={4} />
                                                <span className="text-xs font-bold">Granted</span>
                                            </div>
                                        ) : permissions.notifications === 'denied' ? (
                                            <button onClick={handleOpenSettings} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-bold hover:scale-105 transition-transform">
                                                <Settings size={14} />
                                                Settings
                                            </button>
                                        ) : (
                                            <button onClick={() => handleRequestPermission('notifications')} className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[var(--color-primary-500)] text-white text-xs font-bold hover:scale-105 transition-transform shadow-md">Allow</button>
                                        )}
                                    </div>
                                </div>

                                {/* Storage Permission */}
                                <div className="quick-card-setting-item cursor-default" style={{ '--card-theme': '#0ea5e9' }}>
                                    <div className="flex items-center gap-4">
                                        <div className="setting-icon-box p-3 rounded-2xl flex-shrink-0 transition-transform duration-300">
                                            <FileDown size={22} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-[var(--color-text-main)] flex items-center gap-1.5 text-sm sm:text-base">
                                                File Storage
                                                {permissions.storage === 'granted' && (
                                                    <span className="flex items-center text-emerald-500 ml-0.5">
                                                        <ShieldCheck size={15} />
                                                    </span>
                                                )}
                                            </h4>
                                            <p className="text-xs text-[var(--color-text-muted)] mt-0.5 sm:mt-1 max-w-[200px] sm:max-w-xs">Required to download materials and upload assignments.</p>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 ml-3">
                                        {permissions.storage === 'granted' ? (
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 cursor-pointer hover:scale-105 transition-transform" onClick={handleOpenSettings} title="Click to open system settings">
                                                <Check size={14} strokeWidth={4} />
                                                <span className="text-xs font-bold">Granted</span>
                                            </div>
                                        ) : permissions.storage === 'denied' ? (
                                            <button onClick={handleOpenSettings} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-bold hover:scale-105 transition-transform">
                                                <Settings size={14} />
                                                Settings
                                            </button>
                                        ) : (
                                            <button onClick={() => handleRequestPermission('storage')} className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[var(--color-primary-500)] text-white text-xs font-bold hover:scale-105 transition-transform shadow-md">Allow</button>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'about' && (
                <div className="animate-fade-in flex flex-col items-center text-center pt-8 pb-12">
                    <div className="mb-8">
                        <h2 className="text-3xl font-black text-[var(--color-text-main)]">RGUKT CONNECT</h2>
                        <p className="text-sm font-medium text-[var(--color-primary-600)] mt-1">v{appInfo.version}</p>
                    </div>

                    <div className="w-full space-y-8 text-left">
                        <div className="about-card" style={{ '--card-theme': '#14b8a6' }}>
                            <h4 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">Developer</h4>
                            <div className="flex flex-col gap-1">
                                <p className="font-bold text-[var(--color-text-main)]">B. Nagesh</p>
                                <p className="text-xs text-[var(--color-text-muted)]">Founder & Lead Developer</p>
                                <p className="text-[11px] text-[var(--color-primary-600)] mt-1 font-medium">RGUKT RK Valley • R24 Batch</p>
                            </div>
                        </div>

                        <div className="about-card" style={{ '--card-theme': '#6366f1' }}>
                            <h4 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">Platform Details</h4>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-[var(--color-text-muted)]">Built for</span>
                                    <span className="font-medium text-[var(--color-text-main)]">RGUKT Students</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-[var(--color-text-muted)]">Technology</span>
                                    <span className="font-medium text-[var(--color-text-main)]">React + Capacitor</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-[var(--color-text-muted)]">Native Sync</span>
                                    <span className="font-medium text-emerald-500">Active</span>
                                </div>
                            </div>
                        </div>

                        <div className="about-card" style={{ '--card-theme': '#d946ef' }}>
                            <h4 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">Refer & Share</h4>
                            <div className="flex flex-col gap-3">
                                <p className="text-sm text-[var(--color-text-muted)]">Love the app? Share it with your friends and help us grow the community!</p>
                                <button 
                                    onClick={handleReferApp} 
                                    disabled={isReferring}
                                    className={`btn btn-primary w-full flex items-center justify-center gap-2 py-3 transition-all ${isReferring ? 'btn-refer-fetching' : ''}`}
                                >
                                    {isReferring ? <LoadingSpinner size="sm" color="white" /> : <Share2 size={18} />}
                                    {isReferring ? 'Fetching...' : 'Refer App'}
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* Action Bar */}
            {!['theme', 'pin', 'permissions', 'about', 'security', 'notifications', 'settings_menu', 'navigation', 'edge_lighting', 'dashboard'].includes(activeTab) && (
                <div className="profile-actions">
                    <button className="btn-secondary">Cancel</button>
                    <button
                        className={`profile-save-btn ${isSaved ? 'btn-success' : ''}`}
                        onClick={handleSave}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <div className="save-loader-container">
                                <svg className="save-progress-svg" viewBox="0 0 24 24">
                                    <circle className="save-progress-bg" cx="12" cy="12" r="10" />
                                    <circle className="save-progress-fill" cx="12" cy="12" r="10" />
                                </svg>
                                <span>Saving...</span>
                            </div>
                        ) : isSaved ? (
                            <div className="save-success-container">
                                <div className="save-tick-circle">
                                    <svg className="save-tick-svg" viewBox="0 0 24 24">
                                        <path className="save-tick-path" d="M20 6L9 17L4 12" />
                                    </svg>
                                </div>
                                <span>Saved!</span>
                            </div>
                        ) : (
                            <>
                                <div className="svg-wrapper-1">
                                    <div className="svg-wrapper">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            width="24"
                                            height="24"
                                            className="icon"
                                        >
                                            <path
                                                d="M22,15.04C22,17.23 20.24,19 18.07,19H5.93C3.76,19 2,17.23 2,15.04C2,13.07 3.43,11.44 5.31,11.14C5.28,11 5.27,10.86 5.27,10.71C5.27,9.33 6.38,8.2 7.76,8.2C8.37,8.2 8.94,8.43 9.37,8.8C10.14,7.05 11.13,5.44 13.91,5.44C17.28,5.44 18.87,8.06 18.87,10.83C18.87,10.94 18.87,11.06 18.86,11.17C20.65,11.54 22,13.13 22,15.04Z"
                                            ></path>
                                        </svg>
                                    </div>
                                </div>
                                <span>Save Changes</span>
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Google Form Profile Photo Modal - rendered here so it works inside mobile portal too */}
            {/* Removed as per instruction */}
        </>
    );

    useEffect(() => {
        const activeTabIndex = tabs.findIndex(tab => tab.id === activeTab);
        const currentTab = tabsRef.current[activeTabIndex];

        if (currentTab) {
            setSliderStyle({
                left: currentTab.offsetLeft,
                width: currentTab.offsetWidth,
                opacity: 1
            });
        }
    }, [activeTab]);

    return (
        <>
            <div className="profile-container-v3 animate-fade-in">
                <LogoutConfirm
                    isOpen={isLogoutModalOpen}
                    onConfirm={handleLogoutConfirm}
                    onCancel={() => setIsLogoutModalOpen(false)}
                />

                <div className={`profile-layout-grid ${showMobileDetail ? 'hide-on-mobile' : ''}`}>
                    <div className="profile-left-column">
                        {/* New Header */}
                        <div className="profile-top-header">
                            <div>
                                <h1 className="profile-top-title">Profile</h1>
                                <p className="profile-top-subtitle">Manage your account and preferences</p>
                            </div>
                        </div>

                        {/* New Profile Card */}
                        <div className="profile-redesign-card">
                            <div className="profile-edge-blob" style={{ backgroundColor: formData.edgeLightingColor || '#ff0000' }}></div>
                            <div className="profile-edge-bg"></div>
                            <div className="profile-wave-bg"></div>

                            <div className="profile-card-content">
                                <div className="profile-avatar-wrapper-v3">
                                    <img
                                        src={previewUrl}
                                        alt="Profile"
                                        className="profile-avatar-v3"
                                    />
                                    <button 
                                        onClick={() => setShowImageUpload(true)}
                                        className="profile-camera-btn"
                                    >
                                        <Camera size={14} />
                                    </button>
                                </div>

                                <div className="profile-info-v3" onClick={() => { setActiveTab('personal'); setShowMobileDetail(true); }}>
                                    <div className="profile-name-row">
                                        <h2 className="profile-name-v3">{formData.fullName || user?.fullName || 'Student Name'}</h2>
                                        <ChevronRight size={18} className="profile-menu-chevron" strokeWidth={2.5} />
                                    </div>
                                    <div className="profile-dept-badge">
                                        <GraduationCap size={11} strokeWidth={2.5} />
                                        {formData.department || formData.branch ? `B.Tech ${formData.department || formData.branch}` : 'B.Tech / Branch Not Set'}
                                    </div>
                                    
                                    <div className="profile-details-list">
                                        <div className="profile-detail-item">
                                            <Mail size={12} className="detail-icon" />
                                            <span className="profile-detail-text">{formData.email || 'student@studentapp.com'}</span>
                                        </div>
                                        <div className="profile-detail-item">
                                            <Phone size={12} className="detail-icon" />
                                            <span>{formData.phone ? `+91 ${formData.phone}` : '+91 98765 43210'}</span>
                                        </div>
                                        <div className="profile-detail-item">
                                            <Calendar size={12} className="detail-icon" />
                                            <span>2023 - 2027</span>
                                        </div>
                                        <div className="profile-detail-item">
                                            <MapPin size={12} className="detail-icon" />
                                            <span className="profile-detail-text">{formData.campus?.replace('RGUKT ', '') || 'Delhi, India'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card Action Buttons */}
                            <div className="profile-card-actions">
                                <button
                                    className="profile-card-action-btn"
                                    onClick={handleShareProfilePdf}
                                    title="Share Profile"
                                    aria-label="Share Profile"
                                >
                                    <Share2 size={12} />
                                </button>
                                <button
                                    className="profile-card-action-btn"
                                    onClick={handleDownloadProfileData}
                                    title="Download Profile PDF"
                                    aria-label="Download Profile PDF"
                                >
                                    <Download size={12} />
                                </button>
                            </div>
                        </div>

                        {/* New Menu List */}
                        <div className="profile-menu-container">
                            <button className="profile-menu-btn" onClick={() => { setActiveTab('personal'); setShowMobileDetail(true); }}>
                                <div className="profile-menu-icon icon-update">
                                    <User size={20} fill="currentColor" strokeWidth={1.5} className="opacity-90" />
                                </div>
                                <div className="profile-menu-text-col">
                                    <h3 className="profile-menu-title">Profile Update</h3>
                                    <p className="profile-menu-desc">Update your personal information</p>
                                </div>
                                <ChevronRight size={18} className="profile-menu-chevron" strokeWidth={2.5} />
                            </button>

                            <button className="profile-menu-btn" onClick={() => setShowIDCard(true)}>
                                <div className="profile-menu-icon icon-idcard">
                                    <QrCode size={20} strokeWidth={2} />
                                </div>
                                <div className="profile-menu-text-col">
                                    <h3 className="profile-menu-title">My ID Card</h3>
                                    <p className="profile-menu-desc">View & share your digital student ID</p>
                                </div>
                                <ChevronRight size={18} className="profile-menu-chevron" strokeWidth={2.5} />
                            </button>

                            <button className="profile-menu-btn" onClick={() => { setActiveTab('settings_menu'); setShowMobileDetail(true); }}>
                                <div className="profile-menu-icon icon-settings">
                                    <Settings size={20} strokeWidth={2} />
                                </div>
                                <div className="profile-menu-text-col">
                                    <h3 className="profile-menu-title">Settings</h3>
                                    <p className="profile-menu-desc">Manage your app preferences</p>
                                </div>
                                <ChevronRight size={18} className="profile-menu-chevron" strokeWidth={2.5} />
                            </button>

                            <button className="profile-menu-btn" onClick={() => { setActiveTab('about'); setShowMobileDetail(true); }}>
                                <div className="profile-menu-icon icon-about">
                                    <Info size={20} strokeWidth={2} />
                                </div>
                                <div className="profile-menu-text-col">
                                    <h3 className="profile-menu-title">About App</h3>
                                    <p className="profile-menu-desc">Learn more about Student App</p>
                                </div>
                                <ChevronRight size={18} className="profile-menu-chevron" strokeWidth={2.5} />
                            </button>

                            <button className="profile-menu-btn" onClick={() => { window.open('https://wa.me/918074541035', '_blank'); }}>
                                <div className="profile-menu-icon icon-help">
                                    <Headphones size={20} strokeWidth={2} />
                                </div>
                                <div className="profile-menu-text-col">
                                    <h3 className="profile-menu-title">Need Help?</h3>
                                    <p className="profile-menu-desc">Get help and support</p>
                                </div>
                                <ChevronRight size={18} className="profile-menu-chevron" strokeWidth={2.5} />
                            </button>

                            <div className="profile-menu-divider"></div>

                            <button className="profile-menu-btn" onClick={() => setIsLogoutModalOpen(true)}>
                                <div className="profile-menu-icon icon-signout">
                                    <LogOut size={20} strokeWidth={2} className="ml-1" />
                                </div>
                                <div className="profile-menu-text-col">
                                    <h3 className="profile-menu-title">Sign Out</h3>
                                    <p className="profile-menu-desc">Sign out from your account</p>
                                </div>
                                <ChevronRight size={18} className="profile-menu-chevron" strokeWidth={2.5} />
                            </button>

                            <button className="profile-menu-btn danger" onClick={handleOpenDeleteRequest}>
                                <div className="profile-menu-icon icon-delete">
                                    <Trash2 size={20} strokeWidth={2} />
                                </div>
                                <div className="profile-menu-text-col">
                                    <h3 className="profile-menu-title text-danger">Delete Account</h3>
                                    <p className="profile-menu-desc">
                                        {hasPendingDeletionRequest ? '⏳ Request Under Review' : 'Permanently delete your account'}
                                    </p>
                                </div>
                                <ChevronRight size={18} className="profile-menu-chevron" strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>

                    {/* Right Column for PC */}
                    {showMobileDetail && (
                        <div className="profile-right-column show-on-pc">
                            <div className="profile-desktop-card relative">
                                <button 
                                    onClick={() => setShowMobileDetail(false)}
                                    className="profile-desktop-close-btn"
                                >
                                    <X size={20} />
                                </button>
                                <h2 className="desktop-section-title pr-10">{tabs.find(t => t.id === activeTab)?.label}</h2>
                                {renderTabContent()}
                            </div>
                        </div>
                    )}
                </div>

                {/* Tab Content Mobile Portal */}
                {showMobileDetail && createPortal(
                    <div className="profile-tab-content mobile-detail-active hide-on-pc">
                        <div className="mobile-detail-header">
                            <button 
                                className="mobile-back-btn"
                                onClick={() => {
                                    const currentTabObj = tabs.find(t => t.id === activeTab);
                                    if (currentTabObj?.isSubSetting) {
                                        setActiveTab('settings_menu');
                                    } else {
                                        setShowMobileDetail(false);
                                    }
                                }}
                                aria-label="Go back"
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <h2 className="mobile-detail-title">{tabs.find(t => t.id === activeTab)?.label}</h2>
                        </div>
                        <div className="custom-scrollbar" style={{ height: 'calc(100% - 60px)', overflowY: 'auto', padding: '16px' }}>
                            {renderTabContent()}
                        </div>
                    </div>,
                    document.body
                )}
            </div>


            {/* PIN Guard Settings Modal */}
            {showPinSettings && createPortal(
                <div className="modal-overlay pin-settings-overlay" onClick={() => setShowPinSettings(false)}>
                    <div className="modal-content pin-settings-modal animate-scale-up" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
                                    <Settings size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Guard Settings</h3>
                                    <p className="text-xs text-slate-500">Configure Action PIN protection</p>
                                </div>
                            </div>
                            <button onClick={() => setShowPinSettings(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                <XCircle size={20} />
                            </button>
                        </div>

                        <div className="space-y-3 mb-8">
                            <div className="pin-guard-item">
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-700 dark:text-slate-300">User Management</h4>
                                    <p className="text-[11px] text-slate-500">Guards editing user profiles, roles, and status</p>
                                </div>
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        checked={formData.pinGuardSettings.userManagement}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            pinGuardSettings: { ...formData.pinGuardSettings, userManagement: e.target.checked }
                                        })}
                                    />
                                    <span className="slider"></span>
                                </label>
                            </div>

                            <div className="pin-guard-item">
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-700 dark:text-slate-300">Course Content</h4>
                                    <p className="text-[11px] text-slate-500">Guards editing semesters, subjects, and modules</p>
                                </div>
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        checked={formData.pinGuardSettings.courseContent}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            pinGuardSettings: { ...formData.pinGuardSettings, courseContent: e.target.checked }
                                        })}
                                    />
                                    <span className="slider"></span>
                                </label>
                            </div>

                            <div className="pin-guard-item">
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-700 dark:text-slate-300">Critical Deletions</h4>
                                    <p className="text-[11px] text-slate-500">Guards all delete actions across the platform</p>
                                </div>
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        checked={formData.pinGuardSettings.criticalDeletions}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            pinGuardSettings: { ...formData.pinGuardSettings, criticalDeletions: e.target.checked }
                                        })}
                                    />
                                    <span className="slider"></span>
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button className="btn-secondary flex-1 py-2.5" onClick={() => setShowPinSettings(false)}>Cancel</button>
                            <button className="btn-primary flex-1 py-2.5 font-bold" onClick={handlePinSettingsSave} disabled={isLoading}>
                                {isLoading ? 'Saving...' : 'Apply Settings'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Password Verification Modal */}
            {showVerifyModal && createPortal(
                <div className="modal-overlay verify-pin-overlay" onClick={() => setShowVerifyModal(false)}>
                    <div className="modal-content verify-pin-modal" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 mb-4">
                                <Lock size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Verify Identity</h3>
                            <p className="text-sm text-slate-500 mt-1">Enter your account password to view PINs</p>
                        </div>

                        <div className="profile-form-group mb-6">
                            <label className="profile-form-label">Account Password</label>
                            <input
                                type="password"
                                className={`profile-form-input ${verifyError ? 'border-red-500' : ''}`}
                                placeholder="Enter your password"
                                value={verifyPassword}
                                onChange={(e) => {
                                    setVerifyPassword(e.target.value);
                                    setVerifyError('');
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                                autoFocus
                            />
                            {verifyError && (
                                <p className="text-red-500 text-[11px] mt-1 font-medium">{verifyError}</p>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button className="btn-secondary flex-1 py-2.5" onClick={() => setShowVerifyModal(false)}>Cancel</button>
                            <button className="btn-primary flex-1 py-2.5 font-bold" onClick={handleVerifyPassword}>
                                Verify
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Founder Help Modal */}
            {showFounderModal && createPortal(
                <div className="modal-overlay founder-pin-overlay" onClick={() => setShowFounderModal(false)}>
                    <div className="modal-content founder-modal animate-scale-up" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                                    <HelpCircle size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Founder Details</h3>
                                </div>
                            </div>
                            <button onClick={() => setShowFounderModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                <XCircle size={20} />
                            </button>
                        </div>

                        <div className="flex flex-col items-center text-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 w-full overflow-hidden">
                            <img
                                src="/founder_photo.jpeg"
                                alt="B. Nagesh"
                                className="rounded-2xl object-cover mb-4 border-4 border-purple-100 dark:border-purple-900/40 shadow-sm"
                                style={{
                                    width: '110px',
                                    height: '145px',
                                    minWidth: '110px',
                                    minHeight: '145px',
                                    maxWidth: '110px',
                                    maxHeight: '145px',
                                    aspectRatio: '110/145'
                                }}
                            />
                            <h4 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-1">
                                B. Nagesh
                            </h4>
                            <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-3 block">
                                Creator of Website / Founder
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Student at RGUKT RK Valley • R24 Batch
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 w-full" style={{ marginTop: '25px' }}>
                            <a
                                href="https://wa.me/918074541035"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-4 w-full font-bold transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                                style={{
                                    backgroundColor: '#dcf8c6',
                                    color: '#075E54',
                                    paddingTop: '0.85rem',
                                    paddingBottom: '0.85rem',
                                    borderRadius: '0.5rem',
                                    textDecoration: 'none'
                                }}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 448 512"
                                    className="flex-shrink-0"
                                    style={{ width: '22px', height: '22px', minWidth: '22px', minHeight: '22px', fill: '#25D366' }}
                                >
                                    <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
                                </svg>
                                <span style={{ fontSize: '1.05rem' }}>WhatsApp Contact</span>
                            </a>
                            <button className="btn-primary w-full py-3.5 font-bold" onClick={() => setShowFounderModal(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* QR Generator Modal */}
            {showQRGenerator && (
                <div className="auth-modal-overlay flex items-center justify-center z-[21000] p-4 bg-black/60 backdrop-blur-sm fixed inset-0">
                    <QRGenerator onClose={() => setShowQRGenerator(false)} />
                </div>
            )}

            {showImageUpload && (
                <ImageUploadModal 
                    isOpen={showImageUpload} 
                    onClose={() => setShowImageUpload(false)} 
                    currentPreview={previewUrl} 
                    userId={user?.uid || formData?.rcId || 'unknown_user'}
                    onUploadSuccess={(url) => {
                        updateProfileData({ avatar: url });
                        setPreviewUrl(url);
                        showToast('Profile photo updated successfully!', 'success');
                        notify("Profile Photo Updated", "Your new profile photo has been applied successfully.");
                    }} 
                />
            )}

            {/* Hidden Student Profile Report Template (A4 PDF) - Fixed for Android Layout Engine */}
            <div style={{ position: 'fixed', top: '-10000px', left: 0, width: '210mm', height: '297mm', zIndex: -1000, overflow: 'hidden', pointerEvents: 'none' }}>
                <div id="profile-pdf-template" className="pdf-profile-report-container">
                    {/* Watermark Logo */}
                    <div className="pdf-watermark"><img src={LOGO_DATA_URI} alt="" /></div>

                    {/* PDF Header */}
                    <div className="pdf-header">
                        <div className="pdf-brand-row">
                            <div className="pdf-logo-box">
                                <img src={LOGO_DATA_URI} alt="Logo" />
                            </div>
                            <div className="pdf-brand-text">
                                <h2>RGUKT <span>CONNECT</span></h2>
                                <p>OFFICIAL DIGITAL CAMPUS</p>
                            </div>
                        </div>
                        <div className="pdf-gen-info">
                            <p>Generated on: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>

                    <div className="pdf-title-strip">
                        <h1>Student Profile Report</h1>
                    </div>

                    {/* Hero Section */}
                    <div className="pdf-hero-section">
                        <div className="pdf-profile-frame">
                            <img src={pdfAvatar || previewUrl} alt="Student" />
                        </div>
                        <h2 className="pdf-student-name">{formData.fullName || 'Student Name'}</h2>
                        <div className="pdf-id-badge">
                            <i className="fa-solid fa-user-check" style={{ fontSize: '10px' }}></i>
                            <span>{formData.studentId || 'N/A'}</span>
                        </div>
                    </div>

                    {/* Information Cards */}
                    <div className="pdf-cards-grid">
                        {/* Primary Identity & Academic Card */}
                        <div className="pdf-info-card">
                            <div className="pdf-card-header">
                                <i className="fa-solid fa-user" style={{ fontSize: '12px' }}></i>
                                <h3>Comprehensive Identity & Academic Profile</h3>
                            </div>
                            <div className="pdf-card-body three-col">
                                <div className="pdf-field">
                                    <label><i className="fa-solid fa-user" style={{ fontSize: '8px' }}></i> Full Name</label>
                                    <p>{formData.fullName}</p>
                                </div>
                                <div className="pdf-field">
                                    <label><i className="fa-solid fa-graduation-cap" style={{ fontSize: '8px' }}></i> Student ID</label>
                                    <p>{formData.studentId}</p>
                                </div>
                                <div className="pdf-field">
                                    <label><i className="fa-solid fa-shield-halved" style={{ fontSize: '8px' }}></i> RC ID</label>
                                    <p>{formData.rcId || 'N/A'}</p>
                                </div>
                                <div className="pdf-field">
                                    <label><i className="fa-solid fa-briefcase" style={{ fontSize: '8px' }}></i> Branch</label>
                                    <p>{formData.department || 'N/A'}</p>
                                </div>
                                <div className="pdf-field">
                                    <label><i className="fa-solid fa-calendar-days" style={{ fontSize: '8px' }}></i> Current Class</label>
                                    <p>{formData.currentClass || (formData.studentId?.includes('24') ? 'R24 (1st Year)' : 'N/A')}</p>
                                </div>
                                <div className="pdf-field">
                                    <label><i className="fa-solid fa-location-dot" style={{ fontSize: '8px' }}></i> Campus</label>
                                    <p>{formData.campus}</p>
                                </div>
                                <div className="pdf-field">
                                    <label><i className="fa-solid fa-calendar-check" style={{ fontSize: '8px' }}></i> Admission Year</label>
                                    <p>{formData.studentId?.match(/[a-zA-Z](\d{2})/)?.[1] ? `20${formData.studentId.match(/[a-zA-Z](\d{2})/)[1]}` : '2024'}</p>
                                </div>
                                <div className="pdf-field">
                                    <label><i className="fa-solid fa-user-graduate" style={{ fontSize: '8px' }}></i> Course</label>
                                    <p>{formData.department || formData.branch ? `B.Tech ${formData.department || formData.branch}` : 'B.Tech'}</p>
                                </div>
                                <div className="pdf-field">
                                    <label><i className="fa-solid fa-circle-check" style={{ fontSize: '8px' }}></i> Current Status</label>
                                    <p className="status-active" style={{ fontSize: '7.5pt' }}>Active</p>
                                </div>
                            </div>
                        </div>

                        {/* Contact & System Details */}
                        <div className="pdf-info-card">
                            <div className="pdf-card-header">
                                <i className="fa-solid fa-globe" style={{ fontSize: '12px' }}></i>
                                <h3>Contact & System Information</h3>
                            </div>
                            <div className="pdf-card-body three-col">
                                <div className="pdf-field">
                                    <label><i className="fa-solid fa-phone" style={{ fontSize: '8px' }}></i> Mobile</label>
                                    <p>{formData.phone ? `+91 ${formData.phone}` : 'N/A'}</p>
                                </div>
                                <div className="pdf-field">
                                    <label><i className="fa-solid fa-envelope" style={{ fontSize: '8px' }}></i> Email Address</label>
                                    <p>{formData.email}</p>
                                </div>
                                <div className="pdf-field">
                                    <label><i className="fa-solid fa-language" style={{ fontSize: '8px' }}></i> Language</label>
                                    <p>{formData.language}</p>
                                </div>
                                <div className="pdf-field">
                                    <label><i className="fa-solid fa-clock" style={{ fontSize: '8px' }}></i> Timezone</label>
                                    <p>{formData.timezone}</p>
                                </div>
                                <div className="pdf-field">
                                    <label><i className="fa-solid fa-user-shield" style={{ fontSize: '8px' }}></i> User Role</label>
                                    <p style={{ textTransform: 'capitalize' }}>{user?.role || 'Student'}</p>
                                </div>
                                <div className="pdf-field">
                                    <label><i className="fa-solid fa-cake-candles" style={{ fontSize: '8px' }}></i> Date of Birth</label>
                                    <p>{user?.dob || 'Not Specified'}</p>
                                </div>
                                <div className="pdf-field">
                                    <label><i className="fa-solid fa-calendar-plus" style={{ fontSize: '8px' }}></i> Account Created</label>
                                    <p>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : 'N/A'}</p>
                                </div>
                                <div className="pdf-field">
                                    <label><i className="fa-solid fa-history" style={{ fontSize: '8px' }}></i> Last Seen</label>
                                    <p>{user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString('en-IN') : 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Bio / About */}
                        {formData.bio && (
                            <div className="pdf-info-card" style={{ marginBottom: '0' }}>
                                <div className="pdf-card-header">
                                    <i className="fa-solid fa-circle-info" style={{ fontSize: '12px' }}></i>
                                    <h3>Student Bio / Statement</h3>
                                </div>
                                <div className="pdf-card-body">
                                    <div className="pdf-field">
                                        <p style={{ fontSize: '7.5pt', fontWeight: '500', lineHeight: '1.3', color: '#475569' }}>{formData.bio}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* PDF Footer Strip */}
                    <div className="pdf-footer-strip" style={{ marginTop: 'auto' }}>
                        <div className="pdf-footer-left">
                            <span>RGUKT Connect – Official Student Record</span>
                        </div>
                        <div className="pdf-footer-center">
                            <span>support@rguktconnect.com</span>
                        </div>
                        <div className="pdf-footer-right">
                            <span>Page 01</span>
                        </div>
                        <div className="pdf-system-note">This is a system-generated document and does not require a physical signature.</div>
                    </div>
                </div>
            </div>

            {/* Account Deletion Request Modal */}
            {showDeleteRequestModal && createPortal(
                <div className="delete-request-overlay" onClick={() => setShowDeleteRequestModal(false)}>
                    <div className="delete-request-card" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="delete-request-header">
                            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Trash2 size={22} color="#ef4444" />
                            </div>
                            <div>
                                <h3>Delete Account</h3>
                                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>This request will be reviewed by an administrator</p>
                            </div>
                            <button onClick={() => setShowDeleteRequestModal(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Warning Box */}
                        <div className="delete-request-warning">
                            <p>⚠️ Deleting your account will <strong>permanently remove</strong> all your data including profile, attendance records, and complaints. This action <strong>cannot be undone</strong> once approved by an administrator.</p>
                        </div>

                        {/* Reason Select */}
                        <div className="delete-request-form-group">
                            <CustomSelect
                                label={<>Reason for Deletion <span style={{ color: '#ef4444' }}>*</span></>}
                                value={deletionReason}
                                onChange={(val) => setDeletionReason(val)}
                                options={[
                                    { value: '', label: '— Select a reason —' },
                                    { value: 'graduated', label: 'I have graduated / No longer a student' },
                                    { value: 'privacy', label: 'Privacy concerns' },
                                    { value: 'duplicate', label: 'I have a duplicate account' },
                                    { value: 'not_using', label: 'I no longer use this app' },
                                    { value: 'data_concerns', label: 'Data / security concerns' },
                                    { value: 'other', label: 'Other' }
                                ]}
                            />
                        </div>

                        {/* Optional Comments */}
                        <div className="delete-request-form-group">
                            <label>Additional Comments <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>(optional)</span></label>
                            <textarea
                                className="delete-request-textarea"
                                placeholder="Add any additional context for the administrator..."
                                value={deletionComments}
                                onChange={e => setDeletionComments(e.target.value)}
                                maxLength={500}
                            />
                        </div>

                        {/* Confirm Checkbox */}
                        <label style={{ margin: '1rem 0 1.5rem 0', display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', userSelect: 'none' }}>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px' }}>
                                <input
                                    type="checkbox"
                                    checked={confirmDeletionCheckbox}
                                    onChange={e => setConfirmDeletionCheckbox(e.target.checked)}
                                    style={{
                                        appearance: 'none',
                                        WebkitAppearance: 'none',
                                        width: '20px',
                                        height: '20px',
                                        border: '2px solid var(--color-border)',
                                        borderRadius: '6px',
                                        outline: 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        backgroundColor: confirmDeletionCheckbox ? '#ef4444' : 'transparent',
                                        borderColor: confirmDeletionCheckbox ? '#ef4444' : 'var(--color-border)',
                                        margin: 0
                                    }}
                                />
                                {confirmDeletionCheckbox && (
                                    <Check size={14} color="white" strokeWidth={4} style={{ position: 'absolute', pointerEvents: 'none' }} />
                                )}
                            </div>
                            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
                                I understand that this will permanently delete my account and all associated data after administrator approval. This action cannot be reversed.
                            </span>
                        </label>

                        {/* Actions */}
                        <div className="delete-request-actions">
                            <button
                                className="delete-request-btn cancel"
                                onClick={() => setShowDeleteRequestModal(false)}
                                disabled={isSubmittingDeletion}
                            >
                                Cancel
                            </button>
                            <button
                                className="delete-request-btn submit"
                                onClick={handleSubmitDeletionRequest}
                                disabled={isSubmittingDeletion || !deletionReason || !confirmDeletionCheckbox}
                            >
                                {isSubmittingDeletion ? (
                                    <>
                                        <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={16} />
                                        Submit Request
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Pending Deletion Request Status Modal */}
            {showPendingStatusModal && createPortal(
                <div className="delete-request-overlay animate-fade-in" style={{ zIndex: 22000 }}>
                    <div className="delete-request-card">
                        <div className="delete-request-header">
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: isRestoringAccount ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isRestoringAccount ? '#22c55e' : '#d97706', flexShrink: 0 }}>
                                {isRestoringAccount ? <ShieldCheck size={20} /> : <Clock size={20} />}
                            </div>
                            <h3 style={{ color: isRestoringAccount ? '#22c55e' : '#d97706', fontSize: '1.25rem' }}>{isRestoringAccount ? 'Restoring Account...' : 'Request Under Review'}</h3>
                        </div>
                        <div className="delete-request-warning" style={{ background: isRestoringAccount ? 'rgba(34, 197, 94, 0.05)' : 'rgba(245, 158, 11, 0.05)', borderColor: isRestoringAccount ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)' }}>
                            <p>{isRestoringAccount ? 'Please wait while we cancel your deletion request and restore your account data.' : 'Your account deletion request is currently being reviewed by an administrator. This process may take up to 48 hours.'}</p>
                        </div>
                        
                        <div className="delete-request-form-group" style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '10px' }}>
                            <label style={{ marginBottom: '1rem', display: 'block', position: 'sticky', top: 0, background: 'var(--color-surface, #fff)', zIndex: 10, paddingBottom: '0.5rem' }}>{isRestoringAccount ? 'Restoration Progress' : 'Request Progress'}</label>
                            
                            <div style={{ position: 'relative' }}>
                                {/* Background vertical line */}
                                <div style={{ position: 'absolute', top: '16px', bottom: '16px', left: '15px', width: '2px', background: '#e2e8f0', zIndex: 1 }}></div>

                                {(isRestoringAccount ? [
                                    { id: 1, label: 'Halting Deletion Process', icon: Shield },
                                    { id: 2, label: 'Reverting Data Changes', icon: ArrowUpRight },
                                    { id: 3, label: 'Restoring Authentication', icon: Key },
                                    { id: 4, label: 'Account Restored', icon: Check }
                                ] : [
                                    { id: 1, label: 'Submitted', icon: Check },
                                    { id: 2, label: 'Received', icon: Mail },
                                    { id: 3, label: 'Verification', icon: Shield },
                                    { id: 4, label: 'Under Review', icon: Clock },
                                    { id: 5, label: 'Data Assessment', icon: Info },
                                    { id: 6, label: 'Awaiting Decision', icon: HelpCircle },
                                    { id: 7, label: 'Approved/Rejected', icon: ShieldAlert },
                                    { id: 8, label: 'Processing', icon: Cog },
                                    { id: 9, label: 'Authentication Removed', icon: Key },
                                    { id: 10, label: 'User Notified', icon: Bell },
                                    { id: 11, label: 'Completed', icon: Trash2 }
                                ]).map((step, index, arr) => {
                                    const currentStep = isRestoringAccount ? restoringStep : (pendingRequestData?.progressStep || 1);
                                    const isCompleted = step.id < currentStep;
                                    const isActive = step.id === currentStep;

                                    return (
                                        <div key={step.id} style={{ display: 'flex', alignItems: 'flex-start', position: 'relative', paddingBottom: index === arr.length - 1 ? 0 : '1.5rem' }}>
                                            
                                            {/* Active connecting line overlay */}
                                            {index < arr.length - 1 && isCompleted && (
                                                <div style={{ position: 'absolute', top: '16px', left: '15px', width: '2px', height: '100%', background: '#22c55e', zIndex: 2 }}></div>
                                            )}

                                            {/* Icon wrapper */}
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isActive ? '#3b82f6' : (isCompleted ? '#22c55e' : '#f8fafc'), border: `2px solid ${isActive ? '#3b82f6' : (isCompleted ? '#22c55e' : '#e2e8f0')}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isActive || isCompleted ? '#fff' : '#94a3b8', boxShadow: '0 0 0 4px var(--color-surface, #fff)', zIndex: 3, flexShrink: 0, animation: isCompleted ? 'scaleInBounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' : 'none' }}>
                                                {isCompleted ? <Check size={16} strokeWidth={3} /> : <step.icon size={16} />}
                                            </div>

                                            {/* Text */}
                                            <div style={{ marginLeft: '1rem', paddingTop: '6px' }}>
                                                <div style={{ fontSize: '0.85rem', fontWeight: isActive ? 700 : 500, color: isActive ? '#3b82f6' : (isCompleted ? '#22c55e' : '#64748b') }}>
                                                    {step.label}
                                                </div>
                                                {isActive && <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>In progress...</div>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="delete-request-form-group">
                            <label>Reason Provided</label>
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-slate-600)', background: 'var(--color-slate-50)', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--color-slate-200)' }}>
                                {pendingRequestData?.reason === 'graduated' ? 'I have graduated / No longer a student' :
                                 pendingRequestData?.reason === 'privacy' ? 'Privacy concerns' :
                                 pendingRequestData?.reason === 'duplicate' ? 'I have a duplicate account' :
                                 pendingRequestData?.reason === 'not_using' ? 'I no longer use this app' :
                                 pendingRequestData?.reason === 'data_concerns' ? 'Data / security concerns' :
                                 pendingRequestData?.reason === 'other' ? 'Other' : pendingRequestData?.reason || 'Not specified'}
                            </div>
                        </div>
                        {pendingRequestData?.comments && (
                            <div className="delete-request-form-group">
                                <label>Additional Comments</label>
                                <div style={{ fontSize: '0.85rem', color: 'var(--color-slate-600)', background: 'var(--color-slate-50)', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--color-slate-200)', whiteSpace: 'pre-wrap' }}>
                                    {pendingRequestData.comments}
                                </div>
                            </div>
                        )}
                        <div className="delete-request-actions" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
                            <button
                                className="delete-request-btn cancel"
                                onClick={() => setShowPendingStatusModal(false)}
                                disabled={isSubmittingDeletion}
                                style={{ flex: 1, opacity: isSubmittingDeletion ? 0.5 : 1 }}
                            >
                                Close
                            </button>
                            <button
                                className="delete-request-btn submit"
                                onClick={handleCancelDeletionRequest}
                                disabled={isSubmittingDeletion}
                                style={{ flex: 1, backgroundColor: '#ef4444', borderColor: '#ef4444' }}
                            >
                                {isSubmittingDeletion ? 'Cancelling...' : 'Cancel Request'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Student Digital ID Card Modal */}
            {showIDCard && (
                <StudentIDCard
                    user={user}
                    formData={formData}
                    previewUrl={previewUrl}
                    onClose={() => setShowIDCard(false)}
                />
            )}
        </>
    );
};

export default Profile;
