// src/components/layout/AppLayout.jsx
import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { useAuth } from '../../hooks/useAuth'
import { useCountry } from '../../hooks/useCountry'

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { userProfile } = useAuth()
  const { selectedCountry, initCountry } = useCountry()

  useEffect(() => {
    if (userProfile?.country_access && !selectedCountry) {
      initCountry(userProfile.country_access)
    }
  }, [userProfile])

  const mainStyle = {
    marginLeft:  collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
    marginTop:   'var(--topbar-height)',
    transition:  'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)',
    minHeight:   'calc(100vh - var(--topbar-height))',
    background:  'var(--bg-main)',
    flex: 1,
    width: collapsed
      ? 'calc(100vw - var(--sidebar-collapsed))'
      : 'calc(100vw - var(--sidebar-width))',
    overflowX: 'hidden',
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <TopBar sidebarCollapsed={collapsed} collapsed={collapsed} setCollapsed={setCollapsed} />
      <main style={mainStyle}>
        <Outlet />
      </main>
    </div>
  )
}
