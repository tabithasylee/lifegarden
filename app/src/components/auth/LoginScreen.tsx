import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginScreen() {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function signInWithGitHub() {
    if (!supabase) return
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
    // On success, browser redirects to GitHub — no state update needed.
  }

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center"
      style={{ background: '#112f2c' }}
    >
      {/* Registration marks */}
      {[['top-3 left-3', '-rotate-0'], ['top-3 right-3', 'rotate-90'], ['bottom-3 left-3', '-rotate-90'], ['bottom-3 right-3', 'rotate-180']].map(([pos]) => (
        <svg key={pos} className={`absolute ${pos} opacity-20`} width="16" height="16" viewBox="0 0 16 16" fill="none">
          <line x1="8" y1="0" x2="8" y2="16" stroke="#fbe6a0" strokeWidth="0.6"/>
          <line x1="0" y1="8" x2="16" y2="8" stroke="#fbe6a0" strokeWidth="0.6"/>
          <circle cx="8" cy="8" r="4" stroke="#fbe6a0" strokeWidth="0.5"/>
        </svg>
      ))}

      {/* Brand */}
      <div className="flex flex-col items-center gap-2 mb-12">
        <svg width="28" height="38" viewBox="0 0 28 38" fill="none" style={{ opacity: 0.85 }}>
          <line x1="14" y1="38" x2="14" y2="18" stroke="#fbe6a0" strokeWidth="0.9"/>
          <line x1="14" y1="28" x2="7"  y2="21" stroke="#fbe6a0" strokeWidth="0.65"/>
          <line x1="14" y1="24" x2="21" y2="17" stroke="#fbe6a0" strokeWidth="0.65"/>
          <ellipse cx="14" cy="38" rx="5" ry="1.5" stroke="#fbe6a0" strokeWidth="0.5" fill="none"/>
          <ellipse cx="7"  cy="20" rx="3"  ry="1.8" stroke="#fbe6a0" strokeWidth="0.45" fill="none"/>
          <ellipse cx="21" cy="16" rx="3"  ry="1.8" stroke="#fbe6a0" strokeWidth="0.45" fill="none"/>
        </svg>
        <span className="font-mono text-[13px] font-bold tracking-[0.2em]" style={{ color: '#fbe6a0' }}>
          LIFEGARDEN
        </span>
        <span className="font-mono text-[8px] tracking-[0.14em]" style={{ color: '#7B9E8B' }}>
          PERSONAL GROWTH OS
        </span>
      </div>

      {/* Login card */}
      <div
        className="flex flex-col items-center gap-5 px-10 py-8"
        style={{
          border:     '0.5px solid rgba(232,213,160,0.18)',
          background: 'rgba(8,22,16,0.8)',
          minWidth:   320,
        }}
      >
        <div className="text-center">
          <p className="font-serif text-[18px] font-[300] leading-snug mb-1" style={{ color: '#fbe6a0' }}>
            Welcome back
          </p>
          <p className="font-mono text-[8px] tracking-[0.1em]" style={{ color: 'rgba(123,158,139,0.7)' }}>
            Sign in to access your garden
          </p>
        </div>

        <div style={{ height: '0.5px', width: '100%', background: 'rgba(232,213,160,0.08)' }} />

        <button
          onClick={signInWithGitHub}
          disabled={loading}
          className="flex items-center justify-center gap-3 w-full font-mono text-[10px] font-bold tracking-[0.1em] py-3 px-5 transition-opacity disabled:opacity-40 hover:opacity-80"
          style={{
            background: '#e2b540',
            color:      '#112f2c',
          }}
        >
          {loading ? (
            'REDIRECTING…'
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              CONTINUE WITH GITHUB
            </>
          )}
        </button>

        {error && (
          <p className="font-mono text-[9px] text-center" style={{ color: '#da525d' }}>
            {error}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 flex items-center gap-3">
        <span className="font-mono text-[7px] tracking-[0.1em]" style={{ color: 'rgba(123,158,139,0.4)' }}>
          v0.1 · LIFEGARDEN
        </span>
      </div>
    </div>
  )
}
