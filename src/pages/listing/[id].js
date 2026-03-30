import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import NavBar from '../../components/NavBar'

export default function ListingDetail() {
  const router = useRouter()
  const { id } = router.query
  const [user, setUser] = useState(null)
  const [pet, setPet] = useState(null)
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeImg, setActiveImg] = useState(0)
  const [lightboxImg, setLightboxImg] = useState(null)
  const [addingToCart, setAddingToCart] = useState(false)
  const [cartSuccess, setCartSuccess] = useState(false)
  const [toast, setToast] = useState('')
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)

  useEffect(() => { if (id) init() }, [id])

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    setUser(session.user)

    const { data: petData } = await supabase
      .from('pets').select('*').eq('user_id', session.user.id).single()
    setPet(petData)

    const { data: listingData } = await supabase
      .from('listings')
      .select('*, pets(pet_name, emoji, avatar_url, owner_name, user_id)')
      .eq('id', id)
      .single()

    setListing(listingData)
    setLoading(false)
  }

  const getAllImages = () => {
    if (!listing) return []
    const imgs = []
    if (listing.image_url) imgs.push(listing.image_url)
    if (listing.image_urls?.length) {
      listing.image_urls.forEach(url => { if (url && !imgs.includes(url)) imgs.push(url) })
    }
    return imgs
  }

  const addToCart = async () => {
    if (!user || !listing) return
    setAddingToCart(true)
    const { error } = await supabase.from('cart').upsert({
      user_id: user.id,
      listing_id: listing.id,
      quantity: 1,
    }, { onConflict: 'user_id,listing_id' })

    if (!error) {
      setCartSuccess(true)
      showToast('🛒 Added to cart!')
    } else {
      showToast('Failed to add to cart')
    }
    setAddingToCart(false)
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
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

  if (!listing) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12 }}>
      <div style={{ fontSize: '3rem' }}>🐾</div>
      <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.2rem' }}>Listing not found</div>
      <button onClick={() => router.push('/marketplace')} className="btn-primary" style={{ padding: '9px 22px', borderRadius: 10 }}>
        Back to Marketplace
      </button>
    </div>
  )

  const images = getAllImages()

  const meantForList = listing.meant_for_list?.length ? listing.meant_for_list : listing.meant_for ? [listing.meant_for] : []
     const bookAppointment = async () => {
    if (!user || !pet) { alert('You must be logged in with a pet profile to book!'); return }
    if (!selectedDay || !selectedSlot) { alert('Please select a day and a time slot!'); return }
    setAddingToCart(true)
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const today = new Date()
    const targetDayIndex = days.indexOf(selectedDay)
    let offset = targetDayIndex - today.getDay()
    if (offset < 0) offset += 7 
    
    const targetDate = new Date(today)
    targetDate.setDate(today.getDate() + offset)
    const bookingDateString = targetDate.toISOString().split('T')[0]

   const { data: newAppt, error } = await supabase.from('appointments').insert({
      listing_id: listing.id,
      client_id: user.id,
      pet_id: pet.id,
      date: bookingDateString,
      time_slot: selectedSlot,
      status: 'pending',
      client_email: user.email // ⚠️ Added this line!
    }).select().single()

    if (!error) {
       showToast('✅ Appointment Request Sent!')
       setSelectedDay(null)
       setSelectedSlot(null)

       try {
         await fetch('/api/email', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             trigger: 'NEW_BOOKING',
             adminEmail: 'your_pawverse_email@gmail.com', // ⚠️ REPLACE THIS
             clientEmail: user.email, 
             // THIS NOW PULLS THE DOCTOR'S REAL SAVED EMAIL!
             doctorEmail: listing.contact_email || 'your_pawverse_email@gmail.com', 
             appointmentDetails: {
               doctorName: listing.name,
               clientName: pet.owner_name,
               date: bookingDateString,
               time: selectedSlot
             }
           })
         })
       } catch (err) { console.warn('Failed to send email.', err) }

    } else { alert('Failed to request appointment') }
    setAddingToCart(false)
  }



  return (
    <div style={{ background: '#FFFBF7', minHeight: '100vh' }}>
      <NavBar user={user} pet={pet} />

      {/* Lightbox */}
      {lightboxImg && (
        <div onClick={() => setLightboxImg(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, cursor: 'zoom-out' }}>
          <button onClick={() => setLightboxImg(null)}
            style={{ position: 'absolute', top: 18, right: 22, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          <img src={lightboxImg} alt="full"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '88vh', borderRadius: 16, objectFit: 'contain' }} />
        </div>
      )}

      <div style={{ maxWidth: 900, margin: '70px auto 0', padding: '20px 14px 40px' }}>
        {/* Back button */}
        <button onClick={() => router.push('/marketplace')}
          style={{ background: 'none', border: 'none', color: '#6C4BF6', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Back to Marketplace
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* LEFT — Images */}
          <div>
            {/* Main image */}
            <div
              onClick={() => images[activeImg] && setLightboxImg(images[activeImg])}
              style={{ borderRadius: 16, overflow: 'hidden', background: '#F3F0FF', height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: images[activeImg] ? 'zoom-in' : 'default', marginBottom: 10 }}>
              {images[activeImg]
                ? <img src={images[activeImg]} alt="product"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                : <span style={{ fontSize: '5rem' }}>📦</span>
              }
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: 8 }}>
                {images.map((img, i) => (
                  <div key={i}
                    onClick={() => setActiveImg(i)}
                    style={{
                      width: 72, height: 72, borderRadius: 10, overflow: 'hidden',
                      border: `2.5px solid ${activeImg === i ? '#FF6B35' : '#EDE8FF'}`,
                      cursor: 'pointer', background: '#F3F0FF', flexShrink: 0
                    }}>
                    <img src={img} alt={`thumb-${i}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — Details */}
          <div>
            {/* Category + tags */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 800, background: '#F3F0FF', color: '#6C4BF6' }}>
                {listing.category}
              </span>
              {listing.food_type && (
                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 800, background: listing.food_type === 'veg' ? '#E8F8E8' : '#FFE8E8', color: listing.food_type === 'veg' ? '#22C55E' : '#FF4757' }}>
                  {listing.food_type === 'veg' ? '🟢 Veg' : '🔴 Non-Veg'}
                </span>
              )}
              {listing.is_service && (
                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 800, background: '#FFFBE8', color: '#FF6B35' }}>
                  🩺 Service
                </span>
              )}
            </div>

            <h1 style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.6rem', color: '#1E1347', marginBottom: 4 }}>
              {listing.name}
            </h1>

            {listing.brand && (
              <div style={{ fontSize: '0.85rem', color: '#6B7280', marginBottom: 8 }}>Brand: <strong>{listing.brand}</strong></div>
            )}

            {/* Price */}
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '2rem', color: '#FF6B35', marginBottom: 12 }}>
              ₹{listing.price}
              {listing.is_service && listing.duration && (
                <span style={{ fontSize: '0.9rem', color: '#6B7280', fontWeight: 400, marginLeft: 8 }}>/ {listing.duration}</span>
              )}
            </div>

            {/* Meant for */}
            {meantForList.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '0.78rem', color: '#6B7280', fontWeight: 700, marginBottom: 4 }}>🐾 Meant For</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {meantForList.map(m => (
                    <span key={m} style={{ padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: '#FFE8F0', color: '#FF6B9D' }}>
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Service type */}
            {listing.is_service && listing.brand && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '0.78rem', color: '#6B7280', fontWeight: 700, marginBottom: 4 }}>🩺 Service Type</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E1347' }}>{listing.brand}</div>
              </div>
            )}

            {/* Location */}
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <span style={{ fontSize: '1rem' }}>📍</span>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1E1347' }}>
                  {[listing.address, listing.city, listing.state, listing.pincode].filter(Boolean).join(', ')}
                </div>
              </div>
            </div>

            {/* Description */}
            {listing.description && (
              <div style={{ marginBottom: 16, background: '#F9F5FF', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ fontSize: '0.78rem', color: '#6B7280', fontWeight: 700, marginBottom: 4 }}>📝 Description</div>
                <p style={{ fontSize: '0.88rem', color: '#374151', lineHeight: 1.7, margin: 0 }}>{listing.description}</p>
              </div>
            )}

            {/* Seller */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#F9F5FF', borderRadius: 12, marginBottom: 16 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#FFE8F0', border: '2px solid #FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', overflow: 'hidden' }}>
                {listing.pets?.avatar_url
                  ? <img src={listing.pets.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : listing.pets?.emoji || '🐾'}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1E1347' }}>{listing.pets?.owner_name || 'Seller'}</div>
                <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>Listed {timeAgo(listing.created_at)}</div>
              </div>
              {listing.pets?.user_id && listing.pets.user_id !== user?.id && (
                <button
                  onClick={() => router.push(`/user/${listing.pets.user_id}`)}
                  style={{ marginLeft: 'auto', background: '#F3F0FF', border: 'none', borderRadius: 8, padding: '5px 12px', color: '#6C4BF6', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
                  View Profile
                </button>
              )}
            </div>

                       {/* Action buttons & Doctor Schedule */}
            {!listing.is_service ? (
              <button onClick={addToCart} disabled={addingToCart || cartSuccess}
                style={{
                  width: '100%', padding: '14px', border: 'none', borderRadius: 14,
                  background: cartSuccess ? '#22C55E' : 'linear-gradient(135deg,#FF6B35,#6C4BF6)',
                  color: '#fff', fontFamily: 'Nunito, sans-serif', fontWeight: 800,
                  fontSize: '1rem', cursor: addingToCart || cartSuccess ? 'default' : 'pointer', transition: 'all 0.3s'
                }}>
                {cartSuccess ? '✅ Added to Cart!' : addingToCart ? '⏳ Adding...' : '🛒 Add to Cart'}
              </button>
            ) : (
              <div>
                {listing.schedule && Object.keys(listing.schedule).length > 0 && (
                  <div style={{ background: '#fff', border: '1px solid #EDE8FF', borderRadius: 14, padding: 14, marginBottom: 14 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1E1347', marginBottom: 8 }}>📅 Check Availability</div>
                    
                    {/* Day Picker */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                      {Object.keys(listing.schedule).filter(day => listing.schedule[day].length > 0).map(day => (
                        <button key={day} onClick={() => { setSelectedDay(day); setSelectedSlot(null) }}
                          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid', borderColor: selectedDay === day ? '#FF6B35' : '#E5E7EB', background: selectedDay === day ? '#FFF0E8' : '#fff', color: selectedDay === day ? '#FF6B35' : '#6B7280', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                          {day.substring(0, 3)}
                        </button>
                      ))}
                    </div>

                    {/* Time Slot Picker */}
                    {selectedDay && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {listing.schedule[selectedDay].map(slot => (
                          <button key={slot} onClick={() => setSelectedSlot(slot)}
                            style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: selectedSlot === slot ? '#6C4BF6' : '#F3F0FF', color: selectedSlot === slot ? '#fff' : '#6C4BF6', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}>
                            {slot}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                <button onClick={bookAppointment} disabled={addingToCart}
                  style={{
                    width: '100%', padding: '14px', border: 'none', borderRadius: 14,
                    background: 'linear-gradient(135deg,#FF6B35,#6C4BF6)',
                    color: '#fff', fontFamily: 'Nunito, sans-serif', fontWeight: 800,
                    fontSize: '1rem', cursor: 'pointer', opacity: addingToCart ? 0.7 : 1
                  }}>
                  {addingToCart ? '⏳ Requesting...' : '📅 Request Appointment'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 22, right: 22, background: '#1E1347', color: '#fff', padding: '12px 18px', borderRadius: 14, fontWeight: 700, fontSize: '0.86rem', zIndex: 3000 }}>
          {toast}
        </div>
      )}
    </div>
  )
}