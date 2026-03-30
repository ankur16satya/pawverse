// File: src/pages/pay/[id].js
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import NavBar from '../../components/NavBar'

export default function PaymentPage() {
  const router = useRouter()
  const { id } = router.query
  const [user, setUser] = useState(null)
  const [appointment, setAppointment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [utr, setUtr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')

  // ⚠️ REPLACE THIS WITH YOUR ACTUAL ADMIN EMAIL AND UPI ID!
  const ADMIN_EMAIL = 'ankur16satya@gmail.com' 
  const ADMIN_UPI_ID = 'ankur16satya-2@okicici' // Or any UPI ID you want payments to go to

  useEffect(() => { if (id) init() }, [id])

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    setUser(session.user)

    // Fetch the appointment details alongside the listing (fee) and client pet details
    const { data: appt, error } = await supabase
      .from('appointments')
      .select('*, listings(name, price, image_url), pets(owner_name, pet_name)')
      .eq('id', id)
      .single()

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    // Security check: Only the person who booked it can see this payment page
    if (appt.client_id !== session.user.id) {
      router.push('/')
      return
    }

    setAppointment(appt)
    setLoading(false)
  }

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000) }

  const handleSubmitPayment = async () => {
    if (utr.trim().length < 10) { alert('Please enter a valid 12-digit UTR/Reference No.'); return }
    setSubmitting(true)

    try {
      // 1. Update the Database
      const { error: upErr } = await supabase
        .from('appointments')
        .update({ 
          payment_status: 'paid',
          utr_number: utr.trim()
        })
        .eq('id', appointment.id)

      if (upErr) throw upErr

      // 2. Secretly trigger the Email API to notify the Admin
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger: 'PAYMENT_DONE',
          adminEmail: ADMIN_EMAIL,
          appointmentDetails: {
            appointmentId: appointment.id,
            clientName: appointment.pets?.owner_name,
            fees: appointment.listings?.price,
            utr: utr.trim()
          }
        })
      })

      showToast('🎉 Payment details submitted successfully! We are verifying it now.')
      // Refresh data to show success state
      setAppointment(prev => ({ ...prev, payment_status: 'paid', utr_number: utr.trim() }))

    } catch (err) {
      alert('Failed to submit. Please try again.')
    }
    setSubmitting(false)
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '2rem' }}>🐾</div>

  if (!appointment) return (
    <div style={{ textAlign: 'center', padding: '100px 20px' }}>
      <h1>Appointment not found!</h1>
      <button onClick={() => router.push('/marketplace')} className="btn-primary">Go Back</button>
    </div>
  )

  return (
    <div style={{ background: '#FFFBF7', minHeight: '100vh' }}>
      <NavBar user={user} />

      <div style={{ maxWidth: 600, margin: '80px auto', padding: 20 }}>
        <h1 style={{ fontFamily: "'Baloo 2', cursive", color: '#1E1347', fontSize: '2rem', textAlign: 'center', marginBottom: 10 }}>
          {appointment.payment_status === 'paid' ? '✅ Payment Under Review' : '💳 Complete Your Payment'}
        </h1>
        
        <p style={{ textAlign: 'center', color: '#6B7280', marginBottom: 30 }}>
          {appointment.payment_status === 'paid' 
           ? 'We have received your UTR number and our admins are verifying the transaction.' 
           : 'Your appointment is confirmed! Please pay the consultation fee to finalize.'}
        </p>

        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
           <h3 style={{ margin: '0 0 16px', color: '#1E1347', fontSize: '1.2rem' }}>Appointment Details</h3>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
             <span style={{ color: '#6B7280' }}>Doctor / Clinic:</span>
             <span style={{ fontWeight: 800 }}>{appointment.listings?.name}</span>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
             <span style={{ color: '#6B7280' }}>Date & Time:</span>
             <span style={{ fontWeight: 800, color: '#6C4BF6' }}>{new Date(appointment.date).toLocaleDateString()} at {appointment.time_slot}</span>
           </div>
           <hr style={{ border: 'none', borderTop: '1px dashed #EDE8FF', margin: '16px 0' }}/>
           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem' }}>
             <span style={{ color: '#1E1347', fontWeight: 800 }}>Consultation Fee:</span>
             <span style={{ fontWeight: 800, color: '#FF6B35' }}>₹{appointment.listings?.price}</span>
           </div>
        </div>

        {appointment.payment_status !== 'paid' && (
          <div className="card" style={{ padding: 24, background: '#F3F0FF', border: '2px dashed #6C4BF6' }}>
             
             {/* Simple UPI Instructions */}
             <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: '3rem', marginBottom: 10 }}>📱</div>
                <h4 style={{ margin: '0 0 8px', fontSize: '1.1rem' }}>Pay via UPI App (GPay, PhonePe, Paytm)</h4>
                <div style={{ display: 'inline-block', background: '#fff', padding: '10px 20px', borderRadius: 10, fontWeight: 800, fontSize: '1.2rem', color: '#1E1347', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                  {ADMIN_UPI_ID}
                </div>
                <p style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: 10 }}>Open your UPI app, send ₹{appointment.listings?.price} to the ID above, and note down the 12-digit UTR/Reference number.</p>
             </div>

             <label className="label" style={{ color: '#1E1347' }}>Enter UTR / Reference No. *</label>
             <input className="input" value={utr} onChange={e => setUtr(e.target.value)} placeholder="e.g. 312345678901" maxLength="20" style={{ background: '#fff' }} />
             
             <button onClick={handleSubmitPayment} disabled={submitting}
               style={{ width: '100%', padding: '14px', border: 'none', borderRadius: 12, background: 'linear-gradient(135deg,#FF6B35,#6C4BF6)', color: '#fff', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1.05rem', cursor: 'pointer', marginTop: 10, opacity: submitting ? 0.7 : 1 }}>
               {submitting ? '⏳ Verifying...' : 'Submit Payment Proof'}
             </button>
          </div>
        )}

        {appointment.payment_status === 'paid' && (
          <div className="card" style={{ padding: 24, background: '#E8F8E8', border: '2px solid #22C55E', textAlign: 'center' }}>
            <h3 style={{ color: '#22C55E', margin: '0 0 10px' }}>Submitted UTR: {appointment.utr_number}</h3>
            <p style={{ fontSize: '0.9rem', color: '#374151', margin: 0 }}>We have notified the admin. Your booking will be finalized shortly once the payment reflects in our account.</p>
          </div>
        )}

      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 22, right: 22, background: '#1E1347', color: '#fff', padding: '12px 18px', borderRadius: 14, fontWeight: 700, fontSize: '0.86rem', zIndex: 3000 }}>
          {toast}
        </div>
      )}
    </div>
  )
}
