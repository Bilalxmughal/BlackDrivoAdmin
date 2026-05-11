// src/pages/clients/forms/AddPassengerForm.jsx
import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../../supabase/client'
import { useAuth } from '../../../hooks/useAuth'
import Modal from '../../../components/shared/Modal'
import CountryCitySelect from '../../../components/shared/CountryCitySelect'
import styles from '../../../components/shared/Form.module.css'

const INIT = { name: '', email: '', country: '', city: '', phone: '', notes: '' }

export default function AddPassengerForm({ open, onClose, onSuccess }) {
  const { userProfile } = useAuth()
  const [form, setForm] = useState(INIT)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const validate = () => {
    const e = {}
    if (!form.name.trim())    e.name    = 'Name is required'
    if (!form.country)        e.country = 'Country is required'
    if (!form.city)           e.city    = 'City is required'
    if (!form.phone.trim())   e.phone   = 'Phone is required'
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
    return e
  }

  const handleSubmit = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('passengers').insert({
        name:         form.name,
        email:        form.email || null,
        phone:        form.phone,
        city:         form.city,
        country:      form.country === 'PK' ? 'Pakistan' : 'United States',
        country_code: form.country,
        notes:        form.notes || null,
        source:       'admin_created',
        created_by:   userProfile?.id || null,
      })
      if (error) throw error
      toast.success('Passenger added!')
      setForm(INIT)
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err.message || 'Failed to add passenger')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add New Passenger" width={580}>
      <div className={styles.body}>
        <div className={styles.grid}>
          <div className={styles.sectionTitle}>Personal Information</div>

          <div className={styles.field}>
            <label className={styles.label}>Full Name <span className={styles.required}>*</span></label>
            <input className={`${styles.input} ${errors.name ? styles.error : ''}`}
              placeholder="John Smith" value={form.name} onChange={e => set('name', e.target.value)} />
            {errors.name && <span className={styles.errorMsg}>{errors.name}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input type="email" className={`${styles.input} ${errors.email ? styles.error : ''}`}
              placeholder="john@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
            {errors.email && <span className={styles.errorMsg}>{errors.email}</span>}
          </div>

          <div className={styles.sectionTitle}>Location & Contact</div>

          <CountryCitySelect
            country={form.country} city={form.city} phone={form.phone}
            onChange={set} errors={errors} required showPhone
          />

          <div className={`${styles.field} ${styles.full}`}>
            <label className={styles.label}>Notes</label>
            <textarea className={styles.textarea} placeholder="Any additional notes..."
              value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
      </div>
      <div className={styles.footer}>
        <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
        <button className={styles.submitBtn} onClick={handleSubmit} disabled={saving}>
          {saving ? <span className={styles.spinner} /> : <><UserPlus size={14} /> Add Passenger</>}
        </button>
      </div>
    </Modal>
  )
}
