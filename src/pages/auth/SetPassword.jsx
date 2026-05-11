// src/pages/auth/SetPassword.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, ArrowLeft, Check, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../supabase/client'
import { validatePassword } from '../../supabase/auth'
import styles from './Auth.module.css'

export default function SetPassword() {
  const navigate = useNavigate()
  const [form, setForm]       = useState({ password: '', confirm: '' })
  const [show, setShow]       = useState({ password: false, confirm: false })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors]   = useState({})
  const [ready, setReady]     = useState(false)

  // Supabase sends the session via URL hash after clicking email link
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setReady(!!session)
    })

    // Listen for auth state — Supabase auto-handles the token from URL
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const validation = validatePassword(form.password)

  const getStrength = () => {
    const c = Object.values(validation.rules).filter(Boolean).length
    return c <= 1 ? 'weak' : c <= 3 ? 'fair' : 'strong'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!validation.valid) errs.password = validation.messages[0]
    if (form.password !== form.confirm) errs.confirm = 'Passwords do not match'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      // Update password
      const { data, error } = await supabase.auth.updateUser({ password: form.password })
      if (error) throw error

      // Update users table — mark as active
      if (data?.user) {
        await supabase.from('users')
          .update({
            status:            'active',
            invitation_status: 'active',
            last_login_at:     new Date().toISOString(),
          })
          .eq('email', data.user.email)
      }

      toast.success('Password set! Welcome to BlackDrivo.')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message || 'Failed to set password. Link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  const strength    = form.password ? getStrength() : null
  const activeSegs  = strength === 'weak' ? 1 : strength === 'fair' ? 2 : strength === 'strong' ? 4 : 0
  const strengthClr = strength === 'weak' ? '#EF4444' : strength === 'fair' ? 'var(--amber)' : 'var(--green)'

  return (
    <div className={styles.authWrapper}>
      <div className={styles.leftPanel}>
        <div className={styles.brand}>
          <span className={styles.brandName}>BlackDrivo</span>
          <div><div className={styles.brandSub}>Admin Portal</div></div>
        </div>
        <div className={styles.heroText}>
          <div className={styles.heroTag}><span>●</span> Secure Access</div>
          <h1 className={styles.heroHeading}>Create a<br /><span>Strong Password</span></h1>
          <p className={styles.heroDesc}>
            Set a secure password to protect your account and fleet data.
          </p>
        </div>
      </div>

      <div className={styles.rightPanel}>
        <div className={styles.formCard}>
          <button className={styles.backLink} onClick={() => navigate('/login')}>
            <ArrowLeft size={14} /> Back to Login
          </button>

          <h2 className={styles.formTitle}>Set Your Password</h2>
          <p className={styles.formSubtitle}>
            {ready
              ? 'Create a strong password for your account'
              : 'Loading your invite link...'
            }
          </p>

          {!ready && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 14 }}>
              <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
              Verifying invite link...
            </div>
          )}

          {ready && (
            <form onSubmit={handleSubmit}>
              {/* Password */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>New Password</label>
                <div className={styles.inputWrap}>
                  <Lock size={16} />
                  <input
                    type={show.password ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={`${styles.input} ${errors.password ? styles.error : ''}`}
                    placeholder="Create strong password"
                    value={form.password}
                    onChange={e => { setForm({ ...form, password: e.target.value }); setErrors({ ...errors, password: '' }) }}
                  />
                  <button type="button" className={styles.eyeBtn}
                    onClick={() => setShow({ ...show, password: !show.password })}>
                    {show.password ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <span className={styles.errorMsg}>{errors.password}</span>}

                {form.password && (
                  <>
                    <div className={styles.strengthBar}>
                      {[0,1,2,3].map(i => (
                        <div key={i} className={styles.strengthSegment}
                          style={{ background: i < activeSegs ? strengthClr : 'var(--border)', transition: 'background 0.3s' }} />
                      ))}
                    </div>
                    <div className={styles.strengthHints}>
                      {[
                        { key: 'length',    label: 'At least 8 characters' },
                        { key: 'uppercase', label: '1 uppercase letter (A-Z)' },
                        { key: 'number',    label: '1 number (0-9)' },
                        { key: 'special',   label: '1 special character (!@#$...)' },
                      ].map(r => (
                        <span key={r.key} className={`${styles.hint} ${validation.rules[r.key] ? styles.pass : ''}`}>
                          <Check size={12} /> {r.label}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Confirm */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>Confirm Password</label>
                <div className={styles.inputWrap}>
                  <Lock size={16} />
                  <input
                    type={show.confirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={`${styles.input} ${errors.confirm ? styles.error : ''}`}
                    placeholder="Repeat password"
                    value={form.confirm}
                    onChange={e => { setForm({ ...form, confirm: e.target.value }); setErrors({ ...errors, confirm: '' }) }}
                  />
                  <button type="button" className={styles.eyeBtn}
                    onClick={() => setShow({ ...show, confirm: !show.confirm })}>
                    {show.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.confirm && <span className={styles.errorMsg}>{errors.confirm}</span>}
              </div>

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? <span className={styles.spinner} /> : <>Set Password <ArrowRight size={16} /></>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
