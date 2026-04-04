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

  const bookVet = () => {
    setToast('📅 Appointment booked! +100 PawCoins 🪙')
    setTimeout(() => setToast(''), 3000)
  }

  const tabItems = [
    ['vaccines','💉','Vaccines'],
    ['visits','🏥','Vet Visits'],
    ['weight','⚖️','Weight'],
    ['meds','💊','Meds'],
  ]

  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(213, 134, 200, 1), rgba(105, 201, 249, 1))', minHeight: '100vh' }}>
      <NavBar user={user} pet={pet} />

      <style>{`
        .health-layout {
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 14px;
          max-width: 1060px;
          margin: 70px auto 0;
          padding: 28px 14px;
        }
        .health-sidebar {
          position: sticky;
          top: 70px;
          align-self: start;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .mobile-tab-bar { display: none; }
        .mobile-header-bar { display: none; }
        .stat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        .vaccine-row {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 11px;
          border-radius: 12px;
          border: 1px solid #EDE8FF;
          margin-bottom: 8px;
          transition: transform 0.2s;
        }
        .vaccine-row:hover { transform: translateX(3px); }
        .visit-row {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 14px;
          border-radius: 14px;
          border: 1px solid #EDE8FF;
          margin-bottom: 10px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .visit-row:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(108,75,246,0.12); }
        .weight-bar-container {
          display: flex;
          align-items: flex-end;
          gap: 12px;
          height: 140px;
          border-bottom: 2px solid #EDE8FF;
          padding-bottom: 8px;
          margin-bottom: 12px;
        }
        .med-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid #EDE8FF;
          margin-bottom: 8px;
          transition: transform 0.2s;
        }
        .med-row:hover { transform: translateX(4px); }
        .desktop-tabs { display: flex; border-bottom: 2px solid #EDE8FF; margin-bottom: 14px; overflow-x: auto; }
        @media (max-width: 767px) {
          .health-layout {
            grid-template-columns: 1fr;
            margin-top: 60px;
            padding: 0 0 80px 0;
            gap: 0;
          }
          .health-sidebar { display: none; }
          .health-main { padding: 12px; }
          .mobile-tab-bar {
            display: flex;
            position: fixed;
            bottom: 0; left: 0; right: 0;
            background: rgba(255,255,255,0.97);
            backdrop-filter: blur(12px);
            border-top: 1px solid #EDE8FF;
            z-index: 100;
            padding: 6px 0 env(safe-area-inset-bottom, 6px);
            box-shadow: 0 -4px 20px rgba(0,0,0,0.08);
          }
          .mobile-tab-btn {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            padding: 6px 4px;
            border: none;
            background: transparent;
            cursor: pointer;
            transition: transform 0.15s;
          }
          .mobile-tab-btn:active { transform: scale(0.88); }
          .mobile-header-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 14px;
            background: rgba(255,255,255,0.9);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid #EDE8FF;
            margin-bottom: 10px;
          }
          .stat-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .vaccine-row { flex-wrap: wrap; }
          .weight-bar-container { gap: 6px; }
          .desktop-tabs { display: none; }
        }
      `}</style>

      <div className="health-layout">
        {/* Desktop Sidebar */}
        <div className="health-sidebar">
          <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #E8F4FF, #F0EBFF)', border: 'none' }}>
            <div style={{ fontSize: '2.8rem', marginBottom: 6 }}>{pet?.emoji || '🐾'}</div>
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.05rem' }}>{pet?.pet_name}</div>
            <div style={{ color: '#6B7280', fontSize: '0.74rem' }}>{pet?.pet_breed}</div>
          </div>
          <div className="card" style={{ padding: 12 }}>
            {tabItems.map(([k, icon, lb]) => (
              <div key={k} onClick={() => setTab(k)}
                style={{
                  padding: '8px 10px', borderRadius: 10, cursor: 'pointer',
                  fontWeight: 700, fontSize: '0.88rem', marginBottom: 2, transition: 'background 0.2s',
                  background: tab === k ? '#F3F0FF' : 'transparent', color: tab === k ? '#6C4BF6' : '#1E1347'
                }}>{icon} {lb}</div>
            ))}
          </div>
          <button className="btn-primary" style={{ width: '100%' }} onClick={bookVet}>📅 Book Vet Appointment</button>
        </div>

        {/* Main */}
        <div className="health-main">
          {/* Mobile pet header */}
          <div className="mobile-header-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: '2rem' }}>{pet?.emoji || '🐾'}</div>
              <div>
                <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '0.95rem' }}>{pet?.pet_name}</div>
                <div style={{ color: '#6B7280', fontSize: '0.7rem' }}>{pet?.pet_breed}</div>
              </div>
            </div>
            <button onClick={bookVet} style={{
              background: 'linear-gradient(135deg,#FF6B35,#6C4BF6)', color: '#fff', border: 'none',
              borderRadius: 10, padding: '8px 12px', fontFamily: 'Nunito, sans-serif',
              fontWeight: 800, fontSize: '0.76rem', cursor: 'pointer'
            }}>📅 Book Vet</button>
          </div>

          {/* Dashboard Header */}
          <div className="card" style={{ background: 'linear-gradient(135deg,#3B82F6,#6C4BF6)', border: 'none', padding: 20, marginBottom: 14 }}>
            <div style={{ color: '#fff', fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.35rem', marginBottom: 4 }}>🩺 Health Dashboard</div>
            <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: '0.88rem', marginBottom: 14 }}>Track vaccines, vet visits, weight & medications in one place.</p>
            <div className="stat-grid">
              {[['Vaccines','3/4','💉'],['Next Visit','Apr 12','📅'],['Weight','4.2 kg','⚖️'],['Health','92/100','❤️']].map(([l,v,ic]) => (
                <div key={l} style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 12, padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem' }}>{ic}</div>
                  <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, color: '#fff', fontSize: '1rem' }}>{v}</div>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.78)' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop Tab Buttons */}
          <div className="desktop-tabs">
            {tabItems.map(([k, icon, lb]) => (
              <button key={k} onClick={() => setTab(k)} style={{
                padding: '9px 14px', border: 'none', background: 'transparent', cursor: 'pointer',
                fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.84rem',
                color: tab === k ? '#ffffffff' : '#000000ff',
                borderBottom: tab === k ? '3px solid #FF6B35' : '3px solid transparent', marginBottom: -2,
                whiteSpace: 'nowrap', flexShrink: 0
              }}>{icon} {lb}</button>
            ))}
          </div>

          {tab === 'vaccines' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800 }}>💉 Vaccination Record</div>
                <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.78rem' }}>+ Add Vaccine</button>
              </div>
              {VACCINES.map((v, i) => (
                <div key={i} className="vaccine-row">
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: STATUS_COLOR[v.status], flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{v.name}</div>
                    <div style={{ fontSize: '0.74rem', color: '#6B7280' }}>Given: {v.date} · Next: {v.next}</div>
                  </div>
                  <span style={{ background: STATUS_BG[v.status], color: STATUS_COLOR[v.status], padding: '4px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 800, flexShrink: 0 }}>{STATUS_LABEL[v.status]}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'visits' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800 }}>🏥 Vet Visit History</div>
                <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.78rem' }}>+ Add Visit</button>
              </div>
              {VET_VISITS.map((v, i) => (
                <div key={i} className="visit-row">
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: '#F0EBFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>{v.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
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
              <div className="weight-bar-container">
                {[['Oct','3.8'],['Nov','3.9'],['Dec','4.0'],['Jan','4.1'],['Feb','4.2'],['Mar','4.2']].map(([m,w]) => (
                  <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: '0.7rem', color: '#FF6B35', fontWeight: 800 }}>{w}</div>
                    <div style={{ width: '100%', background: 'linear-gradient(135deg,#FF6B35,#6C4BF6)', borderRadius: '6px 6px 0 0', height: `${(parseFloat(w)-3.6)*220}px` }} />
                    <div style={{ fontSize: '0.68rem', color: '#6B7280' }}>{m}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, fontSize: '0.82rem', color: '#6B7280' }}>
                <span>Current: <strong style={{ color: '#FF6B35' }}>4.2 kg</strong></span>
                <span>Ideal: <strong>3.8–4.5 kg</strong></span>
                <span style={{ color: '#22C55E', fontWeight: 700 }}>✅ Healthy</span>
              </div>
            </div>
          )}

          {tab === 'meds' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800 }}>💊 Medications</div>
                <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.78rem' }}>+ Add</button>
              </div>
              {[{name:'Flea Prevention',dose:'Monthly topical',icon:'🐞'},{name:'Deworming',dose:'Every 3 months',icon:'🪱'},{name:'Vitamin Supplement',dose:'Daily with food',icon:'💊'}].map((m,i) => (
                <div key={i} className="med-row">
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: '#E8F4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>{m.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem' }}>{m.name}</div>
                    <div style={{ fontSize: '0.74rem', color: '#6B7280' }}>{m.dose}</div>
                  </div>
                  <span style={{ background: '#E8F8E8', color: '#22C55E', padding: '4px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 800, flexShrink: 0 }}>Active</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <div className="mobile-tab-bar">
        {tabItems.map(([k, icon, lb]) => (
          <button key={k} className="mobile-tab-btn" onClick={() => setTab(k)}>
            <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>{icon}</span>
            <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.6rem', color: tab === k ? '#6C4BF6' : '#9CA3AF' }}>{lb}</span>
            {tab === k && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#6C4BF6' }} />}
          </button>
        ))}
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 80, right: 16, left: 16, maxWidth: 340, margin: '0 auto', background: '#1E1347', color: '#fff', padding: '12px 18px', borderRadius: 14, fontWeight: 700, fontSize: '0.86rem', zIndex: 3000, textAlign: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>{toast}</div>
      )}
    </div>
  )
}
