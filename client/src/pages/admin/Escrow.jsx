import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import { Sidebar } from './Dashboard'

const S = {
  page:  { minHeight: '100vh', background: '#f0f0f0', fontFamily: 'Arial, sans-serif' },
  main:  { marginLeft: '220px', padding: '28px 32px', minHeight: '100vh' },
  topBar:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' },
  pageTitle: { fontSize: '22px', fontWeight: 'bold', color: '#1a3a6b' },
  pageSub:   { fontSize: '13px', color: '#888', marginTop: '2px' },
  summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' },
  summaryCard: (accent) => ({
    background: '#fff', borderRadius: '12px', padding: '20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderTop: `3px solid ${accent}`,
  }),
  summaryValue: { fontSize: '26px', fontWeight: 'bold', color: '#1a3a6b' },
  summaryLabel: { fontSize: '12px', color: '#888', marginTop: '4px' },
  tableWrap: {
    background: '#fff', borderRadius: '12px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    background: '#1a3a6b', color: '#fff', padding: '12px 16px',
    fontSize: '12px', fontWeight: '600', textAlign: 'left',
  },
  tr: (i, highlighted) => ({
    background: highlighted ? '#fff8e1' : i % 2 === 0 ? '#fff' : '#fafafa',
    borderBottom: '1px solid #f0f0f0',
    transition: 'background 0.5s',
  }),
  td:  { padding: '12px 16px', fontSize: '13px', color: '#333' },
  btnRelease: {
    padding: '5px 11px', background: '#e8f5e9', color: '#2e7d32',
    border: '1px solid #2e7d32', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
  },
  btnFreeze: {
    padding: '5px 11px', background: '#fff3e0', color: '#e65100',
    border: '1px solid #e65100', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
  },
  btnRefund: {
    padding: '5px 11px', background: '#fce4ec', color: '#c62828',
    border: '1px solid #c62828', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
  },
  btnRow: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  pagination: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 20px', borderTop: '1px solid #f0f0f0',
  },
  pageBtn: (disabled) => ({
    padding: '6px 14px', border: '1px solid #ddd', borderRadius: '6px',
    background: disabled ? '#f5f5f5' : '#fff', color: disabled ? '#bbb' : '#1a3a6b',
    cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '13px',
  }),
  empty:   { textAlign: 'center', padding: '40px', color: '#aaa', fontSize: '14px' },
  spinner: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#888', fontSize: '14px' },
  toast: (ok) => ({
    position: 'fixed', bottom: '24px', right: '24px',
    background: ok ? '#1b5e20' : '#b71c1c', color: '#fff',
    padding: '12px 20px', borderRadius: '10px', fontSize: '13px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 999,
  }),
  // Banner shown when arriving from Notifications with a specific order
  fromNotifBanner: {
    background: '#fff3e0', border: '1px solid #e65100', borderRadius: '10px',
    padding: '10px 16px', marginBottom: '16px', fontSize: '13px', color: '#7c3000',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  clearBtn: {
    padding: '4px 10px', background: '#f0f0f0', border: 'none',
    borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: '#555',
  },
}

function formatMWK(v) {
  return 'MWK ' + Number(v || 0).toLocaleString()
}

function StatusBadge({ orderStatus, paymentStatus, flagged }) {
  const badges = []

  const statusColors = {
    completed:       { bg: '#e8f5e9', color: '#2e7d32' },
    cancelled:       { bg: '#fce4ec', color: '#c62828' },
    confirmed:       { bg: '#e3f2fd', color: '#1565c0' },
    pending:         { bg: '#fff8e1', color: '#f57f17' },
    shipped:         { bg: '#e8eaf6', color: '#283593' },
    delivered:       { bg: '#e0f2f1', color: '#00695c' },
    in_transit:      { bg: '#e8eaf6', color: '#283593' },
    disputed:        { bg: '#fce4ec', color: '#c62828' },
  }
  const sc = statusColors[orderStatus] || { bg: '#f5f5f5', color: '#555' }
  badges.push(
    <span key="status" style={{
      display: 'inline-block', padding: '3px 8px', borderRadius: '6px',
      fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
      background: sc.bg, color: sc.color,
    }}>
      {orderStatus}
    </span>
  )

  if (paymentStatus === 'released') {
    badges.push(
      <span key="released" style={{
        display: 'inline-block', padding: '2px 7px', borderRadius: '8px',
        fontSize: '10px', fontWeight: '700', background: '#e8f5e9', color: '#2e7d32', marginLeft: '5px',
      }}>RELEASED</span>
    )
  }
  if (paymentStatus === 'refunded') {
    badges.push(
      <span key="refunded" style={{
        display: 'inline-block', padding: '2px 7px', borderRadius: '8px',
        fontSize: '10px', fontWeight: '700', background: '#fce4ec', color: '#c62828', marginLeft: '5px',
      }}>REFUNDED</span>
    )
  }
  if (flagged) {
    badges.push(
      <span key="frozen" style={{
        display: 'inline-block', padding: '2px 7px', borderRadius: '8px',
        fontSize: '10px', fontWeight: '700', background: '#fff3e0', color: '#e65100', marginLeft: '5px',
      }}>FROZEN</span>
    )
  }

  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>{badges}</div>
}

export default function AdminEscrow() {
  const location = useLocation()
  const navigate = useNavigate()

  // Read ?orderId from URL — set by Notifications for pending_escrow deep-links
  const urlParams  = new URLSearchParams(location.search)
  const targetId   = urlParams.get('orderId') || ''
  const fromNotif  = !!targetId

  const [orders,  setOrders]  = useState([])
  const [summary, setSummary] = useState({ total: 0, toWholesalers: 0, toLogistics: 0 })
  const [total,   setTotal]   = useState(0)
  const [pages,   setPages]   = useState(1)
  const [page,    setPage]    = useState(1)
  const [loading, setLoading] = useState(true)
  const [toast,   setToast]   = useState(null)

  // Ref map so we can scroll to the highlighted row
  const rowRefs = useRef({})

  useEffect(() => { load() }, [page])

  // After orders load, scroll to target row if present
  useEffect(() => {
    if (targetId && rowRefs.current[targetId]) {
      setTimeout(() => {
        rowRefs.current[targetId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 150)
    }
  }, [orders, targetId])

  async function load() {
    setLoading(true)
    try {
      const res = await api.get(`/admin/escrow?page=${page}&limit=20`)
      setOrders(res.data.orders   || [])
      setSummary(res.data.summary || { total: 0, toWholesalers: 0, toLogistics: 0 })
      setTotal(res.data.total     || 0)
      setPages(res.data.pages     || 1)
    } catch { showToast('Failed to load escrow data', false) }
    finally  { setLoading(false) }
  }

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleRelease(id) {
    const reason = window.prompt('Release reason (required):')
    if (!reason || !reason.trim()) return
    try {
      await api.post(`/admin/escrow/${id}/release`, { reason: reason.trim() })
      showToast('Escrow released ✓')
      load()
    } catch (err) {
      showToast(err.response?.data?.msg || 'Failed to release', false)
    }
  }

  async function handleFreeze(id) {
    const reason = window.prompt('Freeze reason (optional):')
    try {
      await api.post(`/admin/escrow/${id}/freeze`, { reason: reason?.trim() || 'Frozen by admin' })
      showToast('Escrow frozen ✓')
      load()
    } catch (err) {
      showToast(err.response?.data?.msg || 'Failed to freeze', false)
    }
  }

  async function handleRefund(id) {
    const reason = window.prompt('Refund reason (required):')
    if (!reason || !reason.trim()) return
    if (!window.confirm('Refund this order to the retailer? This cannot be undone.')) return
    try {
      await api.post(`/admin/escrow/${id}/refund`, { reason: reason.trim() })
      showToast('Order refunded to retailer ✓')
      load()
    } catch (err) {
      showToast(err.response?.data?.msg || 'Failed to refund', false)
    }
  }

  const acted = (o) => o.paymentStatus === 'released' || o.paymentStatus === 'refunded'

  return (
    <div style={S.page}>
      <Sidebar active="/admin/escrow" />
      <div style={S.main}>

        <div style={S.topBar}>
          <div>
            <div style={S.pageTitle}>Escrow</div>
            <div style={S.pageSub}>{total} orders with funds held</div>
          </div>
          <button onClick={load} style={{
            padding: '8px 16px', background: '#1a3a6b', color: '#fff',
            border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
          }}>↺ Refresh</button>
        </div>

        {/* Banner when arriving from Notifications for a specific escrow order */}
        {fromNotif && (
          <div style={S.fromNotifBanner}>
            <span>💰 Opened from Notifications — order #{targetId.slice(-8).toUpperCase()} is highlighted below</span>
            <button style={S.clearBtn} onClick={() => navigate('/admin/escrow', { replace: true })}>
              Clear
            </button>
          </div>
        )}

        {/* Summary cards */}
        <div style={S.summaryRow}>
          {[
            { label: 'Total Held in Escrow',  value: formatMWK(summary.total),         accent: '#1a3a6b' },
            { label: 'Owed to Wholesalers',   value: formatMWK(summary.toWholesalers), accent: '#3b82f6' },
            { label: 'Owed to Logistics',     value: formatMWK(summary.toLogistics),   accent: '#00c853' },
          ].map(c => (
            <div key={c.label} style={S.summaryCard(c.accent)}>
              <div style={S.summaryValue}>{c.value}</div>
              <div style={S.summaryLabel}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={S.tableWrap}>
          {loading ? (
            <div style={S.spinner}>Loading escrow…</div>
          ) : orders.length === 0 ? (
            <div style={S.empty}>No funds currently held in escrow ✓</div>
          ) : (
            <>
              <table style={S.table}>
                <thead>
                  <tr>
                    {['Order ID', 'Retailer', 'Wholesaler', 'Total', 'To Wholesaler', 'To Logistics', 'Status', 'Actions'].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => {
                    const isTarget = o._id === targetId
                    return (
                      <tr
                        key={o._id}
                        ref={el => { rowRefs.current[o._id] = el }}
                        style={{ ...S.tr(i, isTarget), opacity: acted(o) ? 0.6 : 1 }}
                      >
                        <td style={{ ...S.td, fontFamily: 'monospace', fontWeight: '600', color: '#1a3a6b', fontSize: '12px' }}>
                          #{String(o._id).slice(-8).toUpperCase()}
                          {isTarget && (
                            <span style={{ marginLeft: '6px', fontSize: '10px', background: '#e65100', color: '#fff', padding: '2px 6px', borderRadius: '6px', fontWeight: '700' }}>
                              FROM ALERT
                            </span>
                          )}
                        </td>
                        <td style={S.td}>{o.retailer?.businessName || o.retailer?.name || '—'}</td>
                        <td style={S.td}>{o.wholesaler?.businessName || o.wholesaler?.name || '—'}</td>
                        <td style={{ ...S.td, fontWeight: '600' }}>{formatMWK(o.totalAmount)}</td>
                        <td style={S.td}>{formatMWK(o.amountToWholesaler)}</td>
                        <td style={S.td}>{formatMWK(o.amountToLogistics)}</td>
                        <td style={S.td}>
                          <StatusBadge
                            orderStatus={o.orderStatus}
                            paymentStatus={o.paymentStatus}
                            flagged={o.flagged}
                          />
                        </td>
                        <td style={S.td}>
                          {acted(o) ? (
                            <span style={{ fontSize: '12px', color: '#aaa', fontStyle: 'italic' }}>Done</span>
                          ) : (
                            <div style={S.btnRow}>
                              <button style={S.btnRelease} onClick={() => handleRelease(o._id)}>Release</button>
                              {!o.flagged && <button style={S.btnFreeze} onClick={() => handleFreeze(o._id)}>Freeze</button>}
                              <button style={S.btnRefund}  onClick={() => handleRefund(o._id)}>Refund</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <div style={S.pagination}>
                <button style={S.pageBtn(page === 1)} disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}>← Prev</button>
                <span style={{ fontSize: '13px', color: '#666' }}>Page {page} of {pages} · {total} orders</span>
                <button style={S.pageBtn(page === pages)} disabled={page === pages}
                  onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            </>
          )}
        </div>

      </div>
      {toast && <div style={S.toast(toast.ok)}>{toast.msg}</div>}
    </div>
  )
}