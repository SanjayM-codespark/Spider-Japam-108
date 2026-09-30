import { useEffect } from 'react'
import { useSettings } from './useSettings.js'

export function usePageTitle(title) {
    const { app_name: baseTitle } = useSettings()

    useEffect(() => {
        document.title = title ? `${title} | ${baseTitle}` : baseTitle
    }, [title, baseTitle])
}