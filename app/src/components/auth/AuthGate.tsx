import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useGardenStore } from '@/store/garden'
import { setCurrentUserId } from '@/lib/api'
import LoginScreen from './LoginScreen'

interface Props {
  children: React.ReactNode
}

export default function AuthGate({ children }: Props) {
  // If Supabase isn't configured, run in local-only mode — no auth required.
  if (!isSupabaseConfigured) return <>{children}</>

  return <SupabaseAuthGate>{children}</SupabaseAuthGate>
}

function SupabaseAuthGate({ children }: Props) {
  const [session,  setSession]  = useState<Session | null | undefined>(undefined) // undefined = loading
  const loadUserData = useGardenStore(s => s.loadUserData)

  useEffect(() => {
    // Set initial session state for display only — data loading handled by onAuthStateChange
    supabase!.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    // Only load user data on actual sign-in events, not on background token refreshes.
    // TOKEN_REFRESHED would wipe optimistic store updates in flight.
    const { data: { subscription } } = supabase!.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setCurrentUserId(session?.user.id ?? null)
      if (session && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
        loadUserData(session.user.id)
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (session === undefined) {
    // Loading — show minimal spinner
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: '#112f2c' }}>
        <span className="font-mono text-[8px] tracking-[0.14em]" style={{ color: 'rgba(123,158,139,0.5)' }}>
          LOADING…
        </span>
      </div>
    )
  }

  if (!session) return <LoginScreen />

  return <>{children}</>
}
