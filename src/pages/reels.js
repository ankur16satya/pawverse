import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'

export default function Reels() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [pet, setPet] = useState(null)
  const [reels, setReels] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [caption, setCaption] = useState('')
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [videoPreview, setVideoPreview] = useState(null)
  const [activeReel, setActiveReel] = useState(0)
  const [shareModal, setShareModal] = useState(null)
  const [shareToFriendsModal, setShareToFriendsModal] = useState(null)
  const [friends, setFriends] = useState([])
  const [commentsModal, setCommentsModal] = useState(null)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [mutedMap, setMutedMap] = useState({})
  const [likedMap, setLikedMap] = useState({})

  const fetchComments = async (reelId) => {
    const { data } = await supabase
      .from('comments')
      .select('*, pets(pet_name, emoji, avatar_url, user_id)')
      .eq('post_id', reelId)
      .order('created_at', { ascending: true })
    setComments(data || [])
  }

  const openComments = (reel) => {
    setCommentsModal(reel)
    fetchComments(reel.id)
  }

  const handlePostComment = async () => {
    if (!commentText.trim() || !commentsModal) return
    setSendingComment(true)
    const { data, error } = await supabase.from('comments').insert({
      post_id: commentsModal.id,
      user_id: user.id,
      pet_id: pet.id,
      content: commentText.trim()
    }).select('*, pets(pet_name, emoji, avatar_url, user_id)').single()
    
    if (error) {
      console.error(error)
      alert("Could not post comment: " + error.message)
    }

    if (data) {
      setComments(prev => [...prev, data])
      setCommentText('')
      setReels(prev => prev.map(r => r.id === commentsModal.id ? { ...r, comments_count: (r.comments_count || 0) + 1 } : r))
    }
    setSendingComment(false)
  }
  const videoRefs = useRef({})
  const fileInputRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => { init() }, [])

  useEffect(() => {
    // Auto-play reel in view, pause others
    Object.entries(videoRefs.current).forEach(([idx, vid]) => {
      if (!vid) return
      if (parseInt(idx) === activeReel) {
        vid.play().catch(() => {})
      } else {
        vid.pause()
      }
    })
  }, [activeReel, reels])

  const init = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) console.error("Session error:", sessionError)
      if (!session) { router.push('/'); return }
      setUser(session.user)
      
      const saved = localStorage.getItem(`pawverse_liked_reels_${session.user.id}`)
      if (saved) {
        try { setLikedMap(JSON.parse(saved)) } catch(err){}
      }
      
      const { data: petData, error: petError } = await supabase.from('pets').select('*').eq('user_id', session.user.id).eq('is_health_pet', false).single()
      if (petError) console.error("Pet fetch error:", petError)
      setPet(petData)
      
      await fetchReels()

      // Fetch friends list for share-to-friends modal
      const { data: sentRequests } = await supabase
        .from('friend_requests').select('*').eq('sender_id', session.user.id)
      const { data: receivedRequests } = await supabase
        .from('friend_requests').select('*').eq('receiver_id', session.user.id)
      
      const friendIds = [
        ...(sentRequests || []).filter(r => r.status === 'accepted').map(r => r.receiver_id),
        ...(receivedRequests || []).filter(r => r.status === 'accepted').map(r => r.sender_id)
      ]
      
      if (friendIds.length > 0) {
        const { data: friendPets } = await supabase.from('pets').select('*').in('user_id', friendIds).eq('is_health_pet', false)
        setFriends(friendPets || [])
      }
    } catch (err) {
      console.error("Init Error:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchReels = async () => {
    const { data } = await supabase
      .from('reels')
      .select('*, pets(pet_name, emoji, owner_name, avatar_url, user_id)')
      .order('created_at', { ascending: false })
      .limit(30)
    setReels(data || [])
  }

  const handleVideoSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('video/')) { alert('Please select a video file'); return }
    if (file.size > 50 * 1024 * 1024) { alert('Video must be under 50MB'); return }
    setSelectedVideo(file)
    setVideoPreview(URL.createObjectURL(file))
  }

  const handleUpload = async () => {
    if (!selectedVideo || !pet) return
    setUploading(true)
    try {
      const ext = selectedVideo.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('reels').upload(fileName, selectedVideo, { cacheControl: '3600', upsert: false })
      if (uploadErr) throw uploadErr

      const { data: { publicUrl } } = supabase.storage.from('reels').getPublicUrl(fileName)

      const { data, error } = await supabase.from('reels').insert({
        pet_id: pet.id,
        video_url: publicUrl,
        caption: caption,
        likes: 0,
        views: 0,
      }).select('*, pets(pet_name, emoji, owner_name, avatar_url, user_id)').single()

      if (!error && data) {
        setReels(prev => [data, ...prev])
        setCaption('')
        setSelectedVideo(null)
        setVideoPreview(null)
        setShowUpload(false)
        // reward coins
        await supabase.from('pets').update({ paw_coins: (pet.paw_coins || 0) + 15 }).eq('id', pet.id)
        setPet(p => ({ ...p, paw_coins: (p.paw_coins || 0) + 15 }))
      }
    } catch (err) {
      alert('Upload failed: ' + err.message)
    }
    setUploading(false)
  }

  const handleLike = async (reel, idx) => {
    const alreadyLiked = likedMap[reel.id]
    const newLikes = (reel.likes || 0) + (alreadyLiked ? -1 : 1)
    const newLikedMap = { ...likedMap, [reel.id]: !alreadyLiked }
    setLikedMap(newLikedMap)
    if (user) localStorage.setItem(`pawverse_liked_reels_${user.id}`, JSON.stringify(newLikedMap))
    setReels(prev => prev.map((r, i) => i === idx ? { ...r, likes: newLikes } : r))
    await supabase.from('reels').update({ likes: newLikes }).eq('id', reel.id)
    if (!alreadyLiked && reel.pets?.user_id && reel.pets.user_id !== user.id) {
      await supabase.from('notifications').insert({
        user_id: reel.pets.user_id,
        type: 'like',
        message: `${pet.pet_name} liked your reel! 🎬❤️|/post/${reel.id}`,
      })
    }
  }

  const toggleMute = (idx) => {
    setMutedMap(prev => ({ ...prev, [idx]: !prev[idx] }))
    const vid = videoRefs.current[idx]
    if (vid) vid.muted = !vid.muted
  }

  const handleScroll = () => {
    if (!containerRef.current) return
    const children = containerRef.current.children
    const scrollTop = containerRef.current.scrollTop
    const height = containerRef.current.clientHeight
    const idx = Math.round(scrollTop / height)
    setActiveReel(idx)
  }

  const shareViaReel = (platform, reel) => {
    const url = `${window.location.origin}/post/${reel.id}`
    const text = `Check out this reel on PawVerse! 🐾🎬`
    const links = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      copy: null,
    }
    if (platform === 'copy') {
      navigator.clipboard.writeText(url).then(() => alert('✅ Link copied!'))
    } else if (platform === 'friends') {
      setShareToFriendsModal(reel)
      setShareModal(null)
    } else {
      window.open(links[platform], '_blank')
    }
    if (platform !== 'friends') setShareModal(null)
  }

  const shareToFriend = async (friend, reel) => {
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(participant_1.eq.${user.id},participant_2.eq.${friend.user_id}),and(participant_1.eq.${friend.user_id},participant_2.eq.${user.id})`)
      .single()

    let convId = existingConv?.id
    if (!convId) {
      const { data: newConv } = await supabase.from('conversations').insert({
        participant_1: user.id, participant_2: friend.user_id
      }).select().single()
      convId = newConv?.id
    }
    if (!convId) { alert('Could not open conversation'); return }

    // Send as a structured shared post message
    await supabase.from('messages').insert({
      conversation_id: convId,
      sender_id: user.id,
      content: `🐾 ${pet.pet_name} shared a reel with you!`,
      shared_post_preview: JSON.stringify({
        id: reel.id,
        content: reel.caption?.slice(0, 120) || '',
        video_url: reel.video_url || null,
        pet_name: reel.pets?.pet_name || '',
        pet_emoji: reel.pets?.emoji || '🐾',
        avatar_url: reel.pets?.avatar_url || null,
        owner_name: reel.pets?.owner_name || '',
        is_reel: true
      }),
      is_read: false,
    })
    alert(`✅ Reel shared with ${friend.pet_name}!`)
    setShareToFriendsModal(null)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#000', color: '#fff', fontSize: '2rem' }}>🐾</div>
  )

  return (
    <div style={{ background: '#000', minHeight: '100vh' }}>
      <NavBar user={user} pet={pet} />

      {reels.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#fff', gap: 16, paddingTop: 100 }}>
          <div style={{ fontSize: '4rem' }}>🎬</div>
          <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.4rem' }}>No Reels Yet!</div>
          <div style={{ fontSize: '0.9rem', color: '#9CA3AF', textAlign: 'center', maxWidth: 280 }}>Be the first to share your pet's video moments 🐾</div>
          <button onClick={() => setShowUpload(true)} style={{ background: 'linear-gradient(135deg, #FF6B35, #6C4BF6)', color: '#fff', border: 'none', borderRadius: 30, padding: '12px 28px', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', marginTop: 8 }}>🎬 Upload First Reel</button>
        </div>
      ) : (
        <div
          ref={containerRef}
          onScroll={handleScroll}
          style={{
            height: 'calc(100dvh - 70px - 60px)',
            marginTop: 70,
            overflowY: 'scroll',
            scrollSnapType: 'y mandatory',
            scrollBehavior: 'smooth',
            boxSizing: 'border-box',
          }}>
          {reels.map((reel, idx) => (
            <div key={reel.id} style={{
              height: '100%',
              scrollSnapAlign: 'start',
              position: 'relative',
              background: '#111',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {/* Video */}
              <video
                ref={el => videoRefs.current[idx] = el}
                src={reel.video_url}
                loop
                playsInline
                muted={mutedMap[idx] !== false}
                onClick={() => {
                  const vid = videoRefs.current[idx]
                  if (vid) vid.paused ? vid.play() : vid.pause()
                }}
                style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' }}
              />

              {/* Gradient overlay */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)', pointerEvents: 'none' }} />

              {/* Pet info — bottom left */}
              <div style={{ position: 'absolute', bottom: 24, left: 16, right: 80, color: '#fff' }}>
                <div
                  onClick={() => reel.pets?.user_id !== user?.id && router.push(`/user/${reel.pets?.user_id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, cursor: 'pointer' }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#F0EBFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', border: '2px solid #fff', overflow: 'hidden', flexShrink: 0 }}>
                    {reel.pets?.avatar_url ? <img src={reel.pets.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="av" /> : reel.pets?.emoji}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{reel.pets?.pet_name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)' }}>by {reel.pets?.owner_name}</div>
                  </div>
                </div>
                {reel.caption && (
                  <p style={{ fontSize: '0.88rem', lineHeight: 1.5, margin: 0, textShadow: '0 1px 4px rgba(0,0,0,0.6)', maxWidth: '90%' }}>
                    {reel.caption.split(/(\s+)/).map((word, i) =>
                      word.startsWith('#')
                        ? <span key={i} style={{ color: '#A78BFA', fontWeight: 700 }}>{word}</span>
                        : word
                    )}
                  </p>
                )}
              </div>

              {/* Action buttons — right side */}
              <div style={{ position: 'absolute', right: 12, bottom: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                {/* Like */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <button onClick={() => handleLike(reel, idx)} style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: 'none', borderRadius: '50%', width: 48, height: 48, fontSize: '1.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                    {likedMap[reel.id] ? '❤️' : '🤍'}
                  </button>
                  <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700, textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>{reel.likes || 0}</span>
                </div>

                {/* Comment */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <button onClick={() => openComments(reel)} style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: 'none', borderRadius: '50%', width: 48, height: 48, fontSize: '1.3rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>💬</button>
                  <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700, textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>Comment</span>
                </div>

                {/* Share */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <button onClick={() => setShareModal(reel)} style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: 'none', borderRadius: '50%', width: 48, height: 48, fontSize: '1.3rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔗</button>
                  <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700, textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>Share</span>
                </div>

                {/* Mute */}
                <button onClick={() => toggleMute(idx)} style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: 'none', borderRadius: '50%', width: 48, height: 48, fontSize: '1.3rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {mutedMap[idx] !== false ? '🔇' : '🔊'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── UPLOAD MODAL ── */}
      {showUpload && (
        <div onClick={() => { setShowUpload(false); setSelectedVideo(null); setVideoPreview(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '24px 24px 16px 16px', width: '100%', maxWidth: 480, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.2rem', marginBottom: 16, color: '#1E1347' }}>🎬 Upload a Reel</div>

            <input ref={fileInputRef} type="file" accept="video/*" onChange={handleVideoSelect} style={{ display: 'none' }} />

            {!videoPreview ? (
              <div onClick={() => fileInputRef.current?.click()} style={{ border: '2px dashed #EDE8FF', borderRadius: 16, padding: 40, textAlign: 'center', cursor: 'pointer', background: '#F9F5FF' }}>
                <div style={{ fontSize: '3rem', marginBottom: 8 }}>🎥</div>
                <div style={{ fontWeight: 700, color: '#6C4BF6', marginBottom: 4 }}>Tap to select video</div>
                <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>MP4, MOV, WebM — max 50MB</div>
              </div>
            ) : (
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <video src={videoPreview} controls style={{ width: '100%', borderRadius: 14, maxHeight: 300 }} />
                <button onClick={() => { setSelectedVideo(null); setVideoPreview(null) }} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontWeight: 800 }}>✕</button>
              </div>
            )}

            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#374151', marginTop: 12, marginBottom: 6 }}>Caption (optional)</label>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Describe your reel... use #hashtags 🐾"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid #EDE8FF', fontFamily: 'Nunito, sans-serif', fontSize: '0.88rem', resize: 'none', minHeight: 80, boxSizing: 'border-box', outline: 'none' }}
            />

            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button onClick={() => { setShowUpload(false); setSelectedVideo(null); setVideoPreview(null) }} style={{ flex: 1, padding: 12, background: '#F3F0FF', border: 'none', borderRadius: 12, fontFamily: 'Nunito, sans-serif', fontWeight: 700, color: '#6C4BF6', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleUpload} disabled={!selectedVideo || uploading}
                style={{ flex: 2, padding: 12, background: 'linear-gradient(135deg, #FF6B35, #6C4BF6)', color: '#fff', border: 'none', borderRadius: 12, fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '0.95rem', cursor: !selectedVideo || uploading ? 'not-allowed' : 'pointer', opacity: !selectedVideo || uploading ? 0.6 : 1 }}>
                {uploading ? '📤 Uploading...' : '🚀 Post Reel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── COMMENTS MODAL ── */}
      {commentsModal && (
        <div onClick={() => setCommentsModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 0 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, padding: 24, paddingBottom: 40, maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EDE8FF', paddingBottom: 12, marginBottom: 16 }}>
              <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.2rem', color: '#1E1347' }}>Comments</div>
              <button onClick={() => setCommentsModal(null)} style={{ background: 'transparent', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#9CA3AF' }}>✕</button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
              {comments.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9CA3AF', marginTop: 20 }}>No comments yet. Start the conversation!</div>
              ) : (
                comments.map(c => (
                  <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F3F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                      {c.pets?.avatar_url ? <img src={c.pets.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '1.2rem' }}>{c.pets?.emoji || '🐾'}</span>}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1E1347' }}>{c.pets?.pet_name}</div>
                      <div style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.4 }}>{c.content}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                style={{ flex: 1, background: '#F3F0FF', border: 'none', borderRadius: 20, padding: '12px 16px', outline: 'none', fontFamily: 'Nunito, sans-serif' }}
              />
              <button onClick={handlePostComment} disabled={!commentText.trim() || sendingComment} style={{ background: 'linear-gradient(135deg, #FF6B35, #6C4BF6)', color: '#fff', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: !commentText.trim() ? 'not-allowed' : 'pointer', opacity: !commentText.trim() ? 0.5 : 1 }}>
                ➤
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SHARE REEL MODAL ── */}
      {shareModal && (
        <div onClick={() => setShareModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '24px 24px 16px 16px', width: '100%', maxWidth: 480, padding: 24 }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.1rem' }}>🔗 Share Reel</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { id: 'whatsapp', emoji: '💬', label: 'WhatsApp', color: '#25D366', bg: '#E8FFF0' },
                { id: 'telegram', emoji: '✈️', label: 'Telegram', color: '#0088CC', bg: '#E8F6FF' },
                { id: 'twitter', emoji: '🐦', label: 'Twitter', color: '#1DA1F2', bg: '#E8F5FF' },
                { id: 'friends', emoji: '🐾', label: 'Friends', color: '#6C4BF6', bg: '#F0EBFF' },
                { id: 'copy', emoji: '📋', label: 'Copy Link', color: '#374151', bg: '#F3F4F6' },
              ].map(opt => (
                <div key={opt.id} onClick={() => shareViaReel(opt.id, shareModal)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 8px', borderRadius: 14, background: opt.bg, cursor: 'pointer' }}>
                  <div style={{ fontSize: '1.6rem' }}>{opt.emoji}</div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: opt.color }}>{opt.label}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setShareModal(null)} style={{ width: '100%', padding: 10, background: '#F3F0FF', border: 'none', borderRadius: 12, fontFamily: 'Nunito, sans-serif', fontWeight: 700, color: '#6C4BF6', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── SHARE TO FRIENDS MODAL ── */}
      {shareToFriendsModal && (
        <div onClick={() => setShareToFriendsModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9101, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 400, padding: 24, boxShadow: '0 8px 40px rgba(0,0,0,0.18)', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.1rem', marginBottom: 14, color: '#1E1347' }}>🐾 Share with Friends</div>
            {friends.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#6B7280', padding: '20px 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🤷</div>
                <div style={{ fontWeight: 700 }}>No friends yet!</div>
                <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Add friends first to share reels with them.</div>
              </div>
            ) : friends.map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F3F0FF' }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#F0EBFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', border: '2px solid #EDE8FF', overflow: 'hidden', flexShrink: 0 }}>
                  {f.avatar_url ? <img src={f.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="av" /> : f.emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1E1347' }}>{f.pet_name}</div>
                  <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>by {f.owner_name}</div>
                </div>
                <button onClick={() => shareToFriend(f, shareToFriendsModal)} style={{ background: 'linear-gradient(135deg, #FF6B35, #6C4BF6)', color: '#fff', border: 'none', padding: '6px 14px', fontSize: '0.78rem', borderRadius: 10, cursor: 'pointer', fontWeight: 800 }}>Send 📤</button>
              </div>
            ))}
            <button onClick={() => setShareToFriendsModal(null)} style={{ width: '100%', marginTop: 14, padding: '10px', background: '#F3F0FF', border: 'none', borderRadius: 12, fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#6C4BF6', cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
