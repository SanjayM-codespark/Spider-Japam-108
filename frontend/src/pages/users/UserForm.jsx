import { useState } from 'react'
import { Button, FormField, Input } from '../../components/ui/index.js'
import { apiFetch } from '../../api.js'

const toDateInput = (value) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toISOString().slice(0, 10)
}

function UserForm({ initial = null, onSaved, submitLabel = 'Save user' }) {
    const isPremium = Boolean(initial?.premium)
    const [name, setName] = useState(initial?.name || '')
    const [email, setEmail] = useState(initial?.email || '')
    const [premiumEnd, setPremiumEnd] = useState(
        isPremium ? toDateInput(initial?.premium_end) : ''
    )
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!name.trim()) {
            setError('Name is required.')
            return
        }
        if (!email.trim()) {
            setError('Email is required.')
            return
        }

        setError('')
        setSaving(true)
        try {
            const response = await apiFetch(`/admin/users/${initial.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim(),
                    premium_end: premiumEnd || null,
                }),
            })
            const data = await response.json()
            if (!data.success) {
                setError(data.message || 'Failed to save user.')
                return
            }
            onSaved?.(data)
        } catch {
            setError('Could not reach the backend. Make sure it is running.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} noValidate>
            <FormField label="Name" required id="user-name">
                <Input
                    id="user-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dhileepan"
                />
            </FormField>

            <div className="demo__gap" />
            <FormField label="Email" required id="user-email">
                <Input
                    id="user-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                />
            </FormField>

            <div className="demo__gap" />
            <FormField
                label="Premium ending date"
                id="user-premium-end"
                hint={
                    isPremium
                        ? initial?.premium_start
                            ? `Premium started on ${new Date(initial.premium_start).toLocaleDateString()}`
                            : 'Extend the premium ending date.'
                        : 'Set a date to convert this user to premium. Leave empty to keep them non-premium.'
                }
            >
                <Input
                    id="user-premium-end"
                    type="date"
                    value={premiumEnd}
                    onChange={(e) => setPremiumEnd(e.target.value)}
                />
            </FormField>

            {error && (
                <p className="demo__subtitle" role="alert">
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

export default UserForm
