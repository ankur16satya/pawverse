// Force redeploy to pick up Cloudinary Env Vars
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'
import SEO from '../components/SEO'
import { uploadToCloudinary } from '../lib/cloudinary'


const FEELINGS = ['😀 Happy','😍 Loved','🥳 Excited','😎 Cool','😢 Sad','😤 Annoyed','🤔 Thoughtful','🥺 Grateful','🔥 Hyped','😴 Tired','🤒 Sick','🥰 Blessed']
const POPULAR_LOCATIONS = ['Mumbai, India','Delhi, India','Bengaluru, India','Chennai, India','Hyderabad, India','Pune, India','Kolkata, India','Jaipur, India','Dehradun, India','Chandigarh, India']


export default function Feed() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [mounted, setMounted] = useState(false)
  const [pet, setPet] = useState(null)
  const [posts, setPosts] = useState([])
  const [postText, setPostText] = useState('')
  const [posting, setPosting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [lastTimestamp, setLastTimestamp] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [selectedImage, setSelectedImage] = useState(null)
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [friendStatuses, setFriendStatuses] = useState({})
  const [shareModal, setShareModal] = useState(null)
  const [shareToFriendsModal, setShareToFriendsModal] = useState(null)
  const [friends, setFriends] = useState([])
  const [postLocation, setPostLocation] = useState('')
  const [postFeeling, setPostFeeling] = useState('')
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [showFeelingPicker, setShowFeelingPicker] = useState(false)
  const [showMusicPicker, setShowMusicPicker] = useState(false)
  const [postMusic, setPostMusic] = useState(null)
  const [musicSearchQuery, setMusicSearchQuery] = useState('')
  const [musicResults, setMusicResults] = useState([])
  const [isSearchingMusic, setIsSearchingMusic] = useState(false)
  const [playingTrackId, setPlayingTrackId] = useState(null)
  const [previewAudio, setPreviewAudio] = useState(null)
  const [postMusicStart, setPostMusicStart] = useState(0)
  const [locationSearch, setLocationSearch] = useState('')
  const [lightboxImg, setLightboxImg] = useState(null)
  const [activeComments, setActiveComments] = useState({})
  const [isFeedMuted, setIsFeedMuted] = useState(false)
  const [activeFeedPostId, setActiveFeedPostId] = useState(null)
  const [commentTexts, setCommentTexts] = useState({})
  const [replyTo, setReplyTo] = useState({})
  const [openMenu, setOpenMenu] = useState(null)
  const [editingPost, setEditingPost] = useState(null)
  const [editText, setEditText] = useState('')
  const [trendingTags, setTrendingTags] = useState(['#PawParents','#CatsOfPawVerse','#DogsRule','#BunnyLife','#AdoptDontShop'])
  const fileInputRef = useRef(null)
  const videoInputRef = useRef(null)
  const menuRef = useRef(null)
  const textareaRef = useRef(null)
  const feedAudioRefs = useRef({})
  const feedVideoRefs = useRef({})
  const feedObserver = useRef(null)

  useEffect(() => { 
    setMounted(true)
    init() 
  }, [])
  useEffect(() => {
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(null) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Handle hashtag filter from URL
  const activeTagFilter = router.query.tag || null

  const playSound = (type) => { try { const a = new Audio(type === 'message' ? '/message.mp3' : '/notification.mp3'); a.volume = 0.5; a.play().catch(() => {}) } catch(e){} }

  useEffect(() => {
    const t = setTimeout(() => {
      if (musicSearchQuery.trim()) {
        setIsSearchingMusic(true)
        fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(musicSearchQuery)}&entity=song&limit=10`)
          .then(r=>r.json())
          .then(d=>{
            setMusicResults(d.results.map(r=>({
              id: r.trackId, title: r.trackName, artist: r.artistName, url: r.previewUrl, cover: r.artworkUrl100
            })))
            setIsSearchingMusic(false)
          }).catch(()=>setIsSearchingMusic(false))
      } else {
        setMusicResults([])
      }
    }, 600)
    return () => clearTimeout(t)
  }, [musicSearchQuery])

  useEffect(() => { return () => { if (previewAudio) previewAudio.pause() } }, [previewAudio])

  const togglePreviewAudio = (e, track) => {
    e.stopPropagation();
    if (playingTrackId === track.id) {
      if (previewAudio) previewAudio.pause()
      setPlayingTrackId(null)
    } else {
      if (previewAudio) previewAudio.pause()
      const a = new Audio(track.url)
      a.play()
      setPreviewAudio(a)
      setPlayingTrackId(track.id)
    }
  }

  const stopPreviewAudio = () => {
    if (previewAudio) {
      previewAudio.pause()
      setPreviewAudio(null)
      setPlayingTrackId(null)
    }
  }

  useEffect(() => {
    feedObserver.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (entry.target.id === 'infinite-scroll-trigger') {
            loadMore()
          } else {
            setActiveFeedPostId(entry.target.getAttribute('data-post-id'))
          }
        }
      })
    }, { threshold: 0.1 })
    return () => { if (feedObserver.current) feedObserver.current.disconnect() }
  }, [hasMore, loadingMore, lastTimestamp])

  useEffect(() => {
    Object.entries(feedAudioRefs.current).forEach(([id, aud]) => {
      if (!aud) return
      if (id === activeFeedPostId && !isFeedMuted) {
        aud.muted = false
        aud.play().catch(() => {
          setIsFeedMuted(true)
          aud.muted = true
          aud.play().catch(()=>{})
        })
      } else {
        aud.pause()
        aud.muted = true
      }
    })
    Object.entries(feedVideoRefs.current).forEach(([id, vid]) => {
      if (!vid) return
      const post = posts.find(p => String(p.id) === id)
      const hasAudio = post?.audio_url
      if (id === activeFeedPostId) {
        vid.muted = hasAudio ? true : isFeedMuted
        vid.play().catch(() => {
          setIsFeedMuted(true)
          vid.muted = true
          vid.play().catch(()=>{})
        })
      } else {
        vid.pause()
        vid.muted = true
      }
    })
  }, [activeFeedPostId, posts, isFeedMuted])

  const toggleFeedPostAudio = () => {
    setIsFeedMuted(!isFeedMuted)
  }

  const isVetFilter = router.query.vet === 'true'

  useEffect(() => {
    if (mounted && user) {
      setHasMore(true)
      setLastTimestamp(null)
      fetchPosts(user.id, false, isVetFilter)
    }
  }, [router.query.vet])

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    setUser(session.user)
    const userId = session.user.id

    // Run all fetches in parallel for faster load
    // Robust pet fetching: Get all pets and find the primary social one
    const [allPetsRes, othersResult, sReqsResult, rReqsResult] = await Promise.all([
      supabase.from('pets').select('*').eq('user_id', userId),
      supabase.from('pets').select('id,user_id,pet_name,emoji,avatar_url,pet_breed,owner_name,role').neq('user_id', userId).eq('is_health_pet', false).limit(6),
      supabase.from('friend_requests').select('receiver_id,status').eq('sender_id', userId),
      supabase.from('friend_requests').select('sender_id,status').eq('receiver_id', userId),
    ])

    const allPets = allPetsRes.data
    let petData = (allPets || []).find(p => !p.is_health_pet)
    const hiddenVet = (allPets || []).find(p => p.is_health_pet && (p.role === 'vet' || p.role === 'supplier'))

    if (hiddenVet && !petData) {
      await supabase.from('pets').update({ is_health_pet: false }).eq('id', hiddenVet.id)
      petData = { ...hiddenVet, is_health_pet: false }
    } else if (hiddenVet && petData) {
      if (petData.role === 'user' && hiddenVet.role !== 'user') {
        await supabase.from('pets').update({ is_health_pet: false }).eq('id', hiddenVet.id)
        petData = { ...hiddenVet, is_health_pet: false }
      }
    }

    if (petData) {
      // PROACTIVE SELF-HEALING:
      // If the name clearly implies a Vet/Supplier but role is stuck as 'user', fix it!
      const name = (petData.pet_name || '').toLowerCase()
      const currentRole = (petData.role || 'user').toLowerCase()
      
      if (currentRole === 'user') {
        let newRole = null
        if (name.includes('vet') || name.includes('hospital') || name.includes('clinic') || name.includes('doctor')) newRole = 'vet'
        else if (name.includes('shop') || name.includes('store') || name.includes('supply') || name.includes('pet store')) newRole = 'supplier'
        
        if (newRole) {
          console.log(`Auto-upgrading ${petData.pet_name} to ${newRole}...`)
          await supabase.from('pets').update({ role: newRole, is_health_pet: false }).eq('id', petData.id)
          petData.role = newRole
        }
      }
      setPet(petData)
    }
    setSuggestions(othersResult.data || [])

    const sReqs = sReqsResult.data || []
    const rReqs = rReqsResult.data || []
    const statuses = {}
    sReqs.forEach(r => { statuses[r.receiver_id] = r.status })
    rReqs.forEach(r => { statuses[r.sender_id] = r.status })
    setFriendStatuses(statuses)

    const fIds = [
      ...sReqs.filter(r => r.status === 'accepted').map(r => r.receiver_id),
      ...rReqs.filter(r => r.status === 'accepted').map(r => r.sender_id)
    ]

    // Fetch posts and friends in parallel
    const vetQuery = new URLSearchParams(window.location.search).get('vet') === 'true'
    await Promise.all([
      fetchPosts(userId, false, vetQuery),
      fIds.length > 0
        ? supabase.from('pets').select('id,user_id,pet_name,emoji,avatar_url,owner_name,role').in('user_id', fIds).eq('is_health_pet', false).then(({ data: fp }) => setFriends(fp || []))
        : Promise.resolve()
    ])

    Promise.all([
      supabase.from('posts').select('content').not('content', 'is', null).limit(1000).order('created_at', { ascending: false }),
      supabase.from('reels').select('caption').not('caption', 'is', null).limit(1000).order('created_at', { ascending: false })
    ]).then(([postsRes, reelsRes]) => {
      const counts = {}
      const extractTags = (text) => {
        if (!text) return
        const tags = text.match(/#[\w]+/g)
        if (tags) {
          tags.forEach(t => {
            const h = t.toLowerCase()
            counts[h] = (counts[h] || 0) + 1
          })
        }
      }
      
      if (postsRes.data) postsRes.data.forEach(p => extractTags(p.content))
      if (reelsRes.data) reelsRes.data.forEach(r => extractTags(r.caption))
      
      const trending = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,10).map(x=>x[0])
      if (trending.length > 0) {
        setTrendingTags(trending)
      }
    })

    setLoading(false)
  }

  const fetchPosts = async (userId, isAppending = false, isVet = false) => {
    const currentUserId = userId || user?.id
    const FETCH_LIMIT = 20
    
    let postQuery = supabase.from('posts').select(`*, pets${isVet ? '!inner' : ''}(pet_name, emoji, pet_breed, owner_name, avatar_url, user_id, is_health_pet, role), comments(count)`).order('created_at', { ascending: false }).limit(FETCH_LIMIT)
    // NOTE: reels table has NO foreign key to comments — omit comments join to avoid crash
    let reelQuery = supabase.from('reels').select(`*, pets${isVet ? '!inner' : ''}(pet_name, emoji, pet_breed, owner_name, avatar_url, user_id, is_health_pet, role)`).order('created_at', { ascending: false }).limit(FETCH_LIMIT)

    if (isVet) {
      // Explicitly filter by joined table role (case-insensitive where possible)
      postQuery = postQuery.ilike('pets.role', 'vet')
      reelQuery = reelQuery.ilike('pets.role', 'vet')
    }

    if (isAppending && lastTimestamp) {
      postQuery = postQuery.lt('created_at', lastTimestamp)
      reelQuery = reelQuery.lt('created_at', lastTimestamp)
    }

    const { data: pD, error: pErr } = await postQuery
    const { data: rD, error: rErr } = await reelQuery
    if (pErr) console.error('Posts fetch error:', pErr)
    if (rErr) console.error('Reels fetch error:', rErr)

    const pD_typed = (pD || []).map(p => ({
      ...p,
      type: 'post',
      comments_count: p.comments?.[0]?.count || 0
    }))
    const rD_typed = (rD || []).map(r => ({
      ...r,
      type: 'reel',
      comments_count: 0
    }))
    
    const mixed = [...pD_typed,...rD_typed].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,FETCH_LIMIT)
    
    if (mixed.length < FETCH_LIMIT) {
      setHasMore(false)
    }

    if (mixed.length > 0) {
      setLastTimestamp(mixed[mixed.length - 1].created_at)
    }

    const hidden = JSON.parse(localStorage.getItem('hidden_posts')||'[]')
    const savedLikes = JSON.parse(localStorage.getItem(`pawverse_likes_${currentUserId}`) || '{}')
    
    const newPosts = mixed.filter(p=>!hidden.includes(p.id)).map(p => ({
      ...p,
      liked_by_me: !!savedLikes[p.id]
    }))

    if (isAppending) {
      setPosts(prev => [...prev, ...newPosts])
    } else {
      setPosts(newPosts)
    }
  }

  const loadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    await fetchPosts(user?.id, true, isVetFilter)
    setLoadingMore(false)
  }

  const fetchComments = async (postId) => {
    // Determine if this is a reel by checking the posts state
    const thePost = posts.find(p => p.id === postId)
    const isReel = thePost?.type === 'reel'
    
    let query = supabase.from('comments').select('*, pets(pet_name, emoji, avatar_url, user_id)').is('parent_id', null).order('created_at', { ascending: true })
    if (isReel) query = query.eq('reel_id', postId)
    else query = query.eq('post_id', postId)
    
    const { data } = await query
    
    const savedCommentLikes = JSON.parse(localStorage.getItem(`pawverse_comment_likes_${user?.id}`) || '{}')
    
    const withReplies = await Promise.all((data||[]).map(async(c) => {
      const { data: rep } = await supabase.from('comments').select('*, pets(pet_name, emoji, avatar_url, user_id)').eq('parent_id',c.id).order('created_at',{ascending:true})
      const repWithLikes = (rep||[]).map(r => ({...r, likedByMe: !!savedCommentLikes[r.id]}))
      return {...c, likedByMe: !!savedCommentLikes[c.id], replies: repWithLikes||[]}
    }))
    setActiveComments(prev=>({...prev,[postId]:withReplies}))
    const totalCount = withReplies.reduce((sum, c) => sum + 1 + (c.replies?.length || 0), 0)
    setPosts(prev=>prev.map(p=>p.id===postId?{...p,comments_count:totalCount}:p))
  }

  const toggleComments = async (postId) => {
    if (activeComments[postId]!==undefined) { setActiveComments(prev=>{const n={...prev};delete n[postId];return n}) }
    else { await fetchComments(postId) }
  }

  const handleComment = async (postId, parentId=null) => {
    const key = parentId||postId
    const text = commentTexts[key]?.trim()
    if (!text) return
    
    let currentPet = pet
    if (!currentPet) {
      const { data: pD } = await supabase.from('pets').select('id,user_id,pet_name,emoji,avatar_url,paw_coins').eq('user_id', user.id).eq('is_health_pet', false).maybeSingle()
      if (pD) { currentPet = pD; setPet(pD) }
      else { alert('Please set up your pet profile first!'); return }
    }
    
    // Use reel_id for reels, post_id for regular posts
    const thePost = posts.find(p => p.id === postId)
    const isReel = thePost?.type === 'reel'
    const insertPayload = isReel
      ? { reel_id: postId, pet_id: currentPet.id, user_id: user.id, content: text, parent_id: parentId || null }
      : { post_id: postId, pet_id: currentPet.id, user_id: user.id, content: text, parent_id: parentId || null }
    
    const { data: nc, error } = await supabase.from('comments').insert(insertPayload).select('*, pets(pet_name, emoji, avatar_url, user_id)').single()
    if (error) { console.error('Comment insert error:', error); return }
    if (!nc) return
    setCommentTexts(prev=>({...prev,[key]:''}))
    setReplyTo(prev=>({...prev,[postId]:null}))
    if (parentId) { setActiveComments(prev=>({...prev,[postId]:(prev[postId]||[]).map(c=>c.id===parentId?{...c,replies:[...(c.replies||[]),{...nc,replies:[]}]}:c)})) }
    else { setActiveComments(prev=>({...prev,[postId]:[...(prev[postId]||[]),{...nc,replies:[]}]})) }
    setPosts(prev=>prev.map(p=>p.id===postId?{...p,comments_count:(p.comments_count||0)+1}:p))
    const post = posts.find(p=>p.id===postId)
    if (post?.pets?.user_id&&post.pets.user_id!==user.id) {
      await supabase.from('notifications').insert({user_id:post.pets.user_id,type:'comment',message:`${pet.pet_name} commented: "${text.slice(0,40)}${text.length>40?'...':''}" 💬|/post/${post.id}`})
      
      // ── SEND REAL BACKGROUND PUSH ──
      fetch('/api/push', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: post.pets.user_id,
          title: '💬 New Comment!',
          body: `${currentPet.pet_name} commented on your post: "${text.slice(0,50)}..."`,
          url: `/post/${post.id}`
        })
      }).catch(e => console.error('Push failed:', e))
      
      playSound('notification')
    }
  }

  const handleDeleteComment = async (comment,postId) => {
    await supabase.from('comments').delete().eq('id',comment.id)
    setActiveComments(prev=>({...prev,[postId]:(prev[postId]||[]).filter(c=>c.id!==comment.id)}))
    setPosts(prev=>prev.map(p=>p.id===postId?{...p,comments_count:Math.max((p.comments_count||1)-1,0)}:p))
  }

  const handleLikeComment = async (comment,postId) => {
    const isLiked = comment.likedByMe
    const newLikes = Math.max(0, (comment.likes||0) + (isLiked ? -1 : 1))
    
    const savedCommentLikes = JSON.parse(localStorage.getItem(`pawverse_comment_likes_${user?.id}`) || '{}')
    savedCommentLikes[comment.id] = !isLiked
    localStorage.setItem(`pawverse_comment_likes_${user?.id}`, JSON.stringify(savedCommentLikes))
    
    await supabase.from('comments').update({likes:newLikes}).eq('id',comment.id)
    setActiveComments(prev=>({...prev,[postId]:(prev[postId]||[]).map(c=>{
      if (c.id === comment.id) return {...c, likes:newLikes, likedByMe:!isLiked}
      if (c.replies) {
        return {...c, replies: c.replies.map(r => r.id === comment.id ? {...r, likes:newLikes, likedByMe:!isLiked} : r)}
      }
      return c
    })}))

    if (!comment.likedByMe && comment.pets?.user_id && comment.pets.user_id !== user.id) {
      await supabase.from('notifications').insert({user_id:comment.pets.user_id,type:'like',message:`${pet.pet_name} liked your comment! ❤️|/post/${postId}`})
      
      // ── SEND REAL BACKGROUND PUSH ──
      fetch('/api/push', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: comment.pets.user_id,
          title: '❤️ Comment Liked!',
          body: `${pet.pet_name} liked your comment: "${comment.content.slice(0,40)}..."`,
          url: `/post/${postId}`
        })
      }).catch(e => console.error('Push failed:', e))
    }
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size>5*1024*1024) { alert('Image must be under 5MB'); return }
    setSelectedImage(file); setSelectedVideo(null); setImagePreview(URL.createObjectURL(file))
  }
  
  const handleVideoSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('video/')) { alert('Please select a video file'); return }
    if (file.size > 50 * 1024 * 1024) { alert('Video must be under 50MB'); return }
    setSelectedVideo(file); setSelectedImage(null); setImagePreview(URL.createObjectURL(file))
  }

  const removeImage = () => { setSelectedImage(null); setSelectedVideo(null); setImagePreview(null); if(fileInputRef.current) fileInputRef.current.value=''; if(videoInputRef.current) videoInputRef.current.value=''; }

  const uploadImage = async (file, userId) => {
    const publicUrl = await uploadToCloudinary(file, 'post-images')
    return publicUrl
  }

  const handlePost = async () => {
    if (!postText.trim()&&!selectedImage&&!selectedVideo||!pet) return
    setPosting(true)
    stopPreviewAudio()
    try {
      if (selectedVideo) {
        setUploadingImage(true)
        const publicUrl = await uploadToCloudinary(selectedVideo, 'reels')
        setUploadingImage(false)

        const hashtags = (postText.match(/#[\w]+/g) || []).map(h => h.toLowerCase())
        const { data, error } = await supabase.from('reels').insert({
          pet_id: pet.id, 
          user_id: user.id, 
          video_url: publicUrl, 
          caption: postText, 
          likes: 0, 
          views: 0,
          audio_url: postMusic?.url || null, 
          audio_name: postMusic ? JSON.stringify({id: postMusic.id, title: postMusic.title, artist: postMusic.artist, cover: postMusic.cover, start: postMusicStart}) : null
        }).select('*, pets(pet_name, emoji, pet_breed, owner_name, avatar_url, user_id, is_health_pet, role)').single()
        console.log("Supabase reel insert result:", { data, error })
        if (error) throw error
        
        if (data) {
          const newData = { ...data, type: 'reel' }
          setPosts([newData,...posts]); setPostText(''); setPostLocation(''); setPostFeeling(''); setPostMusic(null); removeImage()
          await supabase.from('pets').update({paw_coins:(pet.paw_coins||0)+15}).eq('id',pet.id)
          setPet(p=>({...p,paw_coins:(p.paw_coins||0)+15}))
          const { data:fS } = await supabase.from('friend_requests').select('receiver_id').eq('sender_id',user.id).eq('status','accepted')
          const { data:fR } = await supabase.from('friend_requests').select('sender_id').eq('receiver_id',user.id).eq('status','accepted')
          for (const fid of [...(fS||[]).map(f=>f.receiver_id),...(fR||[]).map(f=>f.sender_id)]) {
            await supabase.from('notifications').insert({user_id:fid,type:'post',message:`${pet.pet_name} posted a new reel! 🎬|/post/${data.id}`})
            fetch('/api/push', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_id: fid,
                title: '🎬 New Reel!',
                body: `${pet.pet_name} posted a new reel! 🐾`,
                url: `/post/${data.id}`
              })
            }).catch(e => console.error('Push failed:', e))
          }
          playSound('notification')
        }
      } else {
        let imageUrl=null
        if (selectedImage) { setUploadingImage(true); imageUrl=await uploadImage(selectedImage,user.id); setUploadingImage(false) }
        const hashtags=(postText.match(/#[\w]+/g)||[]).map(h=>h.toLowerCase())
        const { data, error } = await supabase.from('posts').insert({
          pet_id:pet.id, content:postText, image_url:imageUrl, hidden:false, edited:false,
          location:postLocation||null, feeling:postFeeling||null, hashtags:hashtags.length>0?hashtags:null,
          audio_url: postMusic?.url || null, audio_name: postMusic ? JSON.stringify({id: postMusic.id, title: postMusic.title, artist: postMusic.artist, cover: postMusic.cover, start: postMusicStart}) : null
        }).select('*, pets(pet_name, emoji, pet_breed, owner_name, avatar_url, user_id, is_health_pet, role)').single()
        console.log("Supabase post insert result:", { data, error })
        if (error) throw error
        
        if (data) {
          const newData = { ...data, type: 'post' }
          setPosts([newData,...posts]); setPostText(''); setPostLocation(''); setPostFeeling(''); setPostMusic(null); removeImage()
          await supabase.from('pets').update({paw_coins:(pet.paw_coins||0)+10}).eq('id',pet.id)
          setPet(p=>({...p,paw_coins:(p.paw_coins||0)+10}))
          const { data:fS } = await supabase.from('friend_requests').select('receiver_id').eq('sender_id',user.id).eq('status','accepted')
          const { data:fR } = await supabase.from('friend_requests').select('sender_id').eq('receiver_id',user.id).eq('status','accepted')
          for (const fid of [...(fS||[]).map(f=>f.receiver_id),...(fR||[]).map(f=>f.sender_id)]) {
            await supabase.from('notifications').insert({user_id:fid,type:'post',message:`${pet.pet_name} just posted something new! 🐾|/post/${data.id}`})
            fetch('/api/push', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_id: fid,
                title: '🐾 New Post!',
                body: `${pet.pet_name} shared a new post!`,
                url: `/post/${data.id}`
              })
            }).catch(e => console.error('Push failed:', e))
          }
          playSound('notification')
        }
      }
    } catch(err) { 
      console.error('Final catch error:', err)
      alert(`Failed to post: ${err.message || 'Unknown error'}`) 
    }
    setPosting(false)
  }

  const toggleLike = async (post) => {
    if (!user) return
    let currentPet = pet
    if (!currentPet) {
      const { data: pD } = await supabase.from('pets').select('id,user_id,pet_name,emoji,avatar_url,paw_coins').eq('user_id', user.id).eq('is_health_pet', false).maybeSingle()
      if (pD) {
        currentPet = pD
        setPet(pD)
      } else {
        alert("Please make sure you have a pet profile to Paw posts!")
        return
      }
    }

    const isLiked = post.liked_by_me
    const newLikes = Math.max(0, (post.likes || 0) + (isLiked ? -1 : 1))
    
    const savedLikes = JSON.parse(localStorage.getItem(`pawverse_likes_${user.id}`) || '{}')
    savedLikes[post.id] = !isLiked
    localStorage.setItem(`pawverse_likes_${user.id}`, JSON.stringify(savedLikes))

    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes: newLikes, liked_by_me: !isLiked } : p))
    
    const tableName = post.type === 'reel' ? 'reels' : 'posts'
    const { error } = await supabase.rpc('toggle_paw', {
      table_name: tableName,
      row_id: String(post.id),
      increment_by: isLiked ? -1 : 1
    })
    
    if (error) { 
        console.error("Like RPC error:", error)
        alert(`Could not save your Paw: ${error.message || 'Unknown error'}`)
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes: post.likes, liked_by_me: isLiked } : p))
        savedLikes[post.id] = isLiked
        localStorage.setItem(`pawverse_likes_${user.id}`, JSON.stringify(savedLikes))
        return 
    }
    
    if (!isLiked && post.pets?.user_id && post.pets.user_id !== user.id) {
      await supabase.from('notifications').insert({
        user_id: post.pets.user_id,
        type: 'like',
        message: `${currentPet.pet_name} pawed your ${post.type}! ❤️|/post/${post.id}`
      })
      
      // ── SEND REAL BACKGROUND PUSH ──
      fetch('/api/push', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: post.pets.user_id,
          title: '🐾 New Paw!',
          body: `${pet.pet_name} pawed your post! ❤️`,
          url: `/post/${post.id}`
        })
      }).catch(e => console.error('Push failed:', e))
    }
  }

  const handleShare = (post) => {
    setShareModal(post)
    supabase.from('posts').update({shares_count:(post.shares_count||0)+1}).eq('id',post.id)
    setPosts(prev=>prev.map(p=>p.id===post.id?{...p,shares_count:(p.shares_count||0)+1}:p))
  }

  const shareVia = (platform, post) => {
    const origin = window.location.origin.replace('https://pawversesocial.com/', window.location.host)
    const url = `${origin}/post/${post.id}`
    const petName = post.pets?.pet_name||'a pet'
    const preview = post.content?post.content.slice(0,80):'Check out this cute post!'
    const text = `🐾 ${petName} on PawVerse: "${preview}" — See the full post:`
    const links = {
      whatsapp:`https://wa.me/?text=${encodeURIComponent(text+'\n'+url)}`,
      telegram:`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      twitter:`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      facebook:`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      email:`mailto:?subject=${encodeURIComponent(`${petName} shared something on PawVerse!`)}&body=${encodeURIComponent(text+'\n\n'+url)}`,
    }
    if (platform==='copy') { navigator.clipboard.writeText(url).then(()=>alert('✅ Link copied!')) }
    else if (platform==='friends') { setShareToFriendsModal(post); setShareModal(null) }
    else { window.open(links[platform],'_blank') }
  }

  const shareToFriend = async (friend, post) => {
    const { data: existingConv } = await supabase.from('conversations').select('id').or(`and(participant_1.eq.${user.id},participant_2.eq.${friend.user_id}),and(participant_1.eq.${friend.user_id},participant_2.eq.${user.id})`).single()
    let convId=existingConv?.id
    if (!convId) { const { data:nC } = await supabase.from('conversations').insert({participant_1:user.id,participant_2:friend.user_id}).select().single(); convId=nC?.id }
    if (!convId) { alert('Could not open conversation'); return }
    await supabase.from('messages').insert({
      conversation_id:convId, sender_id:user.id, content:`🐾 ${pet.pet_name} shared a post with you`,
      shared_post_id:post.id, is_read:false,
      shared_post_preview:JSON.stringify({id:post.id,content:post.content?.slice(0,120)||'',image_url:post.image_url||null,pet_name:post.pets?.pet_name||'',pet_emoji:post.pets?.emoji||'🐾',avatar_url:post.pets?.avatar_url||null,owner_name:post.pets?.owner_name||''}),
    })
    await supabase.from('notifications').insert({user_id:friend.user_id,type:'message',message:`${pet.pet_name} shared a post with you! 🐾|/chat`})
    
    // ── SEND REAL BACKGROUND PUSH ──
    fetch('/api/push', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: friend.user_id,
        title: `🐾 ${pet?.pet_name} shared a post!`,
        body: 'Check out this cute post shared with you!',
        url: '/chat'
      })
    }).catch(e => console.error('Push failed:', e))
    alert(`✅ Post shared with ${friend.pet_name}!`)
    setShareToFriendsModal(null)
  }

  const handleEditPost = async (post) => {
    if (!editText.trim()) return
    const table = post.type === 'reel' ? 'reels' : 'posts'
    const payload = post.type === 'reel' ? {caption:editText} : {content:editText,edited:true}
    
    const { error } = await supabase.from(table).update(payload).eq('id',post.id)
    if (error) {
      console.error("Edit error:", error);
      alert("Failed to edit: " + error.message);
      return;
    }
    
    setPosts(prev=>prev.map(p=>p.id===post.id?{...p, ...payload}:p))
    setEditingPost(null); setEditText(''); setOpenMenu(null)
  }

  const handleDeletePost = async (post) => {
    if (!confirm('Delete this post?')) return
    if (post.pets?.user_id!==user.id) { alert('You can only delete your own posts!'); return }
    const table = post.type === 'reel' ? 'reels' : 'posts'
    const { error } = await supabase.from(table).delete().eq('id',post.id).eq('pet_id',pet.id)
    if (error) { alert('Could not delete post.'); return }
    
    // Delete media from Cloudinary to save space
    const mediaUrl = post.image_url || post.video_url
    if (mediaUrl && mediaUrl.includes('res.cloudinary.com')) {
      fetch('/api/delete-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: mediaUrl })
      }).catch(e => console.error('Cloudinary delete failed:', e))
    }
    
    setPosts(prev=>prev.filter(p=>p.id!==post.id)); setOpenMenu(null)
  }

  const handleHidePost = (post) => {
    if (post.pets?.user_id===user.id) return
    const h=JSON.parse(localStorage.getItem('hidden_posts')||'[]')
    if (!h.includes(post.id)) { h.push(post.id); localStorage.setItem('hidden_posts',JSON.stringify(h)) }
    setPosts(prev=>prev.filter(p=>p.id!==post.id)); setOpenMenu(null)
  }

  const handleAddFriend = async (otherPet) => {
    if (!user||!pet||friendStatuses[otherPet.user_id]) return
    setFriendStatuses(prev=>({...prev,[otherPet.user_id]:'pending'}))
    const { error } = await supabase.from('friend_requests').insert({sender_id:user.id,receiver_id:otherPet.user_id,status:'pending'})
    if (error) { setFriendStatuses(prev=>({...prev,[otherPet.user_id]:null})); return }
    await supabase.from('notifications').insert({user_id:otherPet.user_id,type:'friend_request',message:`${pet.pet_name} sent you a friend request! 🐾|/friends`})
    
    // ── SEND REAL BACKGROUND PUSH ──
    fetch('/api/push', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: otherPet.user_id,
        title: '👫 New Friend Request',
        body: `${pet.pet_name} wants to be your friend! 🐾`,
        url: '/friends'
      })
    }).catch(e => console.error('Push failed:', e))
  }

  const getFriendButtonLabel = (userId) => {
    const s=friendStatuses[userId]
    if (s==='pending') return 'Sent 🐾'
    if (s==='accepted') return 'Friends ✅'
    if (s==='declined') return 'Declined'
    return '+ Add'
  }

  const timeAgo = (ts) => {
    const diff=Date.now()-new Date(ts), m=Math.floor(diff/60000)
    if (m<1) return 'just now'
    if (m<60) return `${m}m ago`
    const h=Math.floor(m/60)
    if (h<24) return `${h}h ago`
    return `${Math.floor(h/24)}d ago`
  }

  // Trending tags are now fetched globally in init()

  const tagMatch = postText.match(/#([\w]*)$/)
  const tagSuggestions = tagMatch ? trendingTags.filter(t=>t.toLowerCase().startsWith(`#${tagMatch[1]}`.toLowerCase())) : []
  const insertTag = (tag) => { setPostText(postText.replace(/#([\w]*)$/,tag+' ')); textareaRef.current?.focus() }

  // Standard hydration-safe loading state
  if (loading || !mounted) {
    return (
      <div className="feed-loading">
        <div style={{ animation: 'pulse 1.2s infinite', fontSize: '3rem' }}>🐾</div>
      </div>
    )
  }

  // Filter posts by active tag from URL
  const displayedPosts = activeTagFilter
    ? posts.filter(p => {
        const text = (p.content || p.caption || '').toLowerCase()
        const tags = p.hashtags || []
        return text.includes(`#${activeTagFilter.toLowerCase()}`) || tags.includes(`#${activeTagFilter.toLowerCase()}`)
      })
    : posts

  return (
    <div className="feed-page">
      <SEO 
        title="Pet Social Feed"
        description="Explore the latest stories, photos, and reels from the PawVerse community. Join pet parents worldwide and share your pet's journey."
      />
      <NavBar user={user} pet={pet} />

      {lightboxImg && (
        <div className="feed-lightbox" onClick={()=>setLightboxImg(null)}>
          <button className="feed-lightbox-close">✕</button>
          <img src={lightboxImg} alt="full" onClick={e=>e.stopPropagation()} className="feed-lightbox-img" />
        </div>
      )}

      <div className="feed-layout">

        {/* LEFT SIDEBAR */}
        <aside className="feed-left-sidebar">
          <div className="card feed-profile-card">
            <div className="feed-profile-banner" />
            <div className="feed-profile-body">
              <div className="feed-profile-avatar" onClick={()=>router.push('/profile')}>
                {pet?.avatar_url ? <img src={pet.avatar_url} alt="avatar" /> : (pet?.role?.toLowerCase() === 'vet' ? '🩺' : pet?.role?.toLowerCase() === 'supplier' ? '📦' : pet?.emoji || '🐾')}
              </div>
              <div className={`feed-profile-name ${pet?.role === 'vet' ? 'vet-badge' : pet?.role === 'supplier' ? 'supplier-badge' : ''}`}>{pet?.pet_name}</div>
              <div className="feed-profile-breed">{pet?.pet_breed}</div>
              <div className="feed-profile-owner">by {pet?.owner_name}</div>
              <div className="feed-coins-badge" onClick={()=>router.push('/coins')}>
                <span>🪙</span><span>{pet?.paw_coins||0} PawCoins</span>
              </div>
            </div>
          </div>
          <div className="card feed-quick-links">
            {[['⚕️','Vet Posts','/feed?vet=true'],['🛍️','Marketplace','/marketplace'],['🩺','Health','/health'],['💬','Messages','/chat'],['🏠','Adopt','/adopt'],['🪙','PawCoins','/coins'],['👫','Friends','/friends']].map(([ic,lb,href])=>(
              <div key={href} className="feed-quick-link" onClick={()=>router.push(href)}><span>{ic}</span>{lb}</div>
            ))}
          </div>
        </aside>

        {/* MAIN FEED */}
        <main className="feed-main">

          {/* Composer */}
          <div className="card feed-composer">
            <div className="feed-composer-top">
              <div className="feed-composer-avatar">
                {pet?.avatar_url ? <img src={pet.avatar_url} alt="avatar" /> : pet?.emoji||'🐾'}
              </div>
              <div className="feed-composer-input-wrap">
                <textarea
                  ref={textareaRef}
                  className="feed-composer-textarea"
                  value={postText}
                  onChange={e=>setPostText(e.target.value)}
                  placeholder={`What's ${pet?.pet_name||'your pet'} up to today? 🐾`}
                />
                {tagSuggestions.length>0&&(
                  <div className="feed-tag-suggestions">
                    <div className="feed-tag-suggestions-label">Trending Tags</div>
                    {tagSuggestions.map(tag=>(
                      <span key={tag} className="feed-tag-chip" onClick={()=>insertTag(tag)}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {imagePreview&&(
              <div className="feed-img-preview-wrap">
                {selectedVideo ? (
                  <video src={imagePreview} controls className="feed-img-preview" />
                ) : (
                  <img src={imagePreview} alt="preview" className="feed-img-preview" />
                )}
                <button className="feed-img-remove" onClick={removeImage}>✕</button>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px', width: '100%' }}>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} style={{display:'none'}} />
              <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoSelect} style={{display:'none'}} />
              
              <button 
                onClick={()=>fileInputRef.current?.click()}
                style={{ flex: 1, minWidth: '55px', padding: '12px 4px', borderRadius: '14px', background: selectedImage ? '#D4F0D4' : '#F3F0FF', color: selectedImage ? '#16A34A' : '#6C4BF6', fontWeight: 700, fontSize: '0.82rem', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Nunito, sans-serif' }}>
                <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>📸</span>
                {selectedImage?'Added ✓':'Photo'}
              </button>

              <button 
                onClick={()=>videoInputRef.current?.click()}
                style={{ flex: 1, minWidth: '55px', padding: '12px 4px', borderRadius: '14px', background: selectedVideo ? '#D4F0D4' : '#F3F0FF', color: selectedVideo ? '#16A34A' : '#6C4BF6', fontWeight: 700, fontSize: '0.82rem', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Nunito, sans-serif' }}>
                <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>🎞️</span>
                {selectedVideo?'Added ✓':'Reel'}
              </button>
              
              <button 
                onClick={()=>{setShowLocationPicker(p=>!p);setShowFeelingPicker(false)}}
                style={{ flex: 1, minWidth: '55px', padding: '12px 4px', borderRadius: '14px', background: postLocation ? '#E8F5FF' : '#F3F0FF', color: postLocation ? '#0EA5E9' : '#6C4BF6', fontWeight: 700, fontSize: '0.82rem', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Nunito, sans-serif' }}>
                <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>📍</span>
                {postLocation?'Added ✓':'Locate'}
              </button>
              
              <button 
                onClick={()=>{setShowFeelingPicker(p=>!p);setShowLocationPicker(false);setShowMusicPicker(false)}}
                style={{ flex: 1, minWidth: '55px', padding: '12px 4px', borderRadius: '14px', background: postFeeling ? '#FFF0E8' : '#F3F0FF', color: postFeeling ? '#FF6B35' : '#6C4BF6', fontWeight: 700, fontSize: '0.82rem', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Nunito, sans-serif' }}>
                <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>😊</span>
                {postFeeling?'Added ✓':'Feeling'}
              </button>

              <button 
                onClick={()=>{setShowMusicPicker(p=>!p);setShowLocationPicker(false);setShowFeelingPicker(false)}}
                style={{ flex: 1, minWidth: '55px', padding: '12px 4px', borderRadius: '14px', background: postMusic ? '#F0EBFF' : '#F3F0FF', color: postMusic ? '#5b21b6' : '#6C4BF6', fontWeight: 700, fontSize: '0.82rem', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Nunito, sans-serif' }}>
                <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>🎵</span>
                {postMusic?'Added ✓':'Music'}
              </button>
              
              <button 
                onClick={handlePost} 
                disabled={posting||(!postText.trim()&&!selectedImage&&!selectedVideo)}
                style={{ flex: 1.2, minWidth: '65px', padding: '12px 4px', borderRadius: '14px', background: (posting||(!postText.trim()&&!selectedImage&&!selectedVideo)) ? '#ffb3b5' : 'linear-gradient(135deg, #FF9F1C, #FF6B9D)', color: '#fff', fontWeight: 800, fontSize: '0.95rem', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Nunito, sans-serif', boxShadow: '0 4px 12px rgba(255, 107, 157, 0.2)' }}>
                <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{uploadingImage?'📤':(posting?'...':'🐾')}</span>
                {posting?'Posting...':'Post'}
              </button>
            </div>

            {showLocationPicker&&(
              <div className="feed-picker">
                <div className="feed-picker-title">📍 Select or type location</div>
                <input value={locationSearch} onChange={e=>setLocationSearch(e.target.value)} placeholder="Search city..." className="feed-picker-input" />
                <div className="feed-picker-chips">
                  {POPULAR_LOCATIONS.filter(l=>l.toLowerCase().includes(locationSearch.toLowerCase())).map(loc=>(
                    <span key={loc} className={`feed-picker-chip${postLocation===loc?' selected':''}`} onClick={()=>{setPostLocation(loc);setShowLocationPicker(false);setLocationSearch('')}}>{loc}</span>
                  ))}
                  {locationSearch&&!POPULAR_LOCATIONS.includes(locationSearch)&&(
                    <span className="feed-picker-chip orange" onClick={()=>{setPostLocation(locationSearch);setShowLocationPicker(false);setLocationSearch('')}}>+ Use "{locationSearch}"</span>
                  )}
                </div>
                {postLocation&&<button className="feed-picker-remove" onClick={()=>{setPostLocation('');setShowLocationPicker(false)}}>✕ Remove</button>}
              </div>
            )}

            {showFeelingPicker&&(
              <div className="feed-picker" style={{background:'#FFF8F0'}}>
                <div className="feed-picker-title" style={{color:'#FF6B35'}}>😊 How are you feeling?</div>
                <div className="feed-picker-chips">
                  {FEELINGS.map(f=>(
                    <span key={f} className={`feed-picker-chip feeling${postFeeling===f?' selected':''}`} onClick={()=>{setPostFeeling(f);setShowFeelingPicker(false)}}>{f}</span>
                  ))}
                </div>
                {postFeeling&&<button className="feed-picker-remove" onClick={()=>{setPostFeeling('');setShowFeelingPicker(false)}}>✕ Remove</button>}
              </div>
            )}

            {showMusicPicker && (
              <div className="feed-picker" style={{background:'#FFF'}}>
                <div className="feed-picker-title" style={{color:'#1E1347'}}>🎵 Add Music</div>
                <input 
                  autoFocus
                  placeholder="Search songs, artists..." 
                  value={musicSearchQuery} 
                  onChange={e=>setMusicSearchQuery(e.target.value)}
                  style={{width:'100%', padding:'10px 14px', borderRadius:12, border:'1px solid #E5E7EB', marginBottom:12, fontFamily:'Nunito, sans-serif', boxSizing:'border-box', outline:'none'}}
                />
                {isSearchingMusic && <div style={{fontSize:'0.82rem', color:'#6B7280', textAlign:'center', padding:10}}>Searching...</div>}
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY:'auto' }}>
                  {!isSearchingMusic && musicResults.map(song => (
                    <div key={song.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px', background:'#F9FAFB', borderRadius:10, cursor:'pointer', border: postMusic?.id === song.id ? '2px solid #6C4BF6' : '1px solid transparent' }} onClick={()=>{setPostMusic(song); setPostMusicStart(0)}}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, overflow:'hidden' }}>
                        <img src={song.cover} style={{width:40, height:40, borderRadius:8, objectFit:'cover'}} />
                        <div style={{minWidth:0}}>
                          <div style={{ fontWeight:800, fontSize:'0.85rem', color:'#1E1347', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{song.title}</div>
                          <div style={{ fontSize:'0.75rem', color:'#6B7280', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{song.artist}</div>
                        </div>
                      </div>
                      <button style={{ background:'none', border:'none', fontSize:'1.4rem', cursor:'pointer', padding:5 }} onClick={(e)=>togglePreviewAudio(e, song)}>
                        {playingTrackId === song.id ? '⏸️' : '▶️'}
                      </button>
                    </div>
                  ))}
                </div>

                {postMusic&& (
                  <div style={{marginTop:16, borderTop:'1px solid #E5E7EB', paddingTop:12}}>
                    <div style={{fontSize:'0.82rem', fontWeight:700, color:'#374151', marginBottom:8}}>Select Start Time: <span style={{color:'#6C4BF6'}}>{postMusicStart}s</span></div>
                    <input type="range" min="0" max="30" value={postMusicStart} onChange={e=>setPostMusicStart(parseInt(e.target.value))} style={{width:'100%', accentColor:'#6C4BF6'}} />
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.7rem', color:'#9CA3AF'}}><span>0s</span><span>30s Max</span></div>
                    <button style={{width:'100%', padding:'10px', background:'#F3F0FF', color:'#6C4BF6', border:'none', borderRadius:10, fontWeight:700, marginTop:10, cursor:'pointer'}} onClick={()=>{setPostMusic(null); setShowMusicPicker(false); stopPreviewAudio()}}>✕ Remove Track</button>
                    <button style={{width:'100%', padding:'10px', background:'linear-gradient(135deg, #FF6B35, #6C4BF6)', color:'#fff', border:'none', borderRadius:10, fontWeight:800, marginTop:6, cursor:'pointer'}} onClick={()=>{setShowMusicPicker(false); stopPreviewAudio()}}>✓ Done</button>
                  </div>
                )}
              </div>
            )}

            {(postLocation||postFeeling)&&(
              <div className="feed-selected-tags">
                {postLocation&&<span className="feed-tag-loc">📍 {postLocation}</span>}
                {postFeeling&&<span className="feed-tag-feel">{postFeeling}</span>}
              </div>
            )}
            <div className="feed-hashtag-hint">💡 Tip: Use #hashtags in your text to tag topics</div>
          </div>

          {(activeTagFilter || isVetFilter) && (
            <div style={{ background: isVetFilter ? '#E8F8E8' : '#F0EBFF', border: `1px solid ${isVetFilter ? '#86EFAC' : '#D8B4FE'}`, borderRadius: 12, padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, color: isVetFilter ? '#16A34A' : '#6C4BF6', fontSize: '0.88rem' }}>
                🔍 Showing: <strong>{isVetFilter && '⚕️ Vet Posts'} {activeTagFilter && (isVetFilter ? `+ #${activeTagFilter}` : `posts tagged: #${activeTagFilter}`)}</strong>
              </span>
              <button onClick={() => router.push('/feed')} style={{ background: isVetFilter ? '#16A34A' : '#6C4BF6', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 12px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}>✕ Clear Filter</button>
            </div>
          )}

          {displayedPosts.length===0&&(
            <div className="card feed-empty">
              <div style={{fontSize:'3rem',marginBottom:10}}>🐾</div>
              <div style={{fontFamily:"'Baloo 2',cursive",fontWeight:800,fontSize:'1.1rem'}}>{(activeTagFilter || isVetFilter) ? `No posts found` : 'No posts yet!'}</div>
              <div style={{fontSize:'0.88rem',marginTop:4}}>{(activeTagFilter || isVetFilter) ? 'Try a different filter or clear it.' : 'Be the first to share your pet’s story ❤️'}</div>
              {(activeTagFilter || isVetFilter) && <button onClick={() => router.push('/feed')} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 10, background: isVetFilter ? '#E8F8E8' : '#F0EBFF', color: isVetFilter ? '#16A34A' : '#6C4BF6', border: 'none', fontWeight: 700, cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}>← Show all posts</button>}
            </div>
          )}

          {displayedPosts.map(post=>{
            // Defensive check for pets data
            if (!post || !post.pets) return null
            
            const isMyPost=user && post.pets.user_id===user.id
            const comments=activeComments[post.id]
            const postKey = `${post.type}-${post.id}`
            return (
              <div key={postKey} data-post-id={post.id} className="card feed-post fade-up" ref={el => { if (el && feedObserver.current) feedObserver.current.observe(el) }}>

                <div className="feed-post-header">
                  <div className={`feed-post-avatar${!isMyPost?' clickable':''}`} onClick={()=>!isMyPost&&router.push(`/user/${post.pets?.user_id}`)}>
                    {post.pets?.avatar_url?<img src={post.pets.avatar_url} alt="avatar"/>:(post.pets?.role?.toLowerCase() === 'vet' ? '🩺' : post.pets?.role?.toLowerCase() === 'supplier' ? '📦' : post.pets?.emoji||'🐾')}
                  </div>
                  <div className="feed-post-meta">
                    <div className={`feed-post-petname${!isMyPost?' clickable':''} ${post.pets?.role?.toLowerCase() === 'vet' ? 'vet-badge' : post.pets?.role?.toLowerCase() === 'supplier' ? 'supplier-badge' : ''}`} onClick={()=>!isMyPost&&router.push(`/user/${post.pets?.user_id}`)}>
                      {post.pets?.pet_name||'A Pet'}
                    </div>
                    <div className="feed-post-submeta">
                      by {post.pets?.owner_name} · {timeAgo(post.created_at)}
                      {post.edited&&<span className="feed-edited"> (edited)</span>}
                    </div>
                    {post.audio_name ? (() => {
                       try {
                         const m = JSON.parse(post.audio_name);
                         return (
                           <div onClick={toggleFeedPostAudio} style={{cursor:'pointer', fontSize:'0.75rem', fontWeight:800, color:'#6C4BF6', display:'inline-flex', alignItems:'center', gap:6, marginTop:4, padding:'4px 10px', background: !isFeedMuted ? '#E8E2FF' : '#F5F3FF', borderRadius:14, transition:'0.2s', border:'1px solid #E0D5FF', userSelect:'none'}}>
                             {!isFeedMuted && activeFeedPostId === post.id ? '🔊' : '🔇'} {m.title} · {m.artist}
                           </div>
                         )
                       } catch(e) { 
                         return (
                           <div onClick={toggleFeedPostAudio} style={{cursor:'pointer', fontSize:'0.75rem', fontWeight:800, color:'#6C4BF6', display:'inline-flex', alignItems:'center', gap:6, marginTop:4, padding:'4px 10px', background: !isFeedMuted ? '#E8E2FF' : '#F5F3FF', borderRadius:14, transition:'0.2s', border:'1px solid #E0D5FF', userSelect:'none'}}>
                             {!isFeedMuted && activeFeedPostId === post.id ? '🔊' : '🔇'} {post.audio_name}
                           </div>
                         ) 
                       }
                    })() : post.video_url && (
                       <div onClick={toggleFeedPostAudio} style={{cursor:'pointer', fontSize:'0.75rem', fontWeight:800, color:'#6B7280', display:'inline-flex', alignItems:'center', gap:6, marginTop:4, padding:'4px 10px', background: '#F9FAFB', borderRadius:14, transition:'0.2s', border:'1px solid #E5E7EB', userSelect:'none'}}>
                         {!isFeedMuted && activeFeedPostId === post.id ? '🔊' : '🔇'} Original Audio
                       </div>
                    )}
                  </div>
                  <div className="feed-menu-wrap" ref={openMenu===post.id?menuRef:null}>
                    <span className="feed-menu-trigger" onClick={()=>setOpenMenu(openMenu===post.id?null:post.id)}>···</span>
                    {openMenu===post.id&&(
                      <div className="feed-menu-dropdown">
                        {isMyPost?(
                          <>
                            <div className="feed-menu-item" onClick={()=>{setEditingPost(post.id);setEditText(post.content||post.caption||'');setOpenMenu(null)}}>✏️ Edit</div>
                            <div className="feed-menu-item danger" onClick={()=>handleDeletePost(post)}>🗑️ Delete</div>
                            <div className="feed-menu-item" onClick={()=>handleShare(post)}>🔗 Share</div>
                          </>
                        ):(
                          <>
                            <div className="feed-menu-item" onClick={()=>handleHidePost(post)}>🙈 Hide</div>
                            <div className="feed-menu-item" onClick={()=>handleShare(post)}>🔗 Share</div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {editingPost===post.id?(
                  <div className="feed-edit-wrap">
                    <textarea className="feed-edit-textarea" value={editText} onChange={e=>setEditText(e.target.value)} />
                    <div className="feed-edit-actions">
                      <button className="btn-primary" style={{padding:'6px 16px',fontSize:'0.82rem',borderRadius:8}} onClick={()=>handleEditPost(post)}>Save ✓</button>
                      <button className="btn-secondary" style={{padding:'6px 16px',fontSize:'0.82rem',borderRadius:8}} onClick={()=>{setEditingPost(null);setEditText('')}}>Cancel</button>
                    </div>
                  </div>
                ):(
                  (post.content||post.caption)&&(
                    <div className="feed-post-content">
                      <p className="feed-post-text">
                        {(post.content||post.caption).split(/(\s+)/).map((word,i)=>{
                          if (word.startsWith('#')) return <span key={i} className="feed-hashtag" onClick={()=>router.push(`/feed?tag=${word.slice(1)}`)}>{word}</span>
                          if (/^https?:\/\/[^\s]+$/.test(word)) return <a key={i} href={word} target="_blank" rel="noopener noreferrer" style={{color:'#6C4BF6',fontWeight:700,wordBreak:'break-all',textDecoration:'underline'}}>{word}</a>
                          return word
                        })}
                      </p>
                      {(post.location||post.feeling)&&(
                        <div className="feed-post-tags">
                          {post.location&&<span className="feed-tag-loc">📍 {post.location}</span>}
                          {post.feeling&&<span className="feed-tag-feel">{post.feeling}</span>}
                        </div>
                      )}
                    </div>
                  )
                )}

                {post.image_url&&(
                  <div className="feed-post-img-wrap" onClick={()=>setLightboxImg(post.image_url)}>
                    <img src={post.image_url} alt="post" className="feed-post-img" />
                  </div>
                )}

                {post.video_url&&(
                  <div className="feed-post-video-wrap">
                    <video ref={el => feedVideoRefs.current[post.id] = el} src={post.video_url} muted={post.audio_url ? true : isFeedMuted} loop playsInline controls={false} className="feed-post-video" />
                  </div>
                )}

                {post.audio_url && (() => {
                  try {
                    const m = JSON.parse(post.audio_name);
                    return <audio ref={el => feedAudioRefs.current[post.id] = el} src={post.audio_url + '#t=' + (m.start||0)} loop />
                  } catch(e) {
                    return <audio ref={el => feedAudioRefs.current[post.id] = el} src={post.audio_url} loop />
                  }
                })()}

                <div className="feed-post-stats">
                  <span>❤️ {post.likes||0} paws</span>
                  <div style={{display:'flex',gap:10}}>
                    <span className="feed-stats-link" onClick={()=>toggleComments(post.id)}>
                      💬 {activeComments[post.id] !== undefined ? activeComments[post.id].length : (post.comments_count||0)}
                    </span>
                    <span>🔗 {post.shares_count||0}</span>
                  </div>
                </div>

                <div className="feed-post-actions">
                  {[
                    {label:post.liked_by_me?'❤️ Pawed':'🐾 Paw it',action:()=>toggleLike(post),active:post.liked_by_me},
                    {label:'💬 Comment',action:()=>toggleComments(post.id),active:comments!==undefined},
                    {label:'🔗 Share',action:()=>handleShare(post),active:false},
                  ].map(btn=>(
                    <button key={btn.label} className={`feed-action-btn${btn.active?' active':''}`} onClick={btn.action}>{btn.label}</button>
                  ))}
                </div>

                {comments!==undefined&&(
                  <div className="feed-comments">
                    <div className="feed-comment-input-row">
                      <div className="feed-comment-avatar">
                        {pet?.avatar_url?<img src={pet.avatar_url} alt="me"/>:pet?.emoji||'🐾'}
                      </div>
                      <input
                        className="feed-comment-input"
                        value={commentTexts[post.id]||''}
                        onChange={e=>setCommentTexts(prev=>({...prev,[post.id]:e.target.value}))}
                        onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&e.ctrlKey)handleComment(post.id)}}
                        placeholder="Write a comment..."
                      />
                      <button className="feed-comment-send" onClick={()=>handleComment(post.id)} disabled={!commentTexts[post.id]?.trim()}>Send</button>
                    </div>

                    {comments.length===0?(
                      <p className="feed-no-comments">No comments yet. Be the first! 🐾</p>
                    ):comments.map(comment=>(
                      <div key={comment.id} className="feed-comment">
                        <div className="feed-comment-icon" onClick={()=>comment.pets?.user_id!==user.id&&router.push(`/user/${comment.pets?.user_id}`)}>
                          {comment.pets?.avatar_url?<img src={comment.pets.avatar_url} alt="avatar"/>:comment.pets?.emoji||'🐾'}
                        </div>
                        <div className="feed-comment-body">
                          <div className="feed-comment-bubble">
                            <div className="feed-comment-name">{comment.pets?.pet_name||'A Pet'}</div>
                            <p className="feed-comment-text">{comment.content}</p>
                          </div>
                          <div className="feed-comment-meta">
                            <span>{timeAgo(comment.created_at)}</span>
                            <button className={`feed-comment-action${comment.likedByMe?' liked':''}`} onClick={()=>handleLikeComment(comment,post.id)}>
                              {comment.likedByMe?'❤️':'🤍'} {comment.likes>0?comment.likes:''} Like
                            </button>
                            <button className="feed-comment-action" onClick={()=>setReplyTo(prev=>({...prev,[post.id]:prev[post.id]===comment.id?null:comment.id}))}>💬 Reply</button>
                            {comment.user_id===user.id&&<button className="feed-comment-action danger" onClick={()=>handleDeleteComment(comment,post.id)}>🗑️</button>}
                          </div>

                          {replyTo[post.id]===comment.id&&(
                            <div className="feed-reply-row">
                              <input
                                className="feed-comment-input"
                                value={commentTexts[comment.id]||''}
                                onChange={e=>setCommentTexts(prev=>({...prev,[comment.id]:e.target.value}))}
                                onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&e.ctrlKey)handleComment(post.id,comment.id)}}
                                placeholder={`Reply to ${comment.pets?.pet_name}...`}
                              />
                              <button className="feed-comment-send small" onClick={()=>handleComment(post.id,comment.id)} disabled={!commentTexts[comment.id]?.trim()}>Reply</button>
                            </div>
                          )}

                          {comment.replies?.length>0&&(
                            <div className="feed-replies">
                              {comment.replies.map(reply=>(
                                <div key={reply.id} className="feed-reply">
                                  <div className="feed-reply-avatar">{reply.pets?.avatar_url?<img src={reply.pets.avatar_url} alt="avatar"/>:(reply.pets?.role?.toLowerCase() === 'vet' ? '🩺' : reply.pets?.role?.toLowerCase() === 'supplier' ? '📦' : reply.pets?.emoji||'🐾')}</div>
                                  <div className="feed-reply-bubble">
                                    <div className="feed-comment-name">{reply.pets?.pet_name}</div>
                                    <p className="feed-comment-text">{reply.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {hasMore && (
            <div id="infinite-scroll-trigger" ref={el => { if (el && feedObserver.current) feedObserver.current.observe(el) }} style={{ padding: '20px', textAlign: 'center', color: '#6C4BF6', fontSize: '1.2rem' }}>
              {loadingMore ? '🐾 Loading more...' : 'Scroll for more paws...'}
            </div>
          )}
          {!hasMore && posts.length > 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.9rem' }}>
              ✨ You've reached the end of the universe! 🐾
            </div>
          )}
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className="feed-right-sidebar">
          <div className="card">
            <div className="feed-sidebar-title">🐾 Pets You May Know</div>
            {suggestions.length===0&&<p className="feed-sidebar-empty">Invite friends to join PawVerse!</p>}
            {suggestions.map(s=>(
              <div key={s.id} className="feed-suggestion-row">
                <div className="feed-suggestion-avatar" onClick={()=>s.user_id!==user.id&&router.push(`/user/${s.user_id}`)}>
                  {s.avatar_url?<img src={s.avatar_url} alt="avatar"/>:(s.role?.toLowerCase() === 'vet' ? '🩺' : s.role?.toLowerCase() === 'supplier' ? '📦' : s.emoji||'🐾')}
                </div>
                <div className="feed-suggestion-info">
                  <div className={`feed-suggestion-name ${s.role === 'vet' ? 'vet-badge' : s.role === 'supplier' ? 'supplier-badge' : ''}`} onClick={()=>s.user_id!==user.id&&router.push(`/user/${s.user_id}`)}>{s.pet_name}</div>
                  <div className="feed-suggestion-breed">{s.pet_breed}</div>
                </div>
                <button className={!friendStatuses[s.user_id]?'btn-secondary':'feed-friend-btn-done'} onClick={()=>handleAddFriend(s)} disabled={!!friendStatuses[s.user_id]} style={{padding:'4px 10px',fontSize:'0.72rem',borderRadius:8,border:'none',fontFamily:'Nunito,sans-serif',fontWeight:700,cursor:friendStatuses[s.user_id]?'default':'pointer',background:friendStatuses[s.user_id]?'#F3F0FF':'',color:friendStatuses[s.user_id]?'#6C4BF6':''}}>
                  {getFriendButtonLabel(s.user_id)}
                </button>
              </div>
            ))}
          </div>
          <div className="card feed-trending-card">
            <div className="feed-sidebar-title">🔥 Trending Tags</div>
            <div className="feed-trending-tags">
              {trendingTags.map((t,i)=>(
                <span key={t} className="feed-trending-chip" style={{background:['#FFE8CC','#E8F8E8','#F0EBFF','#FFE8F0','#E8F4FF'][i%5]}} onClick={()=>router.push(`/feed?tag=${t.replace('#','')}`)}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* SHARE MODAL */}
      {shareModal&&(
        <div className="feed-modal-overlay" onClick={()=>setShareModal(null)}>
          <div className="feed-modal-sheet" onClick={e=>e.stopPropagation()}>
            <div className="feed-modal-title">🔗 Share Post</div>
            <div className="feed-modal-sub">Choose how you want to share</div>
            <div className="feed-share-grid">
              {[
                {id:'whatsapp',emoji:'💬',label:'WhatsApp',color:'#25D366',bg:'#E8FFF0'},
                {id:'telegram',emoji:'✈️',label:'Telegram',color:'#0088CC',bg:'#E8F6FF'},
                {id:'twitter',emoji:'🐦',label:'Twitter',color:'#1DA1F2',bg:'#E8F5FF'},
                {id:'facebook',emoji:'📘',label:'Facebook',color:'#1877F2',bg:'#EAF0FF'},
                {id:'friends',emoji:'🐾',label:'Friends',color:'#6C4BF6',bg:'#F0EBFF'},
                {id:'email',emoji:'📧',label:'Email',color:'#FF6B35',bg:'#FFF0E8'},
                {id:'copy',emoji:'📋',label:'Copy Link',color:'#374151',bg:'#F3F4F6'},
              ].map(opt=>(
                <div key={opt.id} className="feed-share-option" style={{background:opt.bg}} onClick={()=>shareVia(opt.id,shareModal)}>
                  <div className="feed-share-emoji">{opt.emoji}</div>
                  <div className="feed-share-label" style={{color:opt.color}}>{opt.label}</div>
                </div>
              ))}
            </div>
            <button className="feed-modal-cancel" onClick={()=>setShareModal(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* SHARE TO FRIENDS MODAL */}
      {shareToFriendsModal&&(
        <div className="feed-modal-overlay" onClick={()=>setShareToFriendsModal(null)}>
          <div className="feed-modal-center" onClick={e=>e.stopPropagation()}>
            <div className="feed-modal-title" style={{marginBottom:14}}>🐾 Share with Friends</div>
            {friends.length===0?(
              <div style={{textAlign:'center',color:'#6B7280',padding:'20px 0'}}>
                <div style={{fontSize:'2.5rem',marginBottom:8}}>🤷</div>
                <div style={{fontWeight:700}}>No friends yet!</div>
              </div>
            ):friends.map(f=>(
              <div key={f.id} className="feed-friend-share-row">
                <div className="feed-friend-share-avatar">{f.avatar_url?<img src={f.avatar_url} alt="av"/>:f.emoji}</div>
                <div className="feed-friend-share-info">
                  <div className={`feed-suggestion-name ${f.role === 'vet' ? 'vet-badge' : f.role === 'supplier' ? 'supplier-badge' : ''}`}>{f.pet_name}</div>
                  <div className="feed-suggestion-breed">by {f.owner_name}</div>
                </div>
                <button className="btn-primary" style={{padding:'6px 14px',fontSize:'0.78rem',borderRadius:10}} onClick={()=>shareToFriend(f,shareToFriendsModal)}>Send 📤</button>
              </div>
            ))}
            <button className="feed-modal-cancel" style={{marginTop:14}} onClick={()=>setShareToFriendsModal(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}