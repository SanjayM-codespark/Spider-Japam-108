import { useCallback, useEffect, useState } from 'react'
import { Badge, Button, Card, FormField, Input, Modal, Table } from '../../components/ui/index.js'
import { apiFetch } from '../../api.js'

const Dash = () => <span style={{ color: 'var(--text)', opacity: 0.5 }}>&mdash;</span>

function ManageUserMantras() {
    const [mantras, setMantras] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [message, setMessage] = useState('')
    const [viewTarget, setViewTarget] = useState(null)

    const fetchMantras = useCallback((term) => {
        const params = new URLSearchParams()
        if (term) params.set('search', term)

        setLoading(true)
        return apiFetch(`/admin/user-mantras?${params.toString()}`)
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    setMantras(data.mantras)
                    setMessage('')
                } else {
                    setMessage(data.message || 'Failed to fetch user mantras.')
                }
            })
            .catch(() => setMessage('Failed to fetch user mantras.'))
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        const timer = setTimeout(() => fetchMantras(search.trim()), 300)
        return () => clearTimeout(timer)
    }, [search, fetchMantras])

    const reload = () => fetchMantras(search.trim())

    const columns = [
        { key: 'id', label: 'ID', align: 'center' },
        {
            key: 'user_id',
            label: 'User ID',
            align: 'center',
            render: (item) => item.user_id,
        },
        {
            key: 'user_name',
            label: 'User',
            render: (item) =>
                item.user_name ? `${item.user_name} (${item.user_email})` : <Dash />,
        },
        {
            key: 'name',
            label: 'Title',
        },
        {
            key: 'mantra',
            label: 'Mantra',
            render: (item) => {
                const text = (item.mantra || '').trim()
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
            key: 'bead_count',
            label: 'Beads',
            align: 'center',
            render: (item) => <Badge variant="info">{item.bead_count}</Badge>,
        },
        {
            key: 'daily_goal',
            label: 'Daily Goal',
            align: 'center',
            render: (item) => item.daily_goal ? `${item.daily_goal}m` : <Dash />,
        },
        {
            key: 'weekly_goal',
            label: 'Weekly Goal',
            align: 'center',
            render: (item) => item.weekly_goal ? `${item.weekly_goal}m` : <Dash />,
        },
        {
            key: 'monthly_goal',
            label: 'Monthly Goal',
            align: 'center',
            render: (item) => item.monthly_goal ? `${item.monthly_goal}m` : <Dash />,
        },
        {
            key: 'yearly_goal',
            label: 'Yearly Goal',
            align: 'center',
            render: (item) => item.yearly_goal ? `${item.yearly_goal}m` : <Dash />,
        },
        {
            key: 'is_default',
            label: 'Default',
            align: 'center',
            render: (item) =>
                item.is_default ? (
                    <Badge variant="success">Yes</Badge>
                ) : (
                    <span style={{ color: 'var(--text)', opacity: 0.5 }}>No</span>
                ),
        },
        {
            key: 'created_at',
            label: 'Created',
            align: 'center',
            render: (item) =>
                item.created_at ? new Date(item.created_at).toLocaleDateString() : <Dash />,
        },
        {
            key: 'actions',
            label: 'Actions',
            align: 'center',
            render: (item) => (
                <div className="demo__flex" style={{ justifyContent: 'center' }}>
                    <Button size="sm" variant="secondary" onClick={() => setViewTarget(item)}>
                        View
                    </Button>
                </div>
            ),
        },
    ]

    return (
        <Card
            title="Manage User Mantras"
            subtitle={`${mantras.length} custom mantra(s) created by users`}
            actions={
                <Button size="sm" variant="secondary" onClick={reload}>
                    Reload
                </Button>
            }
        >
            <div className="demo__toolbar">
                <FormField label="Search user mantras" id="user-mantra-search">
                    <Input
                        id="user-mantra-search"
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by title or mantra..."
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
                data={mantras}
                loading={loading}
                rowKey="id"
                emptyMessage={search ? 'No user mantras match your search.' : 'No user mantras found'}
            />

            <Modal
                open={Boolean(viewTarget)}
                onClose={() => setViewTarget(null)}
                title="User Mantra Details"
                size="md"
            >
                {viewTarget && (
                    <div className="demo__flex demo__user-details">
                        <div>
                            <strong>ID</strong>
                            <span>{viewTarget.id}</span>
                        </div>
                        <div>
                            <strong>User ID</strong>
                            <span>{viewTarget.user_id}</span>
                        </div>
                        <div>
                            <strong>User</strong>
                            <span>
                                {viewTarget.user_name}
                                {viewTarget.user_email ? ` (${viewTarget.user_email})` : ''}
                            </span>
                        </div>
                        <div>
                            <strong>Title</strong>
                            <span>{viewTarget.name || <Dash />}</span>
                        </div>
                        <div style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                            <strong>Mantra</strong>
                            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5', width: '100%' }}>
                                {viewTarget.mantra || <Dash />}
                            </div>
                        </div>
                        <div>
                            <strong>Bead Count</strong>
                            <span>{viewTarget.bead_count}</span>
                        </div>
                        <div>
                            <strong>Daily Goal</strong>
                            <span>{viewTarget.daily_goal ? `${viewTarget.daily_goal}m` : <Dash />}</span>
                        </div>
                        <div>
                            <strong>Weekly Goal</strong>
                            <span>{viewTarget.weekly_goal ? `${viewTarget.weekly_goal}m` : <Dash />}</span>
                        </div>
                        <div>
                            <strong>Monthly Goal</strong>
                            <span>{viewTarget.monthly_goal ? `${viewTarget.monthly_goal}m` : <Dash />}</span>
                        </div>
                        <div>
                            <strong>Yearly Goal</strong>
                            <span>{viewTarget.yearly_goal ? `${viewTarget.yearly_goal}m` : <Dash />}</span>
                        </div>
                        <div>
                            <strong>Default</strong>
                            <span>{viewTarget.is_default ? 'Yes' : 'No'}</span>
                        </div>
                        <div>
                            <strong>Created At</strong>
                            <span>
                                {viewTarget.created_at
                                    ? new Date(viewTarget.created_at).toLocaleString()
                                    : <Dash />}
                            </span>
                        </div>
                        <div>
                            <strong>Updated At</strong>
                            <span>
                                {viewTarget.updated_at
                                    ? new Date(viewTarget.updated_at).toLocaleString()
                                    : <Dash />}
                            </span>
                        </div>
                    </div>
                )}
            </Modal>
        </Card>
    )
}

export default ManageUserMantras