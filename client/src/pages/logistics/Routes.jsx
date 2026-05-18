import { useState, useEffect } from 'react'
import Navbar from '../../components/Navbar'
import api from '../../utils/api'

export default function LogisticsRoutes() {
  const [routes,   setRoutes]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error,    setError]    = useState('')
  const [company,  setCompany]  = useState(null)
  const [form,     setForm]     = useState({
    originCity: '', destinationCity: '', pricePerDelivery: '', estimatedDays: ''
  })

  useEffect(() => {
    Promise.all([
      api.get('/logistics/routes/mine'),
      api.get('/logistics/me'),
    ])
      .then(([routesRes, companyRes]) => {
        setRoutes(routesRes.data)
        setCompany(companyRes.data)
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false))
  }, [])

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async () => {
    setError('')
    if (!form.originCity || !form.destinationCity || !form.pricePerDelivery || !form.estimatedDays) {
      return setError('All fields are required')
    }
    setSaving(true)
    try {
      const { data } = await api.post('/logistics/routes', form)
      setRoutes(prev => [data, ...prev])
      setForm({ originCity: '', destinationCity: '', pricePerDelivery: '', estimatedDays: '' })
      setShowForm(false)
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to add route')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={S.page}>
      <Navbar />
      <div style={S.body}>
        <div style={S.topBar}>
          <h1 style={S.title}>My Routes</h1>
          {company?.status === 'approved' && (
            <button style={S.addBtn} onClick={() => setShowForm(true)}>+ Add Route</button>
          )}
        </div>

        {/* Company status banner */}
        {company && company.status !== 'approved' && (
          <div style={S.banner}>
            ⏳ Your company is <strong>{company.status}</strong>. You can add routes once approved by admin.
          </div>
        )}

        {error && <div style={S.error}>{error}</div>}

        {/* Add route form */}
        {showForm && (
          <div style={S.overlay}>
            <div style={S.modal}>
              <h2 style={S.modalTitle}>Add New Route</h2>

              <input style={S.input} name="originCity" placeholder="Origin city *" value={form.originCity} onChange={handle} />
              <input style={S.input} name="destinationCity" placeholder="Destination city *" value={form.destinationCity} onChange={handle} />
              <input style={S.input} name="pricePerDelivery" type="number" placeholder="Price per delivery (MWK) *" value={form.pricePerDelivery} onChange={handle} />
              <input style={S.input} name="estimatedDays" type="number" placeholder="Estimated days *" value={form.estimatedDays} onChange={handle} />

              {error && <div style={S.error}>{error}</div>}

              <div style={S.btnRow}>
                <button style={S.cancelBtn} onClick={() => { setShowForm(false); setError('') }}>Cancel</button>
                <button style={{ ...S.saveBtn, opacity: saving ? 0.7 : 1 }} onClick={submit} disabled={saving}>
                  {saving ? 'Saving…' : 'Add Route'}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && <p style={S.empty}>Loading routes…</p>}

        {!loading && routes.length === 0 && (
          <div style={S.emptyCard}>
            <p style={{ fontSize: '40px', margin: '0 0 10px' }}>🗺️</p>
            <p style={{ color: '#999', margin: 0 }}>No routes yet. Add your first delivery route.</p>
          </div>
        )}

        {routes.map(route => (
          <div key={route._id} style={S.card}>
            <div style={S.cardTop}>
              <div>
                <p style={S.routeName}>{route.originCity} → {route.destinationCity}</p>
                <p style={S.routeSub}>{route.estimatedDays} day{route.estimatedDays > 1 ? 's' : ''} estimated</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={S.price}>MWK {Number(route.pricePerDelivery).toLocaleString()}</p>
                <span style={{ ...S.badge, background: route.active ? '#e8f5e9' : '#f5f5f5', color: route.active ? '#00c853' : '#aaa' }}>
                  {route.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const S = {
  page:       { background: '#f0f0f0', minHeight: '100vh' },
  body:       { maxWidth: '430px', margin: '0 auto', padding: '16px' },
  topBar:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  title:      { fontSize: '20px', fontWeight: '700', color: '#0d2347', margin: 0 },
  addBtn:     { background: 'linear-gradient(135deg,#1a3a6b,#00c853)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 16px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' },
  banner:     { background: '#fff8e1', border: '1px solid #fcd34d', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#92400e', marginBottom: '16px' },
  error:      { background: '#fff0f0', border: '1px solid #ffcccc', color: '#cc0000', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '12px' },
  overlay:    { position: 'fixed', inset: 0, background: '#00000066', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  modal:      { background: '#fff', borderRadius: '16px 16px 0 0', padding: '24px 20px', width: '100%', maxWidth: '430px' },
  modalTitle: { fontSize: '18px', fontWeight: '700', color: '#0d2347', margin: '0 0 16px' },
  input:      { width: '100%', padding: '11px 13px', borderRadius: '8px', border: '1px solid #e0e0e0', fontSize: '14px', marginBottom: '10px', boxSizing: 'border-box', outline: 'none' },
  btnRow:     { display: 'flex', gap: '10px' },
  cancelBtn:  { flex: 1, padding: '12px', background: '#f5f5f5', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' },
  saveBtn:    { flex: 1, padding: '12px', background: 'linear-gradient(135deg,#1a3a6b,#00c853)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' },
  empty:      { textAlign: 'center', color: '#999', padding: '40px 0' },
  emptyCard:  { background: '#fff', borderRadius: '12px', padding: '40px 20px', textAlign: 'center' },
  card:       { background: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  cardTop:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  routeName:  { fontWeight: '700', color: '#0d2347', fontSize: '15px', margin: '0 0 4px' },
  routeSub:   { fontSize: '12px', color: '#aaa', margin: 0 },
  price:      { fontWeight: '700', color: '#1a3a6b', fontSize: '15px', margin: '0 0 4px' },
  badge:      { padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: '700' },
}