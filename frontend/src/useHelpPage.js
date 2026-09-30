import { useEffect, useState } from 'react'
import { apiFetch } from './api.js'

/**
 * Loads the help page that carries a given key, so a page can show the text an
 * admin wrote in the panel instead of text baked into the build.
 *
 * `html` stays null when there is no page with that key, or the server cannot be
 * reached, which tells the caller to render its own markup. That is deliberate:
 * /privacy and /terms keep the copy that shipped with them as the fallback, so
 * those routes never come up blank and the admin panel stays optional.
 */
export function useHelpPage(slug) {
    // The result is stored against the slug it was fetched for, rather than
    // cleared when the slug changes. That keeps the effect free of a
    // synchronous setState, and it means a result for a previous key is ignored
    // instead of being shown until the new fetch lands.
    const [page, setPage] = useState(null)

    useEffect(() => {
        if (!slug) {
            return undefined
        }

        let active = true

        apiFetch(`/helps/slug/${encodeURIComponent(slug)}`)
            .then((response) => (response.ok ? response.json() : null))
            .then((data) => {
                if (!active) return
                if (data && data.success && data.help) {
                    setPage({
                        slug,
                        html: data.help.content || '',
                        // The admin's title wins, so the heading matches the page.
                        title: data.help.title || null,
                    })
                }
            })
            .catch(() => {
                // Offline or the server is down: the caller's fallback stands.
            })

        return () => {
            active = false
        }
    }, [slug])

    const current = page && page.slug === slug ? page : null
    return { html: current ? current.html : null, title: current ? current.title : null }
}
