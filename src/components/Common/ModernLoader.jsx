import './ModernLoader.css';

const ModernLoader = ({ showText = true }) => {
    return (
        <div className="modern-loader-container">
            <div className="loader-wrapper">
                <svg height="0" width="0" viewBox="0 0 64 64" className="absolute">
                    <defs>
                        <linearGradient gradientUnits="userSpaceOnUse" y2="2" x2="0" y1="62" x1="0" id="brand-gradient">
                            <stop stopColor="#6366f1" offset="0%"></stop>
                            <stop stopColor="#4f46e5" offset="25%"></stop>
                            <stop stopColor="#3b82f6" offset="50%"></stop>
                            <stop stopColor="#60a5fa" offset="75%"></stop>
                            <stop stopColor="#0ea5e9" offset="100%"></stop>
                            <animateTransform
                                attributeName="gradientTransform"
                                type="rotate"
                                from="0 32 32"
                                to="360 32 32"
                                dur="4s"
                                repeatCount="indefinite"
                            />
                        </linearGradient>
                        <linearGradient gradientUnits="userSpaceOnUse" y2="0" x2="0" y1="64" x1="0" id="spin-gradient">
                            <stop stopColor="#FFC800" offset="0%"></stop>
                            <stop stopColor="#FF00FF" offset="50%"></stop>
                            <stop stopColor="#00FFFF" offset="100%"></stop>
                            <animateTransform repeatCount="indefinite" keySplines=".42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1;.42,0,.58,1" keyTimes="0; 0.125; 0.25; 0.375; 0.5; 0.625; 0.75; 0.875; 1" dur="8s" values="0 32 32;-270 32 32;-270 32 32;-540 32 32;-540 32 32;-810 32 32;-810 32 32;-1080 32 32;-1080 32 32" type="rotate" attributeName="gradientTransform"></animateTransform>
                        </linearGradient>
                    </defs>
                </svg>

                <svg viewBox="0 0 320 60" className="brand-text-svg">
                    <text
                        x="50%"
                        y="50%"
                        dominantBaseline="middle"
                        textAnchor="middle"
                        className="animate-brand-text"
                    >
                        RGUKT CONNECT
                    </text>
                </svg>
            </div>
            {showText && <h2 className="loader-brand">RGUKT CONNECT</h2>}
        </div>
    );
};

export default ModernLoader;
