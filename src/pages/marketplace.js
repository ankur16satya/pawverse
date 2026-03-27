import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'

const SAMPLE_PRODUCTS = [
  { id:1, name:'Premium Kibble Mix', emoji:'🍖', price:899, category:'food', seller:'PawChef Store', rating:4.8, tag:'Best Seller', tagColor:'#FF6B35', tagBg:'#FFE8CC' },
  { id:2, name:'Cozy Pet Bed', emoji:'🛏️', price:1499, category:'accessories', seller:'FurNest Co.', rating:4.9, tag:'Top Rated', tagColor:'#2DD4BF', tagBg:'#E8F8E8' },
  { id:3, name:'LED Glow Collar', emoji:'✨', price:649, category:'accessories', seller:'PetGlow Shop', rating:4.6, tag:'New', tagColor:'#6C4BF6', tagBg:'#F0EBFF' },
  { id:4, name:'Squeaky Toy Bundle', emoji:'🎾', price:399, category:'toys', seller:'PlayPaw Inc.', rating:4.7, tag:'', tagColor:'', tagBg:'' },
  { id:5, name:'Organic Treats', emoji:'🦴', price:299, category:'food', seller:'NaturePet', rating:4.9, tag:'Organic', tagColor:'#22C55E', tagBg:'#E8F8E8' },
  { id:6, name:'Grooming Kit', emoji:'✂️', price:1199, category:'grooming', seller:'ShineCoat', rating:4.5, tag:'', tagColor:'', tagBg:'' },
]

const SERVICES = [
  { id:1, emoji:'🩺', name:"Dr. Mehra's Pet Clinic", desc:'Vet Consultation • Online & In-Person', price:'₹500/visit', bg:'#FFF0E8', rating:4.9 },
  { id:2, emoji:'✂️', name:'SnipSnip Grooming Studio', desc:'Full Grooming • Bath & Trim • Spa', price:'₹799/session', bg:'#F0EBFF', rating:4.8 },
  { id:3, emoji:'🏃', name:'Happy Paws Dog Walking', desc:'Daily Walks • Group & Solo', price:'₹199/walk', bg:'#E8F8EE', rating:4.7 },
  { id:4, emoji:'🎓', name:'Pet Training Academy', desc:'Obedience • Tricks • Behavior', price:'₹2,500/month', bg:'#FFFBE8', rating:4.9 },
]

const CATS = ['All','Food','Accessories','Toys','Grooming']

export default function Marketplace() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [pet, setPet] = useState(null)
  const [tab, setTab] = useState('products')
  const [filter, setFilter] = useState('All')
  const [toast, setToast] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      setUser(session.user)
      supabase.from('pets').select('*').eq('user_id', session.user.id).single()
        .then(({ data }) => setPet(data))
    })
  }, [])

  const addToCart = (item) => {
    setToast(`🛒 ${item.name} added to cart! +5 PawCoins 🪙`)
    setTimeout(() => setToast(''), 3000)
  }

  const filtered = filter === 'All' ? SAMPLE_PRODUCTS : SAMPLE_PRODUCTS.filter(p => p.category === filter.toLowerCase())

  return (
    <div style={{ background: '#FFFBF7', minHeight: '100vh' }}>
      <NavBar user={user} pet={pet} />

      <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr', gap: 14, maxWidth: 1100, margin: '70px auto 0', padding: 14 }}>
        {/* Sidebar */}
        <div style={{ position: 'sticky', top: 70, alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 12 }}>
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, marginBottom: 10 }}>🛍️ Browse</div>
            {CATS.map((c, i) => (
              <div key={c} onClick={() => setFilter(c)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.86rem',
                  background: filter === c ? '#FF6B35' : 'transparent',
                  color: filter === c ? '#fff' : '#1E1347',
                  transition: 'all 0.2s', marginBottom: 2
                }}>
                {['🔮','🍖','🎽','🎾','✂️'][i]} {c}
              </div>
            ))}
          </div>
          <div className="card" style={{ background: 'linear-gradient(135deg,#FFF0E8,#FFE0D5)', border: 'none' }}>
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '0.9rem', marginBottom: 6 }}>🐾 Sell Here</div>
            <p style={{ fontSize: '0.76rem', color: '#6B7280', marginBottom: 10 }}>List your pet products or services — free!</p>
            <button className="btn-primary" style={{ width: '100%', fontSize: '0.82rem', padding: '8px' }}>+ Create Listing</button>
          </div>
        </div>

        {/* Main */}
        <div>
          <div className="card" style={{ background: 'linear-gradient(135deg,#FF6B35,#6C4BF6)', border: 'none', padding: 20, marginBottom: 14 }}>
            <div style={{ color: '#fff', fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.45rem', marginBottom: 4 }}>🛍️ PawVerse Marketplace</div>
            <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: '0.88rem' }}>Everything your fur baby needs 🐾</p>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '2px solid #EDE8FF', marginBottom: 14, gap: 2 }}>
            {['products','services'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{
                  padding: '9px 18px', border: 'none', background: 'transparent', cursor: 'pointer',
                  fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.86rem',
                  color: tab === t ? '#FF6B35' : '#6B7280',
                  borderBottom: tab === t ? '3px solid #FF6B35' : '3px solid transparent',
                  marginBottom: -2, transition: 'all 0.2s'
                }}>
                {t === 'products' ? '🛒 Products' : '🩺 Services'}
              </button>
            ))}
          </div>

          {tab === 'products' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 14 }}>
              {filtered.map(item => (
                <div key={item.id} className="card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(108,75,246,0.16)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '' }}>
                  <div style={{ height: 132, background: 'linear-gradient(135deg, #F9F5FF, #FFF0E8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.2rem' }}>
                    {item.emoji}
                  </div>
                  <div style={{ padding: 11 }}>
                    {item.tag && <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 20, fontSize: '0.67rem', fontWeight: 800, background: item.tagBg, color: item.tagColor, marginBottom: 4 }}>{item.tag}</span>}
                    <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 700, fontSize: '0.88rem', marginBottom: 2 }}>{item.name}</div>
                    <div style={{ fontWeight: 800, color: '#FF6B35', fontSize: '0.98rem' }}>₹{item.price}</div>
                    <div style={{ fontSize: '0.69rem', color: '#6B7280', margin: '2px 0 8px' }}>⭐ {item.rating} · {item.seller}</div>
                    <button className="btn-primary" onClick={() => addToCart(item)} style={{ width: '100%', padding: '6px', fontSize: '0.76rem' }}>🛒 Add to Cart</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'services' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {SERVICES.map(s => (
                <div key={s.id} className="card" style={{ display: 'flex', gap: 13, alignItems: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: s.bg, fontSize: '1.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 700, fontSize: '0.95rem' }}>{s.name}</div>
                    <div style={{ fontSize: '0.76rem', color: '#6B7280', marginTop: 2 }}>{s.desc}</div>
                    <div style={{ fontSize: '0.74rem', marginTop: 3 }}>⭐ {s.rating} · Verified Professional</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, color: '#FF6B35', fontSize: '1rem' }}>{s.price}</div>
                    <button className="btn-primary" style={{ marginTop: 7, padding: '6px 13px', fontSize: '0.76rem' }}>Book Now</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 22, right: 22, background: '#1E1347', color: '#fff', padding: '12px 18px', borderRadius: 14, fontWeight: 700, fontSize: '0.86rem', zIndex: 3000, animation: 'fadeUp 0.3s ease' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
