import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import { Sidebar } from './Dashboard'

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  page:  { minHeight: '100vh', background: '#f0f2f5', fontFamily: "'Segoe UI', Arial, sans-serif" },
  main:  { marginLeft: '220px', padding: '28px 32px', minHeight: '100vh' },

  topBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '24px',
  },
  backBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '8px 16px', background: '#fff', border: '1px solid #ddd',
    borderRadius: '8px', fontSize: '13px', cursor: 'pointer', color: '#1a3a6b',
    fontWeight: '600', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  pageTitle:  { fontSize: '22px', fontWeight: 'bold', color: '#1a3a6b' },
  pageSub:    { fontSize: '13px', color: '#888', marginTop: '2px' },

  // ── Layout ─────────────────────────────────────────────────────────────────
  grid: {
    display: 'grid', gridTemplateColumns: '1fr 340px',
    gap: '20px', alignItems: 'start',
  },
  card: {
    background: '#fff', borderRadius: '12px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: '20px',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '14px 20px', borderBottom: '1px solid #f0f0f0',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: '12px', fontWeight: '700', color: '#1a3a6b',
    textTransform: 'uppercase', letterSpacing: '0.07em',
  },
  cardBody: { padding: '20px' },

  // ── Status pill ────────────────────────────────────────────────────────────
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
      display: 'inline-block', padding: '4px 12px', borderRadius: '12px',
      fontSize: '12px', fontWeight: '700', background: c.bg, color: c.color,
      textTransform: 'capitalize',
    }
  },

  // ── Info grid ──────────────────────────────────────────────────────────────
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  infoGrid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' },
  infoItem: {
    background: '#f8faff', borderRadius: '8px', padding: '11px 14px',
    border: '1px solid #e8f0fe',
  },
  infoLabel: {
    fontSize: '10px', color: '#888', textTransform: 'uppercase',
    letterSpacing: '0.05em', marginBottom: '4px',
  },
  infoValue: { fontSize: '13px', color: '#222', fontWeight: '600' },
  infoSub:   { fontSize: '11px', color: '#999', marginTop: '2px' },

  // ── Amount cards ───────────────────────────────────────────────────────────
  amountCard: (accent) => ({
    background: '#f8faff', borderRadius: '10px', padding: '12px 14px',
    border: `1px solid ${accent}33`, borderLeft: `3px solid ${accent}`,
  }),
  amountLabel: {
    fontSize: '10px', color: '#888', textTransform: 'uppercase',
    letterSpacing: '0.05em', marginBottom: '4px',
  },
  amountValue: (color) => ({ fontSize: '16px', color, fontWeight: '700' }),

  // ── Items table ────────────────────────────────────────────────────────────
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    background: '#f0f2f5', padding: '9px 14px', fontSize: '11px',
    fontWeight: '600', color: '#555', textAlign: 'left',
    borderBottom: '1px solid #e8e8e8',
  },
  td: { padding: '10px 14px', borderBottom: '1px solid #f5f5f5', fontSize: '13px', color: '#333' },

  // ── Timeline ───────────────────────────────────────────────────────────────
  timeline: { paddingLeft: '20px' },
  tItem: { position: 'relative', paddingBottom: '18px', paddingLeft: '14px' },
  tDot: (active) => ({
    position: 'absolute', left: '-20px', top: '3px',
    width: '10px', height: '10px', borderRadius: '50%',
    background: active ? '#00c853' : '#e0e0e0',
    border: `2px solid ${active ? '#00c853' : '#ccc'}`,
    zIndex: 1,
  }),
  tLine: {
    position: 'absolute', left: '-16px', top: '13px',
    width: '2px', bottom: 0, background: '#e8e8e8',
  },
  tLabel:   (active) => ({ fontSize: '13px', fontWeight: '600', color: active ? '#1a3a6b' : '#bbb' }),
  tSub:     { fontSize: '11px', color: '#aaa', marginTop: '2px' },

  // ── Action buttons ─────────────────────────────────────────────────────────
  actionBar: {
    display: 'flex', flexDirection: 'column', gap: '8px',
  },
  btn: (variant) => {
    const v = {
      primary: { background: '#1a3a6b', color: '#fff', border: 'none' },
      success: { background: '#2e7d32', color: '#fff', border: 'none' },
      danger:  { background: '#fff', color: '#c62828', border: '1px solid #ffcdd2' },
      warning: { background: '#fff3e0', color: '#e65100', border: '1px solid #ffe0b2' },
      ghost:   { background: '#f5f5f5', color: '#555', border: '1px solid #e0e0e0' },
    }
    return {
      padding: '10px 16px', borderRadius: '8px', fontSize: '13px',
      fontWeight: '600', cursor: 'pointer', width: '100%', textAlign: 'left',
      ...(v[variant] || v.primary),
    }
  },

  // ── Inline panel ──────────────────────────────────────────────────────────
  panel: (color) => ({
    background: color + '0d', border: `1px solid ${color}33`,
    borderRadius: '10px', padding: '14px', marginTop: '8px',
  }),

  // ── Misc ──────────────────────────────────────────────────────────────────
  spinner: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '300px', color: '#888', fontSize: '14px',
  },
  errorBox: {
    background: '#fbe9e7', border: '1px solid #ffcdd2', borderRadius: '10px',
    padding: '24px', textAlign: 'center', color: '#c62828', fontSize: '14px',
  },
  toast: (ok) => ({
    position: 'fixed', bottom: '24px', right: '24px',
    background: ok ? '#1b5e20' : '#b71c1c', color: '#fff',
    padding: '12px 20px', borderRadius: '10px', fontSize: '13px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 9999,
  }),
  flagAlert: {
    background: '#fbe9e7', border: '1px solid #ffcdd2', borderRadius: '8px',
    padding: '10px 14px', marginBottom: '16px', fontSize: '13px',
    color: '#c62828', fontWeight: '600',
  },
  releasedAlert: {
    background: '#e8f5e9', border: '1px solid #c8e6c9', borderRadius: '8px',
    padding: '10px 14px', marginBottom: '16px', fontSize: '13px',
    color: '#2e7d32', fontWeight: '600',
  },
}

const STATUS_STEPS = [
  'pending', 'confirmed', 'ready_for_collection',
  'collected', 'in_transit', 'delivered', 'completed',
]
const STATUS_LABELS = {
  pending: 'Pending', confirmed: 'Confirmed',
  ready_for_collection: 'Ready for Collection',
  collected: 'Collected', in_transit: 'In Transit',
  delivered: 'Delivered', completed: 'Completed',
  disputed: 'Disputed', cancelled: 'Cancelled',
}
const ADVANCE_OPTIONS = {
  pending:              ['confirmed', 'ready_for_collection', 'cancelled'],
  confirmed:            ['ready_for_collection', 'cancelled'],
  ready_for_collection: ['collected', 'cancelled'],
  collected:            ['in_transit', 'cancelled'],
  in_transit:           ['delivered', 'cancelled'],
  delivered:            ['completed'],
}

function fmt(v)     { return 'MWK ' + Number(v || 0).toLocaleString() }
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
function ago(d) {
  if (!d) return '—'
  const h = Math.floor((Date.now() - new Date(d)) / 3600000)
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function AdminOrderDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [order,         setOrder]         = useState(null)
  const [payouts,       setPayouts]       = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [toast,         setToast]         = useState(null)

  // action panels
  const [showAdvance,   setShowAdvance]   = useState(false)
  const [advanceStatus, setAdvanceStatus] = useState('')
  const [advanceReason, setAdvanceReason] = useState('')
  const [advancing,     setAdvancing]     = useState(false)

  const [showCancel,    setShowCancel]    = useState(false)
  const [cancelReason,  setCancelReason]  = useState('')
  const [cancelling,    setCancelling]    = useState(false)

  const [noteText,      setNoteText]      = useState('')
  const [savingNote,    setSavingNote]    = useState(false)
  const [flagging,      setFlagging]      = useState(false)

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      api.get(`/admin/orders/${id}`),
      api.get(`/admin/payments/log?search=${id}`).catch(() => ({ data: { payouts: [] } })),
    ])
      .then(([oRes, pRes]) => {
        const data = oRes.data?.order || oRes.data
        setOrder(data)
        setNoteText(data?.adminNote || '')
        setPayouts(pRes.data.payouts || [])
      })
      .catch(err => setError(err.response?.data?.msg || 'Failed to load order'))
      .finally(() => setLoading(false))
  }, [id])

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  async function handleAdvance() {
    if (!advanceStatus) return
    setAdvancing(true)
    try {
      const res = await api.put(`/admin/orders/${id}/status`, {
        status: advanceStatus, reason: advanceReason,
      })
      setOrder(res.data.order || res.data)
      setShowAdvance(false)
      setAdvanceStatus('')
      setAdvanceReason('')
      showToast(`Status updated to ${STATUS_LABELS[advanceStatus]}`)
    } catch (e) {
      showToast(e.response?.data?.msg || 'Failed to update status', false)
    } finally { setAdvancing(false) }
  }

  async function handleCancel() {
    if (!cancelReason.trim()) { showToast('Enter a cancellation reason', false); return }
    setCancelling(true)
    try {
      const res = await api.put(`/admin/orders/${id}/cancel`, { reason: cancelReason })
      setOrder(res.data.order || res.data)
      setShowCancel(false)
      showToast('Order cancelled')
    } catch (e) {
      showToast(e.response?.data?.msg || 'Failed to cancel order', false)
    } finally { setCancelling(false) }
  }

  async function handleFlag() {
    setFlagging(true)
    try {
      await api.put(`/admin/orders/${id}/flag`, { note: noteText || 'Flagged for investigation' })
      showToast('Order flagged')
      const res = await api.get(`/admin/orders/${id}`)
      setOrder(res.data?.order || res.data)
    } catch { showToast('Failed to flag order', false) }
    finally { setFlagging(false) }
  }

  async function handleSaveNote() {
    setSavingNote(true)
    try {
      await api.put(`/admin/orders/${id}/flag`, { note: noteText })
      showToast('Note saved')
    } catch { showToast('Failed to save note', false) }
    finally { setSavingNote(false) }
  }

  async function handleReleaseEscrow() {
    const reason = window.prompt('Release reason (required):')
    if (!reason) return
    try {
      await api.post(`/admin/escrow/${id}/release`, { reason })
      showToast('Escrow released')
      const res = await api.get(`/admin/orders/${id}`)
      setOrder(res.data?.order || res.data)
    } catch (e) {
      showToast(e.response?.data?.msg || 'Failed to release escrow', false)
    }
  }

  // ── States ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={S.page}>
      <Sidebar active="/admin/orders" />
      <div style={S.main}>
        <div style={S.spinner}>Loading order details…</div>
      </div>
    </div>
  )

  if (error || !order) return (
    <div style={S.page}>
      <Sidebar active="/admin/orders" />
      <div style={S.main}>
        <button style={S.backBtn} onClick={() => navigate('/admin/orders')}>
          ← Back to Orders
        </button>
        <div style={{ ...S.errorBox, marginTop: '24px' }}>
          <div style={{ fontWeight: '700', marginBottom: '6px' }}>⚠️ {error || 'Order not found'}</div>
          <div style={{ fontSize: '12px', color: '#e57373' }}>Check the browser console for details</div>
        </div>
      </div>
    </div>
  )

  const shortId    = String(order._id).slice(-8).toUpperCase()
  const currentIdx = STATUS_STEPS.indexOf(order.orderStatus)
  const canAdvance = !!ADVANCE_OPTIONS[order.orderStatus]?.length
  const canCancel  = !['completed', 'cancelled'].includes(order.orderStatus)
  const canRelease = !['released', 'refunded'].includes(order.paymentStatus)
    && order.orderStatus !== 'cancelled'

  return (
    <div style={S.page}>
      <Sidebar active="/admin/orders" />
      <div style={S.main}>

        {/* ── Top bar ── */}
        <div style={S.topBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button style={S.backBtn} onClick={() => navigate('/admin/orders')}>
              ← Orders
            </button>
            <div>
              <div style={S.pageTitle}>
                Order #{shortId}
                {order.flagged && (
                  <span style={{
                    marginLeft: '10px', fontSize: '12px', background: '#fce4ec',
                    color: '#e53935', padding: '3px 10px', borderRadius: '10px',
                    fontWeight: '700',
                  }}>⚑ FLAGGED</span>
                )}
              </div>
              <div style={S.pageSub}>Placed {fmtDate(order.createdAt)}</div>
            </div>
          </div>
          <span style={S.statusPill(order.orderStatus)}>
            {STATUS_LABELS[order.orderStatus] || order.orderStatus}
          </span>
        </div>

        {/* ── Alerts ── */}
        {order.flagged && (
          <div style={S.flagAlert}>⚠️ This order is flagged for investigation</div>
        )}
        {order.paymentStatus === 'released' && (
          <div style={S.releasedAlert}>✅ Escrow released — payouts completed</div>
        )}

        {/* ── Main 2-col grid ── */}
        <div style={S.grid}>

          {/* ── LEFT COLUMN ── */}
          <div>

            {/* Financial Summary */}
            <div style={S.card}>
              <div style={S.cardHeader}>
                <span style={S.cardTitle}>💰 Financial Summary</span>
                <span style={S.statusPill(order.paymentStatus || 'unpaid')}>
                  {(order.paymentStatus || 'unpaid').toUpperCase()}
                </span>
              </div>
              <div style={S.cardBody}>
                <div style={S.infoGrid3}>
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
                      <div style={{ fontSize: '10px', color: '#bbb', marginTop: '2px' }}>
                        {((order.platformFee / order.productTotal) * 100).toFixed(1)}% of product total
                      </div>
                    )}
                  </div>
                  <div style={S.amountCard('#06b6d4')}>
                    <div style={S.amountLabel}>To Logistics</div>
                    <div style={S.amountValue('#0e7490')}>{fmt(order.amountToLogistics)}</div>
                  </div>
                  <div style={S.amountCard('#e53935')}>
                    <div style={S.amountLabel}>Last Updated</div>
                    <div style={{ fontSize: '13px', color: '#333', fontWeight: '600' }}>{ago(order.updatedAt)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Parties */}
            <div style={S.card}>
              <div style={S.cardHeader}><span style={S.cardTitle}>👥 Parties</span></div>
              <div style={S.cardBody}>
                <div style={S.infoGrid3}>
                  <div style={S.infoItem}>
                    <div style={S.infoLabel}>🛒 Retailer</div>
                    <div style={S.infoValue}>{order.retailer?.businessName || order.retailer?.name || '—'}</div>
                    <div style={S.infoSub}>{order.retailer?.email}</div>
                    {order.retailer?.phone && <div style={S.infoSub}>{order.retailer.phone}</div>}
                  </div>
                  <div style={S.infoItem}>
                    <div style={S.infoLabel}>🏭 Wholesaler</div>
                    <div style={S.infoValue}>{order.wholesaler?.businessName || order.wholesaler?.name || '—'}</div>
                    <div style={S.infoSub}>{order.wholesaler?.email}</div>
                    {order.wholesaler?.phone && <div style={S.infoSub}>{order.wholesaler.phone}</div>}
                  </div>
                  <div style={S.infoItem}>
                    <div style={S.infoLabel}>🚚 Logistics</div>
                    <div style={S.infoValue}>{order.logisticsCompany?.name || '—'}</div>
                    <div style={S.infoSub}>{order.logisticsCompany?.email || order.logisticsCompany?.contactEmail || ''}</div>
                    {order.deliveryStatus && (
                      <div style={S.infoSub}>Delivery: {order.deliveryStatus}</div>
                    )}
                  </div>
                </div>

                {/* Delivery Address */}
                {order.deliveryAddress && Object.keys(order.deliveryAddress).length > 0 && (
                  <div style={{ ...S.infoItem, marginTop: '12px' }}>
                    <div style={S.infoLabel}>📍 Delivery Address</div>
                    <div style={{ fontSize: '13px', color: '#333', lineHeight: 1.7, marginTop: '4px' }}>
                      {[
                        order.deliveryAddress.street,
                        order.deliveryAddress.area || order.deliveryAddress.suburb,
                        order.deliveryAddress.city,
                        order.deliveryAddress.region,
                        order.deliveryAddress.country,
                      ].filter(Boolean).join(', ') || JSON.stringify(order.deliveryAddress)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div style={S.card}>
              <div style={S.cardHeader}>
                <span style={S.cardTitle}>📦 Items</span>
                <span style={{ fontSize: '12px', color: '#888' }}>{order.items?.length || 0} products</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      {['Product', 'Qty', 'Unit Price', 'Subtotal'].map(h => (
                        <th key={h} style={S.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(order.items || []).map((item, i) => (
                      <tr key={i}>
                        <td style={S.td}>
                          <div style={{ fontWeight: '600' }}>{item.name || item.product?.name || '—'}</div>
                          {item.product?._id && (
                            <div style={{ fontSize: '10px', color: '#bbb', fontFamily: 'monospace' }}>
                              #{String(item.product._id).slice(-6).toUpperCase()}
                            </div>
                          )}
                        </td>
                        <td style={S.td}>{item.quantity}</td>
                        <td style={S.td}>{fmt(item.price)}</td>
                        <td style={{ ...S.td, fontWeight: '700', color: '#1a3a6b' }}>
                          {fmt(item.price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payouts */}
            {payouts.length > 0 && (
              <div style={S.card}>
                <div style={S.cardHeader}><span style={S.cardTitle}>💳 Payouts Released</span></div>
                <div style={S.cardBody}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {payouts.map(p => (
                      <div key={p._id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px 14px', background: '#f8faff', borderRadius: '8px',
                        border: '1px solid #e8f0fe',
                      }}>
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
                          {p.vatAmount > 0 && (
                            <div style={{ fontSize: '10px', color: '#e53935' }}>−{fmt(p.vatAmount)} VAT</div>
                          )}
                          <div style={{ fontSize: '10px', color: '#aaa' }}>{fmtDate(p.releasedAt)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* ── RIGHT COLUMN ── */}
          <div>

            {/* Timeline */}
            <div style={S.card}>
              <div style={S.cardHeader}><span style={S.cardTitle}>📋 Order Timeline</span></div>
              <div style={S.cardBody}>
                {order.orderStatus === 'cancelled' ? (
                  <div style={{ ...S.infoItem, borderLeft: '3px solid #e53935' }}>
                    <div style={{ fontWeight: '700', color: '#c62828' }}>❌ Order Cancelled</div>
                    {order.adminNote && (
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                        Reason: {order.adminNote}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>
                      {fmtDate(order.updatedAt)}
                    </div>
                  </div>
                ) : order.orderStatus === 'disputed' ? (
                  <div style={{ ...S.infoItem, borderLeft: '3px solid #f57f17' }}>
                    <div style={{ fontWeight: '700', color: '#bf360c' }}>⚠️ Under Dispute</div>
                    <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>
                      {fmtDate(order.updatedAt)}
                    </div>
                  </div>
                ) : (
                  <div style={S.timeline}>
                    {STATUS_STEPS.map((step, idx) => {
                      const done = idx <= currentIdx
                      const last = idx < STATUS_STEPS.length - 1
                      return (
                        <div key={step} style={S.tItem}>
                          <div style={S.tDot(done)} />
                          {last && <div style={S.tLine} />}
                          <div style={S.tLabel(done)}>{STATUS_LABELS[step]}</div>
                          {done && idx === currentIdx && (
                            <div style={S.tSub}>Current · {ago(order.updatedAt)}</div>
                          )}
                          {done && idx < currentIdx && (
                            <div style={S.tSub}>✓ Done</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Admin Actions */}
            <div style={S.card}>
              <div style={S.cardHeader}><span style={S.cardTitle}>⚙️ Admin Actions</span></div>
              <div style={S.cardBody}>
                <div style={S.actionBar}>

                  {/* Advance Status */}
                  {canAdvance && (
                    <div>
                      <button style={S.btn('primary')}
                        onClick={() => { setShowAdvance(v => !v); setShowCancel(false) }}>
                        ⬆ Advance Status
                      </button>
                      {showAdvance && (
                        <div style={S.panel('#1a3a6b')}>
                          <select
                            value={advanceStatus}
                            onChange={e => setAdvanceStatus(e.target.value)}
                            style={{
                              width: '100%', padding: '8px 10px', border: '1px solid #ddd',
                              borderRadius: '7px', fontSize: '13px', marginBottom: '8px',
                              background: '#fff',
                            }}
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
                            style={{
                              width: '100%', padding: '8px 10px', border: '1px solid #ddd',
                              borderRadius: '7px', fontSize: '13px', marginBottom: '8px',
                              boxSizing: 'border-box',
                            }}
                          />
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button style={{ ...S.btn('primary'), width: 'auto', padding: '8px 14px' }}
                              onClick={handleAdvance} disabled={advancing || !advanceStatus}>
                              {advancing ? 'Saving…' : '✓ Confirm'}
                            </button>
                            <button style={{ ...S.btn('ghost'), width: 'auto', padding: '8px 14px' }}
                              onClick={() => setShowAdvance(false)}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Release Escrow */}
                  {canRelease && (
                    <button style={S.btn('success')} onClick={handleReleaseEscrow}>
                      💰 Release Escrow
                    </button>
                  )}

                  {/* Cancel Order */}
                  {canCancel && (
                    <div>
                      <button style={S.btn('danger')}
                        onClick={() => { setShowCancel(v => !v); setShowAdvance(false) }}>
                        ✕ Cancel Order
                      </button>
                      {showCancel && (
                        <div style={S.panel('#e53935')}>
                          <input
                            value={cancelReason}
                            onChange={e => setCancelReason(e.target.value)}
                            placeholder="Cancellation reason (required)"
                            style={{
                              width: '100%', padding: '8px 10px', border: '1px solid #ffcdd2',
                              borderRadius: '7px', fontSize: '13px', marginBottom: '8px',
                              boxSizing: 'border-box',
                            }}
                          />
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              style={{ ...S.btn('danger'), width: 'auto', padding: '8px 14px', background: '#c62828', color: '#fff', border: 'none' }}
                              onClick={handleCancel} disabled={cancelling || !cancelReason.trim()}>
                              {cancelling ? 'Cancelling…' : '✕ Confirm Cancel'}
                            </button>
                            <button style={{ ...S.btn('ghost'), width: 'auto', padding: '8px 14px' }}
                              onClick={() => setShowCancel(false)}>
                              Back
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Flag Order */}
                  <button style={S.btn('warning')} onClick={handleFlag} disabled={flagging}>
                    {flagging ? 'Flagging…' : '⚑ Flag Order'}
                  </button>

                </div>
              </div>
            </div>

            {/* Admin Note */}
            <div style={S.card}>
              <div style={S.cardHeader}><span style={S.cardTitle}>📝 Admin Note</span></div>
              <div style={S.cardBody}>
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Internal note — not visible to users…"
                  rows={4}
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid #ddd',
                    borderRadius: '8px', fontSize: '13px', resize: 'vertical',
                    fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none',
                  }}
                />
                <button
                  style={{ ...S.btn('ghost'), marginTop: '8px', textAlign: 'center' }}
                  onClick={handleSaveNote} disabled={savingNote}
                >
                  {savingNote ? 'Saving…' : '💾 Save Note'}
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>

      {toast && <div style={S.toast(toast.ok)}>{toast.msg}</div>}
    </div>
  )
}