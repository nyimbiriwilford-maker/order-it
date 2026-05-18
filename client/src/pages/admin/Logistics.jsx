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
  // Filter bar
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
  // Table
  tableWrap: {
    background: '#fff', borderRadius: '12px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden',
  },
  table:  { width: '100%', borderCollapse: 'collapse' },
  th: {
    background: '#1a3a6b', color: '#fff', padding: '12px 16px',
    fontSize: '12px', fontWeight: '600', textAlign: 'left',
  },
  tr: (i) => ({
    background: i % 2 === 0 ? '#fff' : '#fafafa',
    borderBottom: '1px solid #f0f0f0',
  }),
  td: { padding: '12px 16px', fontSize: '13px', color: '#333' },
  // Status pill
  pill: (status) => {
    const map = {
      pending:  { bg: '#fff8e1', color: '#f59e0b' },
      approved: { bg: '#e8f5e9', color: '#00c853' },
      rejected: { bg: '#fce4ec', color: '#e53935' },
      suspended:{ bg: '#f3e5f5', color: '#9c27b0' },
    }
    const c = map[status] || { bg: '#eee', color: '#666' }
    return { display: 'inline-block', padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: '600', background: c.bg, color: c.color }
  },
  // Action buttons
  btnApprove: {
    padding: '5px 11px', background: '#00c853', color: '#fff',
    border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '600',
  },
  btnReject: {
    padding: '5px 11px', background: '#fff', color: '#e53935',
    border: '1px solid #e53935', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
  },
  btnSuspend: {
    padding: '5px 11px', background: '#fff3e0', color: '#f57c00',
    border: '1px solid #f57c00', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
  },
  btnReinstate: {
    padding: '5px 11px', background: '#e8f5e9', color: '#2e7d32',
    border: '1px solid #2e7d32', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
  },
  btnRow: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  // Toast
  toast: (ok) => ({
    position: 'fixed', bottom: '24px', right: '24px',
    background: ok ? '#1b5e20' : '#b71c1c', color: '#fff',
    padding: '12px 20px', borderRadius: '10px', fontSize: '13px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 999,
  }),
  empty: { textAlign: 'center', padding: '40px', color: '#aaa', fontSize: '14px' },
  spinner: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#888', fontSize: '14px' },
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid #f0f0f0', background: '#fff' },
  pageBtn: (disabled) => ({
    padding: '6px 14px', border: '1px solid #ddd', borderRadius: '6px',
    background: disabled ? '#f5f5f5' : '#fff', color: disabled ? '#bbb' : '#1a3a6b',
    cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '13px',
  }),
}

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending',   label: 'Pending' },
  { value: 'approved',  label: 'Approved' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'rejected',  label: 'Rejected' },
]

export default function AdminLogistics() {
  const location = useLocation()
  const [companies, setCompanies] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [status,    setStatus]    = useState(new URLSearchParams(location.search).get('status') || '')
  const [toast,     setToast]     = useState(null)

  useEffect(() => { load() }, [search, status])

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (status) params.append('status', status)
      if (search) params.append('search', search)
      const res = await api.get(`/admin/logistics?${params}`)
      setCompanies(res.data)
    } catch { showToast('Failed to load companies', false) }
    finally   { setLoading(false) }
  }

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleApprove(id) {
    try {
      await api.put(`/admin/logistics/${id}/approve`)
      showToast('Company approved ✓')
      load()
    } catch { showToast('Action failed', false) }
  }

  async function handleReject(id, name) {
    const reason = window.prompt(`Reject "${name}" — enter reason:`)
    if (!reason) return
    try {
      await api.put(`/admin/logistics/${id}/reject`, { reason })
      showToast('Company rejected')
      load()
    } catch { showToast('Action failed', false) }
  }

  async function handleSuspend(id, name) {
    const reason = window.prompt(`Suspend "${name}" — enter reason:`)
    if (!reason) return
    try {
      await api.put(`/admin/logistics/${id}/suspend`, { reason })
      showToast('Company suspended')
      load()
    } catch { showToast('Action failed', false) }
  }

  async function handleReinstate(id) {
    if (!window.confirm('Reinstate this company?')) return
    try {
      await api.put(`/admin/logistics/${id}/reinstate`)
      showToast('Company reinstated ✓')
      load()
    } catch { showToast('Action failed', false) }
  }

  function actions(c) {
    if (c.status === 'pending') return (
      <div style={S.btnRow}>
        <button style={S.btnApprove}   onClick={() => handleApprove(c._id)}>Approve</button>
        <button style={S.btnReject}    onClick={() => handleReject(c._id, c.name)}>Reject</button>
      </div>
    )
    if (c.status === 'approved') return (
      <div style={S.btnRow}>
        <button style={S.btnSuspend}   onClick={() => handleSuspend(c._id, c.name)}>Suspend</button>
      </div>
    )
    if (c.status === 'suspended') return (
      <div style={S.btnRow}>
        <button style={S.btnReinstate} onClick={() => handleReinstate(c._id)}>Reinstate</button>
      </div>
    )
    if (c.status === 'rejected') return (
      <div style={S.btnRow}>
        <button style={S.btnApprove}   onClick={() => handleApprove(c._id)}>Approve</button>
      </div>
    )
    return null
  }

  const pendingCount = companies.filter(c => c.status === 'pending').length

  return (
    <div style={S.page}>
      <Sidebar active="/admin/logistics" />
      <div style={S.main}>

        <div style={S.topBar}>
          <div>
            <div style={S.pageTitle}>Logistics Companies</div>
            <div style={S.pageSub}>
              {companies.length} companies
              {pendingCount > 0 && <span style={{ color: '#f59e0b', fontWeight: '600' }}> · {pendingCount} pending approval</span>}
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div style={S.filterBar}>
          <input
            style={S.input}
            placeholder="Search by name, email, phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select style={S.select} value={status} onChange={e => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Table */}
        <div style={S.tableWrap}>
          {loading ? (
            <div style={S.spinner}>Loading…</div>
          ) : companies.length === 0 ? (
            <div style={S.empty}>No logistics companies found</div>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  {['Company', 'Contact', 'Phone', 'Registered', 'Status', 'Actions'].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {companies.map((c, i) => (
                  <tr key={c._id} style={S.tr(i)}>
                    <td style={{ ...S.td, fontWeight: '600', color: '#1a3a6b' }}>{c.name}</td>
                    <td style={S.td}>{c.email}</td>
                    <td style={S.td}>{c.phone || '—'}</td>
                    <td style={S.td}>{new Date(c.createdAt).toLocaleDateString('en-GB')}</td>
                    <td style={S.td}><span style={S.pill(c.status)}>{c.status}</span></td>
                    <td style={S.td}>{actions(c)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
      {toast && <div style={S.toast(toast.ok)}>{toast.msg}</div>}
    </div>
  )
}