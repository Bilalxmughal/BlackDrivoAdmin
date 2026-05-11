// src/components/shared/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  // Max 3 seconds wait — phir bhi loading ho toh force karo
  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-main)',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: 36, height: 36,
          border: '3px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite'
        }} />
        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
          Loading BlackDrivo...
        </span>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return children
}
