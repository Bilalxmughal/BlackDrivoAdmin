// src/pages/bookings/BookingDetail.jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, UserCheck, Send, Truck } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../hooks/useAuth'
import Badge from '../../components/shared/Badge'
import Modal from '../../components/shared/Modal'
import { fmtMoney, fmtDateTime, getInitials } from '../../utils/formatters'
import styles from './BookingDetail.module.css'

export default function BookingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { userProfile } = useAuth()

  const [booking, setBooking]         = useState(null)
  const [loading, setLoading]         = useState(true)
  const [comments, setComments]       = useState([])
  const [commentText, setCommentText] = useState('')
  const [drivers, setDrivers]         = useState([])
  const [assignModal, setAssignModal] = useState(false)
  const [selectedDriver, setSelected] = useState(null)
  const [saving, setSaving]           = useState(false)

  useEffect(() => { fetchBooking(); fetchComments() }, [id])

  const fetchBooking = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *, 
          passengers ( id, name, email, phone, avatar_url ),
          drivers    ( id, name, email, phone, avatar_url ),
          vehicles   ( id, company_name, plate_number, category, color )
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      setBooking(data)
    } catch {
      toast.error('Booking not found')
      navigate('/bookings')
    } finally {
      setLoading(false)
    }
  }

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('entity', 'booking')
      .eq('entity_id', id)
      .order('created_at', { ascending: true })
    setComments(data || [])
  }

  const fetchDrivers = async () => {
    const { data } = await supabase
      .from('drivers')
      .select('id, name, phone, avatar_url, vehicle_id, vehicles(plate_number, category)')
      .eq('status', 'active')
    setDrivers(data || [])
  }

  const updateStatus = async (status) => {
    setSaving(true)
    const { error } = await supabase
      .from('bookings').update({ status }).eq('id', id)
    if (error) { toast.error('Update failed'); setSaving(false); return }
    toast.success(`Status updated to ${status}`)
    setBooking(b => ({ ...b, status }))
    setSaving(false)
  }

  const assignDriver = async () => {
    if (!selectedDriver) return
    setSaving(true)
    const { error } = await supabase
      .from('bookings')
      .update({ driver_id: selectedDriver.id, status: 'dispatched' })
      .eq('id', id)
    if (error) { toast.error('Assign failed'); setSaving(false); return }
    toast.success(`${selectedDriver.name} assigned!`)
    setAssignModal(false)
    fetchBooking()
    setSaving(false)
  }

  const sendComment = async () => {
    if (!commentText.trim()) return
    const { error } = await supabase.from('comments').insert({
      entity: 'booking', entity_id: id,
      author_id: userProfile?.id,
      author_name: userProfile?.name || 'Admin',
      content: commentText.trim(),
    })
    if (error) { toast.error('Comment failed'); return }
    setCommentText('')
    fetchComments()
  }

  if (loading) return (
    <div style={{ padding: 32, color: 'var(--text-muted)', fontSize: 14 }}>Loading booking...</div>
  )

  if (!booking) return null

  return (
    <div className={styles.page}>
      <button className={styles.backBtn} onClick={() => navigate('/bookings')}>
        <ArrowLeft size={14} /> Back to Bookings
      </button>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <div className={styles.refBadge}>{booking.booking_ref}</div>
          <div className={styles.pageTitle}>Booking Detail</div>
        </div>
        <div className={styles.headerActions}>
          <Badge status={booking.status} />
          <button className={`${styles.actionBtn} ${styles.green}`}
            onClick={() => { fetchDrivers(); setAssignModal(true) }}>
            <UserCheck size={14} />
            {booking.driver_id ? 'Reassign Driver' : 'Assign Driver'}
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        {/* ── Left ── */}
        <div className={styles.leftCol}>

          {/* Trip Route */}
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>Trip Route</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {booking.source || 'app'} booking
              </span>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.route}>
                <div className={styles.routePoint}>
                  <div className={styles.routeDot} style={{ background: 'var(--green)' }} />
                  <div>
                    <div className={styles.routeLabel}>Pickup</div>
                    <div className={styles.routeAddr}>{booking.pickup_address || '—'}</div>
                  </div>
                </div>
                <div className={styles.routeLine} />
                <div className={styles.routePoint}>
                  <div className={styles.routeDot} style={{ background: 'var(--accent)' }} />
                  <div>
                    <div className={styles.routeLabel}>Dropoff</div>
                    <div className={styles.routeAddr}>{booking.dropoff_address || '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trip Details */}
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>Trip Details</span>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.infoGrid}>
                {[
                  { label: 'Booking Ref',    value: booking.booking_ref },
                  { label: 'City',           value: booking.city || '—' },
                  { label: 'Pickup Time',    value: fmtDateTime(booking.pickup_time) },
                  { label: 'Dropoff Time',   value: fmtDateTime(booking.dropoff_time) },
                  { label: 'Payment Method', value: booking.payment_method || 'Cash' },
                  { label: 'Created At',     value: fmtDateTime(booking.created_at) },
                ].map(({ label, value }) => (
                  <div key={label} className={styles.infoItem}>
                    <div className={styles.infoLabel}>{label}</div>
                    <div className={styles.infoValue} style={{ textTransform: 'capitalize' }}>{value}</div>
                  </div>
                ))}
              </div>
              {booking.notes && (
                <div style={{ marginTop: 16, padding: 14, background: 'var(--bg-main)', borderRadius: 10 }}>
                  <div className={styles.infoLabel}>Notes</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{booking.notes}</div>
                </div>
              )}
            </div>
          </div>

          {/* Passenger */}
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>Passenger</span>
              {booking.passengers && (
                <button className={styles.actionBtn}
                  onClick={() => navigate(`/passengers/${booking.passengers.id}`)}>
                  View Profile
                </button>
              )}
            </div>
            <div className={styles.cardBody}>
              {booking.passengers
                ? <div className={styles.personCard}
                    onClick={() => navigate(`/passengers/${booking.passengers.id}`)}>
                    <div className={styles.personAvatar}>
                      {booking.passengers.avatar_url
                        ? <img src={booking.passengers.avatar_url} alt="" />
                        : getInitials(booking.passengers.name)
                      }
                    </div>
                    <div>
                      <div className={styles.personName}>{booking.passengers.name}</div>
                      <div className={styles.personSub}>{booking.passengers.email}</div>
                      <div className={styles.personSub}>{booking.passengers.phone}</div>
                    </div>
                  </div>
                : <div className={styles.unassignedBox}>
                    <div className={styles.unassignedText}>No passenger linked</div>
                  </div>
              }
            </div>
          </div>

          {/* Comments */}
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>Internal Comments</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{comments.length} comments</span>
            </div>
            <div className={styles.commentList}>
              {comments.length === 0
                ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No comments yet</div>
                : comments.map(c => (
                    <div key={c.id} className={styles.comment}>
                      <div className={styles.commentAvatar}>{getInitials(c.author_name)}</div>
                      <div className={styles.commentBody}>
                        <div className={styles.commentMeta}>
                          <span className={styles.commentAuthor}>{c.author_name}</span>
                          <span className={styles.commentTime}>{fmtDateTime(c.created_at)}</span>
                        </div>
                        <div className={styles.commentText}>
                          {c.content.split(' ').map((word, i) =>
                            word.startsWith('@')
                              ? <span key={i} className={styles.commentMention}>{word} </span>
                              : word + ' '
                          )}
                        </div>
                      </div>
                    </div>
                  ))
              }
            </div>
            <div className={styles.commentInput}>
              <textarea
                className={styles.commentField}
                placeholder="Add a comment... use @name to mention"
                rows={2}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment() } }}
              />
              <button className={styles.commentSend} onClick={sendComment}>
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Right ── */}
        <div className={styles.rightCol}>

          {/* Update Status */}
          <div className={styles.card}>
            <div className={styles.cardHead}><span className={styles.cardTitle}>Update Status</span></div>
            <div className={styles.cardBody}>
              <select className={styles.statusSelect}
                value={booking.status}
                onChange={e => updateStatus(e.target.value)}
                disabled={saving}>
                <option value="pending">Pending</option>
                <option value="dispatched">Dispatched</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Driver */}
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>Assigned Driver</span>
            </div>
            <div className={styles.cardBody}>
              {booking.drivers
                ? <div className={styles.personCard}
                    onClick={() => navigate(`/drivers/${booking.drivers.id}`)}>
                    <div className={styles.personAvatar}>
                      {booking.drivers.avatar_url
                        ? <img src={booking.drivers.avatar_url} alt="" />
                        : getInitials(booking.drivers.name)
                      }
                    </div>
                    <div>
                      <div className={styles.personName}>{booking.drivers.name}</div>
                      <div className={styles.personSub}>{booking.drivers.phone}</div>
                    </div>
                  </div>
                : <div className={styles.unassignedBox}>
                    <Truck size={28} color="var(--text-muted)" />
                    <div className={styles.unassignedText}>No driver assigned</div>
                    <button className={`${styles.actionBtn} ${styles.green}`}
                      onClick={() => { fetchDrivers(); setAssignModal(true) }}>
                      Assign Now
                    </button>
                  </div>
              }
            </div>
          </div>

          {/* Vehicle */}
          {booking.vehicles && (
            <div className={styles.card}>
              <div className={styles.cardHead}><span className={styles.cardTitle}>Vehicle</span></div>
              <div className={styles.cardBody}>
                <div className={styles.infoGrid}>
                  {[
                    { label: 'Company',   value: booking.vehicles.company_name },
                    { label: 'Category',  value: booking.vehicles.category },
                    { label: 'Plate',     value: booking.vehicles.plate_number },
                    { label: 'Color',     value: booking.vehicles.color },
                  ].map(({ label, value }) => (
                    <div key={label} className={styles.infoItem}>
                      <div className={styles.infoLabel}>{label}</div>
                      <div className={styles.infoValue} style={{ textTransform: 'capitalize' }}>{value || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Payment */}
          <div className={styles.card}>
            <div className={styles.cardHead}><span className={styles.cardTitle}>Payment</span></div>
            <div className={styles.cardBody}>
              {[
                { label: 'Fare',          value: fmtMoney(booking.fare) },
                { label: 'Driver Amount', value: fmtMoney(booking.driver_amount) },
                { label: 'Gross Amount',  value: fmtMoney(booking.gross_amount), total: true },
              ].map(({ label, value, total }) => (
                <div key={label} className={styles.payRow}>
                  <span className={styles.payLabel}>{label}</span>
                  <span className={`${styles.payValue} ${total ? styles.total : ''}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Assign Driver Modal ── */}
      <Modal open={assignModal} onClose={() => setAssignModal(false)} title="Assign Driver" width={500}>
        <div className={styles.driverList}>
          {drivers.length === 0
            ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No active drivers available</div>
            : drivers.map(d => (
                <div key={d.id}
                  className={`${styles.driverOption} ${selectedDriver?.id === d.id ? styles.selected : ''}`}
                  onClick={() => setSelected(d)}>
                  <div className={styles.commentAvatar} style={{ width: 38, height: 38, fontSize: 13 }}>
                    {getInitials(d.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {d.vehicles?.plate_number || 'No vehicle'} · {d.vehicles?.category || ''}
                    </div>
                  </div>
                  {selectedDriver?.id === d.id && (
                    <div style={{ width: 18, height: 18, background: 'var(--accent)', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: '#fff', fontSize: 11 }}>✓</span>
                    </div>
                  )}
                </div>
              ))
          }
        </div>
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className={styles.actionBtn} onClick={() => setAssignModal(false)}>Cancel</button>
          <button className={`${styles.actionBtn} ${styles.green}`}
            onClick={assignDriver} disabled={!selectedDriver || saving}>
            {saving ? 'Assigning...' : 'Confirm Assign'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
