import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import {getSetting, setSetting} from '../database/database';
import {playAmbientTone, stopAmbientTone} from '../services/sound';

export interface Settings {
  hideNaam: boolean;
  playMusic: boolean;
  blockout: boolean;
  backgroundImage: string | null;
  themeColor: string | null;
}

export type SettingsKey = keyof Settings;

const DEFAULT_SETTINGS: Settings = {
  hideNaam: false,
  playMusic: false,
  blockout: false,
  backgroundImage: null,
  themeColor: null,
};

const SETTING_KEYS: Record<SettingsKey, string> = {
  hideNaam: 'hide_naam',
  playMusic: 'play_music',
  blockout: 'blockout',
  backgroundImage: 'background_image',
  themeColor: 'theme_color',
};

interface SettingsContextValue {
  settings: Settings;
  set: (key: SettingsKey, value: Settings[SettingsKey]) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  set: () => {},
});

export const SettingsProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const load = async () => {
      const read = async (
        key: SettingsKey,
      ): Promise<Settings[SettingsKey]> => {
        const value = await getSetting(SETTING_KEYS[key]);
        if (key === 'backgroundImage' || key === 'themeColor') {
          return value ? value : null;
        }
        return value === '1';
      };
      const values = await Promise.all([
          read('hideNaam'),
          read('playMusic'),
          read('blockout'),
          read('backgroundImage'),
          read('themeColor'),
        ]);
      setSettings({
        hideNaam: values[0] as boolean,
        playMusic: values[1] as boolean,
        blockout: values[2] as boolean,
        backgroundImage: values[3] as string | null,
        themeColor: values[4] as string | null,
      });
    };
    load();
  }, []);

  const set = useCallback(
    (key: SettingsKey, value: Settings[SettingsKey]) => {
      setSettings(prev => ({...prev, [key]: value}));
      const stringValue =
        typeof value === 'boolean' ? (value ? '1' : '0') : value ? String(value) : '';
      setSetting(SETTING_KEYS[key], stringValue);
    },
    [],
  );

  useEffect(() => {
    if (settings.playMusic) {
      playAmbientTone();
    } else {
      stopAmbientTone();
    }
  }, [settings.playMusic]);

  return (
    <SettingsContext.Provider value={{settings, set}}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);