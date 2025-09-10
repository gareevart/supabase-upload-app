import { useState, useEffect } from 'react';
import { Icon, SegmentedRadioGroup } from '@gravity-ui/uikit';
import { Sun, Moon, Palette } from '@gravity-ui/icons';
import { useAuth } from '@/app/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type ThemeOption = 'light' | 'dark' | 'system';

export const ThemeToggle = () => {
  const { user } = useAuth();
  const [currentTheme, setCurrentTheme] = useState<ThemeOption>('system');

  // Initialize theme from localStorage or profile
  useEffect(() => {
    const initializeTheme = async () => {
      // First try to get from localStorage
      const savedTheme = localStorage.getItem('app-theme') as ThemeOption;
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setCurrentTheme(savedTheme);
        return;
      }

      // If no localStorage theme and user is logged in, get from profile
      if (user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('theme')
            .eq('id', user.id)
            .single();

          if (profile?.theme && ['light', 'dark', 'system'].includes(profile.theme)) {
            setCurrentTheme(profile.theme as ThemeOption);
            localStorage.setItem('app-theme', profile.theme);
          }
        } catch (error) {
          console.error('Error fetching theme from profile:', error);
        }
      }
    };

    initializeTheme();
  }, [user]);

  const dispatchThemeEvents = (theme: ThemeOption) => {
    // Save theme to localStorage
    localStorage.setItem('app-theme', theme);

    // Dispatch a storage event to notify other components
    const storageEvent = new StorageEvent('storage', {
      key: 'app-theme',
      newValue: theme,
      oldValue: localStorage.getItem('app-theme'),
      storageArea: localStorage,
      url: window.location.href
    });
    
    window.dispatchEvent(storageEvent);
    
    // Also dispatch a custom event as a fallback
    window.dispatchEvent(new CustomEvent('theme-change', {
      detail: { theme }
    }));
  };

  const handleThemeChange = async (theme: string) => {
    if (theme === 'light' || theme === 'dark' || theme === 'system') {
      setCurrentTheme(theme);
      dispatchThemeEvents(theme);

      // Save to profile if user is logged in
      if (user) {
        try {
          await supabase
            .from('profiles')
            .update({ theme })
            .eq('id', user.id);
        } catch (error) {
          console.error('Error saving theme to profile:', error);
        }
      }
    }
  };

  return (
    <SegmentedRadioGroup
      name="theme-toggle"
      value={currentTheme}
      onUpdate={handleThemeChange}
      size="l"
      width="auto"
    >
      <SegmentedRadioGroup.Option value="light">
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Icon data={Sun} size={16} />
          Light
        </div>
      </SegmentedRadioGroup.Option>
      
      <SegmentedRadioGroup.Option value="dark">
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Icon data={Moon} size={16} />
          Dark
        </div>
      </SegmentedRadioGroup.Option>
      
      <SegmentedRadioGroup.Option value="system">
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Icon data={Palette} size={16} />
          System
        </div>
      </SegmentedRadioGroup.Option>
    </SegmentedRadioGroup>
  );
};
