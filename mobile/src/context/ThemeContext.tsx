import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {getSetting, setSetting} from '../database/database';
import {lightColors, darkColors, ThemeColors} from '../theme/colors';

const DARK_MODE_KEY = 'dark_mode';

interface ThemeContextValue {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (dark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  colors: lightColors,
  toggleTheme: () => {},
  setTheme: () => {},
});

export const ThemeProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [isDark, setIsDark] = useState(false);
  const [colors, setColors] = useState<ThemeColors>(lightColors);
  const [_loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const value = await getSetting(DARK_MODE_KEY);
      const dark = value === '1';
      setIsDark(dark);
      setColors(dark ? darkColors : lightColors);
      setLoaded(true);
    };
    load();
  }, []);

  const setTheme = useCallback(
    async (dark: boolean) => {
      setIsDark(dark);
      setColors(dark ? darkColors : lightColors);
      await setSetting(DARK_MODE_KEY, dark ? '1' : '0');
    },
    [],
  );

  const toggleTheme = useCallback(() => {
    setTheme(!isDark);
  }, [isDark, setTheme]);

  return (
    <ThemeContext.Provider value={{isDark, colors, toggleTheme, setTheme}}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
