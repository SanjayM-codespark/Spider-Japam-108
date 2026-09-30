import { useEffect, useState } from 'react'
import { Badge, Button, Card, Modal, Table } from '../../components/ui/index.js'
import { apiFetch } from '../../api.js'
import SubscriptionForm from './SubscriptionForm.jsx'

const formatPrice = (price) =>
    Number(price).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })

function ManageSubscription() {
    const [subscriptions, setSubscriptions] = useState([])
    const [loading, setLoading] = useState(true)
    const [editTarget, setEditTarget] = useState(null)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [message, setMessage] = useState('')

    const reload = () => {
        apiFetch('/admin/subscriptions')
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    setSubscriptions(data.subscriptions)
                    setMessage('')
                } else {
                    setMessage(data.message || 'Failed to fetch subscriptions.')
                }
            })
            .catch(() => setMessage('Failed to fetch subscriptions.'))
    }

    useEffect(() => {
        apiFetch('/admin/subscriptions')
            .then((response) => response.json())
            .then((data) => {
                if (data.success) setSubscriptions(data.subscriptions)
            })
            .catch(() => setMessage('Failed to fetch subscriptions.'))
            .finally(() => setLoading(false))
    }, [])

    const handleDelete = async () => {
        if (!deleteTarget) return
        const response = await apiFetch(`/admin/subscriptions/${deleteTarget.id}`, { method: 'DELETE' })
        const data = await response.json()
        if (!data.success) {
            setMessage(data.message || 'Failed to delete subscription.')
        }
        setDeleteTarget(null)
        reload()
    }

    // Short values are centred, free text (package, description) stays left.
    // `align` applies to the header and the cell together.
    const columns = [
        { key: 'id', label: 'ID', align: 'center' },
        { key: 'package_name', label: 'Package' },
        { key: 'description', label: 'Description' },
        {
            key: 'duration',
            label: 'Duration',
            align: 'center',
            render: (sub) => <Badge variant="info">{sub.duration}</Badge>,
        },
        {
            key: 'platform',
            label: 'Platform',
            align: 'center',
            render: (sub) => <Badge variant="default">{sub.platform}</Badge>,
        },
        {
            key: 'prices',
            label: 'Prices',
            align: 'center',
            render: (sub) =>
                sub.prices
                    .map((p) => `${p.country} (${p.currency}) ${formatPrice(p.price)}`)
                    .join(',  '),
        },
        {
            key: 'actions',
            label: 'Actions',
            align: 'center',
            render: (sub) => (
                <div className="demo__flex">
                    <Button size="sm" variant="secondary" onClick={() => setEditTarget(sub)}>
                        Edit
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleteTarget(sub)}>
                        Delete
                    </Button>
                </div>
            ),
        },
    ]

    return (
        <Card
            title="Manage Subscriptions"
            subtitle={`${subscriptions.length} subscription package(s)`}
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
            <Table columns={columns} data={subscriptions} loading={loading} rowKey="id" />

            <Modal
                open={Boolean(editTarget)}
                onClose={() => setEditTarget(null)}
                title="Edit Subscription"
                size="lg"
                footer={
                    <Button variant="ghost" onClick={() => setEditTarget(null)}>
                        Cancel
                    </Button>
                }
            >
                {editTarget && (
                    <SubscriptionForm
                        initial={editTarget}
                        submitLabel="Update subscription"
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
                title="Delete Subscription"
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
                        Are you sure you want to delete <strong>{deleteTarget.package_name}</strong>?
                        This also removes its country prices.
                    </p>
                )}
            </Modal>
        </Card>
    )
}

export default ManageSubscription