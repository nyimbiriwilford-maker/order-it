import { useState, useEffect } from 'react'
import Navbar from '../../components/Navbar'
import { useAuth } from '../../context/AuthContext'
import api from '../../utils/api'

export default function Analytics() {
  const { user }  = useAuth()
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [period,  setPeriod]  = useState('all')

  useEffect(() => {
    api.get('/orders/all')
      .then(r => setOrders(r.data))
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [])

  const now = new Date()

  // Filter orders by period
  const periodFiltered = orders.filter(o => {
    if (o.orderStatus === 'cancelled') return false
    if (period === 'all')   return true
    const created = new Date(o.createdAt)
    if (period === 'today') return created.toDateString() === now.toDateString()
    if (period === 'week')  { const d = new Date(now); d.setDate(now.getDate() - 7); return created >= d }
    if (period === 'month') { const d = new Date(now); d.setMonth(now.getMonth() - 1); return created >= d }
    return true
  })

  // Filter items to only this wholesaler's items
  const myItems = []
  periodFiltered.forEach(o => {
    o.items.forEach(item => {
      const itemWholesaler = item.wholesaler?.toString() || ''
      const myId           = user?.id?.toString() || ''
      if (itemWholesaler === myId) {
        myItems.push({ ...item, order: o })
      }
    })
  })

  // Stats based on my items only
  const totalRevenue  = myItems.reduce((s, i) => s + i.price * i.quantity, 0)
  const totalOrders   = new Set(myItems.map(i => i.order._id)).size
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const delivered     = new Set(
    myItems
      .filter(i => ['delivered', 'confirmed', 'completed'].includes(i.order.orderStatus))
      .map(i => i.order._id)
  ).size

  // Top products from my items
  const productMap = {}
  myItems.forEach(item => {
    const name = item.name || 'Unknown'
    if (!productMap[name]) productMap[name] = { name, qty: 0, revenue: 0 }
    productMap[name].qty     += item.quantity
    productMap[name].revenue += item.price * item.quantity
  })
  const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  // Orders by status (orders that contain my items)
  const myOrderIds = new Set(myItems.map(i => i.order._id))
  const myOrders   = periodFiltered.filter(o => myOrderIds.has(o._id))
  const byStatus   = {
    pending:   myOrders.filter(o => o.status === 'pending').length,
    confirmed: myOrders.filter(o => o.status === 'confirmed').length,
    shipped:   myOrders.filter(o => o.status === 'shipped').length,
    delivered: myOrders.filter(o => o.status === 'delivered').length,
  }

  // Daily revenue last 7 days from my items only
  const last7 = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const dateStr    = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    const dayRevenue = myItems
      .filter(item => new Date(item.order.createdAt).toDateString() === d.toDateString())
      .reduce((s, item) => s + item.price * item.quantity, 0)
    last7.push({ date: dateStr, revenue: dayRevenue })
  }

  const maxRevenue = Math.max(...last7.map(d => d.revenue), 1)

  return (
    <div style={S.page}>
      <Navbar />
      <div style={S.body}>
        <h1 style={S.title}>Analytics</h1>

        {/* Period filter */}
        <div style={S.tabs}>
          {[['all', 'All Time'], ['today', 'Today'], ['week', 'This Week'], ['month', 'This Month']].map(([val, label]) => (
            <button
              key={val}
              style={{ ...S.tab, background: period === val ? '#1a3a6b' : '#fff', color: period === val ? '#fff' : '#666' }}
              onClick={() => setPeriod(val)}
            >
              {label}
            </button>
          ))}
        </div>

        {error   && <div style={S.error}>{error}</div>}
        {loading && <p style={S.empty}>Loading analytics…</p>}

        {!loading && (
          <>
            {/* Key metrics */}
            <div style={S.grid2}>
              <div style={{ ...S.metricCard, background: 'linear-gradient(135deg,#1a3a6b,#00c853)' }}>
                <p style={S.metricLabel}>Revenue</p>
                <p style={S.metricVal}>MWK {Number(totalRevenue).toLocaleString()}</p>
              </div>
              <div style={{ ...S.metricCard, background: 'linear-gradient(135deg,#06b6d4,#1a3a6b)' }}>
                <p style={S.metricLabel}>Orders</p>
                <p style={S.metricVal}>{totalOrders}</p>
              </div>
              <div style={{ ...S.metricCard, background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>
                <p style={S.metricLabel}>Avg Order</p>
                <p style={S.metricVal}>MWK {Number(avgOrderValue).toLocaleString()}</p>
              </div>
              <div style={{ ...S.metricCard, background: 'linear-gradient(135deg,#00c853,#1a3a6b)' }}>
                <p style={S.metricLabel}>Delivered</p>
                <p style={S.metricVal}>{delivered}</p>
              </div>
            </div>

            {/* 7-day revenue chart */}
            <div style={S.card}>
              <h2 style={S.secTitle}>Revenue — Last 7 Days</h2>
              <div style={S.chartWrap}>
                {last7.map((d, i) => (
                  <div key={i} style={S.barCol}>
                    <p style={S.barVal}>{d.revenue > 0 ? `${Math.round(d.revenue / 1000)}k` : ''}</p>
                    <div style={S.barTrack}>
                      <div style={{ ...S.bar, height: `${Math.max((d.revenue / maxRevenue) * 100, d.revenue > 0 ? 4 : 0)}%` }} />
                    </div>
                    <p style={S.barLabel}>{d.date}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Order status breakdown */}
            <div style={S.card}>
              <h2 style={S.secTitle}>Orders by Status</h2>
              {Object.entries(byStatus).map(([status, count]) => {
                const pct    = totalOrders > 0 ? (count / totalOrders) * 100 : 0
                const colors = { pending: '#f59e0b', confirmed: '#06b6d4', shipped: '#f97316', delivered: '#00c853' }
                return (
                  <div key={status} style={S.statusRow}>
                    <span style={S.statusName}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                    <div style={S.progressTrack}>
                      <div style={{ ...S.progressBar, width: `${pct}%`, background: colors[status] || '#1a3a6b' }} />
                    </div>
                    <span style={S.statusCount}>{count}</span>
                  </div>
                )
              })}
            </div>

            {/* Top products */}
            <div style={S.card}>
              <h2 style={S.secTitle}>Top Products by Revenue</h2>
              {topProducts.length === 0 && <p style={{ color: '#aaa', fontSize: '13px' }}>No data yet</p>}
              {topProducts.map((p, i) => (
                <div key={p.name} style={S.productRow}>
                  <span style={S.productRank}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <p style={S.productName}>{p.name}</p>
                    <p style={S.productSub}>{p.qty} units sold</p>
                  </div>
                  <span style={S.productRevenue}>MWK {Number(p.revenue).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const S = {
  page:          { background: '#f0f0f0', minHeight: '100vh' },
  body:          { maxWidth: '430px', margin: '0 auto', padding: '16px' },
  title:         { fontSize: '20px', fontWeight: '700', color: '#0d2347', margin: '0 0 16px' },
  tabs:          { display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' },
  tab:           { padding: '7px 14px', borderRadius: '99px', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' },
  error:         { background: '#fff0f0', border: '1px solid #ffcccc', color: '#cc0000', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '12px' },
  empty:         { textAlign: 'center', color: '#999', padding: '40px 0' },
  grid2:         { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' },
  metricCard:    { borderRadius: '12px', padding: '16px', color: '#fff' },
  metricLabel:   { fontSize: '11px', opacity: 0.8, margin: '0 0 6px', textTransform: 'uppercase' },
  metricVal:     { fontSize: '18px', fontWeight: '800', margin: 0 },
  card:          { background: '#fff', borderRadius: '12px', padding: '16px 20px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  secTitle:      { fontSize: '13px', fontWeight: '700', color: '#0d2347', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  chartWrap:     { display: 'flex', alignItems: 'flex-end', gap: '6px', height: '120px' },
  barCol:        { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' },
  barVal:        { fontSize: '9px', color: '#aaa', margin: '0 0 2px', height: '14px' },
  barTrack:      { flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' },
  bar:           { width: '100%', background: 'linear-gradient(180deg,#00c853,#1a3a6b)', borderRadius: '4px 4px 0 0', minHeight: '2px', transition: 'height 0.3s' },
  barLabel:      { fontSize: '9px', color: '#aaa', margin: '4px 0 0', textAlign: 'center' },
  statusRow:     { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' },
  statusName:    { fontSize: '12px', color: '#555', width: '70px', flexShrink: 0 },
  progressTrack: { flex: 1, height: '8px', background: '#f0f0f0', borderRadius: '99px', overflow: 'hidden' },
  progressBar:   { height: '100%', borderRadius: '99px', transition: 'width 0.4s' },
  statusCount:   { fontSize: '12px', fontWeight: '700', color: '#0d2347', width: '24px', textAlign: 'right' },
  productRow:    { display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid #f5f5f5' },
  productRank:   { width: '20px', height: '20px', borderRadius: '50%', background: 'linear-gradient(135deg,#1a3a6b,#00c853)', color: '#fff', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  productName:   { fontSize: '13px', fontWeight: '600', color: '#0d2347', margin: 0 },
  productSub:    { fontSize: '11px', color: '#aaa', margin: '2px 0 0' },
  productRevenue:{ fontSize: '13px', fontWeight: '700', color: '#1a3a6b', whiteSpace: 'nowrap' },
}