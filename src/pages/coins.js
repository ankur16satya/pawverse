import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'

const REWARDS = [
  { icon:'🏷️', name:'10% Off Next Purchase', cost:200, bg:'#FFF0E8' },
  { icon:'🩺', name:'Free Vet Consultation', cost:500, bg:'#E8F8E8' },
  { icon:'🛁', name:'Free Grooming Session', cost:750, bg:'#F0EBFF' },
  { icon:'🦴', name:'Premium Treat Box', cost:350, bg:'#FFFBE8' },
  { icon:'🎽', name:'Exclusive PawVerse Collar', cost:1000, bg:'#FFE8F0' },
  { icon:'⭐', name:'Verified Pet Badge', cost:1500, bg:'#E8F4FF' },
]

const TRANSACTIONS = [
  { type:'earn', icon:'📸', desc:'Posted a photo', pts:'+10', date:'Today' },
  { type:'earn', icon:'🛍️', desc:'Marketplace purchase', pts:'+45', date:'Yesterday' },
  { type:'earn', icon:'🩺', desc:'Booked Vet Appointment', pts:'+100', date:'Mar 22' },
  { type:'spend', icon:'🎁', desc:'Redeemed: 10% Discount', pts:'-200', date:'Mar 20' },
  { type:'earn', icon:'👥', desc:'Referred a friend', pts:'+250', date:'Mar 18' },
  { type:'earn', icon:'🎂', desc:'Pet Birthday Bonus', pts:'+150', date:'Mar 15' },
]

export default function Coins() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [pet, setPet] = useState(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      setUser(session.user)
      supabase.from('pets').select('*').eq('user_id', session.user.id).eq('is_health_pet', false).single().then(({ data }) => setPet(data))
    })
  }, [])

  const redeem = (r) => {
    if (!pet || (pet.paw_coins || 0) < r.cost) { setToast('❌ Not enough PawCoins!'); setTimeout(() => setToast(''), 3000); return }
    setToast(`🎉 Redeemed: ${r.name}! Check your email.`)
    setTimeout(() => setToast(''), 4000)
  }

  const balance = pet?.paw_coins || 0
  const tier = balance >= 5000 ? '💎 PawVerse Elite' : balance >= 2500 ? '🥇 Top Paw' : balance >= 1000 ? '🥈 Good Boy/Girl' : '🥉 Pup'

  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(213, 134, 200, 1), rgba(105, 201, 249, 1))',padding:'30px', minHeight: '100vh',}}>
      <NavBar user={user} pet={pet} />
      <div style={{ maxWidth: 960, margin: '70px auto 0', padding: 14 }}>
        {/* Hero */}
        <div style={{ background: 'linear-gradient(135deg,#FFD166,#FF9A3C,#FF6B35)', borderRadius: 22, padding: 28, marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', opacity: 0.15, fontSize: '8rem' }}>🪙</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, zIndex: 1, position: 'relative' }}>
            <div style={{ fontSize: '4.5rem' }}>🪙</div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', opacity: 0.88 }}>Your PawCoins Balance</div>
              <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '3rem', color: '#fff' }}>{balance.toLocaleString()}</div>
              <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.88)' }}>Tier: {tier}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
            {['🛒 Earn on purchases','🩺 Earn on vet bookings','📸 Earn by posting','👥 Earn by referring'].map(b => (
              <div key={b} style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '6px 12px', fontSize: '0.76rem', fontWeight: 700, color: '#fff' }}>{b}</div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          {/* Tiers */}
          <div className="card" style={{ background: 'linear-gradient(135deg,#FFF8E0,#FFE8CC)', border: 'none' }}>
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, marginBottom: 10 }}>🏆 Your Tier</div>
            {[['🥉 Pup','0–999'],['🥈 Good Boy/Girl','1,000–2,499'],['🥇 Top Paw','2,500–4,999'],['💎 Elite','5,000+']].map(([t, r]) => {
              const isCurrent = t.startsWith(tier.slice(0, 2))
              return (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: 7, borderRadius: 10, marginBottom: 4, background: isCurrent ? 'rgba(255,107,53,0.12)' : 'transparent', border: isCurrent ? '1.5px solid #FF6B35' : '1.5px solid transparent' }}>
                  <span style={{ fontSize: '0.9rem' }}>{t}</span>
                  <span style={{ fontSize: '0.72rem', color: '#6B7280', flex: 1 }}>{r} coins</span>
                  {isCurrent && <span style={{ color: '#FF6B35', fontSize: '0.7rem', fontWeight: 800 }}>← You</span>}
                </div>
              )
            })}
          </div>
          {/* Transactions */}
          <div className="card">
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, marginBottom: 10 }}>📋 Recent Activity</div>
            {TRANSACTIONS.slice(0, 5).map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #F9F5FF' }}>
                <span style={{ fontSize: '1.1rem' }}>{t.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{t.desc}</div>
                  <div style={{ fontSize: '0.68rem', color: '#6B7280' }}>{t.date}</div>
                </div>
                <span style={{ fontWeight: 800, fontSize: '0.82rem', color: t.type === 'earn' ? '#22C55E' : '#FF4757' }}>{t.pts}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Redeem */}
        <div className="card">
          <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1rem', marginBottom: 6 }}>🎁 Redeem PawCoins</div>
          <p style={{ fontSize: '0.82rem', color: '#6B7280', marginBottom: 14 }}>Balance: <strong style={{ color: '#FF6B35' }}>🪙 {balance.toLocaleString()}</strong></p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
            {REWARDS.map((r, i) => (
              <div key={i} style={{ background: r.bg, borderRadius: 16, padding: 16, cursor: 'pointer', border: '1px solid #EDE8FF', transition: 'transform 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                <div style={{ fontSize: '2rem', marginBottom: 7 }}>{r.icon}</div>
                <div style={{ fontWeight: 800, fontSize: '0.86rem', marginBottom: 4 }}>{r.name}</div>
                <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, color: '#FF6B35', fontSize: '1.05rem', marginBottom: 8 }}>🪙 {r.cost}</div>
                <button onClick={() => redeem(r)}
                  className={balance >= r.cost ? 'btn-primary' : 'btn-secondary'}
                  style={{ width: '100%', padding: '7px', fontSize: '0.78rem', opacity: balance >= r.cost ? 1 : 0.6 }}>
                  {balance >= r.cost ? 'Redeem' : 'Not enough'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      {toast && <div style={{ position: 'fixed', bottom: 22, right: 22, background: '#1E1347', color: '#fff', padding: '12px 18px', borderRadius: 14, fontWeight: 700, fontSize: '0.86rem', zIndex: 3000 }}>{toast}</div>}
    </div>
  )
}
