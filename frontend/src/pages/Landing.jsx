import { Button, Footer } from '../components/ui/index.js'
import { usePageTitle } from '../usePageTitle.js'
import { useSettings } from '../useSettings.js'
import logo from '../assets/japam108_logo.png'
import './Landing.css'

function Landing() {
  usePageTitle()
  const { app_name: appName, playstore_link: googlePlayUrl, app_store_link: appStoreUrl } = useSettings()

  return (
    <div className="landing">
      <main className="landing__main">
        <div className="landing__hero">
          <img src={logo} alt="Japam108 logo" className="landing__logo" />
          {/* <h1 className="landing__title">{appName}</h1>
          <p className="landing__tagline">Chant. Count. Connect.</p> */}
          <div className="landing__stores">
            <Button href={googlePlayUrl} size="lg">
              Get it on Google Play
            </Button>
            <Button href={appStoreUrl} size="lg" variant="secondary">
              Download on the App Store
            </Button>
          </div>
        </div>
      </main>

      <Footer
        brand={appName}
        text="Chanting made simple"
        links={[
          { label: 'Privacy', to: '/privacy' },
          { label: 'Terms', to: '/terms' },
        ]}
      />
    </div>
  )
}

export default Landing