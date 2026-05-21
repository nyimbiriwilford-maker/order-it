import { useState, useEffect } from 'react'
import { useNavigate }         from 'react-router-dom'
import { useAuth }             from '../../context/AuthContext'
import { usePrefs }            from '../../context/PreferencesContext'
import Navbar                  from '../../components/Navbar'
import api                     from '../../utils/api'

const LANGUAGES = [
  { code: 'en',  label: 'English'  },
  { code: 'ny',  label: 'Chichewa' },
  { code: 'tum', label: 'Tumbuka'  },
  { code: 'sw',  label: 'Swahili'  },
  { code: 'fr',  label: 'French'   },
]

const CURRENCIES = [
  { code: 'MWK', label: 'MWK – Malawian Kwacha'   },
  { code: 'USD', label: 'USD – US Dollar'          },
  { code: 'ZAR', label: 'ZAR – South African Rand' },
]

const ROLE_LABELS = {
  retailer:   'Retailer',
  wholesaler: 'Wholesaler',
  logistics:  'Logistics',
  admin:      'Administrator',
}

function initials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
}

function Icon({ d, size = 14, color = 'var(--text-primary)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      <path d={d} />
    </svg>
  )
}

function Section({ title, iconD, children }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: '14px',
      marginBottom: '12px',
      overflow: 'hidden',
      border: '1px solid var(--border-subtle)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '7px',
        padding: '12px 16px 10px',
        borderBottom: '1px solid var(--section-hd-border)',
      }}>
        <Icon d={iconD} size={13} color="#1a3a6b" />
        <span style={{
          fontSize: '11px', fontWeight: '700',
          color: 'var(--text-primary)',
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          {title}
        </span>
      </div>
      <div>{children}</div>
    </div>
  )
}

function Row({ label, sub, children, border = true }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px', gap: '12px', minHeight: '50px',
      borderBottom: border ? '1px solid var(--border-subtle)' : 'none',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500' }}>
          {label}
        </span>
        {sub && (
          <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
            {sub}
          </span>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: '44px', height: '24px', borderRadius: '50px',
        background: value ? '#00c853' : '#d1d5db',
        position: 'relative', cursor: 'pointer',
        transition: 'background .2s', flexShrink: 0,
      }}
    >
      <div style={{
        width: '18px', height: '18px', borderRadius: '50%',
        background: '#fff', position: 'absolute', top: '3px',
        left: value ? '23px' : '3px',
        transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  )
}

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth()
  const { theme, setTheme, language, setLanguage, currency, setCurrency } = usePrefs()
  const navigate = useNavigate()

  const [name,         setName]         = useState(user?.name         || '')
  const [phone,        setPhone]        = useState(user?.phone        || '')
  const [businessName, setBusinessName] = useState(user?.businessName || '')
  const [address,      setAddress]      = useState(user?.address      || '')
  const [city,         setCity]         = useState(user?.city         || '')
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [saveError,    setSaveError]    = useState('')

  const [notifOrders, setNotifOrders] = useState(() => localStorage.getItem('oi_notif_orders') !== 'false')
  const [notifPromo,  setNotifPromo]  = useState(() => localStorage.getItem('oi_notif_promo')  !== 'false')
  const [notifStock,  setNotifStock]  = useState(() => localStorage.getItem('oi_notif_stock')  !== 'false')

  const [showPwForm, setShowPwForm] = useState(false)
  const [curPw,      setCurPw]      = useState('')
  const [newPw,      setNewPw]      = useState('')
  const [confirmPw,  setConfirmPw]  = useState('')
  const [pwSaving,   setPwSaving]   = useState(false)
  const [pwMsg,      setPwMsg]      = useState('')
  const [pwIsError,  setPwIsError]  = useState(false)
  const [showLogout, setShowLogout] = useState(false)

  useEffect(() => {
    api.get('/profile').then(({ data }) => {
      setName(data.name             || '')
      setPhone(data.phone           || '')
      setBusinessName(data.businessName || '')
      setAddress(data.address       || '')
      setCity(data.city             || '')
    }).catch(() => {})
  }, [])

  useEffect(() => { localStorage.setItem('oi_notif_orders', notifOrders) }, [notifOrders])
  useEffect(() => { localStorage.setItem('oi_notif_promo',  notifPromo)  }, [notifPromo])
  useEffect(() => { localStorage.setItem('oi_notif_stock',  notifStock)  }, [notifStock])

  const saveProfile = async () => {
    if (!name.trim()) return setSaveError('Name is required')
    setSaving(true); setSaved(false); setSaveError('')
    try {
      const { data } = await api.put('/profile', { name: name.trim(), phone, businessName, address, city })
      updateUser(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setSaveError(e.response?.data?.msg || 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const savePassword = async () => {
    if (!curPw)              { setPwIsError(true); return setPwMsg('Enter your current password') }
    if (newPw.length < 6)   { setPwIsError(true); return setPwMsg('New password must be at least 6 characters') }
    if (newPw !== confirmPw) { setPwIsError(true); return setPwMsg('Passwords do not match') }
    setPwSaving(true); setPwMsg(''); setPwIsError(false)
    try {
      await api.put('/profile/password', { currentPassword: curPw, newPassword: newPw })
      setPwIsError(false); setPwMsg('Password updated successfully')
      setCurPw(''); setNewPw(''); setConfirmPw('')
      setTimeout(() => { setPwMsg(''); setShowPwForm(false) }, 2000)
    } catch (e) {
      setPwIsError(true)
      setPwMsg(e.response?.data?.msg || 'Incorrect current password')
    } finally {
      setPwSaving(false)
    }
  }

  const ICONS = {
    person: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
    sun:    'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z',
    moon:   'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z',
    globe:  'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    bell:   'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    logout: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  }

  const showBusiness = user?.role === 'wholesaler' || user?.role === 'retailer'

  // ── field + button styles use CSS vars so they flip with theme ────────────
  const inputStyle = {
    width: '100%', padding: '11px 13px', borderRadius: '8px',
    border: '1.5px solid var(--border)',
    fontSize: '14px', color: 'var(--text-primary)',
    background: 'var(--bg-input)',
    boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
    transition: 'background 0.25s, color 0.25s, border-color 0.25s',
  }

  const selectStyle = {
    padding: '7px 10px', borderRadius: '8px',
    border: '1.5px solid var(--border)',
    fontSize: '13px', color: 'var(--text-primary)',
    background: 'var(--bg-input)',
    outline: 'none', cursor: 'pointer', maxWidth: '165px',
    transition: 'background 0.25s, color 0.25s',
  }

  const themeBtnStyle = (active) => ({
    display: 'flex', alignItems: 'center', gap: '4px',
    padding: '6px 11px', borderRadius: '7px',
    border: active ? '1.5px solid #1a3a6b' : '1.5px solid var(--border)',
    background: active ? '#e8f0fe' : 'var(--bg-input)',
    color: active ? '#1a3a6b' : 'var(--text-muted)',
    fontSize: '12px', fontWeight: '500',
    cursor: 'pointer', fontFamily: 'inherit',
    transition: 'all 0.15s',
  })

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ maxWidth: '430px', margin: '0 auto', padding: '16px 14px 48px' }}>

        {/* Hero card */}
        <div style={{
          background: 'var(--bg-hero)', borderRadius: '16px',
          padding: '20px 18px', display: 'flex', alignItems: 'center',
          gap: '16px', marginBottom: '14px',
        }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'linear-gradient(135deg,#00c853,#0d5c2e)',
            border: '2.5px solid rgba(255,255,255,0.25)',
            color: '#fff', fontSize: '20px', fontWeight: '700',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, letterSpacing: '1px',
          }}>
            {initials(name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: '#fff', fontWeight: '700', fontSize: '17px', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {name || 'Your Name'}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: '0 0 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email}
            </p>
            <span style={{
              background: 'rgba(0,200,83,0.18)', color: '#00c853',
              fontSize: '10px', fontWeight: '700', padding: '2px 10px',
              borderRadius: '99px', border: '1px solid rgba(0,200,83,0.3)',
              letterSpacing: '0.5px', textTransform: 'uppercase', display: 'inline-block',
            }}>
              {ROLE_LABELS[user?.role] || 'User'}
            </span>
          </div>
        </div>

        {/* Personal details */}
        <Section title="Personal details" iconD={ICONS.person}>
          {[
            { label: 'Full name *',    val: name,         set: setName,         ph: 'Your full name',          show: true },
            { label: 'Phone number',   val: phone,        set: setPhone,        ph: '+265 xxx xxx xxx',         show: true },
            { label: 'Business name',  val: businessName, set: setBusinessName, ph: 'Your business or shop name', show: showBusiness },
            { label: 'Address',        val: address,      set: setAddress,      ph: 'Street / area',            show: true },
            { label: 'City',           val: city,         set: setCity,         ph: 'e.g. Lilongwe',            show: true },
          ].filter(f => f.show).map((f, i, arr) => (
            <div key={f.label} style={{ padding: i === arr.length - 1 ? '8px 16px 14px' : '8px 16px 0' }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {f.label}
              </label>
              <input style={inputStyle} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} />
              {f.label === 'City' && user?.role === 'wholesaler' && (
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '5px 0 0', lineHeight: '1.4' }}>
                  Updating your city also updates it on all your product listings.
                </p>
              )}
            </div>
          ))}
          {saveError && <p style={{ fontSize: '12px', color: '#e53935', margin: '0', padding: '0 16px 4px' }}>{saveError}</p>}
          <div style={{ padding: '4px 16px 14px' }}>
            <button
              style={{
                width: '100%', padding: '12px', border: 'none', borderRadius: '10px',
                fontWeight: '700', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit',
                color: '#fff', opacity: saving ? 0.7 : 1,
                background: saved ? '#00c853' : 'linear-gradient(135deg,#1a3a6b,#00c853)',
                transition: 'background 0.3s',
              }}
              onClick={saveProfile} disabled={saving}
            >
              {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save changes'}
            </button>
          </div>
        </Section>

        {/* Appearance */}
        <Section title="Appearance" iconD={ICONS.sun}>
          <Row label="Theme" sub="Applies immediately across the app" border={false}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[
                { val: 'light', label: 'Light', iconD: ICONS.sun  },
                { val: 'dark',  label: 'Dark',  iconD: ICONS.moon },
                { val: 'system',label: 'Auto',  iconD: null       },
              ].map(t => (
                <button key={t.val} style={themeBtnStyle(theme === t.val)} onClick={() => setTheme(t.val)}>
                  {t.iconD && <Icon d={t.iconD} size={12} color={theme === t.val ? '#1a3a6b' : 'var(--text-muted)'} />}
                  {t.label}
                </button>
              ))}
            </div>
          </Row>
        </Section>

        {/* Language & region */}
        <Section title="Language & region" iconD={ICONS.globe}>
          <Row label="Language" sub="Display language for the app">
            <select style={selectStyle} value={language} onChange={e => setLanguage(e.target.value)}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </Row>
          <Row label="Currency" sub="How prices are displayed throughout the app" border={false}>
            <select style={selectStyle} value={currency} onChange={e => setCurrency(e.target.value)}>
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </Row>
        </Section>

        {/* Notifications */}
        <Section title="Notifications" iconD={ICONS.bell}>
          <Row label="Order updates" sub="Confirmations, dispatch and delivery">
            <Toggle value={notifOrders} onChange={setNotifOrders} />
          </Row>
          <Row label="Promotions" sub="Deals and special offers from wholesalers">
            <Toggle value={notifPromo} onChange={setNotifPromo} />
          </Row>
          <Row
            label="Low stock alerts"
            sub={user?.role === 'wholesaler' ? 'When your product stock drops below threshold' : 'When a saved product is running low'}
            border={false}
          >
            <Toggle value={notifStock} onChange={setNotifStock} />
          </Row>
        </Section>

        {/* Security */}
        <Section title="Security" iconD={ICONS.shield}>
          <Row label="Email address" sub="Used for login — cannot be changed here">
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
            </span>
          </Row>
          {!showPwForm ? (
            <Row label="Password" sub="Change your account password" border={false}>
              <button
                style={{ padding: '6px 14px', background: 'var(--bg-subtle)', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: '600', color: '#1a3a6b', cursor: 'pointer', fontFamily: 'inherit' }}
                onClick={() => setShowPwForm(true)}
              >
                Change
              </button>
            </Row>
          ) : (
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '4px' }}>
              {[
                { label: 'Current password', val: curPw,     set: setCurPw,     ph: 'Enter current password'  },
                { label: 'New password',      val: newPw,     set: setNewPw,     ph: 'At least 6 characters'   },
                { label: 'Confirm password',  val: confirmPw, set: setConfirmPw, ph: 'Repeat new password'      },
              ].map((f, i, arr) => (
                <div key={f.label} style={{ padding: i === arr.length - 1 ? '8px 16px 10px' : '8px 16px 0' }}>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {f.label}
                  </label>
                  <input style={inputStyle} type="password" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} />
                </div>
              ))}
              {pwMsg && (
                <p style={{ fontSize: '12px', color: pwIsError ? '#e53935' : '#00c853', margin: '0', padding: '0 16px 4px' }}>
                  {pwMsg}
                </p>
              )}
              <div style={{ display: 'flex', gap: '8px', padding: '4px 16px 14px' }}>
                <button
                  style={{ padding: '11px 18px', background: 'var(--bg-subtle)', border: 'none', borderRadius: '10px', fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit' }}
                  onClick={() => { setShowPwForm(false); setPwMsg(''); setCurPw(''); setNewPw(''); setConfirmPw('') }}
                >
                  Cancel
                </button>
                <button
                  style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg,#1a3a6b,#00c853)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', opacity: pwSaving ? 0.7 : 1 }}
                  onClick={savePassword} disabled={pwSaving}
                >
                  {pwSaving ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </div>
          )}
        </Section>

        {/* Account */}
        <Section title="Account" iconD={ICONS.logout}>
          {!showLogout ? (
            <Row label="Sign out" sub="Log out of your account on this device" border={false}>
              <button
                style={{ padding: '6px 14px', background: '#fff0f0', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: '600', color: '#e53935', cursor: 'pointer', fontFamily: 'inherit' }}
                onClick={() => setShowLogout(true)}
              >
                Sign out
              </button>
            </Row>
          ) : (
            <div style={{ padding: '14px 16px' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500', margin: '0 0 12px' }}>
                Are you sure you want to sign out?
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  style={{ flex: 1, padding: '11px', background: 'var(--bg-subtle)', border: 'none', borderRadius: '10px', fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit' }}
                  onClick={() => setShowLogout(false)}
                >
                  Cancel
                </button>
                <button
                  style={{ flex: 1, padding: '11px', background: '#e53935', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '13px', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
                  onClick={() => { logout(); navigate('/login') }}
                >
                  Yes, sign out
                </button>
              </div>
            </div>
          )}
        </Section>

        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
          Order It • v1.0.0
        </p>

      </div>
    </div>
  )
}