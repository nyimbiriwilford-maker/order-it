import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/Navbar'
import api from '../../utils/api'

export default function Checkout() {
  const { cart, total, clearCart } = useCart()
  const { user }                   = useAuth()
  const navigate                   = useNavigate()

  const [step,     setStep]    = useState(1)
  const [address,  setAddress] = useState({ street: '', city: '', state: '', country: 'Malawi' })
  const [placing,  setPlacing] = useState(false)
  const [error,    setError]   = useState('')

  // Per-group logistics state: { [wholesalerId]: { routes, selected, loading, error } }
  const [groupLogistics, setGroupLogistics] = useState({})

  // Derived: cart items grouped by wholesaler
  const groupedCart = useMemo(() => {
    const map = {}
    for (const item of cart) {
      const wId   = item.wholesaler?._id || 'unknown'
      const wName = item.wholesaler?.businessName || item.wholesaler?.name || 'Unknown Wholesaler'
      const wCity = item.wholesaler?.city || ''
      if (!map[wId]) map[wId] = { wholesalerId: wId, wholesalerName: wName, wholesalerCity: wCity, items: [] }
      map[wId].items.push(item)
    }
    return Object.values(map)
  }, [cart])

  useEffect(() => {
    if (cart.length === 0) navigate('/')
  }, [])

  // ── Fetch logistics routes for every wholesaler group ────────────────────────
  const fetchAllRoutes = async () => {
    if (!address.city) return setError('Please enter a delivery city')
    setError('')

    // Initialise loading state for every group
    const init = {}
    for (const g of groupedCart) {
      init[g.wholesalerId] = { routes: [], selected: null, loading: true, error: '' }
    }
    setGroupLogistics(init)
    setStep(3)

    // Fetch per-group in parallel
    await Promise.all(groupedCart.map(async (g) => {
      try {
        const { data } = await api.get(`/logistics/routes/available?to=${address.city}`)
        // Filter to routes that originate from this wholesaler's city
        const relevant = g.wholesalerCity
          ? data.filter(r => r.originCity?.toLowerCase() === g.wholesalerCity.toLowerCase())
          : data
        setGroupLogistics(prev => ({
          ...prev,
          [g.wholesalerId]: {
            routes:   relevant,
            selected: null,
            loading:  false,
            error:    relevant.length === 0
              ? `No logistics routes from ${g.wholesalerCity || 'this city'} to ${address.city} yet.`
              : '',
          }
        }))
      } catch {
        setGroupLogistics(prev => ({
          ...prev,
          [g.wholesalerId]: { routes: [], selected: null, loading: false, error: 'Failed to load logistics options' }
        }))
      }
    }))
  }

  const selectRoute = (wholesalerId, route) => {
    setGroupLogistics(prev => ({
      ...prev,
      [wholesalerId]: { ...prev[wholesalerId], selected: route }
    }))
  }

  const allGroupsHaveLogistics = () =>
    groupedCart.every(g => groupLogistics[g.wholesalerId]?.selected)

  // ── Place all orders via /orders/multi ───────────────────────────────────────
  const placeOrders = async () => {
    setError('')
    setPlacing(true)
    try {
      const groups = groupedCart.map(g => {
        const logistics = groupLogistics[g.wholesalerId]
        const selected  = logistics?.selected
        return {
          wholesalerId:     g.wholesalerId,
          items:            g.items.map(i => ({
            product:  i._id,
            quantity: i.quantity,
            price:    i.price,
            name:     i.name,
          })),
          logisticsRoute:   selected?._id    || null,
          logisticsCompany: selected?.logisticsCompany?._id || null,
          deliveryFee:      selected?.pricePerDelivery || 0,
        }
      })

      await api.post('/orders/multi', { groups, deliveryAddress: address })
      clearCart()
      navigate('/orders')
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to place orders')
    } finally {
      setPlacing(false)
    }
  }

  // ── Totals ───────────────────────────────────────────────────────────────────
  const grandTotal = useMemo(() => {
    const deliveryTotal = groupedCart.reduce((sum, g) => {
      const fee = groupLogistics[g.wholesalerId]?.selected?.pricePerDelivery || 0
      return sum + fee
    }, 0)
    return total + deliveryTotal
  }, [groupedCart, groupLogistics, total])

  const steps = ['Cart Review', 'Delivery Address', 'Choose Logistics', 'Confirm Order']

  return (
    <div style={S.page}>
      <Navbar />
      <div style={S.body}>

        {/* Step indicator */}
        <div style={S.stepBar}>
          {steps.map((label, i) => (
            <div key={i} style={S.stepItem}>
              <div style={{
                ...S.stepDot,
                background: i + 1 <= step ? 'linear-gradient(135deg,#1a3a6b,#00c853)' : '#e0e0e0',
                color:      i + 1 <= step ? '#fff' : '#aaa',
              }}>
                {i + 1 < step ? '✓' : i + 1}
              </div>
              <span style={{ ...S.stepLabel, color: i + 1 === step ? '#0d2347' : '#aaa' }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {error && <div style={S.error}>{error}</div>}

        {/* ── Step 1 — Cart Review (grouped by wholesaler) ── */}
        {step === 1 && (
          <div>
            <h2 style={S.title}>Review Your Cart</h2>
            <p style={S.sub}>
              {groupedCart.length > 1
                ? `Your cart has items from ${groupedCart.length} wholesalers — separate orders will be placed for each.`
                : 'Review your items below.'}
            </p>

            {groupedCart.map(g => (
              <div key={g.wholesalerId} style={S.wholesalerSection}>
                <div style={S.wholesalerHeader}>
                  <span style={S.wholesalerIcon}>🏪</span>
                  <div>
                    <p style={S.wholesalerName}>{g.wholesalerName}</p>
                    {g.wholesalerCity && <p style={S.wholesalerCity}>📍 {g.wholesalerCity}</p>}
                  </div>
                </div>
                {g.items.map(item => (
                  <div key={item._id} style={S.itemRow}>
                    <span style={S.itemName}>{item.name} × {item.quantity}</span>
                    <span style={S.itemPrice}>MWK {Number(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
                <div style={S.groupSubtotal}>
                  <span style={S.groupSubtotalLabel}>Subtotal</span>
                  <span style={S.groupSubtotalValue}>
                    MWK {Number(g.items.reduce((s, i) => s + i.price * i.quantity, 0)).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}

            <div style={S.totalRow}>
              <span>Products total</span>
              <span style={{ fontWeight: '700', color: '#1a3a6b' }}>MWK {Number(total).toLocaleString()}</span>
            </div>

            {groupedCart.length > 1 && (
              <div style={S.splitBadge}>
                ✂️ This checkout will create {groupedCart.length} separate orders
              </div>
            )}

            <button style={S.nextBtn} onClick={() => setStep(2)}>
              Next: Delivery Address →
            </button>
          </div>
        )}

        {/* ── Step 2 — Delivery Address ── */}
        {step === 2 && (
          <div>
            <h2 style={S.title}>Delivery Address</h2>
            <p style={S.sub}>One address — all orders deliver here.</p>
            <input style={S.input} placeholder="Street address *" value={address.street}
              onChange={e => setAddress({ ...address, street: e.target.value })} />
            <input style={S.input} placeholder="City *" value={address.city}
              onChange={e => setAddress({ ...address, city: e.target.value })} />
            <input style={S.input} placeholder="State / Region" value={address.state}
              onChange={e => setAddress({ ...address, state: e.target.value })} />
            <input style={S.input} placeholder="Country" value={address.country}
              onChange={e => setAddress({ ...address, country: e.target.value })} />
            <div style={S.btnRow}>
              <button style={S.backBtn} onClick={() => setStep(1)}>← Back</button>
              <button style={{ ...S.nextBtn, flex: 1, marginTop: 0 }}
                onClick={fetchAllRoutes}>
                Find Logistics →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3 — Logistics per wholesaler group ── */}
        {step === 3 && (
          <div>
            <h2 style={S.title}>Choose Logistics</h2>
            <p style={S.sub}>Each wholesaler needs its own delivery route.</p>

            {groupedCart.map((g, idx) => {
              const gl = groupLogistics[g.wholesalerId] || {}
              return (
                <div key={g.wholesalerId} style={S.wholesalerSection}>
                  <div style={S.wholesalerHeader}>
                    <span style={S.wholesalerIcon}>🏪</span>
                    <div>
                      <p style={S.wholesalerName}>{g.wholesalerName}</p>
                      {g.wholesalerCity && (
                        <p style={S.wholesalerCity}>
                          📍 {g.wholesalerCity} → {address.city}
                        </p>
                      )}
                    </div>
                    {gl.selected && (
                      <span style={S.groupSelectedBadge}>✓ Selected</span>
                    )}
                  </div>

                  {gl.loading && <p style={S.loadingText}>Searching routes…</p>}
                  {gl.error   && <p style={S.groupError}>{gl.error}</p>}

                  {!gl.loading && !gl.error && gl.routes?.map(route => (
                    <div
                      key={route._id}
                      style={{
                        ...S.routeCard,
                        border:     gl.selected?._id === route._id ? '2px solid #1a3a6b' : '2px solid #e0e0e0',
                        background: gl.selected?._id === route._id ? '#f0f4ff' : '#fff',
                      }}
                      onClick={() => selectRoute(g.wholesalerId, route)}
                    >
                      <div style={S.routeTop}>
                        <span style={S.routeName}>{route.logisticsCompany?.name}</span>
                        <span style={S.routePrice}>MWK {Number(route.pricePerDelivery).toLocaleString()}</span>
                      </div>
                      <p style={S.routeSub}>
                        {route.originCity} → {route.destinationCity} · {route.estimatedDays} day{route.estimatedDays > 1 ? 's' : ''}
                      </p>
                      {gl.selected?._id === route._id && (
                        <p style={S.selectedLabel}>✓ Selected</p>
                      )}
                    </div>
                  ))}
                </div>
              )
            })}

            <div style={S.btnRow}>
              <button style={S.backBtn} onClick={() => setStep(2)}>← Back</button>
              <button
                style={{ ...S.nextBtn, flex: 1, marginTop: 0, opacity: allGroupsHaveLogistics() ? 1 : 0.5 }}
                onClick={() => {
                  if (!allGroupsHaveLogistics()) return setError('Please select a logistics option for every wholesaler')
                  setError('')
                  setStep(4)
                }}
              >
                Next: Confirm →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4 — Confirm ── */}
        {step === 4 && (
          <div>
            <h2 style={S.title}>Confirm Orders</h2>
            {groupedCart.length > 1 && (
              <p style={S.sub}>{groupedCart.length} separate orders will be placed.</p>
            )}

            {groupedCart.map((g, idx) => {
              const selected     = groupLogistics[g.wholesalerId]?.selected
              const productTotal = g.items.reduce((s, i) => s + i.price * i.quantity, 0)
              const deliveryFee  = selected?.pricePerDelivery || 0
              return (
                <div key={g.wholesalerId} style={S.confirmCard}>
                  <div style={S.confirmCardHeader}>
                    <span style={S.confirmOrderLabel}>Order {idx + 1}</span>
                    <span style={S.confirmWholesalerName}>{g.wholesalerName}</span>
                  </div>

                  <p style={S.confirmSection}>Items</p>
                  {g.items.map(item => (
                    <div key={item._id} style={S.itemRow}>
                      <span style={S.itemName}>{item.name} × {item.quantity}</span>
                      <span style={S.itemPrice}>MWK {Number(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}

                  <p style={S.confirmSection}>Logistics</p>
                  <p style={S.confirmText}>{selected?.logisticsCompany?.name}</p>
                  <p style={S.confirmText}>
                    {selected?.originCity} → {selected?.destinationCity} · {selected?.estimatedDays} day{selected?.estimatedDays > 1 ? 's' : ''}
                  </p>

                  <div style={S.miniTotals}>
                    <div style={S.miniRow}>
                      <span>Products</span>
                      <span>MWK {Number(productTotal).toLocaleString()}</span>
                    </div>
                    <div style={S.miniRow}>
                      <span>Delivery</span>
                      <span>MWK {Number(deliveryFee).toLocaleString()}</span>
                    </div>
                    <div style={{ ...S.miniRow, ...S.miniTotal }}>
                      <span>Order total</span>
                      <span>MWK {Number(productTotal + deliveryFee).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Delivery address summary */}
            <div style={S.confirmAddressCard}>
              <p style={S.confirmSection}>Delivery Address</p>
              <p style={S.confirmText}>{address.street}, {address.city}{address.state ? `, ${address.state}` : ''}, {address.country}</p>
            </div>

            {/* Grand total */}
            <div style={S.grandTotalCard}>
              <div style={S.grandTotalRow}>
                <span style={S.grandTotalLabel}>Grand Total</span>
                <span style={S.grandTotalValue}>MWK {Number(grandTotal).toLocaleString()}</span>
              </div>
              {groupedCart.length > 1 && (
                <p style={S.grandTotalSub}>
                  Across {groupedCart.length} orders
                </p>
              )}
            </div>

            <div style={S.btnRow}>
              <button style={S.backBtn} onClick={() => setStep(3)}>← Back</button>
              <button
                style={{ ...S.nextBtn, flex: 1, marginTop: 0, opacity: placing ? 0.7 : 1 }}
                onClick={placeOrders}
                disabled={placing}
              >
                {placing ? 'Placing orders…' : `✓ Place ${groupedCart.length > 1 ? `${groupedCart.length} Orders` : 'Order'}`}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

const S = {
  page:                { background: '#f0f0f0', minHeight: '100vh' },
  body:                { maxWidth: '430px', margin: '0 auto', padding: '16px' },

  // Step bar
  stepBar:             { display: 'flex', justifyContent: 'space-between', marginBottom: '24px', background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  stepItem:            { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1 },
  stepDot:             { width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700' },
  stepLabel:           { fontSize: '10px', fontWeight: '600', textAlign: 'center' },

  // Shared
  error:               { background: '#fff0f0', border: '1px solid #ffcccc', color: '#cc0000', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '12px' },
  title:               { fontSize: '18px', fontWeight: '700', color: '#0d2347', margin: '0 0 6px' },
  sub:                 { fontSize: '13px', color: '#666', margin: '0 0 16px' },
  input:               { width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e0e0e0', fontSize: '14px', marginBottom: '10px', boxSizing: 'border-box', outline: 'none' },
  itemRow:             { display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f5f5f5', fontSize: '13px', color: '#444' },
  itemName:            { color: '#444' },
  itemPrice:           { fontWeight: '600', color: '#0d2347' },
  nextBtn:             { width: '100%', padding: '13px', background: 'linear-gradient(135deg,#1a3a6b,#00c853)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginTop: '16px' },
  backBtn:             { padding: '13px 20px', background: '#f5f5f5', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginTop: '16px', whiteSpace: 'nowrap' },
  btnRow:              { display: 'flex', gap: '10px', alignItems: 'flex-end', marginTop: '16px' },

  // Wholesaler group sections
  wholesalerSection:   { background: '#fff', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  wholesalerHeader:    { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' },
  wholesalerIcon:      { fontSize: '22px' },
  wholesalerName:      { fontWeight: '700', color: '#0d2347', fontSize: '14px', margin: 0 },
  wholesalerCity:      { fontSize: '11px', color: '#888', margin: '2px 0 0' },
  groupSubtotal:       { display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', marginTop: '4px', borderTop: '1px solid #f0f0f0' },
  groupSubtotalLabel:  { fontSize: '12px', color: '#888', fontWeight: '600' },
  groupSubtotalValue:  { fontSize: '13px', color: '#1a3a6b', fontWeight: '700' },
  groupSelectedBadge:  { marginLeft: 'auto', fontSize: '11px', color: '#00c853', fontWeight: '700', background: '#e8fdf0', padding: '3px 8px', borderRadius: '20px' },

  // Totals on step 1
  totalRow:            { display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: '15px' },
  splitBadge:          { background: '#fff9e6', border: '1px solid #f59e0b', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#92680a', marginBottom: '4px' },

  // Logistics
  loadingText:         { fontSize: '13px', color: '#aaa', padding: '8px 0' },
  groupError:          { fontSize: '13px', color: '#cc0000', padding: '8px 0' },
  routeCard:           { borderRadius: '10px', padding: '12px 14px', marginBottom: '8px', cursor: 'pointer' },
  routeTop:            { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  routeName:           { fontWeight: '700', color: '#0d2347', fontSize: '14px' },
  routePrice:          { fontWeight: '700', color: '#1a3a6b', fontSize: '14px' },
  routeSub:            { fontSize: '12px', color: '#888', margin: '4px 0 0' },
  selectedLabel:       { fontSize: '12px', color: '#00c853', fontWeight: '700', margin: '6px 0 0' },

  // Confirm step
  confirmCard:         { background: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  confirmCardHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #f0f0f0' },
  confirmOrderLabel:   { fontSize: '11px', fontWeight: '700', color: '#aaa', textTransform: 'uppercase' },
  confirmWholesalerName: { fontSize: '13px', fontWeight: '700', color: '#0d2347' },
  confirmSection:      { fontSize: '11px', fontWeight: '700', color: '#aaa', textTransform: 'uppercase', margin: '10px 0 6px' },
  confirmText:         { fontSize: '13px', color: '#444', margin: '2px 0' },
  miniTotals:          { marginTop: '10px', borderTop: '1px solid #f0f0f0', paddingTop: '8px' },
  miniRow:             { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#666', padding: '3px 0' },
  miniTotal:           { fontWeight: '700', color: '#0d2347', fontSize: '14px', borderTop: '1px solid #f0f0f0', marginTop: '4px', paddingTop: '6px' },
  confirmAddressCard:  { background: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  grandTotalCard:      { background: 'linear-gradient(135deg,#1a3a6b,#00c853)', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px' },
  grandTotalRow:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  grandTotalLabel:     { color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: '600' },
  grandTotalValue:     { color: '#fff', fontSize: '20px', fontWeight: '700' },
  grandTotalSub:       { color: 'rgba(255,255,255,0.7)', fontSize: '11px', margin: '4px 0 0', textAlign: 'right' },
}