import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import Navbar from '../../components/Navbar'
import api from '../../utils/api'

export default function Home() {
  const { user }                    = useAuth()
  const { addToCart, cart, count }  = useCart()
  const navigate                    = useNavigate()
  const [products, setProducts]     = useState([])
  const [filtered, setFiltered]     = useState([])
  const [loading,  setLoading]      = useState(true)
  const [search,   setSearch]       = useState('')
  const [added,    setAdded]        = useState({})

  useEffect(() => {
    api.get('/products')
      .then(r => { setProducts(r.data); setFiltered(r.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    ))
  }, [search, products])

  const handleAdd = (product) => {
    addToCart(product)
    setAdded(prev => ({ ...prev, [product._id]: true }))
    setTimeout(() => setAdded(prev => ({ ...prev, [product._id]: false })), 1500)
  }

  const inCart = (id) => cart.find(i => i._id === id)

  return (
    <div style={S.page}>
      <Navbar />
      <div style={S.body}>
        {/* Header */}
        <div style={S.header}>
          <div>
            <h1 style={S.greeting}>Hello, {user?.name?.split(' ')[0]} 👋</h1>
            <p style={S.sub}>What would you like to order today?</p>
          </div>
          {count > 0 && (
            <button style={S.cartBtn} onClick={() => navigate('/cart')}>
              🛒 {count} item{count > 1 ? 's' : ''}
            </button>
          )}
        </div>

        {/* Search */}
        <div style={S.searchWrap}>
          <span style={S.searchIcon}>🔍</span>
          <input
            style={S.searchInput}
            placeholder="Search products…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Products */}
        {loading ? (
          <p style={S.empty}>Loading products…</p>
        ) : filtered.length === 0 ? (
          <p style={S.empty}>No products found.</p>
        ) : (
          <div style={S.grid}>
            {filtered.map(p => (
              <div key={p._id} style={S.card}>
                {p.image
                  ? <img src={p.image} alt={p.name} style={S.img} />
                  : <div style={S.imgPlaceholder}>📦</div>
                }
                <div style={S.cardBody}>
                  <p style={S.name}>{p.name}</p>
                  {p.description && <p style={S.desc}>{p.description}</p>}
                  <p style={S.price}>MWK {Number(p.price).toLocaleString()}</p>
                  <p style={S.stock}>{p.stock} {p.unit} available</p>
                  <button
                    style={{
                      ...S.addBtn,
                      background: added[p._id] ? '#00c853' : inCart(p._id) ? '#e8f5e9' : 'linear-gradient(135deg,#1a3a6b,#00c853)',
                      color: inCart(p._id) && !added[p._id] ? '#00c853' : '#fff',
                    }}
                    onClick={() => handleAdd(p)}
                    disabled={p.stock === 0}
                  >
                    {p.stock === 0 ? 'Out of stock' : added[p._id] ? '✓ Added!' : inCart(p._id) ? `In cart (${inCart(p._id).quantity})` : 'Add to Cart'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const S = {
  page:          { background: '#f0f0f0', minHeight: '100vh' },
  body:          { maxWidth: '430px', margin: '0 auto', padding: '16px' },
  header:        { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' },
  greeting:      { fontSize: '20px', fontWeight: '700', color: '#0d2347', margin: 0 },
  sub:           { fontSize: '13px', color: '#999', margin: '4px 0 0' },
  cartBtn:       { background: 'linear-gradient(135deg,#1a3a6b,#00c853)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 14px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' },
  searchWrap:    { background: '#fff', borderRadius: '10px', display: 'flex', alignItems: 'center', padding: '10px 14px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  searchIcon:    { fontSize: '16px', marginRight: '8px' },
  searchInput:   { border: 'none', outline: 'none', fontSize: '14px', flex: 1, background: 'transparent' },
  grid:          { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  card:          { background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  img:           { width: '100%', height: '110px', objectFit: 'cover' },
  imgPlaceholder:{ width: '100%', height: '110px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' },
  cardBody:      { padding: '10px' },
  name:          { fontWeight: '700', color: '#0d2347', fontSize: '13px', margin: '0 0 2px' },
  desc:          { fontSize: '11px', color: '#999', margin: '0 0 4px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },
  price:         { fontWeight: '700', color: '#1a3a6b', fontSize: '13px', margin: '0 0 2px' },
  stock:         { fontSize: '11px', color: '#aaa', margin: '0 0 8px' },
  addBtn:        { width: '100%', padding: '8px', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', color: '#fff' },
  empty:         { textAlign: 'center', color: '#999', padding: '40px 0' },
}