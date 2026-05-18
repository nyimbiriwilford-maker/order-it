import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import api from '../../utils/api'

export default function RateDelivery() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const [order,    setOrder]    = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [done,     setDone]     = useState(false)
  const [rating,   setRating]   = useState(0)
  const [hover,    setHover]    = useState(0)
  const [comment,  setComment]  = useState('')

  useEffect(() => {
    api.get('/orders/mine')
      .then(r => {
        const found = r.data.find(o => o._id === id)
        if (found) setOrder(found)
        else setError('Order not found')
      })
      .catch(() => setError('Failed to load order'))
      .finally(() => setLoading(false))
  }, [id])

  const submit = async () => {
    if (rating === 0) return setError('Please select a star rating')
    setError('')
    setSaving(true)
    try {
      await api.post('/logistics/ratings', { orderId: id, rating, comment })
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to submit rating')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={S.page}><Navbar /><p style={S.empty}>Loading…</p></div>

  if (done) return (
    <div style={S.page}>
      <Navbar />
      <div style={S.body}>
        <div style={S.successCard}>
          <p style={{ fontSize: '56px', margin: '0 0 16px' }}>⭐</p>
          <h2 style={{ color: '#0d2347', margin: '0 0 8px' }}>Thank you!</h2>
          <p style={{ color: '#888', margin: '0 0 24px', fontSize: '14px' }}>Your rating has been submitted.</p>
          <button style={S.doneBtn} onClick={() => navigate('/orders')}>Back to Orders</button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={S.page}>
      <Navbar />
      <div style={S.body}>
        <button style={S.backBtn} onClick={() => navigate(`/orders/${id}`)}>← Back</button>

        <div style={S.card}>
          <h1 style={S.title}>Rate Your Delivery</h1>

          {order?.logisticsCompany && (
            <div style={S.companyBox}>
              <p style={S.companyLabel}>Delivered by</p>
              <p style={S.companyName}>🚚 {order.logisticsCompany.name}</p>
            </div>
          )}

          <p style={S.starLabel}>How was your delivery experience?</p>

          {/* Stars */}
          <div style={S.stars}>
            {[1, 2, 3, 4, 5].map(star => (
              <span
                key={star}
                style={{
                  ...S.star,
                  color: star <= (hover || rating) ? '#f59e0b' : '#e0e0e0',
                }}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
              >
                ★
              </span>
            ))}
          </div>

          {rating > 0 && (
            <p style={S.ratingText}>
              {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]} — {rating}/5
            </p>
          )}

          <textarea
            style={S.textarea}
            placeholder="Leave a comment (optional)…"
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={4}
          />

          {error && <div style={S.error}>{error}</div>}

          <button
            style={{ ...S.submitBtn, opacity: saving ? 0.7 : 1 }}
            onClick={submit}
            disabled={saving}
          >
            {saving ? 'Submitting…' : 'Submit Rating'}
          </button>
        </div>
      </div>
    </div>
  )
}

const S = {
  page:         { background: '#f0f0f0', minHeight: '100vh' },
  body:         { maxWidth: '430px', margin: '0 auto', padding: '16px' },
  backBtn:      { background: 'none', border: 'none', color: '#1a3a6b', fontWeight: '600', cursor: 'pointer', fontSize: '14px', padding: '0 0 16px', display: 'block' },
  card:         { background: '#fff', borderRadius: '16px', padding: '24px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  title:        { fontSize: '20px', fontWeight: '700', color: '#0d2347', margin: '0 0 20px', textAlign: 'center' },
  companyBox:   { background: '#f5f8ff', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', textAlign: 'center' },
  companyLabel: { fontSize: '11px', color: '#aaa', textTransform: 'uppercase', margin: '0 0 4px' },
  companyName:  { fontSize: '15px', fontWeight: '700', color: '#1a3a6b', margin: 0 },
  starLabel:    { fontSize: '14px', color: '#555', textAlign: 'center', margin: '0 0 16px' },
  stars:        { display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '12px' },
  star:         { fontSize: '48px', cursor: 'pointer', transition: 'color 0.1s', userSelect: 'none' },
  ratingText:   { textAlign: 'center', fontSize: '14px', fontWeight: '700', color: '#f59e0b', margin: '0 0 20px' },
  textarea:     { width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e0e0e0', fontSize: '14px', boxSizing: 'border-box', outline: 'none', resize: 'none', fontFamily: 'inherit', marginBottom: '12px' },
  error:        { background: '#fff0f0', border: '1px solid #ffcccc', color: '#cc0000', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '12px' },
  submitBtn:    { width: '100%', padding: '14px', background: 'linear-gradient(135deg,#1a3a6b,#00c853)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' },
  successCard:  { background: '#fff', borderRadius: '16px', padding: '60px 20px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  doneBtn:      { background: 'linear-gradient(135deg,#1a3a6b,#00c853)', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 32px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' },
  empty:        { textAlign: 'center', color: '#999', padding: '40px' },
}