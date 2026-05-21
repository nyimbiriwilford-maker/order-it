import { useNavigate }  from 'react-router-dom'
import { useCart }      from '../../context/CartContext'
import { usePrefs }     from '../../context/PreferencesContext'
import Navbar           from '../../components/Navbar'

export default function Cart() {
  const { cart, removeFromCart, updateQty, total, clearCart } = useCart()
  const { formatPrice } = usePrefs()
  const navigate = useNavigate()

  if (cart.length === 0) return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ maxWidth: '430px', margin: '0 auto', padding: '16px' }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '60px 20px', textAlign: 'center', marginTop: '40px' }}>
          <p style={{ fontSize: '48px', margin: '0 0 12px' }}>🛒</p>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 20px' }}>Your cart is empty</p>
          <button
            style={{ background: 'linear-gradient(135deg,#1a3a6b,#00c853)', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 24px', fontWeight: '700', cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            Browse Products
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ maxWidth: '430px', margin: '0 auto', padding: '16px' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
            My Cart
          </h1>
          <button
            style={{ background: 'none', border: 'none', color: '#e53935', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
            onClick={clearCart}
          >
            Clear all
          </button>
        </div>

        {/* Cart items */}
        {cart.map(item => (
          <div key={item._id} style={{ background: 'var(--bg-card)', borderRadius: '12px', marginBottom: '10px', display: 'flex', alignItems: 'center', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>

            {item.image
              ? <img src={item.image} alt={item.name} style={{ width: '80px', height: '80px', objectFit: 'cover', flexShrink: 0 }} />
              : <div style={{ width: '80px', height: '80px', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0 }}>📦</div>
            }

            <div style={{ padding: '10px 12px', flex: 1 }}>
              <p style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px', margin: '0 0 2px' }}>
                {item.name}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 8px' }}>
                {formatPrice(item.price)} each
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-subtle)', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}
                  onClick={() => updateQty(item._id, item.quantity - 1)}
                >−</button>
                <span style={{ fontWeight: '700', color: 'var(--text-primary)', minWidth: '20px', textAlign: 'center' }}>
                  {item.quantity}
                </span>
                <button
                  style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-subtle)', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}
                  onClick={() => updateQty(item._id, item.quantity + 1)}
                >+</button>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#1a3a6b', marginLeft: 'auto' }}>
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            </div>

            <button
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '16px', cursor: 'pointer', padding: '16px 12px' }}
              onClick={() => removeFromCart(item._id)}
            >✕</button>
          </div>
        ))}

        {/* Summary */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '20px', marginTop: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '15px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items)
            </span>
            <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
              {formatPrice(total)}
            </span>
          </div>
          <button
            style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#1a3a6b,#00c853)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}
            onClick={() => navigate('/checkout')}
          >
            Proceed to Checkout →
          </button>
        </div>

      </div>
    </div>
  )
}