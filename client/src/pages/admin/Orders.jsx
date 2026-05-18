import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../../utils/api'
import { Sidebar, STATUS_COLORS } from './Dashboard'

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
    fontSize: '13px', outline: 'none', flex: 1, minWidth: '180px',
  },
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
    background: '#1a3a6b', color: '#fff', padding: '12px 16px',
    fontSize: '12px', fontWeight: '600', textAlign: 'left',
  },
  tr: (i) => ({ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f0f0f0' }),
  td: { padding: '12px 16px', fontSize: '13px', color: '#333' },
  pill: (status) => {
    const color = STATUS_COLORS[status] || '#888'
    return {
      display: 'inline-block', padding: '3px 10px', borderRadius: '10px',
      fontSize: '11px', fontWeight: '600', background: color + '22', color,
    }
  },
  flagBadge: {
    display: 'inline-block', padding: '2px 7px', borderRadius: '8px',
    fontSize: '10px', fontWeight: '700', background: '#fce4ec', color: '#e53935',
    marginLeft: '6px',
  },
  viewBtn: {
    padding: '5px 12px', background: '#1a3a6b', color: '#fff',
    border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
  },
  cancelBtn: {
    padding: '5px 12px', background: '#fff', color: '#e53935',
    border: '1px solid #e53935', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
    marginLeft: '6px',
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
  pageInfo: { fontSize: '13px', color: '#666' },
  empty:   { textAlign: 'center', padding: '40px', color: '#aaa', fontSize: '14px' },
  spinner: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#888', fontSize: '14px' },
  toast: (ok) => ({
    position: 'fixed', bottom: '24px', right: '24px',
    background: ok ? '#1b5e20' : '#b71c1c', color: '#fff',
    padding: '12px 20px', borderRadius: '10px', fontSize: '13px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 999,
  }),
  // Banner shown when arriving from Notifications
  fromNotifBanner: {
    background: '#e8f0fe', border: '1px solid #c0d0f0', borderRadius: '10px',
    padding: '10px 16px', marginBottom: '16px', fontSize: '13px', color: '#1a3a6b',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
}

const STATUS_FILTER_OPTIONS = [
  { value: '',                    label: 'All statuses'          },
  { value: 'pending',             label: 'Pending'               },
  { value: 'confirmed',           label: 'Confirmed'             },
  { value: 'ready_for_collection',label: 'Ready for Collection'  },
  { value: 'collected',           label: 'Collected'             },
  { value: 'in_transit',          label: 'In Transit'            },
  { value: 'delivered',           label: 'Delivered'             },
  { value: 'completed',           label: 'Completed'             },
  { value: 'disputed',            label: 'Disputed'              },
  { value: 'cancelled',           label: 'Cancelled'             },
]

const CANCELLABLE = ['pending', 'confirmed', 'ready_for_collection']

export default function AdminOrders() {
  const navigate = useNavigate()
  const location = useLocation()

  // Read ?status from URL — set by Notifications page for stuck_order deep-links
  const urlParams    = new URLSearchParams(location.search)
  const urlStatus    = urlParams.get('status') || ''
  const fromNotif    = !!urlStatus  // true when arriving from Notifications

  const [orders,   setOrders]   = useState([])
  const [total,    setTotal]    = useState(0)
  const [pages,    setPages]    = useState(1)
  const [page,     setPage]     = useState(1)
  const [loading,  setLoading]  = useState(true)
  const [status,   setStatus]   = useState(urlStatus)
  const [search,   setSearch]   = useState('')
  const [toast,    setToast]    = useState(null)

  // If user navigates here again with a different ?status, sync filter
  useEffect(() => {
    setStatus(urlStatus)
    setPage(1)
  }, [location.search])

  useEffect(() => { load() }, [status, page])

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 20 })
      if (status) params.append('status', status)
      if (search) params.append('search', search)
      const res = await api.get(`/admin/orders?${params}`)
      setOrders(res.data.orders || [])
      setTotal(res.data.total   || 0)
      setPages(res.data.pages   || 1)
    } catch { showToast('Failed to load orders', false) }
    finally  { setLoading(false) }
  }

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  function handleSearch(e) {
    e.preventDefault()
    setPage(1)
    load()
  }

  function clearFilters() {
    setStatus('')
    setSearch('')
    setPage(1)
    // Remove query string from URL without full reload
    navigate('/admin/orders', { replace: true })
  }

  async function handleCancel(id) {
    const reason = window.prompt('Cancellation reason (required):')
    if (!reason) return
    try {
      await api.put(`/admin/orders/${id}/cancel`, { reason })
      showToast('Order cancelled')
      load()
    } catch (err) {
      showToast(err.response?.data?.msg || 'Action failed', false)
    }
  }

  function formatMWK(v) { return 'MWK ' + Number(v || 0).toLocaleString() }
  function hoursAgo(date) {
    const h = Math.floor((Date.now() - new Date(date)) / 3600000)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  const statusLabel = STATUS_FILTER_OPTIONS.find(o => o.value === status)?.label || status

  return (
    <div style={S.page}>
      <Sidebar active="/admin/orders" />
      <div style={S.main}>

        <div style={S.topBar}>
          <div>
            <div style={S.pageTitle}>All Orders</div>
            <div style={S.pageSub}>{total} orders total</div>
          </div>
        </div>

        {/* Banner when arriving from Notifications */}
        {fromNotif && (
          <div style={S.fromNotifBanner}>
            <span>
              🔔 Filtered by <strong>{statusLabel}</strong> — orders needing attention
            </span>
            <button style={{ ...S.clearBtn, padding: '4px 10px', fontSize: '12px' }}
              onClick={clearFilters}>
              Show all
            </button>
          </div>
        )}

        {/* Filter bar */}
        <form style={S.filterBar} onSubmit={handleSearch}>
          <input
            style={S.input}
            placeholder="Search by Order ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select style={S.select} value={status}
            onChange={e => { setStatus(e.target.value); setPage(1) }}>
            {STATUS_FILTER_OPTIONS.map(o =>
              <option key={o.value} value={o.value}>{o.label}</option>
            )}
          </select>
          <button type="submit" style={{ ...S.viewBtn, padding: '8px 16px' }}>Search</button>
          {(status || search) && (
            <button type="button" style={S.clearBtn} onClick={clearFilters}>Clear</button>
          )}
        </form>

        {/* Table */}
        <div style={S.tableWrap}>
          {loading ? (
            <div style={S.spinner}>Loading orders…</div>
          ) : orders.length === 0 ? (
            <div style={S.empty}>No orders found</div>
          ) : (
            <>
              <table style={S.table}>
                <thead>
                  <tr>
                    {['Order ID', 'Retailer', 'Wholesaler', 'Amount', 'Status', 'Updated', 'Actions'].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => (
                    <tr key={o._id} style={S.tr(i)}>
                      <td style={{ ...S.td, fontFamily: 'monospace', fontWeight: '600', color: '#1a3a6b' }}>
                        #{String(o._id).slice(-8).toUpperCase()}
                        {o.flagged && <span style={S.flagBadge}>FLAGGED</span>}
                      </td>
                      <td style={S.td}>{o.retailer?.businessName  || o.retailer?.name  || '—'}</td>
                      <td style={S.td}>{o.wholesaler?.businessName || o.wholesaler?.name || '—'}</td>
                      <td style={S.td}>{formatMWK(o.totalAmount)}</td>
                      <td style={S.td}><span style={S.pill(o.orderStatus)}>{o.orderStatus}</span></td>
                      <td style={S.td}>{hoursAgo(o.updatedAt)}</td>
                      <td style={S.td}>
                        <button style={S.viewBtn}
                          onClick={() => navigate(`/admin/orders/${o._id}`)}>
                          View
                        </button>
                        {CANCELLABLE.includes(o.orderStatus) && (
                          <button style={S.cancelBtn} onClick={() => handleCancel(o._id)}>
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={S.pagination}>
                <button style={S.pageBtn(page === 1)} disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}>← Prev</button>
                <span style={S.pageInfo}>Page {page} of {pages} · {total} orders</span>
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