import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { subscribeUserToPush } from '../lib/push'
import NavBar from '../components/NavBar'

const daysUntil = (d) => {
  if (!d) return 0
  const diff = new Date(d) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function getVaccineStatus(nextDue) {
  if (!nextDue) return 'upcoming'
  const d = daysUntil(nextDue)
  if (d < 0) return 'overdue'
  if (d <= 7) return 'upcoming'
  return 'done'
}

const PET_MEDICINES = {
  '🐶 Dog': [
    { icon: '🦴', name: 'Deworming', desc: 'Prevents intestinal parasites', freq: 'Every 3 months' },
    { icon: '🦟', name: 'Tick & Flea', desc: 'Spot-on treatment', freq: 'Monthly' },
    { icon: '🦷', name: 'Dental Care', desc: 'Enzymatic toothpaste/chews', freq: 'Daily' },
    { icon: '🍎', name: 'Vitamin Tabs', desc: 'Immunity & coat health', freq: 'Daily' },
    { icon: '🐕', name: 'Joint Care', desc: 'Glucosamine supplements', freq: 'Daily' }
  ],
  '🐱 Cat': [
    { icon: '🦴', name: 'Deworming', desc: 'Broad spectrum dewormer', freq: 'Every 3 months' },
    { icon: '🧶', name: 'Hairball Gel', desc: 'Aids digestion & elimination', freq: '2-3 times/week' },
    { icon: '🦟', name: 'Tick & Flea', desc: 'Fipronil spot-on', freq: 'Monthly' },
    { icon: '🦷', name: 'Dental Care', desc: 'Oral hygiene gel', freq: 'Daily' },
    { icon: '🐱', name: 'Multivitamins', desc: 'General health booster', freq: 'Daily' }
  ],
  '🐇 Rabbit': [
    { icon: '🦷', name: 'Dental Check', desc: 'Monitor tooth growth', freq: 'Weekly' },
    { icon: '🥬', name: 'Digestion Care', desc: 'Timothy hay & probiotics', freq: 'Daily' },
    { icon: '🧶', name: 'Grooming', desc: 'Brushing to prevent GI stasis', freq: 'Weekly' },
    { icon: '🍎', name: 'Nutritional Gel', desc: 'Supplementary vitamins', freq: 'Weekly' }
  ],
  '🦜 Bird': [
    { icon: '🦜', name: 'Beak Care', desc: 'Cuttlebone/Mineral block', freq: 'Constant' },
    { icon: '🥦', name: 'Mineral Block', desc: 'Calcium & minerals', freq: 'Constant' },
    { icon: '🍎', name: 'Vitamin Drops', desc: 'Water-soluble multivitamin', freq: 'Daily' }
  ],
  'default': [
    { icon: '🦴', name: 'General Meds', desc: 'Regular health checks', freq: 'As needed' },
    { icon: '🍎', name: 'Vitamin Drops', desc: 'Boosts energy & immunity', freq: 'Daily' },
    { icon: '💪', name: 'Supplements', desc: 'General wellness support', freq: 'Daily' }
  ]
}

const STATUS_COLOR = {
  overdue: '#FF4757',
  upcoming: '#FFAD3D',
  done: '#22C55E'
}

const STATUS_BG = {
  overdue: '#FFF0F2',
  upcoming: '#FFF9F0',
  done: '#F0FFF4'
}

const STATUS_LABEL = {
  overdue: 'Overdue',
  upcoming: 'Upcoming',
  done: 'Done'
}

// ─── Add Pet Modal (Health-only) ──────────────────────────────────────────────
function AddPetModal({ onClose, onSave }) {
  const [form, setForm] = useState({ pet_name: '', pet_type: '🐶 Dog', pet_breed: '', emoji: '🐾' })
  const [customType, setCustomType] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.pet_name.trim()) return alert('Please enter a pet name')
    const finalType = form.pet_type === '🐾 Other' ? (customType.trim() || 'Other') : form.pet_type
    setSaving(true)
    await onSave({ ...form, pet_type: finalType })
    setSaving(false)
    onClose()
  }

  const inputStyle = { width: '100%', border: '2px solid #EDE8FF', borderRadius: 10, padding: '9px 12px', fontFamily: 'Nunito, sans-serif', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', color: '#1E1347' }
  const labelStyle = { display: 'block', fontWeight: 700, fontSize: '0.72rem', color: '#6B7280', marginBottom: 4, textTransform: 'uppercase' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(5px)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 22, padding: 24, width: '100%', maxWidth: 400, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', animation: 'slideUp 0.3s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.2rem', color: '#1E1347' }}>🐾 Add Health Profile</div>
          <button onClick={onClose} style={{ border: 'none', background: '#F3F0FF', color: '#6C4BF6', borderRadius: 10, width: 32, height: 32, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Pet Name *</label>
            <input style={inputStyle} value={form.pet_name} onChange={e=>set('pet_name', e.target.value)} placeholder="e.g. Buddy" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Type</label>
              <select style={inputStyle} value={form.pet_type} onChange={e=>set('pet_type', e.target.value)}>
                <option>🐶 Dog</option>
                <option>🐱 Cat</option>
                <option>🐇 Rabbit</option>
                <option>🦜 Bird</option>
                <option>🐾 Other</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Emoji Icon</label>
              <input style={inputStyle} value={form.emoji} onChange={e=>set('emoji', e.target.value)} placeholder="🐾, 🐕, 🐈" />
            </div>
          </div>
          {form.pet_type === '🐾 Other' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <label style={labelStyle}>Specify Pet Type</label>
              <input style={inputStyle} value={customType} onChange={e=>setCustomType(e.target.value)} placeholder="e.g. Hamster, Turtle..." />
            </div>
          )}
          <div>
            <label style={labelStyle}>Breed (Optional)</label>
            <input style={inputStyle} value={form.pet_breed} onChange={e=>set('pet_breed', e.target.value)} placeholder="e.g. Golden Retriever" />
          </div>
          <p style={{ fontSize: '0.72rem', color: '#6B7280', margin: '4px 0', lineHeight: 1.4 }}>
            💡 This pet profile will <b>only</b> be visible in the Health Dashboard.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, border: '2px solid #EDE8FF', background: 'transparent', borderRadius: 12, padding: '11px', cursor: 'pointer', fontWeight: 700, color: '#6B7280' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ flex: 2, background: 'linear-gradient(135deg,#FF6B35,#6C4BF6)', color: '#fff', border: 'none', borderRadius: 12, padding: '11px', cursor: 'pointer', fontWeight: 800 }}>
              {saving ? '⏳ Creating...' : '✨ Create Profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Health Overview ──────────────────────────────────────────────────────────
function HealthOverview({ pets, onSelectPet, onAddPet }) {
  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      {/* Overview Hero */}
      <div style={{ background: 'linear-gradient(135deg,#1E1347,#6C4BF6)', borderRadius: 24, padding: '32px 24px', color: '#fff', textAlign: 'center', marginbottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, right: -20, fontSize: '8rem', opacity: 0.1 }}>🩺</div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '2rem', marginBottom: 8 }}>Pawverse Health Suite</div>
          <p style={{ opacity: 0.88, maxWidth: 480, margin: '0 auto', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Track vaccinations, manage weight logs, and keep your pets healthy with our comprehensive multi-pet dashboard.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h2 style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.25rem', color: '#1E1347', margin: 0 }}>Select a Pet to Manage</h2>
        <div style={{ fontSize: '0.8rem', color: '#6C4BF6', fontWeight: 700 }}>{pets.length} Pet{pets.length!==1?'s':''} Connected</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
        {pets.map(pet => (
          <div key={pet.id} onClick={() => onSelectPet(pet)} className="health-ov-card">
            <div style={{ fontSize: '3rem', marginBottom: 10 }}>{pet.emoji || '🐾'}</div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1E1347' }}>{pet.pet_name}</div>
            <div style={{ fontSize: '0.73rem', color: '#6B7280', marginTop: 2 }}>{pet.pet_breed || pet.pet_type}</div>
            <div style={{ marginTop: 12, background: '#F3F0FF', color: '#6C4BF6', padding: '6px 0', borderRadius: 10, fontSize: '0.72rem', fontWeight: 800, width: '100%' }}>View Records →</div>
          </div>
        ))}
        <div onClick={onAddPet} className="health-ov-card add-card">
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#F3F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', color: '#6C4BF6', marginBottom: 12 }}>+</div>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#6C4BF6' }}>Add New Pet</div>
          <div style={{ fontSize: '0.68rem', color: '#6B7280', marginTop: 3 }}>For health tracking only</div>
        </div>
      </div>
    </div>
  )
}

// ─── Vaccine Modal ────────────────────────────────────────────────────────────
function VaccineModal({ pet, onClose, onSave, editData }) {
  const [form, setForm] = useState(editData ? { ...editData } : {
    pet_name: pet?.pet_name || '',
    pet_type: pet?.pet_type || '',
    pet_breed: pet?.pet_breed || '',
    pet_age: '',
    pet_weight: '',
    vaccine_name: '',
    doctor_clinic: '',
    frequency: '',
    next_due: '',
    report_url: '',
  })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `reports/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('reports').upload(path, file)
      if (error) {
        alert('❌ Upload failed: ' + error.message + '\n\nPlease ensure you have created a public bucket named "reports" in your Supabase storage.')
        console.error('Storage Upload Error:', error)
      } else {
        const { data } = supabase.storage.from('reports').getPublicUrl(path)
        set('report_url', data.publicUrl)
        alert('✅ Report uploaded successfully!')
      }
    } catch(err) {
      alert('❌ Error processing file: ' + err.message)
      console.error('File Error:', err)
    }
    setUploading(false)
  }

  const handleSave = async () => {
    if (!form.vaccine_name?.trim() || !form.doctor_clinic?.trim()) {
      alert('Please fill in Vaccine Name and Doctor & Clinic fields.')
      return
    }
    setSaving(true)
    await onSave(form)
    setSaving(false)
    onClose()
  }

  const inputStyle = { width: '100%', border: '2px solid #EDE8FF', borderRadius: 10, padding: '9px 12px', fontFamily: 'Nunito, sans-serif', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', color: '#1E1347', transition: 'border-color 0.2s' }
  const labelStyle = { display: 'block', fontWeight: 700, fontSize: '0.72rem', color: '#6B7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(5px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 22, padding: 24, width: '100%', maxWidth: 540, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.25)', animation: 'slideUp 0.3s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.1rem', color: '#1E1347' }}>💉 {editData ? 'Edit' : 'Add'} Vaccine Record</div>
          <button onClick={onClose} style={{ border: 'none', background: '#F3F0FF', color: '#6C4BF6', borderRadius: 10, width: 32, height: 32, cursor: 'pointer', fontWeight: 800, fontSize: '1rem', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Pet Name</label>
            <input style={inputStyle} value={form.pet_name||''} onChange={e=>set('pet_name',e.target.value)} placeholder="e.g. Oscar" />
          </div>
          <div>
            <label style={labelStyle}>Pet Type</label>
            <input style={inputStyle} value={form.pet_type||''} onChange={e=>set('pet_type',e.target.value)} placeholder="Dog / Cat / etc" />
          </div>
          <div>
            <label style={labelStyle}>Pet Breed</label>
            <input style={inputStyle} value={form.pet_breed||''} onChange={e=>set('pet_breed',e.target.value)} placeholder="e.g. Labrador" />
          </div>
          <div>
            <label style={labelStyle}>Pet Age</label>
            <input style={inputStyle} value={form.pet_age||''} onChange={e=>set('pet_age',e.target.value)} placeholder="e.g. 2 years" />
          </div>
          <div>
            <label style={labelStyle}>Pet Weight (kg)</label>
            <input type="number" step="0.1" style={inputStyle} value={form.pet_weight||''} onChange={e=>set('pet_weight',e.target.value)} placeholder="e.g. 4.2" />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Vaccine Name *</label>
            <input style={inputStyle} value={form.vaccine_name||''} onChange={e=>set('vaccine_name',e.target.value)} placeholder="e.g. Rabies, DHPP, FVRCP" />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Doctor & Clinic Name *</label>
            <input style={inputStyle} value={form.doctor_clinic||''} onChange={e=>set('doctor_clinic',e.target.value)} placeholder="e.g. Dr. Sharma — PetCare Clinic" />
          </div>
          <div>
            <label style={labelStyle}>Vaccine Frequency</label>
            <input style={inputStyle} value={form.frequency||''} onChange={e=>set('frequency',e.target.value)} placeholder="e.g. Annual" />
          </div>
          <div>
            <label style={labelStyle}>Next Due Date</label>
            <input type="date" style={inputStyle} value={form.next_due||''} onChange={e=>set('next_due',e.target.value)} />
          </div>
        </div>
        {/* Upload Report */}
        <div style={{ marginTop: 16, padding: '16px', background: 'linear-gradient(135deg,#F3F0FF,#E8F4FF)', borderRadius: 14, textAlign: 'center', border: '2px dashed #C4B5FD' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: 4 }}>📄</div>
          <div style={{ fontWeight: 700, fontSize: '0.83rem', color: '#6C4BF6', marginBottom: 8 }}>Upload Report / Vaccination Certificate</div>
          {form.report_url ? (
            <div>
              <div style={{ color: '#22C55E', fontWeight: 700, fontSize: '0.8rem', marginBottom: 6 }}>✅ Report uploaded</div>
              <button onClick={()=>set('report_url','')} style={{ border: 'none', background: '#FFDCE0', color: '#FF4757', borderRadius: 8, padding: '4px 14px', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}>Remove</button>
            </div>
          ) : (
            <button onClick={()=>fileRef.current?.click()} disabled={uploading} style={{ background: '#6C4BF6', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 20px', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem' }}>
              {uploading ? '⏳ Uploading...' : '📎 Choose File (PDF / Image)'}
            </button>
          )}
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFile} style={{ display: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={onClose} style={{ flex: 1, border: '2px solid #EDE8FF', background: 'transparent', borderRadius: 12, padding: '11px', cursor: 'pointer', fontWeight: 700, color: '#6B7280' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, background: 'linear-gradient(135deg,#FF6B35,#6C4BF6)', color: '#fff', border: 'none', borderRadius: 12, padding: '11px', cursor: 'pointer', fontWeight: 800, fontSize: '0.9rem' }}>
            {saving ? '⏳ Saving...' : '💾 Save Vaccine Record'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Weight Modal ─────────────────────────────────────────────────────────────
function WeightModal({ pet, onClose, onSave }) {
  const [weight, setWeight] = useState('')
  const [saving, setSaving] = useState(false)
  const handleSave = async () => {
    if (!weight) return
    setSaving(true)
    await onSave(parseFloat(weight))
    setSaving(false)
    onClose()
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(5px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 22, padding: 28, width: '100%', maxWidth: 360, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', animation: 'slideUp 0.3s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: '2.6rem' }}>⚖️</div>
          <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.15rem', color: '#1E1347', marginTop: 4 }}>Update Weight</div>
          <div style={{ color: '#6B7280', fontSize: '0.8rem', marginTop: 3 }}>{pet?.pet_name} · {pet?.pet_breed}</div>
        </div>
        <input type="number" step="0.1" min="0" placeholder="Weight in kg (e.g. 4.2)"
          value={weight} onChange={e=>setWeight(e.target.value)}
          style={{ width: '100%', border: '2px solid #EDE8FF', borderRadius: 12, padding: '13px 16px', fontFamily: 'Nunito, sans-serif', fontSize: '1rem', outline: 'none', boxSizing: 'border-box', textAlign: 'center', color: '#1E1347', marginBottom: 14 }} />
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, border: '2px solid #EDE8FF', background: 'transparent', borderRadius: 12, padding: '11px', cursor: 'pointer', fontWeight: 700, color: '#6B7280' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving||!weight} style={{ flex: 2, background: 'linear-gradient(135deg,#FF6B35,#6C4BF6)', color: '#fff', border: 'none', borderRadius: 12, padding: '11px', cursor: 'pointer', fontWeight: 800, fontSize: '0.9rem', opacity: !weight?0.6:1 }}>
            {saving ? '⏳ Saving...' : '✅ Update Weight'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Notification Banners ─────────────────────────────────────────────────────
function NotificationBanner({ notifications, onDismiss, onBook }) {
  if (!notifications.length) return null
  return (
    <div style={{ marginBottom: 14 }}>
      {notifications.map((n, i) => (
        <div key={i} style={{
          background: n.type==='vaccine' ? 'linear-gradient(135deg,#FFF8E1,#FFE8D5)' : 'linear-gradient(135deg,#E8F4FF,#F0EBFF)',
          border: `1.5px solid ${n.type==='vaccine' ? '#FFD166' : '#C4B5FD'}`,
          borderRadius: 14, padding: '11px 14px', marginBottom: 8,
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', animation: 'fadeIn 0.3s ease'
        }}>
          <span style={{ fontSize: '1.4rem' }}>{n.type==='vaccine' ? '💉' : '⚖️'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#1E1347' }}>{n.title}</div>
            <div style={{ fontSize: '0.74rem', color: '#6B7280', marginTop: 2 }}>{n.body}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {n.type==='vaccine' && (
              <button onClick={onBook} style={{ background: '#6C4BF6', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontWeight: 700, fontSize: '0.73rem', whiteSpace: 'nowrap' }}>📅 Book Appt</button>
            )}
            <button onClick={()=>onDismiss(i)} style={{ background: 'rgba(0,0,0,0.07)', color: '#6B7280', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.73rem' }}>✕</button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Pet Health Dashboard (inner tabs: vaccines/weight/meds/visits) ───────────
function PetHealthDashboard({ pet, user, router, onBack }) {
  const [tab, setTab] = useState('vaccines')
  const [vaccines, setVaccines] = useState([])
  const [weightLog, setWeightLog] = useState([])
  const [notifications, setNotifications] = useState([])
  const [showVaccineModal, setShowVaccineModal] = useState(false)
  const [editVaccine, setEditVaccine] = useState(null)
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [medChecks, setMedChecks] = useState({})
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)

  const medicines = PET_MEDICINES[pet?.pet_type] || PET_MEDICINES.default

  useEffect(() => { if (pet?.id) loadData() }, [pet?.id])

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(''), 3000) }

  const loadData = async () => {
    setLoading(true)
    try {
      const [{ data: vax, error: vaxErr }, { data: wt, error: wtErr }] = await Promise.all([
        supabase.from('pet_vaccines').select('*').eq('pet_id', pet.id).order('created_at', { ascending: false }),
        supabase.from('pet_weights').select('*').eq('pet_id', pet.id).order('recorded_at', { ascending: true }).limit(6),
      ])
      if (vaxErr) console.error('Vaccine fetch error:', vaxErr)
      if (wtErr)  console.error('Weight fetch error:', wtErr)
      const vaxList = vax || []
      setVaccines(vaxList)
      setWeightLog(wt || [])
      // Notifications
      const notifs = []
      vaxList.forEach(v => {
        if (v.next_due) {
          const d = daysUntil(v.next_due)
          if (d !== null && d < 0) {
            notifs.push({ type: 'vaccine', title: `⚠️ ${pet.pet_name}'s ${v.vaccine_name} is overdue!`, body: `Overdue by ${Math.abs(d)} day${Math.abs(d)===1?'':'s'}. Please update.` })
          } else if (d !== null && d >= 0 && d <= 7) {
            notifs.push({ type: 'vaccine', title: `💉 ${pet.pet_name}'s ${v.vaccine_name} due soon!`, body: `Due in ${d} day${d===1?'':'s'}. Book an appointment!` })
          }
        }
      })
      const day = new Date().getDate()
      if (day >= 1 && day <= 5) {
        notifs.push({ type: 'weight', title: `⚖️ Monthly weight check for ${pet.pet_name}!`, body: `${pet.pet_name} (${pet.pet_breed||pet.pet_type}) — tap Update to log this month` })
      }
      setNotifications(notifs)
    } catch(e) { console.error('loadData error:', e) }
    setLoading(false)
  }

  const handleSaveVaccine = async (form) => {
    const record = {
      pet_id: pet.id,
      user_id: user.id,
      pet_name: form.pet_name || pet.pet_name,
      pet_type: form.pet_type || pet.pet_type,
      pet_breed: form.pet_breed || pet.pet_breed,
      pet_age: form.pet_age || '',
      pet_weight: form.pet_weight || null,
      vaccine_name: form.vaccine_name,
      doctor_clinic: form.doctor_clinic,
      frequency: form.frequency || '',
      next_due: form.next_due || null,
      report_url: form.report_url || null,
      status: getVaccineStatus(form.next_due),
    }
    let err
    if (editVaccine?.id) {
      const { error } = await supabase.from('pet_vaccines').update(record).eq('id', editVaccine.id)
      err = error
    } else {
      const { error } = await supabase.from('pet_vaccines').insert(record)
      err = error
    }
    if (err) { alert('Error saving: ' + err.message); return }
    await loadData()
    setEditVaccine(null)
    showToast('✅ Vaccine record saved!')
  }

  const handleSaveWeight = async (weight) => {
    const now = new Date()
    const { error } = await supabase.from('pet_weights').insert({
      pet_id: pet.id, user_id: user.id, weight_kg: weight,
      recorded_at: now.toISOString(),
      month_label: now.toLocaleString('default', { month: 'short', year: '2-digit' })
    })
    if (error) { alert('Error saving weight: ' + error.message); return }
    await loadData()
    showToast(`✅ Weight updated: ${weight} kg`)
  }

  const handleDeleteVaccine = async (id) => {
    if (!confirm('Delete this vaccine record?')) return
    await supabase.from('pet_vaccines').delete().eq('id', id)
    await loadData()
    showToast('🗑️ Record deleted')
  }

  const bookVet = () => router.push('/marketplace?category=services')

  const tabItems = [
    ['vaccines','💉','Vaccines'],
    ['weight','⚖️','Weight'],
    ['meds','💊','Meds'],
    ['visits','🏥','Visits'],
  ]

  const doneVax    = vaccines.filter(v => getVaccineStatus(v.next_due)==='done').length
  const overdueVax = vaccines.filter(v => getVaccineStatus(v.next_due)==='overdue').length
  const latestW    = weightLog.length ? weightLog[weightLog.length-1]?.weight_kg : null
  const healthScore = Math.max(55, 100 - overdueVax*15)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Back to all pets */}
      <button onClick={onBack} style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.8)', border: '1.5px solid #EDE8FF', borderRadius: 10, padding: '6px 12px', fontSize: '0.78rem', fontWeight: 800, color: '#6C4BF6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
        ← Back to All Pets
      </button>
      <NotificationBanner notifications={notifications} onDismiss={i=>setNotifications(n=>n.filter((_,idx)=>idx!==i))} onBook={bookVet} />

      {/* Hero */}
      <div className="card" style={{ background: 'linear-gradient(135deg,#3B82F6,#6C4BF6)', border: 'none', padding: '18px 20px' }}>
        <div style={{ color:'#fff', fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:'1.15rem', marginBottom:2 }}>🩺 {pet?.pet_name}'s Health</div>
        <div style={{ color:'rgba(255,255,255,0.8)', fontSize:'0.8rem', marginBottom:12 }}>Vaccines · Weight · Meds — all in one place</div>
        <div className="ph-stat-grid">
          {[
            ['Vaccines', `${doneVax}/${vaccines.length}`, '💉'],
            ['Overdue',  overdueVax, '⚠️'],
            ['Weight',   latestW ? `${latestW}kg` : '—', '⚖️'],
            ['Health',   `${healthScore}/100`, '❤️'],
          ].map(([l,v,ic])=>(
            <div key={l} style={{ background:'rgba(255,255,255,0.17)', borderRadius:12, padding:'10px 4px', textAlign:'center' }}>
              <div style={{ fontSize:'1.1rem' }}>{ic}</div>
              <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, color:'#fff', fontSize:'0.95rem' }}>{v}</div>
              <div style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.75)' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Inner tab bar */}
      <div className="ph-inner-tabs">
        {tabItems.map(([k,icon,lb])=>(
          <button key={k} onClick={()=>setTab(k)} className={`ph-inner-tab-btn${tab===k?' active':''}`}>
            <span>{icon}</span>
            <span className="ph-tab-label">{lb}</span>
            {k==='vaccines' && overdueVax>0 && <span className="ph-badge">{overdueVax}</span>}
          </button>
        ))}
      </div>

      {/* VACCINES */}
      {tab==='vaccines' && (
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, flexWrap:'wrap', gap:8 }}>
            <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, color:'#1E1347' }}>💉 Vaccination Record</div>
            <button onClick={()=>{setEditVaccine(null);setShowVaccineModal(true)}} className="btn-secondary" style={{ padding:'6px 14px', fontSize:'0.79rem' }}>+ Add Vaccine</button>
          </div>
          {loading ? (
            <div style={{ textAlign:'center', padding:28, color:'#6B7280', fontSize:'0.85rem' }}>Loading records...</div>
          ) : vaccines.length===0 ? (
            <div style={{ textAlign:'center', padding:'36px 20px', color:'#6B7280' }}>
              <div style={{ fontSize:'2.5rem', marginBottom:8 }}>💉</div>
              <div style={{ fontWeight:700, marginBottom:5 }}>No vaccine records yet</div>
              <div style={{ fontSize:'0.8rem', marginBottom:14 }}>Add your first vaccine record to start tracking</div>
              <button onClick={()=>setShowVaccineModal(true)} className="btn-primary" style={{ fontSize:'0.82rem' }}>+ Add First Vaccine</button>
            </div>
          ) : vaccines.map(v => {
            const status = getVaccineStatus(v.next_due)
            const dl = v.next_due ? daysUntil(v.next_due) : null
            return (
              <div key={v.id} className="ph-vaccine-row">
                <div style={{ width:11, height:11, borderRadius:'50%', background:STATUS_COLOR[status], flexShrink:0, marginTop:3 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:800, fontSize:'0.89rem', color:'#1E1347' }}>{v.vaccine_name}</div>
                  <div style={{ fontSize:'0.71rem', color:'#6B7280', marginTop:2 }}>
                    {v.doctor_clinic && <span>🏥 {v.doctor_clinic}</span>}
                    {v.frequency && <span> · 🔁 {v.frequency}</span>}
                  </div>
                  <div style={{ fontSize:'0.7rem', color:'#6B7280', marginTop:1 }}>
                    Due: {v.next_due ? new Date(v.next_due).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—'}
                    {dl!==null && dl>=0 && dl<=30 && <span style={{ color:dl<=7?'#FF4757':'#FF6B35', fontWeight:700, marginLeft:5 }}>({dl}d left)</span>}
                    {dl!==null && dl<0  && <span style={{ color:'#FF4757', fontWeight:700, marginLeft:5 }}>(overdue {Math.abs(dl)}d)</span>}
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5, flexShrink:0 }}>
                  <span style={{ background:STATUS_BG[status], color:STATUS_COLOR[status], padding:'3px 9px', borderRadius:20, fontSize:'0.67rem', fontWeight:800 }}>{STATUS_LABEL[status]}</span>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    {v.report_url && (
                      <a href={v.report_url} target="_blank" rel="noreferrer" 
                         style={{ background:'#E8F4FF', color:'#3B82F6', borderRadius:8, padding:'4px 10px', fontWeight:800, fontSize:'0.7rem', textDecoration:'none', display:'flex', alignItems:'center', gap:5, border:'1px solid #BFDBFE' }}>
                        📄 {v.report_url.match(/\.(jpg|jpeg|png|webp)/i) ? (
                          <img src={v.report_url} style={{ width:18, height:18, borderRadius:4, objectFit:'cover' }} alt="report" />
                        ) : 'View Report'}
                      </a>
                    )}
                    <button onClick={()=>{setEditVaccine(v);setShowVaccineModal(true)}} style={{ background:'#F3F0FF', color:'#6C4BF6', border:'1px solid #DDD6FE', borderRadius:8, padding:'4px 8px', cursor:'pointer', fontWeight:700, fontSize:'0.72rem' }}>✏️ Edit</button>
                    <button onClick={()=>handleDeleteVaccine(v.id)} style={{ background:'#FFDCE0', color:'#FF4757', border:'1px solid #FECACA', borderRadius:8, padding:'4px 8px', cursor:'pointer', fontWeight:700, fontSize:'0.72rem' }}>🗑️</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* WEIGHT */}
      {tab==='weight' && (
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, flexWrap:'wrap', gap:8 }}>
            <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, color:'#1E1347' }}>⚖️ Weight Log</div>
            <button onClick={()=>setShowWeightModal(true)} className="btn-secondary" style={{ padding:'6px 14px', fontSize:'0.79rem' }}>+ Update Weight</button>
          </div>
          {new Date().getDate()<=5 && (
            <div style={{ background:'linear-gradient(135deg,#FFF8E1,#FFE8D5)', border:'1.5px solid #FFD166', borderRadius:12, padding:'10px 14px', marginBottom:12, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <span style={{ fontSize:'1.2rem' }}>📅</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:'0.83rem', color:'#1E1347' }}>Monthly Weight Check!</div>
                <div style={{ fontSize:'0.72rem', color:'#6B7280' }}>Update {pet?.pet_name}'s weight for this month</div>
              </div>
              <button onClick={()=>setShowWeightModal(true)} style={{ background:'#FF6B35', color:'#fff', border:'none', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontWeight:700, fontSize:'0.73rem', whiteSpace:'nowrap' }}>Update</button>
            </div>
          )}
          {weightLog.length===0 ? (
            <div style={{ textAlign:'center', padding:'36px 20px', color:'#6B7280' }}>
              <div style={{ fontSize:'2.5rem', marginBottom:8 }}>⚖️</div>
              <div style={{ fontWeight:700, marginBottom:5 }}>No weight data yet</div>
              <div style={{ fontSize:'0.8rem', marginBottom:14 }}>Update monthly to track progress</div>
              <button onClick={()=>setShowWeightModal(true)} className="btn-primary" style={{ fontSize:'0.82rem' }}>+ Add First Weight</button>
            </div>
          ) : (
            <>
              <div className="ph-weight-bars">
                {weightLog.map((entry,i)=>{
                  const vals = weightLog.map(e=>e.weight_kg)
                  const max=Math.max(...vals), min=Math.min(...vals)
                  const pct = max===min ? 60 : ((entry.weight_kg-min)/(max-min))*65+30
                  return (
                    <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                      <div style={{ fontSize:'0.67rem', color:'#FF6B35', fontWeight:800 }}>{entry.weight_kg}</div>
                      <div style={{ width:'100%', background:'linear-gradient(180deg,#FF6B35,#6C4BF6)', borderRadius:'5px 5px 0 0', height:`${pct}%`, transition:'height 0.5s ease', minHeight:20 }} />
                      <div style={{ fontSize:'0.63rem', color:'#6B7280', textAlign:'center' }}>{entry.month_label||new Date(entry.recorded_at).toLocaleString('default',{month:'short'})}</div>
                    </div>
                  )
                })}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:6, fontSize:'0.81rem', marginTop:10 }}>
                <span style={{ color:'#6B7280' }}>Current: <strong style={{ color:'#FF6B35' }}>{weightLog[weightLog.length-1]?.weight_kg} kg</strong></span>
                {weightLog.length>1 && (()=>{
                  const diff=(weightLog[weightLog.length-1]?.weight_kg - weightLog[0]?.weight_kg).toFixed(1)
                  return <span style={{ color:'#6B7280' }}>Change: <strong style={{ color:diff>0?'#FF6B35':'#22C55E' }}>{diff>0?'+':''}{diff} kg</strong></span>
                })()}
                <span style={{ color:'#22C55E', fontWeight:700 }}>✅ Tracking Active</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* MEDS */}
      {tab==='meds' && (
        <div className="card">
          <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, color:'#1E1347', marginBottom:3 }}>💊 Suggested Medicines</div>
          <div style={{ fontSize:'0.77rem', color:'#6B7280', marginBottom:12 }}>Top 5 recommended medications (not vaccines) for {pet?.pet_name}</div>
          <div style={{ background:'#F3F0FF', borderRadius:12, padding:'9px 14px', marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:'1.2rem' }}>{pet?.emoji||'🐾'}</span>
            <div>
              <div style={{ fontWeight:700, fontSize:'0.81rem', color:'#6C4BF6' }}>{pet?.pet_name} · {pet?.pet_type}</div>
              <div style={{ fontSize:'0.7rem', color:'#6B7280' }}>Suggestions for {(pet?.pet_type||'your pet').split(' ').pop()}</div>
            </div>
          </div>
          {medicines.map((m,i)=>(
            <div key={i} className="ph-med-item">
              <div style={{ width:42, height:42, borderRadius:11, background:'linear-gradient(135deg,#E8F4FF,#F0EBFF)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', flexShrink:0 }}>{m.icon}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:800, fontSize:'0.87rem', color:'#1E1347' }}>{m.name}</div>
                <div style={{ fontSize:'0.72rem', color:'#6B7280', marginTop:1 }}>{m.desc}</div>
                <div style={{ fontSize:'0.68rem', color:'#6C4BF6', fontWeight:700, marginTop:2 }}>🔁 {m.freq}</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}>
                <button onClick={bookVet} style={{ background:'#E8F4FF', color:'#3B82F6', border:'none', borderRadius:8, padding:'5px 10px', cursor:'pointer', fontWeight:700, fontSize:'0.69rem', whiteSpace:'nowrap' }}>📅 Book Vet</button>
                <label style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer' }}>
                  <input type="checkbox" checked={!!medChecks[`${pet.id}_${i}`]} onChange={e=>setMedChecks(c=>({...c,[`${pet.id}_${i}`]:e.target.checked}))} style={{ width:16, height:16, accentColor:'#22C55E', cursor:'pointer' }} />
                  <span style={{ fontSize:'0.68rem', fontWeight:700, color:medChecks[`${pet.id}_${i}`]?'#22C55E':'#9CA3AF' }}>{medChecks[`${pet.id}_${i}`]?'✅ Done':'Mark'}</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VISITS */}
      {tab==='visits' && (
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, flexWrap:'wrap', gap:8 }}>
            <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, color:'#1E1347' }}>🏥 Vet Visit History</div>
            <button onClick={bookVet} className="btn-secondary" style={{ padding:'6px 14px', fontSize:'0.79rem' }}>📅 Book Visit</button>
          </div>
          <div style={{ textAlign:'center', padding:'36px 20px', color:'#6B7280' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:8 }}>🏥</div>
            <div style={{ fontWeight:700, marginBottom:5 }}>No visits recorded</div>
            <div style={{ fontSize:'0.8rem', marginBottom:14 }}>Visit history will appear after your appointments</div>
            <button onClick={bookVet} className="btn-primary" style={{ fontSize:'0.82rem' }}>📅 Book First Appointment</button>
          </div>
        </div>
      )}

      {showVaccineModal && (
        <VaccineModal pet={pet} editData={editVaccine} onClose={()=>{setShowVaccineModal(false);setEditVaccine(null)}} onSave={handleSaveVaccine} />
      )}
      {showWeightModal && (
        <WeightModal pet={pet} onClose={()=>setShowWeightModal(false)} onSave={handleSaveWeight} />
      )}

      {toast && (
        <div style={{ position:'fixed', bottom:90, right:16, left:16, maxWidth:360, margin:'0 auto', background:'#1E1347', color:'#fff', padding:'12px 18px', borderRadius:14, fontWeight:700, fontSize:'0.86rem', zIndex:3000, textAlign:'center', boxShadow:'0 8px 24px rgba(0,0,0,0.25)', animation:'slideUp 0.3s ease' }}>{toast}</div>
      )}
    </div>
  )
}

// ─── Main Health Page ─────────────────────────────────────────────────────────
export default function Health() {
  const router  = useRouter()
  const [user,       setUser]       = useState(null)
  const [pets,       setPets]       = useState([])
  const [activePet,  setActivePet]  = useState(null)
  const [showAddPet, setShowAddPet] = useState(false)
  const [loading,    setLoading]    = useState(true)

  const playSound = (type) => {
    try {
      const src = type === 'message' ? '/message.mp3' : '/notification.mp3'
      const audio = new Audio(src)
      audio.volume = 0.6
      audio.play().catch(() => {})
    } catch (e) {}
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      setUser(session.user)
      loadPets(session.user.id)
    })
  }, [])

  useEffect(() => {
    if (pets.length > 0) {
      checkUpcomingVaccines()
    }
  }, [pets])

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return
    
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        const success = await subscribeUserToPush(user)
        if (success) {
          alert('✅ Mobile Notifications Enabled & Refreshed!')
        } else {
          alert('⚠️ Notifications enabled but subscription failed. Please try again.')
        }
      }
    } catch (err) {
      console.error('Permission Request Error:', err)
    }
  }

  const checkUpcomingVaccines = async () => {
    if (!user || !('Notification' in window) || Notification.permission !== 'granted') return
    
    // Check all pets for vaccines due in 0-7 days
    for (const pet of pets) {
      const { data: vaccines } = await supabase
        .from('pet_vaccines')
        .select('*')
        .eq('pet_id', pet.id)
      
      if (!vaccines) continue

      vaccines.forEach(v => {
        if (!v.next_due) return
        const days = daysUntil(v.next_due)
        // Notify daily if within 7 days and not yet done
        if (days >= 0 && days <= 7) {
          const formattedDate = new Date(v.next_due).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
          playSound('notification')
          new Notification(`🩺 Vaccine Reminder: ${pet.pet_name}`, {
            body: `Vaccine Name: ${v.vaccine_name}\nDate: ${formattedDate}\nNote: If already done, please update it in your profile health page at pawversesocial.com`,
            icon: pet.emoji || '/logo.png',
            vibrate: [200, 100, 200],
            tag: `vax_${v.id}_${new Date().toDateString()}`
          })

          // ── SEND REAL BACKGROUND PUSH ──
          fetch('/api/push', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: user.id,
              title: `🩺 Vaccine Reminder: ${pet.pet_name}`,
              body: `Vaccine: ${v.vaccine_name} | Date: ${formattedDate}`,
              url: '/health'
            })
          }).catch(e => console.error('Push failed:', e))
        }
      })
    }
  }

  const loadPets = async (uid) => {
    const { data, error } = await supabase.from('pets').select('*').eq('user_id', uid)
    if (error) console.error('Pets fetch error:', error)
    setPets(data || [])
    setLoading(false)
  }

  const handleAddPet = async (petForm) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    
    // Fetch owner name from primary pet
    const { data: primaryPet } = await supabase
      .from('pets')
      .select('owner_name')
      .eq('user_id', session.user.id)
      .eq('is_health_pet', false)
      .limit(1)
      .single()

    const { error } = await supabase.from('pets').insert({
      user_id: session.user.id,
      owner_name: primaryPet?.owner_name || 'Owner',
      pet_name: petForm.pet_name,
      pet_type: petForm.pet_type,
      pet_breed: petForm.pet_breed,
      emoji: petForm.emoji,
      is_health_pet: true
    })
    if (error) {
      alert('Error creating pet: ' + error.message)
    } else {
      loadPets(session.user.id)
    }
  }

  const bookVet = () => router.push('/marketplace?category=services')

  return (
    <div style={{ background:'linear-gradient(135deg,rgba(213,134,200,1),rgba(105,201,249,1))', minHeight:'100vh' }}>
      <NavBar user={user} pet={pets[0]} />

      <div className="health-container" style={{ position: 'relative' }}>
        {/* Enable / Refresh Notification Button */}
        {typeof window !== 'undefined' && 'Notification' in window && (
          <button 
            onClick={requestNotificationPermission}
            className="pulse-button"
            style={{
              position: 'fixed', bottom: 85, right: 20, zIndex: 2000,
              background: 'linear-gradient(135deg, #FF6B35, #6C4BF6)',
              color: '#fff', border: 'none', borderRadius: 50,
              padding: '12px 20px', fontWeight: 800, fontSize: '0.85rem',
              boxShadow: '0 8px 24px rgba(108,75,246,0.3)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
            }}>
            {Notification.permission === 'granted' ? '🔄 Refresh Mobile Alerts' : '🔔 Enable Phone Reminders'}
          </button>
        )}

      <style>{`
        @keyframes slideUp { from { transform:translateY(16px); opacity:0 } to { transform:translateY(0); opacity:1 } }
        @keyframes fadeIn  { from { opacity:0 }                             to { opacity:1 } }

        /* ── outer layout ── */
        .health-outer {
          display: grid;
          grid-template-columns: 230px 1fr;
          gap: 16px;
          max-width: 1080px;
          margin: 80px auto 0;
          padding: 24px 14px 40px;
        }
        .health-sidebar {
          position: sticky; top: 76px; align-self: start;
          display: flex; flex-direction: column; gap: 12px;
        }

        /* pet tabs in sidebar */
        .pet-tab-btn {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 12px; cursor: pointer;
          border: 1.5px solid #EDE8FF; background: #fff;
          transition: all 0.2s; text-align: left; width: 100%;
          font-family: Nunito, sans-serif;
        }
        .pet-tab-btn:hover  { border-color: #6C4BF6; background: #F3F0FF; }
        .pet-tab-btn.active { border-color: #6C4BF6; background: #F3F0FF; box-shadow: 0 2px 12px rgba(108,75,246,0.15); }
        .pet-tab-btn.overview { background: #6C4BF6; color: #fff; border: none; }
        .pet-tab-btn.overview:hover { background: #5a3edb; }

        /* overview cards */
        .health-ov-card {
           background: #fff; border-radius: 20px; padding: 24px 16px; text-align: center;
           border: 1.5px solid #EDE8FF; transition: all 0.2s; cursor: pointer;
           display: flex; flex-direction: column; align-items: center; justify-content: center;
        }
        .health-ov-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(108,75,246,0.12); border-color: #6C4BF6; }
        .health-ov-card.add-card { border: 2px dashed #C4B5FD; background: #fdfcff; }
        .health-ov-card.add-card:hover { background: #f3f0ff; border-style: solid; }

        /* inner tab bar (vaccines / weight / meds / visits) */
        .ph-inner-tabs {
          display: flex; gap: 4px; background: #fff; border-radius: 14px;
          padding: 5px; border: 1.5px solid #EDE8FF; overflow-x: auto; flex-shrink: 0;
        }
        .ph-inner-tab-btn {
          display: flex; align-items: center; gap: 5px; padding: 7px 14px;
          border: none; background: transparent; border-radius: 10px; cursor: pointer;
          font-family: Nunito, sans-serif; font-weight: 700; font-size: 0.82rem;
          color: #6B7280; white-space: nowrap; transition: all 0.2s; position: relative;
        }
        .ph-inner-tab-btn.active { background: linear-gradient(135deg,#FF6B35,#6C4BF6); color: #fff; }
        .ph-badge {
          background: #FF4757; color: #fff; border-radius: 10px;
          padding: 1px 6px; font-size: 0.6rem; font-weight: 800; margin-left: 2px;
        }
        .ph-inner-tab-btn.active .ph-badge { background: rgba(255,255,255,0.35); }

        /* stats */
        .ph-stat-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; }

        /* vaccine rows */
        .ph-vaccine-row {
          display: flex; align-items: flex-start; gap: 11px;
          padding: 12px 14px; border-radius: 13px; border: 1.5px solid #EDE8FF;
          margin-bottom: 8px; background: #fff; transition: all 0.18s;
        }
        .ph-vaccine-row:hover { transform: translateX(3px); box-shadow: 0 3px 12px rgba(108,75,246,0.1); }

        /* weight bars */
        .ph-weight-bars { display:flex; align-items:flex-end; gap:10px; height:140px; border-bottom:2px solid #EDE8FF; padding-bottom:6px; }

        /* med items */
        .ph-med-item {
          display:flex; align-items:center; gap:12px; padding:13px;
          border-radius:13px; border:1.5px solid #EDE8FF; margin-bottom:8px;
          background:#fff; transition:all 0.18s;
        }
        .ph-med-item:hover { box-shadow: 0 3px 12px rgba(108,75,246,0.1); }

        /* mobile */
        .health-mobile-pet-tabs { display: none; }
        .health-mobile-topbar   { display: none; }

        .pulse-button {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(108,75,246,0.4); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(108,75,246,0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(108,75,246,0); }
        }

        @media (max-width: 767px) {
          .health-outer {
            grid-template-columns: 1fr;
            margin-top: 56px;
            padding: 0 0 84px 0;
            gap: 0;
          }
          .health-sidebar { display: none; }
          .health-main { padding: 12px; }

          /* horizontal scrollable pet tabs on mobile */
          .health-mobile-pet-tabs {
            display: flex; gap: 8px; overflow-x: auto; padding: 10px 12px 6px;
            background: rgba(255,255,255,0.9); backdrop-filter: blur(10px);
            border-bottom: 1px solid #EDE8FF; position: sticky; top: 56px; z-index: 50;
            scrollbar-width: none;
          }
          .health-mobile-pet-tabs::-webkit-scrollbar { display: none; }
          .mobile-pet-chip {
            display: flex; align-items: center; gap: 6px;
            padding: 6px 12px; border-radius: 20px; cursor: pointer;
            border: 1.5px solid #EDE8FF; background: #fff;
            font-family: Nunito, sans-serif; font-weight: 700; font-size: 0.78rem;
            white-space: nowrap; transition: all 0.18s; flex-shrink: 0; color: #6B7280;
          }
          .mobile-pet-chip.active { background: linear-gradient(135deg,#FF6B35,#6C4BF6); color:#fff; border-color: transparent; }

          .ph-stat-grid { grid-template-columns: repeat(2,1fr); gap:8px; }
          .ph-inner-tab-btn { padding: 7px 10px; font-size: 0.78rem; }
          .ph-tab-label { display: none; }
          .ph-inner-tab-btn.active .ph-tab-label { display: inline; }
          .ph-vaccine-row { flex-wrap: wrap; }
        }
      `}</style>

      {loading ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'80vh', flexDirection:'column', gap:12 }}>
          <div style={{ fontSize:'2.5rem' }}>🐾</div>
          <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, color:'#fff', fontSize:'1.05rem' }}>Loading Health Dashboard...</div>
        </div>
      ) : pets.length === 0 ? (
        <div style={{ maxWidth:480, margin:'80px auto', padding:24, textAlign:'center' }}>
          <div className="card" style={{ padding:36 }}>
            <div style={{ fontSize:'3rem', marginBottom:10 }}>🐾</div>
            <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:'1.2rem', color:'#1E1347', marginBottom:8 }}>No pets found</div>
            <div style={{ color:'#6B7280', fontSize:'0.86rem', marginBottom:20 }}>Create a pet profile first to use the health dashboard.</div>
            <button onClick={()=>router.push('/profile')} className="btn-primary">Go to Profile →</button>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile horizontal pet chips */}
          {pets.length > 1 && (
            <div className="health-mobile-pet-tabs">
              {pets.map(p=>(
                <button key={p.id} className={`mobile-pet-chip${activePet?.id===p.id?' active':''}`} onClick={()=>setActivePet(p)}>
                  <span style={{ fontSize:'1.1rem' }}>{p.emoji||'🐾'}</span>
                  <span>{p.pet_name}</span>
                </button>
              ))}
            </div>
          )}

          <div className="health-outer">
            {/* ── Desktop Sidebar ── */}
            <div className="health-sidebar">
              {/* Page title / Overview toggle */}
              <button onClick={()=>setActivePet(null)} className={`pet-tab-btn${!activePet?' overview':''}`} style={{ border: 'none', padding: '16px 14px', textAlign: 'center', flexDirection: 'column', height: 'auto' }}>
                <div style={{ fontSize: '1.4rem' }}>🩺</div>
                <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '0.95rem' }}>Overview Console</div>
              </button>

              {/* Pet tabs */}
              <div className="card" style={{ padding:'10px 10px' }}>
                <div style={{ fontWeight:700, fontSize:'0.72rem', color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8, paddingLeft:4 }}>My Pets</div>
                {pets.map(p=>(
                  <button key={p.id} className={`pet-tab-btn${activePet?.id===p.id?' active':''}`} onClick={()=>setActivePet(p)}>
                    <span style={{ fontSize:'1.6rem', lineHeight:1 }}>{p.emoji||'🐾'}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:800, fontSize:'0.87rem', color: activePet?.id===p.id ? '#6C4BF6' : '#1E1347', marginBottom:1 }}>{p.pet_name}</div>
                      <div style={{ fontSize:'0.69rem', color:'#6B7280', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.pet_breed||p.pet_type}</div>
                    </div>
                  </button>
                ))}
                <button onClick={()=>setShowAddPet(true)} style={{ width: '100%', marginTop: 8, padding: '8px', borderRadius: 10, border: '1.5px dashed #C4B5FD', background: 'transparent', color: '#6C4BF6', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
                  + Add Health Profile
                </button>
              </div>

              {/* Book Vet — goes to marketplace */}
              <button className="btn-primary" style={{ width:'100%', fontSize:'0.83rem' }} onClick={bookVet}>
                📅 Book Vet Appointment
              </button>
            </div>

            {/* ── Main content ── */}
            <div className="health-main">
              {!activePet ? (
                <HealthOverview pets={pets} onSelectPet={setActivePet} onAddPet={()=>setShowAddPet(true)} />
              ) : (
                <>
                  {/* Active pet header (shown on desktop above dashboard) */}
                  <div style={{ display:'flex', alignItems:'center', gap:12, background:'rgba(255,255,255,0.85)', backdropFilter:'blur(10px)', borderRadius:16, padding:'12px 16px', marginBottom:14, border:'1.5px solid #EDE8FF', flexWrap:'wrap' }}>
                    <div style={{ fontSize:'2.2rem' }}>{activePet?.emoji||'🐾'}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:"'Baloo 2',cursive", fontWeight:800, fontSize:'1rem', color:'#1E1347' }}>{activePet?.pet_name}</div>
                      <div style={{ fontSize:'0.73rem', color:'#6B7280' }}>{activePet?.pet_breed} · {activePet?.pet_type}</div>
                    </div>
                    <button onClick={bookVet} style={{ background:'linear-gradient(135deg,#FF6B35,#6C4BF6)', color:'#fff', border:'none', borderRadius:11, padding:'8px 14px', cursor:'pointer', fontWeight:800, fontSize:'0.78rem', whiteSpace:'nowrap' }}>
                      📅 Book Vet
                    </button>
                  </div>
                  <PetHealthDashboard key={activePet.id} pet={activePet} user={user} router={router} onBack={()=>setActivePet(null)} />
                </>
              )}
            </div>
          </div>
        </>
      )}

      {showAddPet && (
        <AddPetModal onClose={() => setShowAddPet(false)} onSave={handleAddPet} />
      )}
      </div>
    </div>
  )
}
