// src/pages/user-management/Users.jsx
import { useEffect, useState, useCallback } from 'react'
import { Plus, Eye, Trash2, Search, RefreshCw, Mail, Shield, Clock, CheckCircle } from 'lucide-react'
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
const INIT = { name: '', email: '', phone: '', department: '', role: 'ops', countries: ['US'] }

export default function Users() {
  const [data, setData]         = useState([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [roleFilter, setRole]   = useState('all')
  const [addOpen, setAddOpen]   = useState(false)
  const [viewUser, setViewUser] = useState(null)
  const [form, setForm]         = useState(INIT)
  const [errors, setErrors]     = useState({})
  const [saving, setSaving]     = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch confirmed users
      let q = supabase
        .from('users')
        .select('id, name, email, phone, role, department, status, country_access, invitation_status, last_login_at, created_at', { count: 'exact' })
      if (roleFilter !== 'all') q = q.eq('role', roleFilter)
      if (search) q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
      q = q.order('created_at', { ascending: false })
      const { data: confirmedUsers, count, error } = await q
      if (error) throw error

      // Fetch pending invites (not yet accepted)
      let pq = supabase
        .from('pending_invites')
        .select('id, name, email, phone, role, department, country_access, created_at')
      if (search) pq = pq.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
      if (roleFilter !== 'all') pq = pq.eq('role', roleFilter)
      const { data: pendingInvites } = await pq

      // Merge — pending invites shown as pending rows
      const confirmedEmails = new Set((confirmedUsers || []).map(u => u.email?.toLowerCase()))
      const pendingRows = (pendingInvites || [])
        .filter(inv => !confirmedEmails.has(inv.email?.toLowerCase()))
        .map(inv => ({
          ...inv,
          status:            'pending',
          invitation_status: 'pending',
          last_login_at:     null,
          _isPending:        true,
        }))

      const combined = [...(confirmedUsers || []), ...pendingRows]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      setData(combined)
      setTotal(combined.length)
    } catch (e) { toast.error('Failed to load users: ' + e.message) }
    finally { setLoading(false) }
  }, [search, roleFilter])

  useEffect(() => { fetch() }, [fetch])

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const toggleCountry = (code) => {
    setForm(f => {
      const curr = f.countries || []
      if (form.role === 'super_admin') return { ...f, countries: ['PK', 'US'] }
      const next = curr.includes(code)
        ? curr.filter(c => c !== code)
        : [...curr, code]
      return { ...f, countries: next.length ? next : curr } // at least 1
    })
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim())  e.name  = 'Name required'
    if (!form.email.trim()) e.email = 'Email required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
    if (!form.role) e.role = 'Role required'
    return e
  }

  const handleInvite = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)

    try {
      const countryAccess = form.role === 'super_admin'
        ? 'ALL'
        : (form.countries || ['US']).join(',')

      const emailClean = form.email.toLowerCase().trim()

      // Step 1: Save in pending_invites — this IS the list source for pending users
      const { error: inviteErr } = await supabase
        .from('pending_invites')
        .upsert({
          email:          emailClean,
          name:           form.name.trim(),
          phone:          form.phone       || null,
          department:     form.department  || null,
          role:           form.role,
          country_access: countryAccess,
        }, { onConflict: 'email' })

      if (inviteErr) throw new Error('Invite save failed: ' + inviteErr.message)

      // Step 2: Send invite email via Supabase Auth
      // resetPasswordForEmail works even for new users — sends set-password link
      const { error: emailErr } = await supabase.auth.resetPasswordForEmail(emailClean, {
        redirectTo: `${window.location.origin}/set-password`,
      })

      if (emailErr && !emailErr.message?.includes('not found')) {
        console.warn('Email error:', emailErr.message)
        toast(`Invite saved. Email: ${emailErr.message}`, { icon: '⚠️' })
      } else {
        toast.success(`✅ Invite sent to ${emailClean}!`)
      }

      setAddOpen(false)
      setForm(INIT)
      await fetch()

    } catch (err) {
      toast.error(err.message || 'Failed to create invite')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (u) => {
    if (!confirm(`Remove ${u.name}?`)) return
    if (u._isPending) {
      // Delete from pending_invites
      await supabase.from('pending_invites').delete().eq('email', u.email)
    } else {
      await supabase.from('users').delete().eq('id', u.id)
    }
    toast.success('User removed')
    fetch()
  }

  const sendResetEmail = async (email) => {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/set-password`,
    })
    toast.success('Password reset email sent!')
  }

  const formatCountryAccess = (ca) => {
    if (!ca || ca === 'ALL') return 'All'
    return ca.split(',').map(c => c.trim() === 'PK' ? '🇵🇰' : '🇺🇸').join(' ')
  }

  const inviteStatusBadge = (status) => {
    if (status === 'active' || !status) return null
    return (
      <span style={{
        fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
        background: 'var(--amber-light)', color: 'var(--amber)',
        display: 'inline-flex', alignItems: 'center', gap: 3,
      }}>
        <Clock size={9} /> Invite Pending
      </span>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.pageTitle}>User Management</div>
          <div className={styles.pageSub}>Admin panel users, roles and country access</div>
        </div>
        <button className={styles.addBtn} onClick={() => { setAddOpen(true); setForm(INIT); setErrors({}) }}>
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
            <div className={styles.tableCount}>{total} total users</div>
          </div>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              {['User', 'Role', 'Department', 'Country Access', 'Status', 'Last Login', 'Actions'].map(h => (
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
              ? <tr><td colSpan={7} className={styles.td}><div className={styles.empty}><div className={styles.emptyIcon}>👥</div>No users found</div></td></tr>
              : data.map(u => {
                  const rc = ROLE_COLORS[u.role] || ROLE_COLORS.ops
                  return (
                    <tr key={u.id} className={styles.tr} onClick={() => setViewUser(u)}>
                      <td className={styles.td}>
                        <div className={styles.personCell}>
                          <div className={styles.avatar} style={{ background: '#111' }}>{getInitials(u.name)}</div>
                          <div>
                            <div className={styles.personName}>{u.name}</div>
                            <div className={styles.personSub}>{u.email}</div>
                            {inviteStatusBadge(u.invitation_status)}
                          </div>
                        </div>
                      </td>
                      <td className={styles.td}>
                        <span style={{ background: rc.bg, color: rc.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {u.role?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className={styles.td} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{u.department || '—'}</td>
                      <td className={styles.td}>
                        <span style={{ fontSize: 18, letterSpacing: 2 }}>{formatCountryAccess(u.country_access)}</span>
                      </td>
                      <td className={styles.td}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
                          background: u.status === 'active' ? 'var(--green-light)' : 'var(--amber-light)',
                          color: u.status === 'active' ? 'var(--green)' : 'var(--amber)',
                        }}>
                          {u.invitation_status === 'pending' ? 'Invite Pending' : u.status}
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

            {/* Country Access — multi-select */}
            <div className={`${fStyles.field} ${fStyles.full}`}>
              <label className={fStyles.label}>Country Access <span className={fStyles.required}>*</span></label>
              {form.role === 'super_admin'
                ? <div style={{ padding: '10px 14px', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border)', fontSize: 14, color: 'var(--text-muted)' }}>
                    🌍 All Countries (Super Admin gets access to all regions)
                  </div>
                : <div style={{ display: 'flex', gap: 12 }}>
                    {COUNTRY_OPTIONS.map(c => (
                      <button key={c.code} type="button"
                        onClick={() => toggleCountry(c.code)}
                        style={{
                          flex: 1, padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                          border: (form.countries || []).includes(c.code)
                            ? '2px solid var(--accent)' : '2px solid var(--border)',
                          background: (form.countries || []).includes(c.code)
                            ? 'var(--accent-light)' : 'var(--bg-main)',
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
                {form.role === 'super_admin' && '✅ Full access — all pages, all countries, all actions'}
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
          <button className={fStyles.submitBtn} onClick={handleInvite} disabled={saving}>
            {saving ? <span className={fStyles.spinner} /> : <><Mail size={14} /> Send Invite Email</>}
          </button>
        </div>
      </Modal>

      {/* ── View User Modal ── */}
      {viewUser && (
        <Modal open={!!viewUser} onClose={() => setViewUser(null)} title="User Details" width={480}>
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: '#fff' }}>
                {getInitials(viewUser.name)}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>{viewUser.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{viewUser.email}</div>
                <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                  {viewUser.invitation_status === 'pending' && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: 'var(--amber-light)', color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={10} /> Invite Pending
                    </span>
                  )}
                  {viewUser.status === 'active' && viewUser.invitation_status !== 'pending' && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: 'var(--green-light)', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle size={10} /> Active
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {[
                { label: 'Role',           value: viewUser.role?.replace('_', ' ').toUpperCase() },
                { label: 'Department',     value: viewUser.department || '—' },
                { label: 'Phone',          value: viewUser.phone      || '—' },
                { label: 'Country Access', value: viewUser.country_access === 'ALL' ? '🌍 All' : (viewUser.country_access || 'US').split(',').map(c => c.trim() === 'PK' ? '🇵🇰 Pakistan' : '🇺🇸 USA').join(', ') },
                { label: 'Last Login',     value: viewUser.last_login_at ? fmtDateTime(viewUser.last_login_at) : 'Never' },
                { label: 'Member Since',   value: fmtDateTime(viewUser.created_at) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', textTransform: label === 'Role' ? 'capitalize' : 'none' }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className={fStyles.cancelBtn} onClick={() => setViewUser(null)}>Close</button>
              <button className={fStyles.submitBtn} onClick={() => sendResetEmail(viewUser.email)}>
                <Mail size={14} /> {viewUser.invitation_status === 'pending' ? 'Resend Invite' : 'Send Password Reset'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}