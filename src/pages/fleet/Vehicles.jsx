// src/pages/fleet/Vehicles.jsx
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, Search, RefreshCw, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../supabase/client'
import { useCountry } from '../../hooks/useCountry'
import Badge from '../../components/shared/Badge'
import AddVehicleForm from './forms/AddVehicleForm'
import { fmtDate } from '../../utils/formatters'
import styles from '../../components/shared/PageLayout.module.css'

const PAGE_SIZE = 15

const CATEGORY_COLORS = {
  sedan:   { bg: 'var(--blue-light)',   color: 'var(--blue)'   },
  suv:     { bg: 'var(--accent-light)', color: 'var(--accent)' },
  van:     { bg: 'var(--amber-light)',  color: 'var(--amber)'  },
  luxury:  { bg: '#111',               color: '#fff'           },
}

export default function Vehicles() {
  const navigate = useNavigate()
  const { selectedCountry } = useCountry()
  const [data, setData]       = useState([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState('all')
  const [category, setCategory] = useState('all')
  const [sortCol, setSortCol] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [addOpen, setAddOpen] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      let q = supabase.from('vehicles')
        .select('id, company_name, category, model_year, color, plate_number, seat_capacity, status, city, country_code, created_at, registration_doc_url, insurance_doc_url, inspection_doc_url', { count: 'exact' })

      if (selectedCountry && selectedCountry !== 'ALL') q = q.eq('country_code', selectedCountry)
      if (status   !== 'all') q = q.eq('status', status)
      if (category !== 'all') q = q.eq('category', category)
      if (search) q = q.or(`company_name.ilike.%${search}%,plate_number.ilike.%${search}%,color.ilike.%${search}%`)

      q = q.order(sortCol, { ascending: sortDir === 'asc' })
           .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

      const { data: rows, count, error } = await q
      if (error) throw error
      setData(rows || [])
      setTotal(count || 0)
    } catch { toast.error('Failed to load vehicles') }
    finally { setLoading(false) }
  }, [selectedCountry, search, status, category, sortCol, sortDir, page])

  useEffect(() => { fetch() }, [fetch])

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
    setPage(1)
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Delete this vehicle?')) return
    const { error } = await supabase.from('vehicles').delete().eq('id', id)
    if (error) { toast.error('Delete failed'); return }
    toast.success('Vehicle deleted')
    fetch()
  }

  const toggleStatus = async (e, id, current) => {
    e.stopPropagation()
    const next = current === 'active' ? 'inactive' : 'active'
    await supabase.from('vehicles').update({ status: next }).eq('id', id)
    toast.success(`Vehicle marked ${next}`)
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
          <div className={styles.pageTitle}>Vehicles</div>
          <div className={styles.pageSub}>Fleet vehicles — manage cars, documents and status</div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.addBtn} onClick={() => setAddOpen(true)}>
            <Plus size={15} /> Add Vehicle
          </button>
        </div>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input className={styles.filterInput} placeholder="Search make, plate, color..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <div className={styles.filterDivider} />
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Category</span>
          <select className={styles.filterSelect} value={category} onChange={e => { setCategory(e.target.value); setPage(1) }}>
            <option value="all">All</option>
            <option value="sedan">Sedan</option>
            <option value="suv">SUV</option>
            <option value="van">Van</option>
            <option value="luxury">Luxury</option>
          </select>
        </div>
        <div className={styles.filterDivider} />
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Status</span>
          <select className={styles.filterSelect} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className={styles.filterDivider} />
        <button className={styles.clearBtn} onClick={() => { setSearch(''); setStatus('all'); setCategory('all'); setPage(1) }}>Clear</button>
        <button className={styles.clearBtn} onClick={fetch} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className={styles.tableWrap}>
        <div className={styles.tableHeader}>
          <div>
            <div className={styles.tableTitle}>Vehicle Fleet</div>
            <div className={styles.tableCount}>{total} total vehicles</div>
          </div>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              {[
                { label: 'Vehicle',    col: 'company_name'  },
                { label: 'Plate',      col: 'plate_number'  },
                { label: 'Category',   col: 'category'      },
                { label: 'Year',       col: 'model_year'    },
                { label: 'Seats',      col: 'seat_capacity' },
                { label: 'City',       col: 'city'          },
                { label: 'Docs',       col: null            },
                { label: 'Status',     col: 'status'        },
                { label: 'Added',      col: 'created_at'    },
                { label: 'Actions',    col: null            },
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
                  <div className={styles.empty}><div className={styles.emptyIcon}>🚙</div>No vehicles found</div>
                </td></tr>
              : data.map(v => {
                  const catStyle = CATEGORY_COLORS[v.category] || CATEGORY_COLORS.sedan
                  const docCount = [v.registration_doc_url, v.insurance_doc_url, v.inspection_doc_url].filter(Boolean).length
                  return (
                    <tr key={v.id} className={styles.tr}>
                      <td className={styles.td}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{v.company_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{v.color || '—'}</div>
                        </div>
                      </td>
                      <td className={styles.td}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, letterSpacing: 0.5 }}>{v.plate_number}</span>
                      </td>
                      <td className={styles.td}>
                        <span style={{ background: catStyle.bg, color: catStyle.color, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, textTransform: 'capitalize' }}>
                          {v.category}
                        </span>
                      </td>
                      <td className={styles.td} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{v.model_year}</td>
                      <td className={styles.td} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{v.seat_capacity}</td>
                      <td className={styles.td} style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{v.city || '—'}</td>
                      <td className={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <FileText size={13} color={docCount === 3 ? 'var(--green)' : docCount > 0 ? 'var(--amber)' : 'var(--text-muted)'} />
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{docCount}/3</span>
                        </div>
                      </td>
                      <td className={styles.td}><Badge status={v.status || 'active'} /></td>
                      <td className={styles.td} style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDate(v.created_at)}</td>
                      <td className={styles.td} onClick={e => e.stopPropagation()}>
                        <div className={styles.actions}>
                          <button className={styles.actionBtn} onClick={() => navigate(`/vehicles/${v.id}`)}><Eye size={13} /></button>
                          <button className={`${styles.actionBtn} ${v.status === 'active' ? styles.danger : styles.success}`}
                            onClick={e => toggleStatus(e, v.id, v.status)}
                            title={v.status === 'active' ? 'Deactivate' : 'Activate'}>
                            {v.status === 'active' ? '⏸' : '▶'}
                          </button>
                          <button className={`${styles.actionBtn} ${styles.danger}`} onClick={e => handleDelete(e, v.id)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })
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

      <AddVehicleForm open={addOpen} onClose={() => setAddOpen(false)} onSuccess={fetch} />
    </div>
  )
}
