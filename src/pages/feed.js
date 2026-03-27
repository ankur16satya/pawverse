import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'

export default function Feed() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [pet, setPet] = useState(null)
  const [posts, setPosts] = useState([])
  const [postText, setPostText] = useState('')
  const [posting, setPosting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [suggestions, setSuggestions] = useState([])

  useEffect(() => {
    init()
  }, [])

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    setUser(session.user)

    // Get current pet profile
    const { data: petData } = await supabase
      .from('pets').select('*').eq('user_id', session.user.id).single()
    setPet(petData)

    // Get posts with pet info
    const { data: postsData } = await supabase
      .from('posts')
      .select('*, pets(pet_name, emoji, pet_breed, owner_name)')
      .order('created_at', { ascending: false })
      .limit(20)
    setPosts(postsData || [])

    // Get other pets as suggestions
    const { data: others } = await supabase
      .from('pets').select('*')
      .neq('user_id', session.user.id).limit(5)
    setSuggestions(others || [])

    setLoading(false)
  }

  const handlePost = async () => {
    if (!postText.trim() || !pet) return
    setPosting(true)
    const { data, error } = await supabase.from('posts').insert({
      pet_id: pet.id,
      content: postText,
    }).select('*, pets(pet_name, emoji, pet_breed, owner_name)').single()

    if (!error && data) {
      setPosts([data, ...posts])
      setPostText('')
      // Award PawCoins for posting
      await supabase.from('pets').update({ paw_coins: (pet.paw_coins || 0) + 10 }).eq('id', pet.id)
      setPet(p => ({ ...p, paw_coins: (p.paw_coins || 0) + 10 }))
    }
    setPosting(false)
  }

  const toggleLike = async (post) => {
    const newLikes = (post.likes || 0) + (post.liked_by_me ? -1 : 1)
    await supabase.from('posts').update({ likes: newLikes }).eq('id', post.id)
    setPosts(posts.map(p => p.id === post.id ? { ...p, likes: newLikes, liked_by_me: !p.liked_by_me } : p))
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '2rem' }}>
      🐾
    </div>
  )

  return (
    <div style={{ background: '#FFFBF7', minHeight: '100vh' }}>
      <NavBar user={user} pet={pet} />

      <div style={{
        display: 'grid', gridTemplateColumns: '250px 1fr 250px', gap: 14,
        maxWidth: 1100, margin: '70px auto 0', padding: 14
      }}>
        {/* LEFT SIDEBAR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 70, alignSelf: 'start' }}>
          {/* My Pet Card */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ height: 60, background: 'linear-gradient(135deg, #FF6B35, #6C4BF6)' }} />
            <div style={{ padding: '0 14px 14px', textAlign: 'center' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', background: '#FFE8F0',
                border: '3px solid #fff', margin: '-26px auto 6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.7rem'
              }}>{pet?.emoji || '🐾'}</div>
              <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1rem' }}>{pet?.pet_name}</div>
              <div style={{ color: '#6B7280', fontSize: '0.74rem' }}>{pet?.pet_breed}</div>
              <div style={{ color: '#6B7280', fontSize: '0.72rem' }}>by {pet?.owner_name}</div>
              <div onClick={() => router.push('/coins')}
                style={{
                  marginTop: 10, background: 'linear-gradient(135deg, #FFFBE8, #FFE8CC)',
                  borderRadius: 10, padding: '7px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 6, cursor: 'pointer'
                }}>
                <span>🪙</span>
                <span style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, color: '#FF6B35', fontSize: '0.88rem' }}>
                  {pet?.paw_coins || 0} PawCoins
                </span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="card" style={{ padding: 12 }}>
            {[
              ['🛍️', 'Marketplace', '/marketplace'],
              ['🩺', 'Health Records', '/health'],
              ['💬', 'Messages', '/chat'],
              ['🏠', 'Adopt a Pet', '/adopt'],
              ['🪙', 'PawCoins', '/coins'],
            ].map(([ic, lb, href]) => (
              <div key={href} onClick={() => router.push(href)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px',
                  borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.86rem',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F3F0FF'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontSize: '1.1rem' }}>{ic}</span> {lb}
              </div>
            ))}
          </div>
        </div>

        {/* FEED */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Composer */}
          <div className="card">
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', background: '#FFE8F0',
                border: '2px solid #FF6B35', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0
              }}>{pet?.emoji || '🐾'}</div>
              <textarea
                value={postText}
                onChange={e => setPostText(e.target.value)}
                placeholder={`What's ${pet?.pet_name || 'your pet'} up to today? 🐾`}
                style={{
                  flex: 1, background: '#F3F0FF', border: 'none', borderRadius: 16,
                  padding: '10px 14px', fontFamily: 'Nunito, sans-serif', fontSize: '0.9rem',
                  color: '#1E1347', outline: 'none', resize: 'none', minHeight: 70
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {['📸 Photo', '📍 Location', '😊 Feeling'].map(x => (
                  <button key={x} style={{
                    padding: '5px 10px', border: 'none', background: '#F3F0FF', borderRadius: 8,
                    cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700,
                    fontSize: '0.75rem', color: '#6C4BF6'
                  }}>{x}</button>
                ))}
              </div>
              <button onClick={handlePost} disabled={posting || !postText.trim()} className="btn-primary"
                style={{ padding: '7px 18px', fontSize: '0.85rem', opacity: posting || !postText.trim() ? 0.5 : 1 }}>
                {posting ? 'Posting...' : 'Post 🐾'}
              </button>
            </div>
          </div>

          {/* Posts */}
          {posts.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>
              <div style={{ fontSize: '3rem', marginBottom: 10 }}>🐾</div>
              <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.1rem' }}>No posts yet!</div>
              <div style={{ fontSize: '0.88rem', marginTop: 4 }}>Be the first to share your pet's story ❤️</div>
            </div>
          )}

          {posts.map(post => (
            <div key={post.id} className="card fade-up">
              {/* Post Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', background: '#FFE8F0',
                  border: '2px solid #FF6B35', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0
                }}>{post.pets?.emoji || '🐾'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 700, fontSize: '0.95rem' }}>
                    {post.pets?.pet_name || 'A Pet'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                    Managed by {post.pets?.owner_name} · {timeAgo(post.created_at)}
                  </div>
                </div>
                <span style={{ color: '#6B7280', fontSize: '1.1rem', cursor: 'pointer' }}>···</span>
              </div>

              {/* Content */}
              <p style={{ lineHeight: 1.65, fontSize: '0.9rem', marginBottom: 10 }}>{post.content}</p>

              {/* Stats */}
              <div style={{ fontSize: '0.78rem', color: '#6B7280', display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                <span>❤️ {post.likes || 0} paws</span>
                <span>{post.comments_count || 0} comments</span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 3, paddingTop: 8, borderTop: '1px solid #EDE8FF' }}>
                {[
                  { label: post.liked_by_me ? '❤️ Pawed' : '🐾 Paw it', action: () => toggleLike(post), active: post.liked_by_me },
                  { label: '💬 Comment', action: () => {} },
                  { label: '🔗 Share', action: () => {} },
                ].map(btn => (
                  <button key={btn.label} onClick={btn.action}
                    style={{
                      flex: 1, padding: '8px 4px', border: 'none', background: 'transparent',
                      borderRadius: 9, cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
                      fontSize: '0.8rem', fontWeight: 700,
                      color: btn.active ? '#FF6B9D' : '#6B7280',
                      transition: 'background 0.2s, color 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F3F0FF'; e.currentTarget.style.color = '#6C4BF6' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = btn.active ? '#FF6B9D' : '#6B7280' }}
                  >{btn.label}</button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT SIDEBAR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 70, alignSelf: 'start' }}>
          <div className="card">
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '0.95rem', marginBottom: 11 }}>
              🐾 Pets You May Know
            </div>
            {suggestions.length === 0 && (
              <p style={{ fontSize: '0.8rem', color: '#6B7280' }}>Invite friends to join PawVerse!</p>
            )}
            {suggestions.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', borderBottom: '1px solid #F9F5FF' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', background: '#F3F0FF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem',
                  border: '2px solid #EDE8FF'
                }}>{s.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.86rem' }}>{s.pet_name}</div>
                  <div style={{ fontSize: '0.7rem', color: '#6B7280' }}>{s.pet_breed}</div>
                </div>
                <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: 8 }}>+ Add</button>
              </div>
            ))}
          </div>

          <div className="card" style={{ background: 'linear-gradient(135deg, #FFF0E8, #F0EBFF)', border: 'none' }}>
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '0.9rem', marginBottom: 8 }}>🔥 Trending Tags</div>
            {['#PawParents', '#CatsOfPawVerse', '#DogsRule', '#BunnyLife', '#AdoptDontShop'].map((t, i) => (
              <span key={t} style={{
                display: 'inline-block', padding: '3px 9px', borderRadius: 20,
                fontSize: '0.72rem', fontWeight: 800, margin: 2, cursor: 'pointer',
                background: ['#FFE8CC','#E8F8E8','#F0EBFF','#FFE8F0','#E8F4FF'][i]
              }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
