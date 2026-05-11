// src/pages/fleet/forms/AddVehicleForm.jsx
import { useState } from 'react'
import { Car, Upload, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../../supabase/client'
import { useAuth } from '../../../hooks/useAuth'
import Modal from '../../../components/shared/Modal'
import styles from '../../../components/shared/Form.module.css'

const INIT = {
  company_name: '', category: 'sedan', model_year: new Date().getFullYear(),
  color: '', plate_number: '', seat_capacity: 4, city: 'lahore', country_code: 'PK',
}

export default function AddVehicleForm({ open, onClose, onSuccess }) {
  const { userProfile } = useAuth()
  const [form, setForm]     = useState(INIT)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [docs, setDocs]     = useState({ registration: null, insurance: null, inspection: null })

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const validate = () => {
    const e = {}
    if (!form.company_name.trim())  e.company_name  = 'Company/Make is required'
    if (!form.plate_number.trim())  e.plate_number  = 'Plate number is required'
    return e
  }

  const uploadDoc = async (file, path) => {
    if (!file) return null
    const ext = file.name.split('.').pop()
    const filePath = `${path}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('vehicles').upload(filePath, file)
    if (error) return null
    const { data } = supabase.storage.from('vehicles').getPublicUrl(filePath)
    return data.publicUrl
  }

  const handleSubmit = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      const [regUrl, insUrl, inspUrl] = await Promise.all([
        uploadDoc(docs.registration, 'registration'),
        uploadDoc(docs.insurance,    'insurance'),
        uploadDoc(docs.inspection,   'inspection'),
      ])

      const { error } = await supabase.from('vehicles').insert({
        ...form,
        model_year:           parseInt(form.model_year),
        seat_capacity:        parseInt(form.seat_capacity),
        registration_doc_url: regUrl,
        insurance_doc_url:    insUrl,
        inspection_doc_url:   inspUrl,
        created_by:           userProfile?.id || null,
      })
      if (error) throw error
      toast.success('Vehicle added!')
      setForm(INIT)
      setDocs({ registration: null, insurance: null, inspection: null })
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err.message || 'Failed to add vehicle')
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
    <Modal open={open} onClose={onClose} title="Add New Vehicle" width={640}>
      <div className={styles.body}>
        <div className={styles.grid}>
          <div className={styles.sectionTitle}>Vehicle Information</div>

          <div className={styles.field}>
            <label className={styles.label}>Company / Make <span className={styles.required}>*</span></label>
            <input className={`${styles.input} ${errors.company_name ? styles.error : ''}`}
              placeholder="Toyota, BMW, Mercedes..."
              value={form.company_name} onChange={e => set('company_name', e.target.value)} />
            {errors.company_name && <span className={styles.errorMsg}>{errors.company_name}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Category</label>
            <select className={styles.select} value={form.category} onChange={e => set('category', e.target.value)}>
              <option value="sedan">Sedan</option>
              <option value="suv">SUV</option>
              <option value="van">Van</option>
              <option value="luxury">Luxury</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Plate Number <span className={styles.required}>*</span></label>
            <input className={`${styles.input} ${errors.plate_number ? styles.error : ''}`}
              placeholder="ABC-1234" value={form.plate_number} onChange={e => set('plate_number', e.target.value.toUpperCase())} />
            {errors.plate_number && <span className={styles.errorMsg}>{errors.plate_number}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Model Year</label>
            <input type="number" className={styles.input} min={2000} max={2030}
              value={form.model_year} onChange={e => set('model_year', e.target.value)} />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Color</label>
            <input className={styles.input} placeholder="Black, White, Silver..."
              value={form.color} onChange={e => set('color', e.target.value)} />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Seat Capacity</label>
            <select className={styles.select} value={form.seat_capacity} onChange={e => set('seat_capacity', e.target.value)}>
              {[2,4,5,6,7,8,10,12,15].map(n => <option key={n} value={n}>{n} Seats</option>)}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>City</label>
            <select className={styles.select} value={form.city}
              onChange={e => {
                const city = e.target.value
                const isPK = ['lahore','karachi','islamabad'].includes(city)
                set('city', city)
                set('country_code', isPK ? 'PK' : 'US')
              }}>
              <option value="lahore">🇵🇰 Lahore</option>
              <option value="karachi">🇵🇰 Karachi</option>
              <option value="islamabad">🇵🇰 Islamabad</option>
              <option value="atlanta">🇺🇸 Atlanta</option>
              <option value="new_york">🇺🇸 New York</option>
              <option value="chicago">🇺🇸 Chicago</option>
              <option value="houston">🇺🇸 Houston</option>
              <option value="miami">🇺🇸 Miami</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className={styles.sectionTitle}>Documents (USA Compliance)</div>
          <DocUpload label="Vehicle Registration" docKey="registration" />
          <DocUpload label="Insurance Certificate" docKey="insurance" />
          <DocUpload label="Inspection Certificate" docKey="inspection" />
        </div>
      </div>

      <div className={styles.footer}>
        <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
        <button className={styles.submitBtn} onClick={handleSubmit} disabled={saving}>
          {saving ? <span className={styles.spinner} /> : <><Car size={14} /> Add Vehicle</>}
        </button>
      </div>
    </Modal>
  )
}
