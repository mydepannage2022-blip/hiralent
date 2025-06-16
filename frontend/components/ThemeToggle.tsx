'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon , Sun} from 'lucide-react';


const ThemeToggle = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  
    // Use resolvedTheme as fallback if theme is undefined
    const currentTheme = theme || resolvedTheme;
    
    console.log('Current theme in render:', currentTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Force a small delay to ensure theme is loaded
    const timer = setTimeout(() => {
      console.log('Theme after mount:', theme);
      console.log('Resolved theme after mount:', resolvedTheme);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [theme, resolvedTheme]);

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="p-3 border border-gray-300 rounded-lg bg-gray-100 animate-pulse">
        <span className="text-gray-500">🌓 Loading...</span>
      </div>
    );
  }

  const toggleTheme = () => {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    console.log('Switching to:', newTheme);
    setTheme(newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="outline-none p-2 border border-gray-300 rounded-xl transition-colors duration-200 flex items-center justify-center"
    >
      {currentTheme === 'dark' ? <Moon /> : <Sun />}
    </button>
  );
};

export default ThemeToggle;