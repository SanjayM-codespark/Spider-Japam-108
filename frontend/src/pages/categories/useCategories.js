import { useEffect, useState } from 'react'
import { apiFetch } from '../../api.js'

/**
 * Loads the categories for a picker, shared by the Add Content page and the
 * edit modal so both list the same options.
 *
 * Pass enabled=false to skip the request entirely, for callers that have no
 * category field.
 *
 * Inactive categories are included rather than filtered out. A category can be
 * switched to inactive after content already points at it, and hiding it would
 * leave that content's picker blank, so a save would fail on a field the admin
 * cannot see. The label marks them instead.
 */
function useCategories(enabled = true) {
    const [categories, setCategories] = useState([])
    const [fetching, setFetching] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!enabled) return undefined

        let active = true

        apiFetch('/admin/categories')
            .then((response) => response.json())
            .then((data) => {
                if (!active) return
                if (data.success) {
                    setCategories(data.categories)
                } else {
                    setError(data.message || 'Failed to load categories.')
                }
            })
            .catch(() => {
                if (active) setError('Could not reach the backend. Make sure it is running.')
            })
            .finally(() => {
                if (active) setFetching(false)
            })

        return () => {
            active = false
        }
    }, [enabled])

    const options = categories.map((category) => ({
        value: String(category.id),
        label:
            category.status === 'active' ? category.name : `${category.name} (inactive)`,
    }))

    return {
        categories,
        options,
        // Derived rather than set in the effect, so a disabled hook reports
        // itself as not loading without a state update during render.
        loading: enabled && fetching,
        error,
    }
}

export default useCategories
