import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'

const EMOJIS = ['😀','😂','🥰','😍','🤩','😎','🥳','😢','😭','😤','🤔','😴','🤗','😜','🥺','❤️','🧡','💛','💚','💙','💜','🖤','💕','💞','💓','💗','💖','💝','🎉','🔥','✨','⭐','🌟','💫','🎊','🎈','🎁','🏆','👍','👎','👏','🙌','🤝','🐾','🐶','🐱','🐇','🦜','🐠','🐹','🦴','🐕','🐈','🌸','🌺','🌻','🌹','🍀','🌈','☀️','🌙','⭐','❄️']

export default function Chat() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [pet, setPet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [friends, setFriends] = useState([])
  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv] = useState(null)
  const [activeFriend, setActiveFriend] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState({})
  const [totalUnread, setTotalUnread] = useState(0)

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const emojiRef = useRef(null)
  const msgChannelRef = useRef(null)
  const globalChannelRef = useRef(null)
  const activeConvRef = useRef(null)
  const userRef = useRef(null)
  const petRef = useRef(null)
  const audioRef = useRef(null)

  // Keep refs in sync with state
  useEffect(() => { activeConvRef.current = activeConv }, [activeConv])
  useEffect(() => { userRef.current = user }, [user])
  useEffect(() => { petRef.current = pet }, [pet])

  useEffect(() => { init() }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setShowEmoji(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cleanup channels on unmount
  useEffect(() => {
    return () => {
      if (msgChannelRef.current) supabase.removeChannel(msgChannelRef.current)
      if (globalChannelRef.current) supabase.removeChannel(globalChannelRef.current)
    }
  }, [])

  const playMessageSound = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/message.mp3')
        audioRef.current.volume = 0.5
      }
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
    } catch (e) {}
  }

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    setUser(session.user)
    userRef.current = session.user

    const { data: petData } = await supabase
      .from('pets').select('*').eq('user_id', session.user.id).single()
    setPet(petData)
    petRef.current = petData

    await fetchFriendsAndConversations(session.user.id)
    setupGlobalListener(session.user.id)
    setLoading(false)
  }

  // Global listener — catches ALL new messages for this user
  const setupGlobalListener = (userId) => {
    if (globalChannelRef.current) supabase.removeChannel(globalChannelRef.current)

    const channel = supabase
      .channel(`global-messages-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, async (payload) => {
        const newMsg = payload.new

        // Check if this message belongs to one of my conversations
        const { data: conv } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', newMsg.conversation_id)
          .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
          .single()

        if (!conv) return // Not my conversation

        const isFromMe = newMsg.sender_id === userId
        const isInActiveConv = activeConvRef.current?.id === newMsg.conversation_id

        if (!isFromMe) {
          // Play sound for incoming messages
          playMessageSound()

          if (isInActiveConv) {
            // Auto mark as read since window is open
            await supabase.from('messages')
              .update({ is_read: true })
              .eq('id', newMsg.id)
            newMsg.is_read = true
          } else {
            // Increment unread count for that conversation
            setUnreadCounts(prev => ({
              ...prev,
              [newMsg.conversation_id]: (prev[newMsg.conversation_id] || 0) + 1
            }))
            setTotalUnread(prev => prev + 1)
          }
        }

        // If message is for active conversation, add to messages list
        if (isInActiveConv) {
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }

        // Update conversation last message preview
        setConversations(prev => prev.map(c =>
          c.id === newMsg.conversation_id
            ? { ...c, last_message: newMsg.content || '📸 Image', last_message_at: newMsg.created_at }
            : c
        ))
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const updated = payload.new
        // Update read status in real-time for sent messages
        setMessages(prev => prev.map(m =>
          m.id === updated.id ? { ...m, is_read: updated.is_read } : m
        ))
      })
      .subscribe()

    globalChannelRef.current = channel
  }

  const fetchFriendsAndConversations = async (userId) => {
    const { data: sent } = await supabase
      .from('friend_requests').select('*')
      .eq('sender_id', userId).eq('status', 'accepted')
    const { data: received } = await supabase
      .from('friend_requests').select('*')
      .eq('receiver_id', userId).eq('status', 'accepted')

    const friendList = []
    for (const req of (sent || [])) {
      const { data: p } = await supabase.from('pets').select('*').eq('user_id', req.receiver_id).single()
      if (p) friendList.push(p)
    }
    for (const req of (received || [])) {
      const { data: p } = await supabase.from('pets').select('*').eq('user_id', req.sender_id).single()
      if (p) friendList.push(p)
    }
    setFriends(friendList)

    const { data: convs } = await supabase
      .from('conversations').select('*')
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
      .order('last_message_at', { ascending: false })
    setConversations(convs || [])

    // Count unread per conversation
    let total = 0
    const counts = {}
    for (const conv of (convs || [])) {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .eq('is_read', false)
        .neq('sender_id', userId)
      counts[conv.id] = count || 0
      total += count || 0
    }
    setUnreadCounts(counts)
    setTotalUnread(total)
  }

  const openConversation = async (friend) => {
    setActiveFriend(friend)
    setMessages([])
    setShowEmoji(false)

    let conv = conversations.find(c =>
      (c.participant_1 === user.id && c.participant_2 === friend.user_id) ||
      (c.participant_2 === user.id && c.participant_1 === friend.user_id)
    )

    if (!conv) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          participant_1: user.id,
          participant_2: friend.user_id,
          last_message: null,
          last_message_at: new Date().toISOString()
        })
        .select().single()
      conv = newConv
      setConversations(prev => [conv, ...prev])
    }

    setActiveConv(conv)
    activeConvRef.current = conv

    // Fetch messages
    const { data: msgs } = await supabase
      .from('messages').select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true })
    setMessages(msgs || [])

    // Mark all as read
    const unreadMsgIds = (msgs || [])
      .filter(m => !m.is_read && m.sender_id !== user.id)
      .map(m => m.id)

    if (unreadMsgIds.length > 0) {
      await supabase.from('messages')
        .update({ is_read: true })
        .in('id', unreadMsgIds)

      // Update local read status
      setMessages(prev => prev.map(m =>
        unreadMsgIds.includes(m.id) ? { ...m, is_read: true } : m
      ))
    }

    // Reset unread count for this conversation
    const prevUnread = unreadCounts[conv.id] || 0
    setUnreadCounts(prev => ({ ...prev, [conv.id]: 0 }))
    setTotalUnread(prev => Math.max(0, prev - prevUnread))
  }

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage) || !activeConv) return
    setSending(true)

    try {
      let imageUrl = null
      if (selectedImage) {
        setUploadingImage(true)
        const ext = selectedImage.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('chat-images')
          .upload(fileName, selectedImage, { cacheControl: '3600', upsert: false })
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage
          .from('chat-images').getPublicUrl(fileName)
        imageUrl = publicUrl
        setUploadingImage(false)
      }

      const msgData = {
        conversation_id: activeConv.id,
        sender_id: user.id,
        content: newMessage.trim() || '',
        image_url: imageUrl,
        is_read: false,
      }

      await supabase.from('messages').insert(msgData)

      // Update conversation preview
      await supabase.from('conversations').update({
        last_message: newMessage.trim() || '📸 Image',
        last_message_at: new Date().toISOString()
      }).eq('id', activeConv.id)

      // Send notification
      await supabase.from('notifications').insert({
        user_id: activeFriend.user_id,
        type: 'message',
        message: `${pet.pet_name} sent you a message! 💬`,
      })

      setNewMessage('')
      setSelectedImage(null)
      setImagePreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      alert('Failed to send message. Please try again.')
      setUploadingImage(false)
    }
    setSending(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return }
    setSelectedImage(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

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
   <div style={{ background: 'linear-gradient(135deg, rgba(213, 134, 200, 1), rgba(105, 201, 249, 1))',padding:'50px', minHeight: '100vh',}}>
      <NavBar user={user} pet={pet} unreadMessages={totalUnread} />

      <div style={{ maxWidth: 1000, margin: '58px auto 0', height: 'calc(100vh - 58px)', display: 'flex', overflow: 'hidden' }}>

        {/* LEFT — Friend List */}
        <div style={{ width: 300, border: '2px solid #000',  background: 'linear-gradient(135deg, rgba(213, 134, 200, 1), rgba(105, 201, 249, 1))', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '16px 14px 10px', borderBottom: '1px solid #EDE8FF' }}>
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.2rem', color: '#1E1347' }}>💬 Messages</div>
            <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: 2 }}>{friends.length} friend{friends.length !== 1 ? 's' : ''}</div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {friends.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center'}}>
                <div style={{ fontSize: '2.5rem', marginBottom: 8, }}>🐾</div>
                <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '0.95rem', color: '#1E1347', }}>No friends yet</div>
                <p style={{ color: '#ffffffff', fontSize: '1rem', marginTop: 4 }}>Add friends first to start chatting!</p>
                <button onClick={() => router.push('/friends')} className="btn-primary"
                  style={{ marginTop: 10, padding: '7px 16px', fontSize: '0.8rem', borderRadius: 10 }}>
                  👫 Find Friends
                </button>
              </div>
            ) : (
              friends.map(friend => {
                const conv = conversations.find(c =>
                  (c.participant_1 === user.id && c.participant_2 === friend.user_id) ||
                  (c.participant_2 === user.id && c.participant_1 === friend.user_id)
                )
                const unread = conv ? (unreadCounts[conv.id] || 0) : 0
                const isActive = activeFriend?.user_id === friend.user_id

                return (
                  <div key={friend.id} onClick={() => openConversation(friend)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                      cursor: 'pointer', background: isActive ? '#F3F0FF' : 'transparent',
                      borderBottom: '1px solid #F9F5FF', transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#FAFAFA' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{
                      width: 46, height: 46, borderRadius: '50%', background: '#FFE8F0',
                      border: `2px solid ${isActive ? '#6C4BF6' : '#FF6B35'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.4rem', overflow: 'hidden', flexShrink: 0
                    }}>
                      {friend.avatar_url
                        ? <img src={friend.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : friend.emoji || '🐾'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '0.9rem', color: '#1E1347' }}>
                          {friend.pet_name}
                        </span>
                        {conv?.last_message_at && (
                          <span style={{ fontSize: '0.68rem', color: '#6B7280' }}>{timeAgo(conv.last_message_at)}</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: unread > 0 ? '#6C4BF6' : '#6B7280', fontWeight: unread > 0 ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                          {conv?.last_message || 'Start a conversation 🐾'}
                        </span>
                        {unread > 0 && (
                          <span style={{
                            minWidth: 18, height: 18, background: '#FF4757',
                            borderRadius: '50%', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '0.65rem',
                            fontWeight: 800, color: '#fff', flexShrink: 0
                          }}>{unread}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* RIGHT — Chat Window */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, rgba(213, 134, 200, 1), rgba(105, 201, 249, 1))',border:'2px solid #000', position: 'relative' }}>
          {!activeConv ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <div style={{ fontSize: '4rem' }}>🐾</div>
              <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.3rem', color: '#1E1347' }}>
                Select a friend to chat
              </div>
              <p style={{ color: '#6B7280', fontSize: '0.88rem' }}>Pick a friend from the left to start chatting!</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #EDE8FF', background: 'linear-gradient(135deg, rgba(213, 134, 200, 1), rgba(105, 201, 249, 1))', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: '50%', background: '#FFE8F0',
                  border: '2px solid #FF6B35', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '1.3rem', overflow: 'hidden'
                }}>
                  {activeFriend?.avatar_url
                    ? <img src={activeFriend.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : activeFriend?.emoji || '🐾'}
                </div>
                <div>
                  <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1rem', color: '#1E1347' }}>
                    {activeFriend?.pet_name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#000000ff', fontWeight: 700 }}>🟢 Friends</div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', marginTop: 40 }}>
                    <div style={{ fontSize: '3rem', marginBottom: 8 }}>👋</div>
                    <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, color: '#1E1347' }}>
                      Say hi to {activeFriend?.pet_name}!
                    </div>
                    <p style={{ color: '#6B7280', fontSize: '0.82rem', marginTop: 4 }}>
                      This is the beginning of your conversation 🐾
                    </p>
                  </div>
                )}

                {messages.map((msg, idx) => {
                  const isMe = msg.sender_id === user.id
                  const prevMsg = messages[idx - 1]
                  const showAvatar = !isMe && (!prevMsg || prevMsg.sender_id !== msg.sender_id)
                  const isLastFromSender = !messages[idx + 1] || messages[idx + 1].sender_id !== msg.sender_id

                  return (
                    <div key={msg.id} style={{
                      display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row',
                      alignItems: 'flex-end', gap: 6, marginBottom: 2
                    }}>
                      {!isMe && (
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%', background: '#FFE8F0',
                          border: '1.5px solid #FF6B35', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: '0.85rem', overflow: 'hidden',
                          flexShrink: 0, opacity: showAvatar ? 1 : 0
                        }}>
                          {activeFriend?.avatar_url
                            ? <img src={activeFriend.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : activeFriend?.emoji || '🐾'}
                        </div>
                      )}

                      <div style={{ maxWidth: '65%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                        {msg.image_url && (
                          <img src={msg.image_url} alt="shared"
                            style={{ maxWidth: 220, maxHeight: 220, borderRadius: 14, objectFit: 'cover', display: 'block', border: '2px solid #EDE8FF', marginBottom: msg.content ? 4 : 0 }} />
                        )}
                        {/* Shared Post Card */}
                        {msg.shared_post_preview && (() => {
                          let preview = null
                          try { preview = JSON.parse(msg.shared_post_preview) } catch(e) {}
                          if (!preview) return null
                          return (
                            <div
                              onClick={() => router.push(`/post/${preview.id}`)}
                              style={{
                                background: isMe ? 'rgba(255,255,255,0.15)' : '#F9F5FF',
                                border: isMe ? '1px solid rgba(255,255,255,0.3)' : '1px solid #EDE8FF',
                                borderRadius: 14, overflow: 'hidden', maxWidth: 240,
                                cursor: 'pointer', marginBottom: msg.content ? 6 : 0,
                                transition: 'transform 0.15s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              {preview.image_url && (
                                <img src={preview.image_url} alt="post"
                                  style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }} />
                              )}
                              <div style={{ padding: '8px 10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#FFE8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', overflow: 'hidden', flexShrink: 0, border: '1.5px solid #FF6B35' }}>
                                    {preview.avatar_url ? <img src={preview.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="av" /> : preview.pet_emoji}
                                  </div>
                                  <span style={{ fontWeight: 800, fontSize: '0.72rem', color: isMe ? 'rgba(255,255,255,0.9)' : '#6C4BF6' }}>{preview.pet_name}</span>
                                </div>
                                {preview.content && (
                                  <p style={{ fontSize: '0.75rem', color: isMe ? 'rgba(255,255,255,0.85)' : '#374151', margin: 0, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                    {preview.content}
                                  </p>
                                )}
                                <div style={{ marginTop: 5, fontSize: '0.65rem', fontWeight: 700, color: isMe ? 'rgba(255,255,255,0.7)' : '#9CA3AF' }}>
                                  🐾 PawVerse Post · Tap to view
                                </div>
                              </div>
                            </div>
                          )
                        })()}
                        {msg.content && !(msg.shared_post_preview) && (
                          <div style={{
                            padding: '9px 13px',
                            background: isMe ? 'linear-gradient(135deg, #FF6B35, #6C4BF6)' : '#fff',
                            color: isMe ? '#fff' : '#1E1347',
                            borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            fontSize: '0.88rem', lineHeight: 1.5,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            border: isMe ? 'none' : '1px solid #EDE8FF',
                            wordBreak: 'break-word'
                          }}>
                            {msg.content}
                          </div>
                        )}
                        {isLastFromSender && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                            <span style={{ fontSize: '0.65rem', color: '#9CA3AF' }}>{formatTime(msg.created_at)}</span>
                            {isMe && (
                              <span style={{
                                fontSize: '0.72rem',
                                color: msg.is_read ? '#6C4BF6' : '#9CA3AF',
                                fontWeight: 700
                              }}>
                                {msg.is_read ? '✓✓' : '✓'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Image Preview */}
              {imagePreview && (
                <div style={{ padding: '8px 16px 0', display: 'flex' }}>
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={imagePreview} alt="preview"
                      style={{ height: 80, borderRadius: 10, objectFit: 'cover', border: '2px solid #EDE8FF' }} />
                    <button
                      onClick={() => { setSelectedImage(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                      style={{
                        position: 'absolute', top: -8, right: -8, width: 22, height: 22,
                        borderRadius: '50%', background: '#FF4757', color: '#fff',
                        border: 'none', cursor: 'pointer', fontSize: '0.7rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800
                      }}>✕</button>
                  </div>
                </div>
              )}

              {/* Emoji Picker */}
              {showEmoji && (
                <div ref={emojiRef} style={{
                  position: 'absolute', bottom: 70, left: 60,
                  background: '#fff', border: '1px solid #EDE8FF',
                  borderRadius: 16, padding: 12, zIndex: 100,
                  boxShadow: '0 8px 32px rgba(108,75,246,0.15)',
                  display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)',
                  gap: 4, maxWidth: 300
                }}>
                  {EMOJIS.map(emoji => (
                    <button key={emoji}
                      onClick={() => setNewMessage(prev => prev + emoji)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '1.2rem', padding: 4, borderRadius: 6
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F3F0FF'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >{emoji}</button>
                  ))}
                </div>
              )}

              {/* Input Bar */}
              <div style={{
                padding: '10px 14px', borderTop: '1px solid #EDE8FF',
                background: '#fff', display: 'flex', alignItems: 'flex-end', gap: 8
              }}>
                <input ref={fileInputRef} type="file" accept="image/*"
                  onChange={handleImageSelect} style={{ display: 'none' }} />
                <button onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', border: 'none',
                    background: '#F3F0FF', cursor: 'pointer', fontSize: '1rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>📸</button>

                <button onClick={() => setShowEmoji(prev => !prev)}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', border: 'none',
                    background: showEmoji ? '#EDE8FF' : '#F3F0FF',
                    cursor: 'pointer', fontSize: '1rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>😊</button>

                <textarea
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${activeFriend?.pet_name}... (Enter to send)`}
                  rows={1}
                  style={{
                    flex: 1, background: '#F3F0FF', border: 'none', borderRadius: 20,
                    padding: '9px 14px', fontFamily: 'Nunito, sans-serif',
                    fontSize: '0.88rem', color: '#1E1347', outline: 'none',
                    resize: 'none', maxHeight: 100, lineHeight: 1.5
                  }}
                />

                <button onClick={sendMessage}
                  disabled={sending || (!newMessage.trim() && !selectedImage)}
                  style={{
                    width: 38, height: 38, borderRadius: '50%', border: 'none',
                    background: (sending || (!newMessage.trim() && !selectedImage))
                      ? '#EDE8FF' : 'linear-gradient(135deg, #FF6B35, #6C4BF6)',
                    cursor: (sending || (!newMessage.trim() && !selectedImage)) ? 'default' : 'pointer',
                    fontSize: '1rem', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s'
                  }}>
                  {uploadingImage ? '⏳' : sending ? '...' : '🐾'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}