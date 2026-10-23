import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, FormField, Input, Select, Textarea } from '../../components/ui/index.js'
import { apiFetch, assetUrl } from '../../api.js'
import { ACCEPTED_IMAGE_TYPES, SUBCATEGORY_STATUSES, MAX_IMAGE_BYTES } from './constants.js'
import useCategories from '../categories/useCategories.js'

/**
 * Subcategory form: create/edit under a category. Mirrors CategoryForm but has a
 * Category picker (required). When editing, the category can be changed only if
 * no content uses this subcategory — the backend will reject with 409; in that
 * case a clearer message is shown. The subcategory cannot live "orphaned" from a
 * category.
 */
function SubcategoryForm({ initial = null, onSaved, onCancel, submitLabel = 'Save' }) {
    const [categoryId, setCategoryId] = useState(initial?.category_id ? String(initial.category_id) : '')
    const [name, setName] = useState(initial?.name || '')
    const [description, setDescription] = useState(initial?.description || '')
    const [status, setStatus] = useState(initial?.status || 'active')

    const [imageUrl, setImageUrl] = useState(initial?.image_url || '')
    const [pickedFile, setPickedFile] = useState(null)
    const [imageRemoved, setImageRemoved] = useState(false)
    const [imageError, setImageError] = useState('')

    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const fileInputRef = useRef(null)

    const { options: categoryOptions, loading: loadingCategories, error: categoriesError } = useCategories()

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
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const syncImage = async (id) => {
        if (!pickedFile && !imageRemoved) return

        if (pickedFile) {
            const form = new FormData()
            form.append('image', pickedFile)

            const response = await apiFetch(`/admin/subcategories/${id}/image`, {
                method: 'POST',
                body: form,
            })
            const data = await response.json()
            if (!data.success) throw new Error(data.message || 'Failed to upload the image.')
            return
        }

        const response = await apiFetch(`/admin/subcategories/${id}/image`, {
            method: 'DELETE',
        })
        const data = await response.json()
        if (!data.success) throw new Error(data.message || 'Failed to remove the image.')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!categoryId) {
            setError('Category is required.')
            return
        }

        if (!name.trim()) {
            setError('Name is required.')
            return
        }

        setError('')
        setSaving(true)

        try {
            const path = initial
                ? `/admin/subcategories/${initial.id}`
                : '/admin/subcategories'
            const method = initial ? 'PUT' : 'POST'

            const response = await apiFetch(path, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category_id: Number(categoryId),
                    name: name.trim(),
                    description: description.trim(),
                    status,
                }),
            })
            const data = await response.json()
            if (!data.success) {
                setError(data.message || 'Failed to save subcategory.')
                setSaving(false)
                return
            }

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

    const previewSrc = localPreview || (!imageRemoved && imageUrl ? assetUrl(imageUrl) : '')
    const hasImage = Boolean(localPreview || (!imageRemoved && imageUrl))

    return (
        <form className="ui-form ui-form--wide" onSubmit={handleSubmit} noValidate>
            <div className="ui-form__grid">
                <FormField label="Category" required id="subcategory-category" error={categoriesError}>
                    <Select
                        id="subcategory-category"
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        options={categoryOptions}
                        disabled={loadingCategories}
                        placeholder={loadingCategories ? 'Loading categories...' : 'Select category'}
                    />
                </FormField>

                <FormField label="Subcategory Name" required id="subcategory-name">
                    <Input
                        id="subcategory-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Kavacham, Ashtakam"
                        autoFocus
                    />
                </FormField>

                <FormField label="Status" required id="subcategory-status">
                    <Select
                        id="subcategory-status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        options={SUBCATEGORY_STATUSES}
                    />
                </FormField>

                <FormField label="Description" id="subcategory-description">
                    <Textarea
                        id="subcategory-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="A short line about what belongs in this subcategory"
                        rows={3}
                    />
                </FormField>

                <FormField
                    label="Image"
                    id="subcategory-image"
                    className="ui-field--wide"
                    error={imageError}
                    hint="PNG, JPEG, WEBP or GIF, up to 2 MB."
                >
                    <div className="demo__flex" style={{ alignItems: 'center', gap: '12px' }}>
                        <input
                            ref={fileInputRef}
                            id="subcategory-image"
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
                                alt="Selected subcategory image preview"
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

export default SubcategoryForm
