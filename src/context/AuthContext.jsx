// src/context/AuthContext.jsx
import { createContext, useEffect, useState } from 'react'
import { supabase } from '../supabase/client'

export const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser]               = useState(undefined) // undefined = loading, null = no user
  const [userProfile, setUserProfile] = useState(undefined)
  const [loading, setLoading]         = useState(true)

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
    let mounted = true

    // Get session immediately
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return
      if (session?.user) {
        setUser(session.user)
        await fetchProfile(session.user.id)
      } else {
        setUser(null)
        setUserProfile(null)
      }
      setLoading(false)
    }).catch(() => {
      if (!mounted) return
      setUser(null)
      setUserProfile(null)
      setLoading(false)
    })

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setUserProfile(null)
          setLoading(false)
          return
        }
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id)
          setLoading(false)
        }
        if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, userProfile, setUserProfile, fetchProfile, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
