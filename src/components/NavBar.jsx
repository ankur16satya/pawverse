import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

// Sound player — defined outside component so it never re-initializes
const sounds = {}
const playSound = (type) => {
  try {
    const src = type === 'message' ? '/message.mp3' : '/notification.mp3'
    if (!sounds[type]) sounds[type] = new Audio(src)
    sounds[type].currentTime = 0
    sounds[type].volume = 0.6
    sounds[type].play().catch(() => {})
  } catch (e) {}
}

export default function NavBar({ user, pet }) {
  const router = useRouter()
  const path = router.pathname
  const [notifications, setNotifications] = useState([])
  const [showNotifs, setShowNotifs] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [pendingFriendCount, setPendingFriendCount] = useState(0)
  const [unreadMsgCount, setUnreadMsgCount] = useState(0)
  const [cartCount, setCartCount] = useState(0)
  const notifRef = useRef(null)
  const channelRef = useRef(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!user || initializedRef.current) return
    initializedRef.current = true

    fetchAll()
    
    setupRealtime()

    return () => {
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      initializedRef.current = false
    }
    
  }, [user?.id])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchAll = async () => {
    await Promise.all([
      fetchNotifications(),
      fetchPendingFriendRequests(),
      fetchUnreadMessages(),
    ])
    // Fetch cart count
const { count } = await supabase
  .from('cart')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', user.id)
setCartCount(count || 0)
  }

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifications(data || [])
    setUnreadCount((data || []).filter(n => !n.is_read).length)
  }

  const fetchPendingFriendRequests = async () => {
    const { data } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
    setPendingFriendCount((data || []).length)
  }

  const fetchUnreadMessages = async () => {
    const { data: convs } = await supabase
      .from('conversations')
      .select('id')
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)

    if (!convs || convs.length === 0) return

    let total = 0
    for (const conv of convs) {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .eq('is_read', false)
        .neq('sender_id', user.id)
      total += count || 0
    }
    setUnreadMsgCount(total)
  }

  const setupRealtime = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(`navbar-realtime-${user.id}-${Date.now()}`)

      // Cart INSERT — increase badge
.on('postgres_changes', {
  event: 'INSERT',
  schema: 'public',
  table: 'cart',
  filter: `user_id=eq.${user.id}`,
}, () => {
  setCartCount(prev => prev + 1)
})

// Cart DELETE — decrease badge
.on('postgres_changes', {
  event: 'DELETE',
  schema: 'public',
  table: 'cart',
}, (payload) => {
  if (payload.old?.user_id === user.id) {
    setCartCount(prev => Math.max(0, prev - 1))
  }
})
      // ── NEW NOTIFICATION received ──
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const newNotif = payload.new
        // Play sound when notification is received
        if (newNotif.type === 'message') {
          playSound('message')
        } else {
          playSound('notification')
        }
        setNotifications(prev => [newNotif, ...prev])
        setUnreadCount(prev => prev + 1)
      })

      // ── NEW FRIEND REQUEST ──
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'friend_requests',
        filter: `receiver_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.new.status === 'pending') {
          setPendingFriendCount(prev => prev + 1)
          playSound('notification')
        }
      })

      // ── FRIEND REQUEST ACCEPTED ──
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'friend_requests',
        filter: `sender_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.new.status === 'accepted') {
          playSound('notification')
        }
      })

      // ── NEW MESSAGE received ──
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, async (payload) => {
        const newMsg = payload.new
        if (newMsg.sender_id === user.id) return

        // Check if this message is in my conversation
        const { data: conv } = await supabase
          .from('conversations')
          .select('id')
          .eq('id', newMsg.conversation_id)
          .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
          .single()

        if (!conv) return

        if (!newMsg.is_read) {
          setUnreadMsgCount(prev => prev + 1)
          playSound('message')
        }
      })

      // ── MESSAGE READ — decrease count ──
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        if (
          !payload.old.is_read &&
          payload.new.is_read &&
          payload.new.sender_id !== user.id
        ) {
          setUnreadMsgCount(prev => Math.max(0, prev - 1))
        }
      })

      // ── POST LIKES updated in real-time ──
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'posts',
      }, (payload) => {
        // This triggers feed.js listener if on feed page
        // NavBar just needs to know about it for notification sound
      })

      .subscribe((status) => {
        console.log('NavBar realtime status:', status)
      })

    channelRef.current = channel
  }

  const handleBellClick = async () => {
    setShowNotifs(prev => !prev)
    if (!showNotifs && unreadCount > 0) {
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
    const icons = {
      like: '❤️', comment: '💬', follow: '🐾',
      friend_request: '👫', friend_accepted: '✅',
      message: '💬', post: '📸'
    }
    return icons[type] || '🔔'
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const nav = [
  { href: '/feed',        icon: '🏠', label: 'Feed' },
  { href: '/marketplace', icon: '🛍️', label: 'Market' },
  { href: '/cart',        icon: '🛒', label: 'Cart' },
  { href: '/health',      icon: '🩺', label: 'Health' },
  { href: '/chat',        icon: '💬', label: 'Chat' },
  { href: '/adopt',       icon: '🫶', label: 'Adopt' },
  { href: '/coins',       icon: '🪙', label: 'Coins' },
  { href: '/friends',     icon: '👫', label: 'Friends' },
]

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 58,
      background: '#fff', borderBottom: '1px solid #EDE8FF',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      display: 'flex', alignItems: 'center', padding: '0 16px',
      zIndex: 1000, gap: 10
    }}>
      {/* Logo */}
      <div onClick={() => router.push('/feed')}
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
              padding: '7px 14px', border: 'none', cursor: 'pointer',
              fontSize: '1.15rem', borderRadius: 10, transition: 'background 0.2s',
              background: path === n.href ? '#F3F0FF' : 'transparent',
              position: 'relative'
            }}>
            {n.icon}

            {/* Chat unread badge */}
            {n.href === '/chat' && unreadMsgCount > 0 && (
              <div style={{
                position: 'absolute', top: 4, right: 4,
                minWidth: 16, height: 16, background: '#FF4757',
                borderRadius: '50%', border: '2px solid #fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6rem', fontWeight: 800, color: '#fff'
              }}>
                {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
              </div>
            )}

{/* Cart badge */}
{n.href === '/cart' && cartCount > 0 && (
  <div style={{
    position: 'absolute', top: 4, right: 4,
    minWidth: 16, height: 16, background: '#FF6B35',
    borderRadius: '50%', border: '2px solid #fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.6rem', fontWeight: 800, color: '#fff'
  }}>
    {cartCount > 9 ? '9+' : cartCount}
  </div>
)}
            {/* Friends pending badge */}
            {n.href === '/friends' && pendingFriendCount > 0 && (
              <div style={{
                position: 'absolute', top: 4, right: 4,
                minWidth: 16, height: 16, background: '#FF4757',
                borderRadius: '50%', border: '2px solid #fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6rem', fontWeight: 800, color: '#fff'
              }}>
                {pendingFriendCount > 9 ? '9+' : pendingFriendCount}
              </div>
            )}

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
        {/* PawCoins */}
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
          }}>{pet?.paw_coins ?? 0}</span>
        </div>

        {/* 🔔 Notification Bell */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <div onClick={handleBellClick}
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
                fontSize: '0.6rem', fontWeight: 800, color: '#fff'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
          </div>

          {/* Dropdown */}
          {showNotifs && (
            <div style={{
              position: 'absolute', top: 42, right: 0, width: 320,
              background: '#fff', borderRadius: 16,
              boxShadow: '0 8px 32px rgba(108,75,246,0.18)',
              border: '1px solid #EDE8FF', zIndex: 2000, overflow: 'hidden'
            }}>
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

              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
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
                    <div key={n.id}
                      onClick={() => {
                        if (n.type === 'friend_request') { setShowNotifs(false); router.push('/friends') }
                        if (n.type === 'message') { setShowNotifs(false); router.push('/chat') }
                      }}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '11px 16px',
                        background: n.is_read ? '#fff' : '#F9F5FF',
                        borderBottom: '1px solid #F3F0FF',
                        cursor: ['friend_request', 'message'].includes(n.type) ? 'pointer' : 'default',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={e => {
                        if (['friend_request', 'message'].includes(n.type))
                          e.currentTarget.style.background = '#F3F0FF'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = n.is_read ? '#fff' : '#F9F5FF'
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', background: '#F3F0FF',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1rem', flexShrink: 0
                      }}>
                        {notifIcon(n.type)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.82rem', color: '#1E1347', margin: 0, lineHeight: 1.5 }}>
                          {n.message}
                        </p>
                        {n.type === 'friend_request' && (
                          <span style={{ fontSize: '0.72rem', color: '#6C4BF6', fontWeight: 700 }}>
                            Tap to view → Friends page
                          </span>
                        )}
                        {n.type === 'message' && (
                          <span style={{ fontSize: '0.72rem', color: '#6C4BF6', fontWeight: 700 }}>
                            Tap to open → Messages
                          </span>
                        )}
                        <span style={{ fontSize: '0.7rem', color: '#6B7280', display: 'block', marginTop: 2 }}>
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

              <div
                onClick={() => { setShowNotifs(false); router.push('/friends') }}
                style={{
                  padding: '10px 16px', textAlign: 'center',
                  borderTop: '1px solid #EDE8FF', cursor: 'pointer',
                  color: '#6C4BF6', fontWeight: 700, fontSize: '0.82rem',
                  background: '#FAFAFA'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F3F0FF'}
                onMouseLeave={e => e.currentTarget.style.background = '#FAFAFA'}
              >
                👫 View All Friend Requests
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
            ? <img src={pet.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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