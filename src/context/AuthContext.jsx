// src/context/AuthContext.jsx
import { createContext, useEffect, useState } from 'react'
import { supabase } from '../supabase/client'

export const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser]               = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    // onAuthStateChange fires immediately with current session
    // This is the ONLY place we need to handle auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null)
          setUserProfile(null)
          setLoading(false)
          return
        }

        // User is logged in
        setUser(session.user)
        setLoading(false) // Stop loading immediately — don't wait for profile

        // Fetch profile in background (non-blocking)
        supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()
          .then(({ data }) => setUserProfile(data || null))
          .catch(() => setUserProfile(null))
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, userProfile, setUserProfile, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
