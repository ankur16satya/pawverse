import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import NavBar from '../../components/NavBar'
import SEO from '../../components/SEO'

export default function UserProfile() {
  const router = useRouter()
  const { id } = router.query
  const [user, setUser] = useState(null)
  const [pet, setPet] = useState(null)
  const [profilePet, setProfilePet] = useState(null)
  const [posts, setPosts] = useState(null)
  const [reels, setReels] = useState(null)
  const [friends, setFriends] = useState([])
  const [images, setImages] = useState([])
  const [tab, setTab] = useState('posts')
  const [loading, setLoading] = useState(true)
  const [friendStatus, setFriendStatus] = useState(null)
  const [lightboxImg, setLightboxImg] = useState(null)

  useEffect(() => {
    if (!id) return
    init()
  }, [id])

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    setUser(session.user)

    // Redirect to own profile
    if (session.user.id === id) { router.push('/profile'); return }

    const { data: myPet } = await supabase
      .from('pets').select('*').eq('user_id', session.user.id).eq('is_health_pet', false).maybeSingle()
    if (myPet) setPet(myPet)

    // Get profile pet
    const { data: profilePetData } = await supabase
      .from('pets').select('*').eq('user_id', id).eq('is_health_pet', false).single()
    setProfilePet(profilePetData)

    // Get posts
    // Get the pet profile for this user first
const { data: targetPet } = await supabase
  .from('pets')
  .select('id')
  .eq('user_id', id)
  .single()

// Get posts using pet_id
  if (targetPet) {
    const { data: postsData } = await supabase
      .from('posts')
      .select('*, pets(pet_name, emoji, avatar_url, owner_name, user_id), comments(count)')
      .eq('pet_id', targetPet.id)
      .eq('hidden', false)
      .order('created_at', { ascending: false })

    setPosts((postsData || []).map(p => ({
      ...p,
      comments_count: p.comments?.[0]?.count || 0
    })))

    // Get images from posts
    const imgs = (postsData || []).filter(p => p.image_url).map(p => p.image_url)
    setImages(imgs)

    // Get reels using pet_id
    const { data: reelsData } = await supabase
      .from('reels')
      .select('*, pets(pet_name, emoji, avatar_url, owner_name, user_id), comments(count)')
      .eq('pet_id', targetPet.id)
      .order('created_at', { ascending: false })
      .limit(100)

    setReels((reelsData || []).map(r => ({
      ...r,
      comments_count: r.comments?.[0]?.count || 0
    })))
  } else {
    setPosts([])
    setReels([])
    setImages([])
  }

// Get friends of this profile — fixed query
const { data: sentFriends } = await supabase
  .from('friend_requests')
  .select('receiver_id')
  .eq('sender_id', id)
  .eq('status', 'accepted')

const { data: receivedFriends } = await supabase
  .from('friend_requests')
  .select('sender_id')
  .eq('receiver_id', id)
  .eq('status', 'accepted')

const friendList = []

for (const req of (sentFriends || [])) {
  const { data: friendPet } = await supabase
    .from('pets')
    .select('*')
    .eq('user_id', req.receiver_id)
    .single()
  if (friendPet) friendList.push(friendPet)
}

for (const req of (receivedFriends || [])) {
  const { data: friendPet } = await supabase
    .from('pets')
    .select('*')
    .eq('user_id', req.sender_id)
    .single()
  if (friendPet) friendList.push(friendPet)
}

setFriends(friendList)
    // Check friend status with this profile
    const { data: sentReq } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('sender_id', session.user.id)
      .eq('receiver_id', id)
      .single()

    const { data: receivedReq } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('sender_id', id)
      .eq('receiver_id', session.user.id)
      .single()

    if (sentReq) setFriendStatus(sentReq.status === 'accepted' ? 'friends' : 'sent')
    else if (receivedReq) setFriendStatus(receivedReq.status === 'accepted' ? 'friends' : 'received')
    else setFriendStatus(null)

    setLoading(false)
  }

  const handleAddFriend = async () => {
    if (!user || !profilePet) return
    let currentPet = pet
    if (!currentPet) {
      const { data: pD } = await supabase.from('pets').select('*').eq('user_id', user.id).eq('is_health_pet', false).maybeSingle()
      if (pD) {
        currentPet = pD
        setPet(pD)
      } else {
        return // Still no pet, can't add friend safely
      }
    }

    
    if (friendStatus === 'received') {
      // Accept the request
      setFriendStatus('friends')
      const { data: req } = await supabase.from('friend_requests').select('id').eq('sender_id', id).eq('receiver_id', user.id).single()
      if (req) {
        await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', req.id)
        const petName = currentPet?.pet_name || 'A pet'
        await supabase.from('notifications').insert({
          user_id: id, type: 'friend_accepted',
          message: `${petName} accepted your friend request! 🎉`,
        })
      }
      return
    }

    setFriendStatus('sent')
    await supabase.from('friend_requests').insert({
      sender_id: user.id, receiver_id: id, status: 'pending'
    })
    const petName = currentPet?.pet_name || 'A pet'
    await supabase.from('notifications').insert({
      user_id: id, type: 'friend_request',
      message: `${petName} sent you a friend request! 🐾|/friends`,
    })

    // ── SEND REAL BACKGROUND PUSH ──
    fetch('/api/push', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: id,
        title: '👫 New Friend Request',
        body: `${pet.pet_name} wants to be your friend! 🐾`,
        url: '/friends'
      })
    }).catch(e => console.error('Push failed:', e))
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

  const getFriendBtn = () => {
    if (friendStatus === 'friends') return { label: '✅ Friends', disabled: true, style: { background: '#E8F8E8', color: '#22C55E' } }
    if (friendStatus === 'sent') return { label: 'Request Sent 🐾', disabled: true, style: { background: '#F3F0FF', color: '#6C4BF6' } }
    if (friendStatus === 'received') return { label: '✅ Accept Request', disabled: false, style: { background: 'linear-gradient(135deg,#FF6B35,#6C4BF6)', color: '#fff' } }
    return { label: '+ Add Friend', disabled: false, style: { background: 'linear-gradient(135deg,#FF6B35,#6C4BF6)', color: '#fff' } }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '2rem' }}>🐾</div>
  )

  if (!profilePet) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ fontSize: '3rem' }}>🐾</div>
      <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.2rem', marginTop: 12 }}>Profile not found</div>
      <button onClick={() => router.push('/feed')} className="btn-primary" style={{ marginTop: 16, padding: '9px 22px', borderRadius: 10 }}>
        Back to Feed
      </button>
    </div>
  )

  const friendBtn = getFriendBtn()

  return (
    <div style={{ background: '#FFFBF7', minHeight: '100vh' }}>
      {/* Issue 4.4: Per-profile SEO for social sharing */}
      <SEO
        title={`${profilePet?.owner_name || 'Pet Parent'} & ${profilePet?.pet_name || 'Pet'} on PawVerse`}
        description={`Follow ${profilePet?.pet_name || 'this pet'} on PawVerse — India's pet social network. ${profilePet?.pet_type ? `Meet this adorable ${profilePet.pet_type}.` : ''}`}
        ogImage={profilePet?.avatar_url}
        canonical={`https://pawversesocial.com/user/${id}`}
        noindex={true}
      />
      <NavBar user={user} pet={pet} />

      {/* Lightbox */}
      {lightboxImg && (
        <div onClick={() => setLightboxImg(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, cursor: 'zoom-out' }}>
          <button onClick={() => setLightboxImg(null)}
            style={{ position: 'absolute', top: 18, right: 22, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          <img src={lightboxImg} alt="full"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '88vh', borderRadius: 16, objectFit: 'contain', boxShadow: '0 8px 60px rgba(0,0,0,0.6)' }} />
        </div>
      )}

      <div style={{ maxWidth: 860, margin: '58px auto 0', paddingBottom: 40 }}>
        {/* Cover */}
        <div style={{ height: 220, background: 'linear-gradient(135deg, #FF6B35, #6C4BF6 60%, #FF6B9D)', borderRadius: '0 0 20px 20px', position: 'relative' }}>
          <div style={{
            width: 96, height: 96, borderRadius: '50%', border: '4px solid #fff',
            background: '#FFE8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            position: 'absolute', bottom: -28, left: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '3rem', overflow: 'hidden'
          }}>
            {profilePet.avatar_url
              ? <img src={profilePet.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (profilePet.role?.toLowerCase() === 'vet' ? '🩺' : profilePet.role?.toLowerCase() === 'supplier' ? '📦' : profilePet.emoji || '🐾')}
          </div>
        </div>

        <div style={{ padding: '40px 24px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
            <div>
              <h1 className={`${profilePet.role === 'vet' ? 'vet-badge' : profilePet.role === 'supplier' ? 'supplier-badge' : ''}`} style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.6rem', color: '#1E1347' }}>
                {profilePet.pet_name} {(!profilePet.role || profilePet.role === 'user') && (profilePet.emoji || '🐾')}
              </h1>
              <p style={{ color: '#6B7280', fontSize: '0.86rem', marginTop: 2, display: 'flex', alignItems: 'center' }}>
                {profilePet.pet_breed} · Managed by {profilePet.owner_name}
                {profilePet.role === 'vet' && <span className="role-tag vet">Verified Vet</span>}
                {profilePet.role === 'supplier' && <span className="role-tag supplier">Supplier</span>}
              </p>
              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[['📍', profilePet.location || 'PawVerse'], ['🪙', `${profilePet.paw_coins || 0} PawCoins`]].map(([ic, tx]) => (
                  <span key={tx} style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 800, background: '#F3F0FF', color: '#6C4BF6' }}>{ic} {tx}</span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Stats */}
              {[['Posts', posts?.length || 0], ['Reels', reels?.length || 0], ['Friends', friends.length]].map(([l, v]) => (
                <div key={l} style={{ textAlign: 'center', padding: '6px 14px', background: '#F9F5FF', borderRadius: 10 }}>
                  <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, color: '#FF6B35', fontSize: '1.1rem' }}>{v}</div>
                  <div style={{ fontSize: '0.7rem', color: '#6B7280' }}>{l}</div>
                </div>
              ))}
              {/* Friend / Chat buttons */}
              <button onClick={handleAddFriend} disabled={friendBtn.disabled}
                style={{ padding: '9px 18px', border: 'none', borderRadius: 10, fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '0.88rem', cursor: friendBtn.disabled ? 'default' : 'pointer', ...friendBtn.style }}>
                {friendBtn.label}
              </button>
              {friendStatus === 'friends' && (
                <button onClick={() => router.push('/chat')}
                  style={{ padding: '9px 18px', border: 'none', borderRadius: 10, background: 'linear-gradient(135deg,#FF6B35,#6C4BF6)', color: '#fff', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer' }}>
                  💬 Message
                </button>
              )}
            </div>
          </div>

          {/* Bio */}
          {profilePet.bio && (
            <div className="card" style={{ marginBottom: 16 }}>
              <p style={{ lineHeight: 1.7, fontSize: '0.9rem', color: '#4B5563' }}>{profilePet.bio}</p>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '2px solid #EDE8FF', marginBottom: 16 }}>
            {['posts', 'reels', 'friends', 'photos', 'about'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{
                  padding: '9px 16px', border: 'none', background: 'transparent',
                  cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700,
                  fontSize: '0.85rem', color: tab === t ? '#FF6B35' : '#6B7280',
                  borderBottom: tab === t ? '3px solid #FF6B35' : '3px solid transparent', marginBottom: -2
                }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Posts Tab */}
          {tab === 'posts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {!posts || posts.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 30, color: '#6B7280' }}>
                  No posts yet 🐾
                </div>
              ) : posts.map(p => (
                <div key={p.id} className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#FFE8F0', border: '2px solid #FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', overflow: 'hidden' }}>
                      {profilePet.avatar_url
                        ? <img src={profilePet.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : profilePet.emoji || '🐾'}
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 700 }}>{profilePet.pet_name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>{timeAgo(p.created_at)}</div>
                    </div>
                  </div>
                  {p.content && <p style={{ fontSize: '0.9rem', lineHeight: 1.65, marginBottom: 8, whiteSpace: 'pre-wrap' }}>{p.content}</p>}
                 {p.image_url && (
  <div onClick={() => setLightboxImg(p.image_url)}
    style={{ borderRadius: 12, overflow: 'hidden', cursor: 'zoom-in', background: '#F3F0FF', maxHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <img src={p.image_url} alt="post"
      style={{ width: '100%', height: 'auto', maxHeight: 400, objectFit: 'contain', display: 'block', borderRadius: 12 }} />
  </div>
)}
                  <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#6B7280', display: 'flex', gap: 12 }}>
                    <span>❤️ {p.likes || 0} paws</span>
                    <span>💬 {p.comments_count || 0} comments</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reels Tab */}
          {tab === 'reels' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {!reels || reels.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 30, color: '#6B7280' }}>
                  No reels yet 🎬
                </div>
              ) : reels.map(r => (
                <div key={r.id} className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#FFE8F0', border: '2px solid #FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', overflow: 'hidden' }}>
                      {profilePet.avatar_url
                        ? <img src={profilePet.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : profilePet.emoji || '🐾'}
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 700 }}>{profilePet.pet_name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>{timeAgo(r.created_at)}</div>
                    </div>
                  </div>
                  {r.caption && <p style={{ fontSize: '0.9rem', lineHeight: 1.65, marginBottom: 8, whiteSpace: 'pre-wrap' }}>{r.caption}</p>}
                  
                  <div style={{ borderRadius: 12, overflow: 'hidden', background: '#111', display: 'flex', justifyContent: 'center' }}>
                    <video src={r.video_url} autoPlay muted loop playsInline controls style={{ width: '100%', maxHeight: 400, objectFit: 'contain' }} />
                  </div>

                  <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#6B7280', display: 'flex', gap: 12 }}>
                    <span>❤️ {r.likes || 0} paws</span>
                    <span>💬 {r.comments_count || 0} comments</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Friends Tab */}
          {tab === 'friends' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {friends.length === 0 ? (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 30, color: '#6B7280' }}>No friends yet 🐾</div>
              ) : friends.map(f => (
                <div key={f.id} className="card"
                  onClick={() => router.push(`/user/${f.user_id}`)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 14, textAlign: 'center', cursor: 'pointer' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#FFE8F0', border: '2px solid #FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', overflow: 'hidden', marginBottom: 8 }}>
                    {f.avatar_url ? <img src={f.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : f.emoji || '🐾'}
                  </div>
                  <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 700, fontSize: '0.88rem' }}>{f.pet_name}</div>
                  <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>{f.pet_breed}</div>
                </div>
              ))}
            </div>
          )}

          {/* Photos Tab */}
          {tab === 'photos' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {images.length === 0 ? (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 30, color: '#6B7280' }}>No photos yet 🐾</div>
              ) : images.map((img, i) => (
                <div key={i} onClick={() => setLightboxImg(img)}
                  style={{ height: 140, borderRadius: 10, overflow: 'hidden', cursor: 'zoom-in', background: '#F3F0FF' }}>
                  <img src={img} alt="photo" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              ))}
            </div>
          )}

          {/* About Tab */}
          {tab === 'about' && (
            <div className="card">
              <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, marginBottom: 14 }}>📋 About {profilePet.pet_name}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  ['🐾 Name', profilePet.pet_name],
                  ['🐶 Type', profilePet.pet_type],
                  ['🧬 Breed', profilePet.pet_breed || '—'],
                  ['📍 Location', profilePet.location || 'PawVerse'],
                  ['🪙 PawCoins', `${profilePet.paw_coins || 0} coins`],
                  ['👤 Managed by', profilePet.owner_name],
                ].map(([l, v]) => (
                  <div key={l} style={{ padding: 10, background: '#F9F5FF', borderRadius: 10 }}>
                    <div style={{ fontSize: '0.74rem', color: '#6B7280', marginBottom: 2 }}>{l}</div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}