import { useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import Navbar from '../../components/Navbar'

export default function Cart() {
  const { cart, removeFromCart, updateQty, total, clearCart } = useCart()
  const navigate = useNavigate()

  if (cart.length === 0) return (
    <div style={S.page}>
      <Navbar />
      <div style={S.body}>
        <div style={S.emptyCard}>
          <p style={{ fontSize: '48px', margin: '0 0 12px' }}>🛒</p>
          <p style={{ color: '#999', margin: '0 0 20px' }}>Your cart is empty</p>
          <button style={S.shopBtn} onClick={() => navigate('/')}>Browse Products</button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={S.page}>
      <Navbar />
      <div style={S.body}>
        <div style={S.topBar}>
          <h1 style={S.title}>My Cart</h1>
          <button style={S.clearBtn} onClick={clearCart}>Clear all</button>
        </div>

        {cart.map(item => (
          <div key={item._id} style={S.card}>
            {item.image
              ? <img src={item.image} alt={item.name} style={S.img} />
              : <div style={S.imgPlaceholder}>📦</div>
            }
            <div style={S.cardBody}>
              <p style={S.name}>{item.name}</p>
              <p style={S.price}>MWK {Number(item.price).toLocaleString()} each</p>
              <div style={S.qtyRow}>
                <button style={S.qtyBtn} onClick={() => updateQty(item._id, item.quantity - 1)}>−</button>
                <span style={S.qty}>{item.quantity}</span>
                <button style={S.qtyBtn} onClick={() => updateQty(item._id, item.quantity + 1)}>+</button>
                <span style={S.subtotal}>MWK {Number(item.price * item.quantity).toLocaleString()}</span>
              </div>
            </div>
            <button style={S.removeBtn} onClick={() => removeFromCart(item._id)}>✕</button>
          </div>
        ))}

        {/* Summary */}
        <div style={S.summary}>
          <div style={S.summaryRow}>
            <span style={{ color: '#666' }}>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items)</span>
            <span style={{ fontWeight: '700', color: '#0d2347' }}>MWK {Number(total).toLocaleString()}</span>
          </div>
          <button style={S.checkoutBtn} onClick={() => navigate('/checkout')}>
            Proceed to Checkout →
          </button>
        </div>
      </div>
    </div>
  )
}

const S = {
  page:           { background: '#f0f0f0', minHeight: '100vh' },
  body:           { maxWidth: '430px', margin: '0 auto', padding: '16px' },
  topBar:         { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  title:          { fontSize: '20px', fontWeight: '700', color: '#0d2347', margin: 0 },
  clearBtn:       { background: 'none', border: 'none', color: '#e53935', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  emptyCard:      { background: '#fff', borderRadius: '16px', padding: '60px 20px', textAlign: 'center', marginTop: '40px' },
  shopBtn:        { background: 'linear-gradient(135deg,#1a3a6b,#00c853)', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 24px', fontWeight: '700', cursor: 'pointer' },
  card:           { background: '#fff', borderRadius: '12px', marginBottom: '10px', display: 'flex', alignItems: 'center', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  img:            { width: '80px', height: '80px', objectFit: 'cover', flexShrink: 0 },
  imgPlaceholder: { width: '80px', height: '80px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0 },
  cardBody:       { padding: '10px 12px', flex: 1 },
  name:           { fontWeight: '700', color: '#0d2347', fontSize: '14px', margin: '0 0 2px' },
  price:          { fontSize: '12px', color: '#999', margin: '0 0 8px' },
  qtyRow:         { display: 'flex', alignItems: 'center', gap: '10px' },
  qtyBtn:         { width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #e0e0e0', background: '#f5f5f5', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  qty:            { fontWeight: '700', color: '#0d2347', minWidth: '20px', textAlign: 'center' },
  subtotal:       { fontSize: '13px', fontWeight: '700', color: '#1a3a6b', marginLeft: 'auto' },
  removeBtn:      { background: 'none', border: 'none', color: '#ccc', fontSize: '16px', cursor: 'pointer', padding: '16px 12px' },
  summary:        { background: '#fff', borderRadius: '12px', padding: '20px', marginTop: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  summaryRow:     { display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '15px' },
  checkoutBtn:    { width: '100%', padding: '14px', background: 'linear-gradient(135deg,#1a3a6b,#00c853)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' },
}