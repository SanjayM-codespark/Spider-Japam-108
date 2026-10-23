import { useState } from 'react'

/**
 * True when this link or anything below it is the active page, so a menu opens
 * itself when the admin lands on a page nested inside it.
 */
function hasActiveDescendant(links = []) {
  return links.some((link) => link.active || hasActiveDescendant(link.subLinks))
}

/**
 * One level of the sidebar. Renders itself again for any child that has
 * subLinks, which is what gives groups like Sacred Library > Category their
 * third level. Nesting reuses the same class names, so each level picks up
 * another 12px of indent from `.ui-sidebar__submenu` on its own.
 */
function SidebarItems({ links, depth = 0, parent = null, openMenus, onToggle, onNavigate }) {
  const listClass = depth === 0 ? 'ui-sidebar__links' : 'ui-sidebar__submenu'

  const handleLeafClick = (e, link) => {
    if (!onNavigate) return
    e.preventDefault()
    // A top level link collapses every group, the way it always has. Nested
    // leaves leave their ancestors open so siblings stay reachable.
    onToggle(null)
    onNavigate(link.key ?? link.label, parent ?? link)
  }

  return (
    <ul className={listClass}>
      {links.map((link) => {
        const linkKey = link.key ?? link.label
        const hasSubLinks = link.subLinks && link.subLinks.length > 0

        if (hasSubLinks) {
          const isOpen =
            openMenus[linkKey] ??
            (link.defaultOpen === true || hasActiveDescendant(link.subLinks))

          // A group renders as a button: it toggles instead of navigating.
          // `ui-sidebar__parent` carries the button reset and the space-between
          // that puts the chevron on the right at any depth.
          const groupClass =
            depth === 0
              ? `ui-sidebar__link ui-sidebar__parent${link.active ? ' ui-sidebar__link--active' : ''}`
              : `ui-sidebar__sublink ui-sidebar__parent${link.active ? ' ui-sidebar__sublink--active' : ''}`

          return (
            <li key={`${linkKey}-group`}>
              <button type="button" className={groupClass} onClick={() => onToggle(linkKey)} aria-expanded={isOpen}>
                <span className="ui-sidebar__link-main">
                  {link.icon && <i className={`fas ${link.icon} ui-sidebar__icon`} aria-hidden="true" />}
                  {link.label}
                </span>
                <span
                  className={`ui-sidebar__chevron${isOpen ? ' ui-sidebar__chevron--open' : ''}`}
                  aria-hidden="true"
                >
                  ▸
                </span>
              </button>
              {isOpen && (
                <SidebarItems
                  links={link.subLinks}
                  depth={depth + 1}
                  parent={link}
                  openMenus={openMenus}
                  onToggle={onToggle}
                  onNavigate={onNavigate}
                />
              )}
            </li>
          )
        }

        const leafClass =
          depth === 0
            ? `ui-sidebar__link${link.active ? ' ui-sidebar__link--active' : ''}`
            : `ui-sidebar__sublink${link.active ? ' ui-sidebar__sublink--active' : ''}`

        return (
          <li key={linkKey}>
            <a
              href={link.href ?? '#'}
              className={leafClass}
              onClick={(e) => handleLeafClick(e, link)}
            >
              {link.icon && <i className={`fas ${link.icon} ui-sidebar__icon`} aria-hidden="true" />}
              {link.label}
            </a>
          </li>
        )
      })}
    </ul>
  )
}

function Sidebar({ open = true, brand, links = [], onNavigate, actions, footer, className = '' }) {
  const [openMenus, setOpenMenus] = useState({})

  if (!open) return null

  // Passing null closes every group, which is how a top level link resets the
  // sidebar.
  const toggleMenu = (key) => {
    setOpenMenus((prev) => (key === null ? {} : { ...prev, [key]: !prev[key] }))
  }

  return (
    <aside className={`ui-sidebar${className ? ` ${className}` : ''}`}>
      {brand && <div className="ui-sidebar__brand">{brand}</div>}
      <SidebarItems
        links={links}
        depth={0}
        openMenus={openMenus}
        onToggle={toggleMenu}
        onNavigate={onNavigate}
      />
      {actions && <div className="ui-sidebar__actions">{actions}</div>}
      {footer && <div className="ui-sidebar__footer">{footer}</div>}
    </aside>
  )
}

export default Sidebar
