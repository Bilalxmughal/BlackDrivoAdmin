// src/pages/bookings/Bookings.jsx
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Eye, Trash2, ChevronUp, ChevronDown,
  ChevronsUpDown, Search, RefreshCw, MapPin,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../supabase/client'
import { useCountry } from '../../hooks/useCountry'
import Badge from '../../components/shared/Badge'
import { fmtMoney, fmtDateTime, getInitials } from '../../utils/formatters'
import styles from './Bookings.module.css'

const PAGE_SIZE = 15

const STATUS_LIST = ['all', 'pending', 'dispatched', 'active', 'completed', 'cancelled']

export default function Bookings() {
  const navigate = useNavigate()
  const { selectedCountry } = useCountry()
  const [bookings, setBookings]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [sortCol, setSortCol]       = useState('created_at')
  const [sortDir, setSortDir]       = useState('desc')
  const [statusFilter, setStatus]   = useState('all')
  const [search, setSearch]         = useState('')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')
  const [cityFilter, setCity]       = useState('all')
  const [counts, setCounts]         = useState({})

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('bookings')
        .select(`
          id, booking_ref, status, fare, gross_amount, driver_amount,
          pickup_address, dropoff_address, created_at, source, city, ride_type, country_code,
          passengers ( id, name, email, avatar_url ),
          drivers    ( id, name, avatar_url )
        `, { count: 'exact' })

      // Country filter
      if (selectedCountry && selectedCountry !== 'ALL') query = query.eq('country_code', selectedCountry)
      if (statusFilter !== 'all') query = query.eq('status', statusFilter)
      if (cityFilter   !== 'all') query = query.eq('city', cityFilter)
      if (dateFrom) query = query.gte('created_at', dateFrom)
      if (dateTo)   query = query.lte('created_at', dateTo + 'T23:59:59')
      if (search)   query = query.ilike('booking_ref', `%${search}%`)

      query = query
        .order(sortCol, { ascending: sortDir === 'asc' })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

      const { data, count, error } = await query
      if (error) throw error

      setBookings(data || [])
      setTotal(count || 0)
    } catch (err) {
      toast.error('Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }, [selectedCountry, statusFilter, cityFilter, dateFrom, dateTo, search, sortCol, sortDir, page])

  // Fetch status counts
  const fetchCounts = async () => {
    try {
      const { data } = await supabase
        .from('bookings')
        .select('status')
      if (!data) return
      const c = {}
      data.forEach(b => { c[b.status] = (c[b.status] || 0) + 1 })
      c.all = data.length
      setCounts(c)
    } catch { /* silent */ }
  }

  useEffect(() => { fetchBookings() }, [fetchBookings])
  useEffect(() => { fetchCounts() }, [])

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
    setPage(1)
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Delete this booking?')) return
    const { error } = await supabase.from('bookings').delete().eq('id', id)
    if (error) { toast.error('Delete failed'); return }
    toast.success('Booking deleted')
    fetchBookings()
    fetchCounts()
  }

  const clearFilters = () => {
    setStatus('all'); setCity('all')
    setDateFrom(''); setDateTo(''); setSearch('')
    setPage(1)
  }

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <ChevronsUpDown size={12} />
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitle}>Bookings</div>
          <div className={styles.pageSub}>Manage all trips, orders and dispatches</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className={styles.addBtn} style={{ background: 'var(--blue)' }}
            onClick={() => navigate('/dispatch')}>
            <MapPin size={15} /> Dispatch Map
          </button>
          <button className={styles.addBtn} onClick={() => navigate('/bookings/new')}>
            <Plus size={15} /> New Booking
          </button>
        </div>
      </div>

      {/* ── Status Strip ── */}
      <div className={styles.statsStrip}>
        {STATUS_LIST.map(s => (
          <div
            key={s}
            className={`${styles.stripCard} ${statusFilter === s ? styles.active : ''}`}
            onClick={() => { setStatus(s); setPage(1) }}
          >
            <div className={styles.stripLabel}>{s === 'all' ? 'All Trips' : s}</div>
            <div className={styles.stripValue}>{counts[s] || 0}</div>
          </div>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <div className={styles.filterBar}>
        {/* Search */}
        <div className={styles.filterGroup}>
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input
            className={styles.filterInput}
            placeholder="Search booking ref..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>

        <div className={styles.filterDivider} />

        {/* City */}
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>City</span>
          <select className={styles.filterSelect} value={cityFilter}
            onChange={e => { setCity(e.target.value); setPage(1) }}>
            <option value="all">All Cities</option>
            <option value="lahore">Lahore</option>
            <option value="karachi">Karachi</option>
            <option value="islamabad">Islamabad</option>
            <option value="atlanta">Atlanta</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className={styles.filterDivider} />

        {/* Date Range */}
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>From</span>
          <input type="date" className={styles.filterDate}
            value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }} />
        </div>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>To</span>
          <input type="date" className={styles.filterDate}
            value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }} />
        </div>

        <div className={styles.filterDivider} />

        <button className={styles.clearBtn} onClick={clearFilters}>Clear</button>
        <button className={styles.clearBtn} onClick={fetchBookings} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* ── Table ── */}
      <div className={styles.tableWrap}>
        <div className={styles.tableHeader}>
          <div>
            <div className={styles.tableTitle}>All Bookings</div>
            <div className={styles.tableCount}>{total} total records</div>
          </div>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              {[
                { label: 'Ref',        col: 'booking_ref'  },
                { label: 'Passenger',  col: null           },
                { label: 'Driver',     col: null           },
                { label: 'Ride Type',  col: 'ride_type'    },
                { label: 'Pickup',     col: null           },
                { label: 'Status',     col: 'status'       },
                { label: 'Fare',       col: 'fare'         },
                { label: 'Date',       col: 'created_at'   },
                { label: 'Actions',    col: null           },
              ].map(({ label, col }) => (
                <th key={label} className={styles.th}
                  onClick={() => col && handleSort(col)}>
                  <div className={styles.thInner}>
                    {label} {col && <SortIcon col={col} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array(8).fill(0).map((_, i) => (
                  <tr key={i}>
                    {Array(9).fill(0).map((_, j) => (
                      <td key={j} className={styles.td}>
                        <div className={styles.skeleton} style={{ height: 16, width: '80%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              : bookings.length === 0
              ? (
                <tr>
                  <td colSpan={9} className={styles.td}>
                    <div className={styles.empty}>
                      <div className={styles.emptyIcon}>📋</div>
                      No bookings found
                    </div>
                  </td>
                </tr>
              )
              : bookings.map(b => (
                  <tr key={b.id} className={styles.tr}>

                    {/* Ref */}
                    <td className={styles.td}>
                      <span className={styles.bookingRef}>{b.booking_ref || '—'}</span>
                    </td>

                    {/* Passenger */}
                    <td className={styles.td}>
                      <div className={styles.passengerCell}>
                        <div className={styles.avatar}>
                          {b.passengers?.avatar_url
                            ? <img src={b.passengers.avatar_url} alt="" />
                            : getInitials(b.passengers?.name || '?')
                          }
                        </div>
                        <div>
                          <div className={styles.passengerName}>{b.passengers?.name || '—'}</div>
                          <div className={styles.passengerEmail}>{b.passengers?.email || ''}</div>
                        </div>
                      </div>
                    </td>

                    {/* Driver */}
                    <td className={styles.td}>
                      {b.drivers?.name
                        ? <div className={styles.driverCell}>
                            <div className={styles.avatar} style={{ width: 26, height: 26, fontSize: 10 }}>
                              {getInitials(b.drivers.name)}
                            </div>
                            {b.drivers.name}
                          </div>
                        : <span className={styles.unassigned}>Unassigned</span>
                      }
                    </td>

                    {/* Ride Type */}
                    <td className={styles.td}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue)', background: 'var(--blue-light)', padding: '3px 8px', borderRadius: 99, whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
                        {(b.ride_type || 'city_to_city').replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Pickup */}
                    <td className={styles.td} style={{ maxWidth: 160 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-secondary)' }}>
                        {b.pickup_address || '—'}
                      </div>
                    </td>

                    {/* Status */}
                    <td className={styles.td}>
                      <Badge status={b.status} />
                    </td>

                    {/* Fare */}
                    <td className={styles.td}>
                      <span className={styles.amount}>{fmtMoney(b.fare)}</span>
                    </td>

                    {/* Date */}
                    <td className={styles.td} style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {fmtDateTime(b.created_at)}
                    </td>

                    {/* Actions */}
                    <td className={styles.td}>
                      <div className={styles.actions}>
                        <button className={styles.actionBtn} onClick={() => navigate(`/bookings/${b.id}`)}>
                          <Eye size={13} />
                        </button>
                        <button className={`${styles.actionBtn} ${styles.danger}`} onClick={(e) => handleDelete(e, b.id)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>

        {/* ── Pagination ── */}
        {total > PAGE_SIZE && (
          <div className={styles.pagination}>
            <span className={styles.pgInfo}>
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <div className={styles.pgBtns}>
              <button className={styles.pgBtn} disabled={page === 1}
                onClick={() => setPage(p => p - 1)}>← Prev</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                <button key={p} className={`${styles.pgBtn} ${page === p ? styles.active : ''}`}
                  onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className={styles.pgBtn} disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
