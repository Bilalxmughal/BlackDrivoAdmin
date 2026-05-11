// src/context/AuthContext.jsx
import { createContext, useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase/client'

export const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser]               = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading]         = useState(true)
  const initialized                   = useRef(false)

  const fetchProfile = async (uid) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', uid)
        .maybeSingle()
      setUserProfile(data || null)
      return data
    } catch {
      setUserProfile(null)
      return null
    }
  }

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null); setUserProfile(null); setLoading(false); return
        }
        if (session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id)
          setLoading(false)
        }
      }
    )

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        await fetchProfile(session.user.id)
      }
      setLoading(false)
    }).catch(() => setLoading(false))

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, userProfile, setUserProfile, fetchProfile, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
