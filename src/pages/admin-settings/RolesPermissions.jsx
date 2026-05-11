// src/pages/admin-settings/RolesPermissions.jsx
import { useEffect, useState } from 'react'
import { Save, Shield, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../supabase/client'

const ROLES = ['super_admin', 'admin', 'ops', 'dispatcher', 'finance']
const PAGES = [
  { key: 'dashboard',       label: 'Dashboard',       actions: ['view', 'edit'] },
  { key: 'bookings',        label: 'Bookings',         actions: ['view', 'edit', 'add', 'delete'] },
  { key: 'dispatch',        label: 'Dispatch Map',     actions: ['view', 'edit'] },
  { key: 'passengers',      label: 'Passengers',       actions: ['view', 'edit', 'add', 'delete'] },
  { key: 'drivers',         label: 'Drivers',          actions: ['view', 'edit', 'add', 'delete'] },
  { key: 'vehicles',        label: 'Vehicles',         actions: ['view', 'edit', 'add', 'delete'] },
  { key: 'app_settings',    label: 'App Settings',     actions: ['view', 'edit'] },
  { key: 'admin_settings',  label: 'Admin Settings',   actions: ['view', 'edit'] },
  { key: 'user_management', label: 'User Management',  actions: ['view', 'edit', 'add', 'delete'] },
  { key: 'activity_log',    label: 'Activity Log',     actions: ['view'] },
]

const ROLE_COLORS = {
  super_admin: '#111',
  admin:       'var(--accent)',
  ops:         'var(--blue)',
  dispatcher:  'var(--green)',
  finance:     'var(--amber)',
}

export default function RolesPermissions() {
  const [perms, setPerms]     = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [activeRole, setRole] = useState('super_admin')

  useEffect(() => { fetchPerms() }, [])

  const fetchPerms = async () => {
    setLoading(true)
    const { data } = await supabase.from('roles_config').select('*')
    if (data) {
      const map = {}
      data.forEach(r => { map[r.role] = r.permissions })
      setPerms(map)
    }
    setLoading(false)
  }

  const toggle = (page, action) => {
    setPerms(prev => ({
      ...prev,
      [activeRole]: {
        ...prev[activeRole],
        [page]: {
          ...prev[activeRole]?.[page],
          [action]: !prev[activeRole]?.[page]?.[action],
        }
      }
    }))
  }

  const savePerms = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('roles_config')
        .upsert({ role: activeRole, permissions: perms[activeRole], updated_at: new Date().toISOString() }, { onConflict: 'role' })
      if (error) throw error
      toast.success(`${activeRole.replace('_', ' ')} permissions saved!`)
    } catch {
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  const has = (page, action) => perms[activeRole]?.[page]?.[action] === true

  return (
    <div style={{ padding: 28, width: '100%', boxSizing: 'border-box', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: -0.5 }}>
          Roles & Permissions
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
          Control page-level access per role
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>

        {/* Role List */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            Roles
          </div>
          {ROLES.map(role => (
            <div key={role} onClick={() => setRole(role)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                cursor: 'pointer', borderBottom: '1px solid var(--border)',
                background: activeRole === role ? 'var(--accent-light)' : 'transparent',
                transition: 'background 0.15s',
              }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: ROLE_COLORS[role], flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: activeRole === role ? 'var(--accent)' : 'var(--text-primary)', textTransform: 'capitalize' }}>
                  {role.replace('_', ' ')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {Object.values(perms[role] || {}).filter(p => p.view).length}/{PAGES.length} pages
                </div>
              </div>
              {activeRole === role && <div style={{ marginLeft: 'auto', color: 'var(--accent)' }}><Shield size={14} /></div>}
            </div>
          ))}
        </div>

        {/* Permissions Table */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                {activeRole.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())} Permissions
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Toggle access per page and action
              </div>
            </div>
            <button onClick={savePerms} disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 18px',
                background: 'var(--accent)', color: '#fff', border: 'none',
                borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-display)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s',
              }}>
              {saving ? '...' : <><Save size={14} /> Save Changes</>}
            </button>
          </div>

          {loading
            ? <div style={{ padding: 32, color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>
            : <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, background: 'var(--bg-main)', borderBottom: '1px solid var(--border)' }}>
                      Page
                    </th>
                    {['View', 'Edit', 'Add', 'Delete'].map(a => (
                      <th key={a} style={{ padding: '10px 16px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, background: 'var(--bg-main)', borderBottom: '1px solid var(--border)' }}>
                        {a}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PAGES.map((page, idx) => (
                    <tr key={page.key} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'transparent' : 'var(--bg-main)' }}>
                      <td style={{ padding: '12px 20px', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                        {page.label}
                      </td>
                      {['view', 'edit', 'add', 'delete'].map(action => (
                        <td key={action} style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {page.actions.includes(action)
                            ? <button onClick={() => toggle(page.key, action)}
                                style={{
                                  width: 28, height: 28, borderRadius: 7, border: 'none',
                                  background: has(page.key, action) ? 'var(--green-light)' : 'var(--bg-main)',
                                  border: has(page.key, action) ? '1.5px solid rgba(61,184,122,0.3)' : '1.5px solid var(--border)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  cursor: 'pointer', transition: 'all 0.15s', margin: '0 auto',
                                }}>
                                {has(page.key, action)
                                  ? <Check size={13} color="var(--green)" />
                                  : <X size={13} color="var(--text-muted)" />
                                }
                              </button>
                            : <span style={{ color: 'var(--border-strong)', fontSize: 16 }}>—</span>
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
          }
        </div>
      </div>
    </div>
  )
}
