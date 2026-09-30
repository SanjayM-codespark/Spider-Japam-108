import { useEffect, useState } from 'react'
import { Badge, Button, Card, Modal, Table } from '../../components/ui/index.js'
import { apiFetch } from '../../api.js'
import HelpForm from './HelpForm.jsx'

function ManageHelp() {
    const [helps, setHelps] = useState([])
    const [loading, setLoading] = useState(true)
    const [viewTarget, setViewTarget] = useState(null)
    const [editTarget, setEditTarget] = useState(null)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [message, setMessage] = useState('')

    const reload = () => {
        apiFetch('/admin/helps')
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    setHelps(data.helps)
                    setMessage('')
                } else {
                    setMessage(data.message || 'Failed to fetch helps.')
                }
            })
            .catch(() => setMessage('Failed to fetch helps.'))
    }

    const fetchOne = async (id) => {
        const response = await apiFetch(`/admin/helps/${id}`)
        const data = await response.json()
        if (!data.success) {
            setMessage(data.message || 'Failed to fetch help.')
            return null
        }
        return data.help
    }

    const openView = async (help) => {
        const full = await fetchOne(help.id)
        if (full) setViewTarget(full)
    }

    const openEdit = async (help) => {
        const full = await fetchOne(help.id)
        if (full) setEditTarget(full)
    }

    useEffect(() => {
        apiFetch('/admin/helps')
            .then((response) => response.json())
            .then((data) => {
                if (data.success) setHelps(data.helps)
            })
            .catch(() => setMessage('Failed to fetch helps.'))
            .finally(() => setLoading(false))
    }, [])

    const handleDelete = async () => {
        if (!deleteTarget) return
        const response = await apiFetch(`/admin/helps/${deleteTarget.id}`, { method: 'DELETE' })
        const data = await response.json()
        if (!data.success) {
            setMessage(data.message || 'Failed to delete help.')
        }
        setDeleteTarget(null)
        reload()
    }

    // `align` is applied to the header and the cell alike, so a column cannot
    // end up centred above left aligned data. Short values are centred; the
    // title is free text and stays left.
    const columns = [
        { key: 'id', label: 'ID', align: 'center' },
        {
            key: 'title',
            label: 'Title',
            render: (help) => (
                <Button size="sm" variant="ghost" onClick={() => openView(help)}>
                    {help.title}
                </Button>
            ),
        },
        {
            key: 'slug',
            label: 'Key',
            align: 'center',
            render: (help) =>
                help.slug ? (
                    <Badge variant="info">/{help.slug}</Badge>
                ) : (
                    <span className="demo__subtitle">&mdash;</span>
                ),
        },
        {
            key: 'created_at',
            label: 'Added',
            align: 'center',
            render: (help) => <Badge variant="info">{new Date(help.created_at).toLocaleDateString()}</Badge>,
        },
        {
            key: 'actions',
            label: 'Actions',
            align: 'center',
            render: (help) => (
                <div className="demo__flex">
                    <Button size="sm" variant="secondary" onClick={() => openView(help)}>
                        View
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => openEdit(help)}>
                        Edit
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleteTarget(help)}>
                        Delete
                    </Button>
                </div>
            ),
        },
    ]

    return (
        <Card
            title="Helps"
            subtitle={`${helps.length} help article(s) - click a title to view its content`}
            actions={
                <Button size="sm" variant="secondary" onClick={reload}>
                    Reload
                </Button>
            }
        >
            {message && (
                <p className="demo__subtitle" role="alert">
                    {message}
                </p>
            )}
            <Table columns={columns} data={helps} loading={loading} rowKey="id" />

            <Modal
                open={Boolean(viewTarget)}
                onClose={() => setViewTarget(null)}
                title={viewTarget?.title || 'Help'}
                size="lg"
            >
                {viewTarget && (
                    <div className="rte-content" dangerouslySetInnerHTML={{ __html: viewTarget.content }} />
                )}
            </Modal>

            <Modal
                open={Boolean(editTarget)}
                onClose={() => setEditTarget(null)}
                title="Edit Helps"
                size="lg"
                footer={
                    <Button variant="ghost" onClick={() => setEditTarget(null)}>
                        Cancel
                    </Button>
                }
            >
                {editTarget && (
                    <HelpForm
                        initial={editTarget}
                        submitLabel="Update help"
                        onSaved={() => {
                            setEditTarget(null)
                            reload()
                        }}
                    />
                )}
            </Modal>

            <Modal
                open={Boolean(deleteTarget)}
                onClose={() => setDeleteTarget(null)}
                title="Delete Help"
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
                    </p>
                )}
            </Modal>
        </Card>
    )
}

export default ManageHelp