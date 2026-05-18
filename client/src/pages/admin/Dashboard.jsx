import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import { useAuth } from '../../context/AuthContext'

const S = {
  page: { minHeight: '100vh', background: '#f0f0f0', fontFamily: 'Arial, sans-serif' },
  sidebar: {
    position: 'fixed', top: 0, left: 0, bottom: 0, width: '220px',
    background: '#1a3a6b', display: 'flex', flexDirection: 'column', zIndex: 100,
  },
  sidebarLogo: { padding: '24px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.12)' },
  logoMain: { fontSize: '20px', fontWeight: 'bold', color: '#fff', letterSpacing: '1px' },
  logoSub:  { fontSize: '11px', color: '#00c853', marginTop: '2px' },
  navList:  { flex: 1, padding: '12px 0', overflowY: 'auto' },
  navItem: (active) => ({
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '11px 20px', cursor: 'pointer',
    background: active ? 'rgba(0,200,83,0.15)' : 'transparent',
    borderLeft: active ? '3px solid #00c853' : '3px solid transparent',
    color: active ? '#00c853' : 'rgba(255,255,255,0.75)',
    fontSize: '14px', fontWeight: active ? '600' : '400',
    transition: 'all 0.15s',
  }),
  sidebarFooter: { padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.12)' },
  logoutBtn: {
    width: '100%', padding: '9px', background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px',
    color: '#fff', fontSize: '13px', cursor: 'pointer',
  },
  main:  { marginLeft: '220px', padding: '28px 32px', minHeight: '100vh' },
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' },
  pageTitle:    { fontSize: '22px', fontWeight: 'bold', color: '#1a3a6b' },
  pageSubtitle: { fontSize: '13px', color: '#888', marginTop: '2px' },
  adminBadge: {
    background: '#1a3a6b', color: '#fff',
    padding: '6px 14px', borderRadius: '20px', fontSize: '13px',
  },
  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '16px', marginBottom: '28px',
  },
  statCard: (accent) => ({
    background: '#fff', borderRadius: '12px', padding: '20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderTop: `3px solid ${accent}`,
  }),
  statValue: { fontSize: '28px', fontWeight: 'bold', color: '#1a3a6b' },
  statLabel: { fontSize: '12px', color: '#888', marginTop: '4px' },
  statAlert: { fontSize: '11px', color: '#e53935', marginTop: '6px', fontWeight: '600' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' },
  card: {
    background: '#fff', borderRadius: '12px', padding: '20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
  },
  cardTitle: {
    fontSize: '14px', fontWeight: 'bold', color: '#1a3a6b',
    marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  badge: (color) => ({
    background: color, color: '#fff', fontSize: '11px',
    padding: '2px 8px', borderRadius: '10px',
  }),
  pendingItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 0', borderBottom: '1px solid #f0f0f0',
  },
  companyName: { fontSize: '14px', fontWeight: '600', color: '#222' },
  companyMeta: { fontSize: '12px', color: '#888', marginTop: '2px' },
  btnRow:    { display: 'flex', gap: '6px' },
  btnApprove: {
    padding: '5px 12px', background: '#00c853', color: '#fff',
    border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '600',
  },
  btnReject: {
    padding: '5px 12px', background: '#fff', color: '#e53935',
    border: '1px solid #e53935', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
  },
  stuckItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 0', borderBottom: '1px solid #f0f0f0',
  },
  orderId:   { fontSize: '13px', fontWeight: '600', color: '#1a3a6b', fontFamily: 'monospace' },
  orderMeta: { fontSize: '12px', color: '#888', marginTop: '2px' },
  statusPill: (color) => ({
    display: 'inline-block', padding: '3px 10px', borderRadius: '10px',
    fontSize: '11px', fontWeight: '600', background: color + '22', color,
  }),
  viewBtn: {
    padding: '5px 12px', background: '#1a3a6b', color: '#fff',
    border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
  },
  emptyMsg: { color: '#aaa', fontSize: '13px', textAlign: 'center', padding: '20px 0' },
  spinner:  { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#888', fontSize: '14px' },
}

const STATUS_COLORS = {
  pending:             '#f59e0b',
  confirmed:           '#3b82f6',
  ready_for_collection:'#8b5cf6',
  collected:           '#06b6d4',
  in_transit:          '#f97316',
  delivered:           '#10b981',
  completed:           '#00c853',
  disputed:            '#e53935',
  cancelled:           '#9e9e9e',
}

// ── In Dashboard.jsx, replace the NAV array with this one ───────────────────
// Adds "Payments" between Escrow and Analytics

// ─────────────────────────────────────────────────────────────────────────────
// PATCH: replace the existing NAV array in client/src/pages/admin/Dashboard.jsx
// with this one. Only change: 'Revenue' entry added between Payments & Analytics.
// ─────────────────────────────────────────────────────────────────────────────

const NAV = [
  { label: 'Dashboard',     path: '/admin',                icon: '📊' },
  { label: 'Users',         path: '/admin/users',          icon: '👥' },
  { label: 'Logistics',     path: '/admin/logistics',      icon: '🚚' },
  { label: 'Orders',        path: '/admin/orders',         icon: '📦' },
  { label: 'Disputes',      path: '/admin/disputes',       icon: '⚖️'  },
  { label: 'Escrow',        path: '/admin/escrow',         icon: '💰' },
  { label: 'Payments',      path: '/admin/payments',       icon: '💳' },
  { label: 'Revenue',       path: '/admin/revenue',        icon: '💵' },  // ← NEW
  { label: 'Analytics',     path: '/admin/analytics',      icon: '📈' },
  { label: 'Notifications', path: '/admin/notifications',  icon: '🔔' },
  { label: 'Audit Log',     path: '/admin/audit',          icon: '🔍' },
  { label: 'Config',        path: '/admin/config',         icon: '⚙️'  },
]

function Sidebar({ active }) {
  const navigate      = useNavigate()
  const { logout, user } = useAuth()
  return (
    <div style={S.sidebar}>
      <div style={S.sidebarLogo}>
        <div style={S.logoMain}>ORDER <span style={{ color: '#00c853' }}>IT</span></div>
        <div style={S.logoSub}>Admin Panel</div>
      </div>
      <div style={S.navList}>
        {NAV.map(n => (
          <div key={n.path} style={S.navItem(active === n.path)}
            onClick={() => navigate(n.path)}>
            <span>{n.icon}</span>
            <span>{n.label}</span>
          </div>
        ))}
      </div>
      <div style={S.sidebarFooter}>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
          {user?.name}
        </div>
        <button style={S.logoutBtn} onClick={logout}>Sign out</button>
      </div>
    </div>
  )
}

export { Sidebar, NAV, STATUS_COLORS }

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats,     setStats]     = useState(null)
  const [pending,   setPending]   = useState([])
  const [stuck,     setStuck]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [actionMsg, setActionMsg] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [statsRes, logisticsRes, ordersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/logistics?status=pending'),
        api.get('/admin/orders?limit=100'),
      ])
      setStats(statsRes.data)
      setPending(logisticsRes.data.slice(0, 5))
      const cutoff = Date.now() - 48 * 60 * 60 * 1000
      const stuckList = (ordersRes.data.orders || []).filter(o =>
        !['completed', 'cancelled', 'disputed'].includes(o.orderStatus) &&
        new Date(o.updatedAt).getTime() < cutoff
      ).slice(0, 5)
      setStuck(stuckList)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(id) {
    try {
      await api.put(`/admin/logistics/${id}/approve`)
      setActionMsg('Company approved ✓')
      setPending(p => p.filter(c => c._id !== id))
      setStats(s => s ? { ...s, pendingLogistics: s.pendingLogistics - 1 } : s)
      setTimeout(() => setActionMsg(''), 3000)
    } catch { setActionMsg('Action failed') }
  }

  async function handleReject(id) {
    const reason = window.prompt('Rejection reason (required):')
    if (!reason) return
    try {
      await api.put(`/admin/logistics/${id}/reject`, { reason })
      setActionMsg('Company rejected')
      setPending(p => p.filter(c => c._id !== id))
      setTimeout(() => setActionMsg(''), 3000)
    } catch { setActionMsg('Action failed') }
  }

  const STAT_CARDS = stats ? [
    { label: 'Total Users',         value: stats.totalUsers,       accent: '#1a3a6b' },
    { label: 'Total Orders',        value: stats.totalOrders,      accent: '#3b82f6' },
    { label: 'Orders Today',        value: stats.ordersToday,      accent: '#00c853' },
    { label: 'Pending Approvals',   value: stats.pendingLogistics, accent: '#f59e0b', alert: stats.pendingLogistics > 0 ? `${stats.pendingLogistics} awaiting review` : null },
    { label: 'Open Disputes',       value: stats.openDisputes,     accent: '#e53935', alert: stats.openDisputes > 0 ? `${stats.openDisputes} need resolution` : null },
    { label: 'Stuck Orders (48h+)', value: stats.stuckOrders,      accent: '#f97316', alert: stats.stuckOrders > 0 ? 'Needs attention' : null },
    { label: 'Escrow Held',         value: `MWK ${Number(stats.escrowTotal || 0).toLocaleString()}`, accent: '#8b5cf6' },
  ] : []

  return (
    <div style={S.page}>
      <Sidebar active="/admin" />
      <div style={S.main}>

        <div style={S.topBar}>
          <div>
            <div style={S.pageTitle}>Dashboard</div>
            <div style={S.pageSubtitle}>
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <div style={S.adminBadge}>Admin</div>
        </div>

        {actionMsg && (
          <div style={{ background: '#e8f5e9', border: '1px solid #00c853', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', fontSize: '13px', color: '#1b5e20' }}>
            {actionMsg}
          </div>
        )}

        {loading ? (
          <div style={S.spinner}>Loading dashboard…</div>
        ) : (
          <>
            <div style={S.statsGrid}>
              {STAT_CARDS.map(c => (
                <div key={c.label} style={S.statCard(c.accent)}>
                  <div style={S.statValue}>{c.value}</div>
                  <div style={S.statLabel}>{c.label}</div>
                  {c.alert && <div style={S.statAlert}>⚠ {c.alert}</div>}
                </div>
              ))}
            </div>

            <div style={S.row}>
              <div style={S.card}>
                <div style={S.cardTitle}>
                  <span>Pending Logistics Approvals</span>
                  {pending.length > 0 && <span style={S.badge('#f59e0b')}>{pending.length}</span>}
                </div>
                {pending.length === 0 ? (
                  <div style={S.emptyMsg}>No pending approvals ✓</div>
                ) : pending.map(c => (
                  <div key={c._id} style={S.pendingItem}>
                    <div>
                      <div style={S.companyName}>{c.name}</div>
                      <div style={S.companyMeta}>{c.email} · {c.phone}</div>
                    </div>
                    <div style={S.btnRow}>
                      <button style={S.btnApprove} onClick={() => handleApprove(c._id)}>Approve</button>
                      <button style={S.btnReject}  onClick={() => handleReject(c._id)}>Reject</button>
                    </div>
                  </div>
                ))}
                {stats?.pendingLogistics > 5 && (
                  <div style={{ textAlign: 'right', marginTop: '10px' }}>
                    <button style={S.viewBtn} onClick={() => navigate('/admin/logistics?status=pending')}>
                      View all {stats.pendingLogistics} →
                    </button>
                  </div>
                )}
              </div>

              <div style={S.card}>
                <div style={S.cardTitle}>
                  <span>Stuck Orders (48h+)</span>
                  {stuck.length > 0 && <span style={S.badge('#f97316')}>{stuck.length}</span>}
                </div>
                {stuck.length === 0 ? (
                  <div style={S.emptyMsg}>No stuck orders ✓</div>
                ) : stuck.map(o => (
                  <div key={o._id} style={S.stuckItem}>
                    <div>
                      <div style={S.orderId}>#{String(o._id).slice(-8).toUpperCase()}</div>
                      <div style={S.orderMeta}>
                        {o.retailer?.businessName || o.retailer?.name} ·{' '}
                        Last updated {Math.floor((Date.now() - new Date(o.updatedAt)) / 3600000)}h ago
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={S.statusPill(STATUS_COLORS[o.orderStatus] || '#888')}>
                        {o.orderStatus}
                      </span>
                      <button style={S.viewBtn} onClick={() => navigate(`/admin/orders/${o._id}`)}>View</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={S.row}>
              {[
                { label: 'Manage Users',   sub: 'View, suspend, or activate accounts', path: '/admin/users',     icon: '👥', color: '#1a3a6b' },
                { label: 'All Orders',     sub: 'Full order oversight with filters',    path: '/admin/orders',    icon: '📦', color: '#3b82f6' },
                { label: 'Disputes',       sub: 'Review and resolve open disputes',     path: '/admin/disputes',  icon: '⚖️',  color: '#e53935' },
                { label: 'Escrow',         sub: 'Release, freeze, or refund funds',     path: '/admin/escrow',    icon: '💰', color: '#8b5cf6' },
              ].map(q => (
                <div key={q.path} style={{ ...S.card, cursor: 'pointer', borderLeft: `4px solid ${q.color}` }}
                  onClick={() => navigate(q.path)}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{q.icon}</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1a3a6b' }}>{q.label}</div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{q.sub}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}