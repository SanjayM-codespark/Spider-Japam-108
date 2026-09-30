import { useEffect, useState } from 'react'
import { apiFetch } from './api.js'
import { DEFAULT_SETTINGS, SettingsContext } from './useSettings.js'

function SettingsProvider({ children }) {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS)

    useEffect(() => {
        let mounted = true

        apiFetch('/settings')
            .then((response) => response.json())
            .then((data) => {
                if (mounted && data.success) {
                    setSettings({ ...data.settings, loaded: true })
                }
            })
            .catch(() => {
                if (mounted) setSettings({ ...DEFAULT_SETTINGS, loaded: true })
            })

        return () => {
            mounted = false
        }
    }, [])

    return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>
}

export default SettingsProvider