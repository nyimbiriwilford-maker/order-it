import { useEffect, useState } from 'react'
import api from '../../utils/api'
import { Sidebar } from './Dashboard'

const ACTION_LABELS = {
  SUSPEND_USER:           'Suspended User',
  ACTIVATE_USER:          'Activated User',
  APPROVE_LOGISTICS:      'Approved Logistics Co.',
  REJECT_LOGISTICS:       'Rejected Logistics Co.',
  SUSPEND_LOGISTICS:      'Suspended Logistics Co.',
  REINSTATE_LOGISTICS:    'Reinstated Logistics Co.',
  CANCEL_ORDER:           'Cancelled Order',
  FLAG_ORDER:             'Flagged Order',
  ESCROW_MANUAL_RELEASE:  'Released Escrow',
  ESCROW_FREEZE:          'Froze Escrow',
  ESCROW_REFUND:          'Refunded Escrow',
  RESOLVE_DISPUTE:        'Resolved Dispute',
}

const ACTION_COLORS = {
  SUSPEND_USER:           '#e53935',
  ACTIVATE_USER:          '#00c853',
  APPROVE_LOGISTICS:      '#00c853',
  REJECT_LOGISTICS:       '#e53935',
  SUSPEND_LOGISTICS:      '#f57c00',
  REINSTATE_LOGISTICS:    '#00c853',
  CANCEL_ORDER:           '#e53935',
  FLAG_ORDER:             '#f59e0b',
  ESCROW_MANUAL_RELEASE:  '#00c853',
  ESCROW_FREEZE:          '#f57c00',
  ESCROW_REFUND:          '#e53935',
  RESOLVE_DISPUTE:        '#1a3a6b',
}

const S = {
  page:  { minHeight: '100vh', background: '#f0f0f0', fontFamily: 'Arial, sans-serif' },
  main:  { marginLeft: '220px', padding: '28px 32px', minHeight: '100vh' },
  topBar:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' },
  pageTitle: { fontSize: '22px', fontWeight: 'bold', color: '#1a3a6b' },
  pageSub:   { fontSize: '13px', color: '#888', marginTop: '2px' },
  filterBar: {
    background: '#fff', borderRadius: '12px', padding: '14px 20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)', display: 'flex',
    gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px',
  },
  input: {
    padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px',
    fontSize: '13px', outline: 'none', flex: 1, minWidth: '200px',
  },
  clearBtn: {
    padding: '8px 14px', background: '#f0f0f0', border: 'none',
    borderRadius: '8px', fontSize: '13px', cursor: 'pointer', color: '#555',
  },
  searchBtn: {
    padding: '8px 16px', background: '#1a3a6b', color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
  },
  tableWrap: {
    background: '#fff', borderRadius: '12px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    background: '#1a3a6b', color: '#fff', padding: '12px 16px',
    fontSize: '12px', fontWeight: '600', textAlign: 'left',
  },
  tr:  (i) => ({ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f0f0f0' }),
  td:  { padding: '11px 16px', fontSize: '13px', color: '#333' },
  actionPill: (action) => {
    const color = ACTION_COLORS[action] || '#888'
    return {
      display: 'inline-block', padding: '3px 10px', borderRadius: '10px',
      fontSize: '11px', fontWeight: '600', background: color + '18', color,
    }
  },
  detailsBox: {
    fontSize: '11px', color: '#666', background: '#f9f9f9',
    borderRadius: '4px', padding: '4px 8px', fontFamily: 'monospace',
    maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  pagination: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 20px', borderTop: '1px solid #f0f0f0',
  },
  pageBtn: (disabled) => ({
    padding: '6px 14px', border: '1px solid #ddd', borderRadius: '6px',
    background: disabled ? '#f5f5f5' : '#fff', color: disabled ? '#bbb' : '#1a3a6b',
    cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '13px',
  }),
  empty:   { textAlign: 'center', padding: '40px', color: '#aaa', fontSize: '14px' },
  spinner: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#888', fontSize: '14px' },
  immutableNote: {
    fontSize: '12px', color: '#888', background: '#fff8e1',
    border: '1px solid #ffe082', borderRadius: '8px',
    padding: '8px 14px', marginBottom: '16px', display: 'inline-block',
  },
}

export default function AdminAuditLog() {
  const [entries,  setEntries]  = useState([])
  const [total,    setTotal]    = useState(0)
  const [pages,    setPages]    = useState(1)
  const [page,     setPage]     = useState(1)
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [query,    setQuery]    = useState('')

  useEffect(() => { load() }, [page, query])

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 30 })
      if (query) params.append('action', query)
      const res = await api.get(`/admin/audit-log?${params}`)
      setEntries(res.data.entries || [])
      setTotal(res.data.total    || 0)
      setPages(res.data.pages    || 1)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e) {
    e.preventDefault()
    setPage(1)
    setQuery(search)
  }

  function formatDetails(details) {
    if (!details) return '—'
    const parts = []
    if (details.reason)      parts.push(`Reason: ${details.reason}`)
    if (details.userName)    parts.push(details.userName)
    if (details.companyName) parts.push(details.companyName)
    if (details.resolution)  parts.push(`Ruling: ${details.resolution}`)
    if (details.amount)      parts.push(`MWK ${Number(details.amount).toLocaleString()}`)
    return parts.join(' · ') || JSON.stringify(details).slice(0, 60)
  }

  function formatTime(date) {
    return new Date(date).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div style={S.page}>
      <Sidebar active="/admin/audit" />
      <div style={S.main}>

        <div style={S.topBar}>
          <div>
            <div style={S.pageTitle}>Audit Log</div>
            <div style={S.pageSub}>{total} total entries — immutable record of all admin actions</div>
          </div>
        </div>

        <div style={S.immutableNote}>
          🔒 This log is immutable. Entries cannot be edited or deleted.
        </div>

        {/* Filter */}
        <form style={S.filterBar} onSubmit={handleSearch}>
          <input
            style={S.input}
            placeholder="Filter by action keyword e.g. SUSPEND, ESCROW, DISPUTE…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button type="submit" style={S.searchBtn}>Search</button>
          {query && (
            <button type="button" style={S.clearBtn} onClick={() => { setSearch(''); setQuery(''); setPage(1) }}>
              Clear
            </button>
          )}
        </form>

        {/* Table */}
        <div style={S.tableWrap}>
          {loading ? (
            <div style={S.spinner}>Loading audit log…</div>
          ) : entries.length === 0 ? (
            <div style={S.empty}>No audit entries found</div>
          ) : (
            <>
              <table style={S.table}>
                <thead>
                  <tr>
                    {['Timestamp', 'Admin', 'Action', 'Target', 'Details', 'IP'].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr key={e._id} style={S.tr(i)}>
                      <td style={{ ...S.td, whiteSpace: 'nowrap', fontSize: '12px', color: '#666' }}>
                        {formatTime(e.createdAt)}
                      </td>
                      <td style={{ ...S.td, fontWeight: '600', color: '#1a3a6b' }}>
                        {e.adminName}
                      </td>
                      <td style={S.td}>
                        <span style={S.actionPill(e.action)}>
                          {ACTION_LABELS[e.action] || e.action}
                        </span>
                      </td>
                      <td style={{ ...S.td, fontSize: '12px', color: '#666' }}>
                        {e.targetModel || '—'}
                        {e.targetId && (
                          <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#aaa' }}>
                            #{String(e.targetId).slice(-8).toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td style={S.td}>
                        <div style={S.detailsBox} title={JSON.stringify(e.details)}>
                          {formatDetails(e.details)}
                        </div>
                      </td>
                      <td style={{ ...S.td, fontSize: '11px', color: '#aaa', fontFamily: 'monospace' }}>
                        {e.ipAddress || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={S.pagination}>
                <button style={S.pageBtn(page === 1)} disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}>← Prev</button>
                <span style={{ fontSize: '13px', color: '#666' }}>Page {page} of {pages} · {total} entries</span>
                <button style={S.pageBtn(page === pages)} disabled={page === pages}
                  onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  )
}