import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'

const CATEGORIES = [
  { key: 'all',      label: 'All',               icon: '🔮' },
  { key: 'services', label: 'Services',           icon: '🩺' },
  { key: 'food',     label: 'Food & Treats',      icon: '🍖' },
  { key: 'medicine', label: 'Medicine & Health',  icon: '🏥' },
  { key: 'grooming', label: 'Grooming',           icon: '✂️' },
  { key: 'toys',     label: 'Toys & Accessories', icon: '🎾' },
  { key: 'housing',  label: 'Pet Housing',        icon: '🏠' },
  { key: 'clothing', label: 'Pet Clothing',       icon: '👕' },
]

const PET_TYPES = ['All Pets','Dogs','Cats','Birds','Rabbits','Fish','Hamsters','Reptiles','Other']
const RANGE_OPTIONS = [5, 10, 25, 50, 100]
const MAX_IMAGES = 3

export default function Marketplace() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [pet, setPet] = useState(null)
  const [category, setCategory] = useState('all')
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [range, setRange] = useState(50)
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [manualCity, setManualCity] = useState('')
  const [manualState, setManualState] = useState('')
  const [manualPincode, setManualPincode] = useState('')
  const [lightboxImg, setLightboxImg] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const emptyForm = {
  name: '', brand: '', description: '', price: '',
  category: 'food', images: [], imagePreviews: [],
  meant_for_list: [],
  meant_for_custom: '',   // ← add this
  food_type: 'veg', is_service: false,
  service_type: '', service_type_custom: '',
  duration: '',
  address: '', city: '', state: '', pincode: '',
}
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    setUser(session.user)

    const { data: petData } = await supabase
      .from('pets').select('*').eq('user_id', session.user.id).single()
    setPet(petData)

    const savedLocation = localStorage.getItem('pawverse_location')
    if (savedLocation) {
      setUserLocation(JSON.parse(savedLocation))
    } else {
      setShowLocationModal(true)
    }

    await fetchListings()
    setLoading(false)
  }

  const fetchListings = async () => {
    const { data } = await supabase
      .from('listings')
      .select('*, pets(pet_name, emoji, avatar_url, owner_name)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    setListings(data || [])
  }

    const detectLocation = () => {
    setDetectingLocation(true)
    if (!navigator.geolocation) {
      alert('Geolocation not supported')
      setDetectingLocation(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        try {
          // Added User-Agent header and proper fallback parsing for districts
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'User-Agent': 'Pawverse/1.0' } }
          )
          const data = await res.json()
          
          // Better Indian Location Parsing
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || data.address?.state_district || ''
          const state = data.address?.state || ''
          const pincode = data.address?.postcode || ''
          
          const loc = { latitude, longitude, city, state, pincode, detected: true }
          setUserLocation(loc)
          localStorage.setItem('pawverse_location', JSON.stringify(loc))
          setManualCity(city)
          setManualState(state)
          setManualPincode(pincode)
        } catch (err) {
          console.error("Geocoding fetch failed:", err)
          const loc = { latitude, longitude, city: '', state: '', pincode: '', detected: true }
          setUserLocation(loc)
          localStorage.setItem('pawverse_location', JSON.stringify(loc))
        }
        setDetectingLocation(false)
      },
      () => { alert('Could not detect location. Please enter manually.'); setDetectingLocation(false) }
    )
  }


  const saveManualLocation = () => {
    if (!manualCity.trim()) { alert('Please enter your city'); return }
    const loc = { city: manualCity.trim(), state: manualState.trim(), pincode: manualPincode.trim(), latitude: null, longitude: null, detected: false }
    setUserLocation(loc)
    localStorage.setItem('pawverse_location', JSON.stringify(loc))
    setShowLocationModal(false)
  }

  // Haversine distance formula
  const getDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

    const getFilteredListings = () => {
    let filtered = [...listings]

    // Category filter
    if (category === 'services') {
      filtered = filtered.filter(l => l.is_service)
    } else if (category !== 'all') {
      filtered = filtered.filter(l => !l.is_service && l.category === category)
    }

    if (!userLocation) return filtered // If location isn't set, show all

    const myCity = userLocation.city?.toLowerCase().trim() || ''
    const myPincode = userLocation.pincode?.trim() || ''
    const myState = userLocation.state?.toLowerCase().trim() || ''

    filtered = filtered.map(l => {
      const lCity = l.city?.toLowerCase().trim() || ''
      const lPincode = l.pincode?.trim() || ''
      const lState = l.state?.toLowerCase().trim() || ''
      const lAddress = l.address?.toLowerCase().trim() || ''

      let distanceScore = null

      // Check Real GPS distance first (If both buyer and seller have GPS data)
      if (userLocation.latitude && userLocation.longitude && l.latitude && l.longitude) {
        distanceScore = getDistance(userLocation.latitude, userLocation.longitude, l.latitude, l.longitude)
      } 
      // Fallback: Smart Text-based matching (Checks City, Pincode, and Full Address)
      else {
        // Make sure we have text to match against to avoid false positives
        const exactPincode = myPincode.length > 0 && lPincode === myPincode
        const exactCity = myCity.length > 0 && lCity === myCity
        // NEW: If your detected city (e.g. Sudhowala) is mentioned anywhere in their full address!
        const cityInAddress = myCity.length > 0 && lAddress.includes(myCity)
        const addressInCity = lCity.length > 0 && myCity.includes(lCity)

        if (exactPincode || exactCity || cityInAddress || addressInCity) {
          distanceScore = 5   // Treat it as extremely close (under 5km)
        } 
        else if (myState.length > 0 && lState === myState) {
          distanceScore = 25  // Somewhere else in the same State (~25km)
        } 
        else {
          distanceScore = 150 // Totally different state/Far away
        }
      }
      return { ...l, distance: distanceScore }
    })

    // Filter using the Range Slider OR Manual Mode
    if (userLocation.latitude || userLocation.city) {
      filtered = filtered.filter(l => l.distance !== null && l.distance <= (range || 50))
      filtered = filtered.sort((a, b) => a.distance - b.distance)
    }

    return filtered
  }



  const handleImagesSelect = (e) => {
    const files = Array.from(e.target.files)
    const remaining = MAX_IMAGES - form.images.length
    if (remaining <= 0) { alert(`Maximum ${MAX_IMAGES} images allowed`); return }
    const toAdd = files.slice(0, remaining)
    const oversized = toAdd.filter(f => f.size > 5 * 1024 * 1024)
    if (oversized.length) { alert('Each image must be under 5MB'); return }
    const previews = toAdd.map(f => URL.createObjectURL(f))
    setForm(prev => ({
      ...prev,
      images: [...prev.images, ...toAdd],
      imagePreviews: [...prev.imagePreviews, ...previews]
    }))
  }

  const removeImage = (idx) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx),
      imagePreviews: prev.imagePreviews.filter((_, i) => i !== idx)
    }))
  }

  const toggleMeantFor = (type) => {
    setForm(prev => {
      if (type === 'All Pets') return { ...prev, meant_for_list: ['All Pets'] }
      const current = prev.meant_for_list.filter(m => m !== 'All Pets')
      if (current.includes(type)) return { ...prev, meant_for_list: current.filter(m => m !== type) }
      return { ...prev, meant_for_list: [...current, type] }
    })
  }

  const handleCreateListing = async () => {
    if (!form.name.trim()) { alert('Please enter name'); return }
    if (!form.price) { alert('Please enter price'); return }
    if (!form.city.trim()) { alert('Please enter city'); return }
    if (form.meant_for_list.length === 0) { alert('Please select at least one "Meant For" option'); return }
    if (form.is_service && !form.service_type) { alert('Please select service type'); return }
    setSubmitting(true)

    try {
      // Upload all images
      const imageUrls = []
      for (const img of form.images) {
        const ext = img.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('listings').upload(fileName, img, { cacheControl: '3600', upsert: false })
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from('listings').getPublicUrl(fileName)
        imageUrls.push(publicUrl)
      }

      const { data: newListing, error } = await supabase.from('listings').insert({
        user_id: user.id,
        pet_id: pet?.id,
        name: form.name.trim(),
        brand: form.is_service
          ? (form.service_type === 'Other' ? form.service_type_custom : form.service_type)
          : (form.brand.trim() || null),
        description: form.description.trim() || null,
        price: parseFloat(form.price),
        category: form.is_service ? 'services' : form.category,
        image_url: imageUrls[0] || null,
        image_urls: imageUrls,
        meant_for: form.meant_for_list.join(', '),
        meant_for: form.meant_for_list.includes('Other')
  ? [...form.meant_for_list.filter(m => m !== 'Other'), form.meant_for_custom].filter(Boolean).join(', ')
  : form.meant_for_list.join(', '),
meant_for_list: form.meant_for_list.includes('Other')
  ? [...form.meant_for_list.filter(m => m !== 'Other'), form.meant_for_custom].filter(Boolean)
  : form.meant_for_list,
        food_type: form.category === 'food' && !form.is_service ? form.food_type : null,
        address: form.address.trim() || null,
        city: form.city.trim(),
        state: form.state.trim() || null,
        pincode: form.pincode.trim() || null,
        latitude: null,
        longitude: null,
        is_service: form.is_service,
        duration: form.is_service ? (form.duration || null) : null,
        is_active: true,
      }).select('*, pets(pet_name, emoji, avatar_url, owner_name)').single()

      if (error) throw error

      setListings(prev => [newListing, ...prev])
      setShowCreateModal(false)
      setForm(emptyForm)
      showToast('🎉 Listing published successfully!')
    } catch (err) {
      console.error(err)
      alert('Failed to create listing. Please try again.')
    }
    setSubmitting(false)
  }

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const getFirstImage = (listing) => {
    if (listing.image_url) return listing.image_url
    if (listing.image_urls?.length) return listing.image_urls[0]
    return null
  }

  const filteredListings = getFilteredListings()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '2rem' }}>🐾</div>
  )

  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(213, 134, 200, 1), rgba(105, 201, 249, 1))', minHeight: '100vh' }}>
      <NavBar user={user} pet={pet} />

      {/* Lightbox */}
      {lightboxImg && (
        <div onClick={() => setLightboxImg(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, cursor: 'zoom-out' }}>
          <button onClick={() => setLightboxImg(null)}
            style={{ position: 'absolute', top: 18, right: 22, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          <img src={lightboxImg} alt="full" onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '88vh', borderRadius: 16, objectFit: 'contain' }} />
        </div>
      )}

      {/* Location Modal */}
      {showLocationModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: '3rem', marginBottom: 8 }}>📍</div>
              <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.3rem', color: '#1E1347' }}>Where are you located?</div>
              <p style={{ color: '#6B7280', fontSize: '0.85rem', marginTop: 6 }}>We'll show products & services near you 🐾</p>
            </div>
            <button onClick={detectLocation} disabled={detectingLocation}
              style={{ width: '100%', padding: '12px', border: 'none', borderRadius: 12, background: 'linear-gradient(135deg,#FF6B35,#6C4BF6)', color: '#fff', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', marginBottom: 16, opacity: detectingLocation ? 0.7 : 1 }}>
              {detectingLocation ? '📡 Detecting...' : '📍 Auto-Detect My Location'}
            </button>
            {userLocation?.detected && (
              <div style={{ background: '#E8F8E8', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: '0.85rem', color: '#22C55E', fontWeight: 700 }}>
                ✅ Detected: {userLocation.city}{userLocation.state ? `, ${userLocation.state}` : ''}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1, height: 1, background: '#EDE8FF' }} />
              <span style={{ fontSize: '0.78rem', color: '#9CA3AF', fontWeight: 700 }}>OR ENTER MANUALLY</span>
              <div style={{ flex: 1, height: 1, background: '#EDE8FF' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input value={manualCity} onChange={e => setManualCity(e.target.value)} placeholder="City *" className="input" style={{ margin: 0 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input value={manualState} onChange={e => setManualState(e.target.value)} placeholder="State" className="input" style={{ margin: 0 }} />
                <input value={manualPincode} onChange={e => setManualPincode(e.target.value)} placeholder="Pincode" className="input" style={{ margin: 0 }} />
              </div>
            </div>
            <button onClick={saveManualLocation}
              style={{ width: '100%', padding: '11px', border: 'none', borderRadius: 12, background: '#1E1347', color: '#fff', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '0.92rem', cursor: 'pointer', marginTop: 14 }}>
              Confirm Location →
            </button>
            <button onClick={() => setShowLocationModal(false)}
              style={{ width: '100%', padding: '8px', border: 'none', background: 'none', color: '#9CA3AF', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', marginTop: 8 }}>
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* Create Listing Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.2rem', color: '#1E1347' }}>
                📦 Create Product Listing
              </div>
              <button onClick={() => { setShowCreateModal(false); setForm(emptyForm) }}
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#6B7280' }}>✕</button>
            </div>

           

            {/* PRODUCT FIELDS */}
            {!form.is_service && (
              <>
                <label className="label">Product Name *</label>
                <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Royal Canin Dog Food" />

                <label className="label">Brand (Optional)</label>
                <input className="input" value={form.brand} onChange={e => setForm(p => ({ ...p, brand: e.target.value }))} placeholder="e.g. Royal Canin, Pedigree..." />

                <label className="label">Category *</label>
                <select className="input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  {CATEGORIES.filter(c => c.key !== 'all' && c.key !== 'services').map(c => (
                    <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
                  ))}
                </select>

                {form.category === 'food' && (
                  <>
                    <label className="label">Food Type *</label>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                      {[{ key: 'veg', label: '🟢 Veg' }, { key: 'nonveg', label: '🔴 Non-Veg' }].map(ft => (
                        <button key={ft.key} onClick={() => setForm(p => ({ ...p, food_type: ft.key }))}
                          style={{ flex: 1, padding: '8px', border: '2px solid', borderColor: form.food_type === ft.key ? (ft.key === 'veg' ? '#22C55E' : '#FF4757') : '#EDE8FF', borderRadius: 10, background: form.food_type === ft.key ? (ft.key === 'veg' ? '#E8F8E8' : '#FFE8E8') : '#fff', color: form.food_type === ft.key ? (ft.key === 'veg' ? '#22C55E' : '#FF4757') : '#6B7280', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>
                          {ft.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

           

            {/* Images — up to 3 */}
            <label className="label">Images (Max {MAX_IMAGES})</label>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImagesSelect} style={{ display: 'none' }} />

            {/* Image previews */}
            {form.imagePreviews.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                {form.imagePreviews.map((prev, i) => (
                  <div key={i} style={{ position: 'relative', width: 90, height: 90 }}>
                    <img src={prev} alt={`img-${i}`} style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 10, display: 'block', border: '2px solid #EDE8FF' }} />
                    <button onClick={() => removeImage(i)}
                      style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', background: '#FF4757', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>✕</button>
                  </div>
                ))}
                {form.imagePreviews.length < MAX_IMAGES && (
                  <div onClick={() => fileInputRef.current?.click()}
                    style={{ width: 90, height: 90, borderRadius: 10, border: '2px dashed #EDE8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#FAFAFA', flexShrink: 0 }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#6C4BF6'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#EDE8FF'}>
                    <span style={{ fontSize: '1.5rem' }}>+</span>
                  </div>
                )}
              </div>
            )}
            {form.imagePreviews.length === 0 && (
              <div onClick={() => fileInputRef.current?.click()}
                style={{ border: '2px dashed #EDE8FF', borderRadius: 12, padding: '20px', textAlign: 'center', cursor: 'pointer', marginBottom: 12, background: '#FAFAFA' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#6C4BF6'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#EDE8FF'}>
                <div style={{ fontSize: '2rem', marginBottom: 4 }}>📸</div>
                <div style={{ fontSize: '0.82rem', color: '#6B7280', fontWeight: 700 }}>Click to upload up to {MAX_IMAGES} images</div>
                <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>Max 5MB each</div>
              </div>
            )}

            {/* Meant For — CHECKBOXES */}
            <label className="label">Meant For * (Select all that apply)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {PET_TYPES.map(type => {
                const selected = form.meant_for_list.includes(type)
                return (
                  <button key={type} onClick={() => toggleMeantFor(type)}
                    style={{
                      padding: '6px 12px', border: '2px solid',
                      borderColor: selected ? '#FF6B35' : '#EDE8FF',
                      borderRadius: 20, background: selected ? '#FFE8CC' : '#fff',
                      color: selected ? '#FF6B35' : '#6B7280',
                      fontFamily: 'Nunito, sans-serif', fontWeight: 700,
                      fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.15s'
                    }}>
                    {selected ? '✓ ' : ''}{type}
                  </button>
                )
              })}
              {/* Show text input when Other is selected */}
{form.meant_for_list.includes('Other') && (
  <input
    className="input"
    value={form.meant_for_custom || ''}
    onChange={e => setForm(prev => ({ ...prev, meant_for_custom: e.target.value }))}
    placeholder="Please specify your pet type..."
    style={{ marginTop: 4 }}
  />
)}
            </div>

            {/* Price for product */}
            {!form.is_service && (
              <>
                <label className="label">Price (₹) *</label>
                <input className="input" type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="e.g. 499" min="0" />
              </>
            )}

            {/* Full Address */}
            <label className="label">Full Address *</label>
            <input className="input" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="House/Shop No., Street, Area..." />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 0 }}>
              <input className="input" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="City *" style={{ margin: 0 }} />
              <input className="input" value={form.pincode} onChange={e => setForm(p => ({ ...p, pincode: e.target.value }))} placeholder="Pincode" style={{ margin: 0 }} />
            </div>
            <input className="input" value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} placeholder="State" />

            {/* Description */}
            <label className="label">{form.is_service ? 'Additional Information (Optional)' : 'Description (Optional)'}</label>
            <textarea className="input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder={form.is_service ? 'Opening hours, specializations, qualifications...' : 'Any additional details about your product...'}
              style={{ minHeight: 70, resize: 'none' }} />

            <button onClick={handleCreateListing} disabled={submitting}
              style={{ width: '100%', padding: '12px', border: 'none', borderRadius: 12, background: 'linear-gradient(135deg,#FF6B35,#6C4BF6)', color: '#fff', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', marginTop: 8, opacity: submitting ? 0.7 : 1 }}>
              {submitting ? '📤 Publishing...' : '🚀 Publish Listing'}
            </button>
          </div>
        </div>
      )}

      {/* Main Page Header Banner */}
      <div style={{ maxWidth: 1100, margin: '70px auto 0', padding: '0 14px' }} className="marketplace-banner-wrap">
        <div className="card" style={{ background: 'linear-gradient(135deg,#FF6B35,#6C4BF6)', border: 'none', padding: 20 }}>
          <div style={{ color: '#fff', fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.45rem', marginBottom: 4,paddingTop:'40px' }}>🛍️ PawVerse Marketplace</div>
          <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: '0.88rem', margin: 0 }}>
            {userLocation?.city ? `Showing products near ${userLocation.city} 📍` : 'Everything your fur baby needs 🐾'}
          </p>
        </div>
      </div>

      {/* Main Layout */}
      <div className="marketplace-layout" style={{ marginTop: '14px', padding: isMobile ? 0 : 8 }}>

        {/* Sidebar */}
        <div className="marketplace-sidebar" style={{ position: 'sticky', top: 70, alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Location */}
                   <div className="card" style={{ padding: 12 }}>
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, marginBottom: 8, fontSize: '0.9rem' }}>📍 Your Location</div>
            {userLocation ? (
              <>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1E1347', marginBottom: 4 }}>
                  {userLocation.city || 'Location set'}{userLocation.state ? `, ${userLocation.state}` : ''}{userLocation.pincode ? ` - ${userLocation.pincode}` : ''}
                </div>
                <button onClick={() => setShowLocationModal(true)}
                  style={{ background: 'none', border: 'none', color: '#6C4BF6', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}>
                  📍 Change location
                </button>
                
                {/* ALWAYS SHOW RANGE FILTER! */}
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 700, marginBottom: 6 }}>
                    🔍 Search Range
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {RANGE_OPTIONS.map(r => (
                      <button key={r} onClick={() => setRange(r)}
                        style={{ padding: '3px 8px', border: 'none', borderRadius: 20, background: range === r ? '#FF6B35' : '#F3F0FF', color: range === r ? '#fff' : '#6C4BF6', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}>
                        {r}km
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: 4 }}>
                    {userLocation.latitude ? '📡 GPS active — exact filtering' : '🏙️ Area-based approx filtering'}
                  </div>
                </div>
              </>
            ) : (
              <button onClick={() => setShowLocationModal(true)}
                style={{ background: 'linear-gradient(135deg,#FF6B35,#6C4BF6)', border: 'none', borderRadius: 8, padding: '7px 12px', color: '#fff', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', width: '100%' }}>
                📍 Set Location
              </button>
            )}
          </div>


          {/* Browse */}
          <div className="card" style={{ padding: 12 }}>
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, marginBottom: 10 }}>🛍️ Browse</div>
            {CATEGORIES.map(c => (
              <div key={c.key} onClick={() => setCategory(c.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', background: category === c.key ? '#FF6B35' : 'transparent', color: category === c.key ? '#fff' : '#1E1347', transition: 'all 0.2s', marginBottom: 2 }}
                onMouseEnter={e => { if (category !== c.key) e.currentTarget.style.background = '#F3F0FF' }}
                onMouseLeave={e => { if (category !== c.key) e.currentTarget.style.background = 'transparent' }}>
                {c.icon} {c.label}
              </div>
            ))}
          </div>

          {/* Sell Here */}
          <div className="card" style={{ background: 'linear-gradient(135deg,#FFF0E8,#FFE0D5)', border: 'none' }}>
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '0.9rem', marginBottom: 6 }}>🐾 Sell Here</div>
            <p style={{ fontSize: '0.76rem', color: '#6B7280', marginBottom: 10 }}>List your pet products or services</p>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary" style={{ width: '100%', fontSize: '0.82rem', padding: '8px' }}>
              + Create Listing
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, minWidth: 0, boxSizing: 'border-box' }}>

          {/* Mobile Category Strip (Visible only on mobile) */}
          {isMobile && (
            <div className="marketplace-categories-mobile" style={{ display: 'flex', overflowX: 'auto', gap: 8, padding: '8px 14px', scrollbarWidth: 'none' }}>
              {CATEGORIES.map(c => (
                <button key={c.key} className={`mobile-cat-pill ${category === c.key ? 'active' : ''}`} onClick={() => setCategory(c.key)} style={{ padding: '8px 16px', whiteSpace: 'nowrap', borderRadius: 20, border: 'none', background: category === c.key ? '#FF6B35' : '#fff', color: category === c.key ? '#fff' : '#1E1347', fontWeight: 700 }}>
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
          )}

          {/* Mobile Location + Range Bar (Visible only on mobile) */}
          {isMobile && (
            <div style={{ margin: '4px 14px 10px', background: '#fff', borderRadius: 14, padding: '10px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              {/* Location row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: userLocation ? 8 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '1rem' }}>📍</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E1347' }}>
                    {userLocation
                      ? `${userLocation.city || 'Location set'}${userLocation.state ? `, ${userLocation.state}` : ''}`
                      : 'No location set'}
                  </span>
                </div>
                <button
                  onClick={() => setShowLocationModal(true)}
                  style={{ background: 'none', border: 'none', color: '#6C4BF6', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', padding: '4px 8px', borderRadius: 20, background: '#F3F0FF' }}>
                  {userLocation ? '✏️ Change' : '📍 Set Location'}
                </button>
              </div>

              {/* Range filter row — only if location is set */}
              {userLocation && (
                <>
                  <div style={{ fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 700, marginBottom: 5 }}>
                    🔍 Search Range
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {RANGE_OPTIONS.map(r => (
                      <button key={r} onClick={() => setRange(r)}
                        style={{
                          padding: '4px 10px', border: 'none', borderRadius: 20,
                          background: range === r ? '#FF6B35' : '#F3F0FF',
                          color: range === r ? '#fff' : '#6C4BF6',
                          fontFamily: 'Nunito, sans-serif', fontWeight: 700,
                          fontSize: '0.72rem', cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}>
                        {r}km
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#9CA3AF', marginTop: 5 }}>
                    {userLocation.latitude ? '📡 GPS active — exact filtering' : '🏙️ Area-based approx filtering'}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Title */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.1rem', color: '#1E1347', paddingBottom: 10, borderBottom: '2px solid #EDE8FF' }}>
              {category === 'services' ? '🩺 Services Near You' : category === 'all' ? '🛒 All Listings' : `${CATEGORIES.find(c => c.key === category)?.icon} ${CATEGORIES.find(c => c.key === category)?.label}`}
            </div>
          </div>

          {/* Results count */}
          <div style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: 12, fontWeight: 700 }}>
            {filteredListings.length} listing{filteredListings.length !== 1 ? 's' : ''} found
            {userLocation?.city ? ` near ${userLocation.city}` : ''}
            {userLocation?.latitude ? ` within ${range}km` : ''}
          </div>

          {filteredListings.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>🐾</div>
              <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.1rem', color: '#1E1347' }}>No listings found nearby</div>
              <p style={{ color: '#6B7280', fontSize: '0.85rem', marginTop: 6 }}>Be the first to list in your area!</p>
              <button onClick={() => setShowCreateModal(true)} className="btn-primary"
                style={{ marginTop: 14, padding: '10px 24px', fontSize: '0.88rem', borderRadius: 10 }}>
                + Create First Listing
              </button>
            </div>
          ) : (
            <div className="product-grid">
                            {filteredListings.map(item => {
                const img = getFirstImage(item)
                const isDoctor = item.is_service && item.brand === 'Doctor'
                const tags = item.meant_for_list?.length ? item.meant_for_list : item.meant_for ? [item.meant_for] : []

                return (
                  <div key={item.id} className="card"
                    style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                    onClick={() => router.push(`/listing/${item.id}`)}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(108,75,246,0.16)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '' }}>

                    {/* Image Header */}
                    <div style={{ height: 160, background: isDoctor ? '#F3F0FF' : 'linear-gradient(135deg,#F9F5FF,#FFF0E8)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                      {img
                        ? <img src={img} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: '3.5rem' }}>{isDoctor ? '🩺' : (CATEGORIES.find(c => c.key === item.category)?.icon || '📦')}</span>
                      }
                      
                      {/* Doctor Overlays */}
                      {isDoctor && (
                        <div style={{ position: 'absolute', top: 8, left: 8, background: '#6C4BF6', color: '#fff', borderRadius: 20, padding: '3px 8px', fontSize: '0.65rem', fontWeight: 800 }}>
                          🩺 Verified Vet
                        </div>
                      )}
                      {!isDoctor && item.image_urls?.length > 1 && (
                        <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: 20, padding: '2px 7px', fontSize: '0.65rem', fontWeight: 700 }}>
                          📸 {item.image_urls.length}
                        </div>
                      )}
                    </div>

                    <div style={{ padding: 12 }}>
                      {/* Doctor Specific Details */}
                      {isDoctor ? (
                        <>
                          <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.05rem', color: '#1E1347', marginBottom: 2 }}>{item.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 700, marginBottom: 6 }}>{item.meant_for || 'Clinic'}</div>
                          
                          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                             <span style={{ padding: '2px 7px', borderRadius: 20, fontSize: '0.62rem', fontWeight: 800, background: '#E8F8E8', color: '#22C55E' }}>
                               {item.experience_years ? `${item.experience_years} Yrs Exp` : 'Experienced'}
                             </span>
                             <span style={{ padding: '2px 7px', borderRadius: 20, fontSize: '0.62rem', fontWeight: 800, background: '#FFF0E8', color: '#FF6B35' }}>
                               ⭐️ {item.rating || 'New'}
                             </span>
                          </div>
                          <div style={{ fontWeight: 800, color: '#1E1347', fontSize: '1rem', marginBottom: 4 }}>₹{item.price} <span style={{ color: '#9CA3AF', fontSize: '0.7rem' }}>/ visit</span></div>
                        </>
                      ) : (
                        <>
                          {/* Standard Product Details (Unchanged) */}
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                            {item.food_type && (
                              <span style={{ padding: '2px 7px', borderRadius: 20, fontSize: '0.62rem', fontWeight: 800, background: item.food_type === 'veg' ? '#E8F8E8' : '#FFE8E8', color: item.food_type === 'veg' ? '#22C55E' : '#FF4757' }}>
                                {item.food_type === 'veg' ? '🟢 Veg' : '🔴 Non-Veg'}
                              </span>
                            )}
                            {tags.slice(0, 2).map(m => (
                              <span key={m} style={{ padding: '2px 7px', borderRadius: 20, fontSize: '0.62rem', fontWeight: 800, background: '#F3F0FF', color: '#6C4BF6' }}>
                                🐾 {m}
                              </span>
                            ))}
                          </div>
                          <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 700, fontSize: '0.9rem', marginBottom: 2 }}>{item.name}</div>
                          {item.brand && <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: 2 }}>{item.brand}</div>}
                          <div style={{ fontWeight: 800, color: '#FF6B35', fontSize: '1rem', marginBottom: 4 }}>₹{item.price}</div>
                        </>
                      )}

                      <div style={{ fontSize: '0.7rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: 5 }}>
                        📍 {[item.city, item.state].filter(Boolean).join(', ') || 'N/A'}
                        {item.distance != null && item.distance < 99999 && (
                          <span style={{ marginLeft: 4, background: '#F3F0FF', color: '#6C4BF6', borderRadius: 20, padding: '1px 6px', fontWeight: 700 }}>
                            {item.distance < 1 ? `${Math.round(item.distance * 1000)}m` : `${item.distance.toFixed(1)}km`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

            </div>
          )}
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 80, right: 16, left: 16, maxWidth: 340, margin: '0 auto', background: '#1E1347', color: '#fff', padding: '12px 18px', borderRadius: 14, fontWeight: 700, fontSize: '0.86rem', zIndex: 3000, textAlign: 'center' }}>
          {toast}
        </div>
      )}

      {/* Mobile FAB — Create Listing */}
      <button className="marketplace-fab" onClick={() => setShowCreateModal(true)}>
        ＋ Sell
      </button>
    </div>
  )
}