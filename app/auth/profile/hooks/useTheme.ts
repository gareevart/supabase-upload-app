import { useState, useEffect } from 'react';
import { Theme, useThemeValue } from '@gravity-ui/uikit';
import { Profile } from '../types';

export const useThemeManagement = (profile: Profile | null) => {
    const [selectedTheme, setSelectedTheme] = useState<Theme>('system');

    useEffect(() => {
        // Initialize with profile theme if available
        if (profile?.theme && ['light', 'dark', 'system'].includes(profile.theme)) {
            setSelectedTheme(profile.theme as Theme);
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