import { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  useEffect(() => {
    // Mode sombre forcé — supprime l'ancienne préférence stockée
    localStorage.removeItem('theme');
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: 'dark', toggleTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
