import { useEffect, useState, useCallback } from 'react'
import api from '../../utils/api'
import { Sidebar } from './Dashboard'

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  page:  { minHeight: '100vh', background: '#f0f2f5', fontFamily: "'Segoe UI', Arial, sans-serif" },
  main:  { marginLeft: '220px', padding: '28px 32px', minHeight: '100vh' },

  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' },
  pageTitle: { fontSize: '22px', fontWeight: 'bold', color: '#1a3a6b' },
  pageSub:   { fontSize: '13px', color: '#888', marginTop: '2px' },

  filterBar: {
    background: '#fff', borderRadius: '12px', padding: '14px 20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)', display: 'flex',
    gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px',
  },
  searchInput: {
    flex: 1, minWidth: '200px', padding: '8px 14px',
    border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none',
  },
  select: {
    padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px',
    fontSize: '13px', background: '#fff', cursor: 'pointer',
  },
  searchBtn: {
    padding: '8px 20px', background: '#1a3a6b', color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600',
  },

  tableWrap: { background: '#fff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { background: '#1a3a6b', color: '#fff', padding: '12px 16px', fontSize: '11px', fontWeight: '600', textAlign: 'left' },
  tr: (i) => ({ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f0f0f0' }),
  td: { padding: '11px 16px', fontSize: '13px', color: '#333' },

  statusPill: (s) => {
    const map = {
      pending:              { bg: '#fff8e1', color: '#f57f17' },
      confirmed:            { bg: '#e3f2fd', color: '#1565c0' },
      ready_for_collection: { bg: '#e8eaf6', color: '#283593' },
      collected:            { bg: '#fce4ec', color: '#880e4f' },
      in_transit:           { bg: '#e0f7fa', color: '#006064' },
      delivered:            { bg: '#e8f5e9', color: '#1b5e20' },
      completed:            { bg: '#e8f5e9', color: '#2e7d32' },
      disputed:             { bg: '#fbe9e7', color: '#bf360c' },
      cancelled:            { bg: '#f5f5f5', color: '#757575' },
    }
    const c = map[s] || { bg: '#f5f5f5', color: '#555' }
    return {
      display: 'inline-block', padding: '3px 10px', borderRadius: '12px',
      fontSize: '11px', fontWeight: '700', background: c.bg, color: c.color,
      textTransform: 'capitalize',
    }
  },

  actionBtn: (variant = 'primary') => ({
    padding: '5px 12px', border: 'none', borderRadius: '6px', fontSize: '12px',
    fontWeight: '600', cursor: 'pointer', marginRight: '4px',
    ...(variant === 'primary'  ? { background: '#1a3a6b', color: '#fff' } : {}),
    ...(variant === 'danger'   ? { background: '#fbe9e7', color: '#c62828' } : {}),
    ...(variant === 'warning'  ? { background: '#fff3e0', color: '#e65100' } : {}),
  }),

  pagination: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 20px', borderTop: '1px solid #f0f0f0',
  },
  pageBtn: (disabled) => ({
    padding: '6px 14px', border: '1px solid #ddd', borderRadius: '6px',
    background: disabled ? '#f5f5f5' : '#fff', color: disabled ? '#bbb' : '#1a3a6b',
    cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '13px',
  }),

  empty:   { textAlign: 'center', padding: '48px', color: '#aaa', fontSize: '14px' },
  spinner: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#888' },
  toast: (ok) => ({
    position: 'fixed', bottom: '24px', right: '24px',
    background: ok ? '#1b5e20' : '#b71c1c', color: '#fff',
    padding: '12px 20px', borderRadius: '10px', fontSize: '13px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 9999,
  }),

  // ── Drawer ────────────────────────────────────────────────────────────────
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    zIndex: 1000, display: 'flex', justifyContent: 'flex-end',
  },
  drawer: {
    width: '680px', maxWidth: '95vw', height: '100vh',
    background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
    overflowY: 'auto', display: 'flex', flexDirection: 'column',
  },
  drawerHeader: {
    background: 'linear-gradient(135deg, #1a3a6b 0%, #0d2347 100%)',
    padding: '22px 28px', display: 'flex', alignItems: 'flex-start',
    justifyContent: 'space-between', flexShrink: 0,
  },
  drawerTitle: { color: '#fff', fontSize: '18px', fontWeight: '700', marginBottom: '4px' },
  drawerSub:   { color: 'rgba(255,255,255,0.6)', fontSize: '12px' },
  closeBtn: {
    background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
    borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '16px',
  },
  drawerBody: { padding: '24px 28px', flex: 1 },

  section: { marginBottom: '24px' },
  sectionTitle: {
    fontSize: '11px', fontWeight: '700', color: '#1a3a6b', textTransform: 'uppercase',
    letterSpacing: '0.08em', marginBottom: '12px', paddingBottom: '6px',
    borderBottom: '2px solid #e8f0fe',
  },

  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' },
  infoCard: {
    background: '#f8faff', borderRadius: '10px', padding: '12px 14px',
    border: '1px solid #e8f0fe',
  },
  infoLabel: { fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' },
  infoValue: { fontSize: '13px', color: '#222', fontWeight: '600' },
  infoSub:   { fontSize: '11px', color: '#888', marginTop: '2px' },

  amountCard: (accent) => ({
    background: '#f8faff', borderRadius: '10px', padding: '12px 14px',
    border: `1px solid ${accent}22`, borderLeft: `3px solid ${accent}`,
  }),
  amountLabel: { fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' },
  amountValue: (color) => ({ fontSize: '15px', color, fontWeight: '700' }),

  itemsTable: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  itemsTh: { background: '#f0f2f5', padding: '8px 12px', fontSize: '11px', fontWeight: '600', color: '#555', textAlign: 'left' },
  itemsTd: { padding: '9px 12px', borderBottom: '1px solid #f0f0f0', color: '#333' },

  timeline: { position: 'relative', paddingLeft: '24px' },
  timelineItem: () => ({ position: 'relative', paddingBottom: '16px', paddingLeft: '12px' }),
  timelineDot: (active) => ({
    position: 'absolute', left: '-24px', top: '4px',
    width: '10px', height: '10px', borderRadius: '50%',
    background: active ? '#00c853' : '#ddd',
    border: `2px solid ${active ? '#00c853' : '#ccc'}`,
  }),
  timelineLine: {
    position: 'absolute', left: '-20px', top: '14px',
    width: '2px', bottom: 0, background: '#e0e0e0',
  },
  timelineLabel: (active) => ({ fontSize: '12px', fontWeight: '600', color: active ? '#1a3a6b' : '#aaa' }),
  timelineDate:  { fontSize: '11px', color: '#aaa', marginTop: '2px' },

  actionBar: {
    padding: '16px 28px', borderTop: '1px solid #f0f0f0',
    background: '#fafafa', display: 'flex', gap: '10px', flexWrap: 'wrap', flexShrink: 0,
  },
  actionBarBtn: (variant) => {
    const v = {
      primary: { background: '#1a3a6b', color: '#fff' },
      success: { background: '#2e7d32', color: '#fff' },
      danger:  { background: '#c62828', color: '#fff' },
      warning: { background: '#e65100', color: '#fff' },
      ghost:   { background: '#f0f0f0', color: '#555', border: '1px solid #ddd' },
    }
    return {
      padding: '9px 18px', border: 'none', borderRadius: '8px', fontSize: '13px',
      fontWeight: '600', cursor: 'pointer', ...(v[variant] || v.primary),
    }
  },
}

function fmt(v)    { return 'MWK ' + Number(v || 0).toLocaleString() }
function fmtDate(d){ if (!d) return '—'; return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
function ago(d)    { if (!d) return '—'; const h = Math.floor((Date.now() - new Date(d)) / 3600000); return h < 24 ? `${h}h ago` : `${Math.floor(h/24)}d ago` }

const STATUS_STEPS = [
  'pending', 'confirmed', 'ready_for_collection',
  'collected', 'in_transit', 'delivered', 'completed',
]
const STATUS_LABELS = {
  pending: 'Pending', confirmed: 'Confirmed', ready_for_collection: 'Ready for Collection',
  collected: 'Collected', in_transit: 'In Transit', delivered: 'Delivered',
  completed: 'Completed', disputed: 'Disputed', cancelled: 'Cancelled',
}
const ADVANCE_OPTIONS = {
  pending:              ['confirmed', 'ready_for_collection', 'cancelled'],
  confirmed:            ['ready_for_collection', 'cancelled'],
  ready_for_collection: ['collected', 'cancelled'],
  collected:            ['in_transit', 'cancelled'],
  in_transit:           ['delivered', 'cancelled'],
  delivered:            ['completed'],
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending',              label: 'Pending'               },
  { value: 'confirmed',            label: 'Confirmed'             },
  { value: 'ready_for_collection', label: 'Ready for Collection'  },
  { value: 'collected',            label: 'Collected'             },
  { value: 'in_transit',           label: 'In Transit'            },
  { value: 'delivered',            label: 'Delivered'             },
  { value: 'completed',            label: 'Completed'             },
  { value: 'disputed',             label: 'Disputed'              },
  { value: 'cancelled',            label: 'Cancelled'             },
]

// ─── Order Detail Drawer ──────────────────────────────────────────────────────
function OrderDrawer({ orderId, onClose, onUpdated, showToast }) {
  const [order,         setOrder]         = useState(null)
  const [loadError,     setLoadError]     = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [advancing,     setAdvancing]     = useState(false)
  const [cancelling,    setCancelling]    = useState(false)
  const [flagging,      setFlagging]      = useState(false)
  const [noteText,      setNoteText]      = useState('')
  const [savingNote,    setSavingNote]    = useState(false)
  const [showAdvance,   setShowAdvance]   = useState(false)
  const [advanceStatus, setAdvanceStatus] = useState('')
  const [advanceReason, setAdvanceReason] = useState('')
  const [cancelReason,  setCancelReason]  = useState('')
  const [showCancel,    setShowCancel]    = useState(false)
  const [payouts,       setPayouts]       = useState([])

  // ── Load order + payouts on open ──────────────────────────────────────────
  useEffect(() => {
    if (!orderId) return
    setLoading(true)
    setOrder(null)
    setLoadError(null)
    setPayouts([])
    setShowAdvance(false)
    setShowCancel(false)
    setAdvanceStatus('')

    Promise.all([
      api.get(`/admin/orders/${orderId}`),
      api.get(`/admin/payments/log?search=${orderId}`).catch(() => ({ data: { payouts: [] } })),
    ])
      .then(([oRes, pRes]) => {
        // handle both {order: {...}} and {...} response shapes
        const orderData = oRes.data?.order || oRes.data
        console.log('[OrderDrawer] loaded order:', orderData)
        setOrder(orderData)
        setNoteText(orderData?.adminNote || '')
        setPayouts(pRes.data.payouts || [])
      })
      .catch((err) => {
        console.error('[OrderDrawer] load error:', err)
        setLoadError(err.response?.data?.msg || err.message || 'Failed to load order')
        showToast('Failed to load order', false)
      })
      .finally(() => setLoading(false))
  }, [orderId])

  // ── Advance status ────────────────────────────────────────────────────────
  async function handleAdvance() {
    if (!advanceStatus) return
    setAdvancing(true)
    try {
      const res = await api.put(`/admin/orders/${orderId}/status`, {
        status: advanceStatus,
        reason: advanceReason,
      })
      setOrder(res.data.order)
      setShowAdvance(false)
      setAdvanceReason('')
      setAdvanceStatus('')
      showToast(`Status advanced to ${STATUS_LABELS[advanceStatus]}`)
      onUpdated()
    } catch (e) {
      showToast(e.response?.data?.msg || 'Failed to advance status', false)
    } finally { setAdvancing(false) }
  }

  // ── Cancel order ──────────────────────────────────────────────────────────
  async function handleCancel() {
    if (!cancelReason.trim()) return showToast('Enter a cancellation reason', false)
    setCancelling(true)
    try {
      const res = await api.put(`/admin/orders/${orderId}/cancel`, { reason: cancelReason })
      setOrder(res.data.order)
      setShowCancel(false)
      showToast('Order cancelled')
      onUpdated()
    } catch (e) {
      showToast(e.response?.data?.msg || 'Failed to cancel', false)
    } finally { setCancelling(false) }
  }

  // ── Flag order ────────────────────────────────────────────────────────────
  async function handleFlag() {
    setFlagging(true)
    try {
      await api.put(`/admin/orders/${orderId}/flag`, { note: noteText || 'Flagged for investigation' })
      showToast('Order flagged')
      onUpdated()
    } catch { showToast('Failed to flag order', false) }
    finally { setFlagging(false) }
  }

  // ── Save admin note ───────────────────────────────────────────────────────
  async function handleSaveNote() {
    setSavingNote(true)
    try {
      await api.put(`/admin/orders/${orderId}/flag`, { note: noteText })
      showToast('Note saved')
    } catch { showToast('Failed to save note', false) }
    finally { setSavingNote(false) }
  }

  // ── Release escrow ────────────────────────────────────────────────────────
  async function handleReleaseEscrow() {
    const reason = window.prompt('Release reason (required):')
    if (!reason) return
    try {
      await api.post(`/admin/escrow/${orderId}/release`, { reason })
      showToast('Escrow released')
      const res = await api.get(`/admin/orders/${orderId}`)
      setOrder(res.data)
      onUpdated()
    } catch (e) { showToast(e.response?.data?.msg || 'Failed to release escrow', false) }
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.drawer} onClick={e => e.stopPropagation()}>
        <div style={S.drawerHeader}>
          <div>
            <div style={S.drawerTitle}>Loading…</div>
            <div style={S.drawerSub}>Fetching order details</div>
          </div>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={S.spinner}>Loading order details…</div>
      </div>
    </div>
  )

  if (!loading && (loadError || !order)) return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.drawer} onClick={e => e.stopPropagation()}>
        <div style={S.drawerHeader}>
          <div>
            <div style={S.drawerTitle}>Error loading order</div>
            <div style={S.drawerSub}>Check the browser console for details</div>
          </div>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '32px', color: '#c62828', fontSize: '14px' }}>
          <div style={{ fontWeight: '700', marginBottom: '8px' }}>⚠️ Could not load order details</div>
          <div style={{ color: '#888', fontSize: '12px', marginBottom: '16px' }}>{loadError || 'No data returned from server'}</div>
          <button style={S.actionBarBtn('ghost')} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )

  const shortId    = String(order._id).slice(-8).toUpperCase()
  const currentIdx = STATUS_STEPS.indexOf(order.orderStatus)
  const canAdvance = !!ADVANCE_OPTIONS[order.orderStatus]?.length
  const canCancel  = !['completed', 'cancelled'].includes(order.orderStatus)
  const canRelease = order.paymentStatus !== 'released' && order.paymentStatus !== 'refunded'

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.drawer} onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={S.drawerHeader}>
          <div>
            <div style={S.drawerTitle}>Order #{shortId}</div>
            <div style={S.drawerSub}>
              <span style={{ ...S.statusPill(order.orderStatus), background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                {STATUS_LABELS[order.orderStatus] || order.orderStatus}
              </span>
              <span style={{ marginLeft: '10px' }}>Placed {fmtDate(order.createdAt)}</span>
            </div>
          </div>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={S.drawerBody}>

          {/* ── Alerts ── */}
          {order.flagged && (
            <div style={{ background: '#fbe9e7', border: '1px solid #ffcdd2', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#c62828', fontWeight: '600' }}>
              ⚠️ This order is flagged for investigation
            </div>
          )}
          {order.paymentStatus === 'released' && (
            <div style={{ background: '#e8f5e9', border: '1px solid #c8e6c9', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#2e7d32', fontWeight: '600' }}>
              ✅ Escrow released — payouts completed
            </div>
          )}

          {/* ── Financial Summary ── */}
          <div style={S.section}>
            <div style={S.sectionTitle}>Financial Summary</div>
            <div style={S.grid3}>
              <div style={S.amountCard('#3b82f6')}>
                <div style={S.amountLabel}>Total Amount</div>
                <div style={S.amountValue('#1a3a6b')}>{fmt(order.totalAmount)}</div>
              </div>
              <div style={S.amountCard('#00c853')}>
                <div style={S.amountLabel}>To Wholesaler</div>
                <div style={S.amountValue('#2e7d32')}>{fmt(order.amountToWholesaler)}</div>
              </div>
              <div style={S.amountCard('#f59e0b')}>
                <div style={S.amountLabel}>Delivery Fee</div>
                <div style={S.amountValue('#b45309')}>{fmt(order.deliveryFee)}</div>
              </div>
              <div style={S.amountCard('#8b5cf6')}>
                <div style={S.amountLabel}>Platform Fee</div>
                <div style={S.amountValue('#7c3aed')}>{fmt(order.platformFee)}</div>
                {order.productTotal > 0 && (
                  <div style={{ fontSize: '10px', color: '#aaa', marginTop: '2px' }}>
                    {((order.platformFee / order.productTotal) * 100).toFixed(1)}% of product total
                  </div>
                )}
              </div>
              <div style={S.amountCard('#06b6d4')}>
                <div style={S.amountLabel}>To Logistics</div>
                <div style={S.amountValue('#0e7490')}>{fmt(order.amountToLogistics)}</div>
              </div>
              <div style={S.amountCard(order.paymentStatus === 'released' ? '#00c853' : '#e53935')}>
                <div style={S.amountLabel}>Payment Status</div>
                <div style={S.amountValue(order.paymentStatus === 'released' ? '#2e7d32' : '#c62828')}>
                  {(order.paymentStatus || 'unpaid').toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          {/* ── Parties ── */}
          <div style={S.section}>
            <div style={S.sectionTitle}>Parties</div>
            <div style={S.grid3}>
              <div style={S.infoCard}>
                <div style={S.infoLabel}>🛒 Retailer</div>
                <div style={S.infoValue}>{order.retailer?.businessName || order.retailer?.name || '—'}</div>
                <div style={S.infoSub}>{order.retailer?.email}</div>
                {order.retailer?.phone && <div style={S.infoSub}>{order.retailer.phone}</div>}
              </div>
              <div style={S.infoCard}>
                <div style={S.infoLabel}>🏭 Wholesaler</div>
                <div style={S.infoValue}>{order.wholesaler?.businessName || order.wholesaler?.name || '—'}</div>
                <div style={S.infoSub}>{order.wholesaler?.email}</div>
                {order.wholesaler?.phone && <div style={S.infoSub}>{order.wholesaler.phone}</div>}
              </div>
              <div style={S.infoCard}>
                <div style={S.infoLabel}>🚚 Logistics</div>
                <div style={S.infoValue}>{order.logisticsCompany?.name || '—'}</div>
                <div style={S.infoSub}>{order.logisticsCompany?.email || order.logisticsCompany?.contactEmail || ''}</div>
                {order.deliveryStatus && (
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                    Delivery: {order.deliveryStatus}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Delivery Address ── */}
          {order.deliveryAddress && Object.keys(order.deliveryAddress).length > 0 && (
            <div style={S.section}>
              <div style={S.sectionTitle}>Delivery Address</div>
              <div style={S.infoCard}>
                <div style={{ fontSize: '13px', color: '#333', lineHeight: 1.6 }}>
                  {[
                    order.deliveryAddress.street,
                    order.deliveryAddress.area || order.deliveryAddress.suburb,
                    order.deliveryAddress.city,
                    order.deliveryAddress.region,
                    order.deliveryAddress.country,
                  ].filter(Boolean).join(', ') || JSON.stringify(order.deliveryAddress)}
                </div>
              </div>
            </div>
          )}

          {/* ── Items ── */}
          <div style={S.section}>
            <div style={S.sectionTitle}>Items ({order.items?.length || 0})</div>
            <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #e8f0fe' }}>
              <table style={S.itemsTable}>
                <thead>
                  <tr>
                    {['Product', 'Qty', 'Unit Price', 'Subtotal'].map(h => (
                      <th key={h} style={S.itemsTh}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(order.items || []).map((item, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={S.itemsTd}>
                        <div style={{ fontWeight: '600' }}>{item.name || item.product?.name || '—'}</div>
                        {item.product?._id && (
                          <div style={{ fontSize: '10px', color: '#aaa', fontFamily: 'monospace' }}>
                            #{String(item.product._id).slice(-6).toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td style={S.itemsTd}>{item.quantity}</td>
                      <td style={S.itemsTd}>{fmt(item.price)}</td>
                      <td style={{ ...S.itemsTd, fontWeight: '700', color: '#1a3a6b' }}>
                        {fmt(item.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Timeline ── */}
          <div style={S.section}>
            <div style={S.sectionTitle}>Order Timeline</div>
            {order.orderStatus === 'cancelled' ? (
              <div style={{ ...S.infoCard, borderLeft: '3px solid #e53935' }}>
                <div style={{ fontWeight: '600', color: '#c62828' }}>❌ Order Cancelled</div>
                {order.adminNote && <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Reason: {order.adminNote}</div>}
                <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>{fmtDate(order.updatedAt)}</div>
              </div>
            ) : order.orderStatus === 'disputed' ? (
              <div style={{ ...S.infoCard, borderLeft: '3px solid #e53935' }}>
                <div style={{ fontWeight: '600', color: '#bf360c' }}>⚠️ Under Dispute</div>
                <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>{fmtDate(order.updatedAt)}</div>
              </div>
            ) : (
              <div style={S.timeline}>
                {STATUS_STEPS.map((step, idx) => {
                  const done = idx <= currentIdx
                  const last = idx < STATUS_STEPS.length - 1
                  return (
                    <div key={step} style={S.timelineItem(done)}>
                      <div style={S.timelineDot(done)} />
                      {last && <div style={S.timelineLine} />}
                      <div style={S.timelineLabel(done)}>{STATUS_LABELS[step]}</div>
                      {done && idx === currentIdx && (
                        <div style={S.timelineDate}>Current · {ago(order.updatedAt)}</div>
                      )}
                      {done && idx < currentIdx && (
                        <div style={S.timelineDate}>✓ Completed</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Payouts ── */}
          {payouts.length > 0 && (
            <div style={S.section}>
              <div style={S.sectionTitle}>Payouts Released</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {payouts.map(p => (
                  <div key={p._id} style={{ ...S.infoCard, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={S.statusPill(p.recipientType === 'wholesaler' ? 'confirmed' : 'in_transit')}>
                        {p.recipientType === 'wholesaler' ? '🏭 Wholesaler' : '🚚 Logistics'}
                      </span>
                      <span style={{ marginLeft: '10px', fontSize: '12px', color: '#888' }}>
                        {p.recipient?.businessName || p.recipient?.name || '—'}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '700', color: '#2e7d32' }}>{fmt(p.netAmount)}</div>
                      {p.vatAmount > 0 && <div style={{ fontSize: '10px', color: '#e53935' }}>−{fmt(p.vatAmount)} VAT</div>}
                      <div style={{ fontSize: '10px', color: '#aaa' }}>{fmtDate(p.releasedAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Admin Note ── */}
          <div style={S.section}>
            <div style={S.sectionTitle}>Admin Note</div>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Add an internal note (not visible to users)…"
              rows={3}
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid #ddd',
                borderRadius: '8px', fontSize: '13px', resize: 'vertical',
                fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
            <button
              style={{ ...S.actionBarBtn('ghost'), marginTop: '8px', fontSize: '12px' }}
              onClick={handleSaveNote}
              disabled={savingNote}
            >
              {savingNote ? 'Saving…' : '💾 Save Note'}
            </button>
          </div>

          {/* ── Advance Status Panel ── */}
          {showAdvance && canAdvance && (
            <div style={{ background: '#f0f7ff', border: '1px solid #bbdefb', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#1a3a6b', marginBottom: '10px' }}>
                Advance Order Status
              </div>
              <select
                value={advanceStatus}
                onChange={e => setAdvanceStatus(e.target.value)}
                style={{ ...S.select, width: '100%', marginBottom: '8px' }}
              >
                <option value="">— Select new status —</option>
                {(ADVANCE_OPTIONS[order.orderStatus] || []).map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
              <input
                value={advanceReason}
                onChange={e => setAdvanceReason(e.target.value)}
                placeholder="Reason (optional)"
                style={{ ...S.searchInput, width: '100%', marginBottom: '8px', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  style={S.actionBarBtn('primary')}
                  onClick={handleAdvance}
                  disabled={advancing || !advanceStatus}
                >
                  {advancing ? 'Advancing…' : '✓ Confirm Advance'}
                </button>
                <button style={S.actionBarBtn('ghost')} onClick={() => setShowAdvance(false)}>Cancel</button>
              </div>
            </div>
          )}

          {/* ── Cancel Panel ── */}
          {showCancel && (
            <div style={{ background: '#fff5f5', border: '1px solid #ffcdd2', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#c62828', marginBottom: '10px' }}>
                Cancel Order
              </div>
              <input
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Cancellation reason (required)"
                style={{ ...S.searchInput, width: '100%', marginBottom: '8px', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  style={S.actionBarBtn('danger')}
                  onClick={handleCancel}
                  disabled={cancelling || !cancelReason.trim()}
                >
                  {cancelling ? 'Cancelling…' : '✕ Confirm Cancel'}
                </button>
                <button style={S.actionBarBtn('ghost')} onClick={() => setShowCancel(false)}>Back</button>
              </div>
            </div>
          )}

        </div>

        {/* ── Action Bar ── */}
        <div style={S.actionBar}>
          {canAdvance && (
            <button
              style={S.actionBarBtn('primary')}
              onClick={() => { setShowAdvance(v => !v); setShowCancel(false) }}
            >
              ⬆ Advance Status
            </button>
          )}
          {canCancel && (
            <button
              style={S.actionBarBtn('danger')}
              onClick={() => { setShowCancel(v => !v); setShowAdvance(false) }}
            >
              ✕ Cancel Order
            </button>
          )}
          {canRelease && order.orderStatus !== 'cancelled' && (
            <button style={S.actionBarBtn('success')} onClick={handleReleaseEscrow}>
              💰 Release Escrow
            </button>
          )}
          <button style={S.actionBarBtn('warning')} onClick={handleFlag} disabled={flagging}>
            {flagging ? 'Flagging…' : '⚑ Flag Order'}
          </button>
          <button style={S.actionBarBtn('ghost')} onClick={onClose}>Close</button>
        </div>

      </div>
    </div>
  )
}

// ─── Main Orders Page ─────────────────────────────────────────────────────────
export default function AdminOrders() {
  const [orders,      setOrders]      = useState([])
  const [total,       setTotal]       = useState(0)
  const [pages,       setPages]       = useState(1)
  const [page,        setPage]        = useState(1)
  const [loading,     setLoading]     = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [search,      setSearch]      = useState('')
  const [status,      setStatus]      = useState('')
  const [activeId,    setActiveId]    = useState(null)   // ← drives the drawer
  const [toast,       setToast]       = useState(null)

  useEffect(() => { load() }, [page, search, status])

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 20 })
      if (search) params.append('search', search)
      if (status) params.append('status', status)
      const res = await api.get(`/admin/orders?${params}`)
      setOrders(res.data.orders || [])
      setTotal(res.data.total  || 0)
      setPages(res.data.pages  || 1)
    } catch {
      showToast('Failed to load orders', false)
    } finally {
      setLoading(false)
    }
  }

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  function handleSearch() {
    setSearch(searchInput.trim())
    setPage(1)
  }

  // ── Open drawer for a specific order ──────────────────────────────────────
  function openOrder(id) {
    setActiveId(id)
  }

  function closeDrawer() {
    setActiveId(null)
  }

  return (
    <div style={S.page}>
      <Sidebar active="/admin/orders" />
      <div style={S.main}>

        {/* Top bar */}
        <div style={S.topBar}>
          <div>
            <div style={S.pageTitle}>Orders</div>
            <div style={S.pageSub}>{total} order{total !== 1 ? 's' : ''} total</div>
          </div>
        </div>

        {/* Filters */}
        <div style={S.filterBar}>
          <input
            style={S.searchInput}
            placeholder="Search by Order ID…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <select
            style={S.select}
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1) }}
          >
            {STATUS_FILTER_OPTIONS.map(o =>
              <option key={o.value} value={o.value}>{o.label}</option>
            )}
          </select>
          <button style={S.searchBtn} onClick={handleSearch}>Search</button>
          {(search || status) && (
            <button
              style={{ ...S.searchBtn, background: '#f0f0f0', color: '#555' }}
              onClick={() => { setSearch(''); setSearchInput(''); setStatus(''); setPage(1) }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div style={S.tableWrap}>
          {loading ? (
            <div style={S.spinner}>Loading orders…</div>
          ) : orders.length === 0 ? (
            <div style={S.empty}>No orders found</div>
          ) : (
            <>
              <table style={S.table}>
                <thead>
                  <tr>
                    {['Order ID', 'Retailer', 'Wholesaler', 'Amount', 'Status', 'Updated', 'Actions'].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => {
                    const shortId = String(o._id).slice(-8).toUpperCase()
                    return (
                      <tr key={o._id} style={S.tr(i)}>
                        <td style={{ ...S.td, fontFamily: 'monospace', fontSize: '12px', color: '#1a3a6b', fontWeight: '700' }}>
                          #{shortId}
                        </td>
                        <td style={S.td}>
                          <div style={{ fontWeight: '600' }}>{o.retailer?.businessName || o.retailer?.name || '—'}</div>
                          <div style={{ fontSize: '11px', color: '#aaa' }}>{o.retailer?.email}</div>
                        </td>
                        <td style={S.td}>
                          <div style={{ fontWeight: '600' }}>{o.wholesaler?.businessName || o.wholesaler?.name || '—'}</div>
                        </td>
                        <td style={{ ...S.td, fontWeight: '600', color: '#1a3a6b' }}>
                          {fmt(o.totalAmount)}
                        </td>
                        <td style={S.td}>
                          <span style={S.statusPill(o.orderStatus)}>
                            {STATUS_LABELS[o.orderStatus] || o.orderStatus}
                          </span>
                          {o.flagged && <span style={{ marginLeft: '4px', fontSize: '11px' }}>⚑</span>}
                        </td>
                        <td style={{ ...S.td, fontSize: '12px', color: '#888' }}>{ago(o.updatedAt)}</td>
                        <td style={S.td}>
                          {/* FIX: View button now correctly opens the drawer */}
                          <button
                            style={S.actionBtn('primary')}
                            onClick={() => openOrder(o._id)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <div style={S.pagination}>
                <button
                  style={S.pageBtn(page === 1)}
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >← Prev</button>
                <span style={{ fontSize: '13px', color: '#666' }}>
                  Page {page} of {pages} · {total} orders
                </span>
                <button
                  style={S.pageBtn(page === pages)}
                  disabled={page === pages}
                  onClick={() => setPage(p => p + 1)}
                >Next →</button>
              </div>
            </>
          )}
        </div>

      </div>

      {/* ── Order Detail Drawer — rendered when activeId is set ── */}
      {activeId && (
        <OrderDrawer
          orderId={activeId}
          onClose={closeDrawer}
          onUpdated={load}
          showToast={showToast}
        />
      )}

      {toast && <div style={S.toast(toast.ok)}>{toast.msg}</div>}
    </div>
  )
}