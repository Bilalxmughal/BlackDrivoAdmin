// src/pages/auth/Login.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../supabase/client'
import { useCountry } from '../../hooks/useCountry'
import styles from './Auth.module.css'

const COUNTRY_OPTIONS = [
  { code: 'PK', label: 'Pakistan',      flag: '🇵🇰', cities: 'Lahore, Karachi, Islamabad' },
  { code: 'US', label: 'United States', flag: '🇺🇸', cities: 'Atlanta, New York, Chicago & more' },
]

export default function Login() {
  const navigate = useNavigate()
  const { initCountry } = useCountry()

  const [step, setStep]           = useState('credentials') // 'credentials' | 'country'
  const [form, setForm]           = useState({ email: '', password: '' })
  const [showPass, setShowPass]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [errors, setErrors]       = useState({})
  const [profile, setProfile]     = useState(null)
  const [selCountry, setSelCountry] = useState('')

  const validate = () => {
    const e = {}
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
    if (!form.password) e.password = 'Password is required'
    return e
  }

  // ── Step 1: Verify credentials ────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email, password: form.password,
      })
      if (error) throw error

      // Fetch user profile
      const { data: prof } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle()

      if (!prof) {
        await supabase.auth.signOut()
        toast.error('Account not set up. Contact your administrator.')
        setLoading(false)
        return
      }

      setProfile(prof)

      // Parse allowed countries
      const access = prof.country_access || 'US'
      const allowed = access === 'ALL'
        ? ['PK', 'US']
        : access.split(',').map(c => c.trim()).filter(Boolean)

      if (allowed.length === 1) {
        // Single country — skip country select, go directly
        initCountry(access)
        await supabase.from('users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', data.user.id)
        toast.success(`Welcome, ${prof.name}!`)
        navigate('/dashboard')
      } else {
        // Multiple countries — show country picker
        setStep('country')
      }
    } catch (err) {
      const msg = err.message?.includes('Invalid login')
        ? 'Invalid email or password'
        : 'Login failed. Please try again.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: Country selection ─────────────────────────────
  const handleCountrySelect = async () => {
    if (!selCountry) { toast.error('Please select a region'); return }
    setLoading(true)
    try {
      initCountry(profile.country_access)
      sessionStorage.setItem('bd_country', selCountry)
      await supabase.from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', profile.id)
      toast.success(`Welcome, ${profile.name}! — ${COUNTRY_OPTIONS.find(c => c.code === selCountry)?.label}`)
      navigate('/dashboard')
    } catch {
      toast.error('Error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Allowed options for country picker
  const access = profile?.country_access || 'US'
  const allowedOptions = access === 'ALL'
    ? COUNTRY_OPTIONS
    : COUNTRY_OPTIONS.filter(c => access.split(',').map(x => x.trim()).includes(c.code))

  return (
    <div className={styles.authWrapper}>
      {/* Left Panel */}
      <div className={styles.leftPanel}>
        <div className={styles.brand}>
          <span className={styles.brandName}>BlackDrivo</span>
          <div><div className={styles.brandSub}>Admin Portal</div></div>
        </div>
        <div className={styles.heroText}>
          <div className={styles.heroTag}><span>●</span> Premium Fleet Management</div>
          <h1 className={styles.heroHeading}>
            Control Your<br />Fleet <span>Operations</span>
          </h1>
          <p className={styles.heroDesc}>
            One dashboard to manage drivers, bookings, dispatch, clients and revenue — built for premium black car services.
          </p>
        </div>
        <div className={styles.statsRow}>
          <div className={styles.statItem}><span className={styles.statNumber}>98%</span><span className={styles.statLabel}>On-time rate</span></div>
          <div className={styles.statItem}><span className={styles.statNumber}>24/7</span><span className={styles.statLabel}>Live dispatch</span></div>
          <div className={styles.statItem}><span className={styles.statNumber}>🇵🇰🇺🇸</span><span className={styles.statLabel}>Multi-country</span></div>
        </div>
      </div>

      {/* Right Panel */}
      <div className={styles.rightPanel}>
        <div className={styles.formCard}>

          {/* ── STEP 1: Credentials ── */}
          {step === 'credentials' && (
            <>
              <h2 className={styles.formTitle}>Sign in</h2>
              <p className={styles.formSubtitle}>Enter your credentials to continue</p>
              <form onSubmit={handleLogin}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Email Address</label>
                  <div className={styles.inputWrap}>
                    <Mail size={16} />
                    <input type="email" autoComplete="email"
                      className={`${styles.input} ${errors.email ? styles.error : ''}`}
                      placeholder="admin@blackdrivo.com"
                      value={form.email}
                      onChange={e => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: '' }) }}
                    />
                  </div>
                  {errors.email && <span className={styles.errorMsg}>{errors.email}</span>}
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Password</label>
                  <div className={styles.inputWrap}>
                    <Lock size={16} />
                    <input
                      type={showPass ? 'text' : 'password'}
                      autoComplete="current-password"
                      className={`${styles.input} ${errors.password ? styles.error : ''}`}
                      placeholder="Your password"
                      value={form.password}
                      onChange={e => { setForm({ ...form, password: e.target.value }); setErrors({ ...errors, password: '' }) }}
                    />
                    <button type="button" className={styles.eyeBtn} onClick={() => setShowPass(!showPass)}>
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <span className={styles.errorMsg}>{errors.password}</span>}
                </div>

                <span className={styles.forgotLink} onClick={() => navigate('/forgot-password')} style={{ cursor: 'pointer' }}>
                  Forgot password?
                </span>

                <button type="submit" className={styles.submitBtn} disabled={loading}>
                  {loading ? <span className={styles.spinner} /> : <>Continue <ArrowRight size={16} /></>}
                </button>
              </form>
            </>
          )}

          {/* ── STEP 2: Country Select ── */}
          {step === 'country' && (
            <>
              <h2 className={styles.formTitle}>Select Region</h2>
              <p className={styles.formSubtitle}>
                Welcome, <strong>{profile?.name}</strong>! Select which region to open.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                {allowedOptions.map(c => (
                  <button key={c.code} type="button"
                    onClick={() => setSelCountry(c.code)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      padding: '18px 20px', borderRadius: 14,
                      border: selCountry === c.code
                        ? '2px solid var(--accent)'
                        : '2px solid var(--border)',
                      background: selCountry === c.code ? 'var(--accent-light)' : 'var(--bg-main)',
                      cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 40, lineHeight: 1 }}>{c.flag}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {c.label}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{c.cities}</div>
                    </div>
                    {selCountry === c.code && (
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <button type="button" className={styles.submitBtn}
                onClick={handleCountrySelect} disabled={loading || !selCountry}>
                {loading ? <span className={styles.spinner} /> : <>Open Dashboard <ArrowRight size={16} /></>}
              </button>

              <button type="button"
                style={{ width: '100%', marginTop: 12, background: 'none', border: 'none', fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', padding: '8px 0', fontFamily: 'var(--font-body)' }}
                onClick={async () => { await supabase.auth.signOut(); setStep('credentials'); setProfile(null); setSelCountry('') }}>
                ← Back to login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
