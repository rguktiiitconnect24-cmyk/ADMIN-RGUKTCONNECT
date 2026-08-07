import { Layout, Compass, BookOpen, Bell, Wind, Highlighter, Maximize } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';

const NavigationSettings = () => {
    const { navSettings, updateNavSetting } = useNavigation();

    // 4 items matches the real nav bar, so pill width: 25% aligns correctly
    const previewItems = [
        { icon: Layout, label: 'Home', active: true },
        { icon: BookOpen, label: 'Courses', active: false },
        { icon: Compass, label: 'Explore', active: false },
        { icon: Bell, label: 'Alerts', active: false },
    ];

    return (
        <div className="space-y-8">
            {/* Live Preview Card */}
            <div className="nav-preview-card">
                <div className="preview-label">Live Preview</div>
                <div
                    className="preview-nav-container"
                    data-nav-mode={navSettings.mode}
                    data-nav-highlight={navSettings.highlight}
                    data-nav-icon={navSettings.iconSize}
                >
                    <div className="preview-nav-content">
                        {/* Pill sits behind items, positioned at first (active) item */}
                        <div className="preview-nav-pill-wrapper" style={{ transform: 'translateX(0%)' }}>
                            <div className="mobile-nav-pill"></div>
                        </div>
                        {previewItems.map((item, idx) => (
                            <div key={idx} className={`preview-nav-item ${item.active ? 'active' : ''}`}>
                                <div className="mobile-nav-icon-wrapper">
                                    <item.icon size={18} />
                                </div>
                                {navSettings.mode !== 'compact' && (
                                    <span className="preview-nav-label">{item.label}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                <p className="text-[10px] text-center mt-3 text-muted opacity-60">Interactive preview of your current settings</p>
            </div>

            <div className="space-y-6">
                {/* Navigation Mode */}
                <div className="nav-setting-card">
                    <div className="setting-header">
                        <Layout className="setting-icon" size={20} />
                        <div className="setting-text">
                            <h4 className="font-bold">Navigation Mode</h4>
                            <p className="text-xs text-muted">Standard or compact layout</p>
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
                <div className="nav-setting-card">
                    <div className="setting-header">
                        <Wind className="setting-icon" size={20} />
                        <div className="setting-text">
                            <h4 className="font-bold">Transition Speed</h4>
                            <p className="text-xs text-muted">Controls animation timing</p>
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
                <div className="nav-setting-card">
                    <div className="setting-header">
                        <Highlighter className="setting-icon" size={20} />
                        <div className="setting-text">
                            <h4 className="font-bold">Active Highlight</h4>
                            <p className="text-xs text-muted">How the active tab is marked</p>
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
                <div className="nav-setting-card">
                    <div className="setting-header">
                        <Maximize className="setting-icon" size={20} />
                        <div className="setting-text">
                            <h4 className="font-bold">Icon Size</h4>
                            <p className="text-xs text-muted">Size of navigation icons</p>
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
    );
};

export default NavigationSettings;
