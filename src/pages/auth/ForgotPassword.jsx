// src/pages/auth/ForgotPassword.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, ArrowLeft, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { resetPasswordEmail } from '../../supabase/auth'
import styles from './Auth.module.css'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) { setError('Please enter your email address'); return }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Invalid email address'); return }

    setLoading(true)
    try {
      await resetPasswordEmail(email)
      setSent(true)
      toast.success('Reset email sent!')
    } catch (err) {
      const msg =
        err.code === 'auth/user-not-found'
          ? 'No account found with this email'
          : 'Failed to send reset email. Try again.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.authWrapper}>
      {/* Left Panel */}
      <div className={styles.leftPanel}>
        <div className={styles.brand}>
          <span className={styles.brandName}>BlackDrivo</span>
          <div><div className={styles.brandSub}>Admin Portal</div></div>
        </div>
        <div className={styles.heroText}>
          <div className={styles.heroTag}><span>●</span> Account Recovery</div>
          <h1 className={styles.heroHeading}>
            Reset Your<br /><span>Access</span>
          </h1>
          <p className={styles.heroDesc}>
            We'll send a secure password reset link to your registered email address within seconds.
          </p>
        </div>
        <div className={styles.statsRow}>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>Secure</span>
            <span className={styles.statLabel}>Encrypted link</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>1min</span>
            <span className={styles.statLabel}>Delivery time</span>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className={styles.rightPanel}>
        <div className={styles.formCard}>
          <button className={styles.backLink} onClick={() => navigate('/login')}>
            <ArrowLeft size={14} /> Back to Login
          </button>

          <h2 className={styles.formTitle}>Forgot Password?</h2>
          <p className={styles.formSubtitle}>Enter your email and we'll send a reset link</p>

          {sent ? (
            <div className={styles.successBox}>
              ✓ A password reset link has been sent to <strong>{email}</strong>. Please check your inbox (and spam folder).
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Email Address</label>
                <div className={styles.inputWrap}>
                  <Mail size={16} />
                  <input
                    type="email"
                    className={`${styles.input} ${error ? styles.error : ''}`}
                    placeholder="admin@blackdrivo.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError('') }}
                  />
                </div>
                {error && <span className={styles.errorMsg}>{error}</span>}
              </div>

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? <span className={styles.spinner} /> : <> Send Reset Link <ArrowRight size={16} /></>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
