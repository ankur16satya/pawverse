import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import NavBar from '../../components/NavBar'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const TIME_SLOTS = []
for (let h = 8; h <= 20; h++) {
  const ampm = h >= 12 && h !== 24 ? 'PM' : 'AM'
  const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h)
  TIME_SLOTS.push(`${displayH}:00 ${ampm}`)
  if (h !== 20) TIME_SLOTS.push(`${displayH}:30 ${ampm}`)
}

export default function DoctorDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [pet, setPet] = useState(null)
  const [listingId, setListingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')
  const [activeTab, setActiveTab] = useState('profile')
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    name: '', clinic_name: '', qualifications: '', experience_years: '',
    price: '', address: '', city: '', state: '', pincode: '',
    imagePreviews: [], images: [], existing_image_url: null
  })

  const [schedule, setSchedule] = useState({
    Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
  })

  const [appointments, setAppointments] = useState([])

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    setUser(session.user)

    const { data: petData } = await supabase.from('pets').select('*').eq('user_id', session.user.id).single()
    setPet(petData)

    const { data: listingData } = await supabase.from('listings').select('*').eq('user_id', session.user.id).eq('is_service', true).eq('brand', 'Doctor').single()

    if (listingData) {
      setListingId(listingData.id)
      setForm({
        name: listingData.name || '', clinic_name: listingData.meant_for || '', 
        qualifications: listingData.qualifications || '', experience_years: listingData.experience_years || '',
        price: listingData.price || '', address: listingData.address || '', city: listingData.city || '',
        state: listingData.state || '', pincode: listingData.pincode || '',
        existing_image_url: listingData.image_url || null, images: [], imagePreviews: []
      })
      if (listingData.schedule) setSchedule(listingData.schedule)

      const { data: appts } = await supabase.from('appointments').select('*, pets(pet_name, owner_name, avatar_url, emoji)').eq('listing_id', listingData.id).order('date', { ascending: true })
      setAppointments(appts || [])
    }
    setLoading(false)
  }

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const toggleSlot = (day, slot) => {
    setSchedule(prev => {
      const selectedSlots = prev[day] || []
      const newSlots = selectedSlots.includes(slot) ? selectedSlots.filter(s => s !== slot) : [...selectedSlots, slot]
      return { ...prev, [day]: newSlots }
    })
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return }
    setForm(prev => ({ ...prev, images: [file], imagePreviews: [URL.createObjectURL(file)] }))
  }

  const handleSaveProfile = async () => {
    if (!form.name.trim() || !form.city.trim() || !form.price) { alert('Fill all required fields!'); return }
    setSubmitting(true)
    try {
      let publicImageUrl = form.existing_image_url
      if (form.images.length > 0) {
        const img = form.images[0]
        const ext = img.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('listings').upload(fileName, img, { cacheControl: '3600', upsert: false })
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from('listings').getPublicUrl(fileName)
        publicImageUrl = publicUrl
      }

      const payload = {
        user_id: user.id, pet_id: pet?.id, category: 'services', is_service: true, brand: 'Doctor', is_active: true,
        name: form.name.trim(), meant_for: form.clinic_name.trim() || 'Independent Doctor',
        qualifications: form.qualifications.trim(), experience_years: form.experience_years ? parseInt(form.experience_years) : 0,
        price: parseFloat(form.price), address: form.address.trim(), city: form.city.trim(),
        state: form.state.trim(), pincode: form.pincode.trim(), image_url: publicImageUrl,
        image_urls: publicImageUrl ? [publicImageUrl] : [], schedule: schedule,
        // THIS SAVES THE DOCTOR'S REAL EMAIL FOR THE CLIENT TO USE!
        contact_email: user.email 
      }

      if (listingId) {
        const { error } = await supabase.from('listings').update(payload).eq('id', listingId)
        if (error) throw error
        showToast('✅ Profile & Schedule Updated!')
      } else {
        const { data, error } = await supabase.from('listings').insert(payload).select().single()
        if (error) throw error
        setListingId(data.id)
        showToast('🎉 Doctor Profile Created!')
      }
    } catch (err) { alert('Failed to save profile. ' + err.message) }
    setSubmitting(false)
  }

  const updateAppointmentStatus = async (appt, status) => {
    try {
      const { error } = await supabase.from('appointments').update({ status }).eq('id', appt.id)
      if (error) throw error
      
      setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, status } : a))
      showToast(`Booking marked as ${status}`)

      await fetch('/api/email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger: status === 'confirmed' ? 'APPROVED' : 'REJECTED',
          adminEmail: 'your_pawverse_email@gmail.com', // ⚠️ REPLACE
          doctorEmail: user.email, 
          clientEmail: 'client_placeholder@gmail.com', // Client email needs to be pulled similar to this in the future
          appointmentDetails: {
            appointmentId: appt.id, doctorName: form.name, clientName: appt.pets?.owner_name,
            date: appt.date, time: appt.time_slot, fees: form.price
          }
        })
      })

    } catch (err) { alert('Failed to update status. Error: ' + err.message) }
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '2rem' }}>🐾</div>

  return (
    <div style={{ background: '#FFFBF7', minHeight: '100vh' }}>
      <NavBar user={user} pet={pet} />
      <div style={{ maxWidth: 1000, margin: '80px auto 40px', padding: 20 }}>
        <h1 style={{ fontFamily: "'Baloo 2', cursive", color: '#1E1347', fontSize: '2rem', marginBottom: 20 }}>🩺 Doctor Dashboard</h1>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20, background: '#fff', padding: 8, borderRadius: 16, boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <button onClick={() => setActiveTab('profile')} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: 10, background: activeTab === 'profile' ? '#FF6B35' : 'transparent', color: activeTab === 'profile' ? '#fff' : '#6B7280', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s' }}>👤 Profile & Schedule</button>
          <button onClick={() => setActiveTab('appointments')} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: 10, background: activeTab === 'appointments' ? '#FF6B35' : 'transparent', color: activeTab === 'appointments' ? '#fff' : '#6B7280', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s' }}>📅 Booking Requests {appointments.filter(a => a.status === 'pending').length > 0 && `(${appointments.filter(a => a.status === 'pending').length})`}</button>
        </div>

        {activeTab === 'profile' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Left Column: Basic Info */}
            <div className="card" style={{ padding: 24 }}>
              <h2 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.4rem', color: '#1E1347', marginBottom: 16 }}>Basic Information</h2>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                <div style={{ width: 100, flexShrink: 0 }}>
                  <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#F3F0FF', border: '2px dashed #6C4BF6', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
                    {form.imagePreviews.length > 0 ? <img src={form.imagePreviews[0]} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : form.existing_image_url ? <img src={form.existing_image_url} alt="existing" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '1.5rem' }}>📸</span>}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <label className="label">Your Name *</label>
                  <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Dr. Ramesh Kumar" style={{ margin: 0 }} />
                </div>
              </div>
              <label className="label">Clinic / Hospital Name (Optional)</label>
              <input className="input" value={form.clinic_name} onChange={e => setForm(p => ({ ...p, clinic_name: e.target.value }))} placeholder="e.g. Happy Paws Vet Clinic" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                 <div><label className="label">Qualifications</label><input className="input" value={form.qualifications} onChange={e => setForm(p => ({ ...p, qualifications: e.target.value }))} style={{ margin: 0 }} /></div>
                 <div><label className="label">Experience (Years)</label><input className="input" type="number" value={form.experience_years} onChange={e => setForm(p => ({ ...p, experience_years: e.target.value }))} style={{ margin: 0 }} /></div>
              </div>
              <label className="label" style={{ marginTop: 16 }}>Consultation Fee (₹) *</label>
              <input className="input" type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="e.g. 500" />
              <h3 style={{ fontFamily: "Nunito, sans-serif", fontSize: '0.9rem', color: '#6B7280', marginBottom: 10, marginTop: 20 }}>Location details</h3>
              <input className="input" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Full Clinic Address..." />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 0 }}>
                <input className="input" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="City *" style={{ margin: 0 }} />
                <input className="input" value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} placeholder="State" style={{ margin: 0 }} />
                <input className="input" value={form.pincode} onChange={e => setForm(p => ({ ...p, pincode: e.target.value }))} placeholder="Pincode" style={{ margin: 0 }} />
              </div>
            </div>

            {/* Right Column: Schedule */}
            <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                 <h2 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.4rem', color: '#1E1347', margin: 0 }}>Weekly Schedule</h2>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8, maxHeight: 500 }}>
                {DAYS.map(day => (
                  <div key={day} style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: '0.9rem', color: '#1E1347', fontWeight: 800, marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #EDE8FF' }}>{day}</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {TIME_SLOTS.map(slot => {
                        const isSelected = schedule[day]?.includes(slot)
                        return (
                          <button key={slot} onClick={() => toggleSlot(day, slot)}
                            style={{ padding: '6px 10px', border: '1px solid', borderColor: isSelected ? '#6C4BF6' : '#E5E7EB', borderRadius: 8, background: isSelected ? '#F3F0FF' : '#fff', color: isSelected ? '#6C4BF6' : '#6B7280', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                            {isSelected && '✓ '} {slot}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={handleSaveProfile} disabled={submitting} style={{ width: '100%', padding: '14px', border: 'none', borderRadius: 12, background: 'linear-gradient(135deg,#FF6B35,#6C4BF6)', color: '#fff', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', marginTop: 20, opacity: submitting ? 0.7 : 1 }}>
                {submitting ? '📤 Saving...' : '💾 Save Profile & Schedule'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="card" style={{ padding: 24, minHeight: 400 }}>
             <h2 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.4rem', color: '#1E1347', marginBottom: 20 }}>Booking Requests</h2>
             {appointments.length === 0 ? (
               <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF' }}><div style={{ fontSize: '3rem', marginBottom: 10 }}>📅</div><h3 style={{ fontWeight: 800 }}>No bookings yet</h3></div>
             ) : (
               <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                 {appointments.map(appt => (
                   <div key={appt.id} style={{ display: 'flex', alignItems: 'center', padding: 16, border: '1px solid #EDE8FF', borderRadius: 12, background: appt.status === 'pending' ? '#FFFBF7' : '#fff' }}>
                     
                     <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: 200 }}>
                       <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F3F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', overflow: 'hidden' }}>
                         {appt.pets?.avatar_url ? <img src={appt.pets.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🐾'}
                       </div>
                       <div>
                         <div style={{ fontWeight: 800, color: '#1E1347', fontSize: '0.9rem' }}>{appt.pets?.pet_name || 'Client'}</div>
                         <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Owner: {appt.pets?.owner_name || 'Unknown'}</div>
                       </div>
                     </div>

                     <div style={{ flex: 1, padding: '0 20px', borderLeft: '1px solid #EDE8FF', borderRight: '1px solid #EDE8FF' }}>
                        <div style={{ display: 'flex', gap: 16 }}>
                          <div><div style={{ fontSize: '0.7rem', color: '#9CA3AF', fontWeight: 800 }}>DATE</div><div style={{ fontSize: '0.9rem', color: '#FF6B35', fontWeight: 800 }}>{new Date(appt.date).toLocaleDateString()}</div></div>
                          <div><div style={{ fontSize: '0.7rem', color: '#9CA3AF', fontWeight: 800 }}>TIME SLOT</div><div style={{ fontSize: '0.9rem', color: '#6C4BF6', fontWeight: 800 }}>{appt.time_slot}</div></div>
                        </div>
                     </div>

                     <div style={{ width: 180, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                       {appt.status === 'pending' && (
                         <>
                           <button onClick={() => updateAppointmentStatus(appt, 'confirmed')} style={{ padding: '6px 14px', border: 'none', borderRadius: 20, background: '#22C55E', color: '#fff', fontWeight: 800, cursor: 'pointer', width: 100 }}>✓ Accept</button>
                           <button onClick={() => updateAppointmentStatus(appt, 'rejected')} style={{ padding: '6px 14px', border: 'none', borderRadius: 20, background: '#FFEEF0', color: '#FF4757', fontWeight: 800, cursor: 'pointer', width: 100 }}>✕ Reject</button>
                         </>
                       )}
                       {appt.status === 'confirmed' && <span style={{ padding: '4px 10px', borderRadius: 20, background: '#E8F8E8', color: '#22C55E', fontWeight: 800, fontSize: '0.75rem' }}>✅ Confirmed</span>}
                       {appt.status === 'rejected' && <span style={{ padding: '4px 10px', borderRadius: 20, background: '#FFE8E8', color: '#FF4757', fontWeight: 800, fontSize: '0.75rem' }}>❌ Rejected</span>}
                     </div>

                   </div>
                 ))}
               </div>
             )}
          </div>
        )}
      </div>
      {toast && <div style={{ position: 'fixed', bottom: 22, right: 22, background: '#1E1347', color: '#fff', padding: '12px 18px', borderRadius: 14 }}>{toast}</div>}
    </div>
  )
}
