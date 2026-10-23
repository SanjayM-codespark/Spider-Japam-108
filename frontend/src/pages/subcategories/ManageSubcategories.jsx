import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card, FormField, Input, Modal, Table } from '../../components/ui/index.js'
import { apiFetch, assetUrl } from '../../api.js'
import SubcategoryForm from './SubcategoryForm.jsx'

const statusBadge = (status) => (
    <Badge variant={status === 'active' ? 'success' : 'default'}>{status === 'active' ? 'Active' : 'Inactive'}</Badge>
)

const subcategoryVisual = (subcategory) => {
    if (subcategory.image_url) {
        return (
            <img
                src={assetUrl(subcategory.image_url)}
                alt=""
                title={subcategory.name}
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

    if (subcategory.icon) {
        return (
            <span style={{ fontSize: '20px', lineHeight: 1 }} title={subcategory.icon}>
                {subcategory.icon}
            </span>
        )
    }

    return <span style={{ color: 'var(--text)', opacity: 0.5 }}>&mdash;</span>
}

function ManageSubcategories() {
    const navigate = useNavigate()
    const [subcategories, setSubcategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [editTarget, setEditTarget] = useState(null)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [message, setMessage] = useState('')

    const fetchSubcategories = useCallback((term) => {
        const params = new URLSearchParams()
        if (term) params.set('search', term)

        setLoading(true)
        return apiFetch(`/admin/subcategories?${params.toString()}`)
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    setSubcategories(data.subcategories)
                    setMessage('')
                } else {
                    setMessage(data.message || 'Failed to fetch subcategories.')
                }
            })
            .catch(() => setMessage('Failed to fetch subcategories.'))
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        const timer = setTimeout(() => fetchSubcategories(search.trim()), 300)
        return () => clearTimeout(timer)
    }, [search, fetchSubcategories])

    const reload = () => fetchSubcategories(search.trim())

    const handleToggleStatus = async (subcategory) => {
        const next = subcategory.status === 'active' ? 'inactive' : 'active'
        const response = await apiFetch(`/admin/subcategories/${subcategory.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: next }),
        })
        const data = await response.json()
        if (!data.success) {
            setMessage(data.message || 'Failed to update subcategory.')
            return
        }
        setSubcategories((prev) =>
            prev.map((row) => (row.id === subcategory.id ? { ...row, status: next } : row)),
        )
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        const response = await apiFetch(`/admin/subcategories/${deleteTarget.id}`, {
            method: 'DELETE',
        })
        const data = await response.json()
        if (!data.success) {
            setMessage(data.message || 'Failed to delete subcategory.')
            setDeleteTarget(null)
            return
        }
        setDeleteTarget(null)
        reload()
    }

    const columns = [
        { key: 'id', label: 'ID', align: 'center' },
        { key: 'name', label: 'Name' },
        {
            key: 'category_name',
            label: 'Category',
            render: (subcategory) => (
                <span>{subcategory.category_name || `#${subcategory.category_id}`}</span>
            ),
        },
        {
            key: 'description',
            label: 'Description',
            render: (subcategory) => {
                const text = (subcategory.description || '').trim()
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
            render: (subcategory) => statusBadge(subcategory.status),
        },
        {
            key: 'image_url',
            label: 'Image',
            align: 'center',
            render: (subcategory) => subcategoryVisual(subcategory),
        },
        {
            key: 'actions',
            label: 'Actions',
            align: 'center',
            render: (subcategory) => (
                <div className="demo__flex" style={{ gap: '8px' }}>
                    <Button size="sm" variant="secondary" onClick={() => handleToggleStatus(subcategory)}>
                        {subcategory.status === 'active' ? 'Set Inactive' : 'Set Active'}
                    </Button>
                    <Button size="sm" onClick={() => setEditTarget(subcategory)}>
                        Edit
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleteTarget(subcategory)}>
                        Delete
                    </Button>
                </div>
            ),
        },
    ]

    return (
        <Card
            title="Manage Subcategory"
            subtitle={`${subcategories.length} subcategory(ies)`}
            actions={
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Button size="sm" variant="secondary" onClick={reload}>
                        Reload
                    </Button>
                    <Button size="sm" onClick={() => navigate('/admin/add-subcategory')}>
                        Add Subcategory
                    </Button>
                </div>
            }
        >
            <div className="demo__toolbar">
                <FormField label="Search subcategories" id="subcategory-search">
                    <Input
                        id="subcategory-search"
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
                data={subcategories}
                loading={loading}
                rowKey="id"
                emptyMessage={search ? 'No subcategories match your search.' : 'No records found'}
            />

            <Modal
                open={Boolean(editTarget)}
                onClose={() => setEditTarget(null)}
                title="Edit Subcategory"
                size="lg"
            >
                {editTarget && (
                    <SubcategoryForm
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
                title="Delete Subcategory"
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

export default ManageSubcategories
