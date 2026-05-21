import { useState, useEffect, useRef } from 'react'
import { useNavigate }                  from 'react-router-dom'
import { useAuth }                      from '../../context/AuthContext'
import { useCart }                      from '../../context/CartContext'
import { usePrefs }                     from '../../context/PreferencesContext'
import Navbar                           from '../../components/Navbar'
import PhotoSearchModal                 from '../../components/PhotoSearchModal'
import api                              from '../../utils/api'

function effectivePrice(p) {
  if (p.promo?.enabled && p.promo.price) {
    if (!p.promo.expiry || new Date(p.promo.expiry) > new Date()) return p.promo.price
  }
  return p.price
}

function bulkPrice(p, qty) {
  if (!p.bulkPricing?.length) return null
  const sorted = [...p.bulkPricing].filter(t => qty >= t.minQty).sort((a, b) => b.minQty - a.minQty)
  return sorted[0]?.pricePerUnit ?? null
}

export default function Home() {
  const { user }    = useAuth()
  const { addToCart, updateQty: cartUpdateQty, cart } = useCart()
  const { formatPrice, t } = usePrefs()
  const navigate    = useNavigate()

  const [products,    setProducts]   = useState([])
  const [filtered,    setFiltered]   = useState([])
  const [categories,  setCategories] = useState(['All'])
  const [loading,     setLoading]    = useState(true)
  const [search,      setSearch]     = useState('')
  const [activeTab,   setActiveTab]  = useState('All')
  const [sortBy,      setSortBy]     = useState('default')
  const [inStockOnly, setInStockOnly]= useState(false)
  const [showFilters, setShowFilters]= useState(false)
  const [minPrice,    setMinPrice]   = useState('')
  const [maxPrice,    setMaxPrice]   = useState('')
  const [appliedMin,  setAppliedMin] = useState(null)
  const [appliedMax,  setAppliedMax] = useState(null)
  const [quantities,  setQuantities] = useState({})
  const [added,       setAdded]      = useState({})
  const [toast,       setToast]      = useState(null)
  const toastTimer                   = useRef(null)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [visualBanner,   setVisualBanner]   = useState(null)
  const [modalProduct,   setModalProduct]   = useState(null)

  useEffect(() => {
    api.get('/products').then(r => {
      const data = r.data
      setProducts(data); setFiltered(data)
      const cats = ['All', ...new Set(data.map(p => p.category || 'General').filter(Boolean))]
      setCategories(cats)
      const initQty = {}
      data.forEach(p => { initQty[p._id] = p.minOrderQty || 1 })
      setQuantities(initQty)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (visualBanner) return
    let list = [...products]
    const q = search.trim().toLowerCase()
    if (q) list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.wholesaler?.businessName || '').toLowerCase().includes(q)
    )
    if (activeTab !== 'All') list = list.filter(p => (p.category || 'General') === activeTab)
    if (inStockOnly) list = list.filter(p => p.stock > 0)
    if (appliedMin !== null) list = list.filter(p => effectivePrice(p) >= appliedMin)
    if (appliedMax !== null) list = list.filter(p => effectivePrice(p) <= appliedMax)
    if (sortBy === 'price_asc')  list.sort((a, b) => effectivePrice(a) - effectivePrice(b))
    if (sortBy === 'price_desc') list.sort((a, b) => effectivePrice(b) - effectivePrice(a))
    if (sortBy === 'newest')     list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    setFiltered(list)
  }, [search, activeTab, inStockOnly, sortBy, appliedMin, appliedMax, products, visualBanner])

  const getMin = (p) => p.minOrderQty || 1
  const getMax = (p) => p.stock

  const stepDown = (p) => setQuantities(prev => ({ ...prev, [p._id]: Math.max(getMin(p), (prev[p._id] || getMin(p)) - 1) }))
  const stepUp   = (p) => setQuantities(prev => ({ ...prev, [p._id]: Math.min(getMax(p), (prev[p._id] || getMin(p)) + 1) }))
  const setQty   = (p, val) => {
    const n = parseInt(val, 10)
    if (isNaN(n)) return
    setQuantities(prev => ({ ...prev, [p._id]: Math.min(getMax(p), Math.max(getMin(p), n)) }))
  }

  const handleAdd = (product, qty) => {
    const inC = cart.find(i => i._id === product._id)
    if (inC) { cartUpdateQty(product._id, inC.quantity + qty) }
    else { addToCart(product); if (qty > 1) cartUpdateQty(product._id, qty) }
    setAdded(prev => ({ ...prev, [product._id]: true }))
    setTimeout(() => setAdded(prev => ({ ...prev, [product._id]: false })), 1800)
    clearTimeout(toastTimer.current)
    setToast({ msg: `${product.name} ${t('Added!')}`, id: product._id })
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }

  const inCart  = (id) => cart.find(i => i._id === id)
  const cartQty = (id) => inCart(id)?.quantity || 0

  const handleVisualResults = ({ detectedProduct, confidence, products: results }) => {
    setFiltered(results); setSearch(''); setVisualBanner({ detectedProduct, confidence })
    const extra = {}
    results.forEach(p => { if (!quantities[p._id]) extra[p._id] = p.minOrderQty || 1 })
    if (Object.keys(extra).length) setQuantities(prev => ({ ...prev, ...extra }))
  }

  const clearVisualSearch = () => { setVisualBanner(null); setFiltered(products) }

  const applyPriceFilter = () => {
    setAppliedMin(minPrice !== '' ? Number(minPrice) : null)
    setAppliedMax(maxPrice !== '' ? Number(maxPrice) : null)
  }
  const clearPriceFilter = () => { setMinPrice(''); setMaxPrice(''); setAppliedMin(null); setAppliedMax(null) }
  const hasPriceFilter = appliedMin !== null || appliedMax !== null

  const SORT_OPTIONS = [
    { value: 'default',    label: t('Most popular')      },
    { value: 'price_asc',  label: t('Price: low → high') },
    { value: 'price_desc', label: t('Price: high → low') },
    { value: 'newest',     label: t('Newest')            },
  ]

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      <Navbar />

      {/* Hero */}
      <div style={{ background: 'var(--bg-hero)', padding: '14px 14px 18px', maxWidth: '430px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', margin: '0 0 2px' }}>
          {t('Home')}, {user?.name?.split(' ')[0]}
        </h1>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: '0 0 12px' }}>
          {t('Find wholesalers, compare prices, and order stock easily.')}
        </p>
        <div style={{ background: 'var(--bg-card)', borderRadius: '50px', display: 'flex', alignItems: 'center', padding: '8px 12px', gap: '8px' }}>
          <span style={{ fontSize: '15px', flexShrink: 0 }}>🔍</span>
          <input
            style={{ border: 'none', outline: 'none', fontSize: '13px', flex: 1, background: 'transparent', color: 'var(--text-primary)' }}
            placeholder={t('Search products…')}
            value={search}
            onChange={e => { setSearch(e.target.value); if (visualBanner) clearVisualSearch() }}
          />
          <button style={{ background: '#00c853', border: 'none', borderRadius: '50%', width: '30px', height: '30px', fontSize: '14px', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setShowPhotoModal(true)}>📷</button>
        </div>
      </div>

      <div style={{ maxWidth: '430px', margin: '0 auto', padding: '0 14px 32px' }}>

        {/* Category Tabs */}
        <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '10px 14px', scrollbarWidth: 'none' }}>
            {categories.map(cat => {
              const active = activeTab === cat
              const label  = cat === 'All' ? t('All') : cat
              return (
                <button key={cat} style={{
                  flexShrink: 0, padding: '5px 13px', borderRadius: '50px',
                  fontSize: '12px', fontWeight: '500', whiteSpace: 'nowrap', cursor: 'pointer',
                  border: '1.5px solid #1a3a6b',
                  background: active ? '#1a3a6b' : 'var(--bg-card)',
                  color:      active ? '#fff'    : '#1a3a6b',
                }} onClick={() => { setActiveTab(cat); if (visualBanner) clearVisualSearch() }}>
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0 6px' }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '500',
            border: '1.5px solid #1a3a6b', borderRadius: '50px', padding: '5px 12px', cursor: 'pointer',
            whiteSpace: 'nowrap', position: 'relative',
            background: showFilters ? '#1a3a6b' : 'var(--bg-card)',
            color:      showFilters ? '#fff'    : '#1a3a6b',
          }} onClick={() => setShowFilters(v => !v)}>
            ⚙ {t('Filter')} {hasPriceFilter && <span style={{ width: '6px', height: '6px', background: '#00c853', borderRadius: '50%', position: 'absolute', top: '2px', right: '2px' }} />}
          </button>
          <select style={{
            flex: 1, fontSize: '12px', border: '1.5px solid var(--border)', borderRadius: '50px',
            padding: '5px 10px', background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none',
          }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', flexShrink: 0 }}>
            <div style={{ width: '32px', height: '18px', borderRadius: '50px', position: 'relative', transition: 'background .2s', cursor: 'pointer', background: inStockOnly ? '#00c853' : '#d1d5db' }}
              onClick={() => setInStockOnly(v => !v)}>
              <div style={{ width: '12px', height: '12px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '3px', left: '3px', transition: 'transform .2s', transform: inStockOnly ? 'translateX(14px)' : 'translateX(0)' }} />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{t('In stock')}</span>
          </label>
        </div>

        {showFilters && (
          <div style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '12px', marginBottom: '10px', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 8px' }}>{t('Price range')}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input style={{ flex: 1, border: '1.5px solid var(--border)', borderRadius: '8px', padding: '6px 8px', fontSize: '12px', outline: 'none', minWidth: 0, background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                type="number" placeholder={t('Min.')} value={minPrice} onChange={e => setMinPrice(e.target.value)} />
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>–</span>
              <input style={{ flex: 1, border: '1.5px solid var(--border)', borderRadius: '8px', padding: '6px 8px', fontSize: '12px', outline: 'none', minWidth: 0, background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                type="number" placeholder={t('Max')} value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
              <button style={{ background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }} onClick={applyPriceFilter}>{t('Apply')}</button>
              {hasPriceFilter && <button style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: 'none', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', cursor: 'pointer' }} onClick={clearPriceFilter}>{t('Clear')}</button>}
            </div>
          </div>
        )}

        {/* Visual search banner */}
        {visualBanner && (
          <div style={{ background: 'var(--bg-card)', borderRadius: '10px', border: `1.5px solid ${visualBanner.confidence === 'high' ? '#00c853' : '#f59e0b'}`, padding: '10px 12px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{visualBanner.confidence === 'high' ? '✅' : '🔍'}</span>
              <div>
                <p style={{ fontWeight: '700', fontSize: '12px', color: 'var(--text-primary)', margin: 0 }}>
                  {visualBanner.detectedProduct ? `${t('Results for')}: ${visualBanner.detectedProduct}` : t('Visual search results')}
                </p>
                {visualBanner.confidence !== 'high' && <p style={{ fontSize: '11px', color: '#f59e0b', margin: '2px 0 0' }}>{t('Low confidence — showing closest matches')}</p>}
              </div>
            </div>
            <button style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px 8px', whiteSpace: 'nowrap' }} onClick={clearVisualSearch}>✕ {t('Clear')}</button>
          </div>
        )}

        {!loading && (
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 8px' }}>
            {filtered.length} {filtered.length !== 1 ? t('products') : t('product')}{activeTab !== 'All' ? ` ${t('in')} ${activeTab}` : ''}
          </p>
        )}

        {/* Product Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[1,2,3,4].map(n => <SkeletonCard key={n} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState t={t} visualBanner={visualBanner} onClear={clearVisualSearch}
            onClearFilters={() => { setActiveTab('All'); setSearch(''); setInStockOnly(false); clearPriceFilter() }} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {filtered.map(p => {
              const qty        = quantities[p._id] || getMin(p)
              const minQ       = getMin(p)
              const maxQ       = getMax(p)
              const outOfStock = p.stock === 0
              const lowStock   = !outOfStock && p.stock <= (p.lowStockThreshold || 10)
              const wasAdded   = added[p._id]
              const cartItem   = inCart(p._id)
              const hasPromo   = p.promo?.enabled && p.promo.price && (!p.promo.expiry || new Date(p.promo.expiry) > new Date())
              const dispPrice  = hasPromo ? p.promo.price : p.price
              const discount   = hasPromo ? Math.round((1 - p.promo.price / p.price) * 100) : 0
              const activeBulk = bulkPrice(p, qty)

              return (
                <div key={p._id} style={{ background: 'var(--bg-card)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', opacity: outOfStock ? 0.6 : 1 }}>

                  <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setModalProduct(p)}>
                    {p.image ? <img src={p.image} alt={p.name} style={{ width: '100%', height: '100px', objectFit: 'cover', display: 'block' }} />
                      : <div style={{ width: '100%', height: '100px', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>📦</div>}
                    <span style={{ position: 'absolute', top: '6px', right: '6px', color: '#fff', fontSize: '9px', fontWeight: '700', padding: '2px 7px', borderRadius: '20px', background: outOfStock ? '#e53935' : lowStock ? '#f59e0b' : '#00c853' }}>
                      {outOfStock ? t('Out of stock') : lowStock ? t('Low stock') : t('In stock')}
                    </span>
                    {hasPromo && <span style={{ position: 'absolute', top: '6px', left: '6px', background: '#e65100', color: '#fff', fontSize: '9px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px' }}>{discount}% OFF</span>}
                  </div>

                  <div style={{ padding: '9px 9px 11px' }}>
                    <p style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '12px', margin: '0 0 2px', cursor: 'pointer', lineHeight: '1.3', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                      onClick={() => setModalProduct(p)}>{p.name}</p>

                    {p.wholesaler?.businessName && <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '0 0 3px' }}>🏪 {p.wholesaler.businessName}</p>}

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', margin: '0 0 1px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: '700', fontSize: '13px', color: hasPromo ? '#e65100' : '#00c853' }}>{formatPrice(dispPrice)}</span>
                      {hasPromo && <span style={{ fontSize: '10px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>{formatPrice(p.price)}</span>}
                    </div>

                    {hasPromo && p.promo.label && <p style={{ fontSize: '10px', color: '#e65100', fontWeight: '600', background: '#fff3e0', borderRadius: '4px', padding: '1px 5px', display: 'inline-block', margin: '0 0 3px' }}>{p.promo.label}</p>}

                    {activeBulk && <p style={{ fontSize: '10px', color: '#1b5e20', fontWeight: '600', background: '#e8f5e9', borderRadius: '4px', padding: '1px 5px', display: 'inline-block', margin: '0 0 3px' }}>{t('Bulk pricing')}: {formatPrice(activeBulk)} {t('for')} {qty}+</p>}

                    {minQ > 1 && <p style={{ fontSize: '10px', color: '#f59e0b', fontWeight: '600', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '4px', padding: '1px 5px', display: 'inline-block', margin: '0 0 3px' }}>{t('Min. order')}: {minQ} {p.unit || t('units')}</p>}

                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '0 0 6px' }}>{p.stock} {p.unit || t('units')} {t('available')}</p>

                    {!outOfStock && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                        <button style={{ width: '24px', height: '24px', border: '1.5px solid #1a3a6b', borderRadius: '50%', background: 'var(--bg-card)', color: '#1a3a6b', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', flexShrink: 0, opacity: qty <= minQ ? 0.35 : 1 }}
                          onClick={() => stepDown(p)} disabled={qty <= minQ}>−</button>
                        <input style={{ width: '36px', border: '1.5px solid var(--border)', borderRadius: '6px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', padding: '2px 0', background: 'var(--bg-input)', MozAppearance: 'textfield' }}
                          type="number" value={qty} min={minQ} max={maxQ} onChange={e => setQty(p, e.target.value)} />
                        <button style={{ width: '24px', height: '24px', border: '1.5px solid #1a3a6b', borderRadius: '50%', background: 'var(--bg-card)', color: '#1a3a6b', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', flexShrink: 0, opacity: qty >= maxQ ? 0.35 : 1 }}
                          onClick={() => stepUp(p)} disabled={qty >= maxQ}>+</button>
                      </div>
                    )}

                    {outOfStock
                      ? <button style={{ width: '100%', padding: '7px', border: '1.5px solid var(--border)', background: 'var(--bg-subtle)', borderRadius: '7px', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', cursor: 'pointer' }}>🔔 {t('Notify Me')}</button>
                      : <button style={{ width: '100%', padding: '7px', border: 'none', borderRadius: '7px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', transition: 'background .2s', background: wasAdded ? '#00c853' : cartItem ? '#e8f5e9' : '#1a3a6b', color: cartItem && !wasAdded ? '#00c853' : '#fff' }}
                          onClick={() => handleAdd(p, qty)}>
                          {wasAdded ? `✓ ${t('Added!')}` : cartItem ? `${t('In cart')} (${cartQty(p._id)})` : t('Add to Cart')}
                        </button>
                    }
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: '#0d2347', color: '#fff', padding: '10px 20px', borderRadius: '50px', fontSize: '13px', fontWeight: '600', zIndex: 200, whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>
          ✓ {toast.msg}
        </div>
      )}

      {modalProduct && (
        <ProductModal
          product={modalProduct} onClose={() => setModalProduct(null)}
          quantities={quantities} onStepDown={stepDown} onStepUp={stepUp} onSetQty={setQty}
          onAdd={handleAdd} inCart={inCart} cartQty={cartQty} added={added}
          getMin={getMin} getMax={getMax} formatPrice={formatPrice} t={t}
        />
      )}

      {showPhotoModal && (
        <PhotoSearchModal onClose={() => setShowPhotoModal(false)} onResults={handleVisualResults} />
      )}
    </div>
  )
}

// ─── Product Detail Modal ─────────────────────────────────────────────────────
function ProductModal({ product: p, onClose, quantities, onStepDown, onStepUp, onSetQty, onAdd, inCart, cartQty, added, getMin, getMax, formatPrice, t }) {
  const qty        = quantities[p._id] || getMin(p)
  const minQ       = getMin(p)
  const maxQ       = getMax(p)
  const outOfStock = p.stock === 0
  const lowStock   = !outOfStock && p.stock <= (p.lowStockThreshold || 10)
  const cartItem   = inCart(p._id)
  const wasAdded   = added[p._id]
  const hasPromo   = p.promo?.enabled && p.promo.price && (!p.promo.expiry || new Date(p.promo.expiry) > new Date())
  const dispPrice  = hasPromo ? p.promo.price : p.price
  const discount   = hasPromo ? Math.round((1 - p.promo.price / p.price) * 100) : 0
  const tiers      = (p.bulkPricing || []).filter(t => t.minQty && t.pricePerUnit).sort((a, b) => a.minQty - b.minQty)
  const activeTier = [...tiers].filter(tr => qty >= tr.minQty).sort((a, b) => b.minQty - a.minQty)[0]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 150, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '430px', padding: '16px 16px 36px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>

        <div style={{ width: '40px', height: '4px', background: 'var(--border)', borderRadius: '2px', margin: '0 auto 14px' }} />
        <button style={{ position: 'absolute', top: '14px', right: '14px', background: 'var(--bg-subtle)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', fontSize: '12px', cursor: 'pointer', color: 'var(--text-secondary)', zIndex: 5 }}
          onClick={onClose}>✕</button>

        {p.image
          ? <img src={p.image} alt={p.name} style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '12px', display: 'block', marginBottom: '10px' }} />
          : <div style={{ width: '100%', height: '180px', background: 'var(--bg-subtle)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', marginBottom: '10px' }}>📦</div>
        }

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-block', color: '#fff', fontSize: '10px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', background: outOfStock ? '#e53935' : lowStock ? '#f59e0b' : '#00c853' }}>
            {outOfStock ? t('Out of stock') : lowStock ? `${t('Only')} ${p.stock} ${t('left')}` : t('In stock')}
          </span>
          {hasPromo && <span style={{ display: 'inline-block', background: '#e65100', color: '#fff', fontSize: '10px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px' }}>{discount}% OFF — {p.promo.label || 'Promo'}</span>}
          {hasPromo && p.promo.expiry && <span style={{ display: 'inline-block', background: '#fff3e0', color: '#92600a', fontSize: '10px', fontWeight: '600', padding: '3px 9px', borderRadius: '20px', border: '1px solid #fde68a' }}>{t('Ends')} {new Date(p.promo.expiry).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
        </div>

        <h2 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 3px' }}>{p.name}</h2>
        {p.wholesaler?.businessName && <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 6px' }}>🏪 {p.wholesaler.businessName}</p>}

        {(p.category || p.tags?.length > 0) && (
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '8px' }}>
            {p.category && <span style={{ fontSize: '11px', fontWeight: '600', color: '#1a3a6b', background: '#e8f0fe', borderRadius: '50px', padding: '2px 9px' }}>{p.category}</span>}
            {p.tags?.map(tag => <span key={tag} style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--bg-subtle)', borderRadius: '50px', padding: '2px 9px' }}>{tag}</span>)}
          </div>
        )}

        {p.description && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 12px' }}>{p.description}</p>}

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '20px', fontWeight: '700', color: hasPromo ? '#e65100' : '#00c853' }}>{formatPrice(dispPrice)}</span>
          {hasPromo && <span style={{ fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>{formatPrice(p.price)}</span>}
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('per')} {p.unit || t('unit')}</span>
        </div>

        {hasPromo && (
          <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: '8px', padding: '7px 12px', fontSize: '12px', color: '#1b5e20', fontWeight: '600', marginBottom: '10px' }}>
            {t('You save')} {formatPrice(Number(p.price) - Number(p.promo.price))} ({discount}% off)
          </div>
        )}

        {(p.minOrderQty > 1) && (
          <div style={{ marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', color: '#92600a', fontWeight: '600', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '3px 9px', display: 'inline-block' }}>
              📦 {t('Min. order')}: {p.minOrderQty} {p.unit || t('units')}
            </span>
          </div>
        )}

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px' }}>{p.stock} {p.unit || t('units')} {t('available')}</p>

        {tiers.length > 0 && (
          <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', marginBottom: '14px' }}>
            <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 8px' }}>📊 {t('Bulk pricing')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-primary)', padding: '4px 8px', borderRadius: '6px', background: !activeTier ? '#e8f0fe' : 'transparent', fontWeight: !activeTier ? '700' : '400' }}>
                <span>1+ {p.unit || t('units')}</span><span>{formatPrice(p.price)}</span>
              </div>
              {tiers.map((tier, i) => {
                const isActive = activeTier?.minQty === tier.minQty
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '4px 8px', borderRadius: '6px', gap: '8px', background: isActive ? '#e8f5e9' : 'transparent', fontWeight: isActive ? '700' : '400', color: isActive ? '#1b5e20' : 'var(--text-primary)' }}>
                    <span>{tier.minQty}+ {p.unit || t('units')}</span>
                    <span>{formatPrice(tier.pricePerUnit)}</span>
                    {isActive && <span style={{ fontSize: '10px', color: '#1b5e20', fontWeight: '700', background: '#c8e6c9', borderRadius: '4px', padding: '1px 5px' }}>← {t('your qty')}</span>}
                  </div>
                )
              })}
            </div>
            {activeTier && (
              <p style={{ fontSize: '11px', color: '#1b5e20', fontWeight: '600', marginTop: '6px', marginBottom: 0 }}>
                {t('At')} {qty} {t('units')} {t('you save')} {formatPrice((p.price - activeTier.pricePerUnit) * qty)} {t('vs standard price')}
              </p>
            )}
          </div>
        )}

        {!outOfStock ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button style={{ width: '32px', height: '32px', border: '2px solid #1a3a6b', borderRadius: '50%', background: 'var(--bg-card)', color: '#1a3a6b', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', flexShrink: 0, opacity: qty <= minQ ? 0.35 : 1 }}
                onClick={() => onStepDown(p)} disabled={qty <= minQ}>−</button>
              <input style={{ width: '44px', border: '1.5px solid var(--border)', borderRadius: '8px', textAlign: 'center', fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', padding: '4px 0', background: 'var(--bg-input)', MozAppearance: 'textfield' }}
                type="number" value={qty} min={minQ} max={maxQ} onChange={e => onSetQty(p, e.target.value)} />
              <button style={{ width: '32px', height: '32px', border: '2px solid #1a3a6b', borderRadius: '50%', background: 'var(--bg-card)', color: '#1a3a6b', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', flexShrink: 0, opacity: qty >= maxQ ? 0.35 : 1 }}
                onClick={() => onStepUp(p)} disabled={qty >= maxQ}>+</button>
            </div>
            <button style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', background: wasAdded ? '#00c853' : cartItem ? '#e8f5e9' : '#1a3a6b', color: cartItem && !wasAdded ? '#00c853' : '#fff' }}
              onClick={() => { onAdd(p, qty); onClose() }}>
              {wasAdded ? `✓ ${t('Added!')}` : cartItem ? `${t('In cart')} (${cartQty(p._id)})` : t('Add to Cart')}
            </button>
          </div>
        ) : (
          <button style={{ width: '100%', marginTop: '16px', padding: '13px', border: '1.5px solid var(--border)', background: 'var(--bg-subtle)', borderRadius: '10px', fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)', cursor: 'pointer' }}>
            🔔 {t('Notify Me when restocked')}
          </button>
        )}
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ width: '100%', height: '100px', background: 'var(--bg-subtle)' }} />
      <div style={{ padding: '9px' }}>
        <div style={{ height: '10px', background: 'var(--border)', borderRadius: '4px', margin: '6px 0' }} />
        <div style={{ height: '10px', background: 'var(--border)', borderRadius: '4px', margin: '6px 0', width: '60%' }} />
        <div style={{ height: '28px', background: 'var(--border)', borderRadius: '7px', marginTop: '10px' }} />
      </div>
    </div>
  )
}

function EmptyState({ t, visualBanner, onClear, onClearFilters }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 16px' }}>
      <p style={{ fontSize: '48px', margin: '0 0 8px' }}>📦</p>
      <p style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '15px', margin: '0 0 4px' }}>
        {visualBanner ? `${t('No products found.')} "${visualBanner.detectedProduct}"` : t('No products match your filters')}
      </p>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px' }}>
        {visualBanner ? t('Try a text search instead, or browse all products.') : t('Try adjusting your search or filters.')}
      </p>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {visualBanner && <button style={{ background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }} onClick={onClear}>{t('Browse all products')}</button>}
        <button style={{ background: 'var(--bg-card)', color: '#1a3a6b', border: '1.5px solid #1a3a6b', borderRadius: '8px', padding: '10px 18px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }} onClick={onClearFilters}>{t('Clear filters')}</button>
      </div>
    </div>
  )
}