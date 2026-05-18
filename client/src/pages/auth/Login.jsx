import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../utils/api'
import logo from '../../assets/logo_clean.png'

function useGoogleScript() {
  useEffect(() => {
    if (document.getElementById('google-gsi')) return
    const script = document.createElement('script')
    script.id = 'google-gsi'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.body.appendChild(script)
  }, [])
}

const ROLES = [
  { value: 'retailer',   label: '🏪 Retailer',  desc: 'Browse products & place orders' },
  { value: 'wholesaler', label: '🏭 Wholesaler', desc: 'List products & manage orders' },
  { value: 'logistics',  label: '🚚 Logistics',  desc: 'Collect & deliver orders' },
]

export default function Login() {
  const { login } = useAuth()
  useGoogleScript()

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [pendingProfile, setPendingProfile] = useState(null)
  const [selectedRole, setSelectedRole] = useState('')
  const [roleLoading, setRoleLoading] = useState(false)
  const [roleError, setRoleError] = useState('')
  const googleBtnRef = useRef(null)

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) return

    const init = () => {
      if (!window.google || !googleBtnRef.current) return
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredential,
      })
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: '100%',
        text: 'signin_with',
        shape: 'rectangular',
      })
    }

    if (window.google) {
      init()
    } else {
      const script = document.getElementById('google-gsi')
      script?.addEventListener('load', init)
      return () => script?.removeEventListener('load', init)
    }
  }, [])

  const handleGoogleCredential = async ({ credential }) => {
    setError('')
    setLoading(true)
    try {
      const { data, status } = await api.post('/auth/google', { credential })
      if (status === 202 && data.needsRole) {
        setPendingProfile({ ...data.profile, credential })
        setShowPicker(true)
      } else {
        login(data.token, data.user)
      }
    } catch (err) {
      setError(err.response?.data?.msg || 'Google sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  const confirmRole = async () => {
    if (!selectedRole) {
      setRoleError('Please select a role to continue')
      return
    }
    setRoleError('')
    setRoleLoading(true)
    try {
      const { data } = await api.post('/auth/google', {
        credential: pendingProfile.credential,
        role: selectedRole,
      })
      login(data.token, data.user)
    } catch (err) {
      setRoleError(err.response?.data?.msg || 'Failed to create account')
    } finally {
      setRoleLoading(false)
    }
  }

  const handle = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const submit = async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      login(data.token, data.user)
    } catch (err) {
      setError(err.response?.data?.msg || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        {/* Logo Header */}
        <div style={S.logoWrap}>
          <img src={logo} alt="order.it" style={S.logoImg} />
        </div>

        <div style={S.content}>
          <h2 style={S.title}>Welcome back</h2>
          <p style={S.sub}>Sign in to your account</p>

          {error && <div style={S.error}>{error}</div>}

          {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
            <>
              <div ref={googleBtnRef} style={S.googleWrap} />
              <div style={S.divider}>
                <span style={S.dividerLine} />
                <span style={S.dividerText}>or sign in with email</span>
                <span style={S.dividerLine} />
              </div>
            </>
          )}

          <input
            style={S.input}
            name="email"
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={handle}
          />
          <input
            style={S.input}
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handle}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />

          <button
            style={{ ...S.btn, opacity: loading ? 0.85 : 1 }}
            onClick={submit}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p style={S.foot}>
            Don't have an account?{' '}
            <Link to="/register" style={S.link}>
              Register
            </Link>
          </p>
        </div>
      </div>

      {/* Role Selection Modal */}
      {showPicker && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.modalLogoWrap}>
              <img src={logo} alt="order.it" style={S.modalLogo} />
            </div>

            {pendingProfile?.avatar && (
              <img
                src={pendingProfile.avatar}
                alt="avatar"
                style={S.avatar}
              />
            )}

            <h2 style={S.modalTitle}>One last step</h2>
            <p style={S.modalSub}>
              Hi <strong>{pendingProfile?.name}</strong>, how will you use Order It?
            </p>

            {roleError && <div style={S.error}>{roleError}</div>}

            <div style={S.roleGrid}>
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  style={{
                    ...S.roleCard,
                    ...(selectedRole === r.value ? S.roleCardActive : {}),
                  }}
                  onClick={() => setSelectedRole(r.value)}
                >
                  <span style={S.roleEmoji}>{r.label.split(' ')[0]}</span>
                  <span style={S.roleLabel}>
                    {r.label.split(' ').slice(1).join(' ')}
                  </span>
                  <span style={S.roleDesc}>{r.desc}</span>
                </button>
              ))}
            </div>

            <button
              style={{ ...S.btn, marginTop: '24px', opacity: roleLoading ? 0.85 : 1 }}
              onClick={confirmRole}
              disabled={roleLoading}
            >
              {roleLoading ? 'Creating account...' : 'Continue'}
            </button>

            <button
              style={S.cancelBtn}
              onClick={() => {
                setShowPicker(false)
                setPendingProfile(null)
                setSelectedRole('')
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f8f9fc 0%, #eef1f8 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  },

  card: {
    background: '#fff',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.09)',
    overflow: 'hidden',
    border: '1px solid #f0f0f0',
  },

  logoWrap: {
    background: '#ffffff',
    padding: '48px 40px 32px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottom: '1px solid #f4f4f5',
  },
  logoImg: {
    width: '195px',
    height: 'auto',
    objectFit: 'contain',
  },

  content: {
    padding: '0 40px 40px',
  },

  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    margin: '0 0 8px',
  },
  sub: {
    fontSize: '15px',
    color: '#64748b',
    textAlign: 'center',
    margin: '0 0 32px',
  },

  error: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#ef4444',
    borderRadius: '10px',
    padding: '12px 16px',
    fontSize: '14px',
    marginBottom: '20px',
  },

  input: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1.5px solid #e2e8f0',
    fontSize: '15px',
    marginBottom: '16px',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease',
    outline: 'none',
  },

  btn: {
    width: '100%',
    padding: '15px',
    background: 'linear-gradient(135deg, #1e40af 0%, #22c55e 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '8px',
  },

  foot: {
    textAlign: 'center',
    fontSize: '14px',
    color: '#64748b',
    marginTop: '28px',
  },
  link: {
    color: '#1e40af',
    fontWeight: '600',
    textDecoration: 'none',
  },

  googleWrap: {
    width: '100%',
    marginBottom: '20px',
  },

  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '24px 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: '#e2e8f0',
  },
  dividerText: {
    fontSize: '13px',
    color: '#94a3b8',
    whiteSpace: 'nowrap',
  },

  // Modal Styles
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    overflow: 'hidden',
    textAlign: 'center',
  },
  modalLogoWrap: {
    background: '#ffffff',
    padding: '40px 32px 24px',
    display: 'flex',
    justifyContent: 'center',
    borderBottom: '1px solid #f4f4f5',
  },
  modalLogo: {
    width: '160px',
    height: 'auto',
    objectFit: 'contain',
  },
  avatar: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    margin: '16px auto 8px',
    border: '3px solid #f0f0f0',
  },
  modalTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '12px 0 6px',
  },
  modalSub: {
    fontSize: '15px',
    color: '#64748b',
    marginBottom: '24px',
  },
  roleGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '0 28px',
  },
  roleCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '16px 18px',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    background: '#fafafa',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s ease',
  },
  roleCardActive: {
    borderColor: '#1e40af',
    background: '#f0f7ff',
  },
  roleEmoji: {
    fontSize: '26px',
    marginBottom: '6px',
  },
  roleLabel: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#0f172a',
  },
  roleDesc: {
    fontSize: '13px',
    color: '#64748b',
    marginTop: '4px',
  },
  cancelBtn: {
    marginTop: '16px',
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: '14px',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
}