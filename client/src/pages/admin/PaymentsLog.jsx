import { useEffect, useState, useRef } from 'react'
import api from '../../utils/api'
import { Sidebar } from './Dashboard'

const S = {
  page:  { minHeight: '100vh', background: '#f0f0f0', fontFamily: 'Arial, sans-serif' },
  main:  { marginLeft: '220px', padding: '28px 32px', minHeight: '100vh' },
  topBar:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' },
  pageTitle: { fontSize: '22px', fontWeight: 'bold', color: '#1a3a6b' },
  pageSub:   { fontSize: '13px', color: '#888', marginTop: '2px' },

  summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '24px' },
  summaryCard: (accent) => ({
    background: '#fff', borderRadius: '12px', padding: '18px 16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderTop: `3px solid ${accent}`,
  }),
  summaryValue: { fontSize: '15px', fontWeight: 'bold', color: '#1a3a6b', lineHeight: 1.2 },
  summaryLabel: { fontSize: '11px', color: '#888', marginTop: '4px' },

  filterBar: {
    background: '#fff', borderRadius: '12px', padding: '14px 20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)', display: 'flex',
    gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px',
  },
  searchWrap: { position: 'relative', flex: '1', minWidth: '220px', maxWidth: '340px' },
  searchInput: {
    width: '100%', padding: '8px 12px 8px 34px',
    border: '1px solid #ddd', borderRadius: '8px',
    fontSize: '13px', background: '#f9f9f9', outline: 'none',
    boxSizing: 'border-box',
  },
  searchIcon: {
    position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
    color: '#bbb', fontSize: '14px', pointerEvents: 'none',
  },
  clearSearch: {
    position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', color: '#aaa',
    fontSize: '14px', padding: '0', lineHeight: 1,
  },
  divider: { width: '1px', height: '28px', background: '#eee', flexShrink: 0 },
  filterLabel: { fontSize: '13px', color: '#888', whiteSpace: 'nowrap' },
  select: {
    padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px',
    fontSize: '13px', background: '#fff', cursor: 'pointer',
  },
  clearBtn: {
    padding: '8px 14px', background: '#f0f0f0', border: 'none',
    borderRadius: '8px', fontSize: '13px', cursor: 'pointer', color: '#555',
  },

  tableWrap: {
    background: '#fff', borderRadius: '12px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden',
  },
  table:  { width: '100%', borderCollapse: 'collapse' },
  th: {
    background: '#1a3a6b', color: '#fff', padding: '12px 14px',
    fontSize: '11px', fontWeight: '600', textAlign: 'left',
  },
  tr: (i) => ({ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f0f0f0' }),
  td: { padding: '11px 14px', fontSize: '13px', color: '#333' },

  recipientPill: (type) => ({
    display: 'inline-block', padding: '3px 9px', borderRadius: '10px',
    fontSize: '11px', fontWeight: '700',
    background: type === 'wholesaler' ? '#e3f2fd' : '#e8f5e9',
    color:      type === 'wholesaler' ? '#1565c0' : '#2e7d32',
  }),
  triggerPill: (trigger) => {
    const map = {
      retailer_confirmed: { bg: '#e8f5e9', color: '#2e7d32' },
      auto_confirmed:     { bg: '#fff8e1', color: '#f57f17' },
      admin_released:     { bg: '#e8eaf6', color: '#283593' },
    }
    const c = map[trigger] || { bg: '#f5f5f5', color: '#555' }
    return {
      display: 'inline-block', padding: '3px 9px', borderRadius: '10px',
      fontSize: '11px', fontWeight: '600', background: c.bg, color: c.color,
    }
  },
  vatCell:      { fontSize: '12px', color: '#e53935', fontWeight: '500' },
  netCell:      { fontSize: '13px', color: '#2e7d32', fontWeight: '700' },
  feeCell:      { fontSize: '12px', color: '#8b5cf6', fontWeight: '600' },
  feeCellEmpty: { fontSize: '12px', color: '#ccc' },

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
  spinner: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#888', fontSize: '14px' },
  toast: (ok) => ({
    position: 'fixed', bottom: '24px', right: '24px',
    background: ok ? '#1b5e20' : '#b71c1c', color: '#fff',
    padding: '12px 20px', borderRadius: '10px', fontSize: '13px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 999,
  }),

  highlight: (term, text) => {
    if (!term || !text) return text || '—'
    return text // rendered via dangerouslySetInnerHTML in the component
  },
}

function formatMWK(v) {
  return 'MWK ' + Number(v || 0).toLocaleString()
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// Highlights matching substring in text
function Highlight({ text, term }) {
  if (!term || !text) return <span>{text || '—'}</span>
  const idx = text.toLowerCase().indexOf(term.toLowerCase())
  if (idx === -1) return <span>{text}</span>
  return (
    <span>
      {text.slice(0, idx)}
      <mark style={{ background: '#fff3cd', borderRadius: '2px', padding: '0 1px' }}>
        {text.slice(idx, idx + term.length)}
      </mark>
      {text.slice(idx + term.length)}
    </span>
  )
}

const TRIGGER_LABELS = {
  retailer_confirmed: 'Retailer confirmed',
  auto_confirmed:     'Auto-confirmed',
  admin_released:     'Admin released',
}

const RECIPIENT_FILTER_OPTIONS = [
  { value: '',           label: 'All recipients'  },
  { value: 'wholesaler', label: 'Wholesalers only' },
  { value: 'logistics',  label: 'Logistics only'   },
]

const TRIGGER_FILTER_OPTIONS = [
  { value: '',                   label: 'All triggers'       },
  { value: 'retailer_confirmed', label: 'Retailer confirmed' },
  { value: 'auto_confirmed',     label: 'Auto-confirmed'     },
  { value: 'admin_released',     label: 'Admin released'     },
]

export default function AdminPaymentsLog() {
  const [payouts,       setPayouts]       = useState([])
  const [summary,       setSummary]       = useState({
    totalGross: 0, totalVat: 0, totalNet: 0, totalPayouts: 0, totalPlatformFee: 0,
  })
  const [total,         setTotal]         = useState(0)
  const [pages,         setPages]         = useState(1)
  const [page,          setPage]          = useState(1)
  const [loading,       setLoading]       = useState(true)
  const [recipientType, setRecipientType] = useState('')
  const [trigger,       setTrigger]       = useState('')
  const [search,        setSearch]        = useState('')
  const [searchInput,   setSearchInput]   = useState('')
  const [toast,         setToast]         = useState(null)
  const debounceRef = useRef(null)

  useEffect(() => { load() }, [page, recipientType, trigger, search])

  // Debounce search input — fires 400ms after user stops typing
  function handleSearchInput(val) {
    setSearchInput(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearch(val)
      setPage(1)
    }, 400)
  }

  function clearSearchInput() {
    setSearchInput('')
    setSearch('')
    setPage(1)
  }

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 30 })
      if (recipientType) params.append('recipientType', recipientType)
      if (trigger)       params.append('trigger',       trigger)
      if (search)        params.append('search',        search)
      const res = await api.get(`/admin/payments/log?${params}`)
      setPayouts(res.data.payouts || [])
      setSummary(res.data.summary || { totalGross: 0, totalVat: 0, totalNet: 0, totalPayouts: 0, totalPlatformFee: 0 })
      setTotal(res.data.total    || 0)
      setPages(res.data.pages    || 1)
    } catch {
      showToast('Failed to load payments log', false)
    } finally {
      setLoading(false)
    }
  }

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  function clearFilters() {
    setRecipientType('')
    setTrigger('')
    setSearch('')
    setSearchInput('')
    setPage(1)
  }

  const hasFilters = recipientType || trigger || search

  return (
    <div style={S.page}>
      <Sidebar active="/admin/payments" />
      <div style={S.main}>

        {/* Top bar */}
        <div style={S.topBar}>
          <div>
            <div style={S.pageTitle}>Payments Log</div>
            <div style={S.pageSub}>{total} payout{total !== 1 ? 's' : ''} recorded</div>
          </div>
          <button onClick={load} style={{
            padding: '8px 16px', background: '#1a3a6b', color: '#fff',
            border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
          }}>↺ Refresh</button>
        </div>

        {/* Summary cards */}
        <div style={S.summaryRow}>
          {[
            { label: 'Total Payouts',        value: summary.totalPayouts,                accent: '#1a3a6b', big: true  },
            { label: 'Gross Released',        value: formatMWK(summary.totalGross),       accent: '#3b82f6', big: false },
            { label: 'VAT Deducted',          value: formatMWK(summary.totalVat),         accent: '#e53935', big: false },
            { label: 'Net Paid Out',          value: formatMWK(summary.totalNet),         accent: '#00c853', big: false },
            { label: 'Order It Service Fee',  value: formatMWK(summary.totalPlatformFee), accent: '#8b5cf6', big: false },
          ].map(c => (
            <div key={c.label} style={S.summaryCard(c.accent)}>
              <div style={{ ...S.summaryValue, fontSize: c.big ? '28px' : '15px' }}>{c.value}</div>
              <div style={S.summaryLabel}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div style={S.filterBar}>

          {/* Search */}
          <div style={S.searchWrap}>
            <span style={S.searchIcon}>🔍</span>
            <input
              style={S.searchInput}
              type="text"
              placeholder="Search by name, email, Order ID, Payout ID…"
              value={searchInput}
              onChange={e => handleSearchInput(e.target.value)}
            />
            {searchInput && (
              <button style={S.clearSearch} onClick={clearSearchInput} title="Clear search">✕</button>
            )}
          </div>

          <div style={S.divider} />

          <span style={S.filterLabel}>Filter by:</span>

          <select style={S.select} value={recipientType}
            onChange={e => { setRecipientType(e.target.value); setPage(1) }}>
            {RECIPIENT_FILTER_OPTIONS.map(o =>
              <option key={o.value} value={o.value}>{o.label}</option>
            )}
          </select>

          <select style={S.select} value={trigger}
            onChange={e => { setTrigger(e.target.value); setPage(1) }}>
            {TRIGGER_FILTER_OPTIONS.map(o =>
              <option key={o.value} value={o.value}>{o.label}</option>
            )}
          </select>

          {hasFilters && (
            <button style={S.clearBtn} onClick={clearFilters}>Clear all</button>
          )}
        </div>

        {/* Table */}
        <div style={S.tableWrap}>
          {loading ? (
            <div style={S.spinner}>Loading payments…</div>
          ) : payouts.length === 0 ? (
            <div style={S.empty}>
              {hasFilters
                ? `No payouts match "${search || ''}"${recipientType ? ` · ${recipientType}` : ''}${trigger ? ` · ${TRIGGER_LABELS[trigger]}` : ''}`
                : 'No payouts recorded yet'}
            </div>
          ) : (
            <>
              <table style={S.table}>
                <thead>
                  <tr>
                    {[
                      'Payout ID', 'Recipient', 'Type', 'Order ID',
                      'Gross', 'VAT', 'Net Paid', 'Service Fee', 'Trigger', 'Released At',
                    ].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p, i) => {
                    const fee = p.order?.platformFee || 0
                    const showFee = p.recipientType === 'wholesaler' && fee > 0
                    const feePercent = showFee && p.order?.totalAmount
                      ? `${((fee / p.order.totalAmount) * 100).toFixed(1)}%`
                      : ''

                    const recipientName  = p.recipient?.businessName || p.recipient?.name || ''
                    const recipientEmail = p.recipient?.email || ''

                    return (
                      <tr key={p._id} style={S.tr(i)}>

                        {/* Payout ID */}
                        <td style={{ ...S.td, fontFamily: 'monospace', fontSize: '11px', color: '#1a3a6b', fontWeight: '600' }}>
                          <Highlight text={`#${String(p._id).slice(-8).toUpperCase()}`} term={search} />
                        </td>

                        {/* Recipient */}
                        <td style={S.td}>
                          {recipientName ? (
                            <>
                              <div style={{ fontWeight: '600', color: '#222' }}>
                                <Highlight text={recipientName} term={search} />
                              </div>
                              {recipientEmail && (
                                <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>
                                  <Highlight text={recipientEmail} term={search} />
                                </div>
                              )}
                            </>
                          ) : (
                            <span style={{ color: '#bbb', fontSize: '12px' }}>—</span>
                          )}
                        </td>

                        {/* Type pill */}
                        <td style={S.td}>
                          <span style={S.recipientPill(p.recipientType)}>
                            {p.recipientType === 'wholesaler' ? '🏭 Wholesaler' : '🚚 Logistics'}
                          </span>
                        </td>

                        {/* Order ID */}
                        <td style={{ ...S.td, fontFamily: 'monospace', fontSize: '11px', color: '#888' }}>
                          {p.order?._id
                            ? <Highlight text={`#${String(p.order._id).slice(-8).toUpperCase()}`} term={search} />
                            : '—'}
                        </td>

                        {/* Gross */}
                        <td style={{ ...S.td, fontWeight: '500' }}>
                          {formatMWK(p.grossAmount)}
                        </td>

                        {/* VAT */}
                        <td style={S.td}>
                          {p.vatAmount > 0 ? (
                            <span style={S.vatCell}>
                              −{formatMWK(p.vatAmount)}
                              <br />
                              <span style={{ fontSize: '10px', color: '#bbb' }}>{p.vatPercent}%</span>
                            </span>
                          ) : (
                            <span style={{ color: '#bbb', fontSize: '12px' }}>—</span>
                          )}
                        </td>

                        {/* Net */}
                        <td style={S.td}>
                          <span style={S.netCell}>{formatMWK(p.netAmount)}</span>
                        </td>

                        {/* Service Fee */}
                        <td style={S.td}>
                          {showFee ? (
                            <span style={S.feeCell}>
                              {formatMWK(fee)}
                              {feePercent && (
                                <>
                                  <br />
                                  <span style={{ fontSize: '10px', color: '#bbb', fontWeight: '400' }}>
                                    {feePercent} of order
                                  </span>
                                </>
                              )}
                            </span>
                          ) : (
                            <span style={S.feeCellEmpty}>—</span>
                          )}
                        </td>

                        {/* Trigger */}
                        <td style={S.td}>
                          <span style={S.triggerPill(p.trigger)}>
                            {TRIGGER_LABELS[p.trigger] || p.trigger}
                          </span>
                        </td>

                        {/* Date */}
                        <td style={{ ...S.td, fontSize: '12px', color: '#888', whiteSpace: 'nowrap' }}>
                          {formatDate(p.releasedAt || p.createdAt)}
                        </td>

                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <div style={S.pagination}>
                <button style={S.pageBtn(page === 1)} disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}>← Prev</button>
                <span style={{ fontSize: '13px', color: '#666' }}>
                  Page {page} of {pages} · {total} payouts
                  {search && <span style={{ color: '#1a3a6b', marginLeft: '6px' }}>· matching "{search}"</span>}
                </span>
                <button style={S.pageBtn(page === pages)} disabled={page === pages}
                  onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            </>
          )}
        </div>

      </div>
      {toast && <div style={S.toast(toast.ok)}>{toast.msg}</div>}
    </div>
  )
}