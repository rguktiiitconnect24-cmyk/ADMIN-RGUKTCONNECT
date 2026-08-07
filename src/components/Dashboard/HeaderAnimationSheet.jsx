import { X, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './HeaderAnimationSheet.css';

const ANIMATIONS = [
    { id: 'none', name: 'None', description: 'Clean professional look' },
    { id: 'theme-flow', name: 'Theme Flow', description: 'Primary to secondary shift' },
    { id: 'soft-pulse', name: 'Soft Pulse', description: 'Gentle breathing border' },
    { id: 'progress-sweep', name: 'Progress Sweep', description: 'Fluid movement streak' },
    { id: 'dash-motion', name: 'Dash Motion', description: 'Clockwise tech dashes' },
    { id: 'glow-edge', name: 'Glow Edge', description: 'Subtle primary highlight' },
    { id: 'wave-motion', name: 'Wave Motion', description: 'Animated gradient wave' },
    { id: 'dual-tone', name: 'Dual Tone Line', description: 'Alternating theme colors' },
    { id: 'corner-pulse', name: 'Corner Pulse', description: 'Soft corner highlights' },
    { id: 'minimal-blink', name: 'Minimal Blink', description: 'Subtle periodic glow' },
    { id: 'liquid-filling', name: 'Liquid Filling', description: 'Fluid rhythmic rising' },
    { id: 'binary-pulse', name: 'Binary Pulse', description: 'Digital stepping dashes' },
    { id: 'crystal-sweep', name: 'Crystal Sweep', description: 'Sharp primary theme paths' },
    { id: 'prism-edge', name: 'Prism Edge', description: 'Multi-tone gradient flow' },
    { id: 'soft-silhouette', name: 'Soft Silhouette', description: 'Deep inner-glow effect' }
];

const HeaderAnimationSheet = ({ isOpen, onClose, currentId, onSelect }) => {
    const [shouldRender, setShouldRender] = useState(isOpen);
    const [isClosing, setIsClosing] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            setIsClosing(false);
            setIsExpanded(false); // Reset on open
        } else if (shouldRender) {
            setIsClosing(true);
            const timer = setTimeout(() => {
                setShouldRender(false);
                setIsClosing(false);
            }, 400);
            return () => clearTimeout(timer);
        }
    }, [isOpen, shouldRender]);

    if (!shouldRender) return null;

    const visibleAnimations = isExpanded ? ANIMATIONS : ANIMATIONS.slice(0, 4);

    const sheetContent = (
        <div className={`animation-sheet-overlay ${isClosing ? 'is-closing' : ''}`} onClick={onClose}>
            <div 
                className={`animation-sheet-content ${isClosing ? 'animate-slide-down' : 'animate-slide-up'} ${isExpanded ? 'is-expanded' : ''}`} 
                onClick={e => e.stopPropagation()}
            >
                <div className="sheet-grabber"></div>
                
                <header className="sheet-header">
                    <div className="title-box">
                        <h3>Choose Border <span>Animation</span></h3>
                        <p>Personalize your dashboard experience</p>
                    </div>
                    <div className="header-actions">
                        <button className="close-btn" onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>
                </header>

                <div className={`animations-grid ${isExpanded ? 'expanded-flow' : ''}`}>
                    {visibleAnimations.map((anim) => (
                        <button 
                            key={anim.id}
                            className={`anim-option-card ${currentId === anim.id ? 'is-selected' : ''}`}
                            onClick={() => onSelect(anim.id)}
                        >
                            <div className="anim-preview-box">
                                <div className={`preview-border ${anim.id}`}></div>
                                {currentId === anim.id && (
                                    <div className="selected-badge">
                                        <Check size={12} />
                                    </div>
                                )}
                            </div>
                            <div className="anim-info">
                                <span className="anim-name">{anim.name}</span>
                                <span className="anim-desc">{anim.description}</span>
                            </div>
                        </button>
                    ))}
                    {!isExpanded && ANIMATIONS.length > 4 && (
                        <button className="view-all-small" onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(true);
                        }}>
                            View All {ANIMATIONS.length - 4}
                        </button>
                    )}
                </div>
                
                <div className="sheet-footer">
                    <button className="apply-btn" onClick={onClose}>Done</button>
                </div>
            </div>
        </div>
    );

    return createPortal(sheetContent, document.body);
};

export default HeaderAnimationSheet;
