import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'

const VACCINES = [
  { name:'Rabies', date:'Jan 15, 2025', next:'Jan 15, 2026', status:'done' },
  { name:'FVRCP (3-in-1)', date:'Mar 10, 2025', next:'Mar 10, 2026', status:'done' },
  { name:'FeLV', date:'Aug 5, 2024', next:'Aug 5, 2025', status:'overdue' },
  { name:'FIV Booster', date:'—', next:'Jun 2025', status:'upcoming' },
]
const VET_VISITS = [
  { date:'Mar 10, 2025', vet:'Dr. Anand Sharma', type:'Annual Checkup', notes:'Healthy. Weight 4.2kg. Teeth clean.', icon:'🏥' },
  { date:'Jan 15, 2025', vet:'Dr. Priya Nair', type:'Vaccination', notes:'Rabies & FVRCP administered.', icon:'💉' },
]
const STATUS_COLOR = { done:'#22C55E', overdue:'#FF4757', upcoming:'#FFD166' }
const STATUS_BG = { done:'#E8F8E8', overdue:'#FFDCE0', upcoming:'#FFFBE8' }
const STATUS_LABEL = { done:'✅ Done', overdue:'⚠️ Overdue', upcoming:'📅 Upcoming' }

export default function Health() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [pet, setPet] = useState(null)
  const [tab, setTab] = useState('vaccines')
  const [toast, setToast] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      setUser(session.user)
      supabase.from('pets').select('*').eq('user_id', session.user.id).single().then(({ data }) => setPet(data))
    })
  }, [])

  const bookVet = () => { setToast('📅 Appointment booked! +100 PawCoins 🪙'); setTimeout(() => setToast(''), 3000) }

  return (
   <div style={{ background: 'linear-gradient(135deg, rgba(213, 134, 200, 1), rgba(105, 201, 249, 1))',padding:'30px', minHeight: '100vh' }}>
      <NavBar user={user} pet={pet} />
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 14, maxWidth: 1060, margin: '70px auto 0', padding: 14 }}>
        {/* Sidebar */}
        <div style={{ position: 'sticky', top: 70, alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #E8F4FF, #F0EBFF)', border: 'none' }}>
            <div style={{ fontSize: '2.8rem', marginBottom: 6 }}>{pet?.emoji || '🐾'}</div>
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.05rem' }}>{pet?.pet_name}</div>
            <div style={{ color: '#6B7280', fontSize: '0.74rem' }}>{pet?.pet_breed}</div>
          </div>
          <div className="card" style={{ padding: 12 }}>
            {[['vaccines','💉 Vaccines'],['visits','🏥 Vet Visits'],['weight','⚖️ Weight'],['meds','💊 Medications']].map(([k, lb]) => (
              <div key={k} onClick={() => setTab(k)}
                style={{
                  padding: '8px 10px', borderRadius: 10, cursor: 'pointer',
                  fontWeight: 700, fontSize: '0.88rem', marginBottom: 2, transition: 'background 0.2s',
                  background: tab === k ? '#F3F0FF' : 'transparent', color: tab === k ? '#6C4BF6' : '#1E1347'
                }}>{lb}</div>
            ))}
          </div>
          <button className="btn-primary" style={{ width: '100%' }} onClick={bookVet}>📅 Book Vet Appointment</button>
        </div>

        {/* Main */}
        <div>
          <div className="card" style={{ background: 'linear-gradient(135deg,#3B82F6,#6C4BF6)', border: 'none', padding: 20, marginBottom: 14 }}>
            <div style={{ color: '#fff', fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.35rem', marginBottom: 4 }}>🩺 Health Dashboard</div>
            <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: '0.88rem', marginBottom: 14 }}>Track vaccines, vet visits, weight & medications in one place.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
              {[['Vaccines','3/4','💉'],['Next Visit','Apr 12','📅'],['Weight','4.2 kg','⚖️'],['Health','92/100','❤️']].map(([l,v,ic]) => (
                <div key={l} style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 12, padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem' }}>{ic}</div>
                  <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, color: '#fff', fontSize: '1rem' }}>{v}</div>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.78)' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', borderBottom: '2px solid #EDE8FF', marginBottom: 14 }}>
            {[['vaccines','💉 Vaccines'],['visits','🏥 Vet Visits'],['weight','⚖️ Weight'],['meds','💊 Meds']].map(([k,lb]) => (
              <button key={k} onClick={() => setTab(k)} style={{
                padding: '9px 14px', border: 'none', background: 'transparent', cursor: 'pointer',
                fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.84rem',
                color: tab === k ? '#ffffffff' : '#000000ff',
                borderBottom: tab === k ? '3px solid #FF6B35' : '3px solid transparent', marginBottom: -2
              }}>{lb}</button>
            ))}
          </div>

          {tab === 'vaccines' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800 }}>💉 Vaccination Record</div>
                <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.78rem' }}>+ Add Vaccine</button>
              </div>
              {VACCINES.map((v, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 11, borderRadius: 12, border: '1px solid #EDE8FF', marginBottom: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: STATUS_COLOR[v.status], flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{v.name}</div>
                    <div style={{ fontSize: '0.74rem', color: '#6B7280' }}>Given: {v.date} · Next: {v.next}</div>
                  </div>
                  <span style={{ background: STATUS_BG[v.status], color: STATUS_COLOR[v.status], padding: '4px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 800 }}>{STATUS_LABEL[v.status]}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'visits' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800 }}>🏥 Vet Visit History</div>
                <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.78rem' }}>+ Add Visit</button>
              </div>
              {VET_VISITS.map((v, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 14, borderRadius: 14, border: '1px solid #EDE8FF', marginBottom: 10, cursor: 'pointer', transition: 'transform 0.2s' }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: '#F0EBFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>{v.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 700, fontSize: '0.9rem' }}>{v.type}</div>
                      <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>{v.date}</div>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#6C4BF6', marginTop: 1 }}>{v.vet}</div>
                    <div style={{ fontSize: '0.76rem', color: '#6B7280', marginTop: 3 }}>{v.notes}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'weight' && (
            <div className="card">
              <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, marginBottom: 14 }}>⚖️ Weight Log</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 140, borderBottom: '2px solid #EDE8FF', paddingBottom: 8, marginBottom: 12 }}>
                {[['Oct','3.8'],['Nov','3.9'],['Dec','4.0'],['Jan','4.1'],['Feb','4.2'],['Mar','4.2']].map(([m,w]) => (
                  <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: '0.7rem', color: '#FF6B35', fontWeight: 800 }}>{w}</div>
                    <div style={{ width: '100%', background: 'linear-gradient(135deg,#FF6B35,#6C4BF6)', borderRadius: '6px 6px 0 0', height: `${(parseFloat(w)-3.6)*220}px` }} />
                    <div style={{ fontSize: '0.68rem', color: '#6B7280' }}>{m}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#6B7280' }}>
                <span>Current: <strong style={{ color: '#FF6B35' }}>4.2 kg</strong></span>
                <span>Ideal: <strong>3.8–4.5 kg</strong></span>
                <span style={{ color: '#22C55E', fontWeight: 700 }}>✅ Healthy</span>
              </div>
            </div>
          )}

          {tab === 'meds' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800 }}>💊 Medications</div>
                <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.78rem' }}>+ Add</button>
              </div>
              {[{name:'Flea Prevention',dose:'Monthly topical',icon:'🐞'},{name:'Deworming',dose:'Every 3 months',icon:'🪱'},{name:'Vitamin Supplement',dose:'Daily with food',icon:'💊'}].map((m,i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, border: '1px solid #EDE8FF', marginBottom: 8 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: '#E8F4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>{m.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem' }}>{m.name}</div>
                    <div style={{ fontSize: '0.74rem', color: '#6B7280' }}>{m.dose}</div>
                  </div>
                  <span style={{ background: '#E8F8E8', color: '#22C55E', padding: '4px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 800 }}>Active</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {toast && <div style={{ position: 'fixed', bottom: 22, right: 22, background: '#1E1347', color: '#fff', padding: '12px 18px', borderRadius: 14, fontWeight: 700, fontSize: '0.86rem', zIndex: 3000 }}>{toast}</div>}
    </div>
  )
}
