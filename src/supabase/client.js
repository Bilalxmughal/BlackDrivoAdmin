// src/supabase/client.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wxszxhgunipgvcxlrock.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4c3p4aGd1bmlwZ3ZjeGxyb2NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MjIwMjYsImV4cCI6MjA5Mzk5ODAyNn0.zJcxbBNttu1yjl5hKfCgF_b8-xkrGLddMwKweVrCPRw'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: true,
    storageKey:         'blackdrivo-auth',
  },
})