import { createContext, useContext, useState, useEffect } from 'react';

const NavigationContext = createContext();

export const useNavigation = () => {
    const context = useContext(NavigationContext);
    if (!context) {
        throw new Error('useNavigation must be used within a NavigationProvider');
    }
    return context;
};

export const NavigationProvider = ({ children }) => {
    const [navSettings, setNavSettings] = useState(() => {
        const saved = localStorage.getItem('app_navigation_settings');
        return saved ? JSON.parse(saved) : {
            mode: 'standard', // standard | compact
            animation: 'smooth', // smooth | fast | minimal
            iconSize: 'medium', // small | medium | large
            highlight: 'filled' // underline | filled | soft-glow | neo-pop | glass | gradient | floating-pill
        };
    });

    const applySettings = () => {
        document.documentElement.setAttribute('data-nav-mode', navSettings.mode);
        document.documentElement.setAttribute('data-nav-anim', navSettings.animation);
        document.documentElement.setAttribute('data-nav-highlight', navSettings.highlight);
        document.documentElement.setAttribute('data-nav-icon', navSettings.iconSize);
    };

    useEffect(() => {
        localStorage.setItem('app_navigation_settings', JSON.stringify(navSettings));
        applySettings();
    }, [navSettings]);

    // Apply on initial load too
    useEffect(() => {
        applySettings();
    }, []);

    const updateNavSetting = (key, value) => {
        setNavSettings(prev => ({ ...prev, [key]: value }));
    };

    return (
        <NavigationContext.Provider value={{ navSettings, updateNavSetting }}>
            {children}
        </NavigationContext.Provider>
    );
};
