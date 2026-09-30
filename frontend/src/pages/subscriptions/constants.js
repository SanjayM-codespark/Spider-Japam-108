import { countries } from 'countries-list'

export const DURATIONS = [
    { value: 'Monthly', label: 'Monthly' },
    { value: '3 Months', label: '3 Months' },
    { value: '6 Months', label: '6 Months' },
    { value: 'One Year', label: 'One Year' },
]

export const PLATFORMS = [
    { value: 'Android', label: 'Android' },
    { value: 'iOS', label: 'iOS' },
    { value: 'Both', label: 'Both' },
]

export const COUNTRIES = Object.values(countries)
    .filter((data) => Array.isArray(data.currency) && data.currency.length > 0)
    .map((data) => ({
        value: data.name,
        currency: data.currency[0],
    }))
    .sort((a, b) => a.value.localeCompare(b.value))