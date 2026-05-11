// src/pages/bookings/NewBooking.jsx
import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, User, Car, CreditCard, X, Plus, AlertCircle, Search, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../hooks/useAuth'
import { fmtMoney, fmtDateTime, getInitials } from '../../utils/formatters'
import { RIDE_TYPES } from '../../utils/constants'
import CountryCitySelect from '../../components/shared/CountryCitySelect'
import { useCountry } from '../../hooks/useCountry'
import styles from './NewBooking.module.css'

const INITIAL = {
  pickup_address: '', dropoff_address: '', pickup_time: '',
  country: '', city: '', phone: '',
  ride_type: 'city_to_city',
  payment_method: 'cash', notes: '',
}

export default function NewBooking() {
  const navigate        = useNavigate()
  const { userProfile } = useAuth()
  const { selectedCountry } = useCountry()
  const pSearchRef      = useRef(null)
  const vSearchRef      = useRef(null)

  // Pre-fill country from TopBar selection
  const [form, setForm] = useState({
    ...INITIAL,
    country: selectedCountry && selectedCountry !== 'ALL' ? selectedCountry : '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // ── Passenger search ──────────────────────────────────────
  const [pQuery, setPQuery]     = useState('')
  const [pResults, setPResults] = useState([])
  const [selPassenger, setSelP] = useState(null)
  const [showPRes, setShowPRes] = useState(false)

  // ── Vehicle search ────────────────────────────────────────
  const [vQuery, setVQuery]         = useState('')
  const [vResults, setVResults]     = useState([])
  const [showVRes, setShowVRes]     = useState(false)
  const [selVehicle, setSelVehicle] = useState(null)
  const [selDriver, setSelDriver]   = useState(null)
  const [vehicleBusy, setVBusy]     = useState(null)

  // ── Payment ───────────────────────────────────────────────
  const [fare, setFare]   = useState('')
  const [comm, setComm]   = useState('')

  const fareNum      = parseFloat(fare) || 0
  const commNum      = parseFloat(comm) || 0
  const driverAmt    = fareNum > 0 && commNum > 0
    ? parseFloat((fareNum * (1 - commNum / 100)).toFixed(2)) : fareNum
  const platformAmt  = fareNum - driverAmt
  const grossAmt     = fareNum

  // ── Outside click handlers ────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (pSearchRef.current && !pSearchRef.current.contains(e.target)) setShowPRes(false)
      if (vSearchRef.current && !vSearchRef.current.contains(e.target)) setShowVRes(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // ── Passenger live search — same country only ────────────
  useEffect(() => {
    if (!pQuery || pQuery.length < 2) { setPResults([]); setShowPRes(false); return }
    const t = setTimeout(async () => {
      let q = supabase
        .from('passengers')
        .select('id, name, email, phone, city, country_code, unique_id')
        .or(`name.ilike.%${pQuery}%,email.ilike.%${pQuery}%,phone.ilike.%${pQuery}%,unique_id.ilike.%${pQuery}%`)
        .limit(8)
      // Filter by country if selected
      if (form.country) q = q.eq('country_code', form.country)
      const { data } = await q
      setPResults(data || [])
      setShowPRes(true)
    }, 300)
    return () => clearTimeout(t)
  }, [pQuery, form.country])

  // ── Vehicle live search — same country only ──────────────
  useEffect(() => {
    if (!vQuery || vQuery.length < 1) { setVResults([]); setShowVRes(false); return }
    const t = setTimeout(async () => {
      let q = supabase
        .from('vehicles')
        .select('id, company_name, plate_number, category, color, seat_capacity, country_code')
        .eq('status', 'active')
        .or(`plate_number.ilike.%${vQuery}%,company_name.ilike.%${vQuery}%,color.ilike.%${vQuery}%`)
        .limit(8)
      // Same country filter
      if (form.country) q = q.eq('country_code', form.country)
      const { data } = await q
      setVResults(data || [])
      setShowVRes(true)
    }, 200)
    return () => clearTimeout(t)
  }, [vQuery, form.country])

  // ── Select vehicle → auto-fetch driver + all busy checks ──
  const selectVehicle = async (v) => {
    setSelVehicle(v)
    setSelDriver(null)
    setVBusy(null)
    setVQuery('')
    setShowVRes(false)

    // 1. Check if vehicle is busy (active/dispatched booking)
    const { data: vBusy } = await supabase
      .from('bookings')
      .select('id, booking_ref, status, pickup_address')
      .eq('vehicle_id', v.id)
      .in('status', ['active', 'dispatched'])
      .limit(1)
    if (vBusy?.length) { setVBusy(vBusy[0]); return }

    // 2. Find driver linked to vehicle (same country)
    const { data: driver } = await supabase
      .from('drivers')
      .select('id, name, phone, email, rating, total_trips, city, country_code')
      .eq('vehicle_id', v.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!driver) { setSelDriver(null); return }

    // 3. Check if that driver is already dispatched on another ride
    const { data: driverBusy } = await supabase
      .from('bookings')
      .select('id, booking_ref, status')
      .eq('driver_id', driver.id)
      .in('status', ['active', 'dispatched'])
      .limit(1)

    if (driverBusy?.length) {
      // Driver busy — treat vehicle as busy
      setVBusy({ ...driverBusy[0], pickup_address: `Driver ${driver.name} is on ride ${driverBusy[0].booking_ref}` })
      return
    }

    setSelDriver(driver)
  }

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: '' }))
    // Reset passenger & vehicle when country changes
    if (k === 'country') {
      setSelP(null); setPQuery('')
      setSelVehicle(null); setSelDriver(null); setVBusy(null); setVQuery('')
    }
  }

  const validate = () => {
    const e = {}
    if (!selPassenger)               e.passenger      = 'Select a passenger'
    if (!selVehicle)                 e.vehicle        = 'Vehicle is required'
    if (!form.pickup_address.trim()) e.pickup_address = 'Pickup address required'
    if (!form.dropoff_address.trim())e.dropoff_address= 'Dropoff address required'
    if (!form.country)               e.country        = 'Country required'
    if (!form.city)                  e.city           = 'City required'
    if (!fareNum)                    e.fare           = 'Fare is required'
    return e
  }

  const handleSubmit = async (dispatch = false) => {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); toast.error('Please fix errors'); return }
    if (vehicleBusy) { toast.error(`Vehicle busy on ${vehicleBusy.booking_ref}`); return }
    if (!selDriver)  { toast.error('No driver assigned to this vehicle. Assign a driver first.'); return }

    setSaving(true)
    try {
      const status = dispatch ? 'dispatched' : 'pending'
      const { data, error } = await supabase.from('bookings').insert({
        passenger_id:    selPassenger.id,
        driver_id:       selDriver.id,
        vehicle_id:      selVehicle.id,
        pickup_address:  form.pickup_address,
        dropoff_address: form.dropoff_address,
        pickup_time:     form.pickup_time || null,
        city:            form.city,
        country_code:    form.country,
        ride_type:       form.ride_type,
        fare:            fareNum,
        driver_amount:   driverAmt,
        gross_amount:    grossAmt,
        payment_method:  form.payment_method,
        source:          'admin',
        notes:           form.notes || null,
        status,
        dispatched_by:   dispatch ? userProfile?.id : null,
        created_by:      userProfile?.id || null,
      }).select().single()

      if (error) throw error
      toast.success(dispatch ? 'Booking created & dispatched!' : 'Booking created!')
      navigate(`/bookings/${data.id}`)
    } catch (err) {
      toast.error('Failed to create booking')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const flag = (code) => code === 'PK' ? '🇵🇰' : code === 'US' ? '🇺🇸' : ''

  return (
    <div className={styles.page}>
      <button className={styles.backBtn} onClick={() => navigate('/bookings')}>
        <ArrowLeft size={14} /> Back to Bookings
      </button>
      <div className={styles.pageTitle}>New Booking</div>
      <div className={styles.pageSub}>Create and optionally dispatch a booking</div>

      <div className={styles.grid}>
        {/* ── LEFT ── */}
        <div>

          {/* 1. Trip Route — Country select karo pehle */}
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <div className={styles.cardIcon} style={{ background: 'var(--green-light)' }}><MapPin size={16} color="var(--green)" /></div>
              <span className={styles.cardTitle}>Trip Details <span style={{ color: 'var(--accent)' }}>*</span></span>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.formGrid}>
                <div className={`${styles.field} ${styles.formGridFull}`}>
                  <label className={styles.label}>Ride Type</label>
                  <select className={styles.select} value={form.ride_type} onChange={e => set('ride_type', e.target.value)}>
                    {RIDE_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>

                <CountryCitySelect country={form.country} city={form.city} phone="" onChange={set} errors={errors} required showPhone={false} />

                {form.country && (
                  <div className={`${styles.field} ${styles.formGridFull}`} style={{ background: form.country === 'PK' ? 'rgba(0,130,0,0.05)' : 'rgba(0,0,200,0.04)', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {form.country === 'PK' ? '🇵🇰' : '🇺🇸'} Booking will use <strong>{form.country === 'PK' ? 'Pakistan' : 'USA'}</strong> passengers, vehicles and drivers only
                    </div>
                  </div>
                )}

                <div className={`${styles.field} ${styles.formGridFull}`}>
                  <label className={styles.label}>Pickup Address <span className={styles.required}>*</span></label>
                  <input className={`${styles.input} ${errors.pickup_address ? styles.error : ''}`}
                    placeholder="Full pickup address" value={form.pickup_address}
                    onChange={e => set('pickup_address', e.target.value)} />
                  {errors.pickup_address && <span className={styles.errorMsg}>{errors.pickup_address}</span>}
                </div>

                <div className={`${styles.field} ${styles.formGridFull}`}>
                  <label className={styles.label}>Dropoff Address <span className={styles.required}>*</span></label>
                  <input className={`${styles.input} ${errors.dropoff_address ? styles.error : ''}`}
                    placeholder="Full dropoff address" value={form.dropoff_address}
                    onChange={e => set('dropoff_address', e.target.value)} />
                  {errors.dropoff_address && <span className={styles.errorMsg}>{errors.dropoff_address}</span>}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Pickup Time</label>
                  <input type="datetime-local" className={styles.input}
                    value={form.pickup_time} onChange={e => set('pickup_time', e.target.value)} />
                </div>

                <div className={`${styles.field} ${styles.formGridFull}`}>
                  <label className={styles.label}>Notes</label>
                  <textarea className={styles.textarea} placeholder="Special instructions..."
                    value={form.notes} onChange={e => set('notes', e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Passenger — disabled until country selected */}
          <div className={styles.card} style={{ opacity: form.country ? 1 : 0.5, pointerEvents: form.country ? 'all' : 'none' }}>
            <div className={styles.cardHead}>
              <div className={styles.cardIcon} style={{ background: 'var(--blue-light)' }}><User size={16} color="var(--blue)" /></div>
              <span className={styles.cardTitle}>Passenger <span style={{ color: 'var(--accent)' }}>*</span></span>
              {!form.country && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>Select country first</span>}
            </div>
            <div className={styles.cardBody}>
              {selPassenger
                ? <div className={styles.selectedPassenger}>
                    <div className={styles.searchAvatar}>{getInitials(selPassenger.name)}</div>
                    <div style={{ flex: 1 }}>
                      <div className={styles.selectedName}>{selPassenger.name}</div>
                      <div className={styles.selectedSub}>
                        {flag(selPassenger.country_code)} {selPassenger.phone}
                        {selPassenger.email && ` · ${selPassenger.email}`}
                        {selPassenger.unique_id && <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--accent)', fontWeight: 700, background: 'var(--accent-light)', padding: '1px 6px', borderRadius: 99 }}>{selPassenger.unique_id}</span>}
                      </div>
                    </div>
                    <button className={styles.clearSelection} onClick={() => { setSelP(null); setPQuery('') }}><X size={14} /></button>
                  </div>
                : <div ref={pSearchRef} className={styles.field}>
                    <label className={styles.label}>Search by name, phone, email or ID</label>
                    <div className={styles.searchWrap}>
                      <input
                        className={`${styles.input} ${errors.passenger ? styles.error : ''}`}
                        placeholder={form.country ? `Search ${form.country === 'PK' ? '🇵🇰 Pakistan' : '🇺🇸 USA'} passengers...` : 'Select country first...'}
                        value={pQuery}
                        onChange={e => setPQuery(e.target.value)}
                        onFocus={() => pResults.length && setShowPRes(true)}
                        autoComplete="off"
                      />
                      {showPRes && (
                        <div className={styles.searchResults}>
                          {pResults.length === 0
                            ? <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>No passengers found</div>
                            : pResults.map(p => (
                                <div key={p.id} className={styles.searchItem}
                                  onMouseDown={e => { e.preventDefault(); setSelP(p); setPQuery(''); setShowPRes(false); setErrors(er => ({ ...er, passenger: '' })) }}>
                                  <div className={styles.searchAvatar}>{getInitials(p.name)}</div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className={styles.searchName}>{p.name}</div>
                                    <div className={styles.searchEmail}>
                                      {flag(p.country_code)} {p.phone}{p.email && ` · ${p.email}`}
                                      {p.unique_id && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--accent)', fontWeight: 700 }}>{p.unique_id}</span>}
                                    </div>
                                  </div>
                                </div>
                              ))
                          }
                        </div>
                      )}
                    </div>
                    {errors.passenger && <span className={styles.errorMsg}>{errors.passenger}</span>}
                  </div>
              }
            </div>
          </div>

          {/* 2. Vehicle — disabled until country selected */}
          <div className={styles.card} style={{ opacity: form.country ? 1 : 0.5, pointerEvents: form.country ? 'all' : 'none' }}>
            <div className={styles.cardHead}>
              <div className={styles.cardIcon} style={{ background: 'var(--accent-light)' }}><Car size={16} color="var(--accent)" /></div>
              <span className={styles.cardTitle}>Vehicle <span style={{ color: 'var(--accent)' }}>*</span></span>
              {!form.country && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>Select country first</span>}
            </div>
            <div className={styles.cardBody}>

              {/* Vehicle search */}
              {!selVehicle
                ? <div ref={vSearchRef} className={styles.field}>
                    <label className={styles.label}>Search by plate, make or color</label>
                    <div className={styles.searchWrap}>
                      <input
                        className={`${styles.input} ${errors.vehicle ? styles.error : ''}`}
                        placeholder={form.country ? `Search ${form.country === 'PK' ? '🇵🇰' : '🇺🇸'} vehicles...` : 'Select country first...'}
                        value={vQuery}
                        onChange={e => setVQuery(e.target.value)}
                        onFocus={() => vResults.length && setShowVRes(true)}
                        autoComplete="off"
                      />
                      {showVRes && (
                        <div className={styles.searchResults}>
                          {vResults.length === 0
                            ? <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>No vehicles found</div>
                            : vResults.map(v => (
                                <div key={v.id} className={styles.searchItem}
                                  onMouseDown={e => { e.preventDefault(); selectVehicle(v); setErrors(er => ({ ...er, vehicle: '' })) }}>
                                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-main)', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Car size={16} color="var(--text-muted)" />
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div className={styles.searchName} style={{ fontFamily: 'var(--font-display)', letterSpacing: 0.3 }}>{v.plate_number}</div>
                                    <div className={styles.searchEmail}>{v.company_name} · {v.category} · {v.color} · {v.seat_capacity} seats</div>
                                  </div>
                                </div>
                              ))
                          }
                        </div>
                      )}
                    </div>
                    {errors.vehicle && <span className={styles.errorMsg}>{errors.vehicle}</span>}
                  </div>
                : <>
                    {/* Vehicle busy warning */}
                    {vehicleBusy && (
                      <div style={{ background: 'rgba(239,68,68,0.07)', border: '1.5px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 14, display: 'flex', gap: 10 }}>
                        <AlertCircle size={16} color="#EF4444" style={{ flexShrink: 0, marginTop: 2 }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#EF4444', marginBottom: 4 }}>Vehicle is busy</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            Active on <strong>{vehicleBusy.booking_ref}</strong> · {vehicleBusy.status}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{vehicleBusy.pickup_address}</div>
                          <button onClick={() => navigate(`/bookings/${vehicleBusy.id}`)}
                            style={{ marginTop: 6, fontSize: 12, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                            View booking →
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Vehicle details */}
                    <div style={{ background: vehicleBusy ? 'rgba(239,68,68,0.04)' : 'var(--green-light)', border: `1px solid ${vehicleBusy ? 'rgba(239,68,68,0.15)' : 'rgba(61,184,122,0.25)'}`, borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <div style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Car size={18} color="var(--text-secondary)" />
                          </div>
                          <div>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: 0.3 }}>{selVehicle.plate_number}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{selVehicle.company_name} · {selVehicle.category}</div>
                          </div>
                        </div>
                        <button onClick={() => { setSelVehicle(null); setSelDriver(null); setVBusy(null); setVQuery('') }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                          <X size={14} />
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        {[
                          { l: 'Color',    v: selVehicle.color         },
                          { l: 'Seats',    v: selVehicle.seat_capacity },
                          { l: 'Category', v: selVehicle.category      },
                        ].map(({ l, v }) => (
                          <div key={l}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>{l}</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{v || '—'}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Driver auto-assigned */}
                    {selDriver
                      ? <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 10 }}>
                          <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                            {getInitials(selDriver.name)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{selDriver.name}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)', background: 'var(--green-light)', padding: '2px 8px', borderRadius: 99 }}>Driver</span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                              {selDriver.phone}
                              {selDriver.rating && ` · ⭐ ${selDriver.rating}`}
                              {selDriver.total_trips > 0 && ` · ${selDriver.total_trips} trips`}
                            </div>
                          </div>
                        </div>
                      : !vehicleBusy && (
                          <div style={{ padding: '12px 14px', background: 'var(--amber-light)', border: '1px solid rgba(245,166,35,0.25)', borderRadius: 10, fontSize: 13, color: 'var(--amber)', display: 'flex', gap: 8, alignItems: 'center' }}>
                            <AlertCircle size={14} />
                            No driver assigned to this vehicle. Go to Drivers → assign this vehicle first.
                          </div>
                        )
                    }
                  </>
              }
            </div>
          </div>

          {/* 3. Payment */}
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <div className={styles.cardIcon} style={{ background: 'var(--green-light)' }}><CreditCard size={16} color="var(--green)" /></div>
              <span className={styles.cardTitle}>Payment</span>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label className={styles.label}>Fare <span className={styles.required}>*</span></label>
                  <input type="number" step="0.01" min="0"
                    className={`${styles.input} ${errors.fare ? styles.error : ''}`}
                    placeholder="0.00" value={fare}
                    onChange={e => { setFare(e.target.value); setErrors(er => ({ ...er, fare: '' })) }} />
                  {errors.fare && <span className={styles.errorMsg}>{errors.fare}</span>}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Platform Commission %</label>
                  <div style={{ position: 'relative' }}>
                    <input type="number" step="1" min="0" max="100" className={styles.input}
                      placeholder="e.g. 20" value={comm} onChange={e => setComm(e.target.value)}
                      style={{ paddingRight: 36 }} />
                    <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text-muted)', fontWeight: 700 }}>%</span>
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Payment Method</label>
                  <select className={styles.select} value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="online">Online</option>
                    <option value="corporate">Corporate</option>
                  </select>
                </div>

                {fareNum > 0 && (
                  <div className={`${styles.field} ${styles.formGridFull}`}>
                    <div style={{ background: 'var(--bg-main)', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        { label: 'Fare',                          value: fmtMoney(fareNum),    color: 'var(--text-primary)' },
                        { label: `Driver Amount (${100 - commNum}%)`, value: fmtMoney(driverAmt), color: 'var(--green)'    },
                        { label: `Platform Commission (${commNum}%)`, value: fmtMoney(platformAmt),color: 'var(--accent)'  },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color }}>{value}</span>
                        </div>
                      ))}
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Gross Total</span>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--text-primary)' }}>{fmtMoney(grossAmt)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT — Summary ── */}
        <div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryHead}>Booking Summary</div>
            <div className={styles.summaryBody}>
              {[
                { label: 'Passenger', value: selPassenger?.name || '—'  },
                { label: 'P-ID',      value: selPassenger?.unique_id || '—' },
                { label: 'Vehicle',   value: selVehicle ? `${selVehicle.plate_number}` : '—' },
                { label: 'Driver',    value: selDriver?.name || '—'     },
                { label: 'Ride Type', value: RIDE_TYPES.find(r => r.value === form.ride_type)?.label || '—' },
                { label: 'Country',   value: form.country === 'PK' ? '🇵🇰 Pakistan' : form.country === 'US' ? '🇺🇸 USA' : '—' },
                { label: 'City',      value: form.city || '—'           },
                { label: 'Payment',   value: form.payment_method || '—' },
              ].map(({ label, value }) => (
                <div key={label} className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>{label}</span>
                  <span className={styles.summaryValue} style={{ textTransform: 'capitalize' }}>{value}</span>
                </div>
              ))}

              <div className={styles.divider} />

              {[
                { label: 'Fare',         value: fmtMoney(fareNum),    color: 'var(--text-primary)' },
                { label: 'Driver Payout',value: fmtMoney(driverAmt),  color: 'var(--green)'        },
                { label: 'Commission',   value: fmtMoney(platformAmt),color: 'var(--accent)'       },
              ].map(({ label, value, color }) => (
                <div key={label} className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>{label}</span>
                  <span className={styles.summaryValue} style={{ color }}>{value}</span>
                </div>
              ))}

              <div className={styles.summaryTotal}>
                <div className={styles.totalLabel}>Gross Amount</div>
                <div className={styles.totalAmount}>{fmtMoney(grossAmt)}</div>
              </div>

              {vehicleBusy && (
                <div style={{ marginTop: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#EF4444', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                  Vehicle busy on {vehicleBusy.booking_ref}
                </div>
              )}

              {/* Save as Pending */}
              <button className={styles.submitBtn}
                style={{ background: 'var(--text-secondary)', marginTop: 14 }}
                onClick={() => handleSubmit(false)} disabled={saving || !!vehicleBusy}>
                {saving ? <span className={styles.spinner} /> : <><Plus size={15} /> Save as Pending</>}
              </button>

              {/* Dispatch Now */}
              <button className={styles.submitBtn}
                style={{ background: 'var(--green)', marginTop: 8 }}
                onClick={() => handleSubmit(true)} disabled={saving || !!vehicleBusy || !selDriver}>
                {saving ? <span className={styles.spinner} /> : <><Send size={15} /> Create & Dispatch</>}
              </button>

              {!selDriver && selVehicle && !vehicleBusy && (
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--amber)', textAlign: 'center' }}>
                  Assign a driver to vehicle before dispatching
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
