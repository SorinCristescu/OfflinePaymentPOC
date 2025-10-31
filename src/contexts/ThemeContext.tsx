/**
 * Theme Context - Provides theme switching functionality
 */

import React, {createContext, useContext, useState, useEffect, ReactNode} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {lightColors, darkColors, Colors} from '../theme/colors';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: Colors;
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@smvc_theme_mode';

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({children}) => {
  const [mode, setMode] = useState<ThemeMode>('dark'); // Default to dark

  // Load theme preference on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setMode(savedTheme);
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    }
  };

  const saveThemePreference = async (newMode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const setTheme = (newMode: ThemeMode) => {
    setMode(newMode);
    saveThemePreference(newMode);
  };

  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setTheme(newMode);
  };

  const theme = mode === 'dark' ? darkColors : lightColors;

  const value: ThemeContextType = {
    theme,
    mode,
    toggleTheme,
    setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
