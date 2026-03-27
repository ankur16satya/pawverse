import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'

export default function Profile() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [pet, setPet] = useState(null)
  const [posts, setPosts] = useState([])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('posts')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      setUser(session.user)

      const { data: existingPet } = await supabase
        .from('pets').select('*').eq('user_id', session.user.id).single()

      if (existingPet) {
        setPet(existingPet)
        setForm(existingPet)
        setLoading(false)
      } else {
        // Try to auto-create from localStorage saved during signup
        const pending = localStorage.getItem('pending_pet')
        if (pending) {
          const petData = JSON.parse(pending)
          const { data: newPet, error } = await supabase.from('pets').insert({
            user_id: session.user.id,
            ...petData,
            paw_coins: 150,
            bio: `Hi, I'm ${petData.pet_name}! 🐾`,
            location: 'India',
          }).select().single()

          if (!error && newPet) {
            localStorage.removeItem('pending_pet') // clean up
            setPet(newPet)
            setForm(newPet)
          }
        }
        setLoading(false)
      }

      supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(10)
        .then(({ data }) => setPosts(data || []))
    })
  }, [])

  const saveProfile = async () => {
    setSaving(true)
    await supabase.from('pets').update({ bio: form.bio, location: form.location, pet_breed: form.pet_breed }).eq('id', pet.id)
    setPet({ ...pet, ...form })
    setEditing(false)
    setSaving(false)
  }

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

  if (!pet) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12, textAlign: 'center', padding: 20 }}>
      <div style={{ fontSize: '3rem' }}>🐾</div>
      <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.2rem', color: '#1E1347' }}>No pet profile found</div>
      <p style={{ color: '#6B7280', fontSize: '0.88rem', maxWidth: 300 }}>Please sign out and sign up again — your details will be saved this time!</p>
      <button onClick={() => router.push('/')} style={{ background: 'linear-gradient(135deg,#FF6B35,#FF8C5A)', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 22px', fontFamily: 'Nunito, sans-serif', fontWeight: 800, cursor: 'pointer', fontSize: '0.95rem' }}>
        Go to Sign Up 🐾
      </button>
    </div>
  )

  return (
    <div style={{ background: '#FFFBF7', minHeight: '100vh' }}>
      <NavBar user={user} pet={pet} />
      <div style={{ maxWidth: 860, margin: '58px auto 0', paddingBottom: 40 }}>
        <div style={{ height: 240, background: 'linear-gradient(135deg, #FF6B35, #6C4BF6 60%, #FF6B9D)', borderRadius: '0 0 20px 20px', position: 'relative' }}>
          <div style={{ width: 100, height: 100, borderRadius: '50%', border: '4px solid #fff', background: '#FFE8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', position: 'absolute', bottom: -28, left: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.2rem' }}>
            {pet.emoji || '🐾'}
          </div>
          {!editing && (
            <button onClick={() => setEditing(true)} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.22)', color: '#fff', backdropFilter: 'blur(8px)', border: '1.5px solid rgba(255,255,255,0.35)', borderRadius: 11, padding: '8px 16px', fontFamily: 'Nunito, sans-serif', fontWeight: 800, cursor: 'pointer', fontSize: '0.88rem' }}>
              ✏️ Edit Profile
            </button>
          )}
        </div>

        <div style={{ padding: '38px 24px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div>
              <h1 style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.65rem' }}>{pet.pet_name} {pet.emoji || '🐾'}</h1>
              <p style={{ color: '#6B7280', fontSize: '0.86rem', marginTop: 2 }}>{pet.pet_breed} · Managed by {pet.owner_name}</p>
              {!editing && (
                <div style={{ marginTop: 8 }}>
                  {[['📍', pet.location || 'India'], ['🪙', `${pet.paw_coins || 0} PawCoins`]].map(([ic, tx]) => (
                    <span key={tx} style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 800, margin: 2, background: '#F3F0FF', color: '#6C4BF6' }}>{ic} {tx}</span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              {[['Posts', posts.length], ['PawCoins', pet.paw_coins || 0]].map(([l, v]) => (
                <div key={l} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, color: '#FF6B35', fontSize: '1.2rem' }}>{v}</div>
                  <div style={{ fontSize: '0.7rem', color: '#6B7280' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {editing && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, marginBottom: 12 }}>✏️ Edit Profile</div>
              <label className="label">Bio</label>
              <textarea className="input" value={form.bio || ''} onChange={e => setForm({ ...form, bio: e.target.value })} placeholder="Tell the world about your pet..." style={{ minHeight: 70, resize: 'none' }} />
              <label className="label">Location</label>
              <input className="input" value={form.location || ''} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. Dehradun, Uttarakhand" />
              <label className="label">Breed</label>
              <input className="input" value={form.pet_breed || ''} onChange={e => setForm({ ...form, pet_breed: e.target.value })} />
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn-primary" onClick={saveProfile} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
                <button className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          )}

          {!editing && pet.bio && (
            <div className="card" style={{ marginBottom: 16 }}>
              <p style={{ lineHeight: 1.7, fontSize: '0.9rem', color: '#4B5563' }}>{pet.bio}</p>
            </div>
          )}

          <div style={{ display: 'flex', borderBottom: '2px solid #EDE8FF', marginBottom: 14 }}>
            {['posts', 'about'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: '9px 18px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.86rem', color: tab === t ? '#FF6B35' : '#6B7280', borderBottom: tab === t ? '3px solid #FF6B35' : '3px solid transparent', marginBottom: -2 }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {tab === 'posts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {posts.length === 0 && <div className="card" style={{ textAlign: 'center', color: '#6B7280', padding: 30 }}>No posts yet — go share something on the feed! 🐾</div>}
              {posts.map(p => (
                <div key={p.id} className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#FFE8F0', border: '2px solid #FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>{pet.emoji || '🐾'}</div>
                    <div>
                      <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 700 }}>{pet.pet_name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>{timeAgo(p.created_at)}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.9rem', lineHeight: 1.65 }}>{p.content}</p>
                  <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#6B7280' }}>❤️ {p.likes || 0} paws</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'about' && (
            <div className="card">
              <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, marginBottom: 14 }}>📋 About {pet.pet_name}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['🐾 Name', pet.pet_name], ['🐶 Type', pet.pet_type], ['🧬 Breed', pet.pet_breed || '—'], ['📍 Location', pet.location || 'India'], ['🪙 PawCoins', `${pet.paw_coins || 0} coins`], ['👤 Managed by', pet.owner_name]].map(([l, v]) => (
                  <div key={l} style={{ padding: 10, background: '#F9F5FF', borderRadius: 10 }}>
                    <div style={{ fontSize: '0.74rem', color: '#6B7280', marginBottom: 2 }}>{l}</div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}