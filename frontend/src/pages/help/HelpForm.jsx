import { useState } from 'react'
import { Button, FormField, Input, RichTextEditor } from '../../components/ui/index.js'
import { apiFetch } from '../../api.js'

function HelpForm({ initial = null, onSaved, submitLabel = 'Add help' }) {
    const [title, setTitle] = useState(initial?.title || '')
    const [content, setContent] = useState(initial?.content || '')
    const [slug, setSlug] = useState(initial?.slug || '')
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!title.trim()) {
            setError('Title is required.')
            return
        }
        if (!content.trim()) {
            setError('Content is required.')
            return
        }

        setError('')
        setSaving(true)
        try {
            const path = initial ? `/admin/helps/${initial.id}` : '/admin/helps'
            const method = initial ? 'PUT' : 'POST'
            const response = await apiFetch(path, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: title.trim(), content, slug: slug.trim() }),
            })
            const data = await response.json()
            if (!data.success) {
                setError(data.message || 'Failed to save help.')
                return
            }
            onSaved?.(data)
        } catch {
            setError('Could not reach the backend. Make sure it is running.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} noValidate>
            <FormField label="Title" required id="help-title">
                <Input
                    id="help-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. How to start chanting"
                />
            </FormField>

            <div className="demo__gap" />
            <FormField
                label="Key"
                id="help-slug"
                hint="Optional. The web address this page answers on: /privacy and /terms read the page with the matching key. Lowercase letters, numbers and single dashes."
            >
                <Input
                    id="help-slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="e.g. privacy"
                />
            </FormField>

            <div className="demo__gap" />
            <FormField label="Content" required id="help-content">
                <RichTextEditor value={content} onChange={setContent} />
            </FormField>

            {error && (
                <p className="demo__subtitle" role="alert">
                    {error}
                </p>
            )}

            <div className="demo__gap" />
            <Button type="submit" loading={saving}>
                {submitLabel}
            </Button>
        </form>
    )
}

export default HelpForm