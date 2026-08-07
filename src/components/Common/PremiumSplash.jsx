import { useEffect, useState, useRef } from 'react';
import './PremiumSplash.css';

const PremiumSplash = ({ onFinish }) => {
    const [step, setStep] = useState(0); // 0: initial, 1: revealing, 2: transforming, 3: final, 4: exiting
    const audioRef = useRef(null);

    useEffect(() => {
        // Animation Sequence
        const timers = [
            setTimeout(() => setStep(1), 500),   // Start revealing
            setTimeout(() => setStep(2), 3500),  // Transform (3D rotation + Energy ring)
            setTimeout(() => setStep(3), 5000),  // Final reveal (Flash)
            setTimeout(() => setStep(4), 6500),  // Exit start
            setTimeout(() => {
                if (onFinish) onFinish();
            }, 7500) // Total duration ~7.5s
        ];

        return () => timers.forEach(t => clearTimeout(t));
    }, [onFinish]);

    // Handle Audio triggers (placeholder logic)
    useEffect(() => {
        if (step === 1) {
            // Trigger whoosh sound
            console.log('Play: Futuristic Whoosh');
        } else if (step === 3) {
            // Trigger deep bass impact
            console.log('Play: Deep Bass Impact');
        }
    }, [step]);

    return (
        <div className={`premium-splash-container step-${step}`}>
            {/* Dark Cinematic Background */}
            <div className="cinematic-bg">
                <div className="glow-mesh"></div>
                <div className="particles-container">
                    {[...Array(30)].map((_, i) => (
                        <div key={i} className="particle" style={{
                            '--top': `${Math.random() * 100}%`,
                            '--left': `${Math.random() * 100}%`,
                            '--delay': `${Math.random() * 5}s`,
                            '--duration': `${3 + Math.random() * 4}s`
                        }}></div>
                    ))}
                </div>
            </div>

            <div className="logo-assembly-zone">
                {/* Energy Ring / Aura */}
                <div className="energy-ring"></div>
                <div className="ripple-waves">
                    <div className="ripple"></div>
                    <div className="ripple"></div>
                    <div className="ripple"></div>
                </div>

                <div className="logo-main-wrapper">
                    <svg width="512" height="512" viewBox="0 0 512 512" fill="none" className="premium-logo-svg">
                        <defs>
                            <linearGradient id="premium-purple-grad" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#4F46E5" />
                                <stop offset="100%" stopColor="#312E81" />
                            </linearGradient>
                            <filter id="premium-glow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="15" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                        </defs>

                        {/* Logo Background Plate (Glassmorphism revealed at end) */}
                        <rect x="64" y="64" width="384" height="384" rx="96" fill="url(#premium-purple-grad)" className="logo-plate" />

                        {/* Animated Logo Pieces */}
                        <g className="logo-pieces">
                            {/* Cap Top - Slides from Left */}
                            <path 
                                d="M256 120L64 210L256 300L448 210L256 120Z" 
                                fill="white" 
                                className="cap-top piece" 
                            />
                            
                            {/* Cap Bottom - Rises from Below */}
                            <path 
                                d="M128 240V320C128 320 180 370 256 370C332 370 384 320 384 320V240L256 300L128 240Z" 
                                fill="white" 
                                className="cap-bottom piece" 
                            />

                            {/* Tassel Group - Draws Automatically */}
                            <g className="tassel-group">
                                <path 
                                    d="M416 210V340" 
                                    stroke="white" 
                                    strokeWidth="20" 
                                    strokeLinecap="round" 
                                    className="tassel-line" 
                                />
                                <circle cx="416" cy="350" r="15" fill="white" className="tassel-dot" />
                            </g>
                        </g>

                        {/* Shine Streak Animation */}
                        <rect x="0" y="0" width="100" height="600" fill="white" fillOpacity="0.3" className="shine-streak" transform="rotate(25)" />
                    </svg>

                    {/* Reflections / Glass Layer */}
                    <div className="glass-reflection"></div>
                </div>

                {/* Brand Text Reveal */}
                <div className="brand-text-reveal">
                    <h1 className="main-title">RGUKT CONNECT</h1>
                    <div className="accent-line"></div>
                </div>
            </div>

            {/* Cinematic Flash Transition */}
            <div className="cinematic-flash"></div>
        </div>
    );
};

export default PremiumSplash;
