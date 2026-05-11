// src/pages/clients/PassengerDetail.jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2, Trash2, Phone, Mail, MapPin, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../supabase/client'
import Badge from '../../components/shared/Badge'
import { fmtDate, fmtDateTime, fmtMoney, getInitials } from '../../utils/formatters'
import styles from '../../components/shared/PageLayout.module.css'
import fStyles from '../../components/shared/Form.module.css'

export default function PassengerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [passenger, setPassenger] = useState(null)
  const [bookings, setBookings]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [editing, setEditing]     = useState(false)
  const [form, setForm]           = useState({})
  const [saving, setSaving]       = useState(false)

  useEffect(() => { fetchPassenger(); fetchBookings() }, [id])

  const fetchPassenger = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('passengers').select('*').eq('id', id).single()
    if (error) { toast.error('Passenger not found'); navigate('/passengers'); return }
    setPassenger(data)
    setForm(data)
    setLoading(false)
  }

  const fetchBookings = async () => {
    const { data } = await supabase
      .from('bookings')
      .select('id, booking_ref, status, fare, created_at, pickup_address')
      .eq('passenger_id', id)
      .order('created_at', { ascending: false })
      .limit(10)
    setBookings(data || [])
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('passengers')
      .update({ name: form.name, email: form.email, phone: form.phone, city: form.city, country: form.country, status: form.status, notes: form.notes })
      .eq('id', id)
    if (error) { toast.error('Update failed'); setSaving(false); return }
    toast.success('Passenger updated!')
    setEditing(false)
    fetchPassenger()
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this passenger? This cannot be undone.')) return
    await supabase.from('passengers').delete().eq('id', id)
    toast.success('Passenger deleted')
    navigate('/passengers')
  }

  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Loading...</div>

  return (
    <div className={styles.page}>
      <button className={styles.pgBtn} style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}
        onClick={() => navigate('/passengers')}>
        <ArrowLeft size={13} /> Back
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: '#111',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: '#fff',
          }}>
            {passenger.avatar_url ? <img src={passenger.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : getInitials(passenger.name)}
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: -0.5 }}>{passenger.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
              <Badge status={passenger.status || 'active'} />
              <span className={`${fStyles.sourceBadge} ${passenger.source === 'admin_created' ? fStyles.sourceAdmin : fStyles.sourceSelf}`}>
                {passenger.source === 'admin_created' ? 'Admin Created' : 'Self Registered'}
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className={styles.actionBtn} onClick={() => setEditing(!editing)}><Edit2 size={14} /></button>
          <button className={`${styles.actionBtn} ${styles.danger}`} onClick={handleDelete}><Trash2 size={14} /></button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Info / Edit */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700 }}>
              {editing ? 'Edit Information' : 'Profile Information'}
            </div>
            {editing ? (
              <div className={fStyles.body}>
                <div className={fStyles.grid}>
                  {[
                    { label: 'Full Name',  key: 'name',    placeholder: 'John Smith'        },
                    { label: 'Phone',      key: 'phone',   placeholder: '+1 555 000 0000'   },
                    { label: 'Email',      key: 'email',   placeholder: 'john@example.com'  },
                    { label: 'City',       key: 'city',    placeholder: 'Atlanta'           },
                    { label: 'Country',    key: 'country', placeholder: 'US'                },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key} className={fStyles.field}>
                      <label className={fStyles.label}>{label}</label>
                      <input className={fStyles.input} placeholder={placeholder}
                        value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                    </div>
                  ))}
                  <div className={fStyles.field}>
                    <label className={fStyles.label}>Status</label>
                    <select className={fStyles.select} value={form.status || 'active'}
                      onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                  <div className={`${fStyles.field} ${fStyles.full}`}>
                    <label className={fStyles.label}>Notes</label>
                    <textarea className={fStyles.textarea} value={form.notes || ''}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
                <div className={fStyles.footer}>
                  <button className={fStyles.cancelBtn} onClick={() => setEditing(false)}>Cancel</button>
                  <button className={fStyles.submitBtn} onClick={handleSave} disabled={saving}>
                    {saving ? <span className={fStyles.spinner} /> : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {[
                  { icon: Phone,    label: 'Phone',   value: passenger.phone   },
                  { icon: Mail,     label: 'Email',   value: passenger.email   },
                  { icon: MapPin,   label: 'City',    value: passenger.city    },
                  { icon: MapPin,   label: 'Country', value: passenger.country },
                  { icon: Calendar, label: 'Joined',  value: fmtDate(passenger.created_at) },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Icon size={11} /> {label}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{value || '—'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trip History */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700 }}>
              Trip History ({bookings.length})
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  {['Ref', 'Pickup', 'Status', 'Fare', 'Date'].map(h => (
                    <th key={h} className={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0
                  ? <tr><td colSpan={5} className={styles.td} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No trips yet</td></tr>
                  : bookings.map(b => (
                      <tr key={b.id} className={styles.tr} onClick={() => navigate(`/bookings/${b.id}`)}>
                        <td className={styles.td}><span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>{b.booking_ref}</span></td>
                        <td className={styles.td} style={{ fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.pickup_address}</td>
                        <td className={styles.td}><Badge status={b.status} /></td>
                        <td className={styles.td} style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{fmtMoney(b.fare)}</td>
                        <td className={styles.td} style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDate(b.created_at)}</td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        </div>

        {/* Right — Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { label: 'Total Rides',  value: passenger.ride_count || 0, color: 'var(--blue)'   },
            { label: 'Total Spent',  value: fmtMoney(bookings.filter(b => b.status === 'completed').reduce((s, b) => s + (b.fare || 0), 0)), color: 'var(--green)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, color, letterSpacing: -1 }}>{value}</div>
            </div>
          ))}

          {passenger.notes && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Notes</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{passenger.notes}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
