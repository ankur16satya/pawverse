import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import {
  Home,
  ShoppingBag,
  ShoppingCart,
  HeartPulse,
  MessageCircle,
  PawPrint,
  Coins,
  Users,
  Video,
  Search,
} from "lucide-react"
// Sound player
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
  const [isMobile, setIsMobile] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  const [searching, setSearching] = useState(false)
  const searchRef = useRef(null)
  const searchTimerRef = useRef(null)
  const notifRef = useRef(null)
  const channelRef = useRef(null)
  const initializedRef = useRef(false)

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (!user || initializedRef.current) return
    initializedRef.current = true
    fetchAll()
    setupRealtime()
    return () => {
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null }
      initializedRef.current = false
    }
  }, [user?.id])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false)
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchAll = async () => {
    await Promise.all([fetchNotifications(), fetchPendingFriendRequests(), fetchUnreadMessages(), fetchCartCount()])
  }

  const fetchNotifications = async () => {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).neq('type', 'message').order('created_at', { ascending: false }).limit(20)
    setNotifications(data || [])
    setUnreadCount((data || []).filter(n => !n.is_read).length)
  }

  const fetchPendingFriendRequests = async () => {
    const { data } = await supabase.from('friend_requests').select('*').eq('receiver_id', user.id).eq('status', 'pending')
    setPendingFriendCount((data || []).length)
  }

  const fetchUnreadMessages = async () => {
    const { data: convs } = await supabase.from('conversations').select('id').or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
    if (!convs?.length) return
    let total = 0
    for (const conv of convs) {
      const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('conversation_id', conv.id).eq('is_read', false).neq('sender_id', user.id)
      total += count || 0
    }
    setUnreadMsgCount(total)
  }

  const fetchCartCount = async () => {
    const { count } = await supabase.from('cart').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
    setCartCount(count || 0)
  }

  const setupRealtime = () => {
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    const channel = supabase.channel(`navbar-rt-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
        const n = payload.new
        if (n.type !== 'message') {
          playSound('notification')
          setNotifications(prev => [n, ...prev])
          setUnreadCount(prev => prev + 1)
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friend_requests', filter: `receiver_id=eq.${user.id}` }, (payload) => {
        if (payload.new.status === 'pending') { setPendingFriendCount(prev => prev + 1); playSound('notification') }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const newMsg = payload.new
        if (newMsg.sender_id === user.id) return
        const { data: conv } = await supabase.from('conversations').select('id').eq('id', newMsg.conversation_id).or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`).single()
        if (!conv) return
        if (!newMsg.is_read) { setUnreadMsgCount(prev => prev + 1); playSound('message') }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        if (!payload.old.is_read && payload.new.is_read && payload.new.sender_id !== user.id) setUnreadMsgCount(prev => Math.max(0, prev - 1))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cart', filter: `user_id=eq.${user.id}` }, () => setCartCount(prev => prev + 1))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'cart' }, (payload) => {
        if (payload.old?.user_id === user.id) setCartCount(prev => Math.max(0, prev - 1))
      })
      .subscribe()
    channelRef.current = channel
  }

  const handleSearch = async (q) => {
    setSearchQuery(q)
    if (!q.trim()) { setSearchResults([]); setShowSearch(false); return }
    setShowSearch(true)
    setSearching(true)
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(async () => {
      // Search pets by pet_name or owner_name - exact match first, then partial
      const { data: exact } = await supabase
        .from('pets')
        .select('id, pet_name, owner_name, emoji, avatar_url, user_id, pet_breed')
        .ilike('owner_name', q)
        .limit(3)

      const { data: partial } = await supabase
        .from('pets')
        .select('id, pet_name, owner_name, emoji, avatar_url, user_id, pet_breed')
        .or(`pet_name.ilike.%${q}%,owner_name.ilike.%${q}%`)
        .limit(10)

      // Merge: exact first, then partial without duplicates
      const exactIds = new Set((exact || []).map(p => p.id))
      const merged = [
        ...(exact || []),
        ...(partial || []).filter(p => !exactIds.has(p.id))
      ].slice(0, 10)

      setSearchResults(merged)
      setSearching(false)
    }, 300)
  }

  const handleBellClick = async () => {
    setShowNotifs(prev => !prev)
    if (!showNotifs && unreadCount > 0) {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
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

  const notifIcon = (type) => ({ like:'❤️', comment:'💬', follow:'🐾', friend_request:'👫', friend_accepted:'✅', message:'💬', post:'📸' }[type] || '🔔')

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/') }

  const nav = [
  { href: '/feed',        icon: <Home size={26} />, label: 'Feed' },
  { href: '/reels',       icon: <Video size={26} />, label: 'Reels' },
  { href: '/marketplace', icon: <ShoppingBag size={26} />, label: 'Market' },
  { href: '/health',      icon: <HeartPulse size={26} />, label: 'Health' },
  { href: '/chat',        icon: <MessageCircle size={26} />, label: 'Chat', badge: unreadMsgCount },
  { href: '/adopt',       icon: <PawPrint size={26} />, label: 'Adopt' },
  { href: '/coins',       icon: <Coins size={26} />, label: 'Coins' },
  { href: '/friends',     icon: <Users size={26} />, label: 'Friends', badge: pendingFriendCount },
  { href: '/cart',        icon: <ShoppingCart size={26} />, label: 'Cart' },
]

  // Mobile bottom nav — only 5 key items
  const mobileNav = [
    { href: '/feed',        icon: <Home size={26} />, label: 'Feed' },
    { href: '/reels',       icon: <Video size={26} />, label: 'Reels' },
    { href: '/marketplace', icon: <ShoppingBag size={26} />, label: 'Market' },
    { href: '/health',      icon: <HeartPulse size={26} />, label: 'Health' },
    { href: '/chat',        icon: <MessageCircle size={26} />, label: 'Chat',  badge: unreadMsgCount },
    { href: '/profile',     icon: '🐾', label: 'Profile' },
  ]

  const BadgeDot = ({ count, color = '#FF4757' }) => count > 0 ? (
    <div style={{
      position: 'absolute', top: 2, right: 2,
      minWidth: 16, height: 16, background: color,
      borderRadius: '50%', border: '2px solid #fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.55rem', fontWeight: 800, color: '#fff', zIndex: 1
    }}>{count > 9 ? '9+' : count}</div>
  ) : null

  return (
    <>
      {/* ── DESKTOP & TABLET NAVBAR ── */}
      <nav
        data-pawverse-nav
        style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          height: 98,
          background: 'linear-gradient(135deg, #edeceaff, #a4caf3ff)',
          borderBottom: '1px solid #EDE8FF',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', padding: '0 12px',
          zIndex: 1000, gap: 8
        }}>

        {/* Logo */}
        <div onClick={() => router.push('/feed')} style={{ cursor: 'pointer', flexShrink: 0, transform: isMobile ? 'scale(1.4)' : 'scale(1.2)', marginLeft: isMobile ? 10 : 0 }}>
          <img src="/logo.png" alt="logo"
            style={{ height: 120, width: 'auto', padding: '4px', objectFit: 'contain' }} />
        </div>

        {/* Search Bar */}
        <div ref={searchRef} style={{ position: 'relative', flexShrink: 0, width: 220 }} className="navbar-search">
          <div style={{ display: 'flex', alignItems: 'center', background: '#F3F0FF', borderRadius: 24, padding: '6px 14px', gap: 8, border: showSearch ? '1.5px solid #6C4BF6' : '1.5px solid transparent', transition: 'border 0.2s' }}>
            <Search size={15} color="#6C4BF6" />
            <input
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              onFocus={() => searchQuery && setShowSearch(true)}
              placeholder="Search pets & friends..."
              style={{ background: 'none', border: 'none', outline: 'none', fontFamily: 'Nunito, sans-serif', fontSize: '0.82rem', color: '#1E1347', width: '100%' }}
            />
            {searchQuery && (
              <span onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearch(false) }} style={{ cursor: 'pointer', color: '#9CA3AF', fontSize: '0.85rem', fontWeight: 700, lineHeight: 1 }}>✕</span>
            )}
          </div>
          {showSearch && (
            <div style={{ position: 'absolute', top: 44, left: 0, width: 280, background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(108,75,246,0.18)', border: '1px solid #EDE8FF', zIndex: 2100, overflow: 'hidden' }}>
              {searching ? (
                <div style={{ padding: '14px 16px', color: '#9CA3AF', fontSize: '0.82rem', textAlign: 'center' }}>Searching... 🐾</div>
              ) : searchResults.length === 0 ? (
                <div style={{ padding: '14px 16px', color: '#9CA3AF', fontSize: '0.82rem', textAlign: 'center' }}>No results for "{searchQuery}"</div>
              ) : (
                <>
                  <div style={{ padding: '8px 14px 4px', fontSize: '0.7rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 }}>Results</div>
                  {searchResults.map(p => (
                    <div key={p.id} onClick={() => { router.push(p.user_id === user?.id ? '/profile' : `/user/${p.user_id}`); setShowSearch(false); setSearchQuery('') }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F9F5FF'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F0EBFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', border: '1.5px solid #EDE8FF', overflow: 'hidden', flexShrink: 0 }}>
                        {p.avatar_url ? <img src={p.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="av" /> : p.emoji}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1E1347', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.owner_name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.pet_name} · {p.pet_breed || 'Pet'}</div>
                      </div>
                      {p.user_id === user?.id && <span style={{ fontSize: '0.65rem', background: '#F0EBFF', color: '#6C4BF6', padding: '2px 7px', borderRadius: 20, fontWeight: 700, flexShrink: 0 }}>You</span>}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Desktop Nav Links — hidden on mobile */}
        <div
          className="navbar-desktop-links"
          style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 2 }}>
          {nav.map(n => (
            <button key={n.href} onClick={() => router.push(n.href)} title={n.label}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '8px 12px', border: 'none', cursor: 'pointer', borderRadius: 14,
                transition: 'all 0.25s ease', position: 'relative',
                background: path === n.href ? 'linear-gradient(135deg, #FFE8CC, #F0EBFF)' : 'transparent',
                transform: path === n.href ? 'scale(1.08)' : 'scale(1)',
                boxShadow: path === n.href ? '0 4px 12px rgba(255,107,53,0.2)' : 'none'
              }}
              onMouseEnter={e => { if (path !== n.href) { e.currentTarget.style.background = '#F3F0FF'; e.currentTarget.style.transform = 'scale(1.05)' } }}
              onMouseLeave={e => { if (path !== n.href) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'scale(1)' } }}>
              <div style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n.icon}</div>
              <span style={{ fontSize: '0.62rem', marginTop: 2, fontWeight: 700, color: path === n.href ? '#FF6B35' : '#6B7280' }}>{n.label}</span>
              {path === n.href && <div style={{ position: 'absolute', bottom: -4, width: 20, height: 3, background: '#FF6B35', borderRadius: 2 }} />}
              {n.badge > 0 && <BadgeDot count={n.badge} />}
            </button>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* PawCoins */}
          <div
            className="navbar-coins"
            onClick={() => router.push('/coins')}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#FFFBE8', border: '1px solid #FFE8A0', borderRadius: 20, padding: '4px 10px', cursor: 'pointer' }}>
            <span style={{ fontSize: '0.85rem' }}>🪙</span>
            <span style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '0.95rem', color: '#FF6B35' }}>
              {pet?.paw_coins ?? 0}
            </span>
          </div>

          {/* Bell */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <div onClick={handleBellClick}
              style={{ width: 36, height: 36, borderRadius: '50%', background: showNotifs ? '#EDE8FF' : '#F3F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
              🔔
              {unreadCount > 0 && (
                <div style={{ position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, background: '#FF4757', borderRadius: '50%', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800, color: '#fff' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </div>

            {/* Notification Dropdown */}
            {showNotifs && (
              <div
                className="notif-dropdown"
                style={{ position: isMobile ? 'fixed' : 'absolute', top: isMobile ? 70 : 44, right: isMobile ? 'auto' : 0, left: isMobile ? '50%' : 'auto', transform: isMobile ? 'translateX(-50%)' : 'none', width: isMobile ? 360 : 310, maxWidth: '95vw', background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(108,75,246,0.18)', border: '1px solid #EDE8FF', zIndex: 2000, overflow: 'hidden', animation: 'fadeUp 0.2s ease' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #EDE8FF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '0.95rem' }}>🔔 Notifications</span>
                  {unreadCount === 0 && notifications.length > 0 && <span style={{ fontSize: '0.7rem', color: '#22C55E', fontWeight: 700 }}>✓ All read</span>}
                </div>
                <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: 28, textAlign: 'center' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🐾</div>
                      <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, color: '#1E1347', fontSize: '0.9rem' }}>No notifications yet</div>
                      <div style={{ color: '#6B7280', fontSize: '0.75rem', marginTop: 4 }}>When someone paws your post, you'll see it here!</div>
                    </div>
                  ) : notifications.map(n => (
                      <div key={n.id}
                      onClick={() => {
                        setShowNotifs(false)
                        const linkPattern = /\|(\/.*)$/
                        const match = n.message.match(linkPattern)
                        if (match) { router.push(match[1]) }
                        else if (n.type === 'friend_request') { router.push('/friends') }
                        else if (n.type === 'message') { router.push('/chat') }
                        else { router.push('/feed') } // Fallback
                      }}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: n.is_read ? '#fff' : '#F9F5FF', borderBottom: '1px solid #F3F0FF', cursor: 'pointer', transition: 'background 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F3F0FF'}
                      onMouseLeave={e => e.currentTarget.style.background = n.is_read ? '#fff' : '#F9F5FF'}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#F3F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>
                        {notifIcon(n.type)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.8rem', color: '#1E1347', margin: 0, lineHeight: 1.5 }}>
                          {n.message.split('|')[0]}
                        </p>
                        <span style={{ fontSize: '0.68rem', color: '#6B7280' }}>{timeAgo(n.created_at)}</span>
                      </div>
                      {!n.is_read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#6C4BF6', flexShrink: 0, marginTop: 4 }} />}
                    </div>
                  ))}
                </div>
                <div onClick={() => { setShowNotifs(false); router.push('/friends') }}
                  style={{ padding: '10px', textAlign: 'center', borderTop: '1px solid #EDE8FF', cursor: 'pointer', color: '#6C4BF6', fontWeight: 700, fontSize: '0.78rem', background: '#FAFAFA' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F3F0FF'}
                  onMouseLeave={e => e.currentTarget.style.background = '#FAFAFA'}>
                  👫 View Friend Requests
                </div>
              </div>
            )}
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FFF0E8', border: 'none', borderRadius: 12, padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer', color: '#FF6B35', fontWeight: 800, fontFamily: 'Nunito, sans-serif' }}>
            🚪 Logout
          </button>
        </div>
      </nav>

      {/* ── MOBILE BOTTOM NAVIGATION ── */}
      <nav className="mobile-bottom-nav">
        {mobileNav.map(n => (
          <button key={n.href}
            className={`mobile-nav-btn ${path === n.href || (n.href === '/profile' && path === '/profile') ? 'active' : ''}`}
            onClick={() => router.push(n.href)}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <span className="nav-icon">{n.icon}</span>
              {n.badge > 0 && (
                <span className="mobile-nav-badge">{n.badge > 9 ? '9+' : n.badge}</span>
              )}
            </div>
            <span>{n.label}</span>
          </button>
        ))}


      </nav>


    </>
  )
}
