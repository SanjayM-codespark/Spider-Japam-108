import { useEffect, useState } from 'react'
import { Button, Card, FormField, Input, PasswordInput } from '../../components/ui/index.js'
import { apiFetch } from '../../api.js'

function Settings({ section = 'general' }) {
    const [appName, setAppName] = useState('')
    const [playstoreLink, setPlaystoreLink] = useState('')
    const [appStoreLink, setAppStoreLink] = useState('')
    const [admobAndroidKey, setAdmobAndroidKey] = useState('')
    const [admobIosKey, setAdmobIosKey] = useState('')
    const [razorpayLiveKey, setRazorpayLiveKey] = useState('')
    const [razorpayLiveSecret, setRazorpayLiveSecret] = useState('')
    const [razorpayTestKey, setRazorpayTestKey] = useState('')
    const [razorpayTestSecret, setRazorpayTestSecret] = useState('')
    const [razorpayMode, setRazorpayMode] = useState('test')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')

    const applySettings = (settings) => {
        setAppName(settings.app_name || '')
        setPlaystoreLink(settings.playstore_link || '')
        setAppStoreLink(settings.app_store_link || '')
        setAdmobAndroidKey(settings.admob?.android || '')
        setAdmobIosKey(settings.admob?.ios || '')
        setRazorpayLiveKey(settings.razorpay?.live?.key || '')
        setRazorpayLiveSecret(settings.razorpay?.live?.secret || '')
        setRazorpayTestKey(settings.razorpay?.test?.key || '')
        setRazorpayTestSecret(settings.razorpay?.test?.secret || '')
        setRazorpayMode(settings.razorpay?.mode || 'test')
    }

    const reload = () => {
        setLoading(true)
        setError('')
        setMessage('')
        apiFetch('/admin/settings')
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    applySettings(data.settings)
                } else {
                    setError(data.message || 'Failed to load settings.')
                }
            })
            .catch(() => setError('Could not load settings.'))
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        let mounted = true

        apiFetch('/admin/settings')
            .then((response) => response.json())
            .then((data) => {
                if (mounted && data.success) {
                    applySettings(data.settings)
                } else if (mounted && !data.success) {
                    setError(data.message || 'Failed to load settings.')
                }
            })
            .catch(() => {
                if (mounted) setError('Could not load settings.')
            })
            .finally(() => {
                if (mounted) setLoading(false)
            })

        return () => {
            mounted = false
        }
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!appName.trim()) {
            setError('App name is required.')
            return
        }

        setError('')
        setMessage('')
        setSaving(true)
        try {
            const response = await apiFetch('/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    app_name: appName.trim(),
                    playstore_link: playstoreLink.trim(),
                    app_store_link: appStoreLink.trim(),
                    admob_android_key: admobAndroidKey.trim(),
                    admob_ios_key: admobIosKey.trim(),
                    razorpay_live_key: razorpayLiveKey.trim(),
                    razorpay_live_secret: razorpayLiveSecret.trim(),
                    razorpay_test_key: razorpayTestKey.trim(),
                    razorpay_test_secret: razorpayTestSecret.trim(),
                    razorpay_mode: razorpayMode,
                }),
            })
            const data = await response.json()
            if (!data.success) {
                setError(data.message || 'Failed to save settings.')
                return
            }
            setMessage('Settings saved.')
        } catch {
            setError('Could not reach the backend. Make sure it is running.')
        } finally {
            setSaving(false)
        }
    }

    const title = section === 'payment' ? 'Payment Settings' : 'General Settings'
    const subtitle =
        section === 'payment'
            ? 'Razorpay live and test credentials'
            : 'App name and store links used across the project'

    return (
        <Card
            title={title}
            subtitle={subtitle}
            actions={
                <Button size="sm" variant="secondary" onClick={reload}>
                    Reload
                </Button>
            }
        >
            {loading ? (
                <p className="demo__subtitle">Loading settings...</p>
            ) : (
                <form onSubmit={handleSubmit} noValidate>
                    {section === 'general' && (
                        <>
                            <FormField label="App name" required id="settings-app-name">
                                <Input
                                    id="settings-app-name"
                                    value={appName}
                                    onChange={(e) => setAppName(e.target.value)}
                                    placeholder="e.g. Japam108"
                                />
                            </FormField>

                            <div className="demo__gap" />
                            <FormField label="Google Play link" id="settings-playstore">
                                <Input
                                    id="settings-playstore"
                                    value={playstoreLink}
                                    onChange={(e) => setPlaystoreLink(e.target.value)}
                                    placeholder="https://play.google.com/store/apps/details?id=..."
                                />
                            </FormField>

                            <div className="demo__gap" />
                            <FormField label="App Store link" id="settings-appstore">
                                <Input
                                    id="settings-appstore"
                                    value={appStoreLink}
                                    onChange={(e) => setAppStoreLink(e.target.value)}
                                    placeholder="https://apps.apple.com/app/id..."
                                />
                            </FormField>

                            <div className="demo__gap" />
                            <h3 className="demo__settings-heading">Google AdMob Keys</h3>
                            <FormField label="Android AdMob key" id="settings-admob-android">
                                <Input
                                    id="settings-admob-android"
                                    value={admobAndroidKey}
                                    onChange={(e) => setAdmobAndroidKey(e.target.value)}
                                    placeholder="ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy"
                                />
                            </FormField>

                            <div className="demo__gap" />
                            <FormField label="iOS AdMob key" id="settings-admob-ios">
                                <Input
                                    id="settings-admob-ios"
                                    value={admobIosKey}
                                    onChange={(e) => setAdmobIosKey(e.target.value)}
                                    placeholder="ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy"
                                />
                            </FormField>
                        </>
                    )}

                    {section === 'payment' && (
                        <>
                            <FormField label="Payment mode" id="settings-razorpay-mode">
                                <div className="demo__payment-mode" role="radiogroup">
                                    <label
                                        className={`demo__mode-option${razorpayMode === 'live' ? ' demo__mode-option--active' : ''}`}
                                    >
                                        <input
                                            type="radio"
                                            name="razorpay-mode"
                                            value="live"
                                            checked={razorpayMode === 'live'}
                                            onChange={() => setRazorpayMode('live')}
                                        />
                                        Live
                                    </label>
                                    <label
                                        className={`demo__mode-option${razorpayMode === 'test' ? ' demo__mode-option--active' : ''}`}
                                    >
                                        <input
                                            type="radio"
                                            name="razorpay-mode"
                                            value="test"
                                            checked={razorpayMode === 'test'}
                                            onChange={() => setRazorpayMode('test')}
                                        />
                                        Test
                                    </label>
                                </div>
                            </FormField>

                            <div className="demo__gap" />
                            {razorpayMode === 'live' ? (
                                <>
                                    <h3 className="demo__settings-heading">Razorpay Live Credentials</h3>
                                    <div className="demo__row">
                                        <FormField label="Live Key ID" id="settings-razorpay-live-key">
                                            <Input
                                                id="settings-razorpay-live-key"
                                                value={razorpayLiveKey}
                                                onChange={(e) => setRazorpayLiveKey(e.target.value)}
                                                placeholder="rzp_live_..."
                                            />
                                        </FormField>
                                        <FormField label="Live Key Secret" id="settings-razorpay-live-secret">
                                            <PasswordInput
                                                id="settings-razorpay-live-secret"
                                                value={razorpayLiveSecret}
                                                onChange={(e) => setRazorpayLiveSecret(e.target.value)}
                                                placeholder="Live key secret"
                                            />
                                        </FormField>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h3 className="demo__settings-heading">Razorpay Test Credentials</h3>
                                    <div className="demo__row">
                                        <FormField label="Test Key ID" id="settings-razorpay-test-key">
                                            <Input
                                                id="settings-razorpay-test-key"
                                                value={razorpayTestKey}
                                                onChange={(e) => setRazorpayTestKey(e.target.value)}
                                                placeholder="rzp_test_..."
                                            />
                                        </FormField>
                                        <FormField label="Test Key Secret" id="settings-razorpay-test-secret">
                                            <PasswordInput
                                                id="settings-razorpay-test-secret"
                                                value={razorpayTestSecret}
                                                onChange={(e) => setRazorpayTestSecret(e.target.value)}
                                                placeholder="Test key secret"
                                            />
                                        </FormField>
                                    </div>
                                </>
                            )}

                            <div className="demo__gap" />
                            <p className="demo__subtitle">
                                The selected mode ({razorpayMode === 'live' ? 'Live' : 'Test'}) is saved and used for
                                payments.
                            </p>
                        </>
                    )}

                    {error && (
                        <p className="demo__subtitle" role="alert">
                            {error}
                        </p>
                    )}
                    {message && <p className="demo__subtitle">{message}</p>}

                    <div className="demo__gap" />
                    <Button type="submit" loading={saving}>
                        Save settings
                    </Button>
                </form>
            )}
        </Card>
    )
}

export default Settings