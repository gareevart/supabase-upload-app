import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Button,
    DropdownMenu,
    Icon,
    Theme,
    Toaster,
    ToasterComponent,
    ToasterProvider,
    useThemeValue,
} from '@gravity-ui/uikit';
import { House, Moon, Palette, Person, Sun } from '@gravity-ui/icons';
import { supabase } from "@/lib/supabase";

const SYSTEM = 'system';
const DARK = 'dark';
const LIGHT = 'light';
const DEFAULT_THEME = SYSTEM;
const THEME_KEY = 'app-theme';

export const DEFAULT_BODY_CLASSNAME = `g-root g-root_theme_${DEFAULT_THEME}`;

export type AppProps = {
    children: React.ReactNode;
};

export const Wrapper: React.FC<AppProps> = ({ children }) => {
    const theme = useThemeValue();
    const navigate = useNavigate();
    const toaster = React.useMemo(() => new Toaster(), []);


    const saveTheme = async (newTheme: Theme) => {
        // Сохраняем в localStorage
        localStorage.setItem(THEME_KEY, newTheme);

        // Сохраняем в профиль, если пользователь авторизован
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('profiles').update({ theme: newTheme }).eq('id', user.id);
        }
        
        // Dispatch a storage event to notify other components
        window.dispatchEvent(new StorageEvent('storage', {
            key: THEME_KEY,
            newValue: newTheme
        }));
    };

    const getThemeIcon = () => {
        switch (theme) {
            case DARK:
                return Moon;
            case LIGHT:
                return Sun;
            case SYSTEM:
                return Palette;
            default:
                return Moon;
        }
    };

    const themeMenuItems = [
        {
            id: SYSTEM,
            text: 'System',
            iconStart: <Icon size={16} data={Palette} />,
            action: () => saveTheme(SYSTEM),
        },
        {
            id: LIGHT,
            text: 'Light',
            iconStart: <Icon size={16} data={Sun} />,
            action: () => saveTheme(LIGHT),
        },
        {
            id: DARK,
            text: 'Dark',
            iconStart: <Icon size={16} data={Moon} />,
            action: () => saveTheme(DARK),
        },
    ];

    return (
        <ToasterProvider toaster={toaster}>
            <div className="wrapper">
                <div className="theme-button">
                        <Button
                            size="l"
                            view="outlined"
                            onClick={() => {
                                // Простой переход на главную без дополнительной логики
                                navigate('/');
                            }}
                        >
                            <Icon data={House} />
                        </Button>
                        <Button
                            size="l"
                            view="outlined"
                            onClick={() => {
                                navigate('/profile');
                            }}
                        >
                            <Icon data={Person} />
                        </Button>
                        <DropdownMenu
                            items={themeMenuItems}
                            renderSwitcher={(props) => (
                                <Button
                                    size="l"
                                    view="outlined"
                                    aria-label="Выбрать тему оформления"
                                    {...props}
                                >
                                    <Icon data={getThemeIcon()} />
                                </Button>
                            )}
                        />
                </div>
                <div className="layout">
                    <div className="header">
                        {/* Header content */}
                    </div>
                    <div className="content">{children}</div>
                </div>
            </div>
            <ToasterComponent className="optional additional classes" />
        </ToasterProvider>
    );
};