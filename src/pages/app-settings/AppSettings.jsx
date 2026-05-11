// src/pages/app-settings/AppSettings.jsx
import { useEffect, useState } from 'react'
import { Send, Users, Truck, Bell, RefreshCw, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../hooks/useAuth'
import { fmtDateTime } from '../../utils/formatters'

const INIT = { title: '', message: '', target_type: 'all_passengers', target_filter: {} }

export default function AppSettings() {
  const { userProfile } = useAuth()
  const [tab, setTab]           = useState('passenger')
  const [form, setForm]         = useState(INIT)
  const [sending, setSending]   = useState(false)
  const [history, setHistory]   = useState([])
  const [loadingHist, setLoadH] = useState(true)

  // Filters for driver notifications
  const [driverCity, setDCity]  = useState('')
  const [driverCat, setDCat]    = useState('')

  useEffect(() => { fetchHistory() }, [tab])

  const fetchHistory = async () => {
    setLoadH(true)
    const targetTypes = tab === 'passenger'
      ? ['all_passengers', 'city']
      : ['all_drivers', 'category', 'city_driver']

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    setHistory(data || [])
    setLoadH(false)
  }

  const handleSend = async () => {
    if (!form.title.trim()) { toast.error('Title required'); return }
    if (!form.message.trim()) { toast.error('Message required'); return }

    setSending(true)
    try {
      const target_filter = {}
      if (tab === 'driver') {
        if (driverCat)  target_filter.category = driverCat
        if (driverCity) target_filter.city      = driverCity
      }

      const target_type = tab === 'passenger' ? 'all_passengers' : driverCat ? 'category' : 'all_drivers'

      const { error } = await supabase.from('notifications').insert({
        title:         form.title,
        message:       form.message,
        target_type,
        target_filter,
        status:        'sent',
        sent_by:       userProfile?.id || null,
        sent_count:    0,
      })
      if (error) throw error
      toast.success('Notification sent!')
      setForm(INIT)
      setDCity(''); setDCat('')
      fetchHistory()
    } catch { toast.error('Failed to send notification') }
    finally { setSending(false) }
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', height: 42, padding: '0 14px',
    border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)',
    background: 'var(--bg-main)', fontSize: 14, fontFamily: 'var(--font-body)',
    color: 'var(--text-primary)', outline: 'none',
  }

  const labelStyle = {
    fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block',
  }

  return (
    <div style={{ padding: 28, width: '100%', boxSizing: 'border-box', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: -0.5 }}>
          App Communications
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
          Send in-app notifications to passengers and drivers
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 4, width: 'fit-content' }}>
        {[
          { key: 'passenger', label: 'Passenger App', icon: Users },
          { key: 'driver',    label: 'Driver App',    icon: Truck },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ height: 36, padding: '0 18px', borderRadius: 8, border: 'none', background: tab === key ? 'var(--accent)' : 'transparent', color: tab === key ? '#fff' : 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Compose */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={16} color="var(--accent)" />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              Compose Notification
            </div>
          </div>

          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Target — Driver only filters */}
            {tab === 'driver' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Vehicle Category</label>
                  <select style={inputStyle} value={driverCat} onChange={e => setDCat(e.target.value)}>
                    <option value="">All Categories</option>
                    <option value="sedan">Sedan</option>
                    <option value="suv">SUV</option>
                    <option value="van">Van</option>
                    <option value="luxury">Luxury</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>City</label>
                  <select style={inputStyle} value={driverCity} onChange={e => setDCity(e.target.value)}>
                    <option value="">All Cities</option>
                    <option value="lahore">Lahore</option>
                    <option value="karachi">Karachi</option>
                    <option value="islamabad">Islamabad</option>
                    <option value="atlanta">Atlanta</option>
                  </select>
                </div>
              </div>
            )}

            <div>
              <label style={labelStyle}>Notification Title <span style={{ color: 'var(--accent)' }}>*</span></label>
              <input style={inputStyle} placeholder="e.g. New Promo Available!"
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            </div>

            <div>
              <label style={labelStyle}>Message <span style={{ color: 'var(--accent)' }}>*</span></label>
              <textarea style={{ ...inputStyle, height: 100, padding: '12px 14px', resize: 'vertical' }}
                placeholder="Write your notification message here..."
                value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            </div>

            {/* Preview */}
            {(form.title || form.message) && (
              <div style={{ background: '#111', borderRadius: 16, padding: 16, color: '#fff' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                  📱 Preview — {tab === 'passenger' ? 'Passenger' : 'Driver'} App
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Bell size={18} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{form.title || 'Notification Title'}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{form.message || 'Message preview...'}</div>
                  </div>
                </div>
              </div>
            )}

            <button onClick={handleSend} disabled={sending}
              style={{ height: 44, background: sending ? 'var(--border)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, cursor: sending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' }}>
              {sending
                ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Sending...</>
                : <><Send size={15} /> Send to {tab === 'passenger' ? 'All Passengers' : driverCat ? `${driverCat.toUpperCase()} Drivers` : 'All Drivers'}</>
              }
            </button>
          </div>
        </div>

        {/* History */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              Sent History
            </div>
            <button onClick={fetchHistory}
              style={{ width: 30, height: 30, border: '1.5px solid var(--border)', borderRadius: 7, background: 'var(--bg-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw size={12} />
            </button>
          </div>

          <div style={{ maxHeight: 460, overflowY: 'auto' }}>
            {loadingHist
              ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>
              : history.length === 0
              ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  <Bell size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                  <div>No notifications sent yet</div>
                </div>
              : history.map(n => (
                  <div key={n.id} style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{n.title}</div>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: n.target_type.includes('driver') ? 'var(--blue-light)' : 'var(--green-light)', color: n.target_type.includes('driver') ? 'var(--blue)' : 'var(--green)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {n.target_type.replace('_', ' ')}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.5 }}>{n.message}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDateTime(n.created_at)}</span>
                      <div style={{ display: 'flex', gap: 12, marginLeft: 'auto' }}>
                        {[
                          { label: 'Sent',    value: n.sent_count  },
                          { label: 'Opened',  value: n.open_count  },
                          { label: 'Clicked', value: n.click_count },
                        ].map(({ label, value }) => (
                          <div key={label} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{value || 0}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}
