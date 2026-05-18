import { useEffect, useState } from 'react'
import api from '../../utils/api'
import { Sidebar } from './Dashboard'

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
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    background: '#1a3a6b', color: '#fff', padding: '12px 16px',
    fontSize: '12px', fontWeight: '600', textAlign: 'left',
  },
  tr: (i) => ({ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f0f0f0' }),
  td: { padding: '12px 16px', fontSize: '13px', color: '#333' },
  rolePill: (role) => {
    const map = {
      retailer:   { bg: '#e3f2fd', color: '#1565c0' },
      wholesaler: { bg: '#f3e5f5', color: '#6a1b9a' },
      logistics:  { bg: '#e8f5e9', color: '#2e7d32' },
      admin:      { bg: '#1a3a6b', color: '#fff'    },
    }
    const c = map[role] || { bg: '#eee', color: '#666' }
    return { display: 'inline-block', padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: '600', background: c.bg, color: c.color }
  },
  statusDot: (active) => ({
    display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
    background: active ? '#00c853' : '#e53935', marginRight: '6px',
  }),
  btnSuspend: {
    padding: '5px 11px', background: '#fff3e0', color: '#e65100',
    border: '1px solid #e65100', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
  },
  btnActivate: {
    padding: '5px 11px', background: '#e8f5e9', color: '#2e7d32',
    border: '1px solid #2e7d32', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
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
  // Detail drawer
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200,
    display: 'flex', justifyContent: 'flex-end',
  },
  drawer: {
    width: '400px', background: '#fff', height: '100vh',
    overflowY: 'auto', padding: '28px 24px',
    boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
  },
  drawerTitle: { fontSize: '18px', fontWeight: 'bold', color: '#1a3a6b', marginBottom: '20px' },
  drawerRow:   { marginBottom: '14px' },
  drawerLabel: { fontSize: '11px', color: '#888', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' },
  drawerValue: { fontSize: '14px', color: '#222' },
  closeBtn: {
    position: 'absolute', top: '20px', right: '20px',
    background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888',
  },
}

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'retailer',   label: 'Retailer' },
  { value: 'wholesaler', label: 'Wholesaler' },
  { value: 'logistics',  label: 'Logistics' },
  { value: 'admin',      label: 'Admin' },
]

const STATUS_OPTIONS = [
  { value: '',          label: 'All statuses' },
  { value: 'active',    label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
]

export default function AdminUsers() {
  const [users,    setUsers]    = useState([])
  const [total,    setTotal]    = useState(0)
  const [pages,    setPages]    = useState(1)
  const [page,     setPage]     = useState(1)
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [role,     setRole]     = useState('')
  const [status,   setStatus]   = useState('')
  const [selected, setSelected] = useState(null)
  const [toast,    setToast]    = useState(null)

  useEffect(() => { load() }, [role, status, page])

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 20 })
      if (role)   params.append('role', role)
      if (status) params.append('status', status)
      if (search) params.append('search', search)
      const res = await api.get(`/admin/users?${params}`)
      setUsers(res.data.users || [])
      setTotal(res.data.total || 0)
      setPages(res.data.pages || 1)
    } catch { showToast('Failed to load users', false) }
    finally  { setLoading(false) }
  }

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  async function loadDetail(id) {
    try {
      const res = await api.get(`/admin/users/${id}`)
      setSelected(res.data)
    } catch { showToast('Failed to load user', false) }
  }

  async function handleSuspend(id, name) {
    const reason = window.prompt(`Suspend "${name}" — enter reason (required):`)
    if (!reason) return
    try {
      await api.put(`/admin/users/${id}/suspend`, { reason })
      showToast('User suspended')
      setSelected(null)
      load()
    } catch (err) {
      showToast(err.response?.data?.msg || 'Action failed', false)
    }
  }

  async function handleActivate(id) {
    if (!window.confirm('Reactivate this user?')) return
    try {
      await api.put(`/admin/users/${id}/activate`)
      showToast('User activated ✓')
      setSelected(null)
      load()
    } catch { showToast('Action failed', false) }
  }

  function handleSearch(e) {
    e.preventDefault()
    setPage(1)
    load()
  }

  return (
    <div style={S.page}>
      <Sidebar active="/admin/users" />
      <div style={S.main}>

        <div style={S.topBar}>
          <div>
            <div style={S.pageTitle}>Users</div>
            <div style={S.pageSub}>{total} registered accounts</div>
          </div>
        </div>

        {/* Filter bar */}
        <form style={S.filterBar} onSubmit={handleSearch}>
          <input
            style={S.input}
            placeholder="Search name, email, phone, business…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select style={S.select} value={role} onChange={e => { setRole(e.target.value); setPage(1) }}>
            {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select style={S.select} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button type="submit" style={{ padding: '8px 16px', background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
            Search
          </button>
          {(role || status || search) && (
            <button type="button" style={S.clearBtn} onClick={() => { setRole(''); setStatus(''); setSearch(''); setPage(1) }}>
              Clear
            </button>
          )}
        </form>

        {/* Table */}
        <div style={S.tableWrap}>
          {loading ? (
            <div style={S.spinner}>Loading users…</div>
          ) : users.length === 0 ? (
            <div style={S.empty}>No users found</div>
          ) : (
            <>
              <table style={S.table}>
                <thead>
                  <tr>
                    {['Name', 'Email', 'Business', 'Role', 'Phone', 'Joined', 'Status', 'Actions'].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u._id} style={{ ...S.tr(i), cursor: 'pointer' }}>
                      <td style={{ ...S.td, fontWeight: '600', color: '#1a3a6b' }}
                        onClick={() => loadDetail(u._id)}>
                        {u.name}
                      </td>
                      <td style={S.td}>{u.email}</td>
                      <td style={S.td}>{u.businessName || '—'}</td>
                      <td style={S.td}><span style={S.rolePill(u.role)}>{u.role}</span></td>
                      <td style={S.td}>{u.phone || '—'}</td>
                      <td style={S.td}>{new Date(u.createdAt).toLocaleDateString('en-GB')}</td>
                      <td style={S.td}>
                        <span style={S.statusDot(u.isActive)} />
                        {u.isActive ? 'Active' : 'Suspended'}
                      </td>
                      <td style={S.td}>
                        {u.role !== 'admin' && (
                          u.isActive
                            ? <button style={S.btnSuspend}  onClick={() => handleSuspend(u._id, u.name)}>Suspend</button>
                            : <button style={S.btnActivate} onClick={() => handleActivate(u._id)}>Activate</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={S.pagination}>
                <button style={S.pageBtn(page === 1)} disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}>← Prev</button>
                <span style={S.pageInfo}>Page {page} of {pages} · {total} users</span>
                <button style={S.pageBtn(page === pages)} disabled={page === pages}
                  onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            </>
          )}
        </div>

      </div>

      {/* User detail drawer */}
      {selected && (
        <div style={S.overlay} onClick={() => setSelected(null)}>
          <div style={S.drawer} onClick={e => e.stopPropagation()}>
            <button style={S.closeBtn} onClick={() => setSelected(null)}>✕</button>
            <div style={S.drawerTitle}>User Profile</div>

            {[
              ['Name',          selected.user?.name],
              ['Email',         selected.user?.email],
              ['Role',          selected.user?.role],
              ['Business Name', selected.user?.businessName || '—'],
              ['Phone',         selected.user?.phone || '—'],
              ['City',          selected.user?.city || '—'],
              ['Address',       selected.user?.address || '—'],
              ['Registered',    selected.user?.createdAt ? new Date(selected.user.createdAt).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'],
              ['Orders',        selected.orderCount ?? '—'],
              ['Status',        selected.user?.isActive ? '✅ Active' : '🔴 Suspended'],
            ].map(([label, value]) => (
              <div key={label} style={S.drawerRow}>
                <div style={S.drawerLabel}>{label}</div>
                <div style={S.drawerValue}>{value}</div>
              </div>
            ))}

            <div style={{ marginTop: '24px', display: 'flex', gap: '10px' }}>
              {selected.user?.role !== 'admin' && (
                selected.user?.isActive
                  ? <button style={{ ...S.btnSuspend, padding: '10px 20px', fontSize: '14px' }}
                      onClick={() => handleSuspend(selected.user._id, selected.user.name)}>
                      Suspend Account
                    </button>
                  : <button style={{ ...S.btnActivate, padding: '10px 20px', fontSize: '14px' }}
                      onClick={() => handleActivate(selected.user._id)}>
                      Activate Account
                    </button>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && <div style={S.toast(toast.ok)}>{toast.msg}</div>}
    </div>
  )
}