import { createContext, useContext } from 'react'

export const DEFAULT_SETTINGS = {
    app_name: 'Japam108',
    playstore_link: 'https://play.google.com/store/apps/details?id=com.spidernaamjap',
    app_store_link: 'https://apps.apple.com/app/id0000000000',
    admob: {
        android: '',
        ios: '',
    },
    loaded: false,
}

export const SettingsContext = createContext(DEFAULT_SETTINGS)

export function useSettings() {
    return useContext(SettingsContext)
}