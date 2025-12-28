import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'dark-cards';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Get theme from localStorage or default to light
    const savedTheme = localStorage.getItem('app-theme');
    return (savedTheme as Theme) || 'light';
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('app-theme', newTheme);
    
    // Apply theme to body
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add(`theme-${newTheme}`);
    
    // Also toggle the global 'dark' class on the root element so Tailwind/other dark utilities work
    const root = document.documentElement;
    const shouldBeDark = newTheme === 'dark' || newTheme === 'dark-cards';
    root.classList.toggle('dark', shouldBeDark);
  };

  const isDark = theme === 'dark' || theme === 'dark-cards';

  useEffect(() => {
    // Apply initial theme
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add(`theme-${theme}`);
    // Ensure global dark class matches theme so dark: utilities apply across the app
    const root = document.documentElement;
    const shouldBeDark = theme === 'dark' || theme === 'dark-cards';
    root.classList.toggle('dark', shouldBeDark);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 