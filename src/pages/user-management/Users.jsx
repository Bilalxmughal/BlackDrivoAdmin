// src/pages/user-management/Users.jsx
import { useEffect, useState, useCallback } from 'react'
import { Plus, Eye, Trash2, Search, RefreshCw, Shield, Copy, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../supabase/client'
import Modal from '../../components/shared/Modal'
import { fmtDateTime, getInitials } from '../../utils/formatters'
import styles from '../../components/shared/PageLayout.module.css'
import fStyles from '../../components/shared/Form.module.css'

const ROLES = ['super_admin', 'admin', 'ops', 'dispatcher', 'finance']
const ROLE_COLORS = {
  super_admin: { bg: '#111',               color: '#fff'           },
  admin:       { bg: 'var(--accent-light)', color: 'var(--accent)' },
  ops:         { bg: 'var(--blue-light)',   color: 'var(--blue)'   },
  dispatcher:  { bg: 'var(--green-light)',  color: 'var(--green)'  },
  finance:     { bg: 'var(--amber-light)',  color: 'var(--amber)'  },
}
const COUNTRY_OPTIONS = [
  { code: 'PK', label: 'Pakistan',      flag: '🇵🇰' },
  { code: 'US', label: 'United States', flag: '🇺🇸' },
]
const INIT = { name: '', email: '', tempPassword: '', phone: '', department: '', role: 'ops', countries: ['US'] }

// Generate a random temp password meeting requirements
const genTempPassword = () => {
  const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower   = 'abcdefghjkmnpqrstuvwxyz'
  const digits  = '23456789'
  const special = '!@#$%&*'
  const rand = (str) => str[Math.floor(Math.random() * str.length)]
  const base = rand(upper) + rand(lower) + rand(lower) + rand(lower) +
               rand(digits) + rand(digits) + rand(special) + rand(lower)
  // Shuffle
  return base.split('').sort(() => Math.random() - 0.5).join('')
}

export default function Users() {
  const [data, setData]         = useState([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [roleFilter, setRole]   = useState('all')
  const [addOpen, setAddOpen]   = useState(false)
  const [viewUser, setViewUser] = useState(null)
  const [createdUser, setCreated]= useState(null) // show after creation
  const [form, setForm]         = useState(INIT)
  const [errors, setErrors]     = useState({})
  const [saving, setSaving]     = useState(false)
  const [copied, setCopied]     = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      let q = supabase
        .from('users')
        .select('id, name, email, phone, role, department, status, country_access, invitation_status, last_login_at, created_at', { count: 'exact' })
      if (roleFilter !== 'all') q = q.eq('role', roleFilter)
      if (search) q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
      q = q.order('created_at', { ascending: false })
      const { data: rows, count, error } = await q
      if (error) throw error
      setData(rows || [])
      setTotal(count || 0)
    } catch (e) { toast.error('Failed to load users') }
    finally { setLoading(false) }
  }, [search, roleFilter])

  useEffect(() => { fetch() }, [fetch])

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const toggleCountry = (code) => {
    if (form.role === 'super_admin') return
    setForm(f => {
      const curr = f.countries || []
      const next = curr.includes(code) ? curr.filter(c => c !== code) : [...curr, code]
      return { ...f, countries: next.length ? next : curr }
    })
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim())         e.name  = 'Name required'
    if (!form.email.trim())        e.email = 'Email required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
    if (!form.tempPassword.trim()) e.tempPassword = 'Temporary password required'
    if (!form.role)                e.role  = 'Role required'
    return e
  }

  const handleCreate = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)

    try {
      const countryAccess = form.role === 'super_admin'
        ? 'ALL'
        : (form.countries || ['US']).join(',')

      const emailClean = form.email.toLowerCase().trim()

      // Step 1: Create auth user via signUp
      // Make sure "Confirm email" is OFF in Supabase Auth settings
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email:    emailClean,
        password: form.tempPassword,
        options:  { data: { name: form.name.trim() } }
      })

      if (signUpErr) throw new Error(signUpErr.message)

      // signUp returns user even if they already exist (Supabase behavior)
      // Check if it's a real new user or existing
      const newUserId = signUpData?.user?.id
      if (!newUserId) throw new Error('Could not create user. Check Supabase Auth → Email settings → disable "Confirm email".')

      // Step 2: Upsert into users table with full details
      const { error: dbErr } = await supabase.from('users').upsert({
        id:                newUserId,
        name:              form.name.trim(),
        email:             emailClean,
        phone:             form.phone      || null,
        department:        form.department || null,
        role:              form.role,
        country_access:    countryAccess,
        status:            'active',
        invitation_status: 'password_change_required',
      }, { onConflict: 'id' })

      if (dbErr) {
        // Try upsert by email if id conflict
        const { error: emailUpsertErr } = await supabase.from('users').upsert({
          id:                newUserId,
          name:              form.name.trim(),
          email:             emailClean,
          phone:             form.phone      || null,
          department:        form.department || null,
          role:              form.role,
          country_access:    countryAccess,
          status:            'active',
          invitation_status: 'password_change_required',
        }, { onConflict: 'email' })

        if (emailUpsertErr) console.warn('DB warn:', emailUpsertErr.message)
      }

      // 3. Show credentials to admin
      setCreated({
        name:     form.name.trim(),
        email:    form.email.toLowerCase().trim(),
        password: form.tempPassword,
        role:     form.role,
        country:  countryAccess,
      })
      setAddOpen(false)
      setForm(INIT)
      await fetch()

    } catch (err) {
      toast.error(err.message || 'Failed to create user')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (u) => {
    if (!confirm(`Remove ${u.name}?`)) return
    await supabase.from('users').delete().eq('id', u.id)
    toast.success('User removed')
    fetch()
  }

  const copyCredentials = () => {
    if (!createdUser) return
    navigator.clipboard.writeText(
      `BlackDrivo Admin Portal\nURL: ${window.location.origin}\nEmail: ${createdUser.email}\nTemp Password: ${createdUser.password}\n\nPlease change your password after first login.`
    )
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Credentials copied!')
  }

  const formatCountry = (ca) => {
    if (!ca || ca === 'ALL') return '🌍'
    return ca.split(',').map(c => c.trim() === 'PK' ? '🇵🇰' : '🇺🇸').join(' ')
  }

  const statusBadge = (u) => {
    if (u.invitation_status === 'password_change_required') {
      return { label: 'Must Change Password', bg: 'var(--amber-light)', color: 'var(--amber)' }
    }
    if (u.status === 'active') return { label: 'Active', bg: 'var(--green-light)', color: 'var(--green)' }
    if (u.status === 'pending') return { label: 'Pending', bg: 'var(--amber-light)', color: 'var(--amber)' }
    return { label: u.status, bg: 'var(--border)', color: 'var(--text-muted)' }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.pageTitle}>User Management</div>
          <div className={styles.pageSub}>Admin portal users, roles and country access</div>
        </div>
        <button className={styles.addBtn} onClick={() => {
          setAddOpen(true)
          setForm({ ...INIT, tempPassword: genTempPassword() })
          setErrors({})
        }}>
          <Plus size={15} /> Add User
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input className={styles.filterInput} placeholder="Search name or email..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className={styles.filterDivider} />
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Role</span>
          <select className={styles.filterSelect} value={roleFilter} onChange={e => setRole(e.target.value)}>
            <option value="all">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ').toUpperCase()}</option>)}
          </select>
        </div>
        <div className={styles.filterDivider} />
        <button className={styles.clearBtn} onClick={() => { setSearch(''); setRole('all') }}>Clear</button>
        <button className={styles.clearBtn} onClick={fetch} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <div className={styles.tableHeader}>
          <div>
            <div className={styles.tableTitle}>Admin Users</div>
            <div className={styles.tableCount}>{total} users</div>
          </div>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              {['User', 'Role', 'Department', 'Country', 'Status', 'Last Login', 'Actions'].map(h => (
                <th key={h} className={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array(5).fill(0).map((_, i) => (
                  <tr key={i}>{Array(7).fill(0).map((_, j) => (
                    <td key={j} className={styles.td}><div className={styles.skeleton} style={{ height: 14, width: '70%' }} /></td>
                  ))}</tr>
                ))
              : data.length === 0
              ? <tr><td colSpan={7} className={styles.td}><div className={styles.empty}><div className={styles.emptyIcon}>👥</div>No users</div></td></tr>
              : data.map(u => {
                  const rc = ROLE_COLORS[u.role] || ROLE_COLORS.ops
                  const sb = statusBadge(u)
                  return (
                    <tr key={u.id} className={styles.tr} onClick={() => setViewUser(u)}>
                      <td className={styles.td}>
                        <div className={styles.personCell}>
                          <div className={styles.avatar} style={{ background: '#111' }}>{getInitials(u.name)}</div>
                          <div>
                            <div className={styles.personName}>{u.name}</div>
                            <div className={styles.personSub}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className={styles.td}>
                        <span style={{ background: rc.bg, color: rc.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {u.role?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className={styles.td} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{u.department || '—'}</td>
                      <td className={styles.td} style={{ fontSize: 18, letterSpacing: 2 }}>{formatCountry(u.country_access)}</td>
                      <td className={styles.td}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: sb.bg, color: sb.color, whiteSpace: 'nowrap' }}>
                          {sb.label}
                        </span>
                      </td>
                      <td className={styles.td} style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {u.last_login_at ? fmtDateTime(u.last_login_at) : '—'}
                      </td>
                      <td className={styles.td} onClick={e => e.stopPropagation()}>
                        <div className={styles.actions}>
                          <button className={styles.actionBtn} onClick={() => setViewUser(u)}><Eye size={13} /></button>
                          <button className={`${styles.actionBtn} ${styles.danger}`} onClick={() => handleDelete(u)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })
            }
          </tbody>
        </table>
      </div>

      {/* ── Add User Modal ── */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New User" width={560}>
        <div className={fStyles.body}>
          <div className={fStyles.grid}>
            <div className={fStyles.sectionTitle}>User Information</div>

            <div className={fStyles.field}>
              <label className={fStyles.label}>Full Name <span className={fStyles.required}>*</span></label>
              <input className={`${fStyles.input} ${errors.name ? fStyles.error : ''}`}
                placeholder="John Smith" value={form.name} onChange={e => set('name', e.target.value)} />
              {errors.name && <span className={fStyles.errorMsg}>{errors.name}</span>}
            </div>

            <div className={fStyles.field}>
              <label className={fStyles.label}>Email <span className={fStyles.required}>*</span></label>
              <input type="email" className={`${fStyles.input} ${errors.email ? fStyles.error : ''}`}
                placeholder="john@blackdrivo.com" value={form.email} onChange={e => set('email', e.target.value)} />
              {errors.email && <span className={fStyles.errorMsg}>{errors.email}</span>}
            </div>

            <div className={fStyles.field}>
              <label className={fStyles.label}>Phone</label>
              <input className={fStyles.input} placeholder="+1 555 000 0000"
                value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>

            <div className={fStyles.field}>
              <label className={fStyles.label}>Department</label>
              <input className={fStyles.input} placeholder="Operations, Finance..."
                value={form.department} onChange={e => set('department', e.target.value)} />
            </div>

            <div className={fStyles.field}>
              <label className={fStyles.label}>Role <span className={fStyles.required}>*</span></label>
              <select className={fStyles.select} value={form.role}
                onChange={e => {
                  const r = e.target.value
                  set('role', r)
                  if (r === 'super_admin') set('countries', ['PK', 'US'])
                }}>
                {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ').toUpperCase()}</option>)}
              </select>
            </div>

            {/* Temp password */}
            <div className={`${fStyles.field} ${fStyles.full}`}>
              <label className={fStyles.label}>Temporary Password <span className={fStyles.required}>*</span></label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className={`${fStyles.input} ${errors.tempPassword ? fStyles.error : ''}`}
                  placeholder="Temporary password"
                  value={form.tempPassword}
                  onChange={e => set('tempPassword', e.target.value)}
                  style={{ flex: 1, fontFamily: 'monospace', letterSpacing: 1 }}
                />
                <button type="button"
                  onClick={() => set('tempPassword', genTempPassword())}
                  style={{ height: 42, padding: '0 14px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-main)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontFamily: 'var(--font-body)' }}>
                  Generate
                </button>
              </div>
              {errors.tempPassword && <span className={fStyles.errorMsg}>{errors.tempPassword}</span>}
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                User will be required to change this on first login
              </span>
            </div>

            {/* Country Access */}
            <div className={`${fStyles.field} ${fStyles.full}`}>
              <label className={fStyles.label}>Country Access <span className={fStyles.required}>*</span></label>
              {form.role === 'super_admin'
                ? <div style={{ padding: '12px 14px', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border)', fontSize: 14, color: 'var(--text-muted)' }}>
                    🌍 All Countries — Super Admin gets full access
                  </div>
                : <div style={{ display: 'flex', gap: 10 }}>
                    {COUNTRY_OPTIONS.map(c => (
                      <button key={c.code} type="button" onClick={() => toggleCountry(c.code)}
                        style={{
                          flex: 1, padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                          border: (form.countries || []).includes(c.code) ? '2px solid var(--accent)' : '2px solid var(--border)',
                          background: (form.countries || []).includes(c.code) ? 'var(--accent-light)' : 'var(--bg-main)',
                          display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s',
                        }}>
                        <span style={{ fontSize: 28 }}>{c.flag}</span>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{c.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            {(form.countries || []).includes(c.code) ? '✓ Access granted' : 'Click to grant'}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
              }
            </div>

            {/* Role info */}
            <div style={{ gridColumn: '1/-1', background: 'var(--bg-main)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Shield size={12} /> Role Access
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                {form.role === 'super_admin' && '✅ Full access — all pages, all countries'}
                {form.role === 'admin'       && '✅ All operational pages · ❌ Roles & Admin Settings'}
                {form.role === 'ops'         && '✅ Bookings, Dispatch, Passengers, Drivers · ❌ Settings'}
                {form.role === 'dispatcher'  && '✅ Bookings & Dispatch Map only'}
                {form.role === 'finance'     && '✅ Dashboard & Activity Log (read-only)'}
              </div>
            </div>
          </div>
        </div>
        <div className={fStyles.footer}>
          <button className={fStyles.cancelBtn} onClick={() => setAddOpen(false)}>Cancel</button>
          <button className={fStyles.submitBtn} onClick={handleCreate} disabled={saving}>
            {saving ? <span className={fStyles.spinner} /> : <><Plus size={14} /> Create User</>}
          </button>
        </div>
      </Modal>

      {/* ── Created User Credentials Modal ── */}
      <Modal open={!!createdUser} onClose={() => setCreated(null)} title="User Created!" width={460}>
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: 16, background: 'var(--green-light)', borderRadius: 12, border: '1px solid rgba(61,184,122,0.25)' }}>
            <CheckCircle size={24} color="var(--green)" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Account created successfully</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Share these credentials with the user</div>
            </div>
          </div>

          {/* Credentials box */}
          <div style={{ background: '#111', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14 }}>
              Login Credentials
            </div>
            {[
              { label: 'Portal URL',   value: window.location.origin },
              { label: 'Email',        value: createdUser?.email },
              { label: 'Password',     value: createdUser?.password },
              { label: 'Role',         value: createdUser?.role?.replace('_', ' ').toUpperCase() },
              { label: 'Country',      value: createdUser?.country === 'ALL' ? '🌍 All Countries' : createdUser?.country?.split(',').map(c => c === 'PK' ? '🇵🇰 Pakistan' : '🇺🇸 USA').join(', ') },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', width: 100, flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: 13, color: '#fff', fontWeight: label === 'Password' ? 700 : 400, fontFamily: label === 'Password' ? 'monospace' : 'var(--font-body)', letterSpacing: label === 'Password' ? 1 : 0 }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--amber-light)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: 10, padding: '12px 14px', marginBottom: 20, fontSize: 13, color: 'var(--amber)', lineHeight: 1.6 }}>
            ⚠️ User will be asked to change their password on first login.
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={copyCredentials}
              style={{ flex: 1, height: 42, background: copied ? 'var(--green)' : '#111', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'var(--font-body)', transition: 'background 0.2s' }}>
              {copied ? <><CheckCircle size={15} /> Copied!</> : <><Copy size={15} /> Copy Credentials</>}
            </button>
            <button onClick={() => setCreated(null)}
              style={{ height: 42, padding: '0 20px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg-card)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* ── View User Modal ── */}
      {viewUser && (
        <Modal open={!!viewUser} onClose={() => setViewUser(null)} title="User Details" width={460}>
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: '#fff' }}>
                {getInitials(viewUser.name)}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>{viewUser.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{viewUser.email}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: 'Role',         value: viewUser.role?.replace('_', ' ').toUpperCase() },
                { label: 'Department',   value: viewUser.department || '—' },
                { label: 'Phone',        value: viewUser.phone      || '—' },
                { label: 'Country',      value: viewUser.country_access === 'ALL' ? '🌍 All' : (viewUser.country_access || 'US').split(',').map(c => c.trim() === 'PK' ? '🇵🇰 PK' : '🇺🇸 US').join(', ') },
                { label: 'Last Login',   value: viewUser.last_login_at ? fmtDateTime(viewUser.last_login_at) : 'Never' },
                { label: 'Member Since', value: fmtDateTime(viewUser.created_at) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button className={fStyles.cancelBtn} onClick={() => setViewUser(null)}>Close</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
