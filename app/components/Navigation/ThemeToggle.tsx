import { useState, useEffect } from 'react';
import { Icon, DropdownMenu } from '@gravity-ui/uikit';
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

  const handleThemeChange = async (theme: ThemeOption) => {
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
  };

  const getThemeIcon = (theme: ThemeOption) => {
    switch (theme) {
      case 'light':
        return Sun;
      case 'dark':
        return Moon;
      case 'system':
      default:
        return Palette;
    }
  };

  const getThemeLabel = (theme: ThemeOption) => {
    switch (theme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
      default:
        return 'System';
    }
  };

  return (
    <DropdownMenu
      renderSwitcher={(props) => (
        <div
          {...props}
          className="nav-item theme-toggle"
          style={{ cursor: 'pointer' }}
          title="Change theme"
        >
          <Icon data={getThemeIcon(currentTheme)} size={20} />
        </div>
      )}
      items={[
        {
          iconStart: <Icon size={16} data={Sun} />,
          action: () => handleThemeChange('light'),
          text: 'Light',
          selected: currentTheme === 'light',
        },
        {
          iconStart: <Icon size={16} data={Moon} />,
          action: () => handleThemeChange('dark'),
          text: 'Dark',
          selected: currentTheme === 'dark',
        },
        {
          iconStart: <Icon size={16} data={Palette} />,
          action: () => handleThemeChange('system'),
          text: 'System',
          selected: currentTheme === 'system',
        },
      ]}
    />
  );
};
