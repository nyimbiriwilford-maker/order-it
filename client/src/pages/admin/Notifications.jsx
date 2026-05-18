import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import { Sidebar } from './Dashboard'

const S = {
  page:    { minHeight: '100vh', background: '#f0f0f0', fontFamily: 'Arial, sans-serif' },
  main:    { marginLeft: '220px', padding: '28px 32px', minHeight: '100vh' },
  topBar:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' },
  pageTitle:  { fontSize: '22px', fontWeight: 'bold', color: '#1a3a6b' },
  pageSub:    { fontSize: '13px', color: '#888', marginTop: '2px' },
  summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' },
  summaryCard: (accent) => ({
    background: '#fff', borderRadius: '12px', padding: '20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderTop: `3px solid ${accent}`,
  }),
  summaryValue: { fontSize: '28px', fontWeight: 'bold', color: '#1a3a6b' },
  summaryLabel: { fontSize: '12px', color: '#888', marginTop: '4px' },
  filterBar: { display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' },
  filterBtn: (active) => ({
    padding: '7px 16px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer',
    fontWeight: active ? '600' : '400',
    background: active ? '#1a3a6b' : '#fff',
    color:      active ? '#fff'    : '#555',
    border:     active ? '1px solid #1a3a6b' : '1px solid #ddd',
    transition: 'all 0.15s',
  }),
  feedWrap: {
    background: '#fff', borderRadius: '12px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden',
  },
  notifRow: (severity, isLast) => ({
    display: 'flex', alignItems: 'center', gap: '16px',
    padding: '16px 20px',
    borderBottom: isLast ? 'none' : '1px solid #f0f0f0',
    borderLeft: `4px solid ${SEVERITY_COLOR[severity]}`,
    background: '#fff',
    transition: 'background 0.15s',
  }),
  iconCircle: (severity) => ({
    width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '18px', background: SEVERITY_COLOR[severity] + '18',
  }),
  notifBody:  { flex: 1, minWidth: 0 },
  notifTitle: { fontSize: '14px', fontWeight: '600', color: '#222' },
  notifSub:   { fontSize: '12px', color: '#888', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  notifMeta:  { fontSize: '11px', color: '#bbb', marginTop: '4px' },
  severityPill: (severity) => ({
    flexShrink: 0, padding: '3px 10px', borderRadius: '10px',
    fontSize: '11px', fontWeight: '700',
    background: SEVERITY_COLOR[severity] + '20',
    color: SEVERITY_COLOR[severity],
    textTransform: 'uppercase',
  }),
  actionBtn: {
    flexShrink: 0, padding: '6px 14px', background: '#1a3a6b', color: '#fff',
    border: 'none', borderRadius: '7px', fontSize: '12px', cursor: 'pointer', fontWeight: '600',
  },
  empty:   { textAlign: 'center', padding: '48px', color: '#aaa', fontSize: '14px' },
  spinner: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#888', fontSize: '14px' },
  toast: (ok) => ({
    position: 'fixed', bottom: '24px', right: '24px',
    background: ok ? '#1b5e20' : '#b71c1c', color: '#fff',
    padding: '12px 20px', borderRadius: '10px', fontSize: '13px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 999,
  }),
  refreshBtn: {
    padding: '8px 16px', background: '#1a3a6b', color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
  },
}

const SEVERITY_COLOR = { high: '#e53935', medium: '#f59e0b', low: '#3b82f6' }

const TYPE_META = {
  stuck_order:       { icon: '⏱', label: 'Stuck Order'      },
  pending_logistics: { icon: '🚚', label: 'Pending Approval' },
  open_dispute:      { icon: '⚖️',  label: 'Dispute'          },
  pending_escrow:    { icon: '💰', label: 'Escrow'           },
}

const FILTERS = [
  { key: 'all',               label: 'All'               },
  { key: 'high',              label: '🔴 High'           },
  { key: 'medium',            label: '🟡 Medium'         },
  { key: 'low',               label: '🔵 Low'            },
  { key: 'stuck_order',       label: 'Stuck Orders'      },
  { key: 'pending_logistics', label: 'Pending Approvals' },
  { key: 'open_dispute',      label: 'Disputes'          },
  { key: 'pending_escrow',    label: 'Escrow'            },
]

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h    = Math.floor(diff / 3_600_000)
  if (h < 1)  return 'just now'
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Use the `link` field from the backend directly ────────────────────────
// Backend already builds the correct deep-link per notification type:
//   stuck_order       → /admin/orders/<orderId>      (order detail page)
//   open_dispute      → /admin/disputes?id=<id>      (auto-opens drawer)
//   pending_logistics → /admin/logistics              (pending tab)
//   pending_escrow    → /admin/escrow?orderId=<id>   (highlights row)
function resolveLink(n) {
  // Use the link provided by the backend — it already contains the correct
  // ID and path for every notification type.
  return n.link || '/admin'
}

export default function AdminNotifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [counts,        setCounts]        = useState({ high: 0, medium: 0, low: 0 })
  const [loading,       setLoading]       = useState(true)
  const [filter,        setFilter]        = useState('all')
  const [toast,         setToast]         = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await api.get('/admin/notifications')
      setNotifications(res.data.notifications || [])
      setCounts(res.data.counts || { high: 0, medium: 0, low: 0 })
    } catch {
      showToast('Failed to load notifications', false)
    } finally {
      setLoading(false)
    }
  }

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const visible = notifications.filter(n => {
    if (filter === 'all') return true
    if (['high', 'medium', 'low'].includes(filter)) return n.severity === filter
    return n.type === filter
  })

  return (
    <div style={S.page}>
      <Sidebar active="/admin/notifications" />
      <div style={S.main}>

        <div style={S.topBar}>
          <div>
            <div style={S.pageTitle}>Notifications</div>
            <div style={S.pageSub}>
              {notifications.length} item{notifications.length !== 1 ? 's' : ''} needing attention
            </div>
          </div>
          <button style={S.refreshBtn} onClick={load}>↺ Refresh</button>
        </div>

        <div style={S.summaryRow}>
          {[
            { label: 'Total Alerts',    value: notifications.length, accent: '#1a3a6b' },
            { label: 'High Priority',   value: counts.high,          accent: '#e53935' },
            { label: 'Medium Priority', value: counts.medium,        accent: '#f59e0b' },
            { label: 'Low Priority',    value: counts.low,           accent: '#3b82f6' },
          ].map(c => (
            <div key={c.label} style={S.summaryCard(c.accent)}>
              <div style={S.summaryValue}>{c.value}</div>
              <div style={S.summaryLabel}>{c.label}</div>
            </div>
          ))}
        </div>

        <div style={S.filterBar}>
          {FILTERS.map(f => (
            <button key={f.key} style={S.filterBtn(filter === f.key)}
              onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>

        <div style={S.feedWrap}>
          {loading ? (
            <div style={S.spinner}>Loading notifications…</div>
          ) : visible.length === 0 ? (
            <div style={S.empty}>
              {filter === 'all' ? '✓ No alerts — everything looks good' : `No ${filter} alerts`}
            </div>
          ) : (
            visible.map((n, i) => {
              const meta = TYPE_META[n.type] || { icon: '📋', label: n.type }
              return (
                <div key={`${n.type}-${String(n.id)}`}
                  style={S.notifRow(n.severity, i === visible.length - 1)}>
                  <div style={S.iconCircle(n.severity)}>{meta.icon}</div>
                  <div style={S.notifBody}>
                    <div style={S.notifTitle}>{n.title}</div>
                    <div style={S.notifSub}>{n.subtitle}</div>
                    <div style={S.notifMeta}>{meta.label} · {timeAgo(n.createdAt)}</div>
                  </div>
                  <span style={S.severityPill(n.severity)}>{n.severity}</span>
                  <button style={S.actionBtn} onClick={() => navigate(resolveLink(n))}>
                    View →
                  </button>
                </div>
              )
            })
          )}
        </div>

      </div>
      {toast && <div style={S.toast(toast.ok)}>{toast.msg}</div>}
    </div>
  )
}