import { useEffect, useState } from 'react'
import Navbar from '../../components/Navbar'
import api from '../../utils/api'

const PERIODS = [
  { key: 'all',   label: 'All Time' },
  { key: 'month', label: 'This Month' },
  { key: 'week',  label: 'This Week' },
  { key: 'today', label: 'Today' },
]

function fmt(n) { return 'MWK ' + Number(n || 0).toLocaleString() }

function triggerLabel(t) {
  if (t === 'retailer_confirmed') return { text: 'Retailer confirmed', color: '#00c853', bg: '#e8f5e9' }
  if (t === 'auto_confirmed')     return { text: 'Auto-confirmed',     color: '#f59e0b', bg: '#fff8e1' }
  if (t === 'admin_released')     return { text: 'Admin released',     color: '#3b82f6', bg: '#e3f2fd' }
  return { text: t, color: '#888', bg: '#f5f5f5' }
}

export default function LogisticsEarnings() {
  const [payouts,   setPayouts]   = useState([])
  const [summary,   setSummary]   = useState({ totalNet: 0, totalGross: 0 })
  const [period,    setPeriod]    = useState('all')
  const [page,      setPage]      = useState(1)
  const [pages,     setPages]     = useState(1)
  const [total,     setTotal]     = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [companyId, setCompanyId] = useState(null)
  const [error,     setError]     = useState('')

  useEffect(() => {
    api.get('/logistics/me')
      .then(r => setCompanyId(r.data._id))
      .catch(() => setError('Could not load company info'))
  }, [])

  useEffect(() => {
    if (companyId) load()
  }, [companyId, period, page])

  async function load() {
    setLoading(true)
    try {
      const res = await api.get(`/payouts/logistics/${companyId}?period=${period}&page=${page}&limit=20`)
      setPayouts(res.data.payouts  || [])
      setSummary(res.data.summary  || { totalNet: 0, totalGross: 0 })
      setTotal(res.data.total      || 0)
      setPages(res.data.pages      || 1)
    } catch {
      setError('Failed to load earnings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={S.page}>
      <Navbar />
      <div style={S.body}>
        <h1 style={S.title}>Delivery Earnings</h1>
        <p style={S.sub}>Delivery fee payouts released from escrow</p>

        <div style={S.tabs}>
          {PERIODS.map(p => (
            <button key={p.key}
              style={{ ...S.tab, background: period === p.key ? '#1a3a6b' : '#fff', color: period === p.key ? '#fff' : '#666' }}
              onClick={() => { setPeriod(p.key); setPage(1) }}>
              {p.label}
            </button>
          ))}
        </div>

        <div style={S.grid2}>
          <div style={{ ...S.card, borderTop: '3px solid #00c853' }}>
            <p style={S.cardLabel}>Total Earned</p>
            <p style={S.cardVal}>{fmt(summary.totalNet)}</p>
            <p style={S.cardSub}>net received</p>
          </div>
          <div style={{ ...S.card, borderTop: '3px solid #1a3a6b' }}>
            <p style={S.cardLabel}>Paid Deliveries</p>
            <p style={S.cardVal}>{total}</p>
            <p style={S.cardSub}>escrow released</p>
          </div>
        </div>

        <div style={S.tableCard}>
          <div style={S.tableHeader}>
            <span style={S.tableTitle}>Payout History</span>
            <span style={S.tableCount}>{total} payouts</span>
          </div>

          {error ? (
            <div style={S.empty}>{error}</div>
          ) : loading ? (
            <div style={S.empty}>Loading…</div>
          ) : payouts.length === 0 ? (
            <div style={S.empty}>{'No payouts yet.\n\nDelivery fees are released when the retailer confirms receipt or after the auto-confirm period.'}</div>
          ) : (
            payouts.map((p, i) => {
              const trig    = triggerLabel(p.trigger)
              const date    = new Date(p.releasedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
              const shortId = String(p.order?._id || p._id).slice(-8).toUpperCase()
              return (
                <div key={p._id} style={{ ...S.row, background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <div style={S.rowLeft}>
                    <span style={S.orderId}>#{shortId}</span>
                    <span style={{ ...S.badge, color: trig.color, background: trig.bg }}>{trig.text}</span>
                    <span style={S.date}>{date}</span>
                  </div>
                  <div style={S.rowRight}>
                    <span style={S.feeLabel}>Delivery fee</span>
                    <span style={S.netAmount}>{fmt(p.netAmount)}</span>
                  </div>
                </div>
              )
            })
          )}

          {pages > 1 && (
            <div style={S.pagination}>
              <button style={S.pageBtn(page === 1)} disabled={page === 1}
                onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span style={S.pageInfo}>Page {page} of {pages}</span>
              <button style={S.pageBtn(page === pages)} disabled={page === pages}
                onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const S = {
  page:       { background: '#f0f0f0', minHeight: '100vh' },
  body:       { maxWidth: '430px', margin: '0 auto', padding: '16px 16px 40px' },
  title:      { fontSize: '20px', fontWeight: '700', color: '#0d2347', margin: '0 0 4px' },
  sub:        { fontSize: '13px', color: '#888', margin: '0 0 20px' },
  tabs:       { display: 'flex', gap: '6px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' },
  tab:        { padding: '7px 14px', borderRadius: '99px', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' },
  grid2:      { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' },
  card:       { background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' },
  cardLabel:  { fontSize: '11px', color: '#888', margin: '0 0 6px', textTransform: 'uppercase' },
  cardVal:    { fontSize: '20px', fontWeight: '800', color: '#0d2347', margin: '0 0 4px' },
  cardSub:    { fontSize: '10px', color: '#aaa', margin: 0 },
  tableCard:  { background: '#fff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' },
  tableHeader:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f0f0f0' },
  tableTitle: { fontSize: '14px', fontWeight: '700', color: '#0d2347' },
  tableCount: { fontSize: '12px', color: '#aaa' },
  row:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #f5f5f5' },
  rowLeft:    { display: 'flex', flexDirection: 'column', gap: '4px' },
  rowRight:   { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' },
  orderId:    { fontSize: '12px', fontFamily: 'monospace', fontWeight: '700', color: '#1a3a6b' },
  badge:      { display: 'inline-block', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '8px' },
  date:       { fontSize: '11px', color: '#aaa' },
  feeLabel:   { fontSize: '11px', color: '#888' },
  netAmount:  { fontSize: '16px', fontWeight: '800', color: '#00c853' },
  empty:      { textAlign: 'center', padding: '40px 20px', color: '#aaa', fontSize: '13px', lineHeight: '1.8', whiteSpace: 'pre-line' },
  pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid #f0f0f0' },
  pageBtn:    (dis) => ({ padding: '6px 14px', border: '1px solid #ddd', borderRadius: '6px', background: dis ? '#f5f5f5' : '#fff', color: dis ? '#bbb' : '#1a3a6b', cursor: dis ? 'not-allowed' : 'pointer', fontSize: '12px' }),
  pageInfo:   { fontSize: '12px', color: '#888' },
}