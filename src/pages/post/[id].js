import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import NavBar from '../../components/NavBar'
import SEO from '../../components/SEO'
  const router = useRouter()
  const { id } = router.query
  const [user, setUser] = useState(null)
  const [pet, setPet] = useState(null)
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [likedByMe, setLikedByMe] = useState(false)

  useEffect(() => {
    if (!id) return
    init()
  }, [id])

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      setUser(session.user)
      const { data: petData } = await supabase.from('pets').select('*').eq('user_id', session.user.id).eq('is_health_pet', false).maybeSingle()
      if (petData) {
        setPet(petData)
      }
    }

    let { data: postData, error } = await supabase
      .from('posts')
      .select('*, pets(pet_name, emoji, owner_name, avatar_url, user_id, pet_breed)')
      .eq('id', id)
      .single()

    let isReel = false;
    if (error || !postData) {
      const { data: reelData, error: reelErr } = await supabase
        .from('reels')
        .select('*, pets(pet_name, emoji, owner_name, avatar_url, user_id)')
        .eq('id', id)
        .single()
      if (reelErr || !reelData) { setNotFound(true); setLoading(false); return }
      postData = reelData;
      isReel = true;
    }
    setPost({ ...postData, is_reel: isReel })

    // fetch comments
    const { data: commentsData } = await supabase
      .from('comments')
      .select('*, pets(pet_name, emoji, avatar_url)')
      .eq('post_id', id)
      .is('parent_id', null)
      .order('created_at', { ascending: true })
    setComments(commentsData || [])

    // increment views
    const tableName = isReel ? 'reels' : 'posts';
    await supabase.from(tableName).update({ views: (postData.views || 0) + 1 }).eq('id', id)

    // load liked state
    if (session) {
      const saved = JSON.parse(localStorage.getItem(`pawverse_likes_${session.user.id}`) || '{}')
      setLikedByMe(!!saved[id])
    }

    setLoading(false)
  }

  const handleLike = async () => {
    if (!user || !post) return
    let currentPet = pet
    if (!currentPet) {
      const { data: pD } = await supabase.from('pets').select('*').eq('user_id', user.id).eq('is_health_pet', false).maybeSingle()
      if (pD) {
        currentPet = pD
        setPet(pD)
      } else {
        alert("Please make sure you have a pet profile to Paw posts!")
        return
      }
    }

    const newLikedState = !likedByMe
    const newLikes = Math.max(0, (post.likes || 0) + (newLikedState ? 1 : -1))
    
    // update localStorage cache
    const saved = JSON.parse(localStorage.getItem(`pawverse_likes_${user.id}`) || '{}')
    saved[post.id] = newLikedState
    localStorage.setItem(`pawverse_likes_${user.id}`, JSON.stringify(saved))

    setLikedByMe(newLikedState)
    setPost(p => ({ ...p, likes: newLikes }))
    const tableName = post.is_reel ? 'reels' : 'posts';
    const { error } = await supabase.rpc('toggle_paw', {
      table_name: tableName,
      row_id: String(post.id),
      increment_by: newLikedState ? 1 : -1
    })

    if (error) {
        console.error("Like RPC error:", error)
        alert(`Could not save your Paw: ${error.message || 'Unknown error'}`)
        setLikedByMe(!newLikedState)
        setPost(p => ({ ...p, likes: post.likes }))
        saved[post.id] = !newLikedState
        localStorage.setItem(`pawverse_likes_${user.id}`, JSON.stringify(saved))
        return
    }

    if (newLikedState && post.pets?.user_id && post.pets.user_id !== user.id) {
        await supabase.from('notifications').insert({
            user_id: post.pets.user_id,
            type: 'like',
            message: `${currentPet.pet_name} pawed your post! ❤️|/post/${post.id}`
        })
    }
  }

  const handleComment = async () => {
    if (!commentText.trim() || !pet || !user) return
    const { data: newComment } = await supabase.from('comments').insert({
      post_id: post.id,
      pet_id: pet.id,
      user_id: user.id,
      content: commentText,
    }).select('*, pets(pet_name, emoji, avatar_url)').single()
    if (newComment) {
      setComments(prev => [...prev, newComment])
      setCommentText('')
      setPost(p => ({ ...p, comments_count: (p.comments_count || 0) + 1 }))
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

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '2.5rem', background: 'linear-gradient(135deg, #FFF0E8, #F0EBFF)' }}>🐾</div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FFF0E8 0%, #F0EBFF 50%, #E8F8FF 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ fontSize: '4rem' }}>🐾</div>
      <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.5rem', color: '#1E1347' }}>Post not found</div>
      <div style={{ color: '#6B7280', fontSize: '0.9rem' }}>This post may have been deleted or doesn't exist.</div>
      <button onClick={() => router.push(user ? '/feed' : '/')}
        style={{ background: 'linear-gradient(135deg, #FF6B35, #6C4BF6)', color: '#fff', border: 'none', borderRadius: 30, padding: '10px 24px', fontFamily: 'Nunito, sans-serif', fontWeight: 800, cursor: 'pointer', fontSize: '0.95rem' }}>
        {user ? '← Back to Feed' : 'Join PawVerse 🐾'}
      </button>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, rgba(213,134,200,1), rgba(105,201,249,1))', paddingTop: 110 }}>
      {/* Issue 4.4: Per-post SEO for social sharing */}
      {post && (
        <SEO
          title={`${post.pets?.pet_name || 'Pet'}'s post on PawVerse`}
          description={post.caption ? post.caption.slice(0, 155) : `See ${post.pets?.pet_name || 'a pet'}'s post on PawVerse — India's pet social network.`}
          ogImage={post.media_url || post.image_url}
          ogType={post.is_reel ? 'video.other' : 'article'}
          canonical={`https://pawversesocial.com/post/${post.id}`}
        />
      )}
      {user && <NavBar user={user} pet={pet} />}

      {/* If not logged in, show a top banner */}
      {!user && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, background: 'linear-gradient(135deg, #FF6B35, #6C4BF6)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.4rem' }}>🐾</span>
            <span style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, color: '#fff', fontSize: '1.1rem' }}>PawVerse</span>
          </div>
          <button onClick={() => router.push('/')} style={{ background: '#fff', border: 'none', borderRadius: 20, padding: '6px 16px', fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: '#6C4BF6', cursor: 'pointer', fontSize: '0.85rem' }}>Join Free 🐾</button>
        </div>
      )}

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 16px 40px' }}>

        {/* Back button */}
        {user && (
          <button onClick={() => router.push('/feed')} style={{ background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: 20, padding: '7px 16px', fontFamily: 'Nunito, sans-serif', fontWeight: 700, color: '#6C4BF6', cursor: 'pointer', fontSize: '0.82rem', marginBottom: 14, backdropFilter: 'blur(8px)' }}>
            ← Back to Feed
          </button>
        )}

        {/* Post Card */}
        <div style={{ background: '#fff', borderRadius: 20, padding: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.1)', marginBottom: 16 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div
              onClick={() => user && post.pets?.user_id !== user.id && router.push(`/user/${post.pets?.user_id}`)}
              style={{ width: 48, height: 48, borderRadius: '50%', background: '#FFE8F0', border: '2.5px solid #FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', overflow: 'hidden', flexShrink: 0, cursor: user ? 'pointer' : 'default' }}>
              {post.pets?.avatar_url ? <img src={post.pets.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="av" /> : post.pets?.emoji}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1E1347' }}>{post.pets?.pet_name}</div>
              <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                by {post.pets?.owner_name} · {timeAgo(post.created_at)}
                {post.edited && <span style={{ marginLeft: 4, color: '#9CA3AF' }}>(edited)</span>}
              </div>
              {(post.location || post.feeling) && (
                <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                  {post.location && <span style={{ background: '#E8F5FF', color: '#0EA5E9', padding: '1px 8px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700 }}>📍 {post.location}</span>}
                  {post.feeling && <span style={{ background: '#FFF0E8', color: '#FF6B35', padding: '1px 8px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700 }}>{post.feeling}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          {(post.content || post.caption) && (
            <p style={{ fontSize: '1rem', lineHeight: 1.7, color: '#1E1347', marginBottom: 12, whiteSpace: 'pre-wrap' }}>
              {(post.content || post.caption).split(/(\s+)/).map((word, i) => {
                if (word.startsWith('#')) return <span key={i} style={{ color: '#6C4BF6', fontWeight: 700 }}>{word}</span>
                if (/^https?:\/\/[^\s]+$/.test(word)) return <a key={i} href={word} target="_blank" rel="noopener noreferrer" style={{color:'#6C4BF6',fontWeight:700,wordBreak:'break-all',textDecoration:'underline'}}>{word}</a>
                return word
              })}
            </p>
          )}

          {/* Media */}
          {post.image_url && !post.is_reel && (
            <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
              <img src={post.image_url} alt="post" style={{ width: '100%', height: 'auto', maxHeight: 500, objectFit: 'contain', display: 'block' }} />
            </div>
          )}

          {post.video_url && post.is_reel && (
            <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 14, background: '#111', display: 'flex', justifyContent: 'center' }}>
              <video src={post.video_url} controls playsInline autoPlay loop style={{ width: '100%', maxHeight: 500, objectFit: 'contain' }} />
            </div>
          )}

          {/* Stats */}
          <div style={{ display: 'flex', gap: 16, paddingTop: 12, borderTop: '1px solid #F3F0FF', alignItems: 'center' }}>
            <button onClick={handleLike} style={{ background: 'none', border: 'none', cursor: user ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', fontWeight: 700, color: likedByMe ? '#FF4757' : '#6B7280', fontFamily: 'Nunito, sans-serif' }}>
              {likedByMe ? '❤️' : '🤍'} {post.likes || 0}
            </button>
            <span style={{ fontSize: '0.88rem', color: '#6B7280', fontWeight: 700 }}>💬 {post.comments_count || 0}</span>
            <span style={{ fontSize: '0.88rem', color: '#6B7280', fontWeight: 700 }}>🔗 {post.shares_count || 0}</span>
            <div style={{ flex: 1 }} />
            <button onClick={() => { const url = window.location.href; navigator.clipboard.writeText(url).then(() => alert('✅ Link copied!')) }}
              style={{ background: '#F0EBFF', border: 'none', borderRadius: 20, padding: '5px 14px', fontSize: '0.78rem', fontWeight: 800, color: '#6C4BF6', cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}>🔗 Copy Link</button>
          </div>
        </div>

        {/* Comments */}
        <div style={{ background: '#fff', borderRadius: 20, padding: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1rem', marginBottom: 14, color: '#1E1347' }}>💬 Comments ({post.comments_count || 0})</div>

          {comments.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#9CA3AF', fontSize: '0.85rem' }}>No comments yet. Be the first! 🐾</div>
          )}

          {comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 12, padding: '10px', background: '#F9F5FF', borderRadius: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#FFE8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0, overflow: 'hidden' }}>
                {c.pets?.avatar_url ? <img src={c.pets.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="av" /> : c.pets?.emoji}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#6C4BF6' }}>{c.pets?.pet_name}</div>
                <div style={{ fontSize: '0.85rem', color: '#1E1347', lineHeight: 1.5 }}>{c.content}</div>
                <div style={{ fontSize: '0.68rem', color: '#9CA3AF', marginTop: 2 }}>{timeAgo(c.created_at)}</div>
              </div>
            </div>
          ))}

          {/* Add comment — only if logged in */}
          {user ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && e.ctrlKey && handleComment()}
                placeholder="Write a comment..."
                style={{ flex: 1, padding: '9px 14px', borderRadius: 20, border: '1.5px solid #EDE8FF', fontFamily: 'Nunito, sans-serif', fontSize: '0.85rem', outline: 'none' }}
              />
              <button onClick={handleComment} style={{ background: 'linear-gradient(135deg, #FF6B35, #6C4BF6)', color: '#fff', border: 'none', borderRadius: 20, padding: '0 18px', fontFamily: 'Nunito, sans-serif', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}>Post</button>
            </div>
          ) : (
            <div style={{ marginTop: 12, textAlign: 'center', padding: '14px', background: '#F9F5FF', borderRadius: 14 }}>
              <span style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                <span onClick={() => router.push('/')} style={{ color: '#6C4BF6', fontWeight: 800, cursor: 'pointer' }}>Sign in to PawVerse</span> to like and comment 🐾
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}