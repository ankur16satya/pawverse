import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'

export default function Profile() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [pet, setPet] = useState(null)
  const [posts, setPosts] = useState([])
  const [reels, setReels] = useState([])
  const [friends, setFriends] = useState([])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('posts')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const avatarInputRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      setUser(session.user)

      const fetchUserContent = (fetchPetId) => {
        supabase.from('posts').select('*').eq('pet_id', fetchPetId).order('created_at', { ascending: false }).limit(20).then(({ data }) => setPosts(data || []))
        supabase.from('reels').select('*').eq('pet_id', fetchPetId).order('created_at', { ascending: false }).limit(20).then(({ data }) => setReels(data || []))
      }

      const fetchFriends = async (userId) => {
        const { data: sentFriends } = await supabase.from('friend_requests').select('receiver_id').eq('sender_id', userId).eq('status', 'accepted')
        const { data: receivedFriends } = await supabase.from('friend_requests').select('sender_id').eq('receiver_id', userId).eq('status', 'accepted')
        const friendList = []
        for (const req of (sentFriends || [])) {
          const { data: friendPet } = await supabase.from('pets').select('*').eq('user_id', req.receiver_id).single()
          if (friendPet) friendList.push(friendPet)
        }
        for (const req of (receivedFriends || [])) {
          const { data: friendPet } = await supabase.from('pets').select('*').eq('user_id', req.sender_id).single()
          if (friendPet) friendList.push(friendPet)
        }
        setFriends(friendList)
      }
      
      fetchFriends(session.user.id)

      const { data: existingPet } = await supabase.from('pets').select('*').eq('user_id', session.user.id).single()

      if (existingPet) {
        setPet(existingPet)
        setForm(existingPet)
        if (existingPet.avatar_url) setAvatarPreview(existingPet.avatar_url)
        setLoading(false)
        fetchUserContent(existingPet.id)
      } else {
        const pending = localStorage.getItem('pending_pet')
        if (pending) {
          const petData = JSON.parse(pending)
          const { data: newPet, error } = await supabase.from('pets').insert({
            user_id: session.user.id,
            ...petData,
            paw_coins: 150,
            bio: `Hi, I'm ${petData.pet_name}! 🐾`,
            location: 'India',
          }).select().single()

          if (!error && newPet) {
            localStorage.removeItem('pending_pet')
            setPet(newPet)
            setForm(newPet)
            fetchUserContent(newPet.id)
          }
        }
        setLoading(false)
      }
    })
  }, [])

  // Handle avatar file selection & upload
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) {
      alert('Image must be under 3MB')
      return
    }

    // Show instant local preview
    const localPreview = URL.createObjectURL(file)
    setAvatarPreview(localPreview)
    setAvatarUploading(true)

    try {
      // Delete old avatar if exists
      if (pet.avatar_url) {
        const oldPath = pet.avatar_url.split('/avatars/')[1]
        if (oldPath) await supabase.storage.from('avatars').remove([oldPath])
      }

      // Upload new avatar
      const ext = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { cacheControl: '3600', upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Save to pets table
      const { error: updateError } = await supabase
        .from('pets')
        .update({ avatar_url: publicUrl })
        .eq('id', pet.id)

      if (updateError) throw updateError

      setPet(p => ({ ...p, avatar_url: publicUrl }))
      setAvatarPreview(publicUrl)

    } catch (err) {
      alert('Failed to upload image. Please try again.')
      setAvatarPreview(pet.avatar_url || null)
    } finally {
      setAvatarUploading(false)
    }
  }

  const saveProfile = async () => {
    setSaving(true)
    await supabase.from('pets')
      .update({
        bio: form.bio,
        location: form.location,
        pet_breed: form.pet_breed
      })
      .eq('id', pet.id)
    setPet({ ...pet, ...form })
    setEditing(false)
    setSaving(false)
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

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '2rem',paddingTop:'50px' }}>🐾</div>
  )

  if (!pet) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12, textAlign: 'center', padding: 20 }}>
      <div style={{ fontSize: '3rem' }}>🐾</div>
      <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.2rem', color: '#1E1347' }}>No pet profile found</div>
      <p style={{ color: '#6B7280', fontSize: '0.88rem', maxWidth: 300 }}>Please sign out and sign up again!</p>
      <button onClick={() => router.push('/')} style={{ background: 'linear-gradient(135deg,#FF6B35,#FF8C5A)', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 22px', fontFamily: 'Nunito, sans-serif', fontWeight: 800, cursor: 'pointer', fontSize: '0.95rem' }}>
        Go to Sign Up 🐾
      </button>
    </div>
  )

  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(213, 134, 200, 1), rgba(105, 201, 249, 1))', minHeight: '100vh' }}>
      <NavBar user={user} pet={pet} />

      <style>{`
        .profile-wrapper {
          max-width: 860px;
          margin: 68px auto 0;
          padding-bottom: 60px;
          padding-top:30px
        }
        .profile-cover {
          height: 220px;
          background: linear-gradient(135deg, #FF6B35, #6C4BF6 60%, #FF6B9D);
          border-radius: 0 0 20px 20px;
          position: relative;
        }
        .profile-body {
          padding: 52px 24px 0;
        }
        .profile-info-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 16px;
        }
        .profile-stats {
          display: flex;
          gap: 20px;
        }
        .profile-tabs {
          display: flex;
          border-bottom: 2px solid #EDE8FF;
          margin-bottom: 14px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .profile-tabs::-webkit-scrollbar { display: none; }
        .profile-posts-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .profile-about-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .profile-friends-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 12px;
        }
        @media (max-width: 768px) {
          .profile-wrapper {
            margin-top: 30px !important;
            padding-bottom: 80px;
          }
          .profile-cover {
            height: 160px;
            border-radius: 0 0 16px 16px;
          }
          .profile-body {
            padding: 44px 14px 0;
          }
          .profile-info-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          .profile-stats {
            gap: 14px;
            width: 100%;
            justify-content: flex-start;
          }
          .profile-about-grid {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .profile-friends-grid {
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 10px;
          }
        }
        @media (max-width: 480px) {
          .profile-cover { height: 130px; }
          .profile-body { padding: 40px 12px 0; }
          .profile-about-grid { grid-template-columns: 1fr; }
          .profile-friends-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      <div className="profile-wrapper">

        {/* Cover + Avatar */}
        <div className="profile-cover">

          {/* Avatar with upload button */}
          <div style={{ position: 'absolute', bottom: -38, left: 20 }}>
            <div style={{ position: 'relative', width: 90, height: 90 }}>
              <div style={{
                width: 90, height: 90, borderRadius: '50%',
                border: '4px solid #fff', background: '#FFE8F0',
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2.8rem', overflow: 'hidden', position: 'relative'
              }}>
                {avatarUploading ? (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: '1.2rem' }}>⏳</div>
                    <div style={{ fontSize: '0.55rem', color: '#fff', fontWeight: 800 }}>Uploading...</div>
                  </div>
                ) : avatarPreview ? (
                  <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  pet.emoji || '🐾'
                )}
              </div>
              {/* Camera button */}
              <div
                onClick={() => !avatarUploading && avatarInputRef.current?.click()}
                style={{
                  position: 'absolute', bottom: 2, right: 2,
                  width: 28, height: 28, borderRadius: '50%',
                  background: avatarUploading ? '#ccc' : 'linear-gradient(135deg, #FF6B35, #6C4BF6)',
                  border: '2.5px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: avatarUploading ? 'not-allowed' : 'pointer', fontSize: '0.75rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)', transition: 'transform 0.2s'
                }}
                onMouseEnter={e => { if (!avatarUploading) e.currentTarget.style.transform = 'scale(1.1)' }}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >📷</div>
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
            </div>
          </div>

          {/* Edit Profile button */}
          {!editing && (
            <div style={{ position: 'absolute', top: 12, right: 12 }}>
              <button
                onClick={() => setEditing(true)}
                style={{
                  background: 'rgba(255,255,255,0.22)', color: '#fff',
                  backdropFilter: 'blur(8px)',
                  border: '1.5px solid rgba(255,255,255,0.35)',
                  borderRadius: 11, padding: '7px 14px',
                  fontFamily: 'Nunito, sans-serif', fontWeight: 800,
                  cursor: 'pointer', fontSize: '0.82rem'
                }}>
                ✏️ Edit Profile
              </button>
            </div>
          )}
        </div>

        <div className="profile-body">
          <div className="profile-info-row">
            <div>
              <h1 style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: 'clamp(1.2rem, 4vw, 1.65rem)', margin: 0 }}>
                {pet.pet_name} {pet.emoji || '🐾'}
              </h1>
              <p style={{ color: '#000000ff', fontSize: '0.86rem', marginTop: 2 }}>
                {pet.pet_breed} · Managed by {pet.owner_name}
              </p>
              {!editing && (
                <div style={{ marginTop: 6 }}>
                  {[['📍', pet.location || 'India'], ['🪙', `${pet.paw_coins || 0} PawCoins`]].map(([ic, tx]) => (
                    <span key={tx} style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 800, margin: 2, background: '#F3F0FF', color: '#6C4BF6' }}>{ic} {tx}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="profile-stats">
              {[['Posts', posts.length], ['Reels', reels.length], ['PawCoins', pet.paw_coins || 0]].map(([l, v]) => (
                <div key={l} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, color: '#ff0000ff', fontSize: '1.2rem' }}>{v}</div>
                  <div style={{ fontSize: '0.7rem', color: '#000000ff' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Edit Form */}
          {editing && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, marginBottom: 12 }}>✏️ Edit Profile</div>
              <label className="label">Bio</label>
              <textarea className="input" value={form.bio || ''} onChange={e => setForm({ ...form, bio: e.target.value })}
                placeholder="Tell the world about your pet..." style={{ minHeight: 70, resize: 'none' }} />
              <label className="label">Location</label>
              <input className="input" value={form.location || ''} onChange={e => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Dehradun, Uttarakhand" />
              <label className="label">Breed</label>
              <input className="input" value={form.pet_breed || ''} onChange={e => setForm({ ...form, pet_breed: e.target.value })} />
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn-primary" onClick={saveProfile} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          )}

          {!editing && pet.bio && (
            <div className="card" style={{ marginBottom: 16 }}>
              <p style={{ lineHeight: 1.7, fontSize: '0.9rem', color: '#4B5563' }}>{pet.bio}</p>
            </div>
          )}

          {/* Tabs */}
          <div className="profile-tabs">
            {[['posts','📸 Posts'],['reels','🎬 Reels'],['friends','🐾 Friends'],['about','📋 About']].map(([t, lb]) => (
              <button key={t} onClick={() => setTab(t)}
                style={{
                  padding: '9px 16px', border: 'none', background: 'transparent',
                  cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700,
                  fontSize: '0.84rem', color: tab === t ? '#FF6B35' : '#6B7280',
                  borderBottom: tab === t ? '3px solid #FF6B35' : '3px solid transparent',
                  marginBottom: -2, whiteSpace: 'nowrap', flexShrink: 0
                }}>
                {lb}
              </button>
            ))}
          </div>

          {/* Posts Tab */}
          {tab === 'posts' && (
            <div className="profile-posts-grid">
              {posts.length === 0 && (
                <div className="card" style={{ textAlign: 'center', color: '#000000ff', padding: 30 }}>
                  No posts yet — go share something on the feed! 🐾
                </div>
              )}
              {posts.map(p => (
                <div key={p.id} className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', background: '#FFE8F0',
                      border: '2px solid #FF6B35', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '1.2rem', overflow: 'hidden'
                    }}>
                      {avatarPreview
                        ? <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : pet.emoji || '🐾'}
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 700 }}>{pet.pet_name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>{timeAgo(p.created_at)}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.9rem', lineHeight: 1.65 }}>{p.content}</p>

                  {/* Show post image if exists */}
                  {p.image_url && (
                    <div style={{ marginTop: 8, borderRadius: 12, overflow: 'hidden' }}>
                      <img src={p.image_url} alt="post"
                        style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 12 }} />
                    </div>
                  )}

                  <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#6B7280' }}>❤️ {p.likes || 0} paws</div>
                </div>
              ))}
            </div>
          )}

          {/* Reels Tab */}
          {tab === 'reels' && (
            <div className="profile-posts-grid">
              {reels.length === 0 && (
                <div className="card" style={{ textAlign: 'center', color: '#000000ff', padding: 30 }}>
                  No reels yet — upload your first video moment! 🎬
                </div>
              )}
              {reels.map(r => (
                <div key={r.id} className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', background: '#FFE8F0',
                      border: '2px solid #FF6B35', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '1.2rem', overflow: 'hidden'
                    }}>
                      {avatarPreview
                        ? <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : pet.emoji || '🐾'}
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 700 }}>{pet.pet_name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>{timeAgo(r.created_at)}</div>
                    </div>
                  </div>
                  {r.caption && <p style={{ fontSize: '0.9rem', lineHeight: 1.65, marginBottom: 8 }}>{r.caption}</p>}
                  
                  <div style={{ borderRadius: 12, overflow: 'hidden', background: '#111', display: 'flex', justifyContent: 'center' }}>
                    <video src={r.video_url} autoPlay muted loop playsInline controls style={{ width: '100%', maxHeight: 400, objectFit: 'contain' }} />
                  </div>

                  <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#6B7280' }}>❤️ {r.likes || 0} paws</div>
                </div>
              ))}
            </div>
          )}

          {/* Friends Tab */}
          {tab === 'friends' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1rem' }}>
                  🐾 Friends ({friends.length})
                </div>
                <button onClick={() => router.push('/friends')} style={{
                  background: 'linear-gradient(135deg,#FF6B35,#6C4BF6)', color: '#fff', border: 'none',
                  borderRadius: 10, padding: '7px 14px', fontFamily: 'Nunito, sans-serif',
                  fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer'
                }}>➕ Find Friends</button>
              </div>
              {friends.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 30 }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🐾</div>
                  <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1rem', color: '#1E1347', marginBottom: 6 }}>No friends yet</div>
                  <p style={{ color: '#6B7280', fontSize: '0.85rem', marginBottom: 14 }}>Start connecting with other pets!</p>
                  <button onClick={() => router.push('/friends')} style={{
                    background: 'linear-gradient(135deg,#FF6B35,#6C4BF6)', color: '#fff', border: 'none',
                    borderRadius: 10, padding: '9px 20px', fontFamily: 'Nunito, sans-serif',
                    fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer'
                  }}>💡 Find Friends</button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                  {friends.map(friend => (
                    <div key={friend.id}
                      onClick={() => router.push(`/user/${friend.user_id}`)}
                      style={{
                        background: '#fff', borderRadius: 14, padding: 14,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                        border: '1px solid #EDE8FF', cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(108,75,246,0.15)' }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)' }}
                    >
                      <div style={{
                        width: 56, height: 56, borderRadius: '50%', background: '#FFE8F0',
                        border: '3px solid #22C55E', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '1.5rem', overflow: 'hidden', marginBottom: 8
                      }}>
                        {friend.avatar_url
                          ? <img src={friend.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : friend.emoji || '🐾'}
                      </div>
                      <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '0.88rem', color: '#1E1347' }}>{friend.pet_name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 2 }}>{friend.pet_breed}</div>
                      <div style={{ fontSize: '0.68rem', color: '#9CA3AF', marginTop: 1 }}>by {friend.owner_name}</div>
                      <div style={{ marginTop: 8, fontSize: '0.7rem', color: '#6C4BF6', fontWeight: 700 }}>View Profile →</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* About Tab */}
          {tab === 'about' && (
            <div className="card">
              <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, marginBottom: 14 }}>
                📋 About {pet.pet_name}
              </div>
              <div className="profile-about-grid">
                {[
                  ['🐾 Name', pet.pet_name],
                  ['🐶 Type', pet.pet_type],
                  ['🧬 Breed', pet.pet_breed || '—'],
                  ['📍 Location', pet.location || 'India'],
                  ['🪙 PawCoins', `${pet.paw_coins || 0} coins`],
                  ['👤 Managed by', pet.owner_name]
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