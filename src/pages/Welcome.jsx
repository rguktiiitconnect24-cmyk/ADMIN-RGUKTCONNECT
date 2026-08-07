import { ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Welcome.css';

const slides = [
    {
        id: 1,
        title: "Your Smart <span>Academic Hub</span>",
        description: "Access all your course materials, grades, and schedules in one unified dashboard.",
        image: "/assets/onboarding/academic.png",
        color: "#4f46e5"
    },
    {
        id: 2,
        title: "Stay Connected to <span>Campus</span>",
        description: "Get real-time updates, register complaints, and participate in campus activities effortlessly.",
        image: "/assets/onboarding/updates.png",
        color: "#3b82f6"
    },
    {
        id: 3,
        title: "Seamless & <span>Secure Access</span>",
        description: "Experience lightning-fast login with biometric support and robust security for your data.",
        image: "/assets/onboarding/secure.png",
        color: "#8b5cf6"
    },
    {
        id: 4,
        title: "Track Your <span>Performance</span>",
        description: "Monitor your attendance, view exam results, and stay on top of your academic progress effortlessly.",
        image: "/assets/onboarding/performance.png",
        color: "#10b981"
    }
];

const Welcome = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);


    useEffect(() => {
        if (!loading && user) {
            navigate('/dashboard', { replace: true });
        }
    }, [user, loading, navigate]);

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(prev => prev + 1);
        } else {
            handleFinish();
        }
    };

    const handleSkip = () => {
        handleFinish();
    };

    const handleFinish = () => {
        setIsTransitioning(true);
        setTimeout(() => {
            navigate('/login');
        }, 1500);
    };

    if (loading || user) return null;

    return (
        <div className="welcome-page-root">

            {/* Ambient Background */}
            <div className="welcome-bg-ambient">
                <motion.div 
                    className="ambient-circle c1"
                    animate={{ 
                        backgroundColor: slides[currentSlide].color,
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.4, 0.3]
                    }}
                    transition={{ duration: 4, repeat: Infinity }}
                />
                <div className="ambient-circle c2" />
            </div>

            <div className="onboarding-carousel">
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={currentSlide}
                        className="onboarding-slide"
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ 
                            duration: 0.4, 
                            ease: "easeInOut"
                        }}
                    >
                        {/* Onboarding Branding */}
                        <div className="onboarding-branding">
                            <img src="/logo.svg" alt="RGUKT Logo" className="onboarding-logo" />
                            <span className="onboarding-app-name">RGUKT CONNECT</span>
                        </div>

                        <div className="slide-image-container">
                            <img 
                                src={slides[currentSlide].image} 
                                alt="Illustration" 
                                className="slide-image"
                            />
                        </div>
                        <div className="slide-content">
                            <h1 
                                className="slide-title"
                                dangerouslySetInnerHTML={{ __html: slides[currentSlide].title }}
                            />
                            <p className="slide-description">
                                {slides[currentSlide].description}
                            </p>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Indicators */}
            <div className="carousel-indicators">
                {slides.map((_, index) => (
                    <div 
                        key={index} 
                        className={`indicator-dot ${index === currentSlide ? 'active' : ''}`}
                    />
                ))}
            </div>

            {/* Bottom Action Bar */}
            <div className="bottom-action-bar">
                <div className="action-buttons">
                    {currentSlide < slides.length - 1 && (
                        <button 
                            className="btn-ghost" 
                            onClick={handleSkip}
                        >
                            Skip
                        </button>
                    )}
                    <button 
                        className="btn-primary next-btn" 
                        onClick={handleNext}
                    >
                        <span>{currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}</span>
                        <ArrowRight size={20} />
                    </button>
                </div>
            </div>


            {/* Final Transition Overlay */}
            <AnimatePresence>
                {isTransitioning && (
                    <motion.div 
                        className="welcome-transition-root"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.h1 
                            className="transition-brand"
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5, type: "spring" }}
                        >
                            RGUKT CONNECT
                        </motion.h1>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Welcome;
