// src/supabase/auth.js
import { supabase } from './client'

// Password validation: 1 uppercase, 1 number, 1 special char, min 8 chars
export const validatePassword = (password) => {
  const rules = {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number:    /[0-9]/.test(password),
    special:   /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  }
  const messages = []
  if (!rules.length)    messages.push('At least 8 characters')
  if (!rules.uppercase) messages.push('At least 1 uppercase letter (A-Z)')
  if (!rules.number)    messages.push('At least 1 number (0-9)')
  if (!rules.special)   messages.push('At least 1 special character (!@#$...)')
  return { valid: messages.length === 0, messages, rules }
}

// ── Login ──────────────────────────────────────────────────
export const loginUser = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error

  // Non-blocking — never stop login if these fail
  try {
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', data.user.id)
  } catch { /* silent */ }

  try {
    await logActivity(data.user.id, 'LOGIN', 'User logged in')
  } catch { /* silent */ }

  return data.user
}

// ── Logout ─────────────────────────────────────────────────
export const logoutUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) await logActivity(user.id, 'LOGOUT', 'User logged out')
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// ── Send Password Reset Email ──────────────────────────────
export const resetPasswordEmail = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/set-password`,
  })
  if (error) throw error
}

// ── Update Password (logged in user) ──────────────────────
export const changePassword = async (newPassword) => {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error

  const { data: { user } } = await supabase.auth.getUser()
  if (user) await logActivity(user.id, 'PASSWORD_CHANGE', 'Password was changed')
}

// ── Get User Profile from DB ───────────────────────────────
export const getUserProfile = async (uid) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', uid)
    .single()
  if (error) return null
  return data
}

// ── Update User Profile ────────────────────────────────────
export const updateUserProfile = async (uid, updates) => {
  const { error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', uid)
  if (error) throw error
  await logActivity(uid, 'PROFILE_UPDATE', 'Profile information updated')
}

// ── Activity Logger ────────────────────────────────────────
export const logActivity = async (userId, action, description, meta = {}) => {
  try {
    // Get user name for readable logs
    const { data: profile } = await supabase
      .from('users')
      .select('name')
      .eq('id', userId)
      .single()

    await supabase.from('activity_logs').insert({
      user_id:     userId,
      user_name:   profile?.name || 'Unknown',
      action,
      description,
      meta,
      created_at:  new Date().toISOString(),
    })
  } catch {
    // Fail silently — logging should never break the app
  }
}
