// src/pages/app-data/AppPassengers.jsx
import { useEffect, useState, useCallback } from 'react'
import { Search, RefreshCw, Smartphone } from 'lucide-react'
import { supabase } from '../../supabase/client'
import { useCountry } from '../../hooks/useCountry'
import { fmtDateTime, getInitials } from '../../utils/formatters'
import styles from '../../components/shared/PageLayout.module.css'

export default function AppPassengers() {
  const { selectedCountry } = useCountry()
  const [data, setData]     = useState([])
  const [total, setTotal]   = useState(0)
  const [loading, setLoad]  = useState(true)
  const [search, setSearch] = useState('')

  const fetch = useCallback(async () => {
    setLoad(true)
    let q = supabase
      .from('app_passengers')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (selectedCountry && selectedCountry !== 'ALL')
      q = q.eq('country_code', selectedCountry)
    if (search)
      q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)

    const { data: rows, count } = await q
    setData(rows || [])
    setTotal(count || 0)
    setLoad(false)
  }, [selectedCountry, search])

  useEffect(() => { fetch() }, [fetch])

  const flag = (code) => code === 'PK' ? '🇵🇰' : code === 'US' ? '🇺🇸' : '🌍'

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Smartphone size={20} color="var(--accent)" />
            <div className={styles.pageTitle}>App Passengers</div>
          </div>
          <div className={styles.pageSub}>
            Passengers registered via BlackDrivo mobile app · {total} total
          </div>
        </div>
        <button className={styles.clearBtn} onClick={fetch}
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Search */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input className={styles.filterInput}
            placeholder="Search name, email, phone..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {['Passenger', 'Phone', 'Country', 'Rides', 'Status', 'Joined', 'Synced'].map(h => (
                <th key={h} className={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array(5).fill(0).map((_, i) => (
                  <tr key={i}>{Array(7).fill(0).map((_, j) => (
                    <td key={j} className={styles.td}>
                      <div className={styles.skeleton} style={{ height: 14, width: '70%' }} />
                    </td>
                  ))}</tr>
                ))
              : data.length === 0
              ? <tr><td colSpan={7} className={styles.td}>
                  <div className={styles.empty}>
                    <div className={styles.emptyIcon}>📱</div>
                    No app passengers yet
                  </div>
                </td></tr>
              : data.map(p => (
                  <tr key={p.id} className={styles.tr}>
                    <td className={styles.td}>
                      <div className={styles.personCell}>
                        <div className={styles.avatar}
                          style={{ background: 'var(--accent)', fontSize: 13 }}>
                          {getInitials(p.name)}
                        </div>
                        <div>
                          <div className={styles.personName}>{p.name || '—'}</div>
                          <div className={styles.personSub}>{p.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className={styles.td} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {p.phone || '—'}
                    </td>
                    <td className={styles.td} style={{ fontSize: 18 }}>
                      {flag(p.country_code)}
                    </td>
                    <td className={styles.td}>
                      <span style={{
                        fontFamily: 'var(--font-display)', fontSize: 15,
                        fontWeight: 700, color: 'var(--accent)',
                      }}>
                        {p.ride_count || 0}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '3px 10px',
                        borderRadius: 99,
                        background: p.status === 'active' ? 'var(--green-light)' : 'var(--amber-light)',
                        color: p.status === 'active' ? 'var(--green)' : 'var(--amber)',
                      }}>
                        {p.status}
                      </span>
                    </td>
                    <td className={styles.td} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {p.created_at ? fmtDateTime(p.created_at) : '—'}
                    </td>
                    <td className={styles.td} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {p.synced_at ? fmtDateTime(p.synced_at) : '—'}
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}
