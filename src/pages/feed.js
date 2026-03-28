import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'

const EMOJIS = ['😀','😂','🥰','😍','🤩','😎','🥳','😢','😤','🤔','🤗','😜','🥺','❤️','🔥','✨','🎉','👍','👎','🐾','🐶','🐱','🌸','🌈']

export default function Feed() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [pet, setPet] = useState(null)
  const [posts, setPosts] = useState([])
  const [postText, setPostText] = useState('')
  const [posting, setPosting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [suggestions, setSuggestions] = useState([])
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [friendStatuses, setFriendStatuses] = useState({})
  const [lightboxImg, setLightboxImg] = useState(null)
  const [activeComments, setActiveComments] = useState({})
  const [commentTexts, setCommentTexts] = useState({})
  const [replyTo, setReplyTo] = useState({})
  const [openMenu, setOpenMenu] = useState(null)
  const [editingPost, setEditingPost] = useState(null)
  const [editText, setEditText] = useState('')
  const fileInputRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => { init() }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const playSound = (type) => {
    try {
      const src = type === 'message' ? '/message.mp3' : '/notification.mp3'
      const audio = new Audio(src)
      audio.volume = 0.5
      audio.play().catch(() => {})
    } catch (e) {}
  }

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    setUser(session.user)

    const { data: petData } = await supabase
      .from('pets').select('*').eq('user_id', session.user.id).single()
    setPet(petData)

    await fetchPosts()

    const { data: others } = await supabase
      .from('pets').select('*')
      .neq('user_id', session.user.id).limit(6)
    setSuggestions(others || [])

    const { data: sentRequests } = await supabase
      .from('friend_requests').select('*').eq('sender_id', session.user.id)
    const { data: receivedRequests } = await supabase
      .from('friend_requests').select('*').eq('receiver_id', session.user.id)
    const statuses = {}
    ;(sentRequests || []).forEach(r => { statuses[r.receiver_id] = r.status })
    ;(receivedRequests || []).forEach(r => { statuses[r.sender_id] = r.status })
    setFriendStatuses(statuses)
// Real-time listener for post likes/updates
const postsChannel = supabase
  .channel(`feed-posts-${session.user.id}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'posts',
  }, (payload) => {
    const updated = payload.new
    setPosts(prev => prev.map(p =>
      p.id === updated.id
        ? { ...p, likes: updated.likes, comments_count: updated.comments_count, shares_count: updated.shares_count }
        : p
    ))
  })
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'posts',
  }, (payload) => {
    // New post from someone else appears in real-time
    const newPost = payload.new
    if (newPost.pet_id !== petData?.id) {
      fetchPosts()
    }
  })
  .subscribe()
    setLoading(false)
  }

  const fetchPosts = async () => {
    const { data: postsData } = await supabase
      .from('posts')
      .select('*, pets(pet_name, emoji, pet_breed, owner_name, avatar_url, user_id)')
      .eq('hidden', false)
      .order('created_at', { ascending: false })
      .limit(20)
    setPosts(postsData || [])
  }

  const fetchComments = async (postId) => {
    const { data } = await supabase
      .from('comments')
      .select('*, pets(pet_name, emoji, avatar_url, user_id)')
      .eq('post_id', postId)
      .is('parent_id', null)
      .order('created_at', { ascending: true })

    const withReplies = await Promise.all((data || []).map(async (comment) => {
      const { data: replies } = await supabase
        .from('comments')
        .select('*, pets(pet_name, emoji, avatar_url, user_id)')
        .eq('parent_id', comment.id)
        .order('created_at', { ascending: true })
      return { ...comment, replies: replies || [] }
    }))

    setActiveComments(prev => ({ ...prev, [postId]: withReplies }))
  }

  const toggleComments = async (postId) => {
    if (activeComments[postId] !== undefined) {
      setActiveComments(prev => {
        const next = { ...prev }
        delete next[postId]
        return next
      })
    } else {
      await fetchComments(postId)
    }
  }

  const handleComment = async (postId, parentId = null) => {
    const key = parentId || postId
    const text = commentTexts[key]?.trim()
    if (!text || !pet) return

    const { data: newComment, error } = await supabase.from('comments').insert({
      post_id: postId,
      pet_id: pet.id,
      user_id: user.id,
      content: text,
      parent_id: parentId || null,
    }).select('*, pets(pet_name, emoji, avatar_url, user_id)').single()

    if (error || !newComment) return

    setCommentTexts(prev => ({ ...prev, [key]: '' }))
    setReplyTo(prev => ({ ...prev, [postId]: null }))

    // Update comments in UI
    if (parentId) {
      setActiveComments(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).map(c =>
          c.id === parentId
            ? { ...c, replies: [...(c.replies || []), { ...newComment, replies: [] }] }
            : c
        )
      }))
    } else {
      setActiveComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), { ...newComment, replies: [] }]
      }))
    }

    // Update comments count
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p
    ))

    // Notify post owner
    const post = posts.find(p => p.id === postId)
    if (post?.pets?.user_id && post.pets.user_id !== user.id) {
      await supabase.from('notifications').insert({
        user_id: post.pets.user_id,
        type: 'comment',
        message: `${pet.pet_name} commented on your post: "${text.slice(0, 40)}${text.length > 40 ? '...' : ''}" 💬`,
      })
      playSound('notification')
    }
  }

  const handleDeleteComment = async (comment, postId) => {
    await supabase.from('comments').delete().eq('id', comment.id)
    setActiveComments(prev => ({
      ...prev,
      [postId]: (prev[postId] || []).filter(c => c.id !== comment.id)
    }))
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, comments_count: Math.max((p.comments_count || 1) - 1, 0) } : p
    ))
  }

  const handleLikeComment = async (comment, postId) => {
    const newLikes = (comment.likes || 0) + (comment.likedByMe ? -1 : 1)
    await supabase.from('comments').update({ likes: newLikes }).eq('id', comment.id)
    setActiveComments(prev => ({
      ...prev,
      [postId]: (prev[postId] || []).map(c =>
        c.id === comment.id
          ? { ...c, likes: newLikes, likedByMe: !c.likedByMe }
          : c
      )
    }))
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return }
    setSelectedImage(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const removeImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const uploadImage = async (file, userId) => {
    const ext = file.name.split('.').pop()
    const fileName = `${userId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('post-images').upload(fileName, file, { cacheControl: '3600', upsert: false })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(fileName)
    return publicUrl
  }

  const handlePost = async () => {
    if (!postText.trim() && !selectedImage) return
    if (!pet) return
    setPosting(true)
    try {
      let imageUrl = null
      if (selectedImage) {
        setUploadingImage(true)
        imageUrl = await uploadImage(selectedImage, user.id)
        setUploadingImage(false)
      }

      const { data, error } = await supabase.from('posts').insert({
        pet_id: pet.id,
        content: postText,
        image_url: imageUrl,
        hidden: false,
        edited: false,
      }).select('*, pets(pet_name, emoji, pet_breed, owner_name, avatar_url, user_id)').single()

      if (!error && data) {
        setPosts([data, ...posts])
        setPostText('')
        removeImage()
        await supabase.from('pets')
          .update({ paw_coins: (pet.paw_coins || 0) + 10 }).eq('id', pet.id)
        setPet(p => ({ ...p, paw_coins: (p.paw_coins || 0) + 10 }))

        // Notify all friends about new post
        const { data: friendsSent } = await supabase
          .from('friend_requests').select('receiver_id')
          .eq('sender_id', user.id).eq('status', 'accepted')
        const { data: friendsReceived } = await supabase
          .from('friend_requests').select('sender_id')
          .eq('receiver_id', user.id).eq('status', 'accepted')

        const friendIds = [
          ...(friendsSent || []).map(f => f.receiver_id),
          ...(friendsReceived || []).map(f => f.sender_id)
        ]

        for (const friendId of friendIds) {
          await supabase.from('notifications').insert({
            user_id: friendId,
            type: 'post',
            message: `${pet.pet_name} just posted something new! 🐾`,
          })
        }
        playSound('notification')
      }
    } catch (err) {
      alert('Failed to post. Please try again.')
    }
    setPosting(false)
  }

  const toggleLike = async (post) => {
  // Optimistic update first
  const newLikes = (post.likes || 0) + (post.liked_by_me ? -1 : 1)
  setPosts(prev => prev.map(p =>
    p.id === post.id
      ? { ...p, likes: newLikes, liked_by_me: !p.liked_by_me }
      : p
  ))

  // Update in database
  const { error } = await supabase
    .from('posts')
    .update({ likes: newLikes })
    .eq('id', post.id)

  if (error) {
    // Revert if failed
    console.error('Like error:', error)
    setPosts(prev => prev.map(p =>
      p.id === post.id
        ? { ...p, likes: post.likes, liked_by_me: post.liked_by_me }
        : p
    ))
    return
  }

  // Send notification to post owner
  if (!post.liked_by_me && post.pets?.user_id && post.pets.user_id !== user.id) {
    await supabase.from('notifications').insert({
      user_id: post.pets.user_id,
      type: 'like',
      message: `${pet.pet_name} pawed your post! ❤️`,
    })
  }
}

  const handleShare = (post) => {
    const url = `${window.location.origin}/post/${post.id}`
    navigator.clipboard.writeText(url).then(() => {
      alert('Post link copied to clipboard! 🔗')
    }).catch(() => {
      alert(`Share this link: ${url}`)
    })
    // Update share count
    supabase.from('posts')
      .update({ shares_count: (post.shares_count || 0) + 1 })
      .eq('id', post.id)
    setPosts(prev => prev.map(p =>
      p.id === post.id ? { ...p, shares_count: (p.shares_count || 0) + 1 } : p
    ))
  }

  const handleEditPost = async (post) => {
    if (!editText.trim()) return
    await supabase.from('posts').update({ content: editText, edited: true }).eq('id', post.id)
    setPosts(prev => prev.map(p =>
      p.id === post.id ? { ...p, content: editText, edited: true } : p
    ))
    setEditingPost(null)
    setEditText('')
    setOpenMenu(null)
  }

  const handleDeletePost = async (post) => {
    if (!confirm('Delete this post?')) return
    await supabase.from('posts').delete().eq('id', post.id)
    setPosts(prev => prev.filter(p => p.id !== post.id))
    setOpenMenu(null)
  }

  const handleHidePost = async (post) => {
    await supabase.from('posts').update({ hidden: true }).eq('id', post.id)
    setPosts(prev => prev.filter(p => p.id !== post.id))
    setOpenMenu(null)
  }

  const handleAddFriend = async (otherPet) => {
    if (!user || !pet) return
    if (friendStatuses[otherPet.user_id]) return
    setFriendStatuses(prev => ({ ...prev, [otherPet.user_id]: 'pending' }))
    const { error } = await supabase.from('friend_requests').insert({
      sender_id: user.id, receiver_id: otherPet.user_id, status: 'pending'
    })
    if (error) { setFriendStatuses(prev => ({ ...prev, [otherPet.user_id]: null })); return }
    await supabase.from('notifications').insert({
      user_id: otherPet.user_id, type: 'friend_request',
      message: `${pet.pet_name} sent you a friend request! 🐾`,
    })
  }

  const getFriendButtonLabel = (userId) => {
    const status = friendStatuses[userId]
    if (status === 'pending') return 'Request Sent 🐾'
    if (status === 'accepted') return 'Friends ✅'
    if (status === 'declined') return 'Declined'
    return '+ Add'
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '2rem' }}>🐾</div>
  )

  return (
    <div style={{ background: '#FFFBF7', minHeight: '100vh' }}>
      <NavBar user={user} pet={pet} />

      {/* 🖼️ LIGHTBOX */}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20, cursor: 'zoom-out'
          }}>
          <button
            onClick={() => setLightboxImg(null)}
            style={{
              position: 'absolute', top: 18, right: 22, background: 'rgba(255,255,255,0.15)',
              border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer',
              borderRadius: '50%', width: 40, height: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>✕</button>
          <img
            src={lightboxImg}
            alt="full view"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '90vw', maxHeight: '88vh',
              borderRadius: 16, objectFit: 'contain',
              boxShadow: '0 8px 60px rgba(0,0,0,0.6)'
            }}
          />
        </div>
      )}

      <div style={{
        display: 'grid', gridTemplateColumns: '250px 1fr 250px', gap: 14,
        maxWidth: 1100, margin: '70px auto 0', padding: 14
      }}>
        {/* LEFT SIDEBAR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 70, alignSelf: 'start' }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ height: 60, background: 'linear-gradient(135deg, #FF6B35, #6C4BF6)' }} />
            <div style={{ padding: '0 14px 14px', textAlign: 'center' }}>
              <div
                onClick={() => router.push('/profile')}
                style={{
                  width: 52, height: 52, borderRadius: '50%', background: '#FFE8F0',
                  border: '3px solid #fff', margin: '-26px auto 6px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.7rem', overflow: 'hidden', cursor: 'pointer'
                }}>
                {pet?.avatar_url
                  ? <img src={pet.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : pet?.emoji || '🐾'}
              </div>
              <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1rem' }}>{pet?.pet_name}</div>
              <div style={{ color: '#6B7280', fontSize: '0.74rem' }}>{pet?.pet_breed}</div>
              <div style={{ color: '#6B7280', fontSize: '0.72rem' }}>by {pet?.owner_name}</div>
              <div onClick={() => router.push('/coins')}
                style={{ marginTop: 10, background: 'linear-gradient(135deg, #FFFBE8, #FFE8CC)', borderRadius: 10, padding: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}>
                <span>🪙</span>
                <span style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, color: '#FF6B35', fontSize: '0.88rem' }}>
                  {pet?.paw_coins || 0} PawCoins
                </span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 12 }}>
            {[
              ['🛍️', 'Marketplace', '/marketplace'],
              ['🩺', 'Health Records', '/health'],
              ['💬', 'Messages', '/chat'],
              ['🏠', 'Adopt a Pet', '/adopt'],
              ['🪙', 'PawCoins', '/coins'],
              ['👫', 'Friends', '/friends'],
            ].map(([ic, lb, href]) => (
              <div key={href} onClick={() => router.push(href)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.86rem', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F3F0FF'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
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
                justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0, overflow: 'hidden'
              }}>
                {pet?.avatar_url
                  ? <img src={pet.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : pet?.emoji || '🐾'}
              </div>
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

            {imagePreview && (
              <div style={{ position: 'relative', marginTop: 10 }}>
                <img src={imagePreview} alt="preview"
                  style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 12, display: 'block' }} />
                <button onClick={removeImage} style={{
                  position: 'absolute', top: 8, right: 8, width: 28, height: 28,
                  borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff',
                  border: 'none', cursor: 'pointer', fontSize: '0.85rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800
                }}>✕</button>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
                <button onClick={() => fileInputRef.current?.click()} style={{
                  padding: '5px 10px', border: 'none',
                  background: selectedImage ? '#D4F0D4' : '#F3F0FF', borderRadius: 8,
                  cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700,
                  fontSize: '0.75rem', color: selectedImage ? '#22C55E' : '#6C4BF6'
                }}>📸 {selectedImage ? 'Photo Added ✓' : 'Photo'}</button>
                {['📍 Location', '😊 Feeling'].map(x => (
                  <button key={x} style={{
                    padding: '5px 10px', border: 'none', background: '#F3F0FF', borderRadius: 8,
                    cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700,
                    fontSize: '0.75rem', color: '#6C4BF6'
                  }}>{x}</button>
                ))}
              </div>
              <button onClick={handlePost} disabled={posting || (!postText.trim() && !selectedImage)}
                className="btn-primary"
                style={{ padding: '7px 18px', fontSize: '0.85rem', opacity: posting || (!postText.trim() && !selectedImage) ? 0.5 : 1 }}>
                {uploadingImage ? '📤 Uploading...' : posting ? 'Posting...' : 'Post 🐾'}
              </button>
            </div>
          </div>

          {posts.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>
              <div style={{ fontSize: '3rem', marginBottom: 10 }}>🐾</div>
              <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.1rem' }}>No posts yet!</div>
              <div style={{ fontSize: '0.88rem', marginTop: 4 }}>Be the first to share your pet's story ❤️</div>
            </div>
          )}

          {posts.map(post => {
            const isMyPost = post.pets?.user_id === user?.id
            const comments = activeComments[post.id]

            return (
              <div key={post.id} className="card fade-up">

                {/* Post Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11 }}>
                  <div
                    onClick={() => !isMyPost && router.push(`/user/${post.pets?.user_id}`)}
                    style={{
                      width: 44, height: 44, borderRadius: '50%', background: '#FFE8F0',
                      border: '2px solid #FF6B35', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0,
                      overflow: 'hidden', cursor: isMyPost ? 'default' : 'pointer'
                    }}>
                    {post.pets?.avatar_url
                      ? <img src={post.pets.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : post.pets?.emoji || '🐾'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      onClick={() => !isMyPost && router.push(`/user/${post.pets?.user_id}`)}
                      style={{
                        fontFamily: "'Baloo 2', cursive", fontWeight: 700, fontSize: '0.95rem',
                        cursor: isMyPost ? 'default' : 'pointer',
                        color: isMyPost ? '#1E1347' : '#6C4BF6'
                      }}>
                      {post.pets?.pet_name || 'A Pet'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                      Managed by {post.pets?.owner_name} · {timeAgo(post.created_at)}
                      {post.edited && <span style={{ marginLeft: 4, color: '#9CA3AF' }}>(edited)</span>}
                    </div>
                  </div>

                  {/* 3-dot menu — only for own posts */}
                  <div ref={openMenu === post.id ? menuRef : null} style={{ position: 'relative' }}>
                    <span
                      onClick={() => setOpenMenu(openMenu === post.id ? null : post.id)}
                      style={{ color: '#6B7280', fontSize: '1.2rem', cursor: 'pointer', padding: '4px 8px', borderRadius: 8, userSelect: 'none' }}>
                      ···
                    </span>
                    {openMenu === post.id && (
                      <div style={{
                        position: 'absolute', top: 28, right: 0, background: '#fff',
                        borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
                        border: '1px solid #EDE8FF', zIndex: 100, minWidth: 160, overflow: 'hidden'
                      }}>
                        {isMyPost ? (
                          <>
                            <div onClick={() => { setEditingPost(post.id); setEditText(post.content); setOpenMenu(null) }}
                              style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
                              onMouseEnter={e => e.currentTarget.style.background = '#F3F0FF'}
                              onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                              ✏️ Edit Post
                            </div>
                            <div onClick={() => handleDeletePost(post)}
                              style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, color: '#FF4757', display: 'flex', alignItems: 'center', gap: 8 }}
                              onMouseEnter={e => e.currentTarget.style.background = '#FFF0F0'}
                              onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                              🗑️ Delete Post
                            </div>
                            <div onClick={() => handleShare(post)}
                              style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
                              onMouseEnter={e => e.currentTarget.style.background = '#F3F0FF'}
                              onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                              🔗 Share Post
                            </div>
                          </>
                        ) : (
                          <>
                            <div onClick={() => handleHidePost(post)}
                              style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
                              onMouseEnter={e => e.currentTarget.style.background = '#F3F0FF'}
                              onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                              🙈 Hide Post
                            </div>
                            <div onClick={() => handleShare(post)}
                              style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
                              onMouseEnter={e => e.currentTarget.style.background = '#F3F0FF'}
                              onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                              🔗 Share Post
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Edit Mode */}
                {editingPost === post.id ? (
                  <div style={{ marginBottom: 10 }}>
                    <textarea
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      style={{
                        width: '100%', background: '#F3F0FF', border: 'none', borderRadius: 12,
                        padding: '10px 14px', fontFamily: 'Nunito, sans-serif', fontSize: '0.9rem',
                        color: '#1E1347', outline: 'none', resize: 'none', minHeight: 70, boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button onClick={() => handleEditPost(post)} className="btn-primary"
                        style={{ padding: '6px 16px', fontSize: '0.82rem', borderRadius: 8 }}>
                        Save ✓
                      </button>
                      <button onClick={() => { setEditingPost(null); setEditText('') }} className="btn-secondary"
                        style={{ padding: '6px 16px', fontSize: '0.82rem', borderRadius: 8 }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  post.content && (
                    <p style={{ lineHeight: 1.65, fontSize: '0.9rem', marginBottom: 10 }}>{post.content}</p>
                  )
                )}

                {/* Post Image — fixed size + clickable */}
                {post.image_url && (
  <div
    onClick={() => setLightboxImg(post.image_url)}
    style={{
      marginBottom: 10, borderRadius: 14, overflow: 'hidden',
      cursor: 'zoom-in', background: '#F3F0FF',
      maxHeight: 500, display: 'flex',
      alignItems: 'center', justifyContent: 'center'
    }}>
    <img
      src={post.image_url}
      alt="post"
      style={{
        width: '100%',
        height: 'auto',
        maxHeight: 500,
        objectFit: 'contain',
        display: 'block',
        borderRadius: 14,
        transition: 'transform 0.3s'
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.01)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    />
  </div>
)}

                {/* Stats */}
                <div style={{ fontSize: '0.78rem', color: '#6B7280', display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                  <span>❤️ {post.likes || 0} paws</span>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ cursor: 'pointer' }} onClick={() => toggleComments(post.id)}>
                      💬 {post.comments_count || 0} comments
                    </span>
                    <span>🔗 {post.shares_count || 0} shares</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 3, paddingTop: 8, borderTop: '1px solid #EDE8FF' }}>
                  {[
                    { label: post.liked_by_me ? '❤️ Pawed' : '🐾 Paw it', action: () => toggleLike(post), active: post.liked_by_me },
                    { label: '💬 Comment', action: () => toggleComments(post.id), active: comments !== undefined },
                    { label: '🔗 Share', action: () => handleShare(post), active: false },
                  ].map(btn => (
                    <button key={btn.label} onClick={btn.action}
                      style={{
                        flex: 1, padding: '8px 4px', border: 'none', background: btn.active ? '#F3F0FF' : 'transparent',
                        borderRadius: 9, cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
                        fontSize: '0.8rem', fontWeight: 700,
                        color: btn.active ? '#6C4BF6' : '#6B7280', transition: 'background 0.2s, color 0.2s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#F3F0FF'; e.currentTarget.style.color = '#6C4BF6' }}
                      onMouseLeave={e => { e.currentTarget.style.background = btn.active ? '#F3F0FF' : 'transparent'; e.currentTarget.style.color = btn.active ? '#6C4BF6' : '#6B7280' }}
                    >{btn.label}</button>
                  ))}
                </div>

                {/* Comments Section */}
                {comments !== undefined && (
                  <div style={{ marginTop: 12, borderTop: '1px solid #F3F0FF', paddingTop: 12 }}>

                    {/* Comment Input */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', background: '#FFE8F0',
                        border: '2px solid #FF6B35', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '1rem', overflow: 'hidden', flexShrink: 0
                      }}>
                        {pet?.avatar_url
                          ? <img src={pet.avatar_url} alt="me" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : pet?.emoji || '🐾'}
                      </div>
                      <div style={{ flex: 1, display: 'flex', gap: 6 }}>
                        <input
                          value={commentTexts[post.id] || ''}
                          onChange={e => setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') handleComment(post.id) }}
                          placeholder="Write a comment..."
                          style={{
                            flex: 1, background: '#F3F0FF', border: 'none', borderRadius: 20,
                            padding: '8px 14px', fontFamily: 'Nunito, sans-serif', fontSize: '0.82rem',
                            color: '#1E1347', outline: 'none'
                          }}
                        />
                        <button
                          onClick={() => handleComment(post.id)}
                          disabled={!commentTexts[post.id]?.trim()}
                          style={{
                            background: 'linear-gradient(135deg, #FF6B35, #6C4BF6)',
                            border: 'none', borderRadius: 20, padding: '6px 14px',
                            color: '#fff', fontFamily: 'Nunito, sans-serif',
                            fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                            opacity: !commentTexts[post.id]?.trim() ? 0.5 : 1
                          }}>
                          Send
                        </button>
                      </div>
                    </div>

                    {/* Comments List */}
                    {comments.length === 0 ? (
                      <p style={{ fontSize: '0.8rem', color: '#9CA3AF', textAlign: 'center', padding: '8px 0' }}>
                        No comments yet. Be the first! 🐾
                      </p>
                    ) : (
                      comments.map(comment => (
                        <div key={comment.id} style={{ marginBottom: 10 }}>
                          {/* Comment */}
                          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <div
                              onClick={() => comment.pets?.user_id !== user.id && router.push(`/user/${comment.pets?.user_id}`)}
                              style={{
                                width: 30, height: 30, borderRadius: '50%', background: '#F3F0FF',
                                border: '1.5px solid #EDE8FF', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontSize: '0.9rem', overflow: 'hidden',
                                flexShrink: 0, cursor: comment.pets?.user_id !== user.id ? 'pointer' : 'default'
                              }}>
                              {comment.pets?.avatar_url
                                ? <img src={comment.pets.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : comment.pets?.emoji || '🐾'}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ background: '#F9F5FF', borderRadius: '0 14px 14px 14px', padding: '8px 12px' }}>
                                <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 700, fontSize: '0.8rem', color: '#1E1347', marginBottom: 2 }}>
                                  {comment.pets?.pet_name || 'A Pet'}
                                </div>
                                <p style={{ fontSize: '0.83rem', color: '#374151', margin: 0, lineHeight: 1.5 }}>
                                  {comment.content}
                                </p>
                              </div>
                              <div style={{ display: 'flex', gap: 12, marginTop: 4, paddingLeft: 4 }}>
                                <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{timeAgo(comment.created_at)}</span>
                                <button
                                  onClick={() => handleLikeComment(comment, post.id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: comment.likedByMe ? '#FF6B9D' : '#6B7280', fontWeight: 700, padding: 0 }}>
                                  {comment.likedByMe ? '❤️' : '🤍'} {comment.likes > 0 ? comment.likes : ''} Like
                                </button>
                                <button
                                  onClick={() => setReplyTo(prev => ({ ...prev, [post.id]: prev[post.id] === comment.id ? null : comment.id }))}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: '#6B7280', fontWeight: 700, padding: 0 }}>
                                  💬 Reply
                                </button>
                                {comment.user_id === user.id && (
                                  <button
                                    onClick={() => handleDeleteComment(comment, post.id)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: '#FF4757', fontWeight: 700, padding: 0 }}>
                                    🗑️ Delete
                                  </button>
                                )}
                              </div>

                              {/* Reply Input */}
                              {replyTo[post.id] === comment.id && (
                                <div style={{ display: 'flex', gap: 6, marginTop: 8, paddingLeft: 4 }}>
                                  <input
                                    value={commentTexts[comment.id] || ''}
                                    onChange={e => setCommentTexts(prev => ({ ...prev, [comment.id]: e.target.value }))}
                                    onKeyDown={e => { if (e.key === 'Enter') handleComment(post.id, comment.id) }}
                                    placeholder={`Reply to ${comment.pets?.pet_name}...`}
                                    style={{
                                      flex: 1, background: '#F3F0FF', border: 'none', borderRadius: 20,
                                      padding: '6px 12px', fontFamily: 'Nunito, sans-serif',
                                      fontSize: '0.78rem', color: '#1E1347', outline: 'none'
                                    }}
                                  />
                                  <button
                                    onClick={() => handleComment(post.id, comment.id)}
                                    disabled={!commentTexts[comment.id]?.trim()}
                                    style={{
                                      background: 'linear-gradient(135deg, #FF6B35, #6C4BF6)',
                                      border: 'none', borderRadius: 20, padding: '5px 12px',
                                      color: '#fff', fontFamily: 'Nunito, sans-serif',
                                      fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
                                      opacity: !commentTexts[comment.id]?.trim() ? 0.5 : 1
                                    }}>
                                    Reply
                                  </button>
                                </div>
                              )}

                              {/* Replies */}
                              {comment.replies?.length > 0 && (
                                <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: '2px solid #EDE8FF' }}>
                                  {comment.replies.map(reply => (
                                    <div key={reply.id} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'flex-start' }}>
                                      <div style={{
                                        width: 24, height: 24, borderRadius: '50%', background: '#F3F0FF',
                                        border: '1px solid #EDE8FF', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', fontSize: '0.75rem', overflow: 'hidden', flexShrink: 0
                                      }}>
                                        {reply.pets?.avatar_url
                                          ? <img src={reply.pets.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                          : reply.pets?.emoji || '🐾'}
                                      </div>
                                      <div style={{ background: '#F3F0FF', borderRadius: '0 12px 12px 12px', padding: '6px 10px', flex: 1 }}>
                                        <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 700, fontSize: '0.75rem', color: '#1E1347' }}>
                                          {reply.pets?.pet_name}
                                        </div>
                                        <p style={{ fontSize: '0.78rem', color: '#374151', margin: 0 }}>{reply.content}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
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
                <div
                  onClick={() => s.user_id !== user.id && router.push(`/user/${s.user_id}`)}
                  style={{
                    width: 40, height: 40, borderRadius: '50%', background: '#F3F0FF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.25rem', border: '2px solid #EDE8FF', overflow: 'hidden',
                    cursor: 'pointer'
                  }}>
                  {s.avatar_url
                    ? <img src={s.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : s.emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    onClick={() => s.user_id !== user.id && router.push(`/user/${s.user_id}`)}
                    style={{ fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer', color: '#6C4BF6' }}>
                    {s.pet_name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#6B7280' }}>{s.pet_breed}</div>
                </div>
                <button
                  onClick={() => handleAddFriend(s)}
                  disabled={!!friendStatuses[s.user_id]}
                  className={!friendStatuses[s.user_id] ? 'btn-secondary' : ''}
                  style={{
                    padding: '4px 10px', fontSize: '0.72rem', borderRadius: 8,
                    cursor: friendStatuses[s.user_id] ? 'default' : 'pointer',
                    fontFamily: 'Nunito, sans-serif', fontWeight: 700, border: 'none',
                    background: friendStatuses[s.user_id] ? '#F3F0FF' : '',
                    color: friendStatuses[s.user_id] ? '#6C4BF6' : ''
                  }}>
                  {getFriendButtonLabel(s.user_id)}
                </button>
              </div>
            ))}
          </div>

          <div className="card" style={{ background: 'linear-gradient(135deg, #FFF0E8, #F0EBFF)', border: 'none' }}>
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '0.9rem', marginBottom: 8 }}>🔥 Trending Tags</div>
            {['#PawParents', '#CatsOfPawVerse', '#DogsRule', '#BunnyLife', '#AdoptDontShop'].map((t, i) => (
              <span key={t} style={{
                display: 'inline-block', padding: '3px 9px', borderRadius: 20,
                fontSize: '0.72rem', fontWeight: 800, margin: 2, cursor: 'pointer',
                background: ['#FFE8CC', '#E8F8E8', '#F0EBFF', '#FFE8F0', '#E8F4FF'][i]
              }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}