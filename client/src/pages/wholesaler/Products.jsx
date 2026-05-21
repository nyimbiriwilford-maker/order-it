import { useState, useEffect } from 'react'
import { useAuth }             from '../../context/AuthContext'
import Navbar                  from '../../components/Navbar'
import api                     from '../../utils/api'

const CATEGORIES = ['General','Food & Grocery','Electronics','Agriculture','Household','Clothing','Health & Beauty','Stationery','Hardware']

const EMPTY_FORM = {
  name:              '',
  description:       '',
  price:             '',
  stock:             '',
  unit:              'item',
  image:             '',
  lowStockThreshold: '10',
  minOrderQty:       '1',
  category:          'General',
  tags:              '',
  // bulk pricing tiers  [{ minQty, pricePerUnit }]
  bulkTiers:         [],
  // promotion
  promoEnabled:      false,
  promoLabel:        '',      // e.g. "Weekend deal"
  promoPrice:        '',      // discounted price
  promoExpiry:       '',      // date string
}

export default function WholesalerProducts() {
  const { token }                   = useAuth()
  const [products,   setProducts]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [uploading,  setUploading]  = useState(false)
  const [showForm,   setShowForm]   = useState(false)
  const [editId,     setEditId]     = useState(null)
  const [error,      setError]      = useState('')
  const [activeTab,  setActiveTab]  = useState('details')   // 'details' | 'pricing' | 'promo'
  const [form,       setForm]       = useState(EMPTY_FORM)

  // ── load ──────────────────────────────────────────────────────────────────
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

  // ── form helpers ──────────────────────────────────────────────────────────
  const handle = e => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleImage = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const { data } = await api.post('/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setForm(f => ({ ...f, image: data.url }))
    } catch {
      setError('Image upload failed')
    } finally {
      setUploading(false)
    }
  }

  // ── bulk tier helpers ─────────────────────────────────────────────────────
  const addTier = () =>
    setForm(f => ({ ...f, bulkTiers: [...f.bulkTiers, { minQty: '', pricePerUnit: '' }] }))

  const updateTier = (i, field, val) =>
    setForm(f => {
      const tiers = [...f.bulkTiers]
      tiers[i] = { ...tiers[i], [field]: val }
      return { ...f, bulkTiers: tiers }
    })

  const removeTier = (i) =>
    setForm(f => ({ ...f, bulkTiers: f.bulkTiers.filter((_, idx) => idx !== i) }))

  // ── open / close form ─────────────────────────────────────────────────────
  const openAdd = () => {
    setEditId(null)
    setForm(EMPTY_FORM)
    setActiveTab('details')
    setError('')
    setShowForm(true)
  }

  const openEdit = (p) => {
    setEditId(p._id)
    setForm({
      name:              p.name,
      description:       p.description || '',
      price:             p.price,
      stock:             p.stock,
      unit:              p.unit || 'item',
      image:             p.image || '',
      lowStockThreshold: p.lowStockThreshold ?? 10,
      minOrderQty:       p.minOrderQty ?? 1,
      category:          p.category || 'General',
      tags:              (p.tags || []).join(', '),
      bulkTiers:         p.bulkPricing || [],
      promoEnabled:      !!p.promo?.enabled,
      promoLabel:        p.promo?.label || '',
      promoPrice:        p.promo?.price || '',
      promoExpiry:       p.promo?.expiry ? p.promo.expiry.slice(0, 10) : '',
    })
    setActiveTab('details')
    setError('')
    setShowForm(true)
  }

  // ── submit ────────────────────────────────────────────────────────────────
  const submit = async () => {
    setError('')
    if (!form.name || !form.price || form.stock === '')
      return setError('Name, price and stock are required')
    if (Number(form.minOrderQty) < 1)
      return setError('Minimum order quantity must be at least 1')
    if (form.promoEnabled && (!form.promoPrice || Number(form.promoPrice) >= Number(form.price)))
      return setError('Promotional price must be set and less than the regular price')

    const payload = {
      name:              form.name,
      description:       form.description,
      price:             Number(form.price),
      stock:             Number(form.stock),
      unit:              form.unit,
      image:             form.image,
      lowStockThreshold: Number(form.lowStockThreshold),
      minOrderQty:       Number(form.minOrderQty),
      category:          form.category,
      tags:              form.tags.split(',').map(t => t.trim()).filter(Boolean),
      bulkPricing:       form.bulkTiers
                           .filter(t => t.minQty && t.pricePerUnit)
                           .map(t => ({ minQty: Number(t.minQty), pricePerUnit: Number(t.pricePerUnit) })),
      promo: form.promoEnabled ? {
        enabled: true,
        label:   form.promoLabel,
        price:   Number(form.promoPrice),
        expiry:  form.promoExpiry || null,
      } : { enabled: false },
    }

    setSaving(true)
    try {
      if (editId) {
        const { data } = await api.put(`/products/${editId}`, payload)
        setProducts(prev => prev.map(p => p._id === editId ? data : p))
      } else {
        const { data } = await api.post('/products', payload)
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

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      <Navbar />
      <div style={S.body}>

        <div style={S.topBar}>
          <h1 style={S.title}>My Products</h1>
          <button style={S.addBtn} onClick={openAdd}>+ Add Product</button>
        </div>

        {error && !showForm && <div style={S.error}>{error}</div>}

        {/* ── Form Modal ──────────────────────────────────────────────────── */}
        {showForm && (
          <div style={S.overlay} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
            <div style={S.modal}>

              <div style={S.modalHeader}>
                <h2 style={S.modalTitle}>{editId ? 'Edit Product' : 'Add Product'}</h2>
                <button style={S.closeBtn} onClick={() => setShowForm(false)}>✕</button>
              </div>

              {/* Tab bar */}
              <div style={S.tabBar}>
                {['details', 'pricing', 'promo'].map(t => (
                  <button
                    key={t}
                    style={{ ...S.tabBtn, ...(activeTab === t ? S.tabBtnActive : {}) }}
                    onClick={() => setActiveTab(t)}
                  >
                    {t === 'details' ? '📋 Details'
                     : t === 'pricing' ? '💰 Pricing'
                     : '🏷 Promotion'}
                  </button>
                ))}
              </div>

              {error && <div style={S.error}>{error}</div>}

              {/* ── Tab: Details ──────────────────────────────────────── */}
              {activeTab === 'details' && (
                <>
                  <input
                    style={S.input} name="name"
                    placeholder="Product name *"
                    value={form.name} onChange={handle}
                  />
                  <textarea
                    style={{ ...S.input, height: '70px', resize: 'none' }}
                    name="description" placeholder="Description"
                    value={form.description} onChange={handle}
                  />

                  <label style={S.fieldLabel}>Category</label>
                  <select style={S.input} name="category" value={form.category} onChange={handle}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  <div style={S.row}>
                    <div style={{ flex: 1 }}>
                      <label style={S.fieldLabel}>Stock *</label>
                      <input style={S.input} name="stock" type="number" placeholder="0" value={form.stock} onChange={handle} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={S.fieldLabel}>Unit</label>
                      <input style={S.input} name="unit" placeholder="item, kg, box…" value={form.unit} onChange={handle} />
                    </div>
                  </div>

                  <div style={S.row}>
                    <div style={{ flex: 1 }}>
                      <label style={S.fieldLabel}>Min. order qty</label>
                      <input style={S.input} name="minOrderQty" type="number" min="1" placeholder="1" value={form.minOrderQty} onChange={handle} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={S.fieldLabel}>Low stock alert at</label>
                      <input style={S.input} name="lowStockThreshold" type="number" placeholder="10" value={form.lowStockThreshold} onChange={handle} />
                    </div>
                  </div>

                  <label style={S.fieldLabel}>Tags (comma separated)</label>
                  <input
                    style={S.input} name="tags"
                    placeholder="e.g. flour, maize, staple"
                    value={form.tags} onChange={handle}
                  />

                  <label style={S.uploadLabel}>
                    {uploading ? 'Uploading…' : '📷 Upload Image'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImage} />
                  </label>
                  {form.image && <img src={form.image} alt="preview" style={S.preview} />}
                </>
              )}

              {/* ── Tab: Pricing ──────────────────────────────────────── */}
              {activeTab === 'pricing' && (
                <>
                  <label style={S.fieldLabel}>Regular price (MWK) *</label>
                  <input
                    style={S.input} name="price" type="number"
                    placeholder="e.g. 3500"
                    value={form.price} onChange={handle}
                  />

                  <div style={S.sectionHead}>
                    <span style={S.sectionTitle}>Bulk pricing tiers</span>
                    <button style={S.addTierBtn} onClick={addTier}>+ Add tier</button>
                  </div>
                  <p style={S.sectionHint}>
                    Set lower prices for larger quantities. Retailers will see these in the product detail.
                  </p>

                  {form.bulkTiers.length === 0 && (
                    <p style={S.noTiers}>No bulk tiers yet — tap "+ Add tier" to add one.</p>
                  )}

                  {form.bulkTiers.map((tier, i) => (
                    <div key={i} style={S.tierRow}>
                      <div style={S.tierLabel}>Tier {i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <label style={S.fieldLabel}>Min qty</label>
                        <input
                          style={S.tierInput} type="number" placeholder="50"
                          value={tier.minQty}
                          onChange={e => updateTier(i, 'minQty', e.target.value)}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={S.fieldLabel}>Price / unit (MWK)</label>
                        <input
                          style={S.tierInput} type="number" placeholder="3000"
                          value={tier.pricePerUnit}
                          onChange={e => updateTier(i, 'pricePerUnit', e.target.value)}
                        />
                      </div>
                      <button style={S.removeTierBtn} onClick={() => removeTier(i)}>✕</button>
                    </div>
                  ))}

                  {form.bulkTiers.length > 0 && (
                    <div style={S.tierPreview}>
                      <p style={S.tierPreviewTitle}>Preview</p>
                      <p style={S.tierPreviewLine}>
                        MWK {Number(form.price || 0).toLocaleString()} each
                      </p>
                      {form.bulkTiers
                        .filter(t => t.minQty && t.pricePerUnit)
                        .sort((a, b) => a.minQty - b.minQty)
                        .map((t, i) => (
                          <p key={i} style={S.tierPreviewLine}>
                            MWK {Number(t.pricePerUnit).toLocaleString()} for {Number(t.minQty)}+
                          </p>
                        ))}
                    </div>
                  )}
                </>
              )}

              {/* ── Tab: Promotion ────────────────────────────────────── */}
              {activeTab === 'promo' && (
                <>
                  <label style={S.toggleRow}>
                    <div
                      style={{ ...S.toggleTrack, background: form.promoEnabled ? '#00c853' : '#d1d5db' }}
                      onClick={() => setForm(f => ({ ...f, promoEnabled: !f.promoEnabled }))}
                    >
                      <div style={{ ...S.toggleThumb, transform: form.promoEnabled ? 'translateX(18px)' : 'translateX(0)' }} />
                    </div>
                    <span style={S.toggleText}>Enable promotion</span>
                  </label>

                  {form.promoEnabled && (
                    <>
                      <p style={S.sectionHint}>
                        A promotional price and label will be shown on the product card and detail sheet for retailers.
                      </p>

                      <label style={S.fieldLabel}>Promo label</label>
                      <input
                        style={S.input} name="promoLabel"
                        placeholder="e.g. Weekend deal, Clearance, Buy more save more"
                        value={form.promoLabel} onChange={handle}
                      />

                      <label style={S.fieldLabel}>Promotional price (MWK)</label>
                      <input
                        style={S.input} name="promoPrice" type="number"
                        placeholder="Must be less than regular price"
                        value={form.promoPrice} onChange={handle}
                      />

                      {form.price && form.promoPrice && Number(form.promoPrice) < Number(form.price) && (
                        <div style={S.savingsBadge}>
                          Retailers save MWK {(Number(form.price) - Number(form.promoPrice)).toLocaleString()} ({Math.round((1 - form.promoPrice / form.price) * 100)}% off)
                        </div>
                      )}

                      <label style={S.fieldLabel}>Expiry date (optional)</label>
                      <input
                        style={S.input} name="promoExpiry" type="date"
                        value={form.promoExpiry} onChange={handle}
                      />

                      <div style={S.promoPreview}>
                        <div style={S.promoPreviewLeft}>
                          <span style={S.promoTag}>{form.promoLabel || 'Promo'}</span>
                          <span style={S.promoOldPrice}>MWK {Number(form.price || 0).toLocaleString()}</span>
                          <span style={S.promoNewPrice}>MWK {Number(form.promoPrice || 0).toLocaleString()}</span>
                        </div>
                        {form.promoExpiry && (
                          <span style={S.promoExpiry}>Ends {new Date(form.promoExpiry).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                        )}
                      </div>
                    </>
                  )}

                  {!form.promoEnabled && (
                    <p style={S.noTiers}>Promotions are off. Toggle on to set a discounted price for retailers.</p>
                  )}
                </>
              )}

              {/* Footer buttons */}
              <div style={{ ...S.row, marginTop: '16px' }}>
                <button style={S.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
                <button
                  style={{ ...S.saveBtn, opacity: saving ? 0.7 : 1 }}
                  onClick={submit}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Product'}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ── Product List ─────────────────────────────────────────────────── */}
        {loading ? (
          <p style={S.empty}>Loading products…</p>
        ) : products.length === 0 ? (
          <div style={S.emptyCard}>
            <p style={{ fontSize: '40px', margin: '0 0 12px' }}>📦</p>
            <p style={{ color: '#999', margin: 0 }}>No products yet. Add your first product.</p>
          </div>
        ) : (
          products.map(p => {
            const hasPromo = p.promo?.enabled
            const hasBulk  = (p.bulkPricing || []).length > 0
            const isLow    = p.stock > 0 && p.stock <= (p.lowStockThreshold || 10)
            const isOut    = p.stock === 0

            return (
              <div key={p._id} style={{ ...S.card, opacity: isOut ? 0.7 : 1 }}>
                {p.image && <img src={p.image} alt={p.name} style={S.cardImg} />}
                <div style={S.cardBody}>

                  <div style={S.cardTop}>
                    <span style={S.prodName}>{p.name}</span>
                    <span style={{
                      ...S.stockBadge,
                      background: isOut ? '#fff0f0' : isLow ? '#fffbeb' : '#f0fff4',
                      color:      isOut ? '#e53935' : isLow ? '#92600a' : '#00c853',
                    }}>
                      {isOut ? 'Out of stock' : `${p.stock} ${p.unit}`}
                    </span>
                  </div>

                  <p style={S.category}>{p.category || 'General'}</p>

                  {p.description && <p style={S.desc}>{p.description}</p>}

                  {/* Price row */}
                  <div style={S.priceRow}>
                    {hasPromo ? (
                      <>
                        <span style={S.promoCardPrice}>MWK {Number(p.promo.price).toLocaleString()}</span>
                        <span style={S.oldPrice}>MWK {Number(p.price).toLocaleString()}</span>
                        <span style={S.promoCardTag}>{p.promo.label || 'Promo'}</span>
                      </>
                    ) : (
                      <span style={S.price}>MWK {Number(p.price).toLocaleString()}</span>
                    )}
                  </div>

                  {/* Badges row */}
                  <div style={S.badgeRow}>
                    {(p.minOrderQty > 1) && (
                      <span style={S.infoBadge}>Min {p.minOrderQty} {p.unit}</span>
                    )}
                    {hasBulk && (
                      <span style={{ ...S.infoBadge, background: '#e8f5e9', color: '#1b5e20' }}>
                        {p.bulkPricing.length} bulk tier{p.bulkPricing.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {hasPromo && p.promo.expiry && (
                      <span style={{ ...S.infoBadge, background: '#fef3cd', color: '#92600a' }}>
                        Ends {new Date(p.promo.expiry).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>

                  <div style={S.actions}>
                    <button style={S.editBtn} onClick={() => openEdit(p)}>Edit</button>
                    <button style={S.delBtn}  onClick={() => remove(p._id)}>Delete</button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page:         { background: '#f0f0f0', minHeight: '100vh' },
  body:         { maxWidth: '430px', margin: '0 auto', padding: '16px' },
  topBar:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  title:        { fontSize: '20px', fontWeight: '700', color: '#0d2347', margin: 0 },
  addBtn:       { background: 'linear-gradient(135deg,#1a3a6b,#00c853)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 16px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' },
  error:        { background: '#fff0f0', border: '1px solid #ffcccc', color: '#cc0000', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '12px' },

  // modal
  overlay:      { position: 'fixed', inset: 0, background: '#00000066', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  modal:        { background: '#fff', borderRadius: '16px 16px 0 0', padding: '20px 16px 36px', width: '100%', maxWidth: '430px', maxHeight: '92vh', overflowY: 'auto' },
  modalHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' },
  modalTitle:   { fontSize: '17px', fontWeight: '700', color: '#0d2347', margin: 0 },
  closeBtn:     { background: '#f0f0f0', border: 'none', borderRadius: '50%', width: '28px', height: '28px', fontSize: '13px', cursor: 'pointer', color: '#555' },

  // tabs inside modal
  tabBar:       { display: 'flex', gap: '6px', marginBottom: '16px', borderBottom: '1px solid #eee', paddingBottom: '10px' },
  tabBtn:       { flex: 1, padding: '7px 4px', fontSize: '12px', fontWeight: '600', border: '1.5px solid #e0e0e0', borderRadius: '8px', background: '#f9f9f9', color: '#666', cursor: 'pointer' },
  tabBtnActive: { background: '#1a3a6b', color: '#fff', border: '1.5px solid #1a3a6b' },

  // form fields
  fieldLabel:   { display: 'block', fontSize: '11px', fontWeight: '600', color: '#555', marginBottom: '4px', marginTop: '2px' },
  input:        { width: '100%', padding: '11px 13px', borderRadius: '8px', border: '1px solid #e0e0e0', fontSize: '14px', marginBottom: '10px', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' },
  row:          { display: 'flex', gap: '10px' },
  uploadLabel:  { display: 'block', background: '#f5f5f5', border: '1px dashed #ccc', borderRadius: '8px', padding: '12px', textAlign: 'center', fontSize: '13px', color: '#666', cursor: 'pointer', marginBottom: '10px' },
  preview:      { width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' },
  cancelBtn:    { flex: 1, padding: '12px', background: '#f5f5f5', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' },
  saveBtn:      { flex: 1, padding: '12px', background: 'linear-gradient(135deg,#1a3a6b,#00c853)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' },

  // bulk tier
  sectionHead:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 4px' },
  sectionTitle: { fontSize: '13px', fontWeight: '700', color: '#0d2347' },
  sectionHint:  { fontSize: '11px', color: '#aaa', margin: '0 0 10px' },
  addTierBtn:   { background: '#e8f0fe', color: '#1a3a6b', border: 'none', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  noTiers:      { fontSize: '12px', color: '#bbb', textAlign: 'center', padding: '16px 0' },
  tierRow:      { display: 'flex', alignItems: 'flex-end', gap: '8px', background: '#f9f9f9', borderRadius: '8px', padding: '10px', marginBottom: '8px' },
  tierLabel:    { fontSize: '11px', fontWeight: '700', color: '#1a3a6b', whiteSpace: 'nowrap', paddingBottom: '12px' },
  tierInput:    { width: '100%', padding: '9px 10px', borderRadius: '7px', border: '1px solid #e0e0e0', fontSize: '13px', boxSizing: 'border-box', outline: 'none' },
  removeTierBtn:{ background: '#fff0f0', border: 'none', borderRadius: '6px', color: '#e53935', fontSize: '14px', width: '28px', height: '28px', cursor: 'pointer', flexShrink: 0, paddingBottom: '12px' },
  tierPreview:  { background: '#f0fff4', border: '1px solid #b2dfdb', borderRadius: '8px', padding: '10px 14px', marginTop: '4px' },
  tierPreviewTitle: { fontSize: '11px', fontWeight: '700', color: '#1b5e20', margin: '0 0 4px' },
  tierPreviewLine:  { fontSize: '12px', color: '#2e7d32', margin: '2px 0' },

  // promo
  toggleRow:    { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', cursor: 'pointer' },
  toggleTrack:  { width: '38px', height: '20px', borderRadius: '50px', position: 'relative', transition: 'background .2s', flexShrink: 0 },
  toggleThumb:  { width: '14px', height: '14px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '3px', left: '3px', transition: 'transform .2s' },
  toggleText:   { fontSize: '14px', fontWeight: '600', color: '#0d2347' },
  savingsBadge: { background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#1b5e20', fontWeight: '600', marginBottom: '10px' },
  promoPreview: { background: '#fff8e1', border: '1px solid #ffe082', borderRadius: '10px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' },
  promoPreviewLeft: { display: 'flex', flexDirection: 'column', gap: '3px' },
  promoTag:     { fontSize: '10px', fontWeight: '700', color: '#e65100', background: '#ffe0b2', borderRadius: '4px', padding: '2px 6px', display: 'inline-block', width: 'fit-content' },
  promoOldPrice:{ fontSize: '12px', color: '#aaa', textDecoration: 'line-through' },
  promoNewPrice:{ fontSize: '16px', fontWeight: '700', color: '#e65100' },
  promoExpiry:  { fontSize: '11px', color: '#92600a', fontWeight: '600' },

  // product list cards
  empty:        { textAlign: 'center', color: '#999', padding: '40px 0' },
  emptyCard:    { background: '#fff', borderRadius: '12px', padding: '40px 20px', textAlign: 'center' },
  card:         { background: '#fff', borderRadius: '12px', marginBottom: '12px', overflow: 'hidden', display: 'flex', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  cardImg:      { width: '90px', height: '90px', objectFit: 'cover', flexShrink: 0 },
  cardBody:     { padding: '11px 12px', flex: 1, minWidth: 0 },
  cardTop:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px', gap: '8px' },
  prodName:     { fontWeight: '700', color: '#0d2347', fontSize: '14px', flex: 1 },
  stockBadge:   { fontSize: '10px', fontWeight: '600', padding: '3px 8px', borderRadius: '99px', whiteSpace: 'nowrap', flexShrink: 0 },
  category:     { fontSize: '10px', color: '#aaa', margin: '0 0 3px' },
  desc:         { fontSize: '12px', color: '#999', margin: '2px 0 4px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' },
  priceRow:     { display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 5px', flexWrap: 'wrap' },
  price:        { fontSize: '14px', fontWeight: '700', color: '#1a3a6b' },
  promoCardPrice:{ fontSize: '14px', fontWeight: '700', color: '#e65100' },
  oldPrice:     { fontSize: '12px', color: '#bbb', textDecoration: 'line-through' },
  promoCardTag: { fontSize: '10px', fontWeight: '700', color: '#e65100', background: '#ffe0b2', borderRadius: '4px', padding: '1px 5px' },
  badgeRow:     { display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '7px' },
  infoBadge:    { fontSize: '10px', fontWeight: '600', padding: '2px 7px', borderRadius: '99px', background: '#e8f0fe', color: '#1a3a6b' },
  actions:      { display: 'flex', gap: '8px' },
  editBtn:      { flex: 1, padding: '7px', background: '#f0f4ff', color: '#1a3a6b', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  delBtn:       { flex: 1, padding: '7px', background: '#fff0f0', color: '#e53935', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
}