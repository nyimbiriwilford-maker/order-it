import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/Navbar'
import api from '../../utils/api'

export default function WholesalerProducts() {
  const { token } = useAuth()
  const [products, setProducts]   = useState([])
  const [loading,  setLoading]    = useState(true)
  const [saving,   setSaving]     = useState(false)
  const [uploading,setUploading]  = useState(false)
  const [showForm, setShowForm]   = useState(false)
  const [editId,   setEditId]     = useState(null)
  const [error,    setError]      = useState('')
  const [form,     setForm]       = useState({
    name: '', description: '', price: '', stock: '', unit: 'item', image: '', lowStockThreshold: '10'
  })

  const load = async () => {
    try {
      const { data } = await api.get('/products/mine')
      setProducts(data)
    } catch {
      setError('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleImage = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const { data } = await api.post('/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setForm(f => ({ ...f, image: data.url }))
    } catch {
      setError('Image upload failed')
    } finally {
      setUploading(false)
    }
  }

  const openAdd = () => {
    setEditId(null)
    setForm({ name: '', description: '', price: '', stock: '', unit: 'item', image: '', lowStockThreshold: '10' })
    setShowForm(true)
  }

  const openEdit = (p) => {
    setEditId(p._id)
    setForm({
      name: p.name, description: p.description || '', price: p.price,
      stock: p.stock, unit: p.unit || 'item', image: p.image || '',
      lowStockThreshold: p.lowStockThreshold || 10,
    })
    setShowForm(true)
  }

  const submit = async () => {
    setError('')
    if (!form.name || !form.price || form.stock === '') {
      return setError('Name, price and stock are required')
    }
    setSaving(true)
    try {
      if (editId) {
        const { data } = await api.put(`/products/${editId}`, form)
        setProducts(prev => prev.map(p => p._id === editId ? data : p))
      } else {
        const { data } = await api.post('/products', form)
        setProducts(prev => [data, ...prev])
      }
      setShowForm(false)
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this product?')) return
    try {
      await api.delete(`/products/${id}`)
      setProducts(prev => prev.filter(p => p._id !== id))
    } catch {
      setError('Failed to delete product')
    }
  }

  return (
    <div style={S.page}>
      <Navbar />
      <div style={S.body}>
        <div style={S.topBar}>
          <h1 style={S.title}>My Products</h1>
          <button style={S.addBtn} onClick={openAdd}>+ Add Product</button>
        </div>

        {error && <div style={S.error}>{error}</div>}

        {/* Form Modal */}
        {showForm && (
          <div style={S.overlay}>
            <div style={S.modal}>
              <h2 style={S.modalTitle}>{editId ? 'Edit Product' : 'Add Product'}</h2>

              <input style={S.input} name="name" placeholder="Product name *" value={form.name} onChange={handle} />
              <textarea style={{ ...S.input, height: '70px', resize: 'none' }} name="description" placeholder="Description" value={form.description} onChange={handle} />

              <div style={S.row}>
                <input style={{ ...S.input, flex: 1 }} name="price" type="number" placeholder="Price (MWK) *" value={form.price} onChange={handle} />
                <input style={{ ...S.input, flex: 1 }} name="stock" type="number" placeholder="Stock *" value={form.stock} onChange={handle} />
              </div>

              <div style={S.row}>
                <input style={{ ...S.input, flex: 1 }} name="unit" placeholder="Unit (item, kg, box…)" value={form.unit} onChange={handle} />
                <input style={{ ...S.input, flex: 1 }} name="lowStockThreshold" type="number" placeholder="Low stock alert at" value={form.lowStockThreshold} onChange={handle} />
              </div>

              <label style={S.uploadLabel}>
                {uploading ? 'Uploading…' : '📷 Upload Image'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImage} />
              </label>
              {form.image && <img src={form.image} alt="preview" style={S.preview} />}

              {error && <div style={S.error}>{error}</div>}

              <div style={S.row}>
                <button style={S.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
                <button style={{ ...S.saveBtn, opacity: saving ? 0.7 : 1 }} onClick={submit} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Product'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Product List */}
        {loading ? (
          <p style={S.empty}>Loading products…</p>
        ) : products.length === 0 ? (
          <div style={S.emptyCard}>
            <p style={{ fontSize: '40px', margin: '0 0 12px' }}>📦</p>
            <p style={{ color: '#999', margin: 0 }}>No products yet. Add your first product.</p>
          </div>
        ) : (
          products.map(p => (
            <div key={p._id} style={S.card}>
              {p.image && <img src={p.image} alt={p.name} style={S.cardImg} />}
              <div style={S.cardBody}>
                <div style={S.cardTop}>
                  <span style={S.prodName}>{p.name}</span>
                  <span style={{ ...S.stockBadge, background: p.stock <= p.lowStockThreshold ? '#fff0f0' : '#f0fff4', color: p.stock <= p.lowStockThreshold ? '#e53935' : '#00c853' }}>
                    {p.stock} {p.unit}
                  </span>
                </div>
                {p.description && <p style={S.desc}>{p.description}</p>}
                <p style={S.price}>MWK {Number(p.price).toLocaleString()}</p>
                <div style={S.actions}>
                  <button style={S.editBtn} onClick={() => openEdit(p)}>Edit</button>
                  <button style={S.delBtn}  onClick={() => remove(p._id)}>Delete</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const S = {
  page:        { background: '#f0f0f0', minHeight: '100vh' },
  body:        { maxWidth: '430px', margin: '0 auto', padding: '16px' },
  topBar:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  title:       { fontSize: '20px', fontWeight: '700', color: '#0d2347', margin: 0 },
  addBtn:      { background: 'linear-gradient(135deg,#1a3a6b,#00c853)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 16px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' },
  error:       { background: '#fff0f0', border: '1px solid #ffcccc', color: '#cc0000', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '12px' },
  overlay:     { position: 'fixed', inset: 0, background: '#00000066', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  modal:       { background: '#fff', borderRadius: '16px 16px 0 0', padding: '24px 20px', width: '100%', maxWidth: '430px', maxHeight: '90vh', overflowY: 'auto' },
  modalTitle:  { fontSize: '18px', fontWeight: '700', color: '#0d2347', margin: '0 0 16px' },
  input:       { width: '100%', padding: '11px 13px', borderRadius: '8px', border: '1px solid #e0e0e0', fontSize: '14px', marginBottom: '10px', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' },
  row:         { display: 'flex', gap: '10px' },
  uploadLabel: { display: 'block', background: '#f5f5f5', border: '1px dashed #ccc', borderRadius: '8px', padding: '12px', textAlign: 'center', fontSize: '13px', color: '#666', cursor: 'pointer', marginBottom: '10px' },
  preview:     { width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' },
  cancelBtn:   { flex: 1, padding: '12px', background: '#f5f5f5', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' },
  saveBtn:     { flex: 1, padding: '12px', background: 'linear-gradient(135deg,#1a3a6b,#00c853)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' },
  emptyCard:   { background: '#fff', borderRadius: '12px', padding: '40px 20px', textAlign: 'center' },
  empty:       { textAlign: 'center', color: '#999', padding: '40px 0' },
  card:        { background: '#fff', borderRadius: '12px', marginBottom: '12px', overflow: 'hidden', display: 'flex', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  cardImg:     { width: '90px', height: '90px', objectFit: 'cover', flexShrink: 0 },
  cardBody:    { padding: '12px', flex: 1 },
  cardTop:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' },
  prodName:    { fontWeight: '700', color: '#0d2347', fontSize: '14px' },
  stockBadge:  { fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '99px' },
  desc:        { fontSize: '12px', color: '#999', margin: '2px 0 4px' },
  price:       { fontSize: '14px', fontWeight: '700', color: '#1a3a6b', margin: '0 0 8px' },
  actions:     { display: 'flex', gap: '8px' },
  editBtn:     { flex: 1, padding: '7px', background: '#f0f4ff', color: '#1a3a6b', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  delBtn:      { flex: 1, padding: '7px', background: '#fff0f0', color: '#e53935', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
}