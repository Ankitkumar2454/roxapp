import React, { createContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { getThemeColors, getThemeShadows } from '@/src/styles/commonStyles';

export const ThemeContext = createContext({
  theme: 'light',
  isDark: false,
  colors: getThemeColors(false),
  shadows: getThemeShadows(false),
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const colorScheme = useColorScheme();
  const [theme, setTheme] = useState<'light' | 'dark'>(colorScheme || 'light');
  const isDark = theme === 'dark';
  const colors = getThemeColors(isDark);
  const shadows = getThemeShadows(isDark);

  useEffect(() => {
    if (colorScheme) setTheme(colorScheme);
  }, [colorScheme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, colors, shadows, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
