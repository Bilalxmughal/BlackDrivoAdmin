// src/components/layout/TopBar.jsx
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Settings, User, LogOut, Bell, ChevronDown, Lock } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { useCountry } from '../../hooks/useCountry'
import { logoutUser } from '../../supabase/auth'
import styles from './TopBar.module.css'

const ALL_COUNTRIES = [
  { code: 'PK', label: 'Pakistan',     },
  { code: 'US', label: 'United States',},
]

export default function TopBar({ sidebarCollapsed }) {
  const { user, userProfile }                             = useAuth()
  const { selectedCountry, setSelectedCountry, canSwitch, allowedCountries } = useCountry()
  const navigate = useNavigate()
  const [dropOpen, setDropOpen]       = useState(false)
  const [countryOpen, setCountryOpen] = useState(false)
  const dropRef    = useRef(null)
  const countryRef = useRef(null)

  const now     = new Date()
  const dayStr  = format(now, 'EEEE')
  const dateStr = format(now, 'dd MMMM yyyy')

  useEffect(() => {
    const h = (e) => {
      if (dropRef.current    && !dropRef.current.contains(e.target))    setDropOpen(false)
      if (countryRef.current && !countryRef.current.contains(e.target)) setCountryOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleLogout = async () => {
    setDropOpen(false)
    try {
      await logoutUser()
      sessionStorage.removeItem('bd_country')
      toast.success('Logged out')
      navigate('/login')
    } catch { toast.error('Logout failed') }
  }

  const getInitials = (name = '') =>
    name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'A'

  const displayName = userProfile?.name || user?.email?.split('@')[0] || 'Admin'
  const displayRole = (userProfile?.role || 'admin').replace('_', ' ')

  // Current country info
  const currentC = ALL_COUNTRIES.find(c => c.code === selectedCountry) || ALL_COUNTRIES[0]

  // Countries available in topbar — only user's allowed countries
  const switchOptions = ALL_COUNTRIES.filter(c => allowedCountries.includes(c.code))

  const left = sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)'

  return (
    <header className={styles.topbar} style={{ left }}>
      <div className={styles.left}>
        <div className={styles.dateDay}>{dayStr}</div>
        <div className={styles.dateMain}>{dateStr}</div>
      </div>

      <div className={styles.right}>

        {/* ── Country Badge / Switcher ── */}
        <div className={styles.dropdownWrap} ref={countryRef}>
          {canSwitch ? (
            <button className={styles.userBtn}
              onClick={() => setCountryOpen(!countryOpen)}
              style={{ padding: '4px 14px', gap: 10, minWidth: 160 }}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>{currentC?.flag}</span>
              <div className={styles.userInfo}>
                <span className={styles.userName} style={{ fontSize: 13 }}>{currentC?.label}</span>
                <span className={styles.userRole}>Active Region</span>
              </div>
              <ChevronDown size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </button>
          ) : (
            /* Locked — single country */
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '6px 14px', borderRadius: 'var(--radius-full)',
              border: '1.5px solid var(--border)', background: 'var(--bg-main)',
            }}>
              <span style={{ fontSize: 20 }}>{currentC?.flag}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  {currentC?.label}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Lock size={9} /> Region Locked
                </div>
              </div>
            </div>
          )}

          {/* Dropdown — only allowed countries */}
          {canSwitch && countryOpen && (
            <div className={styles.dropdown} style={{ minWidth: 200 }}>
              <div style={{ padding: '8px 12px 4px', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                Switch Region
              </div>
              {switchOptions.map(c => (
                <button key={c.code} className={styles.dropItem}
                  style={{
                    fontWeight: selectedCountry === c.code ? 700 : 400,
                    color: selectedCountry === c.code ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                  onClick={() => { setSelectedCountry(c.code); setCountryOpen(false) }}>
                  <span style={{ fontSize: 16 }}>{c.flag}</span>
                  {c.label}
                  {selectedCountry === c.code && (
                    <span style={{ marginLeft: 'auto', color: 'var(--accent)' }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search */}
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input className={styles.searchInput} placeholder="Search anything..." />
        </div>

        {/* Bell */}
        <button className={styles.iconBtn} onClick={() => navigate('/activity-log')}>
          <Bell size={16} />
          <span className={styles.notifDot} />
        </button>

        {/* Settings */}
        <button className={styles.iconBtn} onClick={() => navigate('/roles')}>
          <Settings size={16} />
        </button>

        {/* User */}
        <div className={styles.dropdownWrap} ref={dropRef}>
          <button className={styles.userBtn} onClick={() => setDropOpen(!dropOpen)}>
            <div className={styles.avatar}>
              {userProfile?.avatar_url
                ? <img src={userProfile.avatar_url} alt={displayName} />
                : getInitials(displayName)
              }
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{displayName}</span>
              <span className={styles.userRole}>{displayRole}</span>
            </div>
          </button>

          {dropOpen && (
            <div className={styles.dropdown}>
              <button className={styles.dropItem} onClick={() => { navigate('/profile'); setDropOpen(false) }}>
                <User size={14} /> My Profile
              </button>
              <button className={styles.dropItem} onClick={() => { navigate('/roles'); setDropOpen(false) }}>
                <Settings size={14} /> Settings
              </button>
              <div className={styles.dropDivider} />
              <button className={`${styles.dropItem} ${styles.danger}`} onClick={handleLogout}>
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
