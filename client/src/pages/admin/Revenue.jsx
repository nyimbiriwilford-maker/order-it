// client/src/pages/admin/Revenue.jsx
//
// 1. ADD to App.jsx imports:
//      import AdminRevenue from './pages/admin/Revenue'
// 2. ADD to App.jsx routes (inside admin block):
//      <Route path="/admin/revenue" element={<ProtectedRoute role="admin"><AdminRevenue /></ProtectedRoute>} />
// 3. The NAV array in Dashboard.jsx already has a 'Payments' entry.
//    Change its label/path OR add a new 'Revenue' entry:
//      { label: 'Revenue', path: '/admin/revenue', icon: '💵' }
//
// Endpoints used (all new — see adminFinancials.js):
//   GET /api/admin/financials/summary
//   GET /api/admin/financials/monthly
//   GET /api/admin/financials/commission-by-wholesaler
//   GET /api/admin/financials/payouts-log
//   GET /api/admin/financials/export

import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate }                               from 'react-router-dom'
import api                                           from '../../utils/api'
import { Sidebar }                                   from './Dashboard'   // reuse existing sidebar

// ─── style tokens — match Dashboard.jsx exactly ─────────────────────────────
const NAVY   = '#1a3a6b'
const GREEN  = '#00c853'
const GRAY   = '#f0f0f0'
const BORDER = '#e8e8e8'

const S = {
  page:     { minHeight: '100vh', background: GRAY, fontFamily: 'Arial, sans-serif' },
  main:     { marginLeft: '220px', padding: '28px 32px', minHeight: '100vh' },
  topBar:   { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' },
  pageTitle:    { fontSize: '22px', fontWeight: 'bold', color: NAVY },
  pageSubtitle: { fontSize: '13px', color: '#888', marginTop: '2px' },

  // tab bar
  tabBar:   { display: 'flex', gap: '4px', marginBottom: '22px', background: '#fff', padding: '4px', borderRadius: '10px', width: 'fit-content', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' },
  tab: (a) => ({
    padding: '7px 16px', borderRadius: '7px', fontSize: '13px', fontWeight: a ? '600' : '400',
    cursor: 'pointer', border: 'none', background: a ? NAVY : 'transparent',
    color: a ? '#fff' : '#666', transition: 'all 0.15s',
  }),

  // period pills
  pills:    { display: 'flex', gap: '6px', alignItems: 'center' },
  pill: (a) => ({
    padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '500',
    cursor: 'pointer', border: `1px solid ${a ? NAVY : BORDER}`,
    background: a ? NAVY : '#fff', color: a ? '#fff' : '#666',
  }),

  // KPI cards — match Dashboard statCard style
  kpiGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '16px', marginBottom: '24px' },
  kpiCard: (accent) => ({
    background: '#fff', borderRadius: '12px', padding: '20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderTop: `3px solid ${accent}`,
  }),
  kpiValue: { fontSize: '22px', fontWeight: 'bold', color: NAVY, lineHeight: 1.2 },
  kpiLabel: { fontSize: '12px', color: '#888', marginTop: '4px' },
  kpiSub:   { fontSize: '11px', marginTop: '6px', fontWeight: '600' },

  // cards
  card: {
    background: '#fff', borderRadius: '12px', padding: '20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: '20px',
  },
  cardTitle: {
    fontSize: '14px', fontWeight: 'bold', color: NAVY,
    marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' },

  // table
  table:  { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th:     { padding: '9px 10px', textAlign: 'left', color: '#888', fontWeight: '600', fontSize: '11px', borderBottom: `1px solid ${BORDER}`, whiteSpace: 'nowrap' },
  thR:    { padding: '9px 10px', textAlign: 'right', color: '#888', fontWeight: '600', fontSize: '11px', borderBottom: `1px solid ${BORDER}`, whiteSpace: 'nowrap' },
  td:     { padding: '10px 10px', color: '#333', borderBottom: `1px solid #f8f8f8`, whiteSpace: 'nowrap' },
  tdR:    { padding: '10px 10px', color: '#333', borderBottom: `1px solid #f8f8f8`, whiteSpace: 'nowrap', textAlign: 'right' },

  // misc
  spinner:   { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#888', fontSize: '14px' },
  emptyMsg:  { color: '#aaa', fontSize: '13px', textAlign: 'center', padding: '24px 0' },
  exportBtn: {
    padding: '7px 16px', background: NAVY, color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600',
  },
  filterRow: { display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' },
  select: {
    padding: '6px 10px', borderRadius: '6px', border: `1px solid ${BORDER}`,
    fontSize: '13px', color: '#333', background: '#fff',
  },
  badge: (color) => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: '10px',
    fontSize: '11px', fontWeight: '600', background: color + '20', color,
  }),
  pgBtn: (disabled) => ({
    padding: '5px 12px', borderRadius: '6px', border: `1px solid ${BORDER}`,
    background: disabled ? '#f5f5f5' : '#fff', color: disabled ? '#bbb' : NAVY,
    fontSize: '12px', cursor: disabled ? 'default' : 'pointer',
  }),
}

// ─── helpers ─────────────────────────────────────────────────────────────────
const MWK   = (n) => 'MWK ' + Math.round(Number(n) || 0).toLocaleString('en-MW')
const pct   = (v) => (v >= 0 ? '+' : '') + Number(v).toFixed(1) + '%'
const fmtPct = (v) => Number(v).toFixed(2) + '%'

function momColor(v) { return v == null ? '#888' : v >= 0 ? GREEN : '#e53935' }

// ─── tiny canvas bar chart ────────────────────────────────────────────────────
// Renders a multi-series grouped bar chart inline without any library.
// series: [{ key, color, label }]
function BarChart({ rows, series, height = 240 }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !rows.length) return
    const dpr = window.devicePixelRatio || 1
    const w   = canvas.offsetWidth
    canvas.width  = w * dpr
    canvas.height = height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    const PL = 72, PR = 12, PT = 12, PB = 36
    const cW  = w - PL - PR
    const cH  = height - PT - PB
    const n   = rows.length
    const ns  = series.length

    const maxVal = Math.max(...rows.flatMap(r => series.map(s => r[s.key] || 0)), 1)

    // y-axis grid + labels
    const steps = 4
    ctx.font      = '10px Arial'
    ctx.fillStyle = '#aaa'
    ctx.textAlign = 'right'
    for (let i = 0; i <= steps; i++) {
      const y   = PT + (cH / steps) * i
      const val = maxVal - (maxVal / steps) * i
      ctx.strokeStyle = 'rgba(0,0,0,0.06)'
      ctx.lineWidth   = 0.5
      ctx.beginPath(); ctx.moveTo(PL, y); ctx.lineTo(PL + cW, y); ctx.stroke()
      const label = val >= 1e6 ? (val / 1e6).toFixed(0) + 'M'
                  : val >= 1e3 ? (val / 1e3).toFixed(0) + 'K'
                  : val.toFixed(0)
      ctx.fillText(label, PL - 5, y + 3)
    }

    // bars
    const groupW  = cW / n
    const barW    = Math.min((groupW * 0.8) / ns, 28)
    const barGap  = 2
    const groupPad = (groupW - barW * ns - barGap * (ns - 1)) / 2

    rows.forEach((row, i) => {
      series.forEach((s, si) => {
        const val = row[s.key] || 0
        const bh  = (val / maxVal) * cH
        const x   = PL + i * groupW + groupPad + si * (barW + barGap)
        const y   = PT + cH - bh
        ctx.fillStyle = s.color
        ctx.fillRect(Math.round(x), Math.round(y), Math.round(barW), Math.round(bh))
      })

      // x-axis label
      ctx.fillStyle = '#888'
      ctx.textAlign = 'center'
      ctx.font      = '10px Arial'
      const labelX  = PL + i * groupW + groupW / 2
      const label   = row.key?.slice(5) ?? ''   // "MM" from "YYYY-MM"
      ctx.fillText(label, labelX, PT + cH + 18)
    })
  }, [rows, series, height])

  return <canvas ref={ref} style={{ width: '100%', height, display: 'block' }} />
}

// ─── horizontal bar (share chart) ────────────────────────────────────────────
function ShareBar({ label, value, total, color }) {
  const share = total > 0 ? (value / total) * 100 : 0
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
        <span style={{ color: '#444' }}>{label}</span>
        <span style={{ color: '#888' }}>{MWK(value)} · {share.toFixed(1)}%</span>
      </div>
      <div style={{ height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: share + '%', height: '100%', background: color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
      </div>
    </div>
  )
}

// ─── trigger badge ────────────────────────────────────────────────────────────
const TRIGGER_COLOR = {
  retailer_confirmed: GREEN,
  auto_confirmed:     '#f59e0b',
  admin_released:     '#e53935',
}
function TriggerBadge({ trigger }) {
  const labels = { retailer_confirmed: 'Retailer', auto_confirmed: 'Auto', admin_released: 'Admin' }
  return <span style={S.badge(TRIGGER_COLOR[trigger] ?? '#888')}>{labels[trigger] ?? trigger}</span>
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function AdminRevenue() {
  const navigate = useNavigate()

  // active sub-tab
  const [tab, setTab] = useState('overview')  // overview | wholesalers | cashflow | log

  // period for monthly chart (number of months to fetch)
  const [months, setMonths] = useState(12)

  // data states
  const [summary,     setSummary]     = useState(null)
  const [monthly,     setMonthly]     = useState([])
  const [wholesalers, setWholesalers] = useState([])
  const [logPage,     setLogPage]     = useState({ payouts: [], pagination: { total: 0, page: 1, pages: 1 } })

  // loading / error
  const [loadingSummary,     setLoadingSummary]     = useState(true)
  const [loadingMonthly,     setLoadingMonthly]     = useState(true)
  const [loadingWholesalers, setLoadingWholesalers] = useState(true)
  const [loadingLog,         setLoadingLog]         = useState(true)
  const [errorMsg,           setErrorMsg]           = useState('')

  // payout log filters
  const [logFilters, setLogFilters] = useState({ type: '', trigger: '', page: 1 })

  // export feedback
  const [exportMsg, setExportMsg] = useState('')

  // ── data fetchers ───────────────────────────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true)
    try {
      const { data } = await api.get('/admin/financials/summary')
      setSummary(data)
    } catch (e) {
      setErrorMsg('Could not load summary: ' + (e.response?.data?.message ?? e.message))
    } finally {
      setLoadingSummary(false)
    }
  }, [])

  const fetchMonthly = useCallback(async () => {
    setLoadingMonthly(true)
    try {
      const { data } = await api.get(`/admin/financials/monthly?months=${months}`)
      setMonthly(data.rows ?? [])
    } catch (e) {
      setErrorMsg('Could not load monthly data')
    } finally {
      setLoadingMonthly(false)
    }
  }, [months])

  const fetchWholesalers = useCallback(async () => {
    setLoadingWholesalers(true)
    try {
      const { data } = await api.get('/admin/financials/commission-by-wholesaler?limit=20')
      setWholesalers(data.rows ?? [])
    } catch (e) {
      setErrorMsg('Could not load wholesaler data')
    } finally {
      setLoadingWholesalers(false)
    }
  }, [])

  const fetchLog = useCallback(async () => {
    setLoadingLog(true)
    try {
      const params = new URLSearchParams({
        page:  logFilters.page,
        limit: 20,
        ...(logFilters.type    && { type:    logFilters.type }),
        ...(logFilters.trigger && { trigger: logFilters.trigger }),
      })
      const { data } = await api.get(`/admin/financials/payouts-log?${params}`)
      setLogPage(data)
    } catch (e) {
      setErrorMsg('Could not load payout log')
    } finally {
      setLoadingLog(false)
    }
  }, [logFilters])

  useEffect(() => { fetchSummary() },     [fetchSummary])
  useEffect(() => { fetchMonthly() },     [fetchMonthly])
  useEffect(() => { fetchWholesalers() }, [fetchWholesalers])
  useEffect(() => { fetchLog() },         [fetchLog])

  // ── CSV export ──────────────────────────────────────────────────────────────
  async function handleExport() {
    setExportMsg('Preparing CSV…')
    try {
      const { data } = await api.get('/admin/financials/export')
      if (!data.rows?.length) { setExportMsg('No data to export'); setTimeout(() => setExportMsg(''), 3000); return }

      // Convert to CSV in browser — no library needed for simple flat objects
      const headers = Object.keys(data.rows[0])
      const csv = [
        headers.join(','),
        ...data.rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(',')),
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `order-it-revenue-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setExportMsg('✓ Downloaded')
    } catch {
      setExportMsg('Export failed')
    }
    setTimeout(() => setExportMsg(''), 3000)
  }

  // ── derived values ──────────────────────────────────────────────────────────
  const mom     = summary?.mom
  const lt      = summary?.lifetime   ?? {}
  const period  = summary?.period     ?? {}
  const rates   = summary?.rates      ?? {}
  const totalW  = wholesalers.reduce((s, r) => s + (r.commission ?? 0), 0)

  // ── KPI cards data ──────────────────────────────────────────────────────────
  const KPI_CARDS = summary ? [
    {
      label:  'Commission Earned (all time)',
      value:  MWK(lt.commission),
      accent: NAVY,
      sub:    mom?.changePercent != null
        ? pct(mom.changePercent) + ' vs last month'
        : null,
      subColor: mom?.changePercent != null ? momColor(mom.changePercent) : '#888',
    },
    {
      label:  'GMV — Completed Orders',
      value:  MWK(lt.gmv),
      accent: '#3b82f6',
      sub:    lt.completedOrders + ' orders completed',
      subColor: '#888',
    },
    {
      label:  'VAT Collected (all time)',
      value:  MWK(lt.vatCollected),
      accent: '#f59e0b',
      sub:    `${rates.vatRate ?? 0}% rate on wholesaler gross`,
      subColor: '#888',
    },
    {
      label:  'Escrow Held Now',
      value:  MWK(lt.escrowHeldNow),
      accent: '#8b5cf6',
      sub:    'Pending release',
      subColor: '#888',
    },
    {
      label:  'Refunds Issued',
      value:  MWK(lt.refunded),
      accent: '#e53935',
      sub:    lt.refundedCount + ' refunded orders',
      subColor: '#e53935',
    },
    {
      label:  'Platform Fee Rate',
      value:  fmtPct(rates.platformFeeRate ?? 0),
      accent: GREEN,
      sub:    'Applied to order product total',
      subColor: '#888',
    },
  ] : []

  return (
    <div style={S.page}>
      <Sidebar active="/admin/revenue" />

      <div style={S.main}>

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div style={S.topBar}>
          <div>
            <div style={S.pageTitle}>💵 Platform Revenue</div>
            <div style={S.pageSubtitle}>Commission earned, cash flow, and payout log · all figures in MWK</div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {exportMsg
              ? <span style={{ fontSize: '13px', color: GREEN, fontWeight: '600' }}>{exportMsg}</span>
              : <button style={S.exportBtn} onClick={handleExport}>↓ Export CSV</button>
            }
          </div>
        </div>

        {/* ── Error banner ─────────────────────────────────────────────────── */}
        {errorMsg && (
          <div style={{ background: '#fff3f3', border: '1px solid #e53935', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', fontSize: '13px', color: '#c62828' }}>
            {errorMsg}
          </div>
        )}

        {/* ── MoM highlight banner ─────────────────────────────────────────── */}
        {mom && (
          <div style={{
            background: '#fff', borderRadius: '10px', padding: '12px 20px',
            marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '24px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
            borderLeft: `4px solid ${momColor(mom.changePercent)}`,
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>This month commission</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: NAVY }}>{MWK(mom.thisMonth)}</div>
            </div>
            <div style={{ color: '#ddd', fontSize: '20px' }}>→</div>
            <div>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>Last month</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#555' }}>{MWK(mom.lastMonth)}</div>
            </div>
            {mom.changePercent != null && (
              <div style={{
                marginLeft: 'auto', padding: '6px 14px', borderRadius: '8px',
                background: momColor(mom.changePercent) + '18',
                color: momColor(mom.changePercent), fontWeight: 'bold', fontSize: '15px',
              }}>
                {pct(mom.changePercent)} MoM
              </div>
            )}
          </div>
        )}

        {/* ── KPI cards ────────────────────────────────────────────────────── */}
        {loadingSummary ? (
          <div style={S.spinner}>Loading summary…</div>
        ) : (
          <div style={S.kpiGrid}>
            {KPI_CARDS.map(c => (
              <div key={c.label} style={S.kpiCard(c.accent)}>
                <div style={S.kpiValue}>{c.value}</div>
                <div style={S.kpiLabel}>{c.label}</div>
                {c.sub && <div style={{ ...S.kpiSub, color: c.subColor }}>{c.sub}</div>}
              </div>
            ))}
          </div>
        )}

        {/* ── Sub-tabs ─────────────────────────────────────────────────────── */}
        <div style={S.tabBar}>
          {[
            { id: 'overview',    label: '📊 Monthly Overview' },
            { id: 'wholesalers', label: '🏪 By Wholesaler' },
            { id: 'cashflow',    label: '🔄 Cash Flow' },
            { id: 'log',         label: '📋 Payout Log' },
          ].map(t => (
            <button key={t.id} style={S.tab(tab === t.id)} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            TAB: Monthly Overview
        ════════════════════════════════════════════════════════════════════ */}
        {tab === 'overview' && (
          <>
            {/* period selector */}
            <div style={{ ...S.pills, marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', color: '#888' }}>Show:</span>
              {[6, 12, 24].map(m => (
                <button key={m} style={S.pill(months === m)} onClick={() => setMonths(m)}>
                  {m} months
                </button>
              ))}
            </div>

            {/* commission + GMV chart */}
            <div style={S.card}>
              <div style={S.cardTitle}>
                <span>Monthly Commission vs GMV</span>
                <div style={{ display: 'flex', gap: '14px', fontSize: '11px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: NAVY, display: 'inline-block' }} />
                    Commission
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: '#3b82f6', display: 'inline-block' }} />
                    GMV
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: '#f59e0b', display: 'inline-block' }} />
                    VAT Collected
                  </span>
                </div>
              </div>
              {loadingMonthly
                ? <div style={S.spinner}>Loading chart…</div>
                : <BarChart
                    rows={monthly}
                    series={[
                      { key: 'commission',   color: NAVY,      label: 'Commission' },
                      { key: 'gmv',          color: '#3b82f6', label: 'GMV' },
                      { key: 'vatCollected', color: '#f59e0b', label: 'VAT' },
                    ]}
                    height={240}
                  />
              }
            </div>

            {/* net platform cash chart */}
            <div style={S.card}>
              <div style={S.cardTitle}>
                <span>Net Platform Cash per Month</span>
                <span style={{ fontSize: '11px', color: '#888', fontWeight: '400' }}>
                  Commission + VAT withheld from wholesaler gross
                </span>
              </div>
              {loadingMonthly
                ? <div style={S.spinner}>Loading…</div>
                : <BarChart
                    rows={monthly}
                    series={[{ key: 'netPlatformCash', color: GREEN, label: 'Net Cash' }]}
                    height={180}
                  />
              }
            </div>

            {/* monthly table */}
            <div style={S.card}>
              <div style={S.cardTitle}>Monthly Breakdown</div>
              {loadingMonthly ? <div style={S.spinner}>Loading…</div> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Month</th>
                        <th style={S.thR}>Orders</th>
                        <th style={S.thR}>GMV</th>
                        <th style={S.thR}>Commission</th>
                        <th style={S.thR}>VAT Collected</th>
                        <th style={S.thR}>Net Platform Cash</th>
                        <th style={S.thR}>W'saler Payouts</th>
                        <th style={S.thR}>Logistics Payouts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthly.length === 0 && (
                        <tr><td colSpan={8} style={{ ...S.td, textAlign: 'center', color: '#aaa' }}>No data yet</td></tr>
                      )}
                      {monthly.map((r, i) => {
                        // MoM commission change
                        const prev   = monthly[i - 1]?.commission ?? null
                        const change = prev ? ((r.commission - prev) / prev) * 100 : null
                        return (
                          <tr key={r.key} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                            <td style={S.td}>
                              <strong>{r.key}</strong>
                            </td>
                            <td style={S.tdR}>{r.orders.toLocaleString()}</td>
                            <td style={S.tdR}>{MWK(r.gmv)}</td>
                            <td style={{ ...S.tdR, color: NAVY, fontWeight: '600' }}>{MWK(r.commission)}</td>
                            <td style={S.tdR}>{MWK(r.vatCollected)}</td>
                            <td style={{ ...S.tdR, color: GREEN, fontWeight: '600' }}>{MWK(r.netPlatformCash)}</td>
                            <td style={S.tdR}>{MWK(r.wholesalerPayout)}</td>
                            <td style={S.tdR}>
                              {MWK(r.logisticsPayout)}
                              {change != null && (
                                <div style={{ fontSize: '10px', color: change >= 0 ? GREEN : '#e53935', marginTop: '2px' }}>
                                  {pct(change)}
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    {monthly.length > 0 && (() => {
                      const tot = {
                        orders:           monthly.reduce((s, r) => s + r.orders, 0),
                        gmv:              monthly.reduce((s, r) => s + r.gmv, 0),
                        commission:       monthly.reduce((s, r) => s + r.commission, 0),
                        vatCollected:     monthly.reduce((s, r) => s + r.vatCollected, 0),
                        netPlatformCash:  monthly.reduce((s, r) => s + r.netPlatformCash, 0),
                        wholesalerPayout: monthly.reduce((s, r) => s + r.wholesalerPayout, 0),
                        logisticsPayout:  monthly.reduce((s, r) => s + r.logisticsPayout, 0),
                      }
                      return (
                        <tfoot>
                          <tr style={{ background: '#f0f4ff', fontWeight: 'bold' }}>
                            <td style={{ ...S.td, color: NAVY }}>TOTAL</td>
                            <td style={S.tdR}>{tot.orders.toLocaleString()}</td>
                            <td style={S.tdR}>{MWK(tot.gmv)}</td>
                            <td style={{ ...S.tdR, color: NAVY }}>{MWK(tot.commission)}</td>
                            <td style={S.tdR}>{MWK(tot.vatCollected)}</td>
                            <td style={{ ...S.tdR, color: GREEN }}>{MWK(tot.netPlatformCash)}</td>
                            <td style={S.tdR}>{MWK(tot.wholesalerPayout)}</td>
                            <td style={S.tdR}>{MWK(tot.logisticsPayout)}</td>
                          </tr>
                        </tfoot>
                      )
                    })()}
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TAB: Commission by Wholesaler
        ════════════════════════════════════════════════════════════════════ */}
        {tab === 'wholesalers' && (
          <>
            <div style={S.row2}>
              {/* share bars */}
              <div style={S.card}>
                <div style={S.cardTitle}>Commission Share</div>
                {loadingWholesalers
                  ? <div style={S.spinner}>Loading…</div>
                  : wholesalers.length === 0
                    ? <div style={S.emptyMsg}>No completed orders yet</div>
                    : wholesalers.slice(0, 8).map((w, i) => (
                        <ShareBar
                          key={w._id ?? i}
                          label={w.businessName ?? w.name ?? w.email ?? 'Unknown'}
                          value={w.commission}
                          total={totalW}
                          color={['#1a3a6b','#3b82f6','#00c853','#f59e0b','#8b5cf6','#e53935','#06b6d4','#f97316'][i % 8]}
                        />
                      ))
                }
              </div>

              {/* top 3 summary cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {wholesalers.slice(0, 3).map((w, i) => (
                  <div key={w._id ?? i} style={{
                    ...S.card, marginBottom: 0,
                    borderLeft: `4px solid ${['#1a3a6b','#3b82f6','#00c853'][i]}`,
                  }}>
                    <div style={{ fontSize: '11px', color: '#888' }}>#{i + 1} Commission source</div>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: NAVY, marginTop: '2px' }}>
                      {w.businessName ?? w.name ?? 'Unknown'}
                    </div>
                    <div style={{ fontSize: '13px', color: GREEN, fontWeight: '600', marginTop: '4px' }}>
                      {MWK(w.commission)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                      {w.orders} orders · GMV {MWK(w.gmv)} · Rate {fmtPct(w.effectiveRate)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* full table */}
            <div style={S.card}>
              <div style={S.cardTitle}>All Wholesalers — Commission Generated for Platform</div>
              {loadingWholesalers ? <div style={S.spinner}>Loading…</div> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>#</th>
                        <th style={S.th}>Wholesaler</th>
                        <th style={S.th}>Email</th>
                        <th style={S.thR}>Orders</th>
                        <th style={S.thR}>GMV</th>
                        <th style={S.thR}>Avg Order</th>
                        <th style={S.thR}>Commission to Platform</th>
                        <th style={S.thR}>Eff. Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wholesalers.length === 0 && (
                        <tr><td colSpan={8} style={{ ...S.td, textAlign: 'center', color: '#aaa' }}>No data</td></tr>
                      )}
                      {wholesalers.map((w, i) => (
                        <tr key={w._id ?? i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={{ ...S.td, color: '#bbb', fontWeight: 'bold' }}>{i + 1}</td>
                          <td style={S.td}>
                            <div style={{ fontWeight: '600', color: NAVY }}>{w.businessName ?? w.name ?? '—'}</div>
                          </td>
                          <td style={{ ...S.td, color: '#888' }}>{w.email ?? '—'}</td>
                          <td style={S.tdR}>{(w.orders ?? 0).toLocaleString()}</td>
                          <td style={S.tdR}>{MWK(w.gmv)}</td>
                          <td style={S.tdR}>{MWK(w.avgOrder)}</td>
                          <td style={{ ...S.tdR, color: NAVY, fontWeight: '700' }}>{MWK(w.commission)}</td>
                          <td style={S.tdR}>{fmtPct(w.effectiveRate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TAB: Cash Flow
        ════════════════════════════════════════════════════════════════════ */}
        {tab === 'cashflow' && (
          <>
            {/* explanation card */}
            <div style={{ ...S.card, borderLeft: `4px solid ${GREEN}`, marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', color: '#333', lineHeight: '1.7' }}>
                <strong style={{ color: NAVY }}>How platform cash flow works on Order It:</strong><br />
                <span style={{ color: '#555' }}>
                  1. Retailer pays → funds held in escrow (totalAmount)<br />
                  2. On completion → platform keeps <strong>platformFee</strong> (commission) + <strong>VAT withheld</strong> from wholesaler gross<br />
                  3. Wholesaler receives <strong>grossAmount − VAT = netAmount</strong><br />
                  4. Logistics company receives <strong>deliveryFee</strong> in full (no VAT deducted)<br />
                  <br />
                  <strong>Net Platform Cash = Commission + VAT Collected</strong>
                </span>
              </div>
            </div>

            <div style={S.row2}>
              {/* inflow vs outflow summary */}
              <div style={S.card}>
                <div style={S.cardTitle}>All-Time Cash Flow Split</div>
                {loadingSummary ? <div style={S.spinner}>Loading…</div> : (() => {
                  const inflow  = (lt.commission ?? 0) + (lt.vatCollected ?? 0)
                  const outflow = lt.refunded ?? 0
                  const net     = inflow - outflow
                  return (
                    <>
                      {[
                        { label: '↑ Commission Earned',       value: lt.commission  ?? 0, color: NAVY },
                        { label: '↑ VAT Collected',           value: lt.vatCollected ?? 0, color: '#f59e0b' },
                        { label: '↓ Refunds Issued',          value: lt.refunded    ?? 0, color: '#e53935' },
                      ].map(item => (
                        <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>
                          <span style={{ fontSize: '13px', color: '#555' }}>{item.label}</span>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: item.color }}>{MWK(item.value)}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 0' }}>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: NAVY }}>Net Platform Cash</span>
                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: net >= 0 ? GREEN : '#e53935' }}>{MWK(net)}</span>
                      </div>
                    </>
                  )
                })()}
              </div>

              {/* pending vs released */}
              <div style={S.card}>
                <div style={S.cardTitle}>Funds Status Right Now</div>
                {loadingSummary ? <div style={S.spinner}>Loading…</div> : (() => {
                  const items = [
                    { label: 'Held in Escrow',    value: lt.escrowHeldNow ?? 0, color: '#8b5cf6', note: 'Awaiting delivery / confirmation' },
                    { label: 'Commission Earned', value: lt.commission    ?? 0, color: NAVY,      note: 'Platform revenue (all time)' },
                    { label: 'VAT Withheld',      value: lt.vatCollected  ?? 0, color: '#f59e0b', note: 'Deducted from wholesaler gross' },
                    { label: 'Refunded',          value: lt.refunded      ?? 0, color: '#e53935', note: lt.refundedCount + ' orders' },
                  ]
                  const maxV = Math.max(...items.map(i => i.value), 1)
                  return items.map(item => (
                    <div key={item.label} style={{ marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ color: '#444' }}>{item.label}</span>
                        <span style={{ color: item.color, fontWeight: '600' }}>{MWK(item.value)}</span>
                      </div>
                      <div style={{ height: '7px', background: '#f0f0f0', borderRadius: '4px' }}>
                        <div style={{ width: ((item.value / maxV) * 100) + '%', height: '100%', background: item.color, borderRadius: '4px', transition: 'width 0.5s' }} />
                      </div>
                      <div style={{ fontSize: '10px', color: '#aaa', marginTop: '2px' }}>{item.note}</div>
                    </div>
                  ))
                })()}
              </div>
            </div>

            {/* monthly net platform cash table */}
            <div style={S.card}>
              <div style={S.cardTitle}>Monthly Net Platform Cash</div>
              {loadingMonthly ? <div style={S.spinner}>Loading…</div> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Month</th>
                        <th style={S.thR}>Commission</th>
                        <th style={S.thR}>+ VAT Withheld</th>
                        <th style={S.thR}>= Net Platform Cash</th>
                        <th style={S.thR}>Total Paid Out</th>
                        <th style={S.thR}>Orders</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthly.length === 0 && (
                        <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', color: '#aaa' }}>No data yet</td></tr>
                      )}
                      {monthly.map((r, i) => {
                        const totalOut = (r.wholesalerPayout ?? 0) + (r.logisticsPayout ?? 0)
                        return (
                          <tr key={r.key} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                            <td style={{ ...S.td, fontWeight: '600' }}>{r.key}</td>
                            <td style={{ ...S.tdR, color: NAVY }}>{MWK(r.commission)}</td>
                            <td style={{ ...S.tdR, color: '#f59e0b' }}>{MWK(r.vatCollected)}</td>
                            <td style={{ ...S.tdR, color: GREEN, fontWeight: '700' }}>{MWK(r.netPlatformCash)}</td>
                            <td style={S.tdR}>{MWK(totalOut)}</td>
                            <td style={S.tdR}>{r.orders.toLocaleString()}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TAB: Payout Log
        ════════════════════════════════════════════════════════════════════ */}
        {tab === 'log' && (
          <div style={S.card}>
            <div style={S.cardTitle}>
              <span>Every Payout Released from Escrow</span>
              <span style={{ fontSize: '12px', color: '#888', fontWeight: '400' }}>
                {logPage.pagination.total.toLocaleString()} total records
              </span>
            </div>

            {/* filters */}
            <div style={S.filterRow}>
              <select style={S.select} value={logFilters.type}
                onChange={e => setLogFilters(f => ({ ...f, type: e.target.value, page: 1 }))}>
                <option value="">All recipients</option>
                <option value="wholesaler">Wholesalers</option>
                <option value="logistics">Logistics</option>
              </select>
              <select style={S.select} value={logFilters.trigger}
                onChange={e => setLogFilters(f => ({ ...f, trigger: e.target.value, page: 1 }))}>
                <option value="">All triggers</option>
                <option value="retailer_confirmed">Retailer confirmed</option>
                <option value="auto_confirmed">Auto-confirmed</option>
                <option value="admin_released">Admin released</option>
              </select>
              <button style={{ ...S.pill(false), fontSize: '12px' }}
                onClick={() => setLogFilters({ type: '', trigger: '', page: 1 })}>
                Clear
              </button>
            </div>

            {loadingLog ? <div style={S.spinner}>Loading payout log…</div> : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Released</th>
                        <th style={S.th}>Order</th>
                        <th style={S.th}>Recipient</th>
                        <th style={S.th}>Type</th>
                        <th style={S.th}>Trigger</th>
                        <th style={S.thR}>Gross</th>
                        <th style={S.thR}>VAT ({`%`})</th>
                        <th style={S.thR}>VAT Amt</th>
                        <th style={S.thR}>Net Paid</th>
                        <th style={S.thR}>Platform Fee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logPage.payouts.length === 0 && (
                        <tr><td colSpan={10} style={{ ...S.td, textAlign: 'center', color: '#aaa' }}>No payouts found</td></tr>
                      )}
                      {logPage.payouts.map((p, i) => (
                        <tr key={p._id ?? i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={{ ...S.td, color: '#888', fontSize: '12px' }}>
                            {p.releasedAt ? new Date(p.releasedAt).toLocaleDateString('en-GB') : '—'}
                          </td>
                          <td style={{ ...S.td, fontFamily: 'monospace', fontSize: '12px', color: '#3b82f6' }}>
                            #{String(p.order?._id ?? '').slice(-8).toUpperCase()}
                          </td>
                          <td style={S.td}>
                            <div style={{ fontWeight: '600', color: '#222' }}>
                              {p.recipient?.businessName ?? p.recipient?.name ?? '—'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#aaa' }}>{p.recipient?.email ?? ''}</div>
                          </td>
                          <td style={S.td}>
                            <span style={S.badge(p.recipientType === 'wholesaler' ? NAVY : '#06b6d4')}>
                              {p.recipientType}
                            </span>
                          </td>
                          <td style={S.td}><TriggerBadge trigger={p.trigger} /></td>
                          <td style={S.tdR}>{MWK(p.grossAmount)}</td>
                          <td style={S.tdR}>{(p.vatPercent ?? 0).toFixed(1)}%</td>
                          <td style={{ ...S.tdR, color: '#f59e0b' }}>{MWK(p.vatAmount)}</td>
                          <td style={{ ...S.tdR, color: GREEN, fontWeight: '700' }}>{MWK(p.netAmount)}</td>
                          <td style={{ ...S.tdR, color: NAVY, fontWeight: '600' }}>
                            {MWK(p.order?.platformFee ?? 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* pagination */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
                  <span style={{ fontSize: '12px', color: '#888' }}>
                    Page {logPage.pagination.page} of {logPage.pagination.pages} · {logPage.pagination.total} records
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      style={S.pgBtn(logFilters.page <= 1)}
                      disabled={logFilters.page <= 1}
                      onClick={() => setLogFilters(f => ({ ...f, page: f.page - 1 }))}>
                      ← Prev
                    </button>
                    <button
                      style={S.pgBtn(logFilters.page >= logPage.pagination.pages)}
                      disabled={logFilters.page >= logPage.pagination.pages}
                      onClick={() => setLogFilters(f => ({ ...f, page: f.page + 1 }))}>
                      Next →
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}