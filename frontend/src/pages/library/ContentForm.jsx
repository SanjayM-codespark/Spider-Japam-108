import { useState, useEffect, useRef } from 'react'
import { Button, FormField, Input, Select, Textarea, Checkbox } from '../../components/ui/index.js'
import { apiFetch } from '../../api.js'
import useCategories from '../categories/useCategories.js'
import useSubcategories from '../subcategories/useSubcategories.js'
import { CONTENT_STATUSES, DEFAULT_CONTENT_STATUS, BEAD_COUNTS, DEFAULT_BEAD_COUNT } from './constants.js'

/**
 * Create or edit one Sacred Library entry.
 *
 * `variant` decides which fields the page shows, and only those fields are sent
 * to the server:
 *   'add'     the full entry - the Add Content page
 *   'meaning' meaning only     - the submenu page for an item, where the title
 *                               and content are shown by the card header and
 *                               must not be editable
 *   'edit'    the full entry    - the edit modal on Manage Content
 *
 * Sending only the visible fields is what keeps a meaning save from wiping the
 * title or content: the backend only overwrites the keys present in the body.
 *
 * Fields initialise from `initial` once. Callers that swap the item being
 * edited remount this with a matching `key` so the fields follow the new item
 * without a state sync effect.
 */
function ContentForm({
    initial = null,
    onSaved,
    onCancel,
    submitLabel = 'Save',
    variant = 'add',
}) {
    const showFull = variant === 'add' || variant === 'edit'

    const [title, setTitle] = useState(initial?.title || '')
    const [categoryId, setCategoryId] = useState(
        initial?.category_id != null ? String(initial.category_id) : '',
    )
    const [deity, setDeity] = useState(initial?.deity || '')
    const [shortDescription, setShortDescription] = useState(initial?.short_description || '')
    const [content, setContent] = useState(initial?.content || '')
    const [meaning, setMeaning] = useState(initial?.meaning || '')
    const [source, setSource] = useState(initial?.source || '')
    const [status, setStatus] = useState(initial?.status || DEFAULT_CONTENT_STATUS)
    // Content saved before bead counts existed has no value, so it falls back to
    // 108 rather than leaving the dropdown blank.
    const [beadCount, setBeadCount] = useState(
        initial?.bead_count != null ? String(initial.bead_count) : DEFAULT_BEAD_COUNT,
    )
    const [isDefault, setIsDefault] = useState(initial?.is_default === true)

    const [selectedCategory] = useState(initial?.category_name || '')

    // Optional, so an existing item usually has none. Held as a string to match
    // the Select, and initialised from the row so an edit keeps it.
    const [subcategoryId, setSubcategoryId] = useState(
        initial?.subcategory_id != null ? String(initial.subcategory_id) : '',
    )

    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)

    // Only the full form needs the category list, so the meaning-only submenu
    // page does not fetch it.
    const { options: categoryOptions, loading: categoriesLoading, error: categoriesError } =
        useCategories(showFull)

    // The subcategory picker lists the subcategories of the chosen category, so
    // it is keyed to categoryId and stays empty until a category is picked.
    const {
        options: subcategoryOptions,
        loading: subcategoriesLoading,
        error: subcategoriesError,
    } = useSubcategories(showFull ? categoryId : '', showFull)

    // Update selected category name when categoryId changes


    // A subcategory belongs to exactly one category, so switching category
    // invalidates the current choice. Cleared rather than remapped, because the
    // matching subcategory may not exist under the new category. Guarded by a
    // ref so the initial render (where the id came from the row being edited)
    // does not immediately wipe the saved subcategory.
    const previousCategoryId = useRef(categoryId)
    useEffect(() => {
        if (previousCategoryId.current !== categoryId) {
            setSubcategoryId('')
            previousCategoryId.current = categoryId
        }
    }, [categoryId])

    // Only published content can be default. Uncheck if status changes away from published.


    const handleSubmit = async (e) => {
        e.preventDefault()

        if (showFull && !title.trim()) {
            setError('Title is required.')
            return
        }

        if (showFull && !categoryId) {
            setError('Category is required.')
            return
        }

        if (showFull && !content.trim()) {
            setError('Content is required.')
            return
        }

        setError('')
        setSaving(true)

        try {
            const path = initial
                ? `/admin/library-contents/${initial.id}`
                : '/admin/library-contents'
            const method = initial ? 'PUT' : 'POST'

            const payload = {}

            if (showFull) {
                payload.title = title.trim()
                payload.category_id = categoryId
                if (!subcategoryId) {
                    setError('Subcategory is required.')
                    setSaving(false)
                    return
                }
                payload.subcategory_id = Number(subcategoryId)
                payload.deity = deity.trim()
                payload.short_description = shortDescription.trim()
                payload.content = content.trim()
                payload.meaning = meaning.trim()
                payload.source = source.trim()
                payload.status = status
                payload.bead_count = beadCount
                payload.is_default = isDefault
            } else {
                payload.meaning = meaning.trim()
            }

            const response = await apiFetch(path, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const data = await response.json()
            if (!data.success) {
                setError(data.message || 'Failed to save content.')
                setSaving(false)
                return
            }
            // Released before handing over, so a caller that stays on the page
            // rather than navigating or closing a modal still gets a usable
            // button for a second save.
            setSaving(false)
            onSaved?.(data)
        } catch {
            setError('Could not reach the backend. Make sure it is running.')
            setSaving(false)
        }
    }

    if (!showFull) {
        return (
            <form className="ui-form" onSubmit={handleSubmit} noValidate>
                <FormField label="Meaning" id="content-meaning">
                    <Textarea
                        id="content-meaning"
                        value={meaning}
                        onChange={(e) => setMeaning(e.target.value)}
                        placeholder="Add the meaning of this content..."
                        rows={10}
                    />
                </FormField>

                <div className="demo__gap" />
                {error && (
                    <p className="demo__subtitle" role="alert" style={{ color: '#ef4444' }}>
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

    return (
        <form className="ui-form ui-form--wide" onSubmit={handleSubmit} noValidate>
            <div className="ui-form__grid">
                <FormField
                    label="Category"
                    required
                    id="content-category"
                    error={categoriesError}
                    hint={categoriesLoading ? 'Loading categories...' : undefined}
                >
                    <Select
                        id="content-category"
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        options={categoryOptions}
                        placeholder="Select Category"
                        disabled={categoriesLoading}
                    />
                </FormField>

                <FormField
                    label="Subcategory"
                    required
                    id="content-subcategory"
                    error={subcategoriesError}
                    hint={
                        !categoryId
                            ? 'Choose a category first'
                            : subcategoriesLoading
                              ? 'Loading subcategories...'
                              : undefined
                    }
                >
                    <Select
                        id="content-subcategory"
                        value={subcategoryId}
                        onChange={(e) => setSubcategoryId(e.target.value)}
                        options={subcategoryOptions}
                        placeholder="Select Subcategory"
                        disabled={!categoryId || subcategoriesLoading}
                    />
                </FormField>

                <FormField label="Title" required id="content-title">
                    <Input
                        id="content-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Navkar Mantra"
                    />
                </FormField>

                <FormField label="Deity" id="content-deity">
                    <Input
                        id="content-deity"
                        value={deity}
                        onChange={(e) => setDeity(e.target.value)}
                        placeholder="e.g. Adinath"
                    />
                </FormField>

                <FormField label="Short Description" id="content-short-description">
                    <Input
                        id="content-short-description"
                        value={shortDescription}
                        onChange={(e) => setShortDescription(e.target.value)}
                        placeholder="One line shown in listings"
                    />
                </FormField>

                <FormField label="Content" required id="content-body" className="ui-field--wide">
                    <Textarea
                        id="content-body"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="The main text of this content..."
                        rows={8}
                    />
                </FormField>

                <FormField label="Meaning / Lesson" id="content-meaning" className="ui-field--wide">
                    <Textarea
                        id="content-meaning"
                        value={meaning}
                        onChange={(e) => setMeaning(e.target.value)}
                        placeholder="What this content teaches..."
                        rows={6}
                    />
                </FormField>

                <FormField label="Source" id="content-source">
                    <Input
                        id="content-source"
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        placeholder="e.g. Bhagavan Jinavijaya, 1926"
                    />
                </FormField>

                <FormField
                    label="Status"
                    id="content-status">
                    <Select
                        id="content-status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        options={CONTENT_STATUSES}
                    />
                </FormField>

                <FormField
                    label="Bead Count"
                    required
                    id="content-bead-count"
                    hint="Beads in one round of japa. The app sizes the counter from this."
                >
                    <Select
                        id="content-bead-count"
                        value={beadCount}
                        onChange={(e) => setBeadCount(e.target.value)}
                        options={BEAD_COUNTS}
                    />
                </FormField>

                {status === 'published' && selectedCategory === 'Mantras' && (
                    <FormField
                        label="Set as Default Content"
                        id="content-is-default"
                        hint="Only one content can be default. This will be shown on the mobile app home screen."
                    >
                        <Checkbox
                            id="content-is-default"
                            checked={isDefault}
                            onChange={(e) => setIsDefault(e.target.checked)}
                        />
                    </FormField>
                )}
            </div>

            <div className="demo__gap" />
            {error && (
                <p className="demo__subtitle" role="alert" style={{ color: '#ef4444' }}>
                    {error}
                </p>
            )}

            <div className="demo__gap" />
            <div className="demo__actions" style={{ justifyContent: 'flex-end' }}>
                {onCancel && (
                    <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
                        Cancel
                    </Button>
                )}
                <Button type="submit" loading={saving}>
                    {submitLabel}
                </Button>
            </div>
        </form>
    )
}

export default ContentForm
