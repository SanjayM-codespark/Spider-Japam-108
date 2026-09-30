import LegalPage from './LegalPage.jsx'
import { useHelpPage } from '../useHelpPage.js'
import { useSettings } from '../useSettings.js'

/**
 * The copy that shipped with the app, kept as the fallback for when no help
 * page carries the "privacy" key. See useHelpPage.
 *
 * Takes the app name because the text refers to the app by name, which the
 * admin panel can change.
 */
const renderFallback = (appName) => (
    <>
        <section>
            <h2>1. Information we collect</h2>
            <p>
                {appName} collects the information you provide directly, such as your name and
                email address, along with activity data like your chanting counts and session
                history.
            </p>
        </section>
        <section>
            <h2>2. How we use your information</h2>
            <p>
                We use your information to provide and improve the service, to sync your practice
                across your devices, and to respond to support requests. We do not sell your
                personal information to third parties.
            </p>
        </section>
        <section>
            <h2>3. Data storage and sharing</h2>
            <p>
                Your data is stored on the servers that run the service so that it can sync between
                your devices. We share it only with the hosting providers needed to operate the
                service, and we retain it until you delete your account.
            </p>
        </section>
        <section>
            <h2>4. Your rights</h2>
            <p>
                You can access, correct, export, or delete your data at any time from the app, and
                you can ask us to delete your account by contacting support.
            </p>
        </section>
        <section>
            <h2>5. Changes to this policy</h2>
            <p>
                We may update this policy from time to time. Continued use of the app after changes
                are posted means you accept the revised policy.
            </p>
        </section>
    </>
)

function PrivacyPolicy() {
    const { app_name: appName } = useSettings()
    const { html, title } = useHelpPage('privacy')

    return (
        <LegalPage title={title || 'Privacy Policy'} updated="January 15, 2026">
            {html === null ? renderFallback(appName) : <div dangerouslySetInnerHTML={{ __html: html }} />}
        </LegalPage>
    )
}

export default PrivacyPolicy
