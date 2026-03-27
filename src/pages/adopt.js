import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'

const PETS = [
  { id:1, name:'Milo', emoji:'🐶', type:'Labrador Mix', age:'8 months', gender:'Male', bg:'linear-gradient(135deg,#FFE8CC,#FFCFA0)', urgent:true, traits:['Playful','House-trained','Good with kids'], rescue:'Delhi Animal Shelter', location:'New Delhi' },
  { id:2, name:'Aria', emoji:'🐱', type:'Domestic Shorthair', age:'2 years', gender:'Female', bg:'linear-gradient(135deg,#FFE8F0,#FFCCE4)', urgent:false, traits:['Calm','Loves cuddles','Indoor'], rescue:'Mumbai Pet Rescue', location:'Mumbai' },
  { id:3, name:'Pepper', emoji:'🐇', type:'Holland Lop', age:'1 year', gender:'Male', bg:'linear-gradient(135deg,#E8F8E8,#D0F0D0)', urgent:false, traits:['Curious','Active','Litter trained'], rescue:'Bunny Haven', location:'Bangalore' },
  { id:4, name:'Kiwi', emoji:'🦜', type:'Parakeet', age:'6 months', gender:'Unknown', bg:'linear-gradient(135deg,#E0F4FF,#C8E8FF)', urgent:false, traits:['Talkative','Social','Hand-tamed'], rescue:'Feather Friends', location:'Pune' },
  { id:5, name:'Coco', emoji:'🐹', type:'Golden Hamster', age:'3 months', gender:'Female', bg:'linear-gradient(135deg,#FFF8E0,#FFE8B0)', urgent:true, traits:['Nocturnal','Loves wheels','Gentle'], rescue:'Small Paws', location:'Hyderabad' },
  { id:6, name:'Tiger', emoji:'🐈', type:'Bengal Mix', age:'4 years', gender:'Male', bg:'linear-gradient(135deg,#F5F0FF,#E0D5FF)', urgent:false, traits:['Active','Needs space','No small pets'], rescue:'Cat Colony Care', location:'Chennai' },
]

export default function Adopt() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [pet, setPet] = useState(null)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('All')
  const [toast, setToast] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      setUser(session.user)
      supabase.from('pets').select('*').eq('user_id', session.user.id).single().then(({ data }) => setPet(data))
    })
  }, [])

  const types = ['All','Dogs','Cats','Rabbits','Birds','Small Pets']
  const emojiMap = { Dogs:'🐶', Cats:'🐱', Rabbits:'🐇', Birds:'🦜', 'Small Pets':'🐹' }
  const filtered = filter === 'All' ? PETS : PETS.filter(p => p.emoji === emojiMap[filter])

  const express = (a) => {
    setSelected(null)
    setToast(`❤️ Interest expressed for ${a.name}! The rescue will contact you soon.`)
    setTimeout(() => setToast(''), 4000)
  }

  return (
    <div style={{ background: '#FFFBF7', minHeight: '100vh' }}>
      <NavBar user={user} pet={pet} />
      <div style={{ maxWidth: 1060, margin: '70px auto 0', padding: 14 }}>
        <div className="card" style={{ background: 'linear-gradient(135deg,#2DD4BF,#6C4BF6)', border: 'none', padding: 22, marginBottom: 16 }}>
          <div style={{ color: '#fff', fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.45rem', marginBottom: 4 }}>🏠 Adopt & Rescue Board</div>
          <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: '0.88rem', marginBottom: 14 }}>Every pet deserves a loving home. Find your forever friend here 🐾❤️</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {types.map(t => (
              <button key={t} onClick={() => setFilter(t)}
                style={{ padding: '5px 14px', borderRadius: 20, border: 'none', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', background: filter === t ? '#fff' : 'rgba(255,255,255,0.22)', color: filter === t ? '#6C4BF6' : '#fff', transition: 'all 0.2s' }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 16 }}>
          {filtered.map(a => (
            <div key={a.id} onClick={() => setSelected(a)}
              style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 4px 20px rgba(108,75,246,0.1)', border: '1px solid #EDE8FF', cursor: 'pointer', transition: 'transform 0.3s, box-shadow 0.3s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(108,75,246,0.18)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(108,75,246,0.1)' }}>
              <div style={{ height: 156, background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4.5rem', position: 'relative' }}>
                {a.emoji}
                {a.urgent && <div style={{ position: 'absolute', top: 10, right: 10, background: '#FF4757', color: '#fff', padding: '3px 9px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 800 }}>⚡ URGENT</div>}
              </div>
              <div style={{ padding: 13 }}>
                <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.02rem' }}>{a.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', margin: '3px 0 8px' }}>{a.type} · {a.age} · {a.gender} · 📍 {a.location}</div>
                <div style={{ marginBottom: 8 }}>{a.traits.map(t => <span key={t} style={{ display: 'inline-block', padding: '3px 8px', background: '#F3F0FF', color: '#6C4BF6', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700, margin: 2 }}>{t}</span>)}</div>
                <div style={{ fontSize: '0.72rem', color: '#6B7280', marginBottom: 8 }}>🏠 {a.rescue}</div>
                <button className="btn-primary" style={{ width: '100%', padding: 8, fontSize: '0.8rem' }} onClick={e => { e.stopPropagation(); express(a) }}>❤️ Express Interest</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {selected && (
        <div onClick={e => e.target === e.currentTarget && setSelected(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: '#fff', borderRadius: 22, padding: 28, width: '90%', maxWidth: 400 }}>
            <div style={{ height: 110, borderRadius: 14, background: selected.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem', marginBottom: 16, position: 'relative' }}>
              {selected.emoji}
              {selected.urgent && <div style={{ position: 'absolute', top: 10, right: 10, background: '#FF4757', color: '#fff', padding: '3px 9px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 800 }}>⚡ URGENT</div>}
            </div>
            <h2 style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.5rem' }}>{selected.name}</h2>
            <p style={{ color: '#6B7280', fontSize: '0.84rem', margin: '4px 0 12px' }}>{selected.type} · {selected.age} · {selected.gender}</p>
            <div style={{ marginBottom: 12 }}>{selected.traits.map(t => <span key={t} style={{ display: 'inline-block', padding: '3px 8px', background: '#F3F0FF', color: '#6C4BF6', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700, margin: 2 }}>{t}</span>)}</div>
            <p style={{ fontSize: '0.82rem', marginBottom: 14 }}>📍 {selected.location} · 🏠 {selected.rescue}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => express(selected)}>❤️ I Want to Adopt</button>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setSelected(null)}>💬 Ask Questions</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position: 'fixed', bottom: 22, right: 22, background: '#1E1347', color: '#fff', padding: '12px 18px', borderRadius: 14, fontWeight: 700, fontSize: '0.86rem', zIndex: 3000 }}>{toast}</div>}
    </div>
  )
}
