import { useState, useEffect } from 'react'
import { useNavigate }         from 'react-router-dom'
import { usePrefs }            from '../../context/PreferencesContext'
import Navbar                  from '../../components/Navbar'
import api                     from '../../utils/api'

const STATUS_COLOR = {
  pending:              { bg: '#fff8e1', color: '#f59e0b' },
  ready_for_collection: { bg: '#fff3e0', color: '#f97316' },
  collected:            { bg: '#fff3e0', color: '#f97316' },
  in_transit:           { bg: '#e0f7fa', color: '#06b6d4' },
  delivered:            { bg: '#e8f5e9', color: '#00c853' },
  confirmed:            { bg: '#e8f5e9', color: '#00c853' },
  completed:            { bg: '#e8f5e9', color: '#1a3a6b' },
  cancelled:            { bg: '#fce4ec', color: '#e53935' },
}

const STATUS_LABEL = {
  pending:              'Pending',
  ready_for_collection: 'Ready for Collection',
  collected:            'Collected',
  in_transit:           'In Transit',
  delivered:            'Delivered',
  confirmed:            'Confirmed',
  completed:            'Completed',
  cancelled:            'Cancelled',
}

export default function Orders() {
  const navigate              = useNavigate()
  const { formatPrice }       = usePrefs()
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    api.get('/orders/mine')
      .then(r => setOrders(r.data))
      .catch(() => setError('Failed to load orders'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ maxWidth: '430px', margin: '0 auto', padding: '16px' }}>

        <h1 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 16px' }}>
          My Orders
        </h1>

        {error && (
          <div style={{ background: '#fff0f0', border: '1px solid #ffcccc', color: '#cc0000', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '12px' }}>
            {error}
          </div>
        )}

        {loading && (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
            Loading orders…
          </p>
        )}

        {!loading && orders.length === 0 && (
          <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '60px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: '48px', margin: '0 0 12px' }}>📦</p>
            <p style={{ color: 'var(--text-muted)', margin: '0 0 20px' }}>No orders yet</p>
            <button
              style={{ background: 'linear-gradient(135deg,#1a3a6b,#00c853)', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 24px', fontWeight: '700', cursor: 'pointer' }}
              onClick={() => navigate('/')}
            >
              Start Shopping
            </button>
          </div>
        )}

        {orders.map(order => {
          const status  = order.orderStatus || order.status || 'pending'
          const sc      = STATUS_COLOR[status] || { bg: 'var(--bg-subtle)', color: 'var(--text-muted)' }
          const shortId = order._id.slice(-8).toUpperCase()

          return (
            <div
              key={order._id}
              style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '16px', marginBottom: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer' }}
              onClick={() => navigate(`/orders/${order._id}`)}
            >
              {/* Top row: order ID + status badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '15px' }}>
                  #{shortId}
                </span>
                <span style={{ padding: '4px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: '700', background: sc.bg, color: sc.color }}>
                  {STATUS_LABEL[status] || status}
                </span>
              </div>

              {/* Item chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                {order.items.slice(0, 2).map((item, i) => (
                  <span key={i} style={{ background: 'var(--bg-subtle)', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {item.name || item.product?.name} ×{item.quantity}
                  </span>
                ))}
                {order.items.length > 2 && (
                  <span style={{ background: 'var(--bg-subtle)', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    +{order.items.length - 2} more
                  </span>
                )}
              </div>

              {/* Bottom row: date + total */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {new Date(order.createdAt).toLocaleDateString()}
                </span>
                <span style={{ fontWeight: '700', color: '#1a3a6b', fontSize: '14px' }}>
                  {formatPrice(order.totalAmount)}
                </span>
              </div>

              {/* Logistics company */}
              {order.logisticsCompany && (
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '8px 0 0' }}>
                  🚚 {order.logisticsCompany.name}
                </p>
              )}
            </div>
          )
        })}

      </div>
    </div>
  )
}