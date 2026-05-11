// src/pages/profile/Profile.jsx
import { useEffect, useState } from 'react'
import { User, Lock, Clock, Save, Eye, EyeOff, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../hooks/useAuth'
import { validatePassword, changePassword } from '../../supabase/auth'
import { fmtDateTime, getInitials } from '../../utils/formatters'
import fStyles from '../../components/shared/Form.module.css'

export default function Profile() {
  const { user, userProfile, setUserProfile } = useAuth()
  const [tab, setTab]           = useState('info')
  const [form, setForm]         = useState({})
  const [saving, setSaving]     = useState(false)
  const [loginHistory, setHist] = useState([])

  // Password
  const [pwForm, setPwForm]     = useState({ current: '', newPw: '', confirm: '' })
  const [showPw, setShowPw]     = useState({ current: false, newPw: false, confirm: false })
  const [pwErrors, setPwErrors] = useState({})
  const [pwSaving, setPwSaving] = useState(false)

  useEffect(() => {
    if (userProfile) setForm({ name: userProfile.name, phone: userProfile.phone || '', department: userProfile.department || '', city: userProfile.city || '' })
    fetchLoginHistory()
  }, [userProfile])

  const fetchLoginHistory = async () => {
    if (!user?.id) return
    const { data } = await supabase
      .from('activity_logs')
      .select('id, action, description, created_at, meta')
      .eq('user_id', user.id)
      .in('action', ['LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', 'PROFILE_UPDATE'])
      .order('created_at', { ascending: false })
      .limit(20)
    setHist(data || [])
  }

  const saveInfo = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('users')
        .update({ name: form.name, phone: form.phone, department: form.department, city: form.city || null })
        .eq('id', user.id)
      if (error) throw error
      setUserProfile(p => ({ ...p, ...form }))
      toast.success('Profile updated!')
    } catch { toast.error('Update failed') }
    finally { setSaving(false) }
  }

  const savePassword = async () => {
    const errs = {}
    const validation = validatePassword(pwForm.newPw)
    if (!pwForm.current) errs.current = 'Current password required'
    if (!validation.valid) errs.newPw = validation.messages[0]
    if (pwForm.newPw !== pwForm.confirm) errs.confirm = 'Passwords do not match'
    if (Object.keys(errs).length) { setPwErrors(errs); return }

    setPwSaving(true)
    try {
      // Verify current password by re-signing in
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: pwForm.current })
      if (signInErr) { setPwErrors({ current: 'Current password is incorrect' }); return }

      await changePassword(pwForm.newPw)
      toast.success('Password changed successfully!')
      setPwForm({ current: '', newPw: '', confirm: '' })
    } catch (err) {
      toast.error(err.message || 'Password change failed')
    } finally { setPwSaving(false) }
  }

  const pwValidation = validatePassword(pwForm.newPw)
  const strengthCount = Object.values(pwValidation.rules).filter(Boolean).length
  const strengthLevel = strengthCount <= 1 ? 'weak' : strengthCount <= 3 ? 'fair' : 'strong'
  const strengthColor = { weak: '#EF4444', fair: 'var(--amber)', strong: 'var(--green)' }[strengthLevel]

  const actionColor = (action) => {
    const map = { LOGIN: 'var(--green)', LOGOUT: 'var(--text-muted)', PASSWORD_CHANGE: 'var(--accent)', PROFILE_UPDATE: 'var(--blue)' }
    return map[action] || 'var(--text-muted)'
  }

  return (
    <div style={{ padding: 28, width: '100%', boxSizing: 'border-box', animation: 'fadeIn 0.3s ease' }}>

      {/* Profile Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          {getInitials(userProfile?.name || user?.email || 'A')}
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: -0.5 }}>
            {userProfile?.name || 'Admin User'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{user?.email}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <span style={{ background: '#111', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {userProfile?.role?.replace('_', ' ') || 'Admin'}
            </span>
            {userProfile?.department && (
              <span style={{ background: 'var(--bg-main)', color: 'var(--text-muted)', fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 99, border: '1px solid var(--border)' }}>
                {userProfile.department}
              </span>
            )}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>Last Login</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{fmtDateTime(userProfile?.last_login_at) || 'Just now'}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 4, width: 'fit-content' }}>
        {[
          { key: 'info',    label: 'Edit Profile',    icon: User  },
          { key: 'password',label: 'Change Password', icon: Lock  },
          { key: 'history', label: 'Login History',   icon: Clock },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ height: 34, padding: '0 16px', borderRadius: 8, border: 'none', background: tab === key ? 'var(--accent)' : 'transparent', color: tab === key ? '#fff' : 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 600 }}>

        {/* ── Edit Profile ── */}
        {tab === 'info' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              Personal Information
            </div>
            <div className={fStyles.body}>
              <div className={fStyles.grid}>
                {[
                  { label: 'Full Name',   key: 'name',       placeholder: 'Your full name'    },
                  { label: 'Phone',       key: 'phone',      placeholder: '+1 555 000 0000'   },
                  { label: 'Department',  key: 'department', placeholder: 'Operations'        },
                  { label: 'City',        key: 'city',       placeholder: 'Atlanta'           },
                ].map(({ label, key, placeholder }) => (
                  <div key={key} className={fStyles.field}>
                    <label className={fStyles.label}>{label}</label>
                    <input className={fStyles.input} placeholder={placeholder}
                      value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
                <div className={`${fStyles.field} ${fStyles.full}`}>
                  <label className={fStyles.label}>Email (Read-only)</label>
                  <input className={fStyles.input} value={user?.email || ''} disabled
                    style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                </div>
              </div>
            </div>
            <div className={fStyles.footer}>
              <button className={fStyles.submitBtn} onClick={saveInfo} disabled={saving}>
                {saving ? <span className={fStyles.spinner} /> : <><Save size={14} /> Save Changes</>}
              </button>
            </div>
          </div>
        )}

        {/* ── Change Password ── */}
        {tab === 'password' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              Change Password
            </div>
            <div className={fStyles.body}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: 'Current Password', key: 'current', placeholder: 'Your current password', autocomplete: 'current-password' },
                  { label: 'New Password',      key: 'newPw',   placeholder: 'Min 8 chars, 1 uppercase, 1 number, 1 special', autocomplete: 'new-password' },
                  { label: 'Confirm Password',  key: 'confirm', placeholder: 'Repeat new password', autocomplete: 'new-password' },
                ].map(({ label, key, placeholder, autocomplete }) => (
                  <div key={key} className={fStyles.field}>
                    <label className={fStyles.label}>{label}</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPw[key] ? 'text' : 'password'}
                        autoComplete={autocomplete}
                        className={`${fStyles.input} ${pwErrors[key] ? fStyles.error : ''}`}
                        placeholder={placeholder}
                        value={pwForm[key]}
                        onChange={e => { setPwForm(f => ({ ...f, [key]: e.target.value })); setPwErrors(e => ({ ...e, [key]: '' })) }}
                        style={{ paddingRight: 44 }}
                      />
                      <button type="button" onClick={() => setShowPw(s => ({ ...s, [key]: !s[key] }))}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        {showPw[key] ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {pwErrors[key] && <span className={fStyles.errorMsg}>{pwErrors[key]}</span>}
                  </div>
                ))}

                {/* Strength bar */}
                {pwForm.newPw && (
                  <div>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                      {[0,1,2,3].map(i => (
                        <div key={i} style={{ height: 3, flex: 1, borderRadius: 99, background: i < strengthCount ? strengthColor : 'var(--border)', transition: 'background 0.3s' }} />
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {[
                        { key: 'length',    label: 'At least 8 characters' },
                        { key: 'uppercase', label: '1 uppercase letter (A-Z)' },
                        { key: 'number',    label: '1 number (0-9)' },
                        { key: 'special',   label: '1 special character (!@#$...)' },
                      ].map(r => (
                        <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: pwValidation.rules[r.key] ? 'var(--green)' : 'var(--text-muted)', transition: 'color 0.2s' }}>
                          <Check size={11} /> {r.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className={fStyles.footer}>
              <button className={fStyles.submitBtn} onClick={savePassword} disabled={pwSaving}>
                {pwSaving ? <span className={fStyles.spinner} /> : <><Lock size={14} /> Update Password</>}
              </button>
            </div>
          </div>
        )}

        {/* ── Login History ── */}
        {tab === 'history' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              Login & Action History
            </div>
            <div style={{ padding: '8px 0' }}>
              {loginHistory.length === 0
                ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No history yet</div>
                : loginHistory.map(log => (
                    <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: actionColor(log.action), flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                          {log.action?.replace('_', ' ').toLowerCase()}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{log.description}</div>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDateTime(log.created_at)}</div>
                    </div>
                  ))
              }
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
