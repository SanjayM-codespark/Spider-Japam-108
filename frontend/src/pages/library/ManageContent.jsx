import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card, FormField, Input, Modal, Table } from '../../components/ui/index.js'
import { apiFetch } from '../../api.js'
import ContentForm from './ContentForm.jsx'

// Placeholder for a field the admin has not filled in yet.
const Dash = () => <span style={{ color: 'var(--text)', opacity: 0.5 }}>&mdash;</span>

function ManageContent() {
    const navigate = useNavigate()
    const [contents, setContents] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [editTarget, setEditTarget] = useState(null)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [message, setMessage] = useState('')

    // One loader for both the first render and every later refresh, so the
    // search term is never dropped by a Reload or a post-save refetch.
    const fetchContents = useCallback((term) => {
        const params = new URLSearchParams()
        if (term) params.set('search', term)

        setLoading(true)
        return apiFetch(`/admin/library-contents?${params.toString()}`)
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    setContents(data.contents)
                    setMessage('')
                } else {
                    setMessage(data.message || 'Failed to fetch contents.')
                }
            })
            .catch(() => setMessage('Failed to fetch contents.'))
            .finally(() => setLoading(false))
    }, [])

    // Debounced so a typed word is one request rather than one per keystroke.
    useEffect(() => {
        const timer = setTimeout(() => fetchContents(search.trim()), 300)
        return () => clearTimeout(timer)
    }, [search, fetchContents])

    const reload = () => fetchContents(search.trim())

    const handleDelete = async () => {
        if (!deleteTarget) return
        const response = await apiFetch(`/admin/library-contents/${deleteTarget.id}`, {
            method: 'DELETE',
        })
        const data = await response.json()
        if (!data.success) {
            setMessage(data.message || 'Failed to delete content.')
        }
        setDeleteTarget(null)
        reload()
    }

    // Short values are centred, free text (title, deity, short description)
    // stays left. `align` applies to the header and the cell together.
    const columns = [
        { key: 'id', label: 'ID', align: 'center' },
        { key: 'title', label: 'Title' },
        {
            key: 'category_name',
            label: 'Category',
            align: 'center',
            render: (item) =>
                item.category_name ? (
                    item.category_name
                ) : (
                    <Badge variant="warning">Uncategorised</Badge>
                ),
        },
        {
            key: 'deity',
            label: 'Deity',
            render: (item) =>
                item.deity ? item.deity : <Dash />,
        },
        {
            key: 'short_description',
            label: 'Short Desc',
            render: (item) => {
                const text = (item.short_description || '').trim()
                if (!text) return <Dash />
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
            render: (item) => (
                <Badge variant={item.status === 'published' ? 'success' : 'default'}>
                    {item.status === 'published' ? 'Published' : 'Draft'}
                </Badge>
            ),
        },
        {
            key: 'bead_count',
            label: 'Beads',
            align: 'center',
            // Content saved before the column existed reads as 108, which is the
            // default the form would have shown for it anyway.
            render: (item) => <Badge variant="info">{item.bead_count ?? 108}</Badge>,
        },
        {
            key: 'actions',
            label: 'Actions',
            align: 'center',
            render: (item) => (
                <div className="demo__flex" style={{ gap: '8px' }}>
                    <Button size="sm" onClick={() => setEditTarget(item)}>
                        Edit
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleteTarget(item)}>
                        Delete
                    </Button>
                </div>
            ),
        },
    ]

    return (
        <Card
            title="Manage Content"
            subtitle={`${contents.length} content item(s) - Edit opens the full form, including meaning and lesson`}
            actions={
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Button size="sm" variant="secondary" onClick={reload}>
                        Reload
                    </Button>
                    <Button size="sm" onClick={() => navigate('/admin/add-content')}>
                        Add Content
                    </Button>
                </div>
            }
        >
            <div className="demo__toolbar">
                <FormField label="Search content" id="content-search">
                    <Input
                        id="content-search"
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search title, deity, content or meaning..."
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
                data={contents}
                loading={loading}
                rowKey="id"
                emptyMessage={search ? 'No content matches your search.' : 'No records found'}
            />

            <Modal
                open={Boolean(editTarget)}
                onClose={() => setEditTarget(null)}
                title="Edit Content"
                size="lg"
            >
                {editTarget && (
                    <ContentForm
                        key={editTarget.id}
                        initial={editTarget}
                        variant="edit"
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
                title="Delete Content"
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
                        Are you sure you want to delete <strong>{deleteTarget.title}</strong>?
                        Its meaning will be removed as well. This action cannot be undone.
                    </p>
                )}
            </Modal>
        </Card>
    )
}

export default ManageContent
