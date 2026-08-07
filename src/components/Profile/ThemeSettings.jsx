import { Settings, Check, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const ThemeSettings = () => {
    const { themeMode, setThemeMode } = useTheme();

    return (
        <div className="theme-selection-view">
            <div className="theme-options-grid">
                {/* System Theme */}
                <button 
                    className={`theme-card ${themeMode === 'system' ? 'active' : ''}`}
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
                        <p>Syncs with device</p>
                    </div>
                    <div className="theme-card-check">
                        <Check size={14} />
                    </div>
                </button>

                {/* Light Theme */}
                <button 
                    className={`theme-card ${themeMode === 'light' ? 'active' : ''}`}
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
                        <p>Clean and bright</p>
                    </div>
                    <div className="theme-card-check">
                        <Check size={14} />
                    </div>
                </button>

                {/* Dark Theme */}
                <button 
                    className={`theme-card ${themeMode === 'dark' ? 'active' : ''}`}
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
                        <p>Easy on the eyes</p>
                    </div>
                    <div className="theme-card-check">
                        <Check size={14} />
                    </div>
                </button>
            </div>
        </div>
    );
};

export default ThemeSettings;
