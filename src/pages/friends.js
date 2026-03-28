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
  const [sentRequests, setSentRequests] = useState([])
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

    await fetchAll(session.user.id)
    setLoading(false)
  }

  const fetchAll = async (userId) => {
    await Promise.all([
      fetchPendingRequests(userId),
      fetchSentRequests(userId),
      fetchFriends(userId),
      fetchSuggestions(userId),
    ])
  }

  const fetchPendingRequests = async (userId) => {
    // Step 1: Get all pending requests where I am the receiver
    const { data: requests, error } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('receiver_id', userId)
      .eq('status', 'pending')

    if (error || !requests || requests.length === 0) {
      setPendingRequests([])
      return
    }

    // Step 2: For each request, fetch the sender's pet separately
    const enriched = []
    for (const req of requests) {
      const { data: senderPet } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', req.sender_id)
        .single()

      if (senderPet) {
        enriched.push({ ...req, senderPet })
      }
    }

    setPendingRequests(enriched)
  }

  const fetchSentRequests = async (userId) => {
    // Step 1: Get all requests I have sent
    const { data: requests, error } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('sender_id', userId)
      .in('status', ['pending', 'declined'])

    if (error || !requests || requests.length === 0) {
      setSentRequests([])
      return
    }

    // Step 2: For each request, fetch the receiver's pet separately
    const enriched = []
    for (const req of requests) {
      const { data: receiverPet } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', req.receiver_id)
        .single()

      if (receiverPet) {
        enriched.push({ ...req, receiverPet })
      }
    }

    setSentRequests(enriched)
  }

  const fetchFriends = async (userId) => {
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
    const { data: sentReqs } = await supabase
      .from('friend_requests').select('receiver_id').eq('sender_id', userId)
    const { data: receivedReqs } = await supabase
      .from('friend_requests').select('sender_id').eq('receiver_id', userId)

    const excludedUserIds = [
      userId,
      ...(sentReqs || []).map(r => r.receiver_id),
      ...(receivedReqs || []).map(r => r.sender_id),
    ]

    const { data: allPets } = await supabase.from('pets').select('*').limit(30)

    const filtered = (allPets || []).filter(p => !excludedUserIds.includes(p.user_id))
    setSuggestions(filtered.slice(0, 8))

    const statuses = {}
    ;(sentReqs || []).forEach(r => { statuses[r.receiver_id] = 'pending' })
    setFriendStatuses(statuses)
  }

  const handleAccept = async (req) => {
    setActionLoading(prev => ({ ...prev, [req.id]: 'accepting' }))

    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', req.id)

    if (!error) {
      // Notify sender
      await supabase.from('notifications').insert({
        user_id: req.sender_id,
        type: 'friend_accepted',
        message: `${pet.pet_name} accepted your friend request! 🎉`,
      })

      // Update UI instantly
      setPendingRequests(prev => prev.filter(r => r.id !== req.id))
      if (req.senderPet) setFriends(prev => [...prev, req.senderPet])
    }

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

  const handleCancelRequest = async (req) => {
  setActionLoading(prev => ({ ...prev, [req.id]: 'cancelling' }))

  const { error } = await supabase
    .from('friend_requests')
    .delete()
    .eq('id', req.id)
    .eq('sender_id', user.id) // extra safety check

  if (error) {
    console.error('Cancel error:', error)
    alert('Could not cancel request. Please try again.')
    setActionLoading(prev => ({ ...prev, [req.id]: null }))
    return
  }

  // Only update UI if database delete was successful
  setSentRequests(prev => prev.filter(r => r.id !== req.id))
  setActionLoading(prev => ({ ...prev, [req.id]: null }))
}

  const handleAddFriend = async (suggPet) => {
    if (!user || !pet) return
    setFriendStatuses(prev => ({ ...prev, [suggPet.user_id]: 'pending' }))

    const { data: newReq, error } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: user.id,
        receiver_id: suggPet.user_id,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      setFriendStatuses(prev => ({ ...prev, [suggPet.user_id]: null }))
      return
    }

    await supabase.from('notifications').insert({
      user_id: suggPet.user_id,
      type: 'friend_request',
      message: `${pet.pet_name} sent you a friend request! 🐾`,
    })

    // Add to sent requests list
    setSentRequests(prev => [...prev, { ...newReq, receiverPet: suggPet }])
    setSuggestions(prev => prev.filter(s => s.user_id !== suggPet.user_id))
  }

  const handleRemoveFriend = async (friendPet) => {
    await supabase
      .from('friend_requests')
      .delete()
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendPet.user_id}),and(sender_id.eq.${friendPet.user_id},receiver_id.eq.${user.id})`)

    setFriends(prev => prev.filter(f => f.user_id !== friendPet.user_id))
  }

  // Avatar component reused
  const Avatar = ({ pet: p, size = 64, borderColor = '#FF6B35' }) => (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: '#FFE8F0',
      border: `3px solid ${borderColor}`, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: size * 0.38, overflow: 'hidden',
      flexShrink: 0
    }}>
      {p?.avatar_url
        ? <img src={p.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : p?.emoji || '🐾'}
    </div>
  )

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '2rem' }}>🐾</div>
  )

  const tabs = [
    { key: 'requests',    label: '🐾 Requests Recieved',     count: pendingRequests.length },
    { key: 'sent',        label: '📤 Requests Sent',          count: sentRequests.length },
    { key: 'friends',     label: '✅ My Friends',    count: friends.length },
    { key: 'suggestions', label: '💡 Suggestions',   count: suggestions.length },
  ]

  return (
    <div style={{ background: '#FFFBF7', minHeight: '100vh' }}>
      <NavBar user={user} pet={pet} />

      <div style={{ maxWidth: 900, margin: '70px auto 0', padding: '20px 14px 40px' }}>

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
        <div style={{ display: 'flex', borderBottom: '2px solid #EDE8FF', marginBottom: 20, overflowX: 'auto' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                padding: '10px 18px', border: 'none', background: 'transparent',
                cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700,
                fontSize: '0.88rem', color: tab === t.key ? '#FF6B35' : '#6B7280',
                borderBottom: tab === t.key ? '3px solid #FF6B35' : '3px solid transparent',
                marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6,
                whiteSpace: 'nowrap'
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

        {/* ── REQUESTS TAB ── */}
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                {pendingRequests.map(req => (
                  <div key={req.id} className="card"
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20, textAlign: 'center' }}>
                    <Avatar pet={req.senderPet} size={72} />
                    <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.05rem', marginTop: 10 }}>
                      {req.senderPet?.pet_name}
                    </div>
                    <div style={{ color: '#6B7280', fontSize: '0.78rem' }}>{req.senderPet?.pet_breed}</div>
                    <div style={{ color: '#6B7280', fontSize: '0.75rem', marginBottom: 6 }}>
                      by {req.senderPet?.owner_name}
                    </div>
                    <div style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 20,
                      fontSize: '0.7rem', fontWeight: 800, marginBottom: 14,
                      background: '#F3F0FF', color: '#6C4BF6'
                    }}>
                      📍 {req.senderPet?.location || 'PawVerse'}
                    </div>
                    <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                      <button onClick={() => handleAccept(req)}
                        disabled={!!actionLoading[req.id]}
                        style={{
                          flex: 1, padding: '9px 0', border: 'none', borderRadius: 10,
                          background: 'linear-gradient(135deg, #FF6B35, #6C4BF6)',
                          color: '#fff', fontFamily: 'Nunito, sans-serif',
                          fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer',
                          opacity: actionLoading[req.id] ? 0.6 : 1
                        }}>
                        {actionLoading[req.id] === 'accepting' ? '...' : '✅ Accept'}
                      </button>
                      <button onClick={() => handleDecline(req)}
                        disabled={!!actionLoading[req.id]}
                        style={{
                          flex: 1, padding: '9px 0', border: '1.5px solid #EDE8FF',
                          borderRadius: 10, background: '#fff', color: '#6B7280',
                          fontFamily: 'Nunito, sans-serif', fontWeight: 800,
                          fontSize: '0.85rem', cursor: 'pointer',
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

        {/* ── SENT REQUESTS TAB ── */}
        {tab === 'sent' && (
          <div>
            {sentRequests.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: '3rem', marginBottom: 10 }}>📤</div>
                <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.1rem', color: '#1E1347' }}>
                  No sent requests
                </div>
                <p style={{ color: '#6B7280', fontSize: '0.85rem', marginTop: 6 }}>
                  Go to Suggestions and add some pets as friends!
                </p>
                <button onClick={() => setTab('suggestions')} className="btn-primary"
                  style={{ marginTop: 14, padding: '9px 22px', fontSize: '0.88rem', borderRadius: 10 }}>
                  💡 View Suggestions
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                {sentRequests.map(req => (
                  <div key={req.id} className="card"
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20, textAlign: 'center' }}>
                    <Avatar pet={req.receiverPet} size={72} borderColor='#6C4BF6' />
                    <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.05rem', marginTop: 10 }}>
                      {req.receiverPet?.pet_name}
                    </div>
                    <div style={{ color: '#6B7280', fontSize: '0.78rem' }}>{req.receiverPet?.pet_breed}</div>
                    <div style={{ color: '#6B7280', fontSize: '0.75rem', marginBottom: 6 }}>
                      by {req.receiverPet?.owner_name}
                    </div>

                    {/* Status badge */}
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '4px 12px', borderRadius: 20, marginBottom: 14,
                      background: req.status === 'declined' ? '#FFE8E8' : '#F3F0FF',
                      color: req.status === 'declined' ? '#FF4757' : '#6C4BF6',
                      fontSize: '0.75rem', fontWeight: 800
                    }}>
                      {req.status === 'declined' ? '❌ Declined' : '⏳ Pending...'}
                    </div>

                    <button onClick={() => handleCancelRequest(req)}
                      disabled={actionLoading[req.id] === 'cancelling'}
                      style={{
                        width: '100%', padding: '8px 0', border: '1.5px solid #EDE8FF',
                        borderRadius: 10, background: '#fff', color: '#6B7280',
                        fontFamily: 'Nunito, sans-serif', fontWeight: 800,
                        fontSize: '0.82rem', cursor: 'pointer',
                        opacity: actionLoading[req.id] ? 0.6 : 1
                      }}>
                      {actionLoading[req.id] === 'cancelling' ? 'Cancelling...' : '✕ Cancel Request'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── FRIENDS TAB ── */}
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
                <button onClick={() => setTab('suggestions')} className="btn-primary"
                  style={{ marginTop: 14, padding: '9px 22px', fontSize: '0.88rem', borderRadius: 10 }}>
                  💡 View Suggestions
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                {friends.map(friend => (
                  <div key={friend.id} className="card"
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 18, textAlign: 'center' }}>
                    <Avatar pet={friend} size={64} borderColor='#22C55E' />
                    <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '0.95rem', marginTop: 8 }}>
                      {friend.pet_name}
                    </div>
                    <div style={{ color: '#6B7280', fontSize: '0.75rem' }}>{friend.pet_breed}</div>
                    <div style={{ color: '#6B7280', fontSize: '0.72rem', marginBottom: 12 }}>
                      by {friend.owner_name}
                    </div>
                    <div style={{ display: 'flex', gap: 6, width: '100%' }}>
                      <button onClick={() => router.push('/chat')}
                        style={{
                          flex: 1, padding: '7px 0', border: 'none', borderRadius: 9,
                          background: 'linear-gradient(135deg, #FF6B35, #6C4BF6)',
                          color: '#fff', fontFamily: 'Nunito, sans-serif',
                          fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer'
                        }}>
                        💬 Chat
                      </button>
                      <button onClick={() => handleRemoveFriend(friend)}
                        style={{
                          padding: '7px 10px', border: '1.5px solid #EDE8FF',
                          borderRadius: 9, background: '#fff', color: '#aaa',
                          fontFamily: 'Nunito, sans-serif', fontWeight: 700,
                          fontSize: '0.78rem', cursor: 'pointer'
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

        {/* ── SUGGESTIONS TAB ── */}
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
                  <div key={s.id} className="card"
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 18, textAlign: 'center' }}>
                    <Avatar pet={s} size={64} borderColor='#EDE8FF' />
                    <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '0.95rem', marginTop: 8 }}>
                      {s.pet_name}
                    </div>
                    <div style={{ color: '#6B7280', fontSize: '0.75rem' }}>{s.pet_breed}</div>
                    <div style={{ color: '#6B7280', fontSize: '0.72rem', marginBottom: 6 }}>by {s.owner_name}</div>
                    <div style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 20,
                      fontSize: '0.7rem', fontWeight: 800, marginBottom: 12,
                      background: '#F3F0FF', color: '#6C4BF6'
                    }}>
                      📍 {s.location || 'PawVerse'}
                    </div>
                    <button onClick={() => handleAddFriend(s)}
                      disabled={!!friendStatuses[s.user_id]}
                      style={{
                        width: '100%', padding: '8px 0', border: 'none', borderRadius: 10,
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