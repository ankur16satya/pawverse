// File: src/pages/superadmin.js
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'

// ⚠️ List all authorized super admin emails here:
const SUPER_ADMINS = ['ankur16satya@gmail.com,sharmasiddharth269@gmail.com']

export default function SuperAdmin() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [doctors, setDoctors] = useState([])
  const [appointments, setAppointments] = useState([])
  const [activeTab, setActiveTab] = useState('doctors')

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    
    // STRICT SECURITY CHECK
    if (!SUPER_ADMINS.includes(session.user.email)) {
      alert("UNAUTHORIZED: You do not have Super Admin privileges!")
      router.push('/')
      return
    }
    setUser(session.user)

    // Fetch Doctors and ALL Appointments perfectly
    const { data: docs } = await supabase.from('listings').select('*, pets(owner_name, avatar_url)').eq('is_service', true).eq('brand', 'Doctor').order('created_at', { ascending: false })
    const { data: appts } = await supabase.from('appointments').select('*, listings(name, price), pets(owner_name)').order('created_at', { ascending: false })

    setDoctors(docs || [])
    setAppointments(appts || [])
    setLoading(false)
  }

  const verifyPayment = async (id) => {
    if (!confirm('Have you confirmed this UTR payment in your bank app?')) return
    const { error } = await supabase.from('appointments').update({ payment_status: 'verified' }).eq('id', id)
    if (!error) {
       setAppointments(prev => prev.map(a => a.id === id ? { ...a, payment_status: 'verified' } : a))
       alert('✅ Payment marked as Verified!')
    }
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '2rem' }}>🐾</div>

  return (
    <div style={{ background: '#FFFBF7', minHeight: '100vh' }}>
      <NavBar user={user} />

      <div style={{ maxWidth: 1100, margin: '80px auto', padding: 20 }}>
        
        <div style={{ background: 'linear-gradient(135deg, #1E1347, #6C4BF6)', borderRadius: 16, padding: '30px', color: '#fff', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 30px rgba(108, 75, 246, 0.2)' }}>
           <div>
             <h1 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '2.5rem', margin: '0 0 5px' }}>👑 Super Admin</h1>
             <p style={{ margin: 0, opacity: 0.8, fontSize: '0.9rem' }}>You have absolute control over Pawverse Doctors & Payments.</p>
           </div>
           <div style={{ display: 'flex', gap: 20, textAlign: 'center' }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px 20px', borderRadius: 12 }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{doctors.length}</div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.8, letterSpacing: 1 }}>Doctors</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px 20px', borderRadius: 12 }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{appointments.length}</div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.8, letterSpacing: 1 }}>Global Bookings</div>
              </div>
           </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button onClick={() => setActiveTab('doctors')} style={{ flex: 1, padding: '14px', border: 'none', borderRadius: 12, background: activeTab === 'doctors' ? '#FF6B35' : '#fff', color: activeTab === 'doctors' ? '#fff' : '#6B7280', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>🏥 Manage Doctors</button>
          <button onClick={() => setActiveTab('payments')} style={{ flex: 1, padding: '14px', border: 'none', borderRadius: 12, background: activeTab === 'payments' ? '#FF6B35' : '#fff', color: activeTab === 'payments' ? '#fff' : '#6B7280', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>💰 Payments & UTRs {appointments.filter(a => a.payment_status === 'paid').length > 0 && `(Verify ${appointments.filter(a => a.payment_status === 'paid').length})`}</button>
        </div>

        {/* Doctors View - WITH LIVE STATS */}
        {activeTab === 'doctors' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
             {doctors.map(doc => {
               // Calculate stats for this specific doctor!
               const docAppts = appointments.filter(a => a.listing_id === doc.id)
               const confirmed = docAppts.filter(a => a.status === 'confirmed').length
               const rejected = docAppts.filter(a => a.status === 'rejected').length
               const pending = docAppts.filter(a => a.status === 'pending').length

               return (
               <div key={doc.id} className="card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                     <img src={doc.image_url || 'https://via.placeholder.com/150'} style={{ width: 55, height: 55, borderRadius: '50%', objectFit: 'cover' }} />
                     <div>
                       <div style={{ fontWeight: 800, color: '#1E1347', fontSize: '1.1rem' }}>{doc.name}</div>
                       <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>{doc.meant_for || 'Clinic'} 📍 {doc.city}</div>
                     </div>
                  </div>
                  
                  {/* Doctor Revenue / Booking Stats Box */}
                  <div style={{ background: '#F9F5FF', padding: 12, borderRadius: 12, marginBottom: 12 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6C4BF6', marginBottom: 6 }}>📊 PERFORMANCE DATA</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#374151', marginBottom: 4 }}>
                      <span>Total Bookings:</span> <strong style={{color: '#1E1347'}}>{docAppts.length}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#374151', marginBottom: 4 }}>
                      <span>✅ Approved:</span> <strong style={{color: '#22C55E'}}>{confirmed}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#374151', marginBottom: 4 }}>
                      <span>❌ Rejected:</span> <strong style={{color: '#FF4757'}}>{rejected}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#374151' }}>
                      <span>⏳ Unanswered:</span> <strong style={{color: '#FF6B35'}}>{pending}</strong>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: '#374151', marginBottom: 4 }}>🎓 {doc.experience_years} Yrs Exp | {doc.qualifications}</div>
                  <div style={{ fontSize: '0.85rem', color: '#FF6B35', fontWeight: 800 }}>₹{doc.price} / consultation</div>
                  
                  <div style={{ marginTop: 12, padding: '6px 10px', background: '#F3F0FF', borderRadius: 8, fontSize: '0.7rem', color: '#6C4BF6', fontFamily: 'monospace' }}>
                    Owned By User ID:<br/>{doc.user_id}
                  </div>
               </div>
             )})}
          </div>
        )}

        {/* Payments View */}
        {activeTab === 'payments' && (
          <div className="card" style={{ padding: 20 }}>
             <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #EDE8FF', color: '#9CA3AF', fontSize: '0.8rem' }}>
                     <th style={{ padding: '12px 0' }}>DATE</th>
                     <th>CLINIC</th>
                     <th>CLIENT</th>
                     <th>FEE</th>
                     <th>UTR REF NO.</th>
                     <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                   {appointments.map(appt => (
                     <tr key={appt.id} style={{ borderBottom: '1px solid #EDE8FF', fontSize: '0.9rem', color: '#1E1347', fontWeight: 700 }}>
                        <td style={{ padding: '14px 0' }}>{new Date(appt.date).toLocaleDateString()}<br/>
                          <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>{appt.time_slot}</span>
                        </td>
                        <td>{appt.listings?.name}</td>
                        <td>{appt.pets?.owner_name}</td>
                        <td style={{ color: '#FF6B35' }}>₹{appt.listings?.price}</td>
                        
                        <td style={{ fontFamily: 'monospace', fontSize: '1rem', color: '#6C4BF6' }}>
                          {appt.utr_number || '-'}
                        </td>
                        
                        <td>
                          {appt.payment_status === 'verified' && <span style={{ padding: '4px 10px', background: '#E8F8E8', color: '#22C55E', borderRadius: 20, fontSize: '0.75rem' }}>✅ Verified</span>}
                          {appt.payment_status === 'pending' && <span style={{ padding: '4px 10px', background: '#FFF0E8', color: '#FF6B35', borderRadius: 20, fontSize: '0.75rem' }}>⏳ Waiting Pay</span>}
                          
                          {/* Admin Verification Button */}
                          {appt.payment_status === 'paid' && (
                             <button onClick={() => verifyPayment(appt.id)}
                               style={{ padding: '6px 12px', background: '#6C4BF6', color: '#fff', border: 'none', borderRadius: 20, fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 10px rgba(108,75,246,0.2)' }}>
                               🔍 Verify UTR
                             </button>
                          )}
                        </td>
                     </tr>
                   ))}
                </tbody>
             </table>
          </div>
        )}
      </div>
    </div>
  )
}
