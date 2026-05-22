/**
 * BillingHub.jsx — LACentra
 *
 * FIX LOG:
 *   BUG-4: db.claimDenials → db.denials  (key mismatch caused denial KPI to always show 0)
 *   BUG-5: handleCSVImport now actually persists rows to Supabase via upsertClaim
 *   BUG-5: parseCSV replaced with xlsx-based RFC-4180 compliant parser
 *          (old naive split(',') broke on patient names like "Smith, John")
 *   MISC:  Added per-tab ErrorBoundary wrappers so a crash in one sub-tab
 *          does not white-screen the entire Billing section
 */

import { useState, Component } from 'react'
import { ClaimsPage }       from './ClaimsPage.jsx'
import { EligibilityPage }  from './EligibilityPage.jsx'
import { DenialLog }        from './DenialLog.jsx'
import { RevenueAnalytics } from './RevenueAnalytics.jsx'
import { upsertClaim }      from '../../lib/db.js'
// xlsx imported dynamically inside parseCSV() to keep it out of the SSR bundle

// ── Per-tab Error Boundary ───────────────────────────────────────────────────
// Prevents a crash in one sub-tab from white-screening the whole Billing section
class TabErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('[BillingHub TabErrorBoundary]', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px 24px', textAlign: 'center',
          background: 'var(--elevated)', borderRadius: 'var(--r-lg)',
          border: '1.5px solid var(--border)',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <h4 style={{ color: 'var(--text-1)', marginBottom: 8 }}>This section encountered an error</h4>
          <p style={{ color: 'var(--text-4)', fontSize: 13, marginBottom: 16 }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Sub-tab config ───────────────────────────────────────────────────────────
const TABS = [
  {
    id: 'claims',
    label: 'Claims',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
  },
  {
    id: 'eligibility',
    label: 'Eligibility',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  },
  {
    id: 'denials',
    label: 'Denial Log',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,
  },
  {
    id: 'revenue',
    label: 'Revenue Analytics',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  },
]

// ── SimplePractice column → internal key mapping ─────────────────────────────
const SP_MAP = {
  'Client Name': 'patient_name', 'Patient Name': 'patient_name',
  'Service Date': 'dos',         'Date of Service': 'dos',
  'Claim #': 'claim_num',        'Claim Number': 'claim_num',
  'Insurance': 'payer_name',     'Payer': 'payer_name',
  'Billed': 'billed_amount',     'Billed Amount': 'billed_amount', 'Charge': 'billed_amount',
  'Paid': 'paid_amount',         'Amount Paid': 'paid_amount',     'Payment': 'paid_amount',
  'Status': 'status',            'Claim Status': 'status',
  'CPT': 'cpt_codes',            'CPT Code': 'cpt_codes',          'Procedure Code': 'cpt_codes',
  'Provider': 'provider_name',   'Rendering Provider': 'provider_name',
  'Amount': 'amount',            'Revenue': 'amount',
  'Date': 'date',                'Payment Date': 'date',
  'Type': 'payment_type',        'Payment Type': 'payment_type',
}

/**
 * BUG-5 FIX: Replace naive split(',') parser with xlsx RFC-4180 compliant parser.
 * The old parser broke on any quoted field containing a comma (e.g. "Smith, John").
 * xlsx is dynamically imported (not at module top-level) so it stays out of the
 * Turbopack SSR bundle and avoids module-eval TDZ issues during next build.
 */
async function parseCSV(text) {
  try {
    const XLSX = (await import('xlsx')).default || await import('xlsx')
    const wb   = XLSX.read(text, { type: 'string', raw: false })
    const ws   = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
    return rows
      .map(row => {
        const mapped = {}
        Object.entries(row).forEach(([h, v]) => {
          const key    = SP_MAP[h] || h.toLowerCase().replace(/\s+/g, '_')
          mapped[key]  = String(v || '').trim()
        })
        return mapped
      })
      .filter(row => Object.values(row).some(v => v))
  } catch (err) {
    console.error('[parseCSV] Failed to parse CSV:', err)
    return []
  }
}

// ── CSV Import Drop Zone ─────────────────────────────────────────────────────
function CSVImportBanner({ onImport, target, importing }) {
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview]   = useState(null)
  const [rows, setRows]         = useState([])
  const [done, setDone]         = useState(false)

  function handleFile(file) {
    if (!file || !file.name.toLowerCase().endsWith('.csv')) return
    const reader = new FileReader()
    reader.onload = async e => {
      const parsed = await parseCSV(e.target.result)
      setRows(parsed)
      setPreview(parsed.slice(0, 3))
      setDone(false)
    }
    reader.readAsText(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  function handleImport() {
    if (onImport) onImport(rows, () => { setDone(true); setPreview(null); setRows([]) })
  }

  if (done) return (
    <div style={{ background: 'rgba(16,185,129,.07)', border: '1.5px solid rgba(16,185,129,.3)', borderRadius: 10, padding: '12px 16px', fontSize: 12.5, color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      ✓ CSV imported successfully! Records added to {target}.
      <button onClick={() => setDone(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#059669', fontSize: 11 }}>Import another ×</button>
    </div>
  )

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragging ? 'var(--pr)' : 'var(--border)'}`,
          borderRadius: 10, padding: '14px 18px',
          background: dragging ? 'var(--pr-l)' : 'var(--elevated)',
          display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
          transition: 'all .15s',
        }}
        onClick={() => document.getElementById(`csv-input-${target}`).click()}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={dragging ? 'var(--pr)' : 'var(--text-4)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: dragging ? 'var(--pr)' : 'var(--text-2)' }}>
            Drop SimplePractice CSV here or click to browse
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>
            Export from SimplePractice → Reports → Billing. Supports all SP export column formats.
          </div>
        </div>
        <input id={`csv-input-${target}`} type="file" accept=".csv" style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])} />
      </div>

      {preview && (
        <div style={{ marginTop: 10, background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', background: 'var(--elevated)', borderBottom: '1px solid var(--border-l)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>
              Preview — {rows.length} records found
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setPreview(null); setRows([]) }}
                style={{ fontSize: 11.5, color: 'var(--text-4)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleImport} className="btn btn-primary btn-sm" disabled={importing}>
                {importing ? <><span className="spinner" />Importing…</> : `Import ${rows.length} Records`}
              </button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ fontSize: 11.5, width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {Object.keys(preview[0] || {}).slice(0, 6).map(k => (
                    <th key={k} style={{ padding: '6px 12px', textAlign: 'left', borderBottom: '1px solid var(--border-l)', color: 'var(--text-4)', fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.04em' }}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-l)' }}>
                    {Object.values(row).slice(0, 6).map((v, j) => (
                      <td key={j} style={{ padding: '5px 12px', color: 'var(--text-2)' }}>{v || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 3 && (
            <div style={{ padding: '6px 14px', fontSize: 11, color: 'var(--text-4)', borderTop: '1px solid var(--border-l)' }}>
              +{rows.length - 3} more rows not shown in preview
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── BillingHub ───────────────────────────────────────────────────────────────
export function BillingHub({ db, toast, requestConfirm, onDraftAppeal }) {
  const [activeTab,   setActiveTab]   = useState('claims')
  const [showImport,  setShowImport]  = useState(false)
  const [importing,   setImporting]   = useState(false)

  // KPI data
  const claims = db.claims || []

  // BUG-4 FIX: was db.claimDenials — key does not exist in loadAll() output.
  // loadAll() returns the key as `denials`. DenialLog.jsx already correctly
  // used db.denials. This one-character fix restores the denial count KPI.
  const denials = db.denials || []

  const elig        = db.eligibilityChecks || []
  const totalBilled = claims.reduce((s, c) => s + Number(c.billed_amount || 0), 0)
  const totalPaid   = claims.reduce((s, c) => s + Number(c.paid_amount   || 0), 0)
  const openClaims  = claims.filter(c => !['Paid', 'Written Off'].includes(c.status)).length
  const denialRate  = claims.length > 0
    ? ((claims.filter(c => c.status === 'Denied').length / claims.length) * 100).toFixed(1)
    : '0.0'

  function fmtMoney(n) {
    return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  /**
   * BUG-5 FIX: handleCSVImport was a stub that discarded all data.
   * Now persists each parsed row to Supabase via upsertClaim.
   * Reports succeeded/failed counts in the toast.
   */
  async function handleCSVImport(rows, onDone) {
    setImporting(true)
    let succeeded = 0
    let failed    = 0

    for (const row of rows) {
      try {
        await upsertClaim(row)
        succeeded++
      } catch (e) {
        console.warn('[CSV Import] row skipped:', e.message, row)
        failed++
      }
    }

    setImporting(false)
    toast(
      `Imported ${succeeded} record${succeeded !== 1 ? 's' : ''}${failed ? ` (${failed} skipped — check console)` : ''}.`,
      failed > 0 ? 'warn' : 'success'
    )
    if (onDone) onDone()
  }

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-.04em', margin: 0, marginBottom: 3 }}>Billing</h2>
          <p style={{ fontSize: 12.5, color: 'var(--text-4)', margin: 0 }}>Claims, eligibility, denials, and revenue analytics in one place.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setShowImport(s => !s)}
            className={`btn btn-sm ${showImport ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {showImport ? 'Hide Import' : 'CSV Import'}
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="kpi-grid" style={{ marginBottom: 18 }}>
        <div className="kpi">
          <div className="kpi-label">Total Billed</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{fmtMoney(totalBilled)}</div>
        </div>
        <div className="kpi kpi-teal">
          <div className="kpi-label">Collected</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{fmtMoney(totalPaid)}</div>
          <div className="kpi-sub">{totalBilled > 0 ? ((totalPaid / totalBilled) * 100).toFixed(1) : 0}% rate</div>
        </div>
        <div className="kpi kpi-amber">
          <div className="kpi-label">Open Claims</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{openClaims}</div>
          <div className="kpi-sub">{fmtMoney(totalBilled - totalPaid)} outstanding</div>
        </div>
        <div className="kpi kpi-red">
          <div className="kpi-label">Denial Rate</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{denialRate}%</div>
          {/* BUG-4 FIX: now shows actual denial count instead of always 0 */}
          <div className="kpi-sub">{denials.length} logged denials</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Elig Checks</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{elig.length}</div>
          <div className="kpi-sub">{elig.filter(e => e.status === 'Eligible').length} eligible</div>
        </div>
      </div>

      {/* CSV Import Panel */}
      {showImport && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ background: 'var(--pr-l)', border: '1.5px solid rgba(21,101,192,.2)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#1e40af', fontWeight: 500, marginBottom: 10 }}>
            ℹ Import from SimplePractice: Reports → Billing → Export CSV. Supports Claims and Revenue exports.
          </div>
          <CSVImportBanner
            onImport={handleCSVImport}
            target={activeTab === 'revenue' ? 'Revenue Analytics' : 'Claims'}
            importing={importing}
          />
        </div>
      )}

      {/* Sub-tabs */}
      <div style={{
        display: 'flex', gap: 2, background: 'var(--elevated)', border: '1.5px solid var(--border)',
        borderRadius: 10, padding: 4, marginBottom: 20, flexWrap: 'wrap',
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, padding: '8px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, transition: 'all var(--t)',
            background: activeTab === t.id ? 'var(--navy)' : 'transparent',
            color: activeTab === t.id ? '#fff' : 'var(--text-3)',
            boxShadow: activeTab === t.id ? '0 1px 4px rgba(0,0,0,.15)' : 'none',
          }}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Sub-tab content — each wrapped in its own ErrorBoundary */}
      {activeTab === 'claims' && (
        <TabErrorBoundary>
          <ClaimsPage db={db} toast={toast} requestConfirm={requestConfirm} />
        </TabErrorBoundary>
      )}
      {activeTab === 'eligibility' && (
        <TabErrorBoundary>
          <EligibilityPage db={db} toast={toast} requestConfirm={requestConfirm} />
        </TabErrorBoundary>
      )}
      {activeTab === 'denials' && (
        <TabErrorBoundary>
          <DenialLog db={db} toast={toast} onDraftAppeal={onDraftAppeal} requestConfirm={requestConfirm} />
        </TabErrorBoundary>
      )}
      {activeTab === 'revenue' && (
        <TabErrorBoundary>
          <RevenueAnalytics db={db} />
        </TabErrorBoundary>
      )}
    </div>
  )
}

export default BillingHub
