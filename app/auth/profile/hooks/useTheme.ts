import { useState, useEffect } from 'react';
import { Theme, useThemeValue } from '@gravity-ui/uikit';
import { Profile } from '../types';

export const useThemeManagement = (profile: Profile | null) => {
    const currentTheme = useThemeValue();
    const [selectedTheme, setSelectedTheme] = useState<Theme>(currentTheme);

    useEffect(() => {
        if (profile && profile.theme) {
            // Ensure we're using a valid Theme value
            const profileTheme = profile.theme as Theme;
            if (['light', 'dark', 'system'].includes(profileTheme)) {
                setSelectedTheme(profileTheme);
            }
        }
    }, [profile]);

    const dispatchThemeEvents = (theme: Theme) => {
        // Ensure we have a valid theme value
        const safeTheme: Theme = ['light', 'dark', 'system'].includes(theme) ? theme : 'system';
        
        // Save theme to localStorage
        localStorage.setItem('app-theme', safeTheme);

        // Dispatch a storage event to notify other components
        const storageEvent = new StorageEvent('storage', {
            key: 'app-theme',
            newValue: safeTheme,
            oldValue: localStorage.getItem('app-theme'),
            storageArea: localStorage,
            url: window.location.href
        });
        
        window.dispatchEvent(storageEvent);
        
        // Also dispatch a custom event as a fallback
        window.dispatchEvent(new CustomEvent('theme-change', {
            detail: { theme: safeTheme }
        }));
    };

    const handleThemeChange = (theme: Theme) => {
        setSelectedTheme(theme);
        dispatchThemeEvents(theme);
    };

    return { selectedTheme, handleThemeChange, dispatchThemeEvents };
};