import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function NavBar({ user, pet }) {
  const router = useRouter()
  const path = router.pathname

  const nav = [
    { href: '/feed',        icon: '🏠', label: 'Feed' },
    { href: '/marketplace', icon: '🛍️', label: 'Market' },
    { href: '/health',      icon: '🩺', label: 'Health' },
    { href: '/chat',        icon: '💬', label: 'Chat' },
    { href: '/adopt',       icon: '🏠', label: 'Adopt' },
    { href: '/coins',       icon: '🪙', label: 'Coins' },
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 58,
      background: '#fff', borderBottom: '1px solid #EDE8FF',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      display: 'flex', alignItems: 'center', padding: '0 16px',
      zIndex: 1000, gap: 10
    }}>
      {/* Logo */}
      <div
        onClick={() => router.push('/feed')}
        style={{
          fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.4rem',
          background: 'linear-gradient(135deg, #FF6B35, #6C4BF6)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          cursor: 'pointer', flexShrink: 0
        }}>
        🐾 PawVerse
      </div>

      {/* Search */}
      <input
        placeholder="🔍  Search pets, posts, vets..."
        style={{
          background: '#F3F0FF', border: 'none', borderRadius: 22,
          padding: '7px 14px', fontSize: '0.85rem', outline: 'none',
          width: 200, fontFamily: 'Nunito, sans-serif', color: '#1E1347'
        }}
      />

      {/* Nav links */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 2 }}>
        {nav.map(n => (
          <button key={n.href} onClick={() => router.push(n.href)}
            title={n.label}
            style={{
              padding: '7px 14px', border: 'none', cursor: 'pointer', fontSize: '1.15rem',
              borderRadius: 10, transition: 'background 0.2s',
              background: path === n.href ? '#F3F0FF' : 'transparent',
              position: 'relative'
            }}>
            {n.icon}
            {path === n.href && (
              <div style={{
                position: 'absolute', bottom: 0, left: '25%', right: '25%',
                height: 3, background: '#FF6B35', borderRadius: 2
              }} />
            )}
          </button>
        ))}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* PawCoins badge */}
        <div onClick={() => router.push('/coins')}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: '#FFFBE8', border: '1px solid #FFE8A0',
            borderRadius: 20, padding: '4px 10px', cursor: 'pointer'
          }}>
          <span style={{ fontSize: '0.85rem' }}>🪙</span>
          <span style={{
            fontFamily: "'Baloo 2', cursive", fontWeight: 800,
            fontSize: '0.85rem', color: '#FF6B35'
          }}>
            {pet?.paw_coins ?? 0}
          </span>
        </div>

        {/* Notification bell */}
        <div style={{
          width: 34, height: 34, borderRadius: '50%', background: '#F3F0FF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.9rem', cursor: 'pointer', position: 'relative'
        }}>
          🔔
          <div style={{
            width: 8, height: 8, background: '#FF6B9D', borderRadius: '50%',
            position: 'absolute', top: 4, right: 4, border: '2px solid #fff'
          }} />
        </div>

        {/* Avatar */}
        <div onClick={() => router.push('/profile')}
          style={{
            width: 34, height: 34, borderRadius: '50%',
            background: '#FFE8F0', border: '2.5px solid #FF6B35',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem', cursor: 'pointer'
          }}>
          {pet?.emoji || '🐾'}
        </div>

        {/* Logout */}
        <button onClick={handleLogout}
          style={{
            background: 'none', border: '1px solid #EDE8FF', borderRadius: 8,
            padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer',
            color: '#6B7280', fontFamily: 'Nunito, sans-serif'
          }}>
          Logout
        </button>
      </div>
    </nav>
  )
}
