import { useState, useEffect } from 'react'
import Navbar from '../../components/Navbar'
import api from '../../utils/api'

const statusColor = {
  pending:              { bg: '#fff8e1', color: '#f59e0b' },
  ready_for_collection: { bg: '#fff3e0', color: '#f97316' },
  collected:            { bg: '#fff3e0', color: '#f97316' },
  in_transit:           { bg: '#e0f7fa', color: '#06b6d4' },
  delivered:            { bg: '#e8f5e9', color: '#00c853' },
  confirmed:            { bg: '#e8f5e9', color: '#00c853' },
  completed:            { bg: '#e8f5e9', color: '#1a3a6b' },
  cancelled:            { bg: '#fce4ec', color: '#e53935' },
}

export default function WholesalerDashboard() {
  const [orders,   setOrders]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [expanded, setExpanded] = useState(null)
  const [updating, setUpdating] = useState(null)
  const [filter,   setFilter]   = useState('all')

  useEffect(() => {
    api.get('/orders/all')
      .then(r => setOrders(r.data))
      .catch(() => setError('Failed to load orders'))
      .finally(() => setLoading(false))
  }, [])

  const updateStatus = async (orderId, status) => {
    setUpdating(orderId)
    try {
      const { data } = await api.put(`/orders/${orderId}/status`, { status })
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, ...data } : o))
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to update')
    } finally {
      setUpdating(null)
    }
  }

  const filters = ['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled']

  const filtered = filter === 'all'
    ? orders
    : orders.filter(o => (o.status || o.orderStatus) === filter)

  const stats = {
    total:    orders.length,
    pending:  orders.filter(o => o.status === 'pending').length,
    active:   orders.filter(o => ['confirmed', 'shipped'].includes(o.status)).length,
    delivered:orders.filter(o => o.status === 'delivered').length,
  }

  return (
    <div style={S.page}>
      <Navbar />
      <div style={S.body}>
        <h1 style={S.title}>Orders Dashboard</h1>

        {/* Stats */}
        <div style={S.statsRow}>
          {[
            { label: 'Total', value: stats.total, color: '#1a3a6b' },
            { label: 'Pending', value: stats.pending, color: '#f59e0b' },
            { label: 'Active', value: stats.active, color: '#06b6d4' },
            { label: 'Delivered', value: stats.delivered, color: '#00c853' },
          ].map(s => (
            <div key={s.label} style={S.statCard}>
              <p style={{ ...S.statVal, color: s.color }}>{s.value}</p>
              <p style={S.statLabel}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={S.tabs}>
          {filters.map(f => (
            <button
              key={f}
              style={{ ...S.tab, background: filter === f ? '#1a3a6b' : '#fff', color: filter === f ? '#fff' : '#666' }}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {error   && <div style={S.error}>{error}</div>}
        {loading && <p style={S.empty}>Loading orders…</p>}

        {!loading && filtered.length === 0 && (
          <div style={S.emptyCard}>
            <p style={{ fontSize: '40px', margin: '0 0 10px' }}>📋</p>
            <p style={{ color: '#999', margin: 0 }}>No orders in this category</p>
          </div>
        )}

        {filtered.map(order => {
          const status  = order.orderStatus || order.status || 'pending'
          const sc      = statusColor[status] || { bg: '#f5f5f5', color: '#999' }
          const shortId = order._id.slice(-8).toUpperCase()
          const isOpen  = expanded === order._id

          return (
            <div key={order._id} style={S.card}>
              {/* Card header */}
              <div style={S.cardTop} onClick={() => setExpanded(isOpen ? null : order._id)}>
                <div>
                  <p style={S.orderId}>#{shortId}</p>
                  <p style={S.retailer}>{order.retailer?.name} · {order.retailer?.businessName || order.retailer?.email}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ ...S.badge, background: sc.bg, color: sc.color }}>
                    {status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                  <p style={S.amount}>MWK {Number(order.totalAmount).toLocaleString()}</p>
                </div>
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div style={S.detail}>
                  {/* Items */}
                  <p style={S.detailLabel}>Items</p>
                  {order.items.map((item, i) => (
                    <div key={i} style={S.itemRow}>
                      <span>{item.name || item.product?.name} ×{item.quantity}</span>
                      <span style={{ color: '#1a3a6b', fontWeight: '600' }}>MWK {Number(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}

                  {/* Delivery */}
                  {order.deliveryAddress?.street && (
                    <>
                      <p style={S.detailLabel}>Deliver to</p>
                      <p style={S.detailText}>{[order.deliveryAddress.street, order.deliveryAddress.city, order.deliveryAddress.country].filter(Boolean).join(', ')}</p>
                    </>
                  )}

                  {/* Logistics */}
                  {order.logisticsCompany && (
                    <>
                      <p style={S.detailLabel}>Logistics</p>
                      <p style={S.detailText}>🚚 {order.logisticsCompany.name}</p>
                    </>
                  )}

                  {/* Pricing */}
                  <div style={S.priceRow}>
                    <span>Products</span>
                    <span>MWK {Number(order.productTotal || order.totalAmount).toLocaleString()}</span>
                  </div>
                  {order.deliveryFee > 0 && (
                    <div style={S.priceRow}>
                      <span>Delivery fee</span>
                      <span>MWK {Number(order.deliveryFee).toLocaleString()}</span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={S.btnRow}>
                    {order.status === 'pending' && (
                      <button
                        style={{ ...S.actionBtn, background: 'linear-gradient(135deg,#1a3a6b,#00c853)', opacity: updating === order._id ? 0.7 : 1 }}
                        onClick={() => updateStatus(order._id, 'confirmed')}
                        disabled={updating === order._id}
                      >
                        {updating === order._id ? 'Updating…' : '✓ Confirm Order'}
                      </button>
                    )}
                    {order.status === 'confirmed' && (
                      <button
                        style={{ ...S.actionBtn, background: '#f97316', opacity: updating === order._id ? 0.7 : 1 }}
                        onClick={() => updateStatus(order._id, 'shipped')}
                        disabled={updating === order._id}
                      >
                        {updating === order._id ? 'Updating…' : '🏭 Mark Ready for Collection'}
                      </button>
                    )}
                    {!['cancelled', 'delivered', 'confirmed', 'completed'].includes(order.status) && (
                      <button
                        style={{ ...S.actionBtn, background: '#e53935', opacity: updating === order._id ? 0.7 : 1 }}
                        onClick={() => updateStatus(order._id, 'cancelled')}
                        disabled={updating === order._id}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const S = {
  page:        { background: '#f0f0f0', minHeight: '100vh' },
  body:        { maxWidth: '430px', margin: '0 auto', padding: '16px' },
  title:       { fontSize: '20px', fontWeight: '700', color: '#0d2347', margin: '0 0 16px' },
  statsRow:    { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '16px' },
  statCard:    { background: '#fff', borderRadius: '10px', padding: '12px 8px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  statVal:     { fontSize: '22px', fontWeight: '800', margin: 0 },
  statLabel:   { fontSize: '11px', color: '#aaa', margin: '2px 0 0' },
  tabs:        { display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '16px', paddingBottom: '4px' },
  tab:         { padding: '6px 12px', borderRadius: '99px', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' },
  error:       { background: '#fff0f0', border: '1px solid #ffcccc', color: '#cc0000', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '12px' },
  empty:       { textAlign: 'center', color: '#999', padding: '40px 0' },
  emptyCard:   { background: '#fff', borderRadius: '12px', padding: '40px 20px', textAlign: 'center' },
  card:        { background: '#fff', borderRadius: '12px', marginBottom: '10px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  cardTop:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '14px 16px', cursor: 'pointer' },
  orderId:     { fontWeight: '700', color: '#0d2347', fontSize: '15px', margin: 0 },
  retailer:    { fontSize: '12px', color: '#aaa', margin: '2px 0 0' },
  badge:       { padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: '700' },
  amount:      { fontSize: '13px', fontWeight: '700', color: '#1a3a6b', margin: '4px 0 0' },
  detail:      { padding: '0 16px 16px', borderTop: '1px solid #f5f5f5' },
  detailLabel: { fontSize: '11px', fontWeight: '700', color: '#aaa', textTransform: 'uppercase', margin: '12px 0 6px' },
  detailText:  { fontSize: '13px', color: '#444', margin: 0 },
  itemRow:     { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#444', padding: '4px 0', borderBottom: '1px solid #f9f9f9' },
  priceRow:    { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#444', padding: '4px 0' },
  btnRow:      { display: 'flex', gap: '8px', marginTop: '14px' },
  actionBtn:   { flex: 1, padding: '10px', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' },
}