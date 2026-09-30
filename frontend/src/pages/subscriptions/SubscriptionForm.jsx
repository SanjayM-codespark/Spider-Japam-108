import { useState } from 'react'
import { Button, FormField, Input, Select } from '../../components/ui/index.js'
import { apiFetch } from '../../api.js'
import { DURATIONS, COUNTRIES, PLATFORMS } from './constants.js'

const emptyRow = () => ({ country: '', currency: '', price: '' })

function SubscriptionForm({ initial = null, onSaved, submitLabel = 'Add subscription' }) {
    const [packageName, setPackageName] = useState(initial?.package_name || '')
    const [description, setDescription] = useState(initial?.description || '')
    const [duration, setDuration] = useState(initial?.duration || '')
    const [platform, setPlatform] = useState(initial?.platform || '')
    const [prices, setPrices] = useState(() =>
        initial?.prices?.length
            ? initial.prices.map((p) => ({
                country: p.country,
                currency: p.currency,
                price: p.price,
            }))
            : [emptyRow()]
    )
    const [error, setError] = useState('')

    const handleCountryChange = (index, value) => {
        const country = COUNTRIES.find((c) => c.value === value)
        setPrices((prev) =>
            prev.map((row, i) =>
                i === index ? { ...row, country: value, currency: country ? country.currency : '' } : row
            )
        )
    }

    const updateRow = (index, field, value) => {
        setPrices((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
    }

    const addPriceRow = () => setPrices((prev) => [...prev, emptyRow()])

    const removePriceRow = (index) => setPrices((prev) => prev.filter((_, i) => i !== index))

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!packageName.trim() || !duration) {
            setError('Package name and duration are required.')
            return
        }

        if (!platform) {
            setError('Platform is required.')
            return
        }

        const validPrices = prices.filter((p) => p.country && p.currency && p.price !== '')
        if (validPrices.length === 0) {
            setError('Add at least one country with currency and price.')
            return
        }

        setError('')
        try {
            const path = initial ? `/admin/subscriptions/${initial.id}` : '/admin/subscriptions'
            const method = initial ? 'PUT' : 'POST'
            const response = await apiFetch(path, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    package_name: packageName.trim(),
                    description: description.trim(),
                    duration,
                    platform,
                    prices: validPrices.map((p) => ({
                        country: p.country,
                        currency: p.currency,
                        price: Number(p.price),
                    })),
                }),
            })
            const data = await response.json()
            if (!data.success) {
                setError(data.message || 'Failed to save subscription.')
                return
            }
            onSaved?.()
        } catch {
            setError('Could not reach the backend. Make sure it is running.')
        }
    }

    return (
        <form onSubmit={handleSubmit} noValidate>
            <div className="demo__row">
                <FormField label="Package name" required id="sub-package">
                    <Input
                        id="sub-package"
                        value={packageName}
                        onChange={(e) => setPackageName(e.target.value)}
                        placeholder="e.g. Basic Chant"
                    />
                </FormField>
                <FormField label="Duration" required id="sub-duration">
                    <Select
                        id="sub-duration"
                        options={DURATIONS}
                        placeholder="Choose duration..."
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                    />
                </FormField>
            </div>
            <div className="demo__gap" />
            <FormField label="Platform" required id="sub-platform">
                <Select
                    id="sub-platform"
                    options={PLATFORMS}
                    placeholder="Choose platform..."
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                />
            </FormField>
            <div className="demo__gap" />
            <FormField label="Description" id="sub-description">
                <Input
                    id="sub-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe this package"
                />
            </FormField>

            <div className="demo__gap" />
            <h4 className="demo__subtitle">Country pricing</h4>
            <p className="demo__subtitle">Add country with currency code and the price for this package.</p>

            {prices.map((row, index) => (
                <div className="demo__price-row" key={index}>
                    <FormField label="Country" required>
                        <Select
                            options={COUNTRIES}
                            placeholder="Choose country..."
                            value={row.country}
                            onChange={(e) => handleCountryChange(index, e.target.value)}
                        />
                    </FormField>
                    <FormField label="Currency" required>
                        <Input value={row.currency} readOnly placeholder="Auto" />
                    </FormField>
                    <FormField label="Price" required>
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.price}
                            onChange={(e) => updateRow(index, 'price', e.target.value)}
                            placeholder="0.00"
                        />
                    </FormField>
                    {prices.length > 1 && (
                        <Button type="button" variant="ghost" onClick={() => removePriceRow(index)}>
                            Remove
                        </Button>
                    )}
                </div>
            ))}

            <Button type="button" variant="secondary" onClick={addPriceRow}>
                + Add country
            </Button>

            {error && (
                <p className="demo__subtitle" role="alert">
                    {error}
                </p>
            )}

            <div className="demo__gap" />
            <Button type="submit">{submitLabel}</Button>
        </form>
    )
}

export default SubscriptionForm