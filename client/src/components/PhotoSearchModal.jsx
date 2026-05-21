import { useState, useRef } from 'react'

export default function PhotoSearchModal({ onClose, onResults }) {
  const [preview,  setPreview]  = useState(null)   // base64 data URL
  const [file,     setFile]     = useState(null)   // File object
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const fileInput  = useRef()
  const cameraInput = useRef()

  const handleFile = (f) => {
    if (!f) return
    if (f.size > 5 * 1024 * 1024) {
      setError('Image is too large. Please use a photo under 5 MB.')
      return
    }
    setError('')
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target.result)
    reader.readAsDataURL(f)
  }

  const handleSearch = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('image', file)

      const token = localStorage.getItem('token')
      const res   = await fetch('/api/visual-search', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    form,
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.msg || 'Search failed. Please try again.')
        setLoading(false)
        return
      }

      onResults(data)   // pass result up to Home.jsx
      onClose()
    } catch {
      setError('Could not connect. Check your internet and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.sheet}>

        {/* Header */}
        <div style={S.header}>
          <span style={S.title}>📷 Search by Photo</span>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>
        <p style={S.hint}>Take or upload a photo of any product to find it in the catalogue.</p>

        {/* Photo preview */}
        {preview ? (
          <div style={S.previewWrap}>
            <img src={preview} alt="preview" style={S.preview} />
            {loading && (
              <div style={S.analysing}>
                <span style={S.spinner}>⏳</span>
                <span>Analysing your photo…</span>
              </div>
            )}
            {!loading && (
              <button style={S.retakeBtn} onClick={() => { setPreview(null); setFile(null) }}>
                ✕ Remove
              </button>
            )}
          </div>
        ) : (
          <div style={S.buttonRow}>
            {/* Camera — opens device rear camera on mobile */}
            <button style={S.photoBtn} onClick={() => cameraInput.current.click()}>
              <span style={S.btnIcon}>📷</span>
              <span>Take Photo</span>
            </button>
            <input
              ref={cameraInput}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])}
            />

            {/* File picker */}
            <button style={S.photoBtn} onClick={() => fileInput.current.click()}>
              <span style={S.btnIcon}>🖼️</span>
              <span>Upload Image</span>
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])}
            />
          </div>
        )}

        {/* Error */}
        {error && <p style={S.error}>{error}</p>}

        {/* Search button */}
        {preview && !loading && (
          <button style={S.searchBtn} onClick={handleSearch}>
            🔍 Search for this product
          </button>
        )}
      </div>
    </div>
  )
}

const S = {
  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  sheet:      { background: '#fff', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: '430px', padding: '20px 16px 32px', boxShadow: '0 -4px 24px rgba(0,0,0,0.15)' },
  header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' },
  title:      { fontWeight: '700', fontSize: '16px', color: '#0d2347' },
  closeBtn:   { background: '#f0f0f0', border: 'none', borderRadius: '50%', width: '28px', height: '28px', fontSize: '12px', cursor: 'pointer', color: '#555' },
  hint:       { fontSize: '12px', color: '#999', margin: '0 0 16px' },
  buttonRow:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' },
  photoBtn:   { background: '#f5f7fa', border: '1.5px dashed #1a3a6b', borderRadius: '12px', padding: '20px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#1a3a6b' },
  btnIcon:    { fontSize: '28px' },
  previewWrap:{ position: 'relative', marginBottom: '16px', borderRadius: '12px', overflow: 'hidden' },
  preview:    { width: '100%', height: '200px', objectFit: 'cover', display: 'block', borderRadius: '12px' },
  analysing:  { position: 'absolute', inset: 0, background: 'rgba(26,58,107,0.75)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#fff', fontWeight: '700', fontSize: '14px', borderRadius: '12px' },
  spinner:    { fontSize: '28px', animation: 'spin 1s linear infinite' },
  retakeBtn:  { position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '20px', color: '#fff', fontSize: '12px', padding: '4px 10px', cursor: 'pointer' },
  searchBtn:  { width: '100%', padding: '14px', background: 'linear-gradient(135deg,#1a3a6b,#00c853)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' },
  error:      { color: '#e53935', fontSize: '12px', margin: '0 0 12px', textAlign: 'center' },
}