import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Badge, Button, Card, Spinner } from '../../components/ui/index.js'
import { apiFetch } from '../../api.js'
import ContentForm from './ContentForm.jsx'

/**
 * Loads one entry and edits its meaning. Remounted with a key per id, so
 * moving between entries never shows the previous entry's text.
 */
function ContentMeaningEditor({ id }) {
    const navigate = useNavigate()
    const [item, setItem] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [savedId, setSavedId] = useState(null)

    useEffect(() => {
        let active = true

        apiFetch(`/admin/library-contents/${id}`)
            .then((response) => response.json())
            .then((data) => {
                if (!active) return
                if (data.success) {
                    setItem(data.content)
                } else {
                    setItem(null)
                    setError(data.message || 'Failed to load this content item.')
                }
            })
            .catch(() => {
                if (!active) return
                setItem(null)
                setError('Could not reach the backend. Make sure it is running.')
            })
            .finally(() => {
                if (active) setLoading(false)
            })

        return () => {
            active = false
        }
    }, [id])

    if (loading) {
        return (
            <Card title="Sacred Library">
                <div className="demo__flex">
                    <Spinner size="sm" /> Loading content...
                </div>
            </Card>
        )
    }

    if (error || !item) {
        return (
            <Card title="Sacred Library">
                <p role="alert" style={{ color: '#ef4444' }}>
                    {error}
                </p>
                <div className="demo__gap" />
                <Button variant="secondary" onClick={() => navigate('/admin/manage-content')}>
                    Back to Manage Content
                </Button>
            </Card>
        )
    }

    const hasMeaning = Boolean(item.meaning && item.meaning.trim())

    return (
        <Card
            title={item.title}
            subtitle={hasMeaning
                ? 'Edit the meaning of this entry'
                : 'No meaning yet. Add the meaning of this entry.'}
        >
            {savedId === item.id && (
                <p style={{ marginBottom: '16px' }}>
                    <Badge variant="success">Meaning saved</Badge>
                </p>
            )}

            <ContentForm
                initial={item}
                variant="meaning"
                submitLabel="Save Meaning"
                onSaved={() => setSavedId(item.id)}
            />
        </Card>
    )
}

/**
 * The meaning editor for a single entry, reached from the Meaning action in
 * Manage Content.
 *
 * The item id arrives as a query string (?id=3) so one route serves every entry
 * instead of needing a route per item.
 */
function ContentMeaning() {
    const [searchParams] = useSearchParams()
    const id = searchParams.get('id')

    if (!id) {
        return (
            <Card title="Sacred Library">
                <p role="alert" style={{ color: '#ef4444' }}>
                    No content item was selected.
                </p>
            </Card>
        )
    }

    return <ContentMeaningEditor key={id} id={id} />
}

export default ContentMeaning
