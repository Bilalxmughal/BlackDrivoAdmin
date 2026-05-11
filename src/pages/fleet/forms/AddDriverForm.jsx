// src/pages/fleet/forms/AddDriverForm.jsx
import { useEffect, useState } from 'react'
import { Truck, Upload, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../../supabase/client'
import { useAuth } from '../../../hooks/useAuth'
import Modal from '../../../components/shared/Modal'
import CountryCitySelect from '../../../components/shared/CountryCitySelect'
import styles from '../../../components/shared/Form.module.css'

const INIT = { name: '', email: '', country: '', city: '', phone: '', license_number: '', license_expiry: '', vehicle_id: '' }

export default function AddDriverForm({ open, onClose, onSuccess }) {
  const { userProfile } = useAuth()
  const [form, setForm]     = useState(INIT)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [vehicles, setVehicles] = useState([])
  const [docs, setDocs] = useState({ license: null, background: null, insurance: null })

  useEffect(() => { if (open) fetchVehicles() }, [open, form.country])

  const fetchVehicles = async () => {
    let q = supabase
      .from('vehicles')
      .select('id, company_name, plate_number, category, country_code')
      .eq('status', 'active')
    // Show only same country vehicles
    if (form.country) q = q.eq('country_code', form.country)
    const { data } = await q
    setVehicles(data || [])
  }

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const validate = () => {
    const e = {}
    if (!form.name.trim())  e.name    = 'Name is required'
    if (!form.country)      e.country = 'Country is required'
    if (!form.city)         e.city    = 'City is required'
    if (!form.phone.trim()) e.phone   = 'Phone is required'
    return e
  }

  const uploadDoc = async (file, path) => {
    if (!file) return null
    const ext = file.name.split('.').pop()
    const filePath = `${path}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('drivers').upload(filePath, file)
    if (error) return null
    const { data } = supabase.storage.from('drivers').getPublicUrl(filePath)
    return data.publicUrl
  }

  const handleSubmit = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      const [licenseUrl, bgUrl, insuranceUrl] = await Promise.all([
        uploadDoc(docs.license,    'licenses'),
        uploadDoc(docs.background, 'background'),
        uploadDoc(docs.insurance,  'insurance'),
      ])
      const { error } = await supabase.from('drivers').insert({
        name:                form.name,
        email:               form.email || null,
        phone:               form.phone,
        city:                form.city,
        country_code:        form.country,
        vehicle_id:          form.vehicle_id || null,
        license_number:      form.license_number || null,
        license_expiry:      form.license_expiry || null,
        license_doc_url:     licenseUrl,
        background_check_url:bgUrl,
        insurance_doc_url:   insuranceUrl,
        source:              'admin_created',
        created_by:          userProfile?.id || null,
      })
      if (error) throw error
      toast.success('Driver added!')
      setForm(INIT)
      setDocs({ license: null, background: null, insurance: null })
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err.message || 'Failed to add driver')
    } finally {
      setSaving(false)
    }
  }

  const DocUpload = ({ label, docKey }) => (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      {docs[docKey]
        ? <div className={styles.uploadedFile}>
            <Check size={12} /> {docs[docKey].name}
            <button onClick={() => setDocs(d => ({ ...d, [docKey]: null }))}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--green)' }}>✕</button>
          </div>
        : <label className={styles.uploadBox}>
            <input type="file" accept="image/*,.pdf"
              onChange={e => setDocs(d => ({ ...d, [docKey]: e.target.files[0] }))} />
            <Upload size={20} color="var(--text-muted)" />
            <div className={styles.uploadLabel}>Click to upload</div>
            <div className={styles.uploadSub}>JPG, PNG or PDF · Max 10MB</div>
          </label>
      }
    </div>
  )

  return (
    <Modal open={open} onClose={onClose} title="Add New Driver" width={640}>
      <div className={styles.body}>
        <div className={styles.grid}>
          <div className={styles.sectionTitle}>Personal Information</div>

          <div className={styles.field}>
            <label className={styles.label}>Full Name <span className={styles.required}>*</span></label>
            <input className={`${styles.input} ${errors.name ? styles.error : ''}`}
              placeholder="Driver Name" value={form.name} onChange={e => set('name', e.target.value)} />
            {errors.name && <span className={styles.errorMsg}>{errors.name}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input type="email" className={styles.input}
              placeholder="driver@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>

          <div className={styles.sectionTitle}>Location & Contact</div>

          <CountryCitySelect
            country={form.country} city={form.city} phone={form.phone}
            onChange={set} errors={errors} required showPhone
          />

          <div className={styles.sectionTitle}>License & Vehicle</div>

          <div className={styles.field}>
            <label className={styles.label}>License Number</label>
            <input className={styles.input} placeholder="DL-123456"
              value={form.license_number} onChange={e => set('license_number', e.target.value)} />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>License Expiry</label>
            <input type="date" className={styles.input}
              value={form.license_expiry} onChange={e => set('license_expiry', e.target.value)} />
          </div>

          <div className={`${styles.field} ${styles.full}`}>
            <label className={styles.label}>Assign Vehicle</label>
            <select className={styles.select} value={form.vehicle_id} onChange={e => set('vehicle_id', e.target.value)}>
              <option value="">— No Vehicle —</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.plate_number} · {v.company_name} ({v.category})</option>
              ))}
            </select>
          </div>

          <div className={styles.sectionTitle}>Documents</div>
          <DocUpload label="Driver's License" docKey="license" />
          <DocUpload label="Background Check"  docKey="background" />
          <DocUpload label="Insurance Document" docKey="insurance" />
        </div>
      </div>
      <div className={styles.footer}>
        <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
        <button className={styles.submitBtn} onClick={handleSubmit} disabled={saving}>
          {saving ? <span className={styles.spinner} /> : <><Truck size={14} /> Add Driver</>}
        </button>
      </div>
    </Modal>
  )
}
