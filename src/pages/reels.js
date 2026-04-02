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
  const [mutedMap, setMutedMap] = useState({})
  const [likedMap, setLikedMap] = useState({})
  const [shareModal, setShareModal] = useState(null)
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
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    setUser(session.user)
    const { data: petData } = await supabase.from('pets').select('*').eq('user_id', session.user.id).single()
    setPet(petData)
    await fetchReels()
    setLoading(false)
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
    setLikedMap(prev => ({ ...prev, [reel.id]: !alreadyLiked }))
    setReels(prev => prev.map((r, i) => i === idx ? { ...r, likes: newLikes } : r))
    await supabase.from('reels').update({ likes: newLikes }).eq('id', reel.id)
    if (!alreadyLiked && reel.pets?.user_id && reel.pets.user_id !== user.id) {
      await supabase.from('notifications').insert({
        user_id: reel.pets.user_id,
        type: 'like',
        message: `${pet.pet_name} liked your reel! 🎬❤️`,
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
    const url = `${window.location.origin}/reels`
    const text = `Check out this reel on PawVerse! 🐾🎬`
    const links = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      copy: null,
    }
    if (platform === 'copy') {
      navigator.clipboard.writeText(url).then(() => alert('✅ Link copied!'))
    } else {
      window.open(links[platform], '_blank')
    }
    setShareModal(null)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#000', color: '#fff', fontSize: '2rem' }}>🐾</div>
  )

  return (
    <div style={{ background: '#000', minHeight: '100vh' }}>
      <NavBar user={user} pet={pet} />

      {/* Upload Button */}
      <button
        onClick={() => setShowUpload(true)}
        style={{
          position: 'fixed', bottom: 80, right: 20, zIndex: 500,
          background: 'linear-gradient(135deg, #FF6B35, #6C4BF6)',
          color: '#fff', border: 'none', borderRadius: '50%',
          width: 52, height: 52, fontSize: '1.4rem', cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(108,75,246,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>➕</button>

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
            height: '100vh', overflowY: 'scroll',
            scrollSnapType: 'y mandatory',
            scrollBehavior: 'smooth',
            paddingTop: 98,
            boxSizing: 'border-box',
          }}>
          {reels.map((reel, idx) => (
            <div key={reel.id} style={{
              height: 'calc(100vh - 98px)',
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
    </div>
  )
}
