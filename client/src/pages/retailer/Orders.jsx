import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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

const statusLabel = {
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
  const navigate           = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    api.get('/orders/mine')
      .then(r => setOrders(r.data))
      .catch(() => setError('Failed to load orders'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={S.page}>
      <Navbar />
      <div style={S.body}>
        <h1 style={S.title}>My Orders</h1>

        {error   && <div style={S.error}>{error}</div>}
        {loading && <p style={S.empty}>Loading orders…</p>}

        {!loading && orders.length === 0 && (
          <div style={S.emptyCard}>
            <p style={{ fontSize: '48px', margin: '0 0 12px' }}>📦</p>
            <p style={{ color: '#999', margin: '0 0 20px' }}>No orders yet</p>
            <button style={S.shopBtn} onClick={() => navigate('/')}>Start Shopping</button>
          </div>
        )}

        {orders.map(order => {
          const status = order.orderStatus || order.status || 'pending'
          const sc     = statusColor[status] || { bg: '#f5f5f5', color: '#999' }
          const shortId = order._id.slice(-8).toUpperCase()
          return (
            <div key={order._id} style={S.card} onClick={() => navigate(`/orders/${order._id}`)}>
              <div style={S.cardTop}>
                <span style={S.orderId}>#{shortId}</span>
                <span style={{ ...S.badge, background: sc.bg, color: sc.color }}>
                  {statusLabel[status] || status}
                </span>
              </div>

              <div style={S.itemsList}>
                {order.items.slice(0, 2).map((item, i) => (
                  <span key={i} style={S.itemChip}>
                    {item.name || item.product?.name} ×{item.quantity}
                  </span>
                ))}
                {order.items.length > 2 && (
                  <span style={S.itemChip}>+{order.items.length - 2} more</span>
                )}
              </div>

              <div style={S.cardBottom}>
                <span style={S.date}>{new Date(order.createdAt).toLocaleDateString()}</span>
                <span style={S.total}>MWK {Number(order.totalAmount).toLocaleString()}</span>
              </div>

              {order.logisticsCompany && (
                <p style={S.logistics}>🚚 {order.logisticsCompany.name}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const S = {
  page:      { background: '#f0f0f0', minHeight: '100vh' },
  body:      { maxWidth: '430px', margin: '0 auto', padding: '16px' },
  title:     { fontSize: '20px', fontWeight: '700', color: '#0d2347', margin: '0 0 16px' },
  error:     { background: '#fff0f0', border: '1px solid #ffcccc', color: '#cc0000', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '12px' },
  empty:     { textAlign: 'center', color: '#999', padding: '40px 0' },
  emptyCard: { background: '#fff', borderRadius: '16px', padding: '60px 20px', textAlign: 'center' },
  shopBtn:   { background: 'linear-gradient(135deg,#1a3a6b,#00c853)', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 24px', fontWeight: '700', cursor: 'pointer' },
  card:      { background: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer' },
  cardTop:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  orderId:   { fontWeight: '700', color: '#0d2347', fontSize: '15px' },
  badge:     { padding: '4px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: '700' },
  itemsList: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' },
  itemChip:  { background: '#f5f5f5', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', color: '#555' },
  cardBottom:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  date:      { fontSize: '12px', color: '#aaa' },
  total:     { fontWeight: '700', color: '#1a3a6b', fontSize: '14px' },
  logistics: { fontSize: '12px', color: '#666', margin: '8px 0 0' },
}