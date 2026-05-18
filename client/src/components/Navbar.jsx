import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import logo from '../assets/logo_clean.png'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { count }        = useCart()

  const links = {
    retailer:   [{ to: '/', label: 'Shop' }, { to: '/orders', label: 'My Orders' }],
    wholesaler: [{ to: '/wholesaler', label: 'Orders' }, { to: '/wholesaler/products', label: 'Products' }, { to: '/wholesaler/analytics', label: 'Analytics' }, { to: '/wholesaler/earnings', label: 'Earnings' }],
    logistics:  [{ to: '/logistics', label: 'Deliveries' }, { to: '/logistics/routes', label: 'Routes' }, { to: '/logistics/earnings', label: 'Earnings' }],
    admin:      [{ to: '/admin', label: 'Dashboard' }, { to: '/admin/logistics', label: 'Logistics' }, { to: '/admin/orders', label: 'Orders' }],
  }

  const roleLinks = links[user?.role] || []

  return (
    <nav style={S.nav}>
      <div style={S.inner}>

        {/* Logo only — image already contains "order .it" text */}
        <Link to="/" style={S.logoWrap}>
          <img src={logo} alt="order.it" style={S.logoImg} />
        </Link>

        <div style={S.links}>
          {roleLinks.map(l => (
            <Link key={l.to} to={l.to} style={S.link}>{l.label}</Link>
          ))}
        </div>

        <div style={S.right}>
          {user?.role === 'retailer' && (
            <Link to="/cart" style={S.cartBtn}>
              🛒 {count > 0 && <span style={S.badge}>{count}</span>}
            </Link>
          )}
          <span style={S.name}>{user?.name}</span>
          <button style={S.logout} onClick={logout}>Logout</button>
        </div>

      </div>
    </nav>
  )
}

const S = {
  nav:      { background: '#1a3a6b', padding: '0 20px', position: 'sticky', top: 0, zIndex: 100 },
  inner:    { maxWidth: '430px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' },
  logoWrap: { display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 },
  // screen blend: white areas in the image become transparent on the dark navy background
  // width tall enough to read "order .it" clearly in a 56px bar
  logoImg:  { height: '40px', width: 'auto', objectFit: 'contain', mixBlendMode: 'screen' },
  links:    { display: 'flex', gap: '16px' },
  link:     { color: '#ffffffcc', fontSize: '13px', textDecoration: 'none', fontWeight: '500' },
  right:    { display: 'flex', alignItems: 'center', gap: '10px' },
  cartBtn:  { color: '#fff', fontSize: '20px', textDecoration: 'none', position: 'relative' },
  badge:    { position: 'absolute', top: '-6px', right: '-8px', background: '#00c853', color: '#fff', borderRadius: '50%', fontSize: '10px', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' },
  name:     { color: '#ffffffcc', fontSize: '12px' },
  logout:   { background: 'none', border: '1px solid #ffffff44', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' },
}