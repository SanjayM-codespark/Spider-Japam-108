import { Footer } from '../components/ui/index.js'
import { usePageTitle } from '../usePageTitle.js'
import { useSettings } from '../useSettings.js'
import './LegalPage.css'

function LegalPage({ title, updated, children }) {
    usePageTitle(title)
    const { app_name: appName } = useSettings()
    const links = [
        { label: 'Privacy', to: '/privacy' },
        { label: 'Terms', to: '/terms' },
    ]

    return (
        <div className="legal-page">
            <main className="legal">
                <article className="legal__paper">
                    <h1 className="legal__title">{title}</h1>
                    {updated && <p className="legal__updated">Last updated: {updated}</p>}
                    <div className="legal__body">{children}</div>
                </article>
            </main>

            <Footer brand={appName} text="Chant. Count. Connect." links={links} />
        </div>
    )
}

export default LegalPage