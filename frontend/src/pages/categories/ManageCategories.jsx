import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card, FormField, Input, Modal, Table } from '../../components/ui/index.js'
import { apiFetch, assetUrl } from '../../api.js'
import CategoryForm from './CategoryForm.jsx'

const statusBadge = (status) => (
    <Badge variant={status === 'active' ? 'success' : 'default'}>{status === 'active' ? 'Active' : 'Inactive'}</Badge>
)

// The image is what an app would show, so it is what the table shows. The emoji
// is the fallback for a category that has no image.
const categoryVisual = (category) => {
    if (category.image_url) {
        return (
            <img
                src={assetUrl(category.image_url)}
                alt=""
                title={category.name}
                style={{
                    width: 40,
                    height: 40,
                    objectFit: 'cover',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    display: 'block',
                }}
            />
        )
    }

    if (category.icon) {
        return (
            <span style={{ fontSize: '20px', lineHeight: 1 }} title={category.icon}>
                {category.icon}
            </span>
        )
    }

    return <span style={{ color: 'var(--text)', opacity: 0.5 }}>&mdash;</span>
}

function ManageCategories() {
    const navigate = useNavigate()
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [editTarget, setEditTarget] = useState(null)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [message, setMessage] = useState('')

    // One loader for both the first render and every later refresh, so the
    // search term is never dropped by a Reload or a post-save refetch.
    const fetchCategories = useCallback((term) => {
        const params = new URLSearchParams()
        if (term) params.set('search', term)

        setLoading(true)
        return apiFetch(`/admin/categories?${params.toString()}`)
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    setCategories(data.categories)
                    setMessage('')
                } else {
                    setMessage(data.message || 'Failed to fetch categories.')
                }
            })
            .catch(() => setMessage('Failed to fetch categories.'))
            .finally(() => setLoading(false))
    }, [])

    // Debounced so a typed word is one request rather than one per keystroke.
    useEffect(() => {
        const timer = setTimeout(() => fetchCategories(search.trim()), 300)
        return () => clearTimeout(timer)
    }, [search, fetchCategories])

    const reload = () => fetchCategories(search.trim())

    // Quick toggle straight from the table, without opening the edit modal.
    const handleToggleStatus = async (category) => {
        const next = category.status === 'active' ? 'inactive' : 'active'
        const response = await apiFetch(`/admin/categories/${category.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: next }),
        })
        const data = await response.json()
        if (!data.success) {
            setMessage(data.message || 'Failed to update category.')
            return
        }
        setCategories((prev) =>
            prev.map((row) => (row.id === category.id ? { ...row, status: next } : row)),
        )
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        const response = await apiFetch(`/admin/categories/${deleteTarget.id}`, {
            method: 'DELETE',
        })
        const data = await response.json()
        if (!data.success) {
            setMessage(data.message || 'Failed to delete category.')
            setDeleteTarget(null)
            return
        }
        setDeleteTarget(null)
        reload()
    }

    // Short values are centred, free text (name, description) stays left.
    // `align` applies to the header and the cell together.
    const columns = [
        { key: 'id', label: 'ID', align: 'center' },
        { key: 'name', label: 'Name' },
        {
            key: 'description',
            label: 'Description',
            render: (category) => {
                const text = (category.description || '').trim()
                if (!text) return <span style={{ color: 'var(--text)', opacity: 0.5 }}>&mdash;</span>
                return (
                    <span
                        title={text}
                        style={{ maxWidth: '260px', display: 'inline-block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                        {text.substring(0, 80)}{text.length > 80 ? '...' : ''}
                    </span>
                )
            },
        },
        {
            key: 'status',
            label: 'Status',
            align: 'center',
            render: (category) => statusBadge(category.status),
        },
        {
            key: 'image_url',
            label: 'Image',
            align: 'center',
            render: (category) => categoryVisual(category),
        },
        {
            key: 'actions',
            label: 'Actions',
            align: 'center',
            render: (category) => (
                <div className="demo__flex" style={{ gap: '8px' }}>
                    <Button size="sm" variant="secondary" onClick={() => handleToggleStatus(category)}>
                        {category.status === 'active' ? 'Set Inactive' : 'Set Active'}
                    </Button>
                    <Button size="sm" onClick={() => setEditTarget(category)}>
                        Edit
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleteTarget(category)}>
                        Delete
                    </Button>
                </div>
            ),
        },
    ]

    return (
        <Card
            title="Manage Category"
            subtitle={`${categories.length} category(ies)`}
            actions={
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Button size="sm" variant="secondary" onClick={reload}>
                        Reload
                    </Button>
                    <Button size="sm" onClick={() => navigate('/admin/add-category')}>
                        Add Category
                    </Button>
                </div>
            }
        >
            <div className="demo__toolbar">
                <FormField label="Search categories" id="category-search">
                    <Input
                        id="category-search"
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or description..."
                    />
                </FormField>
            </div>

            {message && (
                <p className="demo__subtitle" role="alert" style={{ color: '#ef4444' }}>
                    {message}
                </p>
            )}
            <Table
                columns={columns}
                data={categories}
                loading={loading}
                rowKey="id"
                emptyMessage={search ? 'No categories match your search.' : 'No records found'}
            />

            <Modal
                open={Boolean(editTarget)}
                onClose={() => setEditTarget(null)}
                title="Edit Category"
                size="lg"
            >
                {editTarget && (
                    <CategoryForm
                        key={editTarget.id}
                        initial={editTarget}
                        submitLabel="Save"
                        onSaved={() => {
                            setEditTarget(null)
                            reload()
                        }}
                        onCancel={() => setEditTarget(null)}
                    />
                )}
            </Modal>

            <Modal
                open={Boolean(deleteTarget)}
                onClose={() => setDeleteTarget(null)}
                title="Delete Category"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
                            Cancel
                        </Button>
                        <Button variant="danger" onClick={handleDelete}>
                            Delete
                        </Button>
                    </>
                }
            >
                {deleteTarget && (
                    <p>
                        Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
                        This action cannot be undone.
                    </p>
                )}
            </Modal>
        </Card>
    )
}

export default ManageCategories
