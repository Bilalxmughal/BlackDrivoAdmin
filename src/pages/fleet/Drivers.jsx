// src/pages/fleet/Drivers.jsx
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, Edit2, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, Search, RefreshCw, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../supabase/client'
import { useCountry } from '../../hooks/useCountry'
import Badge from '../../components/shared/Badge'
import AddDriverForm from './forms/AddDriverForm'
import { fmtDate, getInitials } from '../../utils/formatters'
import styles from '../../components/shared/PageLayout.module.css'
import fStyles from '../../components/shared/Form.module.css'

const PAGE_SIZE = 15

export default function Drivers() {
  const navigate = useNavigate()
  const { selectedCountry } = useCountry()
  const [data, setData]       = useState([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState('all')
  const [city, setCity]       = useState('all')
  const [sortCol, setSortCol] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [addOpen, setAddOpen] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      let q = supabase.from('drivers')
        .select('id, unique_id, name, email, phone, city, country_code, status, source, total_trips, rating, created_at, vehicles(plate_number, category)', { count: 'exact' })

      if (selectedCountry && selectedCountry !== 'ALL') q = q.eq('country_code', selectedCountry)
      if (status !== 'all') q = q.eq('status', status)
      if (city   !== 'all') q = q.eq('city', city)
      if (search) q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)

      q = q.order(sortCol, { ascending: sortDir === 'asc' })
           .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

      const { data: rows, count, error } = await q
      if (error) throw error
      setData(rows || [])
      setTotal(count || 0)
    } catch { toast.error('Failed to load drivers') }
    finally { setLoading(false) }
  }, [selectedCountry, search, status, city, sortCol, sortDir, page])

  useEffect(() => { fetch() }, [fetch])

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
    setPage(1)
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Delete this driver?')) return
    const { error } = await supabase.from('drivers').delete().eq('id', id)
    if (error) { toast.error('Delete failed'); return }
    toast.success('Driver deleted')
    fetch()
  }

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <ChevronsUpDown size={11} />
    return sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.pageTitle}>Drivers</div>
          <div className={styles.pageSub}>Manage your fleet drivers and their assignments</div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.addBtn} onClick={() => setAddOpen(true)}>
            <Plus size={15} /> Add Driver
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input className={styles.filterInput} placeholder="Search name, phone, email..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <div className={styles.filterDivider} />
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Status</span>
          <select className={styles.filterSelect} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        <div className={styles.filterDivider} />
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>City</span>
          <select className={styles.filterSelect} value={city} onChange={e => { setCity(e.target.value); setPage(1) }}>
            <option value="all">All Cities</option>
            <option value="lahore">Lahore</option>
            <option value="karachi">Karachi</option>
            <option value="islamabad">Islamabad</option>
            <option value="atlanta">Atlanta</option>
          </select>
        </div>
        <div className={styles.filterDivider} />
        <button className={styles.clearBtn} onClick={() => { setSearch(''); setStatus('all'); setCity('all'); setPage(1) }}>Clear</button>
        <button className={styles.clearBtn} onClick={fetch} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <div className={styles.tableHeader}>
          <div>
            <div className={styles.tableTitle}>Driver List</div>
            <div className={styles.tableCount}>{total} total drivers</div>
          </div>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              {[
                { label: 'ID',         col: 'unique_id'   },
                { label: 'Driver',     col: 'name'        },
                { label: 'Contact',    col: null          },
                { label: 'Country/City',col:'city'        },
                { label: 'Vehicle',    col: null          },
                { label: 'Source',     col: 'source'      },
                { label: 'Trips',      col: 'total_trips' },
                { label: 'Rating',     col: 'rating'      },
                { label: 'Status',     col: 'status'      },
                { label: 'Joined',     col: 'created_at'  },
                { label: 'Actions',    col: null          },
              ].map(({ label, col }) => (
                <th key={label} className={styles.th} onClick={() => col && handleSort(col)}>
                  <div className={styles.thInner}>{label} {col && <SortIcon col={col} />}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array(8).fill(0).map((_, i) => (
                  <tr key={i}>{Array(10).fill(0).map((_, j) => (
                    <td key={j} className={styles.td}><div className={styles.skeleton} style={{ height: 14, width: '75%' }} /></td>
                  ))}</tr>
                ))
              : data.length === 0
              ? <tr><td colSpan={10} className={styles.td}>
                  <div className={styles.empty}><div className={styles.emptyIcon}>🚗</div>No drivers found</div>
                </td></tr>
              : data.map(d => (
                  <tr key={d.id} className={styles.tr}>
                    <td className={styles.td}>
                      <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--accent)', letterSpacing: 0.3 }}>
                        {d.unique_id || '—'}
                      </div>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.personCell}>
                        <div className={styles.avatar}>{getInitials(d.name)}</div>
                        <div>
                          <div className={styles.personName}>{d.name}</div>
                          <div className={styles.personSub}>{d.email || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className={styles.td} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{d.phone}</td>
                    <td className={styles.td}>
                      <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>
                        {d.country_code === 'PK' ? '🇵🇰 Pakistan' : d.country_code === 'US' ? '🇺🇸 USA' : '—'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{d.city || '—'}</div>
                    </td>
                    <td className={styles.td}>
                      {d.vehicles
                        ? <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                            {d.vehicles.plate_number} <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'capitalize' }}>· {d.vehicles.category}</span>
                          </span>
                        : <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned</span>
                      }
                    </td>
                    <td className={styles.td}>
                      <span className={`${fStyles.sourceBadge} ${d.source === 'admin_created' ? fStyles.sourceAdmin : fStyles.sourceSelf}`}>
                        {d.source === 'admin_created' ? 'Admin' : 'App'}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>{d.total_trips || 0}</span>
                    </td>
                    <td className={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Star size={12} fill="var(--amber)" color="var(--amber)" />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{d.rating || '5.00'}</span>
                      </div>
                    </td>
                    <td className={styles.td}><Badge status={d.status || 'active'} /></td>
                    <td className={styles.td} style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDate(d.created_at)}</td>
                    <td className={styles.td}>
                      <div className={styles.actions}>
                        <button className={styles.actionBtn} onClick={() => navigate(`/drivers/${d.id}`)}><Eye size={13} /></button>
                        <button className={`${styles.actionBtn} ${styles.danger}`} onClick={e => handleDelete(e, d.id)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>

        {total > PAGE_SIZE && (
          <div className={styles.pagination}>
            <span className={styles.pgInfo}>Showing {Math.min((page-1)*PAGE_SIZE+1, total)}–{Math.min(page*PAGE_SIZE, total)} of {total}</span>
            <div className={styles.pgBtns}>
              <button className={styles.pgBtn} disabled={page===1} onClick={() => setPage(p=>p-1)}>← Prev</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i+1).map(p => (
                <button key={p} className={`${styles.pgBtn} ${page===p ? styles.pgActive : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className={styles.pgBtn} disabled={page===totalPages} onClick={() => setPage(p=>p+1)}>Next →</button>
            </div>
          </div>
        )}
      </div>

      <AddDriverForm open={addOpen} onClose={() => setAddOpen(false)} onSuccess={fetch} />
    </div>
  )
}
