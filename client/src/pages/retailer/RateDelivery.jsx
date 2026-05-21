import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import { usePrefs } from '../../context/PreferencesContext'
import api from '../../utils/api'

export default function RateDelivery() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const { t }     = usePrefs()

  const [order,   setOrder]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [done,    setDone]    = useState(false)
  const [rating,  setRating]  = useState(0)
  const [hover,   setHover]   = useState(0)
  const [comment, setComment] = useState('')

  useEffect(() => {
    api.get('/orders/mine')
      .then(r => {
        const found = r.data.find(o => o._id === id)
        if (found) setOrder(found)
        else setError(t('Order not found'))
      })
      .catch(() => setError(t('Failed to load order')))
      .finally(() => setLoading(false))
  }, [id])

  const submit = async () => {
    if (rating === 0) return setError(t('Please select a star rating'))
    setError('')
    setSaving(true)
    try {
      await api.post('/logistics/ratings', { orderId: id, rating, comment })
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.msg || t('Failed to submit rating'))
    } finally {
      setSaving(false)
    }
  }

  const RATING_LABELS = ['', t('Poor'), t('Fair'), t('Good'), t('Very Good'), t('Excellent')]

  if (loading) return <div style={S.page}><Navbar /><p style={S.empty}>{t('Loading…')}</p></div>

  if (done) return (
    <div style={S.page}>
      <Navbar />
      <div style={S.body}>
        <div style={S.successCard}>
          <p style={{ fontSize: '56px', margin: '0 0 16px' }}>⭐</p>
          <h2 style={{ color: 'var(--text-primary)', margin: '0 0 8px' }}>{t('Thank you!')}</h2>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 24px', fontSize: '14px' }}>{t('Your rating has been submitted.')}</p>
          <button style={S.doneBtn} onClick={() => navigate('/orders')}>{t('Back to Orders')}</button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={S.page}>
      <Navbar />
      <div style={S.body}>
        <button style={S.backBtn} onClick={() => navigate(`/orders/${id}`)}>← {t('Back')}</button>

        <div style={S.card}>
          <h1 style={S.title}>{t('Rate Your Delivery')}</h1>

          {order?.logisticsCompany && (
            <div style={S.companyBox}>
              <p style={S.companyLabel}>{t('Delivered by')}</p>
              <p style={S.companyName}>🚚 {order.logisticsCompany.name}</p>
            </div>
          )}

          <p style={S.starLabel}>{t('How was your delivery experience?')}</p>

          <div style={S.stars}>
            {[1, 2, 3, 4, 5].map(star => (
              <span
                key={star}
                style={{ ...S.star, color: star <= (hover || rating) ? '#f59e0b' : 'var(--bg-subtle)' }}
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
              {RATING_LABELS[rating]} — {rating}/5
            </p>
          )}

          <textarea
            style={S.textarea}
            placeholder={t('Leave a comment (optional)…')}
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
            {saving ? t('Submitting…') : t('Submit Rating')}
          </button>
        </div>
      </div>
    </div>
  )
}

const S = {
  page:        { background: 'var(--bg-page)', minHeight: '100vh' },
  body:        { maxWidth: '430px', margin: '0 auto', padding: '16px' },
  backBtn:     { background: 'none', border: 'none', color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer', fontSize: '14px', padding: '0 0 16px', display: 'block' },
  card:        { background: 'var(--bg-card)', borderRadius: '16px', padding: '24px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  title:       { fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 20px', textAlign: 'center' },
  companyBox:  { background: 'var(--bg-subtle)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', textAlign: 'center' },
  companyLabel:{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px' },
  companyName: { fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 },
  starLabel:   { fontSize: '14px', color: 'var(--text-secondary)', textAlign: 'center', margin: '0 0 16px' },
  stars:       { display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '12px' },
  star:        { fontSize: '48px', cursor: 'pointer', transition: 'color 0.1s', userSelect: 'none' },
  ratingText:  { textAlign: 'center', fontSize: '14px', fontWeight: '700', color: '#f59e0b', margin: '0 0 20px' },
  textarea:    { width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px', boxSizing: 'border-box', outline: 'none', resize: 'none', fontFamily: 'inherit', marginBottom: '12px', background: 'var(--bg-input)', color: 'var(--text-primary)' },
  error:       { background: '#fff0f0', border: '1px solid #ffcccc', color: '#cc0000', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '12px' },
  submitBtn:   { width: '100%', padding: '14px', background: 'linear-gradient(135deg,#1a3a6b,#00c853)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' },
  successCard: { background: 'var(--bg-card)', borderRadius: '16px', padding: '60px 20px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  doneBtn:     { background: 'linear-gradient(135deg,#1a3a6b,#00c853)', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 32px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' },
  empty:       { textAlign: 'center', color: 'var(--text-muted)', padding: '40px' },
}