import { Link, useLocation } from 'react-router-dom'
import { useAuth }           from '../context/AuthContext'
import { useCart }           from '../context/CartContext'
import logo                  from '../assets/logo_clean.png'

const NAV_LINKS = {
  retailer:   [
    { to: '/',                    label: 'Shop'      },
    { to: '/orders',              label: 'My Orders' },
  ],
  wholesaler: [
    { to: '/wholesaler',          label: 'Orders'    },
    { to: '/wholesaler/products', label: 'Products'  },
    { to: '/wholesaler/analytics',label: 'Analytics' },
    { to: '/wholesaler/earnings', label: 'Earnings'  },
  ],
  logistics:  [
    { to: '/logistics',           label: 'Deliveries'},
    { to: '/logistics/routes',    label: 'Routes'    },
    { to: '/logistics/earnings',  label: 'Earnings'  },
  ],
  admin:      [
    { to: '/admin',               label: 'Dashboard' },
    { to: '/admin/logistics',     label: 'Logistics' },
    { to: '/admin/orders',        label: 'Orders'    },
  ],
}

function isActive(linkTo, pathname) {
  if (linkTo === '/') return pathname === '/' || pathname === '/shop'
  // exact match for root-level role dashboards to avoid /wholesaler matching /wholesaler/products
  const exact = ['/wholesaler', '/logistics', '/admin']
  if (exact.includes(linkTo)) return pathname === linkTo
  return pathname.startsWith(linkTo)
}

// initials from full name
function initials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const { count }        = useCart()
  const location         = useLocation()

  const roleLinks = NAV_LINKS[user?.role] || []

  return (
    <nav style={S.nav}>
      <div style={S.inner}>

        {/* Logo */}
        <Link to="/" style={S.logoWrap}>
          <img src={logo} alt="order.it" style={S.logoImg} />
        </Link>

        {/* Nav links */}
        <div style={S.links}>
          {roleLinks.map(l => {
            const active = isActive(l.to, location.pathname)
            return (
              <Link
                key={l.to}
                to={l.to}
                style={{ ...S.link, ...(active ? S.linkActive : {}) }}
              >
                {l.label}
                {active && <span style={S.activeDot} />}
              </Link>
            )
          })}
        </div>

        {/* Right side */}
        <div style={S.right}>

          {/* Cart — retailer only */}
          {user?.role === 'retailer' && (
            <Link
              to="/cart"
              style={{
                ...S.iconBtn,
                ...(isActive('/cart', location.pathname) ? S.iconBtnActive : {}),
              }}
              aria-label="Cart"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/>
              </svg>
              {count > 0 && (
                <span style={S.badge}>{count > 99 ? '99+' : count}</span>
              )}
            </Link>
          )}

          {/* Profile avatar — navigates to /profile */}
          <Link
            to="/profile"
            style={{
              ...S.avatar,
              ...(isActive('/profile', location.pathname) ? S.avatarActive : {}),
            }}
            aria-label="Profile and settings"
            title={user?.name}
          >
            {initials(user?.name)}
          </Link>

        </div>
      </div>
    </nav>
  )
}

const S = {
  nav: {
    background: '#0d2347',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  inner: {
    maxWidth: '430px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    height: '56px',
    padding: '0 14px',
    gap: '6px',
  },

  // logo
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
    flexShrink: 0,
    marginRight: '8px',
  },
  logoImg: {
    height: '38px',
    width: 'auto',
    objectFit: 'contain',
    mixBlendMode: 'screen',
  },

  // nav links
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    flex: 1,
    overflow: 'hidden',
  },
  link: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '6px 10px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '500',
    color: 'rgba(255,255,255,0.55)',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    transition: 'color 0.15s, background 0.15s',
    letterSpacing: '0.01em',
  },
  linkActive: {
    color: '#fff',
    background: 'rgba(255,255,255,0.10)',
  },
  activeDot: {
    position: 'absolute',
    bottom: '3px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    background: '#00c853',
  },

  // right side
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginLeft: 'auto',
    flexShrink: 0,
  },

  // cart icon button
  iconBtn: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.10)',
    color: 'rgba(255,255,255,0.70)',
    textDecoration: 'none',
    flexShrink: 0,
  },
  iconBtnActive: {
    background: 'rgba(0,200,83,0.15)',
    borderColor: 'rgba(0,200,83,0.35)',
    color: '#00c853',
  },
  badge: {
    position: 'absolute',
    top: '-5px',
    right: '-5px',
    background: '#00c853',
    color: '#fff',
    fontSize: '8px',
    fontWeight: '800',
    minWidth: '15px',
    height: '15px',
    borderRadius: '99px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 3px',
    border: '2px solid #0d2347',
  },

  // avatar
  avatar: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #1a3a6b, #00c853)',
    border: '2px solid rgba(255,255,255,0.18)',
    color: '#fff',
    fontSize: '11px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    letterSpacing: '0.5px',
    textDecoration: 'none',
    flexShrink: 0,
    transition: 'border-color 0.15s',
  },
  avatarActive: {
    borderColor: '#00c853',
  },
}