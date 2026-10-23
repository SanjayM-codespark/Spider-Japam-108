import { useEffect, useState } from 'react'
import { apiFetch } from '../../api.js'

/**
 * Loads active subcategories for a given category id. A second-level picker
 * needs them in the context of a single category, so this mirrors
 * `useCategories` but filters by `categoryId`.
 *
 * Absent categoryId -> no fetch. Inactive subcategories are included so editing
 * existing content does not drop options.
 */
function useSubcategories(categoryId, enabled = true) {
    const [subcategories, setSubcategories] = useState([])
    const [fetching, setFetching] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!enabled || !categoryId) {
            return undefined
        }

        let active = true

        apiFetch(`/admin/subcategories?category_id=${encodeURIComponent(categoryId)}`)
            .then((response) => response.json())
            .then((data) => {
                if (!active) return
                if (data.success) {
                    setSubcategories(data.subcategories)
                } else {
                    setError(data.message || 'Failed to load subcategories.')
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
    }, [categoryId, enabled])

    const options = subcategories.map((subcategory) => ({
        value: String(subcategory.id),
        label:
            subcategory.status === 'active'
                ? subcategory.name
                : `${subcategory.name} (inactive)`,
    }))

    return {
        subcategories,
        options,
        loading: enabled && Boolean(categoryId) && fetching,
        error,
    }
}

export default useSubcategories
