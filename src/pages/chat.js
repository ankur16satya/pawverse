import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'

const SAMPLE_CHATS = [
  { id:1, name:'Bruno 🐶', emoji:'🐶', bg:'#FFE8CC', online:true, last:'Woof! Can we play tomorrow?', time:'2m', unread:3 },
  { id:2, name:'Luna 🐈‍⬛', emoji:'🐈‍⬛', bg:'#D4C5F9', online:true, last:'My hooman got me new toys!', time:'14m', unread:1 },
  { id:3, name:'Coco 🦜', emoji:'🦜', bg:'#C8F7C5', online:false, last:'Pretty bird! Pretty bird! 🌈', time:'1h', unread:0 },
]

const INITIAL_MSGS = [
  { from:'them', text:'Woof woof! 🐾 Can we meet at the park tomorrow?', time:'10:22 AM' },
  { from:'me',   text:'Meow! Yes, I\'d love that! What time? 😻', time:'10:24 AM' },
  { from:'them', text:'Around 5pm? Near the fountain! 🌳', time:'10:25 AM' },
]

export default function Chat() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [pet, setPet] = useState(null)
  const [active, setActive] = useState(0)
  const [msgs, setMsgs] = useState(INITIAL_MSGS)
  const [input, setInput] = useState('')
  const endRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      setUser(session.user)
      supabase.from('pets').select('*').eq('user_id', session.user.id).single().then(({ data }) => setPet(data))
    })
  }, [])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  const send = () => {
    if (!input.trim()) return
    setMsgs([...msgs, { from: 'me', text: input, time: 'Now' }])
    setInput('')
  }

  const chat = SAMPLE_CHATS[active]

  return (
    <div style={{ background: '#FFFBF7', minHeight: '100vh' }}>
      <NavBar user={user} pet={pet} />
      <div style={{ maxWidth: 1060, margin: '70px auto 0', padding: 14, display: 'grid', gridTemplateColumns: '280px 1fr', gap: 0, height: 'calc(100vh - 84px)' }}>
        {/* Chat list */}
        <div style={{ background: '#fff', borderRadius: '16px 0 0 16px', border: '1px solid #EDE8FF', overflowY: 'auto' }}>
          <div style={{ padding: '14px', borderBottom: '1px solid #EDE8FF' }}>
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.1rem', marginBottom: 8 }}>💬 Messages</div>
            <input placeholder="🔍 Search chats..." style={{ width: '100%', background: '#F3F0FF', border: 'none', borderRadius: 20, padding: '7px 12px', fontFamily: 'Nunito, sans-serif', fontSize: '0.84rem', outline: 'none' }} />
          </div>
          {SAMPLE_CHATS.map((c, i) => (
            <div key={i} onClick={() => setActive(i)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid #F9F5FF', background: i === active ? '#F3F0FF' : 'transparent', transition: 'background 0.2s' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0, position: 'relative' }}>
                {c.emoji}
                {c.online && <div style={{ width: 11, height: 11, background: '#22C55E', borderRadius: '50%', position: 'absolute', bottom: 1, right: 1, border: '2px solid #fff' }} />}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.86rem' }}>{c.name}</div>
                  <div style={{ fontSize: '0.68rem', color: '#6B7280' }}>{c.time}</div>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.last}</div>
              </div>
              {c.unread > 0 && <div style={{ minWidth: 20, height: 20, background: '#FF6B35', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#fff', fontWeight: 800 }}>{c.unread}</div>}
            </div>
          ))}
        </div>

        {/* Chat window */}
        <div style={{ background: '#FFFBF7', borderRadius: '0 16px 16px 0', border: '1px solid #EDE8FF', borderLeft: 'none', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #EDE8FF', display: 'flex', alignItems: 'center', gap: 11, background: '#fff' }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: chat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', position: 'relative' }}>
              {chat.emoji}
              {chat.online && <div style={{ width: 10, height: 10, background: '#22C55E', borderRadius: '50%', position: 'absolute', bottom: 0, right: 0, border: '2px solid #fff' }} />}
            </div>
            <div>
              <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1rem' }}>{chat.name}</div>
              <div style={{ fontSize: '0.74rem', color: chat.online ? '#22C55E' : '#6B7280' }}>{chat.online ? '🟢 Online' : 'Offline'}</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.from === 'me' ? 'flex-end' : 'flex-start', marginBottom: 4 }}>
                {m.from === 'them' && <div style={{ width: 28, height: 28, borderRadius: '50%', background: chat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', marginRight: 6, alignSelf: 'flex-end' }}>{chat.emoji}</div>}
                <div>
                  <div style={{
                    maxWidth: '68%', padding: '10px 14px', borderRadius: m.from === 'me' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    fontSize: '0.88rem', lineHeight: 1.55,
                    background: m.from === 'me' ? 'linear-gradient(135deg,#FF6B35,#FF8C5A)' : '#fff',
                    color: m.from === 'me' ? '#fff' : '#1E1347',
                    border: m.from === 'me' ? 'none' : '1px solid #EDE8FF'
                  }}>{m.text}</div>
                  <div style={{ fontSize: '0.65rem', color: '#6B7280', textAlign: m.from === 'me' ? 'right' : 'left', marginTop: 2 }}>{m.time}</div>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px 14px', borderTop: '1px solid #EDE8FF', display: 'flex', gap: 9, alignItems: 'center', background: '#fff' }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
              placeholder={`Message ${chat.name}... 🐾`}
              style={{ flex: 1, background: '#F3F0FF', border: 'none', borderRadius: 22, padding: '10px 16px', fontFamily: 'Nunito, sans-serif', fontSize: '0.88rem', outline: 'none', color: '#1E1347' }} />
            <button className="btn-primary" onClick={send} style={{ padding: '9px 16px', borderRadius: 22 }}>Send 🐾</button>
          </div>
        </div>
      </div>
    </div>
  )
}
