import { useState, useEffect, useRef } from 'react';
import { User, Mars, Venus, UserMinus, ChevronDown, Check, Calendar, ChevronLeft, ChevronRight, Phone, Mail, MapPin, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import './CompleteProfileModal.css';
import { uploadProfileImage } from '../../services/imageService';

// --- Helper for Image Cropping ---
const createImage = (url) =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        // image.setAttribute('crossOrigin', 'anonymous'); // removed to prevent data URI tainting issues
        image.src = url;
    });

const getCroppedImg = async (imageSrc, pixelCrop) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            if (!blob) return;
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
                resolve(reader.result);
            };
        }, 'image/jpeg');
    });
};
// --- Custom Sub-Components ---

const CustomDropdown = ({ label, value, options, onChange, icon: Icon, error }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className="input-group" ref={dropdownRef}>
            <label>{label}</label>
            <div 
                className={`custom-select-trigger ${isOpen ? 'active' : ''} ${error ? 'error' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="trigger-content">
                    {Icon && <Icon size={18} className="input-icon-inline" />}
                    <span>{selectedOption ? selectedOption.label : 'Select'}</span>
                </div>
                <ChevronDown size={18} className={`chevron-icon ${isOpen ? 'rotate' : ''}`} />
            </div>
            
            {isOpen && (
                <div className="custom-dropdown-menu scrollbar-hide animate-in-quick">
                    <div className="dropdown-scroll-area">
                        {options.map((opt) => (
                            <div 
                                key={opt.value} 
                                className={`dropdown-item ${value === opt.value ? 'selected' : ''}`}
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                            >
                                {opt.label}
                                {value === opt.value && <Check size={14} />}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {error && <span className="error-msg">{error}</span>}
        </div>
    );
};

const CustomDatePicker = ({ label, value, onChange, error }) => {
    const [isOpen, setIsOpen] = useState(false);
    const pickerRef = useRef(null);
    const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    const handlePrevMonth = (e) => {
        e.stopPropagation();
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };
    
    const handleNextMonth = (e) => {
        e.stopPropagation();
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const handleDateSelect = (day) => {
        const yyyy = viewDate.getFullYear();
        const mm = String(viewDate.getMonth() + 1).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        onChange(`${yyyy}-${mm}-${dd}`);
        setIsOpen(false);
    };

    const renderCalendar = () => {
        const days = [];
        const totalDays = daysInMonth(viewDate.getFullYear(), viewDate.getMonth());
        const startDay = firstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());
        
        // Empty slots for previous month
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
        }
        
        // Actual days
        for (let d = 1; d <= totalDays; d++) {
            const yyyy = viewDate.getFullYear();
            const mm = String(viewDate.getMonth() + 1).padStart(2, '0');
            const dd = String(d).padStart(2, '0');
            const isSelected = value === `${yyyy}-${mm}-${dd}`;
            const isToday = new Date().toDateString() === new Date(viewDate.getFullYear(), viewDate.getMonth(), d).toDateString();
            
            days.push(
                <div 
                    key={d} 
                    className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                    onClick={() => handleDateSelect(d)}
                >
                    {d}
                </div>
            );
        }
        return days;
    };

    const [viewMode, setViewMode] = useState('days'); // 'days', 'months', 'years'
    const years = Array.from({ length: 101 }, (_, i) => new Date().getFullYear() - i);

    const handleMonthSelect = (monthIdx) => {
        setViewDate(new Date(viewDate.getFullYear(), monthIdx, 1));
        setViewMode('days');
    };

    const handleYearSelect = (year) => {
        setViewDate(new Date(year, viewDate.getMonth(), 1));
        setViewMode('days');
    };

    return (
        <div className="input-group" ref={pickerRef}>
            <label>{label}</label>
            <div 
                className={`custom-datepicker-trigger ${isOpen ? 'active' : ''} ${error ? 'error' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="trigger-content">
                    <Calendar size={18} className="input-icon-inline" />
                    <span>{value || 'Select Date'}</span>
                </div>
                <ChevronDown size={18} className={`chevron-icon ${isOpen ? 'rotate' : ''}`} />
            </div>

            {isOpen && (
                <div className="custom-calendar-overlay animate-fade-in" onClick={() => setIsOpen(false)}>
                    <div className="custom-calendar-popup animate-center-pop" onClick={(e) => e.stopPropagation()}>
                        <div className="calendar-header-premium">
                            <button className="nav-btn" onClick={handlePrevMonth}><ChevronLeft size={18}/></button>
                            <div className="header-labels" onClick={() => setViewMode(viewMode === 'days' ? 'months' : 'days')}>
                                <span className="month-label">{months[viewDate.getMonth()]}</span>
                                <span className="year-label" onClick={(e) => { e.stopPropagation(); setViewMode('years'); }}>{viewDate.getFullYear()}</span>
                                <ChevronDown size={14} className={viewMode !== 'days' ? 'rotate' : ''} />
                            </div>
                            <button className="nav-btn" onClick={handleNextMonth}><ChevronRight size={18}/></button>
                        </div>

                        {viewMode === 'days' && (
                            <>
                                <div className="calendar-weekdays">
                                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
                                </div>
                                <div className="calendar-grid">
                                    {renderCalendar()}
                                </div>
                            </>
                        )}

                        {viewMode === 'months' && (
                            <div className="calendar-selector-grid animate-in-quick">
                                {months.map((m, idx) => (
                                    <div 
                                        key={m} 
                                        className={`selector-item ${viewDate.getMonth() === idx ? 'selected' : ''}`}
                                        onClick={() => handleMonthSelect(idx)}
                                    >
                                        {m.substring(0, 3)}
                                    </div>
                                ))}
                            </div>
                        )}

                        {viewMode === 'years' && (
                            <div className="calendar-selector-grid years scrollbar-hide animate-in-quick">
                                {years.map(y => (
                                    <div 
                                        key={y} 
                                        className={`selector-item ${viewDate.getFullYear() === y ? 'selected' : ''}`}
                                        onClick={() => handleYearSelect(y)}
                                    >
                                        {y}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="calendar-footer">
                            <button className="calendar-cancel-btn" onClick={() => setIsOpen(false)}>Cancel</button>
                            {value && <button className="calendar-confirm-btn" onClick={() => setIsOpen(false)}>Done</button>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Main Modal ---

const STEPS = [
    { id: 1, title: 'Profile Setup', icon: User }
];

const CompleteProfileModal = ({ isOpen, user }) => {
    const { updateProfileData, logout, setIntentionalLogout } = useAuth();
    const { showToast } = useToast();
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [formData, setFormData] = useState({
        fullName: (user?.fullName && user.fullName !== 'Loading...') ? user.fullName : '',
        dob: user?.dob || '',
        gender: user?.gender || '',
        phone: user?.phone || '',
        email: user?.email || '',
        address: user?.address || '',
        country: user?.country || 'India',
        state: user?.state || '',
        city: user?.city || '',
        pincode: user?.pincode || '',
        avatar: user?.avatar || '',
        bio: user?.bio || '',
        profession: user?.profession || '',
        interests: user?.interests || '',
    });

    const [locationData, setLocationData] = useState({ villages: [], districts: [], isLoading: false });

    // Cropper State
    const [imageSrc, setImageSrc] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const [errors, setErrors] = useState({});
    const lastFetchedPincode = useRef('');
    const isFirstLoad = useRef(true);

    const [streetAddress, setStreetAddress] = useState(() => {
        const parts = (user?.address || '').split(', ');
        return parts.length > 1 ? parts.slice(0, -1).join(', ') : (user?.address || '');
    });
    const [selectedVillage, setSelectedVillage] = useState(() => {
        const parts = (user?.address || '').split(', ');
        return parts.length > 1 ? parts[parts.length - 1] : '';
    });

    useEffect(() => {
        if (user?.address) {
            const parts = user.address.split(', ');
            setStreetAddress(parts.length > 1 ? parts.slice(0, -1).join(', ') : user.address);
            setSelectedVillage(parts.length > 1 ? parts[parts.length - 1] : '');
        }
    }, [user?.address]);

    useEffect(() => {
        if (user && !user.loadingProfile) {
            setFormData(prev => ({
                ...prev,
                fullName: prev.fullName || (user.fullName !== 'Loading...' ? user.fullName : ''),
                dob: prev.dob || user.dob || '',
                gender: prev.gender || user.gender || '',
                phone: prev.phone || user.phone || '',
                email: prev.email || user.email || '',
                address: prev.address || user.address || '',
                state: prev.state || user.state || '',
                city: prev.city || user.city || '',
                pincode: prev.pincode || user.pincode || '',
                avatar: prev.avatar || user.avatar || '',
                bio: prev.bio || user.bio || '',
                profession: prev.profession || user.profession || '',
                interests: prev.interests || user.interests || '',
            }));
        }
    }, [user]);

    useEffect(() => {
        const fetchLocation = async () => {
            // Only fetch if 6 digits AND it's different from the last fetch
            if (formData.pincode.length === 6 && formData.pincode !== lastFetchedPincode.current) {
                const isSilent = isFirstLoad.current;
                lastFetchedPincode.current = formData.pincode;
                setLocationData(prev => ({ ...prev, isLoading: true }));
                try {
                    // Try 1: Modern CDN-backed GitHub Pages API (Fast, valid SSL certificate)
                    const response = await fetch(`https://aniket-thapa.github.io/india-pincode-api/pincodes/${formData.pincode}.json`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data && data.state && data.district) {
                            // Title Case formatting helper for premium aesthetics
                            const toTitleCase = (str) => {
                                if (!str) return '';
                                return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                            };
                            
                            const stateTitle = toTitleCase(data.state);
                            const districtTitle = toTitleCase(data.district);
                            const villages = (data.offices || []).map(o => {
                                const name = toTitleCase(o.officeName);
                                return { label: name, value: name };
                            });

                            setLocationData({
                                villages,
                                districts: [{ label: districtTitle, value: districtTitle }],
                                isLoading: false
                            });
                            
                            setFormData(prev => ({
                                ...prev,
                                state: stateTitle,
                                city: districtTitle
                            }));

                            if (!isSilent) {
                                showToast(`Found ${villages.length} locations for ${formData.pincode}`, "success");
                            }
                            return;
                        }
                    }

                    // Try 2: Fallback to old PostalPincode API (in case it is renewed or has extra data)
                    const fallbackResponse = await fetch(`https://api.postalpincode.in/pincode/${formData.pincode}`);
                    const fallbackData = await fallbackResponse.json();
                    if (fallbackData && fallbackData[0] && fallbackData[0].Status === 'Success') {
                        const posts = fallbackData[0].PostOffice;
                        const villages = posts.map(p => ({ label: p.Name, value: p.Name }));
                        const district = posts[0].District;
                        const state = posts[0].State;
                        
                        setLocationData({
                            villages,
                            districts: [{ label: district, value: district }],
                            isLoading: false
                        });
                        
                        setFormData(prev => ({
                            ...prev,
                            state: state,
                            city: district
                        }));

                        if (!isSilent) {
                            showToast(`Found ${villages.length} locations for ${formData.pincode}`, "success");
                        }
                    } else {
                        setLocationData({ villages: [], districts: [], isLoading: false });
                        if (!isSilent) {
                            showToast("Pincode not found. Please enter details manually.", "info");
                        }
                    }
                } catch (error) {
                    setLocationData(prev => ({ ...prev, isLoading: false }));
                    if (!isSilent) {
                        showToast("Unable to auto-fill location. Please enter manually.", "info");
                    }
                }
            }
            isFirstLoad.current = false;
        };
        fetchLocation();
    }, [formData.pincode, showToast]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.history.pushState(null, null, window.location.href);
            const handlePopState = () => window.history.pushState(null, null, window.location.href);
            window.addEventListener('popstate', handlePopState);
            return () => {
                document.body.style.overflow = 'unset';
                window.removeEventListener('popstate', handlePopState);
            };
        }
    }, [isOpen]);

    if (!isOpen && !isSuccess) return null;

    const validateStep = (step) => {
        const newErrors = {};
        if (step === 1) {
            if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required';
            if (!formData.dob) newErrors.dob = 'Date of Birth is required';
            if (!formData.gender) newErrors.gender = 'Gender is required';
            if (!formData.phone.trim()) {
                newErrors.phone = 'Mobile Number is required';
            } else if (!/^\d{10}$/.test(formData.phone.trim())) {
                newErrors.phone = 'Mobile number must be exactly 10 digits';
            }
        }
        setErrors(newErrors);
        return newErrors;
    };

    const handleNext = () => {
        const stepErrors = validateStep(currentStep);
        if (Object.keys(stepErrors).length === 0) {
            setCurrentStep(prev => prev + 1);
        } else {
            const missingFields = Object.values(stepErrors).join(', ');
            showToast("Missing: " + missingFields, "warning");
        }
    };

    const handleBack = () => setCurrentStep(prev => prev - 1);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setImageSrc(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const onCropComplete = (croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleSaveCrop = async () => {
        try {
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
            setFormData(prev => ({ ...prev, avatar: croppedImage }));
            setImageSrc(null); // Close cropper
        } catch (e) {
            console.error(e);
            showToast("Failed to crop image", "error");
        }
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            let finalAvatar = formData.avatar;
            
            if (finalAvatar && finalAvatar.startsWith('data:image')) {
                try {
                    const response = await fetch(finalAvatar);
                    const blob = await response.blob();
                    finalAvatar = await uploadProfileImage(user.uid, blob);
                } catch (uploadErr) {
                    console.error("Avatar upload failed:", uploadErr);
                    showToast("Profile picture upload failed. Please try again.", "error");
                    setIsLoading(false);
                    return;
                }
            }

            await updateProfileData({
                ...formData,
                avatar: finalAvatar,
                profileCompleted: true
            });
            setIsSuccess(true);
            setTimeout(() => window.location.reload(), 2000);
        } catch (error) {
            console.error('Failed to complete profile:', error);
            showToast("Failed to complete profile.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignOut = async () => {
        try {
            if (setIntentionalLogout) setIntentionalLogout(true);
            await logout();
            window.location.href = '/login';
        } catch (error) {
            console.error('Failed to log out', error);
            showToast("Failed to log out", "error");
        }
    };

    const renderSummary = () => (
        <div className="summary-view animate-in">
            <div className="summary-header">
                <div className="summary-avatar">
                    <img src={formData.avatar || user?.avatar} alt="Profile" />
                </div>
                <div className="summary-info">
                    <h3>{formData.fullName}</h3>
                    <p>{formData.profession || 'Student'}</p>
                </div>
            </div>
            
            <div className="summary-grid">
                <div className="summary-item">
                    <Calendar size={16} />
                    <div>
                        <label>Date of Birth</label>
                        <span>{formData.dob}</span>
                    </div>
                </div>
                <div className="summary-item">
                    <Phone size={16} />
                    <div>
                        <label>Mobile</label>
                        <span>{formData.phone}</span>
                    </div>
                </div>
                <div className="summary-item">
                    <Mail size={16} />
                    <div>
                        <label>Email</label>
                        <span>{formData.email}</span>
                    </div>
                </div>
                <div className="summary-item">
                    <MapPin size={16} />
                    <div>
                        <label>Location</label>
                        <span>{formData.city}, {formData.state}</span>
                    </div>
                </div>
            </div>

            {formData.bio && (
                <div className="summary-bio">
                    <label>Bio</label>
                    <p>{formData.bio}</p>
                </div>
            )}
        </div>
    );

    const renderStepContent = () => {
        if (currentStep === 1) {
            return (
                <div className="step-content animate-in">
                    <div className="input-group">
                        <label>Full Name</label>
                        <div className="input-wrapper">
                            <User size={18} className="input-icon" />
                            <input 
                                type="text" 
                                placeholder="Enter your full name"
                                value={formData.fullName}
                                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                className={errors.fullName ? 'error' : ''}
                            />
                        </div>
                        {errors.fullName && <span className="error-msg">{errors.fullName}</span>}
                    </div>
                    <div className="input-row">
                        <CustomDatePicker 
                            label="Date of Birth"
                            value={formData.dob}
                            onChange={(val) => setFormData({...formData, dob: val})}
                            error={errors.dob}
                        />
                        <div className="input-group">
                            <label>Gender</label>
                            <div className="gender-pill-grid">
                                {[
                                    { label: 'Male', value: 'male', icon: Mars },
                                    { label: 'Female', value: 'female', icon: Venus },
                                    { label: 'Other', value: 'other', icon: UserMinus }
                                ].map((option) => (
                                    <div 
                                        key={option.value}
                                        className={`gender-pill ${formData.gender === option.value ? 'active' : ''} ${errors.gender ? 'error' : ''}`}
                                        onClick={() => setFormData({...formData, gender: option.value})}
                                    >
                                        <div className="pill-icon">
                                            <option.icon size={20} />
                                        </div>
                                        <span>{option.label}</span>
                                    </div>
                                ))}
                            </div>
                            {errors.gender && <span className="error-msg">{errors.gender}</span>}
                        </div>
                    </div>
                    <div className="input-group mt-4">
                        <label>Mobile Number</label>
                        <div className="input-wrapper">
                            <Phone size={18} className="input-icon" />
                            <input 
                                type="tel" 
                                placeholder="10-digit mobile number"
                                value={formData.phone}
                                onChange={(e) => {
                                    const cleanVal = e.target.value.replace(/\D/g, '');
                                    if (cleanVal.length <= 10) {
                                        setFormData({...formData, phone: cleanVal});
                                    }
                                }}
                                className={errors.phone ? 'error' : ''}
                            />
                        </div>
                        {errors.phone && <span className="error-msg">{errors.phone}</span>}
                    </div>
                </div>
            );
        }
        return null;
    };


    return (
        <div className="cp-modal-overlay">
            <div className={`cp-modal-card ${isSuccess ? 'success' : ''} step-${currentStep}`}>
                {isSuccess ? (
                    <div className="success-state animate-fade-in">
                        <div className="success-icon-wrapper">
                            <Check size={48} />
                        </div>
                        <h2>You're All Set!</h2>
                        <p>Your profile has been successfully saved. Enjoy RGUKT CONNECT!</p>
                        <div className="success-glow"></div>
                    </div>
                ) : (
                    <>
                        <div className="cp-modal-header">
                            <div className="cp-title-area">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <div className="cp-badge" style={{ marginBottom: 0 }}>Onboarding</div>
                                    <button 
                                        onClick={handleSignOut}
                                        style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                    >
                                        <LogOut size={14} /> Sign Out
                                    </button>
                                </div>
                                <h2>{STEPS[currentStep - 1].title}</h2>
                            </div>
                        </div>

                        <div className="cp-modal-body">
                            {renderStepContent()}
                        </div>

                        <div className="cp-modal-footer">
                            {currentStep > 1 && (
                                <button className="cp-btn-secondary" onClick={handleBack} disabled={isLoading}>
                                    <ChevronLeft size={20} />
                                    Back
                                </button>
                            )}
                            <button 
                                className="cp-btn-primary" 
                                onClick={currentStep === STEPS.length ? handleSubmit : handleNext}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : (
                                    <>
                                        Finish Setup
                                        <ChevronRight size={20} />
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CompleteProfileModal;
