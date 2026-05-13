// src/pages/countries/Countries.jsx
import { useEffect, useState, useCallback } from 'react'
import { Plus, Edit2, Trash2, Globe, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../supabase/client'
import Modal from '../../components/shared/Modal'
import styles from '../../components/shared/PageLayout.module.css'
import fStyles from '../../components/shared/Form.module.css'

const INIT = {
  code: '', name: '', flag: '', currency: '', symbol: '',
  cities: '', is_active: true,
}

export default function Countries() {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEdit]   = useState(null)
  const [form, setForm]       = useState(INIT)
  const [saving, setSaving]   = useState(false)
  const [errors, setErrors]   = useState({})

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data: rows, error } = await supabase
      .from('countries_config')
      .select('*')
      .order('name')
    if (error) toast.error('Failed to load countries')
    setData(rows || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const validate = () => {
    const e = {}
    if (!form.code.trim())     e.code     = 'Country code required (e.g. US, PK)'
    if (!form.name.trim())     e.name     = 'Country name required'
    if (!form.flag.trim())     e.flag     = 'Flag emoji required'
    if (!form.currency.trim()) e.currency = 'Currency code required (e.g. USD)'
    if (!form.symbol.trim())   e.symbol   = 'Currency symbol required (e.g. $)'
    return e
  }

  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      const citiesArr = form.cities
        ? form.cities.split(',').map(c => c.trim()).filter(Boolean)
        : []

      const payload = {
        code:      form.code.toUpperCase().trim(),
        name:      form.name.trim(),
        flag:      form.flag.trim(),
        currency:  form.currency.toUpperCase().trim(),
        symbol:    form.symbol.trim(),
        cities:    citiesArr,
        is_active: form.is_active,
      }

      if (editItem) {
        const { error } = await supabase
          .from('countries_config')
          .update(payload)
          .eq('id', editItem.id)
        if (error) throw error
        toast.success('Country updated!')
      } else {
        const { error } = await supabase
          .from('countries_config')
          .insert(payload)
        if (error) throw error
        toast.success('Country added! App will reflect changes instantly.')
      }

      setAddOpen(false)
      setEdit(null)
      setForm(INIT)
      fetch()
    } catch (err) {
      toast.error(err.message || 'Save failed')
    } finally { setSaving(false) }
  }

  const handleToggle = async (item) => {
    await supabase
      .from('countries_config')
      .update({ is_active: !item.is_active })
      .eq('id', item.id)
    toast.success(`${item.name} ${!item.is_active ? 'enabled' : 'disabled'}`)
    fetch()
  }

  const handleDelete = async (item) => {
    if (!confirm(`Delete ${item.name}? This will remove it from the app.`)) return
    await supabase.from('countries_config').delete().eq('id', item.id)
    toast.success(`${item.name} deleted`)
    fetch()
  }

  const openEdit = (item) => {
    setEdit(item)
    setForm({
      code:      item.code,
      name:      item.name,
      flag:      item.flag,
      currency:  item.currency,
      symbol:    item.symbol,
      cities:    (item.cities || []).join(', '),
      is_active: item.is_active,
    })
    setAddOpen(true)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.pageTitle}>Countries & Regions</div>
          <div className={styles.pageSub}>
            Manage countries visible in the passenger app · Changes reflect instantly
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className={styles.clearBtn} onClick={fetch} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button className={styles.addBtn} onClick={() => { setAddOpen(true); setEdit(null); setForm(INIT); setErrors({}) }}>
            <Plus size={15} /> Add Country
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div style={{
        background: 'var(--blue-light)', border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 20,
        fontSize: 13, color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Globe size={15} />
        Countries added here will appear in the passenger app's signup and profile screens. Realtime update — no app restart needed.
      </div>

      {/* Countries grid */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
      ) : data.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
          <Globe size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div>No countries added yet</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Add your first country to enable the app</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {data.map(c => (
            <div key={c.id} style={{
              background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
              border: `1.5px solid ${c.is_active ? 'var(--border)' : 'rgba(239,68,68,0.2)'}`,
              padding: 20, opacity: c.is_active ? 1 : 0.6,
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 42, lineHeight: 1 }}>{c.flag}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    Code: <strong>{c.code}</strong> · {c.symbol} {c.currency}
                  </div>
                </div>
                <div style={{
                  padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                  background: c.is_active ? 'var(--green-light)' : 'var(--red-light)',
                  color: c.is_active ? 'var(--green)' : 'var(--red)',
                }}>
                  {c.is_active ? 'Active' : 'Disabled'}
                </div>
              </div>

              {/* Cities */}
              {c.cities?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                    Cities
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {c.cities.map(city => (
                      <span key={city} style={{
                        background: 'var(--bg-main)', border: '1px solid var(--border)',
                        borderRadius: 99, padding: '3px 10px', fontSize: 12, color: 'var(--text-secondary)',
                      }}>
                        {city}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <button onClick={() => openEdit(c)}
                  style={{ flex: 1, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-main)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                  <Edit2 size={13} /> Edit
                </button>
                <button onClick={() => handleToggle(c)}
                  style={{ flex: 1, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: '1px solid var(--border)', borderRadius: 8, background: c.is_active ? 'var(--amber-light)' : 'var(--green-light)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: c.is_active ? 'var(--amber)' : 'var(--green)', fontFamily: 'var(--font-body)' }}>
                  {c.is_active ? <><ToggleRight size={13} /> Disable</> : <><ToggleLeft size={13} /> Enable</>}
                </button>
                <button onClick={() => handleDelete(c)}
                  style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, background: 'var(--red-light)', cursor: 'pointer', color: 'var(--red)' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={addOpen}
        onClose={() => { setAddOpen(false); setEdit(null); setForm(INIT) }}
        title={editItem ? `Edit — ${editItem.name}` : 'Add Country'}
        width={500}
      >
        <div className={fStyles.body}>
          <div className={fStyles.grid}>

            <div className={fStyles.field}>
              <label className={fStyles.label}>Country Code <span className={fStyles.required}>*</span></label>
              <input className={`${fStyles.input} ${errors.code ? fStyles.error : ''}`}
                placeholder="US, PK, AE, GB..."
                value={form.code}
                onChange={e => set('code', e.target.value.toUpperCase())}
                maxLength={3}
                disabled={!!editItem}
              />
              {errors.code && <span className={fStyles.errorMsg}>{errors.code}</span>}
            </div>

            <div className={fStyles.field}>
              <label className={fStyles.label}>Flag Emoji <span className={fStyles.required}>*</span></label>
              <input className={`${fStyles.input} ${errors.flag ? fStyles.error : ''}`}
                placeholder="🇺🇸"
                value={form.flag}
                onChange={e => set('flag', e.target.value)}
                style={{ fontSize: 24 }}
              />
              {errors.flag && <span className={fStyles.errorMsg}>{errors.flag}</span>}
            </div>

            <div className={`${fStyles.field} ${fStyles.full}`}>
              <label className={fStyles.label}>Country Name <span className={fStyles.required}>*</span></label>
              <input className={`${fStyles.input} ${errors.name ? fStyles.error : ''}`}
                placeholder="United States"
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />
              {errors.name && <span className={fStyles.errorMsg}>{errors.name}</span>}
            </div>

            <div className={fStyles.field}>
              <label className={fStyles.label}>Currency Code <span className={fStyles.required}>*</span></label>
              <input className={`${fStyles.input} ${errors.currency ? fStyles.error : ''}`}
                placeholder="USD"
                value={form.currency}
                onChange={e => set('currency', e.target.value.toUpperCase())}
                maxLength={3}
              />
              {errors.currency && <span className={fStyles.errorMsg}>{errors.currency}</span>}
            </div>

            <div className={fStyles.field}>
              <label className={fStyles.label}>Currency Symbol <span className={fStyles.required}>*</span></label>
              <input className={`${fStyles.input} ${errors.symbol ? fStyles.error : ''}`}
                placeholder="$"
                value={form.symbol}
                onChange={e => set('symbol', e.target.value)}
                maxLength={3}
              />
              {errors.symbol && <span className={fStyles.errorMsg}>{errors.symbol}</span>}
            </div>

            <div className={`${fStyles.field} ${fStyles.full}`}>
              <label className={fStyles.label}>Cities (comma separated)</label>
              <input className={fStyles.input}
                placeholder="New York, Atlanta, Chicago, Houston"
                value={form.cities}
                onChange={e => set('cities', e.target.value)}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                These cities will show in the app for this country
              </span>
            </div>

            <div className={`${fStyles.field} ${fStyles.full}`}>
              <label className={fStyles.label}>Status</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { val: true,  label: '✅ Active — visible in app' },
                  { val: false, label: '⛔ Disabled — hidden from app' },
                ].map(opt => (
                  <button key={String(opt.val)} type="button"
                    onClick={() => set('is_active', opt.val)}
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                      border: form.is_active === opt.val ? '2px solid var(--accent)' : '1.5px solid var(--border)',
                      background: form.is_active === opt.val ? 'var(--accent-light)' : 'var(--bg-main)',
                      fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)',
                      fontFamily: 'var(--font-body)',
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className={fStyles.footer}>
          <button className={fStyles.cancelBtn} onClick={() => { setAddOpen(false); setEdit(null); setForm(INIT) }}>
            Cancel
          </button>
          <button className={fStyles.submitBtn} onClick={handleSave} disabled={saving}>
            {saving ? <span className={fStyles.spinner} /> : editItem ? 'Save Changes' : 'Add Country'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
