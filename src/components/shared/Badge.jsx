// src/components/shared/Badge.jsx
import { statusColor } from '../../utils/formatters'

export default function Badge({ status, label }) {
  const { bg, color } = statusColor(status)
  return (
    <span style={{
      background: bg, color, fontSize: 11, fontWeight: 600,
      padding: '3px 10px', borderRadius: 99, textTransform: 'capitalize',
      display: 'inline-block', whiteSpace: 'nowrap',
    }}>
      {label || status}
    </span>
  )
}
