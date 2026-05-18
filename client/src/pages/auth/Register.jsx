import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../utils/api'
import logo from '../../assets/logo_clean.png'

export default function Register() {
  const { login } = useAuth()
  const [form, setForm]       = useState({ name: '', email: '', password: '', role: 'retailer', businessName: '', phone: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', form)
      login(data.token, data.user)
    } catch (err) {
      setError(err.response?.data?.msg || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={S.page}>
      <div style={S.card}>

        {/* Logo only — image already contains "order .it" text */}
        <div style={S.logoWrap}>
          <img src={logo} alt="order.it" style={S.logoImg} />
        </div>

        <h2 style={S.title}>Create account</h2>
        <p style={S.sub}>Join Order It today</p>

        {error && <div style={S.error}>{error}</div>}

        <input style={S.input} name="name"         placeholder="Full name"                    value={form.name}         onChange={handle} />
        <input style={S.input} name="email"         type="email" placeholder="Email address"  value={form.email}        onChange={handle} />
        <input style={S.input} name="password"      type="password" placeholder="Password"    value={form.password}     onChange={handle} />
        <input style={S.input} name="businessName"  placeholder="Business name (optional)"    value={form.businessName} onChange={handle} />
        <input style={S.input} name="phone"         placeholder="Phone number (optional)"     value={form.phone}        onChange={handle} />

        <select style={S.input} name="role" value={form.role} onChange={handle}>
          <option value="retailer">Retailer — I want to buy</option>
          <option value="wholesaler">Wholesaler — I want to sell</option>
          <option value="logistics">Logistics — I deliver goods</option>
        </select>

        <button style={{ ...S.btn, opacity: loading ? 0.7 : 1 }} onClick={submit} disabled={loading}>
          {loading ? 'Creating account…' : 'Create Account'}
        </button>

        <p style={S.foot}>
          Already have an account? <Link to="/login" style={S.link}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}

const S = {
  page:     { minHeight: '100vh', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  card:     { background: '#fff', borderRadius: '16px', padding: '40px 32px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
  // White card background → multiply makes the logo's white pill disappear cleanly
  logoWrap: { display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '28px' },
  logoImg:  { width: '180px', height: 'auto', objectFit: 'contain', mixBlendMode: 'multiply' },
  title:    { fontSize: '22px', fontWeight: '700', color: '#0d2347', margin: '0 0 6px', textAlign: 'center' },
  sub:      { fontSize: '14px', color: '#999', margin: '0 0 24px', textAlign: 'center' },
  error:    { background: '#fff0f0', border: '1px solid #ffcccc', color: '#cc0000', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px' },
  input:    { width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e0e0e0', fontSize: '14px', marginBottom: '12px', boxSizing: 'border-box', outline: 'none' },
  btn:      { width: '100%', padding: '13px', background: 'linear-gradient(135deg, #1a3a6b, #00c853)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' },
  foot:     { textAlign: 'center', fontSize: '13px', color: '#999', marginTop: '20px' },
  link:     { color: '#1a3a6b', fontWeight: '600', textDecoration: 'none' },
}