// src/components/layout/Sidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, MapPin, Users, Car, Truck,
  Bell, Settings, Shield, UserCog, Activity, User,
  LogOut, ChevronLeft,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { logoutUser } from '../../supabase/auth'
import { useAuth } from '../../hooks/useAuth'

import styles from './Sidebar.module.css'

const NAV = [
  {
    section: 'Main',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    section: 'Operations',
    items: [
      { to: '/bookings',  icon: BookOpen,  label: 'Bookings'  },
      { to: '/dispatch',  icon: MapPin,    label: 'Dispatch'  },
    ],
  },
  {
    section: 'Fleet',
    items: [
      { to: '/drivers',  icon: Truck, label: 'Drivers'  },
      { to: '/vehicles', icon: Car,   label: 'Vehicles' },
    ],
  },
  {
    section: 'Clients',
    items: [
      { to: '/passengers', icon: Users, label: 'Passengers' },
    ],
  },
  {
    section: 'Settings',
    items: [
      { to: '/app-settings',   icon: Bell,    label: 'App Comms'    },
      { to: '/roles',          icon: Shield,  label: 'Roles & Access' },
      { to: '/users',          icon: UserCog, label: 'User Management' },
      { to: '/activity-log',   icon: Activity,label: 'Activity Log'  },
      { to: '/profile',        icon: User,    label: 'My Profile'   },
    ],
  },
]

export default function Sidebar({ collapsed, setCollapsed }) {
  const { userProfile } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logoutUser()
      toast.success('Logged out successfully')
      navigate('/login')
    } catch {
      toast.error('Logout failed')
    }
  }

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      {/* Brand */}
      <div className={styles.brand}>
        <div className={styles.logoMark}>B</div>
        <div className={styles.brandText}>
          <div className={styles.brandName}>BlackDrivo</div>
          <div className={styles.brandSub}>Admin Portal</div>
        </div>
      </div>

      {/* Toggle */}
      <button className={styles.toggleBtn} onClick={() => setCollapsed(!collapsed)}>
        <ChevronLeft size={13} />
      </button>

      {/* Nav */}
      <nav className={styles.nav}>
        {NAV.map((group) => (
          <div key={group.section} className={styles.navSection}>
            <div className={styles.sectionLabel}>{group.section}</div>
            {group.items.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.active : ''}`
                }
              >
                <span className={styles.navIcon}>
                  <Icon size={17} />
                </span>
                <span className={styles.navLabel}>{label}</span>
                <span className={styles.tooltip}>{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom - Logout */}
      <div className={styles.bottom}>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <span className={styles.navIcon}>
            <LogOut size={17} />
          </span>
          <span className={styles.navLabel}>Logout</span>
        </button>
      </div>
    </aside>
  )
}
