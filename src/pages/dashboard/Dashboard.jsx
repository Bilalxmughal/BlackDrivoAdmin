// src/pages/dashboard/Dashboard.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Car, BookOpen, DollarSign,
  TrendingUp, TrendingDown, ArrowUpRight,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { format, subDays, startOfDay } from 'date-fns'
import { supabase } from '../../supabase/client'
import { useCountry } from '../../hooks/useCountry'
import styles from './Dashboard.module.css'

// ── Custom Tooltip ─────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#111', color: '#fff', padding: '8px 12px',
      borderRadius: 8, fontSize: 12, fontFamily: 'var(--font-body)',
    }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>{label}</div>
      <div><strong>${payload[0]?.value?.toLocaleString()}</strong></div>
    </div>
  )
}

// ── Stat Card ──────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, iconBg, iconColor, change, loading }) {
  const isUp = change >= 0
  return (
    <div className={styles.statCard}>
      <div className={styles.statHeader}>
        <span className={styles.statLabel}>{label}</span>
        <div className={styles.statIcon} style={{ background: iconBg }}>
          <Icon size={17} color={iconColor} />
        </div>
      </div>
      {loading
        ? <div className={styles.skeleton} style={{ height: 36, width: '60%' }} />
        : <div className={styles.statValue}>{value}</div>
      }
      <div className={styles.statFooter}>
        <span className={`${styles.statBadge} ${isUp ? styles.up : styles.down}`}>
          {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {Math.abs(change)}%
        </span>
        <span>vs last month</span>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()
  const { selectedCountry } = useCountry()
  const [loading, setLoading] = useState(true)
  const [tripFilter, setTripFilter] = useState('Week')
  const [stats, setStats] = useState({
    passengers: 0, drivers: 0, trips: 0,
    grossAmount: 0, driverAmount: 0, activeTrips: 0,
  })
  const [recentTrips, setRecentTrips] = useState([])
  const [incomeData,  setIncomeData]  = useState([])
  const [tripsData,   setTripsData]   = useState([])

  useEffect(() => { fetchDashboard() }, [selectedCountry])

  const applyCountryFilter = (q) => {
    if (!selectedCountry || selectedCountry === 'ALL') return q
    return q.eq('country_code', selectedCountry)
  }

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      const [
        { count: passCount },
        { count: driverCount },
        { count: tripCount },
        { count: activeCount },
        { data: bookings },
        { data: recent },
      ] = await Promise.all([
        applyCountryFilter(supabase.from('passengers').select('*', { count: 'exact', head: true })),
        applyCountryFilter(supabase.from('drivers').select('*', { count: 'exact', head: true })).eq('status', 'active'),
        applyCountryFilter(supabase.from('bookings').select('*', { count: 'exact', head: true })),
        applyCountryFilter(supabase.from('bookings').select('*', { count: 'exact', head: true })).eq('status', 'active'),
        applyCountryFilter(supabase.from('bookings').select('fare, driver_amount, gross_amount, status, created_at')),
        applyCountryFilter(
          supabase.from('bookings')
            .select('id, status, fare, created_at, passengers ( name, avatar_url )')
        ).order('created_at', { ascending: false }).limit(6),
      ])

      const gross  = (bookings || []).reduce((s, b) => s + (b.gross_amount  || 0), 0)
      const driver = (bookings || []).reduce((s, b) => s + (b.driver_amount || 0), 0)

      setStats({
        passengers: passCount   || 0,
        drivers:    driverCount || 0,
        trips:      tripCount   || 0,
        grossAmount:  gross,
        driverAmount: driver,
        activeTrips: activeCount || 0,
      })
      setRecentTrips(recent || [])

      // Last 7 days charts
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = subDays(new Date(), 6 - i)
        const dStart = startOfDay(d).toISOString()
        const dEnd   = startOfDay(subDays(d, -1)).toISOString()
        const slice  = (bookings || []).filter(b => b.created_at >= dStart && b.created_at < dEnd)
        return {
          day:    format(d, 'EEE'),
          amount: Math.round(slice.reduce((s, b) => s + (b.fare || 0), 0)),
          trips:  slice.length,
        }
      })
      setIncomeData(days)
      setTripsData(days)

    } catch (err) {
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fmt      = (n) => (n || 0).toLocaleString()
  const fmtMoney = (n) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const initials = (name = '') => name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'
  const badgeCls = (s) => `${styles.badge} ${styles[s] || styles.pending}`

  return (
    <div className={styles.page}>

      {/* Country indicator — only show when filtering by specific country */}
      {selectedCountry && selectedCountry !== 'ALL' && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: selectedCountry === 'PK' ? 'rgba(0,100,0,0.06)' : 'rgba(0,50,200,0.05)',
          border: `1px solid ${selectedCountry === 'PK' ? 'rgba(0,130,0,0.15)' : 'rgba(0,50,200,0.1)'}`,
          borderRadius: 99, padding: '5px 14px', marginBottom: 18, fontSize: 13, fontWeight: 600,
          color: 'var(--text-secondary)',
        }}>
          Showing {selectedCountry === 'PK' ? 'Pakistan' : 'United States'} data
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className={styles.statsGrid}>
        <StatCard label="Total Passengers" icon={Users}     iconBg="var(--blue-light)"   iconColor="var(--blue)"   value={fmt(stats.passengers)}        change={13.9} loading={loading} />
        <StatCard label="Active Drivers"   icon={Car}       iconBg="var(--accent-light)" iconColor="var(--accent)" value={fmt(stats.drivers)}           change={8.2}  loading={loading} />
        <StatCard label="Total Trips"      icon={BookOpen}  iconBg="var(--amber-light)"  iconColor="var(--amber)"  value={fmt(stats.trips)}             change={12.0} loading={loading} />
        <StatCard label="Gross Revenue"    icon={DollarSign}iconBg="var(--green-light)"  iconColor="var(--green)"  value={fmtMoney(stats.grossAmount)}  change={18.5} loading={loading} />
      </div>

      {/* ── Mid Row ── */}
      <div className={styles.midRow}>

        {/* Income Chart */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>Income Tracker</div>
              <div className={styles.cardSub}>Daily revenue — last 7 days</div>
            </div>
            <div className={styles.filterBar}>
              {['Week', 'Month'].map(f => (
                <button key={f} className={`${styles.filterBtn} ${tripFilter === f ? styles.active : ''}`}
                  onClick={() => setTripFilter(f)}>{f}</button>
              ))}
            </div>
          </div>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={incomeData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#E8533A" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#E8533A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day"    tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} />
                <YAxis                  tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="amount" stroke="#E8533A" strokeWidth={2}
                  fill="url(#incGrad)" dot={{ r: 3, fill: '#E8533A' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trip Volume */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>Trip Volume</div>
              <div className={styles.cardSub}>Trips per day — last 7 days</div>
            </div>
          </div>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={tripsData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day"  tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} />
                <YAxis               tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="trips" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Split */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>Revenue Split</div>
              <div className={styles.cardSub}>Gross vs driver payout</div>
            </div>
          </div>
          <div className={styles.grossAmount}>
            {loading
              ? <div className={styles.skeleton} style={{ height: 40, width: '70%' }} />
              : <>
                  <div className={styles.grossNum}>{fmtMoney(stats.grossAmount)}</div>
                  <div className={styles.grossSub}>Total revenue collected</div>
                </>
            }
          </div>
          <div className={styles.revSplit}>
            {[
              { label: 'Gross Revenue', color: '#3DB87A', value: stats.grossAmount, pct: 100 },
              { label: 'Driver Payout', color: '#E8533A', value: stats.driverAmount,
                pct: stats.grossAmount ? (stats.driverAmount / stats.grossAmount) * 100 : 0 },
              { label: 'Net (Platform)', color: '#3B82F6',
                value: stats.grossAmount - stats.driverAmount,
                pct: stats.grossAmount ? ((stats.grossAmount - stats.driverAmount) / stats.grossAmount) * 100 : 0 },
            ].map(item => (
              <div key={item.label}>
                <div className={styles.revItem}>
                  <span className={styles.revLabel}>
                    <span className={styles.revDot} style={{ background: item.color }} />
                    {item.label}
                  </span>
                  <span className={styles.revValue}>{fmtMoney(item.value)}</span>
                </div>
                <div className={styles.revBar}>
                  <div className={styles.revBarFill} style={{ width: `${item.pct}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div className={styles.bottomRow}>

        {/* Recent Trips */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>Recent Trips</div>
              <div className={styles.cardSub}>Latest bookings across all cities</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className={styles.activePill}>
                <span className={styles.activeDot} />
                {fmt(stats.activeTrips)} Active
              </div>
              <button className={styles.seeAll} onClick={() => navigate('/bookings')}>
                See All <ArrowUpRight size={12} style={{ display: 'inline' }} />
              </button>
            </div>
          </div>
          <div className={styles.tripList}>
            {loading
              ? Array(4).fill(0).map((_, i) => (
                  <div key={i} className={styles.skeleton} style={{ height: 58, borderRadius: 12 }} />
                ))
              : recentTrips.length === 0
              ? <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '8px 0' }}>
                  No bookings yet.
                </div>
              : recentTrips.map(trip => (
                  <div key={trip.id} className={styles.tripItem}
                    onClick={() => navigate(`/bookings/${trip.id}`)}>
                    <div className={styles.tripAvatar}>
                      {trip.passengers?.avatar_url
                        ? <img src={trip.passengers.avatar_url} alt="" />
                        : initials(trip.passengers?.name || 'Unknown')
                      }
                    </div>
                    <div className={styles.tripInfo}>
                      <div className={styles.tripName}>{trip.passengers?.name || 'Unknown Passenger'}</div>
                      <div className={styles.tripDate}>
                        {trip.created_at ? format(new Date(trip.created_at), 'EEE dd MMM yyyy') : '—'}
                      </div>
                    </div>
                    <div className={styles.tripRight}>
                      <span className={badgeCls(trip.status)}>{trip.status}</span>
                      <span className={styles.tripAmount}>${(trip.fare || 0).toFixed(2)}</span>
                    </div>
                  </div>
                ))
            }
          </div>
        </div>

        {/* Quick Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className={styles.card} style={{ padding: 20 }}>
            <div className={styles.cardTitle} style={{ marginBottom: 8 }}>Active Right Now</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 56, fontWeight: 800,
              color: 'var(--green)', letterSpacing: -2, lineHeight: 1,
            }}>
              {loading ? '—' : fmt(stats.activeTrips)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              Trips currently in progress
            </div>
            <button className={styles.seeAll}
              style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => navigate('/dispatch')}>
              Open Dispatch Map <ArrowUpRight size={12} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Drivers',    value: stats.drivers,    color: 'var(--accent)', Icon: Car   },
              { label: 'Passengers', value: stats.passengers, color: 'var(--blue)',   Icon: Users },
            ].map(({ label, value, color, Icon }) => (
              <div key={label} className={styles.card} style={{ padding: 16 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: `${color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10,
                }}>
                  <Icon size={16} color={color} />
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700,
                  color: 'var(--text-primary)', letterSpacing: -0.5,
                }}>
                  {loading ? '—' : fmt(value)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
