import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import { Sidebar } from './Dashboard'

const REASON_LABELS = {
  not_received: 'Not Received',
  damaged:      'Damaged',
  wrong_items:  'Wrong Items',
  other:        'Other',
}

const STATUS_STYLES = {
  open:         { bg: '#fff8e1', color: '#f59e0b' },
  under_review: { bg: '#e3f2fd', color: '#1565c0' },
  escalated:    { bg: '#fce4ec', color: '#c62828' },
  resolved:     { bg: '#e8f5e9', color: '#2e7d32' },
  dismissed:    { bg: '#f5f5f5', color: '#757575' },
}

const RESOLUTION_OPTIONS = [
  { value: 'favour_retailer',   label: 'Rule for Retailer — full refund' },
  { value: 'favour_wholesaler', label: 'Rule for Wholesaler — release escrow' },
  { value: 'favour_logistics',  label: 'Rule for Logistics — release escrow' },
  { value: 'partial',           label: 'Partial ruling — split decision' },
  { value: 'dismissed',         label: 'Dismiss — insufficient evidence' },
]

const S = {
  page:  { minHeight: '100vh', background: '#f0f0f0', fontFamily: 'Arial, sans-serif' },
  main:  { marginLeft: '220px', padding: '28px 32px', minHeight: '100vh' },
  topBar:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' },
  pageTitle: { fontSize: '22px', fontWeight: 'bold', color: '#1a3a6b' },
  pageSub:   { fontSize: '13px', color: '#888', marginTop: '2px' },
  filterBar: {
    background: '#fff', borderRadius: '12px', padding: '14px 20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)', display: 'flex',
    gap: '12px', alignItems: 'center', marginBottom: '20px',
  },
  select: {
    padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px',
    fontSize: '13px', background: '#fff', cursor: 'pointer',
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
  tr:  (i, highlighted) => ({
    background: highlighted ? '#fff8e1' : i % 2 === 0 ? '#fff' : '#fafafa',
    borderBottom: '1px solid #f0f0f0',
    transition: 'background 0.4s',
  }),
  td:  { padding: '12px 16px', fontSize: '13px', color: '#333' },
  pill: (status) => {
    const c = STATUS_STYLES[status] || { bg: '#eee', color: '#666' }
    return { display: 'inline-block', padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: '600', background: c.bg, color: c.color }
  },
  viewBtn: {
    padding: '5px 12px', background: '#1a3a6b', color: '#fff',
    border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
  },
  empty:   { textAlign: 'center', padding: '40px', color: '#aaa', fontSize: '14px' },
  spinner: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#888', fontSize: '14px' },
  pagination: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 20px', borderTop: '1px solid #f0f0f0',
  },
  pageBtn: (disabled) => ({
    padding: '6px 14px', border: '1px solid #ddd', borderRadius: '6px',
    background: disabled ? '#f5f5f5' : '#fff', color: disabled ? '#bbb' : '#1a3a6b',
    cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '13px',
  }),
  toast: (ok) => ({
    position: 'fixed', bottom: '24px', right: '24px',
    background: ok ? '#1b5e20' : '#b71c1c', color: '#fff',
    padding: '12px 20px', borderRadius: '10px', fontSize: '13px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 999,
  }),
  // Banner shown when arriving from Notifications
  fromNotifBanner: {
    background: '#fff8e1', border: '1px solid #f59e0b', borderRadius: '10px',
    padding: '10px 16px', marginBottom: '16px', fontSize: '13px', color: '#7c4f00',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  clearBtn: {
    padding: '4px 10px', background: '#f0f0f0', border: 'none',
    borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: '#555',
  },
  // Drawer
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    zIndex: 200, display: 'flex', justifyContent: 'flex-end',
  },
  drawer: {
    width: '480px', background: '#fff', height: '100vh',
    overflowY: 'auto', padding: '28px 24px',
    boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
  },
  drawerTitle: { fontSize: '18px', fontWeight: 'bold', color: '#1a3a6b', marginBottom: '4px' },
  drawerSub:   { fontSize: '13px', color: '#888', marginBottom: '20px' },
  section:     { marginBottom: '20px' },
  sectionTitle:{ fontSize: '12px', color: '#888', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid #f0f0f0', paddingBottom: '6px' },
  row:         { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
  label:       { fontSize: '12px', color: '#888' },
  value:       { fontSize: '13px', color: '#222', fontWeight: '500', textAlign: 'right', maxWidth: '60%' },
  description: { fontSize: '13px', color: '#333', background: '#f9f9f9', borderRadius: '8px', padding: '12px', lineHeight: '1.5' },
  resForm:     { background: '#f0f4ff', borderRadius: '10px', padding: '16px', marginTop: '8px' },
  resLabel:    { fontSize: '12px', fontWeight: '600', color: '#1a3a6b', marginBottom: '6px' },
  resSelect:   {
    width: '100%', padding: '8px 12px', border: '1px solid #c0cfe8',
    borderRadius: '8px', fontSize: '13px', background: '#fff',
    marginBottom: '10px', cursor: 'pointer',
  },
  resTextarea: {
    width: '100%', padding: '8px 12px', border: '1px solid #c0cfe8',
    borderRadius: '8px', fontSize: '13px', resize: 'vertical',
    minHeight: '80px', boxSizing: 'border-box', marginBottom: '12px',
  },
  resolveBtn: {
    width: '100%', padding: '11px', background: '#1a3a6b', color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '14px',
    fontWeight: '600', cursor: 'pointer',
  },
  escalateBtn: {
    width: '100%', padding: '9px', background: '#fff', color: '#e53935',
    border: '1px solid #e53935', borderRadius: '8px', fontSize: '13px',
    cursor: 'pointer', marginTop: '8px',
  },
  noteForm:    { marginTop: '12px' },
  noteInput:   {
    width: '100%', padding: '8px 12px', border: '1px solid #ddd',
    borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box',
    marginBottom: '8px',
  },
  noteBtn: {
    padding: '7px 16px', background: '#f0f0f0', color: '#333',
    border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
  },
  noteItem: {
    background: '#fffde7', borderRadius: '6px', padding: '8px 12px',
    marginBottom: '6px', fontSize: '12px', color: '#555',
  },
  closeBtn: {
    background: 'none', border: 'none', fontSize: '20px',
    cursor: 'pointer', color: '#888', float: 'right',
  },
}

const STATUS_FILTER_OPTIONS = [
  { value: '',             label: 'All disputes' },
  { value: 'open',         label: 'Open' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'escalated',    label: 'Escalated' },
  { value: 'resolved',     label: 'Resolved' },
  { value: 'dismissed',    label: 'Dismissed' },
]

export default function AdminDisputes() {
  const location = useLocation()
  const navigate = useNavigate()

  // Read ?id from URL — set by Notifications for open_dispute deep-links
  const urlParams  = new URLSearchParams(location.search)
  const targetId   = urlParams.get('id') || ''
  const fromNotif  = !!targetId

  const [disputes,    setDisputes]    = useState([])
  const [total,       setTotal]       = useState(0)
  const [pages,       setPages]       = useState(1)
  const [page,        setPage]        = useState(1)
  const [loading,     setLoading]     = useState(true)
  const [statusFilter,setStatusFilter]= useState('')
  const [selected,    setSelected]    = useState(null)
  const [resolution,  setResolution]  = useState('')
  const [resNote,     setResNote]     = useState('')
  const [noteInput,   setNoteInput]   = useState('')
  const [toast,       setToast]       = useState(null)
  const [submitting,  setSubmitting]  = useState(false)

  // On mount (or when URL changes), if ?id is present auto-open that dispute
  useEffect(() => {
    if (targetId) {
      openDetail(targetId)
    }
  }, [targetId])

  useEffect(() => { load() }, [statusFilter, page])

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 20 })
      if (statusFilter) params.append('status', statusFilter)
      const res = await api.get(`/disputes?${params}`)
      setDisputes(res.data.disputes || [])
      setTotal(res.data.total   || 0)
      setPages(res.data.pages   || 1)
    } catch { showToast('Failed to load disputes', false) }
    finally  { setLoading(false) }
  }

  async function openDetail(id) {
    try {
      const res = await api.get(`/disputes/${id}`)
      setSelected(res.data)
      setResolution('')
      setResNote('')
      setNoteInput('')
    } catch { showToast('Failed to load dispute', false) }
  }

  function closeDrawer() {
    setSelected(null)
    // Remove ?id from URL so refreshing doesn't re-open
    if (targetId) navigate('/admin/disputes', { replace: true })
  }

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleResolve() {
    if (!resolution) return showToast('Select a resolution first', false)
    setSubmitting(true)
    try {
      await api.put(`/disputes/${selected._id}/resolve`, { resolution, resolutionNote: resNote })
      showToast('Dispute resolved ✓')
      closeDrawer()
      load()
    } catch (err) {
      showToast(err.response?.data?.msg || 'Failed to resolve', false)
    } finally { setSubmitting(false) }
  }

  async function handleEscalate() {
    if (!window.confirm('Escalate this dispute? Escrow will be frozen indefinitely.')) return
    try {
      await api.put(`/disputes/${selected._id}/escalate`)
      showToast('Dispute escalated — escrow frozen')
      closeDrawer()
      load()
    } catch { showToast('Failed to escalate', false) }
  }

  async function handleAddNote() {
    if (!noteInput.trim()) return
    try {
      const res = await api.post(`/disputes/${selected._id}/notes`, { note: noteInput })
      setSelected(prev => ({ ...prev, adminNotes: res.data.adminNotes }))
      setNoteInput('')
      showToast('Note added')
    } catch { showToast('Failed to add note', false) }
  }

  function formatMWK(v) {
    return 'MWK ' + Number(v || 0).toLocaleString()
  }

  function daysOpen(date) {
    const d = Math.floor((Date.now() - new Date(date)) / 86400000)
    return d === 0 ? 'today' : `${d}d ago`
  }

  const openCount = disputes.filter(d => ['open','under_review','escalated'].includes(d.status)).length

  return (
    <div style={S.page}>
      <Sidebar active="/admin/disputes" />
      <div style={S.main}>

        <div style={S.topBar}>
          <div>
            <div style={S.pageTitle}>Disputes</div>
            <div style={S.pageSub}>
              {total} total
              {openCount > 0 && <span style={{ color: '#e53935', fontWeight: '600' }}> · {openCount} need resolution</span>}
            </div>
          </div>
        </div>

        {/* Banner when arriving from Notifications with a specific dispute */}
        {fromNotif && (
          <div style={S.fromNotifBanner}>
            <span>⚖️ Opened from Notifications — reviewing dispute #{targetId.slice(-7).toUpperCase()}</span>
            <button style={S.clearBtn} onClick={() => navigate('/admin/disputes', { replace: true })}>
              Clear
            </button>
          </div>
        )}

        <div style={S.filterBar}>
          <select style={S.select} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
            {STATUS_FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div style={S.tableWrap}>
          {loading ? (
            <div style={S.spinner}>Loading disputes…</div>
          ) : disputes.length === 0 ? (
            <div style={S.empty}>No disputes found ✓</div>
          ) : (
            <>
              <table style={S.table}>
                <thead>
                  <tr>
                    {['Dispute ID', 'Retailer', 'Reason', 'Order Value', 'Raised', 'Status', 'Action'].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {disputes.map((d, i) => {
                    const isTarget = d._id === targetId
                    return (
                      <tr key={d._id} style={S.tr(i, isTarget)} id={`dispute-${d._id}`}>
                        <td style={{ ...S.td, fontFamily: 'monospace', fontWeight: '600', color: '#1a3a6b' }}>
                          #{String(d._id).slice(-7).toUpperCase()}
                          {isTarget && (
                            <span style={{ marginLeft: '6px', fontSize: '10px', background: '#f59e0b', color: '#fff', padding: '2px 6px', borderRadius: '6px', fontWeight: '700' }}>
                              FROM ALERT
                            </span>
                          )}
                        </td>
                        <td style={S.td}>{d.raisedBy?.businessName || d.raisedBy?.name || '—'}</td>
                        <td style={S.td}>{REASON_LABELS[d.reason] || d.reason}</td>
                        <td style={S.td}>{formatMWK(d.order?.totalAmount)}</td>
                        <td style={S.td}>{daysOpen(d.createdAt)}</td>
                        <td style={S.td}><span style={S.pill(d.status)}>{d.status.replace('_', ' ')}</span></td>
                        <td style={S.td}>
                          <button style={S.viewBtn} onClick={() => openDetail(d._id)}>Review</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div style={S.pagination}>
                <button style={S.pageBtn(page === 1)} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                <span style={{ fontSize: '13px', color: '#666' }}>Page {page} of {pages} · {total} disputes</span>
                <button style={S.pageBtn(page === pages)} disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Detail drawer ── */}
      {selected && (
        <div style={S.overlay} onClick={closeDrawer}>
          <div style={S.drawer} onClick={e => e.stopPropagation()}>
            <button style={S.closeBtn} onClick={closeDrawer}>✕</button>
            <div style={S.drawerTitle}>Dispute #{String(selected._id).slice(-7).toUpperCase()}</div>
            <div style={S.drawerSub}>
              <span style={S.pill(selected.status)}>{selected.status.replace('_', ' ')}</span>
              {'  '}Raised {daysOpen(selected.createdAt)}
            </div>

            {/* Parties */}
            <div style={S.section}>
              <div style={S.sectionTitle}>Parties</div>
              {[
                ['Retailer',   selected.raisedBy?.name,    selected.raisedBy?.email],
                ['Wholesaler', selected.wholesaler?.name,  selected.wholesaler?.email],
                ['Logistics',  selected.logistics?.name,   selected.logistics?.email],
              ].map(([role, name, email]) => name ? (
                <div key={role} style={S.row}>
                  <span style={S.label}>{role}</span>
                  <span style={S.value}>{name}<br /><span style={{ color: '#aaa', fontSize: '11px' }}>{email}</span></span>
                </div>
              ) : null)}
            </div>

            {/* Order */}
            <div style={S.section}>
              <div style={S.sectionTitle}>Order</div>
              {[
                ['Reason',        REASON_LABELS[selected.reason] || selected.reason],
                ['Order Value',   formatMWK(selected.order?.totalAmount)],
                ['To Wholesaler', formatMWK(selected.order?.amountToWholesaler)],
                ['To Logistics',  formatMWK(selected.order?.amountToLogistics)],
                ['Order Status',  selected.order?.orderStatus],
                ['Payment',       selected.order?.paymentStatus],
              ].map(([label, value]) => (
                <div key={label} style={S.row}>
                  <span style={S.label}>{label}</span>
                  <span style={S.value}>{value || '—'}</span>
                </div>
              ))}
            </div>

            {/* Description */}
            <div style={S.section}>
              <div style={S.sectionTitle}>Retailer's Description</div>
              <div style={S.description}>{selected.description}</div>
            </div>

            {/* Resolution form — only if not yet resolved */}
            {!['resolved', 'dismissed'].includes(selected.status) && (
              <div style={S.section}>
                <div style={S.sectionTitle}>Resolve Dispute</div>
                <div style={S.resForm}>
                  <div style={S.resLabel}>Resolution</div>
                  <select style={S.resSelect} value={resolution} onChange={e => setResolution(e.target.value)}>
                    <option value="">— Select ruling —</option>
                    {RESOLUTION_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <div style={S.resLabel}>Note (optional)</div>
                  <textarea style={S.resTextarea} placeholder="Add context for the ruling…"
                    value={resNote} onChange={e => setResNote(e.target.value)} />
                  <button style={S.resolveBtn} onClick={handleResolve} disabled={submitting}>
                    {submitting ? 'Resolving…' : 'Confirm Resolution'}
                  </button>
                  <button style={S.escalateBtn} onClick={handleEscalate}>
                    Escalate & Freeze Escrow
                  </button>
                </div>
              </div>
            )}

            {/* Resolved summary */}
            {['resolved', 'dismissed'].includes(selected.status) && (
              <div style={S.section}>
                <div style={S.sectionTitle}>Resolution</div>
                <div style={{ ...S.description, background: '#e8f5e9' }}>
                  <strong>{RESOLUTION_OPTIONS.find(o => o.value === selected.resolution)?.label || selected.resolution}</strong>
                  {selected.resolutionNote && <><br />{selected.resolutionNote}</>}
                </div>
              </div>
            )}

            {/* Admin notes */}
            <div style={S.section}>
              <div style={S.sectionTitle}>Internal Notes</div>
              {selected.adminNotes?.length === 0 && (
                <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '8px' }}>No notes yet</div>
              )}
              {selected.adminNotes?.map((n, i) => (
                <div key={i} style={S.noteItem}>
                  {n.note}
                  <span style={{ color: '#bbb', marginLeft: '8px' }}>
                    {new Date(n.addedAt).toLocaleDateString('en-GB')}
                  </span>
                </div>
              ))}
              <div style={S.noteForm}>
                <input style={S.noteInput} placeholder="Add internal note…"
                  value={noteInput} onChange={e => setNoteInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddNote()} />
                <button style={S.noteBtn} onClick={handleAddNote}>Add Note</button>
              </div>
            </div>

          </div>
        </div>
      )}

      {toast && <div style={S.toast(toast.ok)}>{toast.msg}</div>}
    </div>
  )
}