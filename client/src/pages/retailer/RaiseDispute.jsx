import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../utils/api'

const REASONS = [
  { value: 'not_received', label: 'Order not received' },
  { value: 'damaged',      label: 'Items arrived damaged' },
  { value: 'wrong_items',  label: 'Wrong items delivered' },
  { value: 'other',        label: 'Other' },
]

const S = {
  page: {
    minHeight: '100vh', background: '#f0f0f0',
    fontFamily: 'Arial, sans-serif',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '32px 16px',
  },
  card: {
    background: '#fff', borderRadius: '16px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    padding: '36px 32px', width: '100%', maxWidth: '520px',
  },
  back: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    color: '#888', fontSize: '13px', cursor: 'pointer',
    marginBottom: '20px', background: 'none', border: 'none', padding: 0,
  },
  title:    { fontSize: '22px', fontWeight: 'bold', color: '#1a3a6b', marginBottom: '4px' },
  subtitle: { fontSize: '13px', color: '#888', marginBottom: '28px' },
  orderBox: {
    background: '#f0f4ff', borderRadius: '10px',
    padding: '14px 16px', marginBottom: '24px',
  },
  orderLabel: { fontSize: '11px', color: '#1a3a6b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' },
  orderValue: { fontSize: '14px', color: '#222', fontWeight: '600' },
  orderMeta:  { fontSize: '12px', color: '#888', marginTop: '2px' },
  field:    { marginBottom: '18px' },
  label:    { display: 'block', fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '6px' },
  select: {
    width: '100%', padding: '10px 12px', border: '1px solid #ddd',
    borderRadius: '8px', fontSize: '14px', background: '#fff',
    cursor: 'pointer', outline: 'none', boxSizing: 'border-box',
  },
  textarea: {
    width: '100%', padding: '10px 12px', border: '1px solid #ddd',
    borderRadius: '8px', fontSize: '14px', resize: 'vertical',
    minHeight: '120px', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'Arial, sans-serif', lineHeight: '1.5',
  },
  charCount: { fontSize: '11px', color: '#aaa', textAlign: 'right', marginTop: '4px' },
  warning: {
    background: '#fff8e1', border: '1px solid #ffe082',
    borderRadius: '8px', padding: '12px 14px',
    fontSize: '13px', color: '#7a5c00', marginBottom: '20px',
    lineHeight: '1.5',
  },
  submitBtn: {
    width: '100%', padding: '13px', background: '#e53935', color: '#fff',
    border: 'none', borderRadius: '10px', fontSize: '15px',
    fontWeight: '700', cursor: 'pointer', marginTop: '4px',
  },
  submitBtnDisabled: {
    width: '100%', padding: '13px', background: '#ccc', color: '#fff',
    border: 'none', borderRadius: '10px', fontSize: '15px',
    fontWeight: '700', cursor: 'not-allowed', marginTop: '4px',
  },
  error: {
    background: '#fce4ec', border: '1px solid #f48fb1',
    borderRadius: '8px', padding: '10px 14px',
    fontSize: '13px', color: '#b71c1c', marginBottom: '16px',
  },
  success: {
    background: '#e8f5e9', border: '1px solid #a5d6a7',
    borderRadius: '8px', padding: '10px 14px',
    fontSize: '13px', color: '#1b5e20', marginBottom: '16px',
  },
  spinner: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '200px', color: '#888', fontSize: '14px',
  },
}

function formatMWK(v) {
  return 'MWK ' + Number(v || 0).toLocaleString()
}

export default function RaiseDispute() {
  const { id }     = useParams()   // order id from URL
  const navigate   = useNavigate()

  const [order,       setOrder]       = useState(null)
  const [loadingOrder,setLoadingOrder]= useState(true)
  const [reason,      setReason]      = useState('')
  const [description, setDescription] = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState('')
  const [success,     setSuccess]     = useState(false)

  useEffect(() => {
    async function loadOrder() {
      try {
        const res = await api.get(`/orders/${id}`)
        setOrder(res.data)
      } catch {
        setError('Could not load order details.')
      } finally {
        setLoadingOrder(false)
      }
    }
    loadOrder()
  }, [id])

  async function handleSubmit() {
    setError('')
    if (!reason)           return setError('Please select a reason.')
    if (description.trim().length < 20)
      return setError('Please describe the issue in at least 20 characters.')

    setSubmitting(true)
    try {
      await api.post('/disputes', {
        orderId: id,
        reason,
        description: description.trim(),
      })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to raise dispute. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingOrder) return <div style={S.page}><div style={S.spinner}>Loading order…</div></div>

  if (success) {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚖️</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a3a6b', marginBottom: '8px' }}>
              Dispute Raised
            </div>
            <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.6', marginBottom: '28px' }}>
              Your dispute has been submitted. Our admin team will review it and contact you with a resolution.
            </div>
            <button
              style={{ padding: '11px 28px', background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
              onClick={() => navigate('/orders')}
            >
              Back to My Orders
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={S.page}>
      <div style={S.card}>

        <button style={S.back} onClick={() => navigate(`/orders/${id}`)}>
          ← Back to order
        </button>

        <div style={S.title}>Raise a Dispute</div>
        <div style={S.subtitle}>Tell us what went wrong with your order</div>

        {/* Order summary */}
        {order && (
          <div style={S.orderBox}>
            <div style={S.orderLabel}>Order</div>
            <div style={S.orderValue}>#{String(order._id).slice(-8).toUpperCase()}</div>
            <div style={S.orderMeta}>
              {formatMWK(order.totalAmount)} ·{' '}
              {order.items?.length} item{order.items?.length !== 1 ? 's' : ''} ·{' '}
              Status: <strong>{order.orderStatus}</strong>
            </div>
          </div>
        )}

        {error && <div style={S.error}>{error}</div>}

        <div style={S.warning}>
          ⚠ Disputes are reviewed by our admin team. Please only raise a dispute if you have a genuine issue. False disputes may result in account suspension.
        </div>

        {/* Reason */}
        <div style={S.field}>
          <label style={S.label}>What is the issue?</label>
          <select style={S.select} value={reason} onChange={e => setReason(e.target.value)}>
            <option value="">— Select a reason —</option>
            {REASONS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div style={S.field}>
          <label style={S.label}>Describe the problem</label>
          <textarea
            style={S.textarea}
            placeholder="Explain what happened in detail. Include dates, what you expected, and what actually happened…"
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={1000}
          />
          <div style={S.charCount}>{description.length} / 1000</div>
        </div>

        <button
          style={submitting || !reason || description.trim().length < 20 ? S.submitBtnDisabled : S.submitBtn}
          onClick={handleSubmit}
          disabled={submitting || !reason || description.trim().length < 20}
        >
          {submitting ? 'Submitting…' : 'Submit Dispute'}
        </button>

      </div>
    </div>
  )
}