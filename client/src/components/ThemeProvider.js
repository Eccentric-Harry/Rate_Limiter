import React, { useEffect } from 'react';
import { useThemeStore } from '../store/themeStore';

const ThemeProvider = ({ children }) => {
  const { darkMode } = useThemeStore();

  // Apply the theme to the document whenever the darkMode value changes
  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [darkMode]);

  return children;
};

export default ThemeProvider;
