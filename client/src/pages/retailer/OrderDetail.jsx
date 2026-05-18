import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import api from '../../utils/api'

const steps = [
  { key: 'pending',              label: 'Order Placed',        icon: '🛒' },
  { key: 'ready_for_collection', label: 'Ready for Collection', icon: '🏭' },
  { key: 'collected',            label: 'Collected',           icon: '🤝' },
  { key: 'in_transit',           label: 'In Transit',          icon: '🚚' },
  { key: 'delivered',            label: 'Delivered',           icon: '📬' },
  { key: 'confirmed',            label: 'Completed',           icon: '✅' },
]

const statusColor = {
  pending: '#f59e0b', ready_for_collection: '#f97316',
  collected: '#f97316', in_transit: '#06b6d4',
  delivered: '#00c853', confirmed: '#00c853',
  completed: '#1a3a6b', cancelled: '#e53935',
  disputed:  '#9c27b0',
}

export default function OrderDetail() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const [order,    setOrder]    = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    api.get('/orders/mine')
      .then(r => {
        const found = r.data.find(o => o._id === id)
        if (found) setOrder(found)
        else setError('Order not found.')
      })
      .catch(() => setError('Failed to load order.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleConfirm = async () => {
    if (!window.confirm('Confirm you have received this order?')) return
    setConfirming(true)
    try {
      await api.put(`/orders/${id}/confirm`, {})
      setOrder(prev => ({ ...prev, orderStatus: 'confirmed', retailerConfirmed: true }))
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to confirm')
    } finally {
      setConfirming(false)
    }
  }

  const handleCancel = async () => {
    if (!window.confirm('Cancel this order?')) return
    try {
      await api.put(`/orders/${id}/cancel`, {})
      setOrder(prev => ({ ...prev, orderStatus: 'cancelled', status: 'cancelled' }))
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to cancel')
    }
  }

  if (loading) return <div style={S.page}><Navbar /><p style={S.empty}>Loading…</p></div>
  if (error)   return <div style={S.page}><Navbar /><div style={S.body}><p style={{ color: '#e53935' }}>{error}</p><button style={S.backBtn} onClick={() => navigate('/orders')}>← Back</button></div></div>

  const status    = order.orderStatus || order.status || 'pending'
  const stepIndex = steps.findIndex(s => s.key === status)
  const canConfirm  = status === 'delivered' && !order.retailerConfirmed
  const canCancel   = status === 'pending'
  const canRate     = ['delivered', 'confirmed', 'completed'].includes(status) && !order.ratingSubmitted && order.logisticsCompany
  const canDispute  = ['delivered', 'completed'].includes(status)
  const isDisputed  = status === 'disputed'

  return (
    <div style={S.page}>
      <Navbar />
      <div style={S.body}>
        <button style={S.backBtn} onClick={() => navigate('/orders')}>← My Orders</button>

        {/* Header */}
        <div style={S.header}>
          <div>
            <h1 style={S.title}>Order #{id.slice(-8).toUpperCase()}</h1>
            <p style={S.sub}>{new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <span style={{ ...S.badge, background: (statusColor[status] || '#999') + '20', color: statusColor[status] || '#999' }}>
            {status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </span>
        </div>

        {/* Disputed notice */}
        {isDisputed && (
          <div style={S.disputedBanner}>
            ⚖️ A dispute has been raised on this order. Our admin team is reviewing it and will be in touch.
          </div>
        )}

        {/* Timeline */}
        <div style={S.card}>
          <h2 style={S.secTitle}>Order Progress</h2>
          {steps.map((step, i) => {
            const done    = i <= stepIndex
            const current = i === stepIndex
            return (
              <div key={step.key} style={S.stepRow}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    ...S.dot,
                    background: done ? 'linear-gradient(135deg,#1a3a6b,#00c853)' : '#e5e7eb',
                    boxShadow:  current ? '0 0 0 4px #1a3a6b22' : 'none',
                  }}>
                    {done ? <span style={{ fontSize: '12px' }}>{step.icon}</span> : null}
                  </div>
                  {i < steps.length - 1 && (
                    <div style={{ ...S.line, background: i < stepIndex ? '#00c853' : '#e5e7eb' }} />
                  )}
                </div>
                <p style={{ ...S.stepLabel, color: done ? '#0d2347' : '#aaa', fontWeight: current ? '700' : '500' }}>
                  {step.label}
                </p>
              </div>
            )
          })}
        </div>

        {/* Confirm receipt */}
        {canConfirm && (
          <div style={S.actionCard}>
            <p style={{ margin: '0 0 12px', fontWeight: '600', color: '#0d2347' }}>📬 Have you received your order?</p>
            <button style={{ ...S.actionBtn, background: 'linear-gradient(135deg,#1a3a6b,#00c853)', opacity: confirming ? 0.7 : 1 }} onClick={handleConfirm} disabled={confirming}>
              {confirming ? 'Confirming…' : '✅ Confirm Receipt'}
            </button>
          </div>
        )}

        {/* Rate delivery */}
        {canRate && (
          <div style={{ ...S.actionCard, background: '#fffbeb', border: '1px solid #fcd34d' }}>
            <p style={{ margin: '0 0 12px', fontWeight: '600', color: '#92400e' }}>⭐ How was your delivery?</p>
            <Link to={`/rate/${order._id}`}>
              <button style={{ ...S.actionBtn, background: '#f59e0b' }}>Rate Delivery</button>
            </Link>
          </div>
        )}

        {/* Cancel */}
        {canCancel && (
          <div style={{ ...S.actionCard, background: '#fff5f5', border: '1px solid #ffcccc' }}>
            <p style={{ margin: '0 0 12px', fontWeight: '600', color: '#e53935' }}>Want to cancel this order?</p>
            <button style={{ ...S.actionBtn, background: '#e53935' }} onClick={handleCancel}>Cancel Order</button>
          </div>
        )}

        {/* Raise dispute */}
        {canDispute && !isDisputed && (
          <div style={{ ...S.actionCard, background: '#f9f0ff', border: '1px solid #d8b4fe' }}>
            <p style={{ margin: '0 0 4px', fontWeight: '600', color: '#6b21a8' }}>⚖️ Problem with this order?</p>
            <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#7c3aed' }}>
              If your order was not received, arrived damaged, or was incorrect — raise a dispute.
            </p>
            <button
              style={{ ...S.actionBtn, background: '#7c3aed' }}
              onClick={() => navigate(`/dispute/${order._id}`)}
            >
              Raise a Dispute
            </button>
          </div>
        )}

        {/* Items */}
        <div style={S.card}>
          <h2 style={S.secTitle}>Items Ordered</h2>
          {order.items.map((item, i) => (
            <div key={i} style={S.itemRow}>
              <span style={{ fontWeight: '600', color: '#0d2347' }}>{item.name || item.product?.name}</span>
              <span style={{ color: '#aaa', fontSize: '13px' }}>×{item.quantity}</span>
              <span style={{ fontWeight: '700', color: '#1a3a6b', marginLeft: 'auto' }}>
                MWK {Number(item.price * item.quantity).toLocaleString()}
              </span>
            </div>
          ))}
          <div style={S.totalRow}>
            <span>Products</span>
            <span>MWK {Number(order.productTotal || order.totalAmount).toLocaleString()}</span>
          </div>
          {order.deliveryFee > 0 && (
            <div style={S.totalRow}>
              <span>Delivery fee</span>
              <span>MWK {Number(order.deliveryFee).toLocaleString()}</span>
            </div>
          )}
          <div style={{ ...S.totalRow, fontWeight: '700', fontSize: '15px', borderTop: '1px solid #f0f0f0', paddingTop: '10px' }}>
            <span>Total</span>
            <span style={{ color: '#1a3a6b' }}>MWK {Number(order.totalAmount).toLocaleString()}</span>
          </div>
        </div>

        {/* Delivery address */}
        {order.deliveryAddress?.street && (
          <div style={S.card}>
            <h2 style={S.secTitle}>Delivery Address</h2>
            <p style={S.infoText}>
              {[order.deliveryAddress.street, order.deliveryAddress.city, order.deliveryAddress.state, order.deliveryAddress.country].filter(Boolean).join(', ')}
            </p>
          </div>
        )}

        {/* Logistics */}
        {order.logisticsCompany && (
          <div style={S.card}>
            <h2 style={S.secTitle}>Logistics</h2>
            <p style={S.infoText}>🚚 {order.logisticsCompany.name}</p>
            {order.estimatedDeliveryDate && (
              <p style={S.infoText}>📅 Est. delivery: {new Date(order.estimatedDeliveryDate).toLocaleDateString()}</p>
            )}
            {order.trackingNumber && (
              <p style={S.infoText}>🔍 Tracking: <strong>{order.trackingNumber}</strong></p>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

const S = {
  page:       { background: '#f0f0f0', minHeight: '100vh' },
  body:       { maxWidth: '430px', margin: '0 auto', padding: '16px' },
  backBtn:    { background: 'none', border: 'none', color: '#1a3a6b', fontWeight: '600', cursor: 'pointer', fontSize: '14px', padding: '0 0 16px', display: 'block' },
  header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' },
  title:      { fontSize: '20px', fontWeight: '700', color: '#0d2347', margin: 0 },
  sub:        { fontSize: '12px', color: '#aaa', margin: '4px 0 0' },
  badge:      { padding: '5px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap' },
  card:       { background: '#fff', borderRadius: '12px', padding: '16px 20px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  secTitle:   { fontSize: '14px', fontWeight: '700', color: '#0d2347', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  stepRow:    { display: 'grid', gridTemplateColumns: '36px 1fr', gap: '12px', alignItems: 'flex-start' },
  dot:        { width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  line:       { width: '2px', height: '20px', margin: '3px auto 0' },
  stepLabel:  { fontSize: '13px', margin: '6px 0 14px' },
  actionCard: { background: '#fff', borderRadius: '12px', padding: '16px 20px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  actionBtn:  { width: '100%', padding: '12px', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' },
  itemRow:    { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #f5f5f5', fontSize: '13px' },
  totalRow:   { display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', color: '#444' },
  infoText:   { margin: '0 0 6px', fontSize: '14px', color: '#444' },
  empty:      { textAlign: 'center', color: '#999', padding: '40px 20px' },
  disputedBanner: {
    background: '#f3e5f5', border: '1px solid #ce93d8',
    borderRadius: '10px', padding: '12px 16px',
    fontSize: '13px', color: '#6a1b9a',
    marginBottom: '12px', lineHeight: '1.5',
  },
}