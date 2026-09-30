import { useCallback, useEffect, useState } from 'react'
import { Badge, Button, Card, FormField, Input, Modal, Table } from '../../components/ui/index.js'
import { apiFetch } from '../../api.js'
import UserForm from './UserForm.jsx'

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '-')

function ManageUsers({ plan = 'all', title }) {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [viewTarget, setViewTarget] = useState(null)
    const [editTarget, setEditTarget] = useState(null)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [message, setMessage] = useState('')

    const fetchUsers = useCallback(
        (term) => {
            const params = new URLSearchParams({ plan })
            if (term) params.set('search', term)

            setLoading(true)
            return apiFetch(`/admin/users?${params.toString()}`)
                .then((response) => response.json())
                .then((data) => {
                    if (data.success) {
                        setUsers(data.users)
                        setMessage('')
                    } else {
                        setMessage(data.message || 'Failed to fetch users.')
                    }
                })
                .catch(() => setMessage('Failed to fetch users.'))
                .finally(() => setLoading(false))
        },
        [plan]
    )

    useEffect(() => {
        const term = search.trim()
        const timer = setTimeout(() => fetchUsers(term), 300)
        return () => clearTimeout(timer)
    }, [search, fetchUsers])

    const reload = () => fetchUsers(search.trim())

    const fetchOne = async (id) => {
        const response = await apiFetch(`/admin/users/${id}`)
        const data = await response.json()
        if (!data.success) {
            setMessage(data.message || 'Failed to fetch user.')
            return null
        }
        return data.user
    }

    const openView = async (user) => {
        const full = await fetchOne(user.id)
        if (full) setViewTarget(full)
    }

    const openEdit = async (user) => {
        const full = await fetchOne(user.id)
        if (full) setEditTarget(full)
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        const response = await apiFetch(`/admin/users/${deleteTarget.id}`, { method: 'DELETE' })
        const data = await response.json()
        if (!data.success) {
            setMessage(data.message || 'Failed to delete user.')
        }
        setDeleteTarget(null)
        reload()
    }

    // Short values are centred, free text (name, email) stays left.
    // `align` applies to the header and the cell together.
    const columns = [
        { key: 'id', label: 'ID', align: 'center' },
        {
            key: 'name',
            label: 'Name',
            render: (user) => (
                <Button size="sm" variant="ghost" onClick={() => openView(user)}>
                    {user.name}
                </Button>
            ),
        },
        { key: 'email', label: 'Email' },
        {
            key: 'premium',
            label: 'Plan',
            align: 'center',
            render: (user) => (
                <Badge variant={user.premium ? 'success' : 'default'}>
                    {user.premium ? 'Premium' : 'Non Premium'}
                </Badge>
            ),
        },
        {
            key: 'actions',
            label: 'Actions',
            align: 'center',
            render: (user) => (
                <div className="demo__flex">
                    <Button size="sm" variant="secondary" onClick={() => openView(user)}>
                        View
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => openEdit(user)}>
                        Edit
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleteTarget(user)}>
                        Delete
                    </Button>
                </div>
            ),
        },
    ]

    return (
        <Card
            title={title}
            subtitle={`${users.length} member(s) from the database`}
            actions={
                <Button size="sm" variant="secondary" onClick={reload}>
                    Reload
                </Button>
            }
        >
            <div className="demo__toolbar">
                <FormField label="Search users" id="user-search">
                    <Input
                        id="user-search"
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or email..."
                    />
                </FormField>
            </div>

            {message && (
                <p className="demo__subtitle" role="alert">
                    {message}
                </p>
            )}
            <Table
                columns={columns}
                data={users}
                loading={loading}
                rowKey="id"
                emptyMessage={search ? 'No users match your search.' : 'No records found'}
            />

            <Modal
                open={Boolean(viewTarget)}
                onClose={() => setViewTarget(null)}
                title="User Details"
                size="sm"
            >
                {viewTarget && (
                    <div className="demo__flex demo__user-details">
                        <div>
                            <strong>ID</strong>
                            <span>{viewTarget.id}</span>
                        </div>
                        <div>
                            <strong>Name</strong>
                            <span>{viewTarget.name}</span>
                        </div>
                        <div>
                            <strong>Email</strong>
                            <span>{viewTarget.email}</span>
                        </div>
                        <div>
                            <strong>Plan</strong>
                            <span>
                                <Badge variant={viewTarget.premium ? 'success' : 'default'}>
                                    {viewTarget.premium ? 'Premium' : 'Non Premium'}
                                </Badge>
                            </span>
                        </div>
                        {viewTarget.premium ? (
                            <>
                                <div>
                                    <strong>Premium start</strong>
                                    <span>{formatDate(viewTarget.premium_start)}</span>
                                </div>
                                <div>
                                    <strong>Premium end</strong>
                                    <span>{formatDate(viewTarget.premium_end)}</span>
                                </div>
                            </>
                        ) : (
                            viewTarget.premium_end && (
                                <div>
                                    <strong>Premium ended</strong>
                                    <span>{formatDate(viewTarget.premium_end)}</span>
                                </div>
                            )
                        )}
                        <div>
                            <strong>Joined</strong>
                            <span>
                                {viewTarget.created_at
                                    ? new Date(viewTarget.created_at).toLocaleString()
                                    : '-'}
                            </span>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                open={Boolean(editTarget)}
                onClose={() => setEditTarget(null)}
                title="Edit User"
                size="sm"
                footer={
                    <Button variant="ghost" onClick={() => setEditTarget(null)}>
                        Cancel
                    </Button>
                }
            >
                {editTarget && (
                    <UserForm
                        initial={editTarget}
                        submitLabel="Update user"
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
                title="Delete User"
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
                        Are you sure you want to delete <strong>{deleteTarget.name}</strong> (
                        {deleteTarget.email})? This action cannot be undone.
                    </p>
                )}
            </Modal>
        </Card>
    )
}

export default ManageUsers
