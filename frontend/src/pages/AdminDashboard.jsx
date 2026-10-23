import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    Button,
    Modal,
    FormField,
    Input,
    StatCard,
    Select,
    Sidebar,
    Footer,
} from '../components/ui/index.js'
import { apiFetch, clearSession } from '../api.js'
import { usePageTitle } from '../usePageTitle.js'
import { useSettings } from '../useSettings.js'
// Hidden for now: Users, Subscription and Payment Settings.
// import AddSubscription from './subscriptions/AddSubscription.jsx'
// import ManageSubscription from './subscriptions/ManageSubscription.jsx'
import AddHelp from './help/AddHelp.jsx'
import ManageHelp from './help/ManageHelp.jsx'
import ManageUsers from './users/ManageUsers.jsx'
import ManageUserMantras from './users/ManageUserMantras.jsx'
import Settings from './settings/Settings.jsx'
import AddContent from './library/AddContent.jsx'
import ManageContent from './library/ManageContent.jsx'
import ContentMeaning from './library/ContentMeaning.jsx'
import AddCategory from './categories/AddCategory.jsx'
import ManageCategories from './categories/ManageCategories.jsx'
import AddSubcategory from './subcategories/AddSubcategory.jsx'
import ManageSubcategories from './subcategories/ManageSubcategories.jsx'
import logo from '../assets/japam108_logo.png'
import '../App.css'

const roleOptions = [
    { value: 'admin', label: 'Admin' },
    { value: 'editor', label: 'Editor' },
    { value: 'member', label: 'Member' },
]

const USER_KEYS = ['users', 'all', 'deleted', 'user-mantras']
// const SUBSCRIPTION_KEYS = ['subscription', 'add-subscription', 'manage-subscription']
const HELP_KEYS = ['help', 'add-help', 'manage-help']
const SETTINGS_KEYS = ['settings', 'settings-general', 'settings-payment']
const LIBRARY_KEYS = ['sacred-library', 'add-content', 'manage-content', 'library-content']
const CATEGORY_KEYS = ['category', 'add-category', 'manage-category']
// const SUBCATEGORY_KEYS = ['subcategory', 'add-subcategory', 'manage-subcategory']

const PAGE_TITLES = {
    dashboard: 'Dashboard',
    users: 'Users',
    all: 'Active Users',
    deleted: 'Deleted Users',
    'user-mantras': 'User Mantras',
    subscription: 'Subscription',
    'add-subscription': 'Add Subscription',
    'manage-subscription': 'Manage Subscription',
    help: 'Helps',
    'add-help': 'Add Helps',
    'manage-help': 'Helps',
    // chants: 'Chants',
    'sacred-library': 'Sacred Library',
    'add-content': 'Add Content',
    'manage-content': 'Manage Content',
    'library-content': 'Sacred Library',
    category: 'Category',
    'add-category': 'Add Category',
    'manage-category': 'Manage Category',
    subcategory: 'Subcategory',
    'add-subcategory': 'Add Subcategory',
    'manage-subcategory': 'Manage Subcategory',
    settings: 'Settings',
    'settings-general': 'General Settings',
    'settings-payment': 'Payment Settings',
}

const SIDEBAR_LINKS = (active) => [
    { key: 'dashboard', label: 'Dashboard', icon: 'fa-gauge-high', active: active === 'dashboard' },
    {
        key: 'users',
        label: 'Users',
        icon: 'fa-users',
        active: USER_KEYS.includes(active),
        subLinks: [
            { key: 'all', label: 'Active Users', icon: 'fa-list', active: active === 'all' },
            { key: 'deleted', label: 'Deleted Users', icon: 'fa-trash', active: active === 'deleted' },
            { key: 'user-mantras', label: 'User Mantras', icon: 'fa-prayer-beads', active: active === 'user-mantras' },
        ],
    },
    // Hidden for now: Subscription section.
    // {
    //     key: 'subscription',
    //     label: 'Subscription',
    //     active: SUBSCRIPTION_KEYS.includes(active),
    //     subLinks: [
    //         {
    //             key: 'add-subscription',
    //             label: 'Add Subscription',
    //             active: active === 'add-subscription',
    //         },
    //         {
    //             key: 'manage-subscription',
    //             label: 'Manage Subscription',
    //             active: active === 'manage-subscription',
    //         },
    //     ],
    // },
    {
        key: 'help',
        label: 'Helps',
        icon: 'fa-circle-question',
        active: HELP_KEYS.includes(active),
        subLinks: [
            {
                key: 'add-help',
                label: 'Add Helps',
                icon: 'fa-plus',
                active: active === 'add-help',
            },
            {
                key: 'manage-help',
                label: 'Helps',
                icon: 'fa-list',
                active: active === 'manage-help',
            },
        ],
    },
    // { key: 'chants', label: 'Chants', active: active === 'chants' },
    {
        key: 'sacred-library',
        label: 'Sacred Library',
        icon: 'fa-book-open',
        active: LIBRARY_KEYS.includes(active),
        subLinks: [
            {
                key: 'add-content',
                label: 'Add Content',
                icon: 'fa-plus',
                active: active === 'add-content',
            },
            {
                key: 'manage-content',
                label: 'Manage Content',
                icon: 'fa-list-check',
                active: active === 'manage-content',
            },
            // A group of its own, so this is the third level of the sidebar.
            {
                key: 'category',
                label: 'Category',
                icon: 'fa-layer-group',
                active: CATEGORY_KEYS.includes(active),
                subLinks: [
                    {
                        key: 'add-category',
                        label: 'Add Category',
                        icon: 'fa-plus',
                        active: active === 'add-category',
                    },
                    {
                        key: 'manage-category',
                        label: 'Manage Category',
                        icon: 'fa-list',
                        active: active === 'manage-category',
                    },
                    {
                        key: 'add-subcategory',
                        label: 'Add Subcategory',
                        icon: 'fa-plus',
                        active: active === 'add-subcategory',
                    },
                    {
                        key: 'manage-subcategory',
                        label: 'Manage Subcategory',
                        icon: 'fa-list',
                        active: active === 'manage-subcategory',
                    },
                ],
            },
        ],
    },
    {
        key: 'settings',
        label: 'Settings',
        icon: 'fa-gear',
        active: SETTINGS_KEYS.includes(active),
        subLinks: [
            {
                key: 'settings-general',
                label: 'General Settings',
                icon: 'fa-sliders',
                active: active === 'settings-general',
            },
            // Hidden for now: Payment Settings.
            // {
            //     key: 'settings-payment',
            //     label: 'Payment Settings',
            //     active: active === 'settings-payment',
            // },
        ],
    },
]

function AdminDashboard() {
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const { section } = useParams()
    const activeLink = section || 'dashboard'
    const pageTitle = PAGE_TITLES[activeLink] || 'Dashboard'
    usePageTitle(pageTitle)
    const { app_name: appName } = useSettings()
    const [profile, setProfile] = useState({ name: '', email: '', role: 'member' })
    const [counts, setCounts] = useState({ contents: null, categories: null, users: null })
    const [admin, setAdmin] = useState(() => {
        try {
            const stored = JSON.parse(localStorage.getItem('naamjap_admin') || 'null')
            return stored || { fullName: '', email: '' }
        } catch {
            return { fullName: '', email: '' }
        }
    })
    const navigate = useNavigate()

    const adminName = admin.full_name || admin.username || 'Admin'
    const adminInitial = (adminName || 'A').charAt(0).toUpperCase()
    const adminEmail = admin.email || 'admin@naamjap.com'

    // Hidden for now: Users and Subscription views.
    // const isUsersView = USER_KEYS.includes(activeLink) && activeLink !== 'users'

    useEffect(() => {
        let mounted = true

        apiFetch('/admin/me')
            .then((response) => response.json())
            .then((data) => {
                if (!mounted || !data.success) return
                setAdmin(data.admin)
                localStorage.setItem('naamjap_admin', JSON.stringify(data.admin))
            })
            .catch(() => { })

        return () => {
            mounted = false
        }
    }, [])

    useEffect(() => {
        let mounted = true

        Promise.all([
            apiFetch('/admin/library-contents').then((response) => response.json()),
            apiFetch('/admin/categories').then((response) => response.json()),
            apiFetch('/admin/users/count').then((response) => response.json()),
        ])
            .then(([contentData, categoryData, userData]) => {
                if (!mounted) return
                setCounts({
                    contents: contentData.success ? contentData.count : null,
                    categories: categoryData.success ? categoryData.count : null,
                    users: userData.success ? userData.counts : null,
                })
            })
            .catch(() => { })

        return () => {
            mounted = false
        }
    }, [])

    const handleLogout = () => {
        clearSession()
        navigate('/admin', { replace: true })
    }

    const handleNav = (key) => {
        const path = key === 'dashboard' ? '/admin/dashboard' : `/admin/${key}`
        window.scrollTo(0, 0)
        navigate(path)
    }

    const handleSave = () => {
        setSaving(true)
        window.setTimeout(() => {
            setSaving(false)
            setModalOpen(false)
        }, 900)
    }

    return (
        <div className="demo-layout">
            <Sidebar
                open={sidebarOpen}
                brand={
                    <img src={logo} alt={appName} className="ui-sidebar__brand-logo" />
                }
                onNavigate={handleNav}
                links={SIDEBAR_LINKS(activeLink)}
            // actions={<Button size="sm" onClick={() => setModalOpen(true)}>Sign in</Button>}
            // footer={<Badge variant="success">Signed out</Badge>}
            />

            <div className="demo-main">
                <header className="demo__header">
                    <div className="demo__header-left">
                        <Button
                            variant="ghost"
                            size="sm"
                            aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
                            onClick={() => setSidebarOpen((open) => !open)}
                        >
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                aria-hidden="true"
                            >
                                <path d="M3 6h18M3 12h18M3 18h18" />
                            </svg>
                        </Button>
                            <h1 className="demo__title">{pageTitle}</h1>
                    </div>

                    <div className="demo__profile">
                        <button type="button" className="demo__profile-trigger" aria-haspopup="menu">
                            <span className="demo__avatar" aria-hidden="true">
                                {adminInitial}
                            </span>
                            <span className="demo__profile-name">{adminName}</span>
                            <svg
                                className="demo__profile-caret"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        </button>

                        <div className="demo__profile-menu" role="menu">
                            <div className="demo__profile-menu-header">
                                <strong>{adminName}</strong>
                                <span>{adminEmail}</span>
                            </div>
                            <button
                                type="button"
                                className="demo__profile-item"
                                role="menuitem"
                                onClick={handleLogout}
                            >
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                                    <path d="M16 17l5-5-5-5M21 12H9" />
                                </svg>
                                Logout
                            </button>
                        </div>
                    </div>
                </header>

                <div className="demo">
                    {activeLink === 'dashboard' && (
                        <>
                            <div className="demo__welcome">
                                <h2 className="demo__welcome-title">Welcome back, {adminName}!</h2>
                                <p className="demo__welcome-text">
                                    Here is an overview of your {appName} admin panel.
                                </p>
                            </div>
                            <div className="demo__stats">
                                <StatCard label="Total Users" value={counts.users?.total ?? '—'} />
                                <StatCard label="Deleted" value={counts.users?.deleted ?? '—'} />
                                <StatCard label="Content" value={counts.contents ?? '—'} />
                                <StatCard label="Categories" value={counts.categories ?? '—'} />
                            </div>
                        </>
                    )}

                    {/* Users views. */}
                    {USER_KEYS.includes(activeLink) && activeLink !== 'users' && activeLink !== 'user-mantras' && (
                        <ManageUsers plan={activeLink} title={PAGE_TITLES[activeLink]} />
                    )}
                    {activeLink === 'user-mantras' && <ManageUserMantras />}

                    {/* Hidden for now: Subscription views. */}
                    {/* {activeLink === 'add-subscription' && <AddSubscription />}
                    {(activeLink === 'manage-subscription' || activeLink === 'subscription') && (
                        <ManageSubscription />
                    )} */}

                    {activeLink === 'add-help' && <AddHelp />}
                    {(activeLink === 'manage-help' || activeLink === 'help') && <ManageHelp />}

                    {activeLink === 'add-content' && <AddContent />}
                    {activeLink === 'library-content' && <ContentMeaning />}
                    {(activeLink === 'manage-content' || activeLink === 'sacred-library') && (
                        <ManageContent />
                    )}

                    {activeLink === 'add-category' && <AddCategory />}
                    {(activeLink === 'manage-category' || activeLink === 'category') && (
                        <ManageCategories />
                    )}

                    {activeLink === 'add-subcategory' && <AddSubcategory />}
                    {(activeLink === 'manage-subcategory' || activeLink === 'subcategory') && (
                        <ManageSubcategories />
                    )}

                    {/* Hidden for now: Payment Settings view. */}
                    {activeLink === 'settings-general' || activeLink === 'settings' ? (
                        <Settings section="general" />
                    ) : null}

                    {/* <Card title="Backend status" subtitle="Live data fetched with useApi">
                        {api.loading ? (
                            <div className="demo__flex">
                                <Spinner size="sm" /> Connecting to backend...
                            </div>
                        ) : api.error ? (
                            <div className="demo__flex">
                                <Badge variant="danger">Offline</Badge>
                                <span>
                                    {api.error} - start the backend with <code>npm run dev</code> in the backend folder
                                </span>
                            </div>
                        ) : (
                            <div className="demo__flex">
                                <Badge variant="success">Online</Badge>
                                <span>{api.data?.message}</span>
                            </div>
                        )}
                    </Card> */}

                    <div className="demo__gap" />

                    {/* <div className="demo__grid">
                        <Card title="Badges" subtitle="Tag labels with variants">
                            <div className="demo__badges">
                                <Badge>Default</Badge>
                                <Badge variant="info">Info</Badge>
                                <Badge variant="success">Active</Badge>
                                <Badge variant="warning">Pending</Badge>
                                <Badge variant="danger">Blocked</Badge>
                            </div>
                        </Card>

                        <Card title="Buttons" subtitle="Variants, sizes and states">
                            <div className="demo__badges">
                                <Button size="sm">Small</Button>
                                <Button>Medium</Button>
                                <Button size="lg">Large</Button>
                                <Button variant="secondary">Secondary</Button>
                                <Button variant="ghost">Ghost</Button>
                                <Button variant="danger">Danger</Button>
                            </div>
                            <div className="demo__badges">
                                <Button loading>Loading</Button>
                                <Button disabled>Disabled</Button>
                            </div>
                        </Card>
                    </div> */}

                    <div className="demo__gap" />

                    {/* <Card title="Form example" subtitle="Compose FormField + Input + Select + Button">
                        <div className="demo__row">
                            <FormField label="Full name" hint="As shown on your ID">
                                <Input placeholder="e.g. Dhileepan" />
                            </FormField>
                            <FormField label="Email address" error="This field is required">
                                <Input type="email" placeholder="you@example.com" error />
                            </FormField>
                        </div>
                        <FormField label="Role">
                            <Select options={roleOptions} placeholder="Choose a role..." />
                        </FormField>
                        <div className="demo__actions">
                            <Button onClick={handleSave}>Save changes</Button>
                            <Button variant="ghost">Cancel</Button>
                        </div>
                    </Card> */}

                    {/* <div className="demo__loading">
                        <Spinner size="sm" /> Loading small
                        <Spinner /> Loading medium
                        <Spinner size="lg" /> Loading large
                    </div> */}

                    <Modal
                        open={modalOpen}
                        onClose={() => setModalOpen(false)}
                        title="Edit profile"
                        size="sm"
                        footer={
                            <>
                                <Button variant="ghost" onClick={() => setModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button loading={saving} onClick={handleSave}>
                                    Save
                                </Button>
                            </>
                        }
                    >
                        <FormField label="Name" required id="name">
                            <Input
                                id="name"
                                value={profile.name}
                                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                            />
                        </FormField>
                        <div className="demo__gap" />
                        <FormField label="Email" id="email">
                            <Input
                                id="email"
                                type="email"
                                value={profile.email}
                                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                            />
                        </FormField>
                        <div className="demo__gap" />
                        <FormField label="Role" id="role">
                            <Select
                                id="role"
                                value={profile.role}
                                options={roleOptions}
                                onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                            />
                        </FormField>
                    </Modal>
                </div>

                <Footer
                    brand={appName}
                    text="Chant. Count. Connect."
                    links={[
                        { label: 'Privacy', to: '/privacy' },
                        { label: 'Terms', to: '/terms' },
                    ]}
                />
            </div>
        </div>
    )
}

export default AdminDashboard