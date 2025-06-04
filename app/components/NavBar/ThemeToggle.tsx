"use client";

import { Switch } from '@gravity-ui/uikit';
import styles from './Navigation.module.css';

interface ThemeToggleProps {
  isDarkTheme: boolean;
  toggleTheme: (newTheme: boolean) => void;
}

export default function ThemeToggle({ isDarkTheme, toggleTheme }: ThemeToggleProps) {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-yellow-500">☀️</span>
      <Switch 
        checked={isDarkTheme} 
        onChange={(e) => toggleTheme(e.target.checked)} 
      />
      <span className="text-blue-500">🌙</span>
    </div>
  );
}