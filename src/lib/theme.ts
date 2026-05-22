import { useEffect, useState } from 'react';

export const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // Check localStorage on init
    const savedTheme = localStorage.getItem('jt-orga-theme') as 'light' | 'dark' | null;
    if (savedTheme) return savedTheme;
    // Default to dark for this app
    return 'dark';
  });

  useEffect(() => {
    // Apply light class if theme is light, otherwise remove it (default is dark)
    document.documentElement.classList.toggle('light', theme === 'light');
    // Save to localStorage
    localStorage.setItem('jt-orga-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return { theme, toggleTheme };
};