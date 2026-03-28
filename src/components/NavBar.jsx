import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function NavBar({ user, pet }) {
  const router = useRouter()
  const path = router.pathname
  const [notifications, setNotifications] = useState([])
  const [showNotifs, setShowNotifs] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const notifRef = useRef(null)

  const nav = [
    { href: '/feed',        icon: '🏠', label: 'Feed' },
    { href: '/marketplace', icon: '🛍️', label: 'Market' },
    { href: '/health',      icon: '🩺', label: 'Health' },
    { href: '/chat',        icon: '💬', label: 'Chat' },
    { href: '/adopt',       icon: '🏠', label: 'Adopt' },
    { href: '/coins',       icon: '🪙', label: 'Coins' },
  ]

  // Fetch notifications
  useEffect(() => {
    if (!user) return
    fetchNotifications()

    // Real-time listener for new notifications
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev])
        setUnreadCount(prev => prev + 1)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(15)
    setNotifications(data || [])
    setUnreadCount((data || []).filter(n => !n.is_read).length)
  }

  const handleBellClick = async () => {
    setShowNotifs(prev => !prev)
    if (!showNotifs && unreadCount > 0) {
      // Mark all as read
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      setUnreadCount(0)
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    }
  }

  const timeAgo = (ts) => {
    const diff = Date.now() - new Date(ts)
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  const notifIcon = (type) => {
    if (type === 'like') return '❤️'
    if (type === 'comment') return '💬'
    if (type === 'follow') return '🐾'
    if (type === 'system') return '🔔'
    return '🔔'
  }

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

        {/* 🔔 Notification Bell */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <div
            onClick={handleBellClick}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: showNotifs ? '#EDE8FF' : '#F3F0FF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem', cursor: 'pointer', position: 'relative',
              transition: 'background 0.2s'
            }}>
            🔔
            {unreadCount > 0 && (
              <div style={{
                position: 'absolute', top: 2, right: 2,
                minWidth: 16, height: 16, background: '#FF4757',
                borderRadius: '50%', border: '2px solid #fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6rem', fontWeight: 800, color: '#fff',
                fontFamily: 'Nunito, sans-serif'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
          </div>

          {/* Dropdown */}
          {showNotifs && (
            <div style={{
              position: 'absolute', top: 42, right: 0,
              width: 320, background: '#fff',
              borderRadius: 16, boxShadow: '0 8px 32px rgba(108,75,246,0.18)',
              border: '1px solid #EDE8FF', zIndex: 2000, overflow: 'hidden'
            }}>
              {/* Header */}
              <div style={{
                padding: '12px 16px', borderBottom: '1px solid #EDE8FF',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1rem' }}>
                  🔔 Notifications
                </span>
                {unreadCount === 0 && notifications.length > 0 && (
                  <span style={{ fontSize: '0.72rem', color: '#22C55E', fontWeight: 700 }}>
                    ✓ All caught up!
                  </span>
                )}
              </div>

              {/* List */}
              <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🐾</div>
                    <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, color: '#1E1347', fontSize: '0.95rem' }}>
                      No notifications yet
                    </div>
                    <div style={{ color: '#6B7280', fontSize: '0.78rem', marginTop: 4 }}>
                      When someone paws your post, you'll see it here!
                    </div>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '11px 16px',
                      background: n.is_read ? '#fff' : '#F9F5FF',
                      borderBottom: '1px solid #F3F0FF',
                      transition: 'background 0.2s'
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: '#F3F0FF', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: '1rem', flexShrink: 0
                      }}>
                        {notifIcon(n.type)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.82rem', color: '#1E1347', margin: 0, lineHeight: 1.5 }}>
                          {n.message}
                        </p>
                        <span style={{ fontSize: '0.7rem', color: '#6B7280' }}>
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                      {!n.is_read && (
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: '#6C4BF6', flexShrink: 0, marginTop: 4
                        }} />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div onClick={() => router.push('/profile')}
          style={{
            width: 34, height: 34, borderRadius: '50%',
            background: '#FFE8F0', border: '2.5px solid #FF6B35',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem', cursor: 'pointer', overflow: 'hidden'
          }}>
          {pet?.avatar_url
            ? <img src={pet.avatar_url} alt="avatar"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : pet?.emoji || '🐾'}
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