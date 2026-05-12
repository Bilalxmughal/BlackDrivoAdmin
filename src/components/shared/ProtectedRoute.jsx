// src/components/shared/ProtectedRoute.jsx
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useCountry } from '../../hooks/useCountry'

const Spinner = () => (
  <div style={{
    height: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: 'var(--bg-main)',
    flexDirection: 'column', gap: 16,
  }}>
    <div style={{
      width: 36, height: 36,
      border: '3px solid var(--border)',
      borderTopColor: 'var(--accent)',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
    <span style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
      Loading BlackDrivo...
    </span>
  </div>
)

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const { initCountry, initialized, userCountryAccess } = useCountry()
  const [timedOut, setTimedOut] = useState(false)

  // Safety timeout — if loading takes >5s, force redirect to login
  useEffect(() => {
    const t = setTimeout(() => {
      if (loading) setTimedOut(true)
    }, 5000)
    return () => clearTimeout(t)
  }, [loading])

  if (timedOut) return <Navigate to="/login" replace />
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />

  return children
}
