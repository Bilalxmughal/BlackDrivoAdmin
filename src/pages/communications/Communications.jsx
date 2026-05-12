// src/pages/communications/Communications.jsx
import { useEffect, useState, useRef, useCallback } from 'react'
import { Send, Image, X, Smile, Reply, Hash, Lock, Users, ChevronDown, Trash2, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../supabase/client'
import { useAuth } from '../../hooks/useAuth'
import { fmtDateTime, getInitials } from '../../utils/formatters'

// ── Constants ─────────────────────────────────────────────
const EMOJIS = ['👍','❤️','😂','😮','😢','🔥','✅','👏','🚗','📋']

const GROUP_CHANNELS = [
  { id: 'general',  name: 'General',    icon: Hash,  desc: 'Team-wide announcements' },
  { id: 'ops',      name: 'Operations', icon: Hash,  desc: 'Ops & dispatch team'      },
  { id: 'dispatch', name: 'Dispatch',   icon: Hash,  desc: 'Live ride coordination'   },
  { id: 'finance',  name: 'Finance',    icon: Lock,  desc: 'Finance team only'        },
]

const ROLE_DEPT_MAP = {
  super_admin: 'Management',
  admin:       'Management',
  ops:         'Operations',
  dispatcher:  'Dispatch',
  finance:     'Finance',
}

// ── Helpers ───────────────────────────────────────────────
const dmChannelId = (uid1, uid2) =>
  `dm_${[uid1, uid2].sort().join('_')}`

// ── Message Bubble ─────────────────────────────────────────
function MessageBubble({ msg, isOwn, isSuperAdmin, onReact, onReply, onDelete, allUsers }) {
  const [showEmoji, setShowEmoji] = useState(false)
  if (msg.is_deleted) return (
    <div style={{ padding: '4px 16px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
      🗑 Message deleted
    </div>
  )

  const replyMsg = msg.reply_to_content

  return (
    <div style={{
      display: 'flex', gap: 10, padding: '6px 16px',
      flexDirection: isOwn ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
    }}
      onMouseEnter={e => e.currentTarget.querySelector('.msg-actions')?.style && (e.currentTarget.querySelector('.msg-actions').style.opacity = '1')}
      onMouseLeave={e => e.currentTarget.querySelector('.msg-actions')?.style && (e.currentTarget.querySelector('.msg-actions').style.opacity = '0')}
    >
      {/* Avatar */}
      {!isOwn && (
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0, marginBottom: 20 }}>
          {getInitials(msg.sender_name)}
        </div>
      )}

      <div style={{ maxWidth: '68%', display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', gap: 2 }}>
        {/* Sender name + time */}
        {!isOwn && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{msg.sender_name}</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{msg.sender_role?.replace('_',' ')}</span>
          </div>
        )}

        {/* Reply preview */}
        {replyMsg && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 10px', borderLeft: '3px solid var(--accent)', background: 'var(--bg-main)', borderRadius: '0 6px 6px 0', marginBottom: 4, maxWidth: '100%' }}>
            <strong>{replyMsg.sender_name}:</strong> {replyMsg.content?.substring(0, 60)}{replyMsg.content?.length > 60 ? '...' : ''}
          </div>
        )}

        {/* Bubble */}
        <div style={{
          padding: '10px 14px', borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isOwn ? '#111' : 'var(--bg-card)',
          border: isOwn ? 'none' : '1px solid var(--border)',
          color: isOwn ? '#fff' : 'var(--text-primary)',
          fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          {msg.image_url && (
            <img src={msg.image_url} alt="attachment"
              style={{ maxWidth: 260, maxHeight: 200, borderRadius: 10, display: 'block', marginBottom: msg.content ? 8 : 0, objectFit: 'cover', cursor: 'pointer' }}
              onClick={() => window.open(msg.image_url, '_blank')}
            />
          )}
          {msg.content && <span>{msg.content}</span>}
        </div>

        {/* Reactions */}
        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
            {Object.entries(msg.reactions).map(([emoji, users]) =>
              users.length > 0 && (
                <button key={emoji} onClick={() => onReact(msg.id, emoji)}
                  style={{ padding: '2px 8px', borderRadius: 99, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 3 }}>
                  {emoji} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{users.length}</span>
                </button>
              )
            )}
          </div>
        )}

        {/* Time */}
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Action buttons — hover */}
      <div className="msg-actions" style={{ display: 'flex', gap: 4, alignItems: 'center', opacity: 0, transition: 'opacity 0.15s', flexDirection: isOwn ? 'row-reverse' : 'row', marginBottom: 20, position: 'relative' }}>
        <button onClick={() => onReply(msg)} title="Reply"
          style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <Reply size={12} />
        </button>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowEmoji(!showEmoji)} title="React"
            style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <Smile size={12} />
          </button>
          {showEmoji && (
            <div style={{ position: 'absolute', bottom: 32, left: isOwn ? 'auto' : 0, right: isOwn ? 0 : 'auto', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 8, display: 'flex', gap: 4, flexWrap: 'wrap', width: 200, zIndex: 100, boxShadow: 'var(--shadow-md)' }}>
              {EMOJIS.map(e => (
                <button key={e} onClick={() => { onReact(msg.id, e); setShowEmoji(false) }}
                  style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 6, transition: 'background 0.1s' }}
                  onMouseEnter={ev => ev.currentTarget.style.background = 'var(--bg-main)'}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'none'}>
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
        {(isOwn || isSuperAdmin) && (
          <button onClick={() => onDelete(msg.id)} title="Delete"
            style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────
export default function Communications() {
  const { user, userProfile } = useAuth()
  const [allUsers, setAllUsers]       = useState([])
  const [activeChannel, setChannel]   = useState('general')
  const [channelType, setChanType]    = useState('group') // 'group' | 'dm'
  const [dmUser, setDmUser]           = useState(null)
  const [messages, setMessages]       = useState([])
  const [loading, setLoading]         = useState(false)
  const [text, setText]               = useState('')
  const [image, setImage]             = useState(null)
  const [imagePreview, setImgPrev]    = useState(null)
  const [replyTo, setReplyTo]         = useState(null)
  const [showEmoji, setShowEmoji]     = useState(false)
  const [userSearch, setUserSearch]   = useState('')
  const messagesEnd                   = useRef(null)
  const fileRef                       = useRef(null)
  const channelRef                    = useRef(null)
  const isSuperAdmin = userProfile?.role === 'super_admin'

  // ── Load users ────────────────────────────────────────────
  useEffect(() => {
    supabase.from('users')
      .select('id, name, role, department, status')
      .neq('id', user?.id)
      .order('name')
      .then(({ data }) => setAllUsers(data || []))
  }, [user?.id])

  // ── Load messages + realtime ──────────────────────────────
  const fetchMessages = useCallback(async (chanId) => {
    setLoading(true)
    const { data } = await supabase
      .from('messages')
      .select('*, reply_msg:reply_to(id, content, sender_name)')
      .eq('channel_id', chanId)
      .order('created_at', { ascending: true })
      .limit(100)

    // Attach reply content
    const msgs = (data || []).map(m => ({
      ...m,
      reply_to_content: m.reply_msg || null,
    }))
    setMessages(msgs)
    setLoading(false)
    setTimeout(() => messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [])

  useEffect(() => {
    fetchMessages(activeChannel)

    // Realtime
    const channel = supabase
      .channel(`chat-${activeChannel}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'messages',
        filter: `channel_id=eq.${activeChannel}`,
      }, () => fetchMessages(activeChannel))
      .subscribe()

    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [activeChannel, fetchMessages])

  // ── Switch channel ────────────────────────────────────────
  const openGroup = (chanId) => {
    setChannel(chanId)
    setChanType('group')
    setDmUser(null)
  }

  const openDM = (u) => {
    const chanId = dmChannelId(user.id, u.id)
    setChannel(chanId)
    setChanType('dm')
    setDmUser(u)
  }

  // ── Send ──────────────────────────────────────────────────
  const handleSend = async () => {
    if (!text.trim() && !image) return

    let imageUrl = null
    if (image) {
      const ext      = image.name.split('.').pop()
      const filePath = `${user.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('message-images')
        .upload(filePath, image)
      if (!upErr) {
        const { data } = supabase.storage.from('message-images').getPublicUrl(filePath)
        imageUrl = data.publicUrl
      }
    }

    const { error } = await supabase.from('messages').insert({
      channel_id:   activeChannel,
      channel_type: channelType,
      sender_id:    user.id,
      sender_name:  userProfile?.name || user.email,
      sender_role:  userProfile?.role || 'ops',
      content:      text.trim() || null,
      image_url:    imageUrl,
      reply_to:     replyTo?.id || null,
    })

    if (error) { toast.error('Send failed'); return }

    setText('')
    setImage(null)
    setImgPrev(null)
    setReplyTo(null)
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // ── React ─────────────────────────────────────────────────
  const handleReact = async (msgId, emoji) => {
    const msg = messages.find(m => m.id === msgId)
    if (!msg) return
    const reactions = { ...(msg.reactions || {}) }
    const users     = reactions[emoji] || []
    const uid       = user.id
    reactions[emoji] = users.includes(uid)
      ? users.filter(u => u !== uid)
      : [...users, uid]
    await supabase.from('messages').update({ reactions }).eq('id', msgId)
  }

  // ── Delete ────────────────────────────────────────────────
  const handleDelete = async (msgId) => {
    if (!confirm('Delete this message?')) return
    await supabase.from('messages').update({ is_deleted: true }).eq('id', msgId)
  }

  // ── Image select ──────────────────────────────────────────
  const handleImageSelect = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setImage(f)
    const reader = new FileReader()
    reader.onload = (ev) => setImgPrev(ev.target.result)
    reader.readAsDataURL(f)
  }

  // ── Grouped users by dept ────────────────────────────────
  const depts = {}
  allUsers
    .filter(u => !userSearch || u.name.toLowerCase().includes(userSearch.toLowerCase()))
    .forEach(u => {
      const dept = ROLE_DEPT_MAP[u.role] || u.department || 'Other'
      if (!depts[dept]) depts[dept] = []
      depts[dept].push(u)
    })

  const currentChannelName = channelType === 'dm'
    ? dmUser?.name
    : GROUP_CHANNELS.find(c => c.id === activeChannel)?.name || activeChannel

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - var(--topbar-height))', overflow: 'hidden', animation: 'fadeIn 0.3s ease' }}>

      {/* ── LEFT SIDEBAR ── */}
      <div style={{ width: 260, background: 'var(--bg-card)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

        {/* Header */}
        <div style={{ padding: '18px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
            Team Chat
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              placeholder="Search people..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              style={{ width: '100%', height: 32, paddingLeft: 30, paddingRight: 10, border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--bg-main)', fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Channels */}
        <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 16 }}>

          {/* Group channels */}
          <div style={{ padding: '12px 16px 6px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.2 }}>
            Channels
          </div>
          {GROUP_CHANNELS.map(ch => (
            <button key={ch.id} onClick={() => openGroup(ch.id)}
              style={{
                width: '100%', padding: '8px 16px', border: 'none', textAlign: 'left', cursor: 'pointer',
                background: activeChannel === ch.id && channelType === 'group' ? 'var(--accent-light)' : 'transparent',
                color: activeChannel === ch.id && channelType === 'group' ? 'var(--accent)' : 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontFamily: 'var(--font-body)',
                borderRadius: 8, margin: '1px 8px', width: 'calc(100% - 16px)',
                transition: 'all 0.15s',
              }}>
              <ch.icon size={14} />
              <span style={{ fontWeight: activeChannel === ch.id ? 700 : 400 }}># {ch.name}</span>
            </button>
          ))}

          {/* Direct Messages */}
          <div style={{ padding: '16px 16px 6px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.2 }}>
            Direct Messages
          </div>

          {Object.entries(depts).map(([dept, users]) => (
            <div key={dept}>
              <div style={{ padding: '6px 16px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Users size={11} /> {dept}
              </div>
              {users.map(u => {
                const chanId  = dmChannelId(user.id, u.id)
                const isActive= activeChannel === chanId && channelType === 'dm'
                return (
                  <button key={u.id} onClick={() => openDM(u)}
                    style={{
                      width: 'calc(100% - 16px)', padding: '7px 12px', border: 'none', textAlign: 'left', cursor: 'pointer',
                      background: isActive ? 'var(--accent-light)' : 'transparent',
                      display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontFamily: 'var(--font-body)',
                      borderRadius: 8, margin: '1px 8px', color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                      transition: 'background 0.15s',
                    }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: isActive ? 'var(--accent)' : '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {getInitials(u.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: isActive ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{u.role?.replace('_',' ')}</div>
                    </div>
                    {/* Super admin can see DM badge */}
                    {isSuperAdmin && channelType !== 'dm' && (
                      <Lock size={10} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Current user */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {getInitials(userProfile?.name || '')}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userProfile?.name}</div>
            <div style={{ fontSize: 10, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} /> Online
            </div>
          </div>
        </div>
      </div>

      {/* ── CHAT AREA ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-main)' }}>

        {/* Channel Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: 12 }}>
          {channelType === 'dm'
            ? <>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                  {getInitials(dmUser?.name || '')}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {dmUser?.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {dmUser?.role?.replace('_',' ')} · Direct Message
                    {isSuperAdmin && ' 👁 (Visible to Super Admin)'}
                  </div>
                </div>
              </>
            : <>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Hash size={18} color="var(--accent)" />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                    # {currentChannelName}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {GROUP_CHANNELS.find(c => c.id === activeChannel)?.desc}
                  </div>
                </div>
              </>
          }
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                {channelType === 'dm' ? `Start a conversation with ${dmUser?.name}` : `Welcome to #${currentChannelName}`}
              </div>
              <div style={{ fontSize: 13 }}>Be the first to send a message!</div>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isOwn = msg.sender_id === user?.id
              const showDate = i === 0 || new Date(msg.created_at).toDateString() !== new Date(messages[i-1].created_at).toDateString()
              return (
                <div key={msg.id}>
                  {showDate && (
                    <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 12, padding: '8px 20px' }}>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                      {new Date(msg.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    </div>
                  )}
                  <MessageBubble
                    msg={msg} isOwn={isOwn} isSuperAdmin={isSuperAdmin}
                    onReact={handleReact} onReply={setReplyTo} onDelete={handleDelete}
                    allUsers={allUsers}
                  />
                </div>
              )
            })
          )}
          <div ref={messagesEnd} />
        </div>

        {/* Input Area */}
        <div style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)', padding: '12px 16px' }}>

          {/* Reply preview */}
          {replyTo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--accent-light)', borderRadius: 8, marginBottom: 10, border: '1px solid rgba(232,83,58,0.2)' }}>
              <Reply size={13} color="var(--accent)" />
              <div style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Replying to <strong>{replyTo.sender_name}</strong>: {replyTo.content}
              </div>
              <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                <X size={13} />
              </button>
            </div>
          )}

          {/* Image preview */}
          {imagePreview && (
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 10 }}>
              <img src={imagePreview} alt="preview" style={{ height: 80, borderRadius: 8, objectFit: 'cover' }} />
              <button onClick={() => { setImage(null); setImgPrev(null) }}
                style={{ position: 'absolute', top: -8, right: -8, width: 20, height: 20, borderRadius: '50%', background: '#EF4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <X size={11} />
              </button>
            </div>
          )}

          {/* Input row */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
            {/* Image upload */}
            <button onClick={() => fileRef.current?.click()}
              style={{ width: 38, height: 38, borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0, transition: 'all 0.15s' }}>
              <Image size={16} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageSelect} />

            {/* Emoji picker */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowEmoji(!showEmoji)}
                style={{ width: 38, height: 38, borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}>
                <Smile size={16} />
              </button>
              {showEmoji && (
                <div style={{ position: 'absolute', bottom: 44, left: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 10, display: 'flex', gap: 6, flexWrap: 'wrap', width: 220, zIndex: 100, boxShadow: 'var(--shadow-lg)' }}>
                  {EMOJIS.map(e => (
                    <button key={e} onClick={() => { setText(t => t + e); setShowEmoji(false) }}
                      style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', padding: '3px 5px', borderRadius: 6 }}>
                      {e}
                    </button>
                  ))}
                  {/* Extra common emojis */}
                  {['😊','🙏','💪','🎉','⚡','🚀','💬','📞','🔔','⭐'].map(e => (
                    <button key={e} onClick={() => { setText(t => t + e); setShowEmoji(false) }}
                      style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', padding: '3px 5px', borderRadius: 6 }}>
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Text input */}
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
              }}
              placeholder={`Message ${channelType === 'dm' ? dmUser?.name : '#' + currentChannelName}...`}
              rows={1}
              style={{
                flex: 1, padding: '10px 14px', border: '1.5px solid var(--border)',
                borderRadius: 12, background: 'var(--bg-main)', fontSize: 14,
                fontFamily: 'var(--font-body)', color: 'var(--text-primary)', outline: 'none',
                resize: 'none', lineHeight: 1.5, maxHeight: 120, overflowY: 'auto',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--accent)'; setShowEmoji(false) }}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />

            {/* Send */}
            <button onClick={handleSend} disabled={!text.trim() && !image}
              style={{ width: 42, height: 42, borderRadius: 12, background: text.trim() || image ? 'var(--accent)' : 'var(--border)', border: 'none', cursor: text.trim() || image ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', flexShrink: 0 }}>
              <Send size={16} color="#fff" />
            </button>
          </div>

          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
            Enter to send · Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  )
}
