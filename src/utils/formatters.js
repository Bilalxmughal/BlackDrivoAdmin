// src/utils/formatters.js

export const fmtMoney = (n) =>
  `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const fmtDateTime = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-US', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export const getInitials = (name = '') =>
  name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'

export const statusColor = (status) => {
  const map = {
    active:     { bg: 'var(--green-light)',   color: 'var(--green)'  },
    completed:  { bg: 'var(--blue-light)',    color: 'var(--blue)'   },
    pending:    { bg: 'var(--amber-light)',   color: 'var(--amber)'  },
    dispatched: { bg: 'var(--accent-light)',  color: 'var(--accent)' },
    cancelled:  { bg: 'rgba(239,68,68,0.1)', color: '#EF4444'       },
    inactive:   { bg: 'var(--border)',        color: 'var(--text-muted)' },
    suspended:  { bg: 'rgba(239,68,68,0.1)', color: '#EF4444'       },
  }
  return map[status] || map.pending
}
