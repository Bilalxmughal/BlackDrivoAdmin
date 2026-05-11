// src/pages/activity-log/ActivityLog.jsx
import { useEffect, useState, useCallback } from 'react'
import { Search, RefreshCw, Send, MessageSquare, LogIn, LogOut, Edit2, Trash2, Plus, Key } from 'lucide-react'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../hooks/useAuth'
import { fmtDateTime, getInitials } from '../../utils/formatters'
import styles from '../../components/shared/PageLayout.module.css'

const ACTION_ICONS = {
  LOGIN:          { icon: LogIn,         color: 'var(--green)'  },
  LOGOUT:         { icon: LogOut,        color: 'var(--text-muted)' },
  CREATE:         { icon: Plus,          color: 'var(--blue)'   },
  UPDATE:         { icon: Edit2,         color: 'var(--amber)'  },
  DELETE:         { icon: Trash2,        color: '#EF4444'       },
  PASSWORD_CHANGE:{ icon: Key,           color: 'var(--accent)' },
  PROFILE_UPDATE: { icon: Edit2,         color: 'var(--accent)' },
}

export default function ActivityLog() {
  const { userProfile } = useAuth()
  const [logs, setLogs]         = useState([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [action, setAction]     = useState('all')
  const [page, setPage]         = useState(1)
  const [tab, setTab]           = useState('logs') // 'logs' | 'comments'
  const [comments, setComments] = useState([])
  const [commentText, setComment]= useState('')
  const PAGE_SIZE = 20

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      let q = supabase.from('activity_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (action !== 'all') q = q.eq('action', action)
      if (search) q = q.or(`user_name.ilike.%${search}%,description.ilike.%${search}%,action.ilike.%${search}%`)

      q = q.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

      const { data, count, error } = await q
      if (!error) { setLogs(data || []); setTotal(count || 0) }
    } finally { setLoading(false) }
  }, [action, search, page])

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('entity', 'internal')
      .order('created_at', { ascending: false })
      .limit(50)
    setComments(data || [])
  }

  useEffect(() => { if (tab === 'logs') fetchLogs() }, [fetchLogs, tab])
  useEffect(() => { if (tab === 'comments') fetchComments() }, [tab])

  const sendComment = async () => {
    if (!commentText.trim()) return
    await supabase.from('comments').insert({
      entity:      'internal',
      entity_id:   '00000000-0000-0000-0000-000000000000',
      author_id:   userProfile?.id,
      author_name: userProfile?.name || 'Admin',
      content:     commentText.trim(),
    })
    setComment('')
    fetchComments()
  }

  const ActionIcon = ({ action }) => {
    const cfg = ACTION_ICONS[action] || { icon: Edit2, color: 'var(--text-muted)' }
    const Icon = cfg.icon
    return (
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: `${cfg.color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={14} color={cfg.color} />
      </div>
    )
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.pageTitle}>Activity Log</div>
          <div className={styles.pageSub}>Full audit trail — every action tracked</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 4, width: 'fit-content' }}>
        {[
          { key: 'logs',     label: 'Activity Logs',     icon: '📋' },
          { key: 'comments', label: 'Internal Comments',  icon: '💬' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              height: 34, padding: '0 16px', borderRadius: 8, border: 'none',
              background: tab === t.key ? 'var(--accent)' : 'transparent',
              color: tab === t.key ? '#fff' : 'var(--text-secondary)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
              transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'logs' && (
        <>
          {/* Filters */}
          <div className={styles.filterBar}>
            <div className={styles.filterGroup}>
              <Search size={14} style={{ color: 'var(--text-muted)' }} />
              <input className={styles.filterInput} placeholder="Search user, action..."
                value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            </div>
            <div className={styles.filterDivider} />
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Action</span>
              <select className={styles.filterSelect} value={action} onChange={e => { setAction(e.target.value); setPage(1) }}>
                <option value="all">All Actions</option>
                {Object.keys(ACTION_ICONS).map(a => (
                  <option key={a} value={a}>{a.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div className={styles.filterDivider} />
            <button className={styles.clearBtn} onClick={() => { setSearch(''); setAction('all'); setPage(1) }}>Clear</button>
            <button className={styles.clearBtn} onClick={fetchLogs} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <RefreshCw size={12} /> Refresh
            </button>
          </div>

          <div className={styles.tableWrap}>
            <div className={styles.tableHeader}>
              <div>
                <div className={styles.tableTitle}>Audit Trail</div>
                <div className={styles.tableCount}>{total} total events</div>
              </div>
            </div>

            <div style={{ padding: '8px 0' }}>
              {loading
                ? Array(8).fill(0).map((_, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                      <div className={styles.skeleton} style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div className={styles.skeleton} style={{ height: 13, width: '40%', marginBottom: 6 }} />
                        <div className={styles.skeleton} style={{ height: 11, width: '60%' }} />
                      </div>
                      <div className={styles.skeleton} style={{ height: 11, width: 120 }} />
                    </div>
                  ))
                : logs.length === 0
                ? <div className={styles.empty}><div className={styles.emptyIcon}>📋</div>No activity logs yet</div>
                : logs.map(log => (
                    <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px', borderBottom: '1px solid var(--border)', transition: 'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-main)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <ActionIcon action={log.action} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{log.user_name || 'System'}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: ACTION_ICONS[log.action]?.color || 'var(--text-muted)', background: `${ACTION_ICONS[log.action]?.color || '#999'}18`, padding: '1px 8px', borderRadius: 99 }}>
                            {log.action?.replace('_', ' ')}
                          </span>
                          {log.entity && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>→ {log.entity}</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{log.description}</div>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDateTime(log.created_at)}</div>
                    </div>
                  ))
              }
            </div>

            {/* Pagination */}
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
        </>
      )}

      {tab === 'comments' && (
        <div className={styles.tableWrap}>
          <div className={styles.tableHeader}>
            <div>
              <div className={styles.tableTitle}>Internal Team Comments</div>
              <div className={styles.tableCount}>Team discussion · use @name to mention</div>
            </div>
          </div>

          {/* Comment Input */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {getInitials(userProfile?.name || 'A')}
            </div>
            <div style={{ flex: 1, display: 'flex', gap: 10 }}>
              <input
                style={{ flex: 1, height: 40, padding: '0 14px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                placeholder="Write a comment... use @name to mention teammates"
                value={commentText}
                onChange={e => setComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sendComment() }}
                onFocus={e => { e.target.style.borderColor = 'var(--accent)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
              />
              <button onClick={sendComment}
                style={{ width: 40, height: 40, background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Send size={15} color="#fff" />
              </button>
            </div>
          </div>

          {/* Comments List */}
          <div style={{ padding: '8px 0', maxHeight: 500, overflowY: 'auto' }}>
            {comments.length === 0
              ? <div className={styles.empty}><div className={styles.emptyIcon}>💬</div>No comments yet. Start the conversation!</div>
              : comments.map(c => (
                  <div key={c.id} style={{ display: 'flex', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {getInitials(c.author_name)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{c.author_name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDateTime(c.created_at)}</span>
                      </div>
                      <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {c.content.split(' ').map((word, i) =>
                          word.startsWith('@')
                            ? <span key={i} style={{ color: 'var(--accent)', fontWeight: 500 }}>{word} </span>
                            : word + ' '
                        )}
                      </div>
                    </div>
                  </div>
                ))
            }
          </div>
        </div>
      )}
    </div>
  )
}
