import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'

export default function Friends() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [pet, setPet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pendingRequests, setPendingRequests] = useState([])
  const [friends, setFriends] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [friendStatuses, setFriendStatuses] = useState({})
  const [actionLoading, setActionLoading] = useState({})
  const [tab, setTab] = useState('requests')

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    setUser(session.user)

    const { data: petData } = await supabase
      .from('pets').select('*').eq('user_id', session.user.id).single()
    setPet(petData)

    await Promise.all([
      fetchPendingRequests(session.user.id),
      fetchFriends(session.user.id),
      fetchSuggestions(session.user.id),
    ])

    setLoading(false)
  }

  const fetchPendingRequests = async (userId) => {
    // Get requests received by me
    const { data } = await supabase
      .from('friend_requests')
      .select('*, sender:sender_id(id)')
      .eq('receiver_id', userId)
      .eq('status', 'pending')

    if (!data) return

    // Get sender pet profiles
    const enriched = await Promise.all(data.map(async (req) => {
      const { data: senderPet } = await supabase
        .from('pets').select('*').eq('user_id', req.sender_id).single()
      return { ...req, senderPet }
    }))
    setPendingRequests(enriched.filter(r => r.senderPet))
  }

  const fetchFriends = async (userId) => {
    // Get all accepted requests where I am sender or receiver
    const { data: sent } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('sender_id', userId)
      .eq('status', 'accepted')

    const { data: received } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('receiver_id', userId)
      .eq('status', 'accepted')

    const allFriends = []

    for (const req of (sent || [])) {
      const { data: friendPet } = await supabase
        .from('pets').select('*').eq('user_id', req.receiver_id).single()
      if (friendPet) allFriends.push(friendPet)
    }

    for (const req of (received || [])) {
      const { data: friendPet } = await supabase
        .from('pets').select('*').eq('user_id', req.sender_id).single()
      if (friendPet) allFriends.push(friendPet)
    }

    setFriends(allFriends)
  }

  const fetchSuggestions = async (userId) => {
    // Get all people I already have requests with
    const { data: sentReqs } = await supabase
      .from('friend_requests').select('receiver_id').eq('sender_id', userId)
    const { data: receivedReqs } = await supabase
      .from('friend_requests').select('sender_id').eq('receiver_id', userId)

    const excludedUserIds = [
      userId,
      ...(sentReqs || []).map(r => r.receiver_id),
      ...(receivedReqs || []).map(r => r.sender_id),
    ]

    const { data: allPets } = await supabase
      .from('pets').select('*').limit(20)

    const filtered = (allPets || []).filter(p => !excludedUserIds.includes(p.user_id))
    setSuggestions(filtered.slice(0, 8))

    // Build statuses
    const statuses = {}
    ;(sentReqs || []).forEach(r => { statuses[r.receiver_id] = 'pending' })
    setFriendStatuses(statuses)
  }

  const handleAccept = async (req) => {
    setActionLoading(prev => ({ ...prev, [req.id]: 'accepting' }))
    await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', req.id)

    // Notify sender
    await supabase.from('notifications').insert({
      user_id: req.sender_id,
      type: 'friend_accepted',
      message: `${pet.pet_name} accepted your friend request! 🎉`,
    })

    // Move from pending to friends
    setPendingRequests(prev => prev.filter(r => r.id !== req.id))
    if (req.senderPet) setFriends(prev => [...prev, req.senderPet])
    setActionLoading(prev => ({ ...prev, [req.id]: null }))
  }

  const handleDecline = async (req) => {
    setActionLoading(prev => ({ ...prev, [req.id]: 'declining' }))
    await supabase
      .from('friend_requests')
      .update({ status: 'declined' })
      .eq('id', req.id)

    setPendingRequests(prev => prev.filter(r => r.id !== req.id))
    setActionLoading(prev => ({ ...prev, [req.id]: null }))
  }

  const handleAddFriend = async (suggPet) => {
    if (!user || !pet) return
    setFriendStatuses(prev => ({ ...prev, [suggPet.user_id]: 'pending' }))

    const { error } = await supabase.from('friend_requests').insert({
      sender_id: user.id,
      receiver_id: suggPet.user_id,
      status: 'pending'
    })

    if (error) {
      setFriendStatuses(prev => ({ ...prev, [suggPet.user_id]: null }))
      return
    }

    await supabase.from('notifications').insert({
      user_id: suggPet.user_id,
      type: 'friend_request',
      message: `${pet.pet_name} sent you a friend request! 🐾`,
    })

    // Remove from suggestions
    setSuggestions(prev => prev.filter(s => s.user_id !== suggPet.user_id))
  }

  const handleRemoveFriend = async (friendPet) => {
    await supabase
      .from('friend_requests')
      .delete()
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendPet.user_id}),and(sender_id.eq.${friendPet.user_id},receiver_id.eq.${user.id})`)

    setFriends(prev => prev.filter(f => f.user_id !== friendPet.user_id))
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '2rem' }}>🐾</div>
  )

  return (
    <div style={{ background: '#FFFBF7', minHeight: '100vh' }}>
      <NavBar user={user} pet={pet} />

      <div style={{ maxWidth: 860, margin: '70px auto 0', padding: '20px 14px 40px' }}>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.8rem', color: '#1E1347' }}>
            👫 Friends
          </h1>
          <p style={{ color: '#6B7280', fontSize: '0.88rem' }}>
            Manage your friend requests and connections on PawVerse
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid #EDE8FF', marginBottom: 20 }}>
          {[
            { key: 'requests', label: `🐾 Requests`, count: pendingRequests.length },
            { key: 'friends', label: `✅ My Friends`, count: friends.length },
            { key: 'suggestions', label: `💡 Suggestions`, count: suggestions.length },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                padding: '10px 20px', border: 'none', background: 'transparent',
                cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700,
                fontSize: '0.88rem', color: tab === t.key ? '#FF6B35' : '#6B7280',
                borderBottom: tab === t.key ? '3px solid #FF6B35' : '3px solid transparent',
                marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6
              }}>
              {t.label}
              {t.count > 0 && (
                <span style={{
                  background: tab === t.key ? '#FF6B35' : '#EDE8FF',
                  color: tab === t.key ? '#fff' : '#6C4BF6',
                  borderRadius: 20, padding: '1px 7px',
                  fontSize: '0.72rem', fontWeight: 800
                }}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* REQUESTS TAB */}
        {tab === 'requests' && (
          <div>
            {pendingRequests.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: '3rem', marginBottom: 10 }}>🐾</div>
                <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.1rem', color: '#1E1347' }}>
                  No pending requests
                </div>
                <p style={{ color: '#6B7280', fontSize: '0.85rem', marginTop: 6 }}>
                  When someone sends you a friend request, it will appear here!
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                {pendingRequests.map(req => (
                  <div key={req.id} className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20, textAlign: 'center' }}>
                    {/* Avatar */}
                    <div style={{
                      width: 72, height: 72, borderRadius: '50%', background: '#FFE8F0',
                      border: '3px solid #FF6B35', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '2.2rem', overflow: 'hidden', marginBottom: 10
                    }}>
                      {req.senderPet?.avatar_url
                        ? <img src={req.senderPet.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : req.senderPet?.emoji || '🐾'}
                    </div>
                    <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.05rem' }}>
                      {req.senderPet?.pet_name}
                    </div>
                    <div style={{ color: '#6B7280', fontSize: '0.78rem', marginBottom: 4 }}>
                      {req.senderPet?.pet_breed}
                    </div>
                    <div style={{ color: '#6B7280', fontSize: '0.75rem', marginBottom: 14 }}>
                      by {req.senderPet?.owner_name}
                    </div>
                    <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                      <button
                        onClick={() => handleAccept(req)}
                        disabled={actionLoading[req.id]}
                        style={{
                          flex: 1, padding: '9px 0', border: 'none', borderRadius: 10,
                          background: 'linear-gradient(135deg, #FF6B35, #6C4BF6)',
                          color: '#fff', fontFamily: 'Nunito, sans-serif',
                          fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer',
                          opacity: actionLoading[req.id] ? 0.6 : 1
                        }}>
                        {actionLoading[req.id] === 'accepting' ? '...' : '✅ Accept'}
                      </button>
                      <button
                        onClick={() => handleDecline(req)}
                        disabled={actionLoading[req.id]}
                        style={{
                          flex: 1, padding: '9px 0', border: '1.5px solid #EDE8FF',
                          borderRadius: 10, background: '#fff',
                          color: '#6B7280', fontFamily: 'Nunito, sans-serif',
                          fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer',
                          opacity: actionLoading[req.id] ? 0.6 : 1
                        }}>
                        {actionLoading[req.id] === 'declining' ? '...' : '❌ Decline'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FRIENDS TAB */}
        {tab === 'friends' && (
          <div>
            {friends.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: '3rem', marginBottom: 10 }}>🐾</div>
                <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.1rem', color: '#1E1347' }}>
                  No friends yet
                </div>
                <p style={{ color: '#6B7280', fontSize: '0.85rem', marginTop: 6 }}>
                  Start adding pets from the Suggestions tab!
                </p>
                <button onClick={() => setTab('suggestions')}
                  className="btn-primary"
                  style={{ marginTop: 14, padding: '9px 22px', fontSize: '0.88rem', borderRadius: 10 }}>
                  💡 View Suggestions
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                {friends.map(friend => (
                  <div key={friend.id} className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 18, textAlign: 'center' }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: '50%', background: '#FFE8F0',
                      border: '3px solid #22C55E', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '2rem', overflow: 'hidden', marginBottom: 8
                    }}>
                      {friend.avatar_url
                        ? <img src={friend.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : friend.emoji || '🐾'}
                    </div>
                    <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '0.95rem' }}>
                      {friend.pet_name}
                    </div>
                    <div style={{ color: '#6B7280', fontSize: '0.75rem', marginBottom: 2 }}>{friend.pet_breed}</div>
                    <div style={{ color: '#6B7280', fontSize: '0.72rem', marginBottom: 12 }}>by {friend.owner_name}</div>
                    <div style={{ display: 'flex', gap: 6, width: '100%' }}>
                      <button
                        onClick={() => router.push('/chat')}
                        style={{
                          flex: 1, padding: '7px 0', border: 'none', borderRadius: 9,
                          background: 'linear-gradient(135deg, #FF6B35, #6C4BF6)',
                          color: '#fff', fontFamily: 'Nunito, sans-serif',
                          fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer'
                        }}>
                        💬 Chat
                      </button>
                      <button
                        onClick={() => handleRemoveFriend(friend)}
                        style={{
                          padding: '7px 10px', border: '1.5px solid #EDE8FF',
                          borderRadius: 9, background: '#fff',
                          color: '#aaa', fontFamily: 'Nunito, sans-serif',
                          fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer'
                        }}>
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUGGESTIONS TAB */}
        {tab === 'suggestions' && (
          <div>
            <p style={{ color: '#6B7280', fontSize: '0.85rem', marginBottom: 14 }}>
              🐾 Pets on PawVerse you might want to connect with!
            </p>
            {suggestions.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: '3rem', marginBottom: 10 }}>🎉</div>
                <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.1rem', color: '#1E1347' }}>
                  You've connected with everyone!
                </div>
                <p style={{ color: '#6B7280', fontSize: '0.85rem', marginTop: 6 }}>
                  Invite more friends to join PawVerse 🐾
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                {suggestions.map(s => (
                  <div key={s.id} className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 18, textAlign: 'center' }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: '50%', background: '#FFE8F0',
                      border: '3px solid #EDE8FF', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '2rem', overflow: 'hidden', marginBottom: 8
                    }}>
                      {s.avatar_url
                        ? <img src={s.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : s.emoji || '🐾'}
                    </div>
                    <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '0.95rem' }}>
                      {s.pet_name}
                    </div>
                    <div style={{ color: '#6B7280', fontSize: '0.75rem', marginBottom: 2 }}>{s.pet_breed}</div>
                    <div style={{ color: '#6B7280', fontSize: '0.72rem', marginBottom: 6 }}>by {s.owner_name}</div>
                    <div style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 20,
                      fontSize: '0.7rem', fontWeight: 800, marginBottom: 12,
                      background: '#F3F0FF', color: '#6C4BF6'
                    }}>
                      📍 {s.location || 'PawVerse'}
                    </div>
                    <button
                      onClick={() => handleAddFriend(s)}
                      disabled={!!friendStatuses[s.user_id]}
                      style={{
                        width: '100%', padding: '8px 0', border: 'none',
                        borderRadius: 10,
                        background: friendStatuses[s.user_id]
                          ? '#F3F0FF' : 'linear-gradient(135deg, #FF6B35, #6C4BF6)',
                        color: friendStatuses[s.user_id] ? '#6C4BF6' : '#fff',
                        fontFamily: 'Nunito, sans-serif', fontWeight: 800,
                        fontSize: '0.82rem', cursor: friendStatuses[s.user_id] ? 'default' : 'pointer'
                      }}>
                      {friendStatuses[s.user_id] ? 'Request Sent 🐾' : '+ Add Friend'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}