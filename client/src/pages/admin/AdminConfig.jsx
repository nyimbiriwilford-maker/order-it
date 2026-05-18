// client/src/pages/admin/AdminConfig.jsx
// Replace your existing file entirely.
//
// Fixes vs previous version:
//   1. vat_percent gets its own slider + live preview
//   2. auto_confirm_days renamed to auto_confirm_hours (matches backend)
//   3. Confirmation modal before saving platform_fee_percent or vat_percent
//   4. Change history panel per config card (last 20 changes from DB)
//   5. Impact calculator — shows projected annual commission at current rate

import { useEffect, useState, useRef } from 'react'
import api from '../../utils/api'
import { Sidebar } from './Dashboard'

// ── Design tokens — match Dashboard.jsx exactly ───────────────────────────────
const NAVY   = '#1a3a6b'
const GREEN  = '#00c853'
const BORDER = '#e0e0e0'

const S = {
  page:         { minHeight: '100vh', background: '#f0f0f0', fontFamily: 'Arial, sans-serif' },
  main:         { marginLeft: '220px', padding: '28px 32px', minHeight: '100vh' },
  topBar:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' },
  pageTitle:    { fontSize: '22px', fontWeight: 'bold', color: NAVY },
  pageSubtitle: { fontSize: '13px', color: '#888', marginTop: '2px' },
  adminBadge:   { background: NAVY, color: '#fff', padding: '6px 14px', borderRadius: '20px', fontSize: '13px' },
  sectionTitle: {
    fontSize: '15px', fontWeight: 'bold', color: NAVY,
    marginBottom: '16px', paddingBottom: '8px',
    borderBottom: `2px solid #e8e8e8`,
  },
  spinner:      { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#888', fontSize: '14px' },

  // KPI cards
  kpiGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' },
  kpiCard: (accent) => ({
    background: '#fff', borderRadius: '12px', padding: '20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderTop: `3px solid ${accent}`,
  }),
  kpiValue: { fontSize: '24px', fontWeight: 'bold', color: NAVY },
  kpiLabel: { fontSize: '12px', color: '#888', marginTop: '4px' },
  kpiSub:   { fontSize: '11px', color: GREEN, marginTop: '6px', fontWeight: '600' },

  // Period pills
  periodRow: { display: 'flex', gap: '8px', marginBottom: '20px', alignItems: 'center' },
  periodBtn: (a) => ({
    padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
    cursor: 'pointer', border: 'none',
    background: a ? NAVY : '#fff', color: a ? '#fff' : '#888',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  }),

  // Chart
  chartCard:  { background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: '28px' },
  chartTitle: { fontSize: '14px', fontWeight: 'bold', color: NAVY, marginBottom: '16px' },
  chartBars:  { display: 'flex', alignItems: 'flex-end', gap: '8px', height: '120px' },
  barWrap:    { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
  barLabel:   { fontSize: '10px', color: '#888' },
  barValLbl:  { fontSize: '10px', color: NAVY, fontWeight: '600' },

  // Config grid
  configGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' },
  configCard: (editing) => ({
    background: '#fff', borderRadius: '12px', padding: '22px',
    boxShadow: editing ? `0 0 0 2px ${NAVY}` : '0 1px 4px rgba(0,0,0,0.07)',
    transition: 'box-shadow 0.2s',
  }),
  configLabel:   { fontSize: '13px', fontWeight: 'bold', color: NAVY, marginBottom: '4px' },
  configDesc:    { fontSize: '12px', color: '#888', marginBottom: '14px', lineHeight: '1.6' },
  configCurrent: { fontSize: '26px', fontWeight: 'bold', color: NAVY, marginBottom: '10px' },
  configUnit:    { fontSize: '14px', color: '#888', fontWeight: 'normal', marginLeft: '4px' },
  preview:       { background: '#f5f8ff', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#555', marginBottom: '12px', lineHeight: '1.7', borderLeft: `3px solid ${NAVY}` },
  sliderWrap:    { marginBottom: '12px' },
  sliderTrack:   { width: '100%', accentColor: GREEN, cursor: 'pointer' },
  sliderRow:     { display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#aaa', marginTop: '4px' },
  inputRow:      { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' },
  input: {
    flex: 1, padding: '8px 12px', border: `1px solid ${BORDER}`,
    borderRadius: '8px', fontSize: '14px', outline: 'none',
    color: NAVY,
  },
  btnRow:   { display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' },
  btnSave: {
    padding: '8px 20px', background: NAVY, color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600',
  },
  btnSaving: {
    padding: '8px 20px', background: '#aaa', color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'not-allowed', fontWeight: '600',
  },
  btnCancel: {
    padding: '8px 14px', background: '#fff', color: '#888',
    border: `1px solid ${BORDER}`, borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
  },
  savedPill: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    background: '#e8f5e9', color: GREEN,
    fontSize: '11px', fontWeight: '600', padding: '3px 10px',
    borderRadius: '10px', marginLeft: '8px',
  },
  historyToggle: {
    fontSize: '11px', color: '#aaa', cursor: 'pointer',
    textDecoration: 'underline', background: 'none', border: 'none', padding: 0, marginLeft: 'auto',
  },

  // History panel
  historyPanel: {
    marginTop: '14px', borderTop: `1px solid #f0f0f0`, paddingTop: '12px',
  },
  historyRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '6px 0', borderBottom: `0.5px solid #f8f8f8`, fontSize: '12px',
  },

  // Confirmation modal overlay
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500,
  },
  modal: {
    background: '#fff', borderRadius: '14px', padding: '28px 32px',
    width: '420px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  },
  modalTitle:  { fontSize: '16px', fontWeight: 'bold', color: NAVY, marginBottom: '10px' },
  modalBody:   { fontSize: '13px', color: '#555', lineHeight: '1.7', marginBottom: '20px' },
  modalBtnRow: { display: 'flex', gap: '10px', justifyContent: 'flex-end' },
  btnConfirm: {
    padding: '9px 22px', background: '#e53935', color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600',
  },
  btnModalCancel: {
    padding: '9px 18px', background: '#fff', color: '#666',
    border: `1px solid ${BORDER}`, borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
  },

  // Toast
  toast: (ok) => ({
    position: 'fixed', bottom: '24px', right: '24px',
    background: ok ? '#1b5e20' : '#b71c1c',
    color: '#fff', padding: '12px 20px', borderRadius: '10px',
    fontSize: '13px', fontWeight: '600', zIndex: 999,
    boxShadow: '0 4px 16px rgba(0,0,0,0.2)', transition: 'opacity 0.3s',
  }),
}

// ── Config metadata — slider/number, range, unit, live preview ────────────────
const CONFIG_META = {
  platform_fee_percent: {
    type: 'slider', min: 0, max: 20, step: 0.5, unit: '%',
    critical: true,  // requires confirmation modal
    preview: (v, extra) => {
      const sample = 500_000
      const fee    = Math.round(sample * v / 100)
      const ws     = sample - fee
      const annual = extra?.annualGMV ? Math.round(extra.annualGMV * v / 100) : null
      return [
        `On a MWK ${sample.toLocaleString()} order:`,
        `  • Platform earns MWK ${fee.toLocaleString()}`,
        `  • Wholesaler receives MWK ${ws.toLocaleString()}`,
        annual ? `  • Projected annual commission at current GMV: MWK ${annual.toLocaleString()}` : '',
      ].filter(Boolean).join('\n')
    },
  },
  vat_percent: {
    type: 'slider', min: 0, max: 40, step: 0.5, unit: '%',
    critical: true,
    preview: (v) => {
      const gross = 400_000
      const vat   = Math.round(gross * v / 100)
      const net   = gross - vat
      return [
        `On a MWK ${gross.toLocaleString()} wholesaler gross:`,
        `  • VAT withheld: MWK ${vat.toLocaleString()}`,
        `  • Wholesaler receives: MWK ${net.toLocaleString()}`,
        `  • Platform remits VAT to tax authority`,
      ].join('\n')
    },
  },
  auto_confirm_hours: {
    type: 'slider', min: 1, max: 720, step: 1, unit: 'hrs',
    critical: false,
    preview: (v) => {
      const days  = (v / 24).toFixed(1)
      return `Orders marked "delivered" auto-confirm after ${v} hour${v !== 1 ? 's' : ''} (${days} days) with no retailer action, releasing escrow automatically.`
    },
  },
  min_order_amount: {
    type: 'number', unit: 'MWK',
    critical: false,
    preview: (v) => v > 0
      ? `Retailers cannot place orders below MWK ${Number(v).toLocaleString()}.`
      : 'No minimum order amount — any order total is accepted.',
  },
  stock_alert_threshold: {
    type: 'number', unit: 'units',
    critical: false,
    preview: (v) => `Wholesalers receive a low-stock alert when any product's stock drops to ${v} unit${v !== 1 ? 's' : ''} or fewer.`,
  },
  max_items_per_order: {
    type: 'number', unit: 'items',
    critical: false,
    preview: (v) => `A single order can contain at most ${v} distinct product line${v !== 1 ? 's' : ''}.`,
  },
}

const MWK = (n) => 'MWK ' + Math.round(Number(n) || 0).toLocaleString('en-MW')
const fmt  = (n) => Math.round(Number(n) || 0).toLocaleString('en-MW')

// ── Revenue bar chart ─────────────────────────────────────────────────────────
function RevenueChart({ monthly }) {
  if (!monthly?.length) return null
  const max = Math.max(...monthly.map(m => m.fees), 1)
  return (
    <div style={S.chartCard}>
      <div style={S.chartTitle}>Monthly Platform Commission — last 6 months</div>
      <div style={S.chartBars}>
        {monthly.map((m, i) => {
          const pct = (m.fees / max) * 100
          return (
            <div key={i} style={S.barWrap}>
              <div style={S.barValLbl}>
                {m.fees >= 1_000_000
                  ? (m.fees / 1_000_000).toFixed(1) + 'M'
                  : m.fees >= 1000
                    ? (m.fees / 1000).toFixed(0) + 'K'
                    : m.fees}
              </div>
              <div style={{
                width: '100%',
                background: `linear-gradient(180deg, ${GREEN}, ${NAVY})`,
                borderRadius: '4px 4px 0 0',
                height: `${Math.max(pct, 3)}%`,
                minHeight: '4px',
                transition: 'height 0.4s ease',
              }} />
              <div style={S.barLabel}>{m.label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Confirmation modal ────────────────────────────────────────────────────────
function ConfirmModal({ config, oldVal, newVal, onConfirm, onCancel }) {
  const meta = CONFIG_META[config.key] || {}
  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.modalTitle}>⚠️ Confirm Change</div>
        <div style={S.modalBody}>
          You are changing <strong>{config.label}</strong> from{' '}
          <strong style={{ color: '#e53935' }}>{oldVal} {meta.unit}</strong> to{' '}
          <strong style={{ color: GREEN }}>{newVal} {meta.unit}</strong>.
          <br /><br />
          {config.key === 'platform_fee_percent' &&
            'This affects the commission charged on every new order placed from this moment. Existing orders in escrow are not changed.'}
          {config.key === 'vat_percent' &&
            'This affects VAT deducted from wholesaler payouts on all future escrow releases. Already-released payouts are not changed.'}
          <br /><br />
          Are you sure you want to proceed?
        </div>
        <div style={S.modalBtnRow}>
          <button style={S.btnModalCancel} onClick={onCancel}>Cancel</button>
          <button style={S.btnConfirm}     onClick={onConfirm}>Yes, apply change</button>
        </div>
      </div>
    </div>
  )
}

// ── Individual config card ────────────────────────────────────────────────────
function ConfigCard({ config, onSave, annualGMV }) {
  const meta     = CONFIG_META[config.key] || { type: 'number', unit: '', critical: false }
  const [draft,     setDraft]     = useState(config.value)
  const [editing,   setEditing]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [showHist,  setShowHist]  = useState(false)
  const [showModal, setShowModal] = useState(false)

  function handleChange(v) {
    setDraft(v)
    setEditing(Number(v) !== Number(config.value))
    setSaved(false)
  }

  async function doSave() {
    setSaving(true)
    setShowModal(false)
    try {
      await onSave(config.key, draft)
      setSaved(true)
      setEditing(false)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  function handleSaveClick() {
    if (meta.critical) {
      setShowModal(true)  // show confirmation first
    } else {
      doSave()
    }
  }

  function handleCancel() {
    setDraft(config.value)
    setEditing(false)
    setSaved(false)
  }

  const previewText = meta.preview ? meta.preview(parseFloat(draft), { annualGMV }) : null
  const history     = config.changeHistory ?? []

  return (
    <>
      {showModal && (
        <ConfirmModal
          config={config}
          oldVal={config.value}
          newVal={draft}
          onConfirm={doSave}
          onCancel={() => setShowModal(false)}
        />
      )}

      <div style={S.configCard(editing)}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div style={S.configLabel}>
            {config.label}
            {meta.critical && (
              <span style={{ fontSize: '10px', background: '#fff3e0', color: '#e65100', padding: '2px 7px', borderRadius: '8px', marginLeft: '8px', fontWeight: '600' }}>
                Critical
              </span>
            )}
            {saved && <span style={S.savedPill}>✓ Saved</span>}
          </div>
          <span style={{ fontSize: '11px', color: '#bbb' }}>
            Last updated: {config.updatedAt ? new Date(config.updatedAt).toLocaleDateString('en-GB') : 'never'}
          </span>
        </div>

        <div style={S.configDesc}>{config.description}</div>

        {/* Current value display */}
        <div style={S.configCurrent}>
          {draft}<span style={S.configUnit}>{meta.unit}</span>
        </div>

        {/* Live preview */}
        {previewText && (
          <pre style={{ ...S.preview, fontFamily: 'inherit', margin: 0, marginBottom: '12px', whiteSpace: 'pre-wrap' }}>
            {previewText}
          </pre>
        )}

        {/* Input — slider or number */}
        {meta.type === 'slider' ? (
          <div style={S.sliderWrap}>
            <input
              type="range"
              min={meta.min} max={meta.max} step={meta.step}
              value={draft}
              style={S.sliderTrack}
              onChange={e => handleChange(parseFloat(e.target.value))}
            />
            <div style={S.sliderRow}>
              <span>{meta.min}{meta.unit}</span>
              <span style={{ color: GREEN, fontWeight: '600' }}>{draft}{meta.unit}</span>
              <span>{meta.max}{meta.unit}</span>
            </div>
          </div>
        ) : (
          <div style={S.inputRow}>
            <input
              type="number"
              value={draft}
              style={S.input}
              onChange={e => handleChange(parseFloat(e.target.value) || 0)}
            />
            <span style={{ fontSize: '13px', color: '#888' }}>{meta.unit}</span>
          </div>
        )}

        {/* Action row */}
        <div style={S.btnRow}>
          <button
            style={saving ? S.btnSaving : S.btnSave}
            onClick={handleSaveClick}
            disabled={saving || !editing}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {editing && (
            <button style={S.btnCancel} onClick={handleCancel}>Cancel</button>
          )}
          {history.length > 0 && (
            <button style={S.historyToggle} onClick={() => setShowHist(h => !h)}>
              {showHist ? 'Hide' : `History (${history.length})`}
            </button>
          )}
        </div>

        {/* Change history */}
        {showHist && history.length > 0 && (
          <div style={S.historyPanel}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#888', marginBottom: '6px' }}>
              Change History (newest first)
            </div>
            {[...history].reverse().map((h, i) => (
              <div key={i} style={S.historyRow}>
                <span style={{ color: '#888' }}>
                  {new Date(h.changedAt).toLocaleDateString('en-GB')}{' '}
                  {new Date(h.changedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span>
                  <span style={{ color: '#e53935', fontWeight: '600' }}>{h.oldValue}{meta.unit}</span>
                  {' → '}
                  <span style={{ color: GREEN, fontWeight: '600' }}>{h.newValue}{meta.unit}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminConfig() {
  const [configs,    setConfigs]    = useState([])
  const [revenue,    setRevenue]    = useState(null)
  const [period,     setPeriod]     = useState('month')
  const [loading,    setLoading]    = useState(true)
  const [loadingRev, setLoadingRev] = useState(true)
  const [toast,      setToast]      = useState(null)  // { msg, ok }

  useEffect(() => { loadConfigs() }, [])
  useEffect(() => { loadRevenue()  }, [period])

  async function loadConfigs() {
    setLoading(true)
    try {
      const { data } = await api.get('/config')
      // Sort: critical ones first, then alphabetical
      const order = ['platform_fee_percent', 'vat_percent', 'auto_confirm_hours', 'min_order_amount', 'stock_alert_threshold', 'max_items_per_order']
      data.sort((a, b) => {
        const ai = order.indexOf(a.key)
        const bi = order.indexOf(b.key)
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
      })
      setConfigs(data)
    } catch {
      showToast('Failed to load configuration', false)
    } finally {
      setLoading(false)
    }
  }

  async function loadRevenue() {
    setLoadingRev(true)
    try {
      const { data } = await api.get(`/config/revenue/summary?period=${period}`)
      setRevenue(data)
    } catch (err) {
      console.error('Revenue load error:', err)
    } finally {
      setLoadingRev(false)
    }
  }

  async function handleSave(key, value) {
    const { data } = await api.put(`/config/${key}`, { value })
    // Update local state so history + value re-render immediately
    setConfigs(prev => prev.map(c => c.key === key ? data : c))
    showToast(`${data.label} updated successfully`, true)
    // Refresh revenue KPIs if fee rate changed
    if (key === 'platform_fee_percent') loadRevenue()
  }

  function showToast(msg, ok) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const PERIODS = [
    { key: 'today', label: 'Today'     },
    { key: 'week',  label: '7 Days'    },
    { key: 'month', label: '30 Days'   },
    { key: 'year',  label: '12 Months' },
    { key: 'all',   label: 'All Time'  },
  ]

  const feePercent  = configs.find(c => c.key === 'platform_fee_percent')?.value ?? 0
  const vatPercent  = configs.find(c => c.key === 'vat_percent')?.value            ?? 0
  // Estimate annual GMV from 12-month chart bars (for impact preview)
  const annualGMV   = revenue?.monthly?.reduce((s, m) => s + (m.fees / (feePercent / 100 || 1)), 0) ?? 0

  const KPI = revenue ? [
    {
      label: 'Commission This Period',
      value: MWK(revenue.periodFees),
      sub:   `from ${revenue.periodOrders} orders`,
      accent: GREEN,
    },
    {
      label: 'All-Time Commission',
      value: MWK(revenue.allTimeFees),
      sub:   'since platform launch',
      accent: NAVY,
    },
    {
      label: 'Current Fee Rate',
      value: `${feePercent}%`,
      sub:   'of each order\'s product total',
      accent: '#3b82f6',
    },
    {
      label: 'Avg Commission / Order',
      value: revenue.periodOrders > 0
        ? MWK(Math.round(revenue.periodFees / revenue.periodOrders))
        : 'MWK 0',
      sub:   'this period',
      accent: '#f59e0b',
    },
    {
      label: 'VAT Rate',
      value: `${vatPercent}%`,
      sub:   'withheld from wholesaler payout',
      accent: '#8b5cf6',
    },
  ] : []

  return (
    <div style={S.page}>
      <Sidebar active="/admin/config" />

      <div style={S.main}>

        {/* Top bar */}
        <div style={S.topBar}>
          <div>
            <div style={S.pageTitle}>⚙️ Configuration</div>
            <div style={S.pageSubtitle}>Platform fee rates, rules, and revenue tracker</div>
          </div>
          <div style={S.adminBadge}>Admin</div>
        </div>

        {loading ? (
          <div style={S.spinner}>Loading configuration…</div>
        ) : (
          <>
            {/* ── Revenue section ─────────────────────────────────────────── */}
            <div style={S.sectionTitle}>📈 Commission Overview</div>

            <div style={S.periodRow}>
              <span style={{ fontSize: '12px', color: '#888', marginRight: '4px' }}>Period:</span>
              {PERIODS.map(p => (
                <button key={p.key} style={S.periodBtn(period === p.key)}
                  onClick={() => setPeriod(p.key)}>
                  {p.label}
                </button>
              ))}
            </div>

            {loadingRev ? (
              <div style={{ ...S.spinner, height: '80px' }}>Loading revenue…</div>
            ) : (
              <>
                <div style={S.kpiGrid}>
                  {KPI.map(c => (
                    <div key={c.label} style={S.kpiCard(c.accent)}>
                      <div style={S.kpiValue}>{c.value}</div>
                      <div style={S.kpiLabel}>{c.label}</div>
                      <div style={S.kpiSub}>{c.sub}</div>
                    </div>
                  ))}
                </div>
                <RevenueChart monthly={revenue?.monthly} />
              </>
            )}

            {/* ── Settings section ────────────────────────────────────────── */}
            <div style={S.sectionTitle}>⚙️ Platform Settings</div>
            <div style={{ fontSize: '13px', color: '#888', marginBottom: '16px', marginTop: '-8px' }}>
              Changes to <strong>Critical</strong> settings require confirmation and are logged in the change history below each card.
            </div>

            <div style={S.configGrid}>
              {configs.map(c => (
                <ConfigCard
                  key={c.key}
                  config={c}
                  onSave={handleSave}
                  annualGMV={annualGMV}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={S.toast(toast.ok)}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}
    </div>
  )
}