// src/pages/bookings/DispatchMap.jsx
import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { RefreshCw, Navigation, Phone, Eye, Send, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../supabase/client'
import { useCountry } from '../../hooks/useCountry'
import Badge from '../../components/shared/Badge'
import { fmtDateTime, getInitials } from '../../utils/formatters'

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const makeIcon = (color, size = 14) => L.divIcon({
  className: '',
  html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35);"></div>`,
  iconSize:   [size, size],
  iconAnchor: [size/2, size/2],
})

const ICONS = {
  active:     makeIcon('#3DB87A', 16),
  dispatched: makeIcon('#E8533A', 14),
  pending:    makeIcon('#F5A623', 12),
  completed:  makeIcon('#3B82F6', 12),
}
const getIcon = (status) => ICONS[status] || ICONS.pending

// Centers per country
const MAP_CENTERS = {
  PK:  [30.3753, 69.3451],
  US:  [37.0902, -95.7129],
  ALL: [20, 0],
}

export default function DispatchMap() {
  const navigate = useNavigate()
  const { selectedCountry } = useCountry()
  const [tab, setTab]           = useState('dispatched') // 'dispatched' | 'pending' | 'active'
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(null)
  const [updatingId, setUpdId]  = useState(null)
  const channelRef              = useRef(null)

  const center = MAP_CENTERS[selectedCountry] || MAP_CENTERS.ALL

  // ── Fetch bookings ─────────────────────────────────────────
  const fetchBookings = async () => {
    setLoading(true)
    try {
      const statusMap = {
        dispatched: ['dispatched'],
        pending:    ['pending'],
        active:     ['active'],
      }
      const statuses = statusMap[tab] || ['dispatched']

      let q = supabase
        .from('bookings')
        .select(`
          id, booking_ref, status, pickup_address, dropoff_address,
          pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
          created_at, ride_type, fare, city, country_code,
          passengers ( name, phone, unique_id ),
          drivers    ( name, phone ),
          vehicles   ( plate_number, category, color )
        `)
        .in('status', statuses)
        .order('created_at', { ascending: false })
        .limit(100)

      if (selectedCountry !== 'ALL') q = q.eq('country_code', selectedCountry)

      const { data, error } = await q
      if (error) throw error
      setBookings(data || [])
    } catch {
      toast.error('Failed to load dispatch data')
    } finally {
      setLoading(false)
    }
  }

  // ── Realtime subscription ─────────────────────────────────
  useEffect(() => {
    // Clean up previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    fetchBookings()

    // Subscribe to bookings table changes
    const channel = supabase
      .channel(`dispatch-map-${tab}-${selectedCountry}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings',
      }, (payload) => {
        // Refetch on any change
        fetchBookings()
        if (payload.eventType === 'UPDATE') {
          const b = payload.new
          if (['active', 'completed', 'cancelled'].includes(b.status)) {
            toast(`Booking ${b.booking_ref} → ${b.status}`, { icon: '🔄' })
          }
        }
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [tab, selectedCountry])

  // ── Status update ─────────────────────────────────────────
  const updateStatus = async (bookingId, newStatus) => {
    setUpdId(bookingId)
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId)
      if (error) throw error
      toast.success(`Status → ${newStatus}`)
      // Realtime will trigger refresh, but also do manual refresh
      await fetchBookings()
      if (selected?.id === bookingId) setSelected(s => ({ ...s, status: newStatus }))
    } catch {
      toast.error('Status update failed')
    } finally {
      setUpdId(null)
    }
  }

  const tabBtnStyle = (active) => ({
    height: 34, padding: '0 16px', borderRadius: 8, border: 'none',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--text-secondary)',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'var(--font-body)', transition: 'all 0.15s',
    display: 'flex', alignItems: 'center', gap: 6,
  })

  const TABS = [
    { key: 'pending',    label: 'Pending',    icon: Clock,       color: '#F5A623' },
    { key: 'dispatched', label: 'Dispatched', icon: Send,        color: 'var(--accent)' },
    { key: 'active',     label: 'Active',     icon: Navigation,  color: 'var(--green)' },
  ]

  return (
    <div style={{ padding: 28, width: '100%', boxSizing: 'border-box', animation: 'fadeIn 0.3s ease' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: -0.5 }}>
            Dispatch Map
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
            Live fleet overview
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
            Realtime
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 4 }}>
            {TABS.map(t => (
              <button key={t.key} style={tabBtnStyle(tab === t.key)} onClick={() => { setTab(t.key); setSelected(null) }}>
                <t.icon size={13} />
                {t.label}
                <span style={{ fontSize: 11, background: tab === t.key ? 'rgba(255,255,255,0.25)' : 'var(--bg-main)', padding: '1px 6px', borderRadius: 99, fontWeight: 700 }}>
                  {bookings.length}
                </span>
              </button>
            ))}
          </div>

          <button onClick={fetchBookings}
            style={{ width: 36, height: 36, borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Map + Sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, height: 'calc(100vh - 220px)' }}>

        {/* Map */}
        <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <MapContainer center={center} zoom={selectedCountry === 'ALL' ? 2 : 5}
            style={{ width: '100%', height: '100%' }} zoomControl>
            <TileLayer
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {bookings.filter(b => b.pickup_lat && b.pickup_lng).map(b => (
              <Marker key={b.id} position={[b.pickup_lat, b.pickup_lng]}
                icon={getIcon(b.status)}
                eventHandlers={{ click: () => setSelected(b) }}>
                <Popup>
                  <div style={{ fontFamily: 'var(--font-body)', minWidth: 200 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: '#111' }}>{b.booking_ref}</div>
                    <div style={{ fontSize: 12, color: '#555', marginBottom: 2 }}>👤 {b.passengers?.name || '—'}</div>
                    <div style={{ fontSize: 12, color: '#555', marginBottom: 2 }}>🚗 {b.drivers?.name || 'Unassigned'}</div>
                    <div style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>📍 {b.pickup_address}</div>
                    <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, textTransform: 'capitalize', background: '#f0fdf4', color: '#16a34a' }}>
                      {b.status}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Sidebar */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* List header */}
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
              {tab} Bookings
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {loading ? 'Loading...' : `${bookings.length} bookings`}
            </div>
          </div>

          {/* Booking list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {!loading && bookings.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No {tab} bookings
              </div>
            )}

            {bookings.map(b => (
              <div key={b.id} onClick={() => setSelected(b === selected ? null : b)}
                style={{
                  padding: '12px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  background: selected?.id === b.id ? 'var(--accent-light)' : 'transparent',
                  transition: 'background 0.15s',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
                    {b.booking_ref}
                  </span>
                  <Badge status={b.status} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                  {b.passengers?.name || 'Unknown'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 3 }}>
                  🚗 {b.drivers?.name || 'Unassigned'} · {b.vehicles?.plate_number || '—'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.pickup_address}
                </div>

                {/* Pending tab: Quick dispatch button */}
                {tab === 'pending' && (
                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/bookings/${b.id}`) }}
                    style={{ marginTop: 8, width: '100%', height: 30, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'var(--font-body)' }}>
                    <Send size={11} /> Open & Dispatch
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Selected detail panel */}
          {selected && (
            <div style={{ borderTop: '2px solid var(--accent)', background: 'var(--accent-light)', padding: 14, flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
                {selected.booking_ref}
              </div>

              {/* Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                {selected.passengers?.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Phone size={11} /> {selected.passengers.phone}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Navigation size={11} /> {selected.pickup_address}
                </div>
                {selected.vehicles && (
                  <div>🚗 {selected.vehicles.plate_number} · {selected.vehicles.category} · {selected.vehicles.color}</div>
                )}
                {selected.fare && (
                  <div>💵 ${selected.fare}</div>
                )}
              </div>

              {/* Status Actions — Super/Admin can update manually */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { status: 'dispatched', label: '📡 Mark Dispatched', show: ['pending'] },
                  { status: 'active',     label: '▶ Mark Active',      show: ['dispatched', 'pending'] },
                  { status: 'completed',  label: '✅ Mark Completed',   show: ['active', 'dispatched'] },
                  { status: 'cancelled',  label: '✕ Cancel Ride',      show: ['pending', 'dispatched'] },
                ].filter(a => a.show.includes(selected.status)).map(({ status, label }) => (
                  <button key={status}
                    onClick={() => updateStatus(selected.id, status)}
                    disabled={updatingId === selected.id}
                    style={{
                      height: 32, background: status === 'completed' ? 'var(--green)' : status === 'cancelled' ? '#EF4444' : status === 'active' ? 'var(--blue)' : 'var(--accent)',
                      color: '#fff', border: 'none', borderRadius: 7,
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      opacity: updatingId === selected.id ? 0.7 : 1,
                      fontFamily: 'var(--font-body)',
                    }}>
                    {updatingId === selected.id ? '...' : label}
                  </button>
                ))}

                <button onClick={() => navigate(`/bookings/${selected.id}`)}
                  style={{ height: 32, background: '#111', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'var(--font-body)' }}>
                  <Eye size={12} /> Full Details
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
        {[
          { color: '#F5A623', label: 'Pending'    },
          { color: '#E8533A', label: 'Dispatched' },
          { color: '#3DB87A', label: 'Active'     },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
