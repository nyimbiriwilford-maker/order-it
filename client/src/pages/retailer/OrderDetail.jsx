import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { usePrefs }            from '../../context/PreferencesContext'
import Navbar                  from '../../components/Navbar'
import api                     from '../../utils/api'

const STEPS = [
  { key: 'pending',              label: 'Order Placed',         icon: '🛒' },
  { key: 'ready_for_collection', label: 'Ready for Collection', icon: '🏭' },
  { key: 'collected',            label: 'Collected',            icon: '🤝' },
  { key: 'in_transit',           label: 'In Transit',           icon: '🚚' },
  { key: 'delivered',            label: 'Delivered',            icon: '📬' },
  { key: 'confirmed',            label: 'Completed',            icon: '✅' },
]

const STATUS_COLOR = {
  pending:              '#f59e0b',
  ready_for_collection: '#f97316',
  collected:            '#f97316',
  in_transit:           '#06b6d4',
  delivered:            '#00c853',
  confirmed:            '#00c853',
  completed:            '#1a3a6b',
  cancelled:            '#e53935',
  disputed:             '#9c27b0',
}

export default function OrderDetail() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const { formatPrice } = usePrefs()

  const [order,      setOrder]      = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
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

  if (loading) return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      <Navbar />
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px' }}>Loading…</p>
    </div>
  )

  if (error) return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ maxWidth: '430px', margin: '0 auto', padding: '16px' }}>
        <p style={{ color: '#e53935' }}>{error}</p>
        <button style={btn.back} onClick={() => navigate('/orders')}>← Back</button>
      </div>
    </div>
  )

  const status     = order.orderStatus || order.status || 'pending'
  const stepIndex  = STEPS.findIndex(s => s.key === status)
  const statusClr  = STATUS_COLOR[status] || '#999'
  const canConfirm = status === 'delivered' && !order.retailerConfirmed
  const canCancel  = status === 'pending'
  const canRate    = ['delivered', 'confirmed', 'completed'].includes(status) && !order.ratingSubmitted && order.logisticsCompany
  const canDispute = ['delivered', 'completed'].includes(status)
  const isDisputed = status === 'disputed'

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ maxWidth: '430px', margin: '0 auto', padding: '16px' }}>

        <button style={btn.back} onClick={() => navigate('/orders')}>← My Orders</button>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
              Order #{id.slice(-8).toUpperCase()}
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <span style={{ padding: '5px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap', background: statusClr + '22', color: statusClr }}>
            {status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </span>
        </div>

        {/* Disputed notice */}
        {isDisputed && (
          <div style={{ background: '#f3e5f5', border: '1px solid #ce93d8', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#6a1b9a', marginBottom: '12px', lineHeight: '1.5' }}>
            ⚖️ A dispute has been raised on this order. Our admin team is reviewing it and will be in touch.
          </div>
        )}

        {/* Timeline */}
        <div style={card}>
          <h2 style={secTitle}>Order Progress</h2>
          {STEPS.map((step, i) => {
            const done    = i <= stepIndex
            const current = i === stepIndex
            return (
              <div key={step.key} style={{ display: 'grid', gridTemplateColumns: '36px 1fr', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    background: done ? 'linear-gradient(135deg,#1a3a6b,#00c853)' : 'var(--bg-subtle)',
                    boxShadow:  current ? '0 0 0 4px #1a3a6b22' : 'none',
                  }}>
                    {done && <span style={{ fontSize: '12px' }}>{step.icon}</span>}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{ width: '2px', height: '20px', margin: '3px auto 0', background: i < stepIndex ? '#00c853' : 'var(--border)' }} />
                  )}
                </div>
                <p style={{ fontSize: '13px', margin: '6px 0 14px', color: done ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: current ? '700' : '500' }}>
                  {step.label}
                </p>
              </div>
            )
          })}
        </div>

        {/* Confirm receipt */}
        {canConfirm && (
          <div style={card}>
            <p style={{ margin: '0 0 12px', fontWeight: '600', color: 'var(--text-primary)' }}>📬 Have you received your order?</p>
            <button
              style={{ ...btn.action, background: 'linear-gradient(135deg,#1a3a6b,#00c853)', opacity: confirming ? 0.7 : 1 }}
              onClick={handleConfirm} disabled={confirming}
            >
              {confirming ? 'Confirming…' : '✅ Confirm Receipt'}
            </button>
          </div>
        )}

        {/* Rate delivery */}
        {canRate && (
          <div style={{ ...card, background: '#fffbeb', border: '1px solid #fcd34d' }}>
            <p style={{ margin: '0 0 12px', fontWeight: '600', color: '#92400e' }}>⭐ How was your delivery?</p>
            <Link to={`/rate/${order._id}`}>
              <button style={{ ...btn.action, background: '#f59e0b' }}>Rate Delivery</button>
            </Link>
          </div>
        )}

        {/* Cancel */}
        {canCancel && (
          <div style={{ ...card, background: '#fff5f5', border: '1px solid #ffcccc' }}>
            <p style={{ margin: '0 0 12px', fontWeight: '600', color: '#e53935' }}>Want to cancel this order?</p>
            <button style={{ ...btn.action, background: '#e53935' }} onClick={handleCancel}>Cancel Order</button>
          </div>
        )}

        {/* Raise dispute */}
        {canDispute && !isDisputed && (
          <div style={{ ...card, background: '#f9f0ff', border: '1px solid #d8b4fe' }}>
            <p style={{ margin: '0 0 4px', fontWeight: '600', color: '#6b21a8' }}>⚖️ Problem with this order?</p>
            <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#7c3aed' }}>
              If your order was not received, arrived damaged, or was incorrect — raise a dispute.
            </p>
            <button style={{ ...btn.action, background: '#7c3aed' }} onClick={() => navigate(`/dispute/${order._id}`)}>
              Raise a Dispute
            </button>
          </div>
        )}

        {/* Items */}
        <div style={card}>
          <h2 style={secTitle}>Items Ordered</h2>
          {order.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '13px' }}>
              <span style={{ fontWeight: '600', color: 'var(--text-primary)', flex: 1 }}>
                {item.name || item.product?.name}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>×{item.quantity}</span>
              <span style={{ fontWeight: '700', color: '#1a3a6b' }}>
                {formatPrice(item.price * item.quantity)}
              </span>
            </div>
          ))}

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
            <span>Products</span>
            <span>{formatPrice(order.productTotal || order.totalAmount)}</span>
          </div>
          {order.deliveryFee > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
              <span>Delivery fee</span>
              <span>{formatPrice(order.deliveryFee)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', borderTop: '1px solid var(--border-subtle)', marginTop: '2px' }}>
            <span>Total</span>
            <span style={{ color: '#1a3a6b' }}>{formatPrice(order.totalAmount)}</span>
          </div>
        </div>

        {/* Delivery address */}
        {order.deliveryAddress?.street && (
          <div style={card}>
            <h2 style={secTitle}>Delivery Address</h2>
            <p style={{ margin: '0 0 6px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              {[order.deliveryAddress.street, order.deliveryAddress.city, order.deliveryAddress.state, order.deliveryAddress.country].filter(Boolean).join(', ')}
            </p>
          </div>
        )}

        {/* Logistics */}
        {order.logisticsCompany && (
          <div style={card}>
            <h2 style={secTitle}>Logistics</h2>
            <p style={{ margin: '0 0 6px', fontSize: '14px', color: 'var(--text-secondary)' }}>🚚 {order.logisticsCompany.name}</p>
            {order.estimatedDeliveryDate && (
              <p style={{ margin: '0 0 6px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                📅 Est. delivery: {new Date(order.estimatedDeliveryDate).toLocaleDateString()}
              </p>
            )}
            {order.trackingNumber && (
              <p style={{ margin: '0 0 6px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                🔍 Tracking: <strong style={{ color: 'var(--text-primary)' }}>{order.trackingNumber}</strong>
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

// ─── shared style snippets ────────────────────────────────────────────────────
const card = {
  background:   'var(--bg-card)',
  borderRadius: '12px',
  padding:      '16px 20px',
  marginBottom: '12px',
  boxShadow:    '0 2px 8px rgba(0,0,0,0.06)',
}

const secTitle = {
  fontSize:      '14px',
  fontWeight:    '700',
  color:         'var(--text-primary)',
  margin:        '0 0 14px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}

const btn = {
  back: {
    background: 'none', border: 'none',
    color: '#1a3a6b', fontWeight: '600',
    cursor: 'pointer', fontSize: '14px',
    padding: '0 0 16px', display: 'block',
  },
  action: {
    width: '100%', padding: '12px',
    color: '#fff', border: 'none',
    borderRadius: '8px', fontWeight: '700',
    fontSize: '14px', cursor: 'pointer',
  },
}