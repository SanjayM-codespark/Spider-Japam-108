import { Link } from 'react-router-dom'

function Footer({ brand, text, links = [], year = new Date().getFullYear() }) {
  return (
    <footer className="ui-footer">
      <span className="ui-footer__brand">{brand}</span>
      {text && <span className="ui-footer__text">{text}</span>}
      <ul className="ui-footer__links">
        {links.map((link) => (
          <li key={link.label}>
            {link.to ? (
              <Link to={link.to} className="ui-footer__link">
                {link.label}
              </Link>
            ) : (
              <a href={link.href} className="ui-footer__link">
                {link.label}
              </a>
            )}
          </li>
        ))}
      </ul>
      <span className="ui-footer__copy">
        &copy; {year} {brand}
      </span>
    </footer>
  )
}

export default Footer