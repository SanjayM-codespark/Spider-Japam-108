import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, FormField, Input, Select, Textarea } from '../../components/ui/index.js'
import { apiFetch, assetUrl } from '../../api.js'
import { ACCEPTED_IMAGE_TYPES, CATEGORY_STATUSES, MAX_IMAGE_BYTES } from './constants.js'

/**
 * Create or edit one category, including its image.
 *
 * Without `initial` this is the Add Category page; with it, the edit modal on
 * Manage Category.
 *
 * The text fields always go out together, so clearing an optional one actually
 * clears it server side. The image is handled separately because it is a
 * multipart upload, and a brand new category has no id to upload against until
 * it has been created. So the file is held here and sent in a second request
 * once the row exists, which keeps this to one visible Save.
 *
 * `icon` and the image are complementary: the app shows the image when there is
 * one and falls back to the emoji.
 *
 * Fields initialise from `initial` once. Callers that swap the row being edited
 * remount this with a matching `key` so the fields follow the new row without a
 * state sync effect.
 */
function CategoryForm({ initial = null, onSaved, onCancel, submitLabel = 'Save' }) {
    const [name, setName] = useState(initial?.name || '')
    const [description, setDescription] = useState(initial?.description || '')
    const [icon, setIcon] = useState(initial?.icon || '')
    const [status, setStatus] = useState(initial?.status || 'active')

    const [imageUrl, setImageUrl] = useState(initial?.image_url || '')
    const [pickedFile, setPickedFile] = useState(null)
    const [imageRemoved, setImageRemoved] = useState(false)
    const [imageError, setImageError] = useState('')

    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const fileInputRef = useRef(null)

    // Built once per picked file rather than on every render, and released when
    // it changes or the form unmounts, so a long edit session does not leak
    // object URLs. The effect only revokes; it never sets state, which is a
    // pattern this repo's lint flags.
    const localPreview = useMemo(
        () => (pickedFile ? URL.createObjectURL(pickedFile) : ''),
        [pickedFile],
    )

    useEffect(
        () => () => {
            if (localPreview) URL.revokeObjectURL(localPreview)
        },
        [localPreview],
    )

    const handleFileChange = (event) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
            setImageError('Only PNG, JPEG, WEBP or GIF images are allowed.')
            return
        }

        if (file.size > MAX_IMAGE_BYTES) {
            setImageError('Image must be 2 MB or smaller.')
            return
        }

        setImageError('')
        setImageRemoved(false)
        setPickedFile(file)
    }

    const handleRemoveImage = () => {
        setPickedFile(null)
        setImageUrl('')
        setImageRemoved(true)
        // Cleared so picking the very same file again still fires a change.
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    /**
     * Runs after the row exists, so this covers both a freshly created category
     * and an edited one. A failure here is reported but does not undo the save,
     * which already went through.
     */
    const syncImage = async (id) => {
        if (!pickedFile && !imageRemoved) return

        if (pickedFile) {
            const form = new FormData()
            form.append('image', pickedFile)

            const response = await apiFetch(`/admin/categories/${id}/image`, {
                method: 'POST',
                body: form,
            })
            const data = await response.json()
            if (!data.success) throw new Error(data.message || 'Failed to upload the image.')
            return
        }

        const response = await apiFetch(`/admin/categories/${id}/image`, {
            method: 'DELETE',
        })
        const data = await response.json()
        if (!data.success) throw new Error(data.message || 'Failed to remove the image.')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!name.trim()) {
            setError('Name is required.')
            return
        }

        setError('')
        setSaving(true)

        try {
            const path = initial
                ? `/admin/categories/${initial.id}`
                : '/admin/categories'
            const method = initial ? 'PUT' : 'POST'

            const response = await apiFetch(path, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim(),
                    icon: icon.trim(),
                    status,
                }),
            })
            const data = await response.json()
            if (!data.success) {
                setError(data.message || 'Failed to save category.')
                setSaving(false)
                return
            }

            // A create response carries the new id; an edit already knows it.
            const id = initial ? initial.id : data.id

            try {
                await syncImage(id)
            } catch (uploadError) {
                setImageError(uploadError.message)
            }

            setSaving(false)
            onSaved?.({ ...data, id })
        } catch {
            setError('Could not reach the backend. Make sure it is running.')
            setSaving(false)
        }
    }

    // The new pick is previewed from the file itself; otherwise show what is
    // already stored, or nothing.
    const previewSrc = localPreview || (!imageRemoved && imageUrl ? assetUrl(imageUrl) : '')
    const hasImage = Boolean(localPreview || (!imageRemoved && imageUrl))

    return (
        <form className="ui-form ui-form--wide" onSubmit={handleSubmit} noValidate>
            <div className="ui-form__grid">
                <FormField label="Category Name" required id="category-name">
                    <Input
                        id="category-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Bhakti"
                        autoFocus
                    />
                </FormField>

                <FormField label="Status" required id="category-status">
                    <Select
                        id="category-status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        options={CATEGORY_STATUSES}
                    />
                </FormField>

                <FormField label="Description" id="category-description">
                    <Textarea
                        id="category-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="A short line about what belongs in this category"
                        rows={3}
                    />
                </FormField>

                <FormField
                    label="Icon"
                    id="category-icon"
                    hint="An emoji, shown when the category has no image"
                >
                    <Input
                        id="category-icon"
                        value={icon}
                        onChange={(e) => setIcon(e.target.value)}
                        placeholder="e.g. 🙏"
                        maxLength={60}
                    />
                </FormField>

                <FormField
                    label="Image"
                    id="category-image"
                    className="ui-field--wide"
                    error={imageError}
                    hint="PNG, JPEG, WEBP or GIF, up to 2 MB. Used instead of the icon when present."
                >
                    <div className="demo__flex" style={{ alignItems: 'center', gap: '12px' }}>
                        <input
                            ref={fileInputRef}
                            id="category-image"
                            type="file"
                            accept={ACCEPTED_IMAGE_TYPES.join(',')}
                            onChange={handleFileChange}
                            style={{ maxWidth: '260px', fontSize: 13 }}
                        />
                        {hasImage && (
                            <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={handleRemoveImage}
                            >
                                Remove image
                            </Button>
                        )}
                    </div>

                    {/* Kept inside the Image field so it does not become a stray
                        grid cell of its own. */}
                    {previewSrc && (
                        <div
                            style={{
                                marginTop: 10,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                            }}
                        >
                            <img
                                src={previewSrc}
                                alt="Selected category image preview"
                                style={{
                                    width: 64,
                                    height: 64,
                                    objectFit: 'cover',
                                    borderRadius: 8,
                                    border: '1px solid var(--border)',
                                }}
                            />
                            <span style={{ fontSize: 13, opacity: 0.7 }}>
                                {pickedFile ? 'Will be uploaded on save' : 'Current image'}
                            </span>
                        </div>
                    )}
                </FormField>
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

export default CategoryForm
