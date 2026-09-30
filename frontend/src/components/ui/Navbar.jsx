function Navbar({ brand, links = [], actions, className = '' }) {
  return (
    <nav className={`ui-navbar${className ? ` ${className}` : ''}`}>
      <div className="ui-navbar__brand">{brand}</div>
      <ul className="ui-navbar__links">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              className={`ui-navbar__link${link.active ? ' ui-navbar__link--active' : ''}`}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
      {actions && <div className="ui-navbar__actions">{actions}</div>}
    </nav>
  )
}

export default Navbar