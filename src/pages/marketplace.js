import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'

const CATEGORIES = [
  { key: 'all',         label: 'All',              icon: '🔮' },
  { key: 'food',        label: 'Food & Treats',    icon: '🍖' },
  { key: 'medicine',    label: 'Medicine & Health', icon: '🏥' },
  { key: 'grooming',    label: 'Grooming',         icon: '✂️' },
  { key: 'toys',        label: 'Toys & Accessories',icon: '🎾' },
  { key: 'housing',     label: 'Pet Housing',      icon: '🏠' },
  { key: 'clothing',    label: 'Pet Clothing',     icon: '👕' },
  { key: 'services',    label: 'Services',         icon: '🩺' },
]

const PET_TYPES = ['Dogs','Cats','Birds','Rabbits','Fish','Hamsters','Reptiles','Other']
const RANGE_OPTIONS = [5, 10, 25, 50, 100]

export default function Marketplace() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [pet, setPet] = useState(null)
  const [tab, setTab] = useState('products')
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

  // Create listing form
  const [form, setForm] = useState({
    name: '', brand: '', description: '', price: '',
    category: 'food', image: null, imagePreview: null,
    meant_for: 'Dogs', meant_for_custom: '',
    food_type: 'veg', is_service: false,
    city: '', state: '', pincode: '',
    latitude: null, longitude: null,
  })
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    init()
  }, [])

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    setUser(session.user)

    const { data: petData } = await supabase
      .from('pets').select('*').eq('user_id', session.user.id).single()
    setPet(petData)

    // Check saved location
    const savedLocation = localStorage.getItem('pawverse_location')
    if (savedLocation) {
      setUserLocation(JSON.parse(savedLocation))
      await fetchListings(JSON.parse(savedLocation))
    } else {
      setShowLocationModal(true)
      await fetchListings(null)
    }
    setLoading(false)
  }

  const fetchListings = async (location) => {
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
      alert('Geolocation not supported by your browser')
      setDetectingLocation(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        // Reverse geocode using free API
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          )
          const data = await res.json()
          const city = data.address?.city || data.address?.town || data.address?.village || ''
          const state = data.address?.state || ''
          const pincode = data.address?.postcode || ''
          const loc = { latitude, longitude, city, state, pincode, detected: true }
          setUserLocation(loc)
          localStorage.setItem('pawverse_location', JSON.stringify(loc))
          setManualCity(city)
          setManualState(state)
          setManualPincode(pincode)
        } catch (e) {
          const loc = { latitude, longitude, city: '', state: '', pincode: '', detected: true }
          setUserLocation(loc)
          localStorage.setItem('pawverse_location', JSON.stringify(loc))
        }
        setDetectingLocation(false)
      },
      (err) => {
        alert('Could not detect location. Please enter manually.')
        setDetectingLocation(false)
      }
    )
  }

  const saveManualLocation = () => {
    if (!manualCity.trim()) { alert('Please enter your city'); return }
    const loc = {
      city: manualCity.trim(),
      state: manualState.trim(),
      pincode: manualPincode.trim(),
      latitude: null, longitude: null, detected: false
    }
    setUserLocation(loc)
    localStorage.setItem('pawverse_location', JSON.stringify(loc))
    setShowLocationModal(false)
  }

  const getDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  const getFilteredListings = () => {
    let filtered = listings.filter(l => tab === 'services' ? l.is_service : !l.is_service)
    if (category !== 'all') filtered = filtered.filter(l => l.category === category)

    // Sort by distance if location available
    if (userLocation?.latitude && userLocation?.longitude) {
      filtered = filtered.map(l => ({
        ...l,
        distance: l.latitude && l.longitude
          ? getDistance(userLocation.latitude, userLocation.longitude, l.latitude, l.longitude)
          : null
      }))
      // Filter by range
      filtered = filtered.filter(l => !l.distance || l.distance <= range)
      // Sort by distance
      filtered.sort((a, b) => {
        if (a.distance === null) return 1
        if (b.distance === null) return -1
        return a.distance - b.distance
      })
    } else if (userLocation?.city) {
      // Filter by city match
      const nearbyFirst = filtered.filter(l =>
        l.city?.toLowerCase() === userLocation.city?.toLowerCase()
      )
      const others = filtered.filter(l =>
        l.city?.toLowerCase() !== userLocation.city?.toLowerCase()
      )
      filtered = [...nearbyFirst, ...others]
    }
    return filtered
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return }
    setForm(prev => ({ ...prev, image: file, imagePreview: URL.createObjectURL(file) }))
  }

  const handleCreateListing = async () => {
    if (!form.name.trim()) { alert('Please enter product name'); return }
    if (!form.price) { alert('Please enter price'); return }
    if (!form.city.trim()) { alert('Please enter location/city'); return }
    setSubmitting(true)

    try {
      let imageUrl = null
      if (form.image) {
        const ext = form.image.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('listings').upload(fileName, form.image, { cacheControl: '3600', upsert: false })
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from('listings').getPublicUrl(fileName)
        imageUrl = publicUrl
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
  image_url: imageUrl,
  meant_for: form.meant_for === 'Other' ? form.meant_for_custom : form.meant_for,
  food_type: form.category === 'food' && !form.is_service ? form.food_type : null,
  city: form.city.trim(),
  state: form.state.trim() || null,
  pincode: form.pincode.trim() || null,
  latitude: form.latitude || userLocation?.latitude || null,
  longitude: form.longitude || userLocation?.longitude || null,
  is_service: form.is_service,
  is_active: true,
  duration: form.is_service ? (form.duration || null) : null,
}).select('*, pets(pet_name, emoji, avatar_url, owner_name)').single()

      if (error) throw error

      setListings(prev => [newListing, ...prev])
      setShowCreateModal(false)
      setForm({
        name: '', brand: '', description: '', price: '',
        category: 'food', image: null, imagePreview: null,
        meant_for: 'Dogs', meant_for_custom: '',
        food_type: 'veg', is_service: false,
        city: userLocation?.city || '', state: userLocation?.state || '',
        pincode: userLocation?.pincode || '',
        latitude: userLocation?.latitude || null,
        longitude: userLocation?.longitude || null,
      })
      showToast('🎉 Listing created successfully!')
    } catch (err) {
      console.error(err)
      alert('Failed to create listing. Please try again.')
    }
    setSubmitting(false)
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const filteredListings = getFilteredListings()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '2rem' }}>🐾</div>
  )

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

      {/* Location Modal */}
      {showLocationModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: '3rem', marginBottom: 8 }}>📍</div>
              <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.3rem', color: '#1E1347' }}>
                Where are you located?
              </div>
              <p style={{ color: '#6B7280', fontSize: '0.85rem', marginTop: 6 }}>
                We'll show you products & services available near you! 🐾
              </p>
            </div>

            {/* Auto detect */}
            <button
              onClick={detectLocation}
              disabled={detectingLocation}
              style={{
                width: '100%', padding: '12px', border: 'none', borderRadius: 12,
                background: 'linear-gradient(135deg, #FF6B35, #6C4BF6)',
                color: '#fff', fontFamily: 'Nunito, sans-serif', fontWeight: 800,
                fontSize: '0.95rem', cursor: 'pointer', marginBottom: 16,
                opacity: detectingLocation ? 0.7 : 1
              }}>
              {detectingLocation ? '📡 Detecting...' : '📍 Auto-Detect My Location'}
            </button>

            {userLocation?.detected && (
              <div style={{ background: '#E8F8E8', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: '0.85rem', color: '#22C55E', fontWeight: 700 }}>
                ✅ Location detected: {userLocation.city}{userLocation.state ? `, ${userLocation.state}` : ''}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1, height: 1, background: '#EDE8FF' }} />
              <span style={{ fontSize: '0.78rem', color: '#9CA3AF', fontWeight: 700 }}>OR ENTER MANUALLY</span>
              <div style={{ flex: 1, height: 1, background: '#EDE8FF' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                value={manualCity}
                onChange={e => setManualCity(e.target.value)}
                placeholder="City *"
                className="input"
                style={{ margin: 0 }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input
                  value={manualState}
                  onChange={e => setManualState(e.target.value)}
                  placeholder="State"
                  className="input"
                  style={{ margin: 0 }}
                />
                <input
                  value={manualPincode}
                  onChange={e => setManualPincode(e.target.value)}
                  placeholder="Pincode"
                  className="input"
                  style={{ margin: 0 }}
                />
              </div>
            </div>

            <button
              onClick={saveManualLocation}
              style={{
                width: '100%', padding: '11px', border: 'none', borderRadius: 12,
                background: '#1E1347', color: '#fff', fontFamily: 'Nunito, sans-serif',
                fontWeight: 800, fontSize: '0.92rem', cursor: 'pointer', marginTop: 14
              }}>
              Confirm Location →
            </button>

            <button
              onClick={() => setShowLocationModal(false)}
              style={{
                width: '100%', padding: '8px', border: 'none', background: 'none',
                color: '#9CA3AF', fontFamily: 'Nunito, sans-serif', fontWeight: 700,
                fontSize: '0.82rem', cursor: 'pointer', marginTop: 8
              }}>
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* Create Listing Modal */}
     {showCreateModal && (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
    <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.2rem', color: '#1E1347' }}>
          {form.is_service ? '🩺 List Your Service' : '📦 Create Product Listing'}
        </div>
        <button onClick={() => setShowCreateModal(false)}
          style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#6B7280' }}>✕</button>
      </div>

      {/* Product or Service toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[false, true].map(isService => (
          <button key={String(isService)}
            onClick={() => setForm(prev => ({ ...prev, is_service: isService }))}
            style={{
              flex: 1, padding: '10px', border: 'none', borderRadius: 12,
              background: form.is_service === isService
                ? 'linear-gradient(135deg,#FF6B35,#6C4BF6)' : '#F3F0FF',
              color: form.is_service === isService ? '#fff' : '#6C4BF6',
              fontFamily: 'Nunito, sans-serif', fontWeight: 800,
              fontSize: '0.88rem', cursor: 'pointer'
            }}>
            {isService ? '🩺 Service / Clinic' : '📦 Product'}
          </button>
        ))}
      </div>

      {/* ── PRODUCT FORM ── */}
      {!form.is_service && (
        <>
          <label className="label">Product Name *</label>
          <input className="input" value={form.name}
            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. Royal Canin Dog Food" />

          <label className="label">Brand (Optional)</label>
          <input className="input" value={form.brand}
            onChange={e => setForm(prev => ({ ...prev, brand: e.target.value }))}
            placeholder="e.g. Royal Canin, Pedigree..." />

          <label className="label">Category *</label>
          <select className="input" value={form.category}
            onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}>
            {CATEGORIES.filter(c => c.key !== 'all' && c.key !== 'services').map(c => (
              <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
            ))}
          </select>

          {/* Image Upload */}
          <label className="label">Product Image</label>
          <input ref={fileInputRef} type="file" accept="image/*"
            onChange={handleImageSelect} style={{ display: 'none' }} />
          {form.imagePreview ? (
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <img src={form.imagePreview} alt="preview"
                style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 12, display: 'block' }} />
              <button onClick={() => setForm(prev => ({ ...prev, image: null, imagePreview: null }))}
                style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
          ) : (
            <div onClick={() => fileInputRef.current?.click()}
              style={{ border: '2px dashed #EDE8FF', borderRadius: 12, padding: '24px', textAlign: 'center', cursor: 'pointer', marginBottom: 12, background: '#FAFAFA' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#6C4BF6'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#EDE8FF'}>
              <div style={{ fontSize: '2rem', marginBottom: 6 }}>📸</div>
              <div style={{ fontSize: '0.82rem', color: '#6B7280', fontWeight: 700 }}>Click to upload image</div>
              <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>Max 5MB</div>
            </div>
          )}

          <label className="label">Meant For *</label>
          <select className="input" value={form.meant_for}
            onChange={e => setForm(prev => ({ ...prev, meant_for: e.target.value }))}>
            {PET_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {form.meant_for === 'Other' && (
            <input className="input" value={form.meant_for_custom}
              onChange={e => setForm(prev => ({ ...prev, meant_for_custom: e.target.value }))}
              placeholder="Specify your pet type..." />
          )}

          {form.category === 'food' && (
            <>
              <label className="label">Food Type *</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {[{ key: 'veg', label: '🟢 Veg' }, { key: 'nonveg', label: '🔴 Non-Veg' }].map(ft => (
                  <button key={ft.key}
                    onClick={() => setForm(prev => ({ ...prev, food_type: ft.key }))}
                    style={{
                      flex: 1, padding: '8px', border: '2px solid',
                      borderColor: form.food_type === ft.key
                        ? (ft.key === 'veg' ? '#22C55E' : '#FF4757') : '#EDE8FF',
                      borderRadius: 10,
                      background: form.food_type === ft.key
                        ? (ft.key === 'veg' ? '#E8F8E8' : '#FFE8E8') : '#fff',
                      color: form.food_type === ft.key
                        ? (ft.key === 'veg' ? '#22C55E' : '#FF4757') : '#6B7280',
                      fontFamily: 'Nunito, sans-serif', fontWeight: 800,
                      fontSize: '0.85rem', cursor: 'pointer'
                    }}>
                    {ft.label}
                  </button>
                ))}
              </div>
            </>
          )}

          <label className="label">Price (₹) *</label>
          <input className="input" type="number" value={form.price}
            onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))}
            placeholder="e.g. 499" min="0" />

          <label className="label">Location *</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <input className="input" value={form.city}
              onChange={e => setForm(prev => ({ ...prev, city: e.target.value }))}
              placeholder="City *" style={{ margin: 0, flex: 1 }} />
            <input className="input" value={form.pincode}
              onChange={e => setForm(prev => ({ ...prev, pincode: e.target.value }))}
              placeholder="Pincode" style={{ margin: 0, width: 100 }} />
          </div>
          <input className="input" value={form.state}
            onChange={e => setForm(prev => ({ ...prev, state: e.target.value }))}
            placeholder="State" />

          {userLocation && (
            <button
              onClick={() => setForm(prev => ({
                ...prev,
                city: userLocation.city || prev.city,
                state: userLocation.state || prev.state,
                pincode: userLocation.pincode || prev.pincode,
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
              }))}
              style={{ background: '#F3F0FF', border: 'none', borderRadius: 8, padding: '6px 14px', color: '#6C4BF6', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', marginBottom: 12 }}>
              📍 Use my current location
            </button>
          )}

          <label className="label">Description (Optional)</label>
          <textarea className="input" value={form.description}
            onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Any additional details about your product..."
            style={{ minHeight: 70, resize: 'none' }} />
        </>
      )}

      {/* ── SERVICE / CLINIC FORM ── */}
      {form.is_service && (
        <>
          {/* Clinic name */}
          <label className="label">Clinic / Doctor Name *</label>
          <input className="input" value={form.name}
            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. Dr. Mehra's Pet Clinic" />

          {/* Service type dropdown */}
          <label className="label">Service Type *</label>
          <select className="input" value={form.service_type || ''}
            onChange={e => setForm(prev => ({ ...prev, service_type: e.target.value }))}>
            <option value="">-- Select Service Type --</option>
            <option value="Grooming Services">✂️ Grooming Services</option>
            <option value="Veterinary & Health Services">🩺 Veterinary & Health Services</option>
            <option value="Pet Boarding & Daycare">🏠 Pet Boarding & Daycare</option>
            <option value="Pet Walking & Exercise">🏃 Pet Walking & Exercise</option>
            <option value="Training Services">🎓 Training Services</option>
            <option value="Pet Products & Retail">🛍️ Pet Products & Retail</option>
            <option value="Other">✏️ Other</option>
          </select>
          {form.service_type === 'Other' && (
            <input className="input" value={form.service_type_custom || ''}
              onChange={e => setForm(prev => ({ ...prev, service_type_custom: e.target.value }))}
              placeholder="Specify your service type..." />
          )}

          {/* Clinic image */}
          <label className="label">Clinic / Service Image</label>
          <input ref={fileInputRef} type="file" accept="image/*"
            onChange={handleImageSelect} style={{ display: 'none' }} />
          {form.imagePreview ? (
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <img src={form.imagePreview} alt="preview"
                style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 12, display: 'block' }} />
              <button onClick={() => setForm(prev => ({ ...prev, image: null, imagePreview: null }))}
                style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
          ) : (
            <div onClick={() => fileInputRef.current?.click()}
              style={{ border: '2px dashed #EDE8FF', borderRadius: 12, padding: '24px', textAlign: 'center', cursor: 'pointer', marginBottom: 12, background: '#FAFAFA' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#6C4BF6'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#EDE8FF'}>
              <div style={{ fontSize: '2rem', marginBottom: 6 }}>📸</div>
              <div style={{ fontSize: '0.82rem', color: '#6B7280', fontWeight: 700 }}>Upload clinic/service image</div>
              <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>Max 5MB</div>
            </div>
          )}

          {/* Cost */}
          <label className="label">Cost (₹) *</label>
          <input className="input" type="number" value={form.price}
            onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))}
            placeholder="e.g. 500 per visit" min="0" />

          {/* Duration */}
          <label className="label">Duration *</label>
          <input className="input" value={form.duration || ''}
            onChange={e => setForm(prev => ({ ...prev, duration: e.target.value }))}
            placeholder="e.g. 30 mins, 1 hour, Full day..." />

          {/* Meant for */}
          <label className="label">Meant For *</label>
          <select className="input" value={form.meant_for}
            onChange={e => setForm(prev => ({ ...prev, meant_for: e.target.value }))}>
            {PET_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
            <option value="All Pets">All Pets</option>
          </select>
          {form.meant_for === 'Other' && (
            <input className="input" value={form.meant_for_custom}
              onChange={e => setForm(prev => ({ ...prev, meant_for_custom: e.target.value }))}
              placeholder="Specify pet type..." />
          )}

          {/* Location */}
          <label className="label">Clinic Location *</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <input className="input" value={form.city}
              onChange={e => setForm(prev => ({ ...prev, city: e.target.value }))}
              placeholder="City *" style={{ margin: 0, flex: 1 }} />
            <input className="input" value={form.pincode}
              onChange={e => setForm(prev => ({ ...prev, pincode: e.target.value }))}
              placeholder="Pincode" style={{ margin: 0, width: 100 }} />
          </div>
          <input className="input" value={form.state}
            onChange={e => setForm(prev => ({ ...prev, state: e.target.value }))}
            placeholder="State" />

          {userLocation && (
            <button
              onClick={() => setForm(prev => ({
                ...prev,
                city: userLocation.city || prev.city,
                state: userLocation.state || prev.state,
                pincode: userLocation.pincode || prev.pincode,
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
              }))}
              style={{ background: '#F3F0FF', border: 'none', borderRadius: 8, padding: '6px 14px', color: '#6C4BF6', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', marginBottom: 12 }}>
              📍 Use my current location
            </button>
          )}

          {/* Additional info */}
          <label className="label">Additional Information (Optional)</label>
          <textarea className="input" value={form.description}
            onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Opening hours, specializations, qualifications, languages spoken, any other details..."
            style={{ minHeight: 90, resize: 'none' }} />
        </>
      )}

      <button onClick={handleCreateListing} disabled={submitting}
        style={{
          width: '100%', padding: '12px', border: 'none', borderRadius: 12,
          background: 'linear-gradient(135deg, #FF6B35, #6C4BF6)',
          color: '#fff', fontFamily: 'Nunito, sans-serif', fontWeight: 800,
          fontSize: '0.95rem', cursor: 'pointer', marginTop: 8,
          opacity: submitting ? 0.7 : 1
        }}>
        {submitting ? '📤 Publishing...' : form.is_service ? '🩺 Publish Service' : '🚀 Publish Listing'}
      </button>
    </div>
  </div>
)}

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 14, maxWidth: 1100, margin: '70px auto 0', padding: 14 }}>

        {/* Sidebar */}
        <div style={{ position: 'sticky', top: 70, alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Location Card */}
          <div className="card" style={{ padding: 12 }}>
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, marginBottom: 8, fontSize: '0.9rem' }}>
              📍 Your Location
            </div>
            {userLocation ? (
              <>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1E1347', marginBottom: 4 }}>
                  {userLocation.city || 'Location set'}{userLocation.state ? `, ${userLocation.state}` : ''}
                  {userLocation.pincode ? ` - ${userLocation.pincode}` : ''}
                </div>
                <button onClick={() => setShowLocationModal(true)}
                  style={{ background: 'none', border: 'none', color: '#6C4BF6', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}>
                  📍 Change location
                </button>

                {/* Range selector */}
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 700, marginBottom: 6 }}>
                    🔍 Search Range
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {RANGE_OPTIONS.map(r => (
                      <button key={r} onClick={() => setRange(r)}
                        style={{
                          padding: '3px 8px', border: 'none', borderRadius: 20,
                          background: range === r ? '#FF6B35' : '#F3F0FF',
                          color: range === r ? '#fff' : '#6C4BF6',
                          fontFamily: 'Nunito, sans-serif', fontWeight: 700,
                          fontSize: '0.72rem', cursor: 'pointer'
                        }}>{r}km</button>
                    ))}
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

          {/* Browse Categories */}
          <div className="card" style={{ padding: 12 }}>
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, marginBottom: 10 }}>🛍️ Browse</div>
            {CATEGORIES.map(c => (
              <div key={c.key} onClick={() => {
                setCategory(c.key)
                if (c.key === 'services') setTab('services')
                else setTab('products')
              }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
                  background: category === c.key ? '#FF6B35' : 'transparent',
                  color: category === c.key ? '#fff' : '#1E1347',
                  transition: 'all 0.2s', marginBottom: 2
                }}
                onMouseEnter={e => { if (category !== c.key) e.currentTarget.style.background = '#F3F0FF' }}
                onMouseLeave={e => { if (category !== c.key) e.currentTarget.style.background = 'transparent' }}
              >
                {c.icon} {c.label}
              </div>
            ))}
          </div>

          {/* Sell Here */}
          <div className="card" style={{ background: 'linear-gradient(135deg,#FFF0E8,#FFE0D5)', border: 'none' }}>
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '0.9rem', marginBottom: 6 }}>🐾 Sell Here</div>
            <p style={{ fontSize: '0.76rem', color: '#6B7280', marginBottom: 10 }}>List your pet products or services — free!</p>
            <button onClick={() => setShowCreateModal(true)}
              className="btn-primary" style={{ width: '100%', fontSize: '0.82rem', padding: '8px' }}>
              + Create Listing
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div>
          {/* Header Banner */}
          <div className="card" style={{ background: 'linear-gradient(135deg,#FF6B35,#6C4BF6)', border: 'none', padding: 20, marginBottom: 14 }}>
            <div style={{ color: '#fff', fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.45rem', marginBottom: 4 }}>
              🛍️ PawVerse Marketplace
            </div>
            <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: '0.88rem', margin: 0 }}>
              {userLocation?.city
                ? `Showing products near ${userLocation.city} 📍`
                : 'Everything your fur baby needs 🐾'}
            </p>
          </div>

          {/* Tabs */}
         {/* Tab title only — no tab buttons */}
<div style={{ marginBottom: 14 }}>
  <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.1rem', color: '#1E1347', paddingBottom: 10, borderBottom: '2px solid #EDE8FF' }}>
    {tab === 'services' ? '🩺 Services Near You' : '🛒 Products Near You'}
  </div>
</div>

          {/* Results info */}
          <div style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: 12, fontWeight: 700 }}>
            {filteredListings.length} {tab === 'services' ? 'services' : 'products'} found
            {userLocation?.city ? ` near ${userLocation.city}` : ''}
            {userLocation?.latitude ? ` within ${range}km` : ''}
          </div>

          {/* Listings Grid */}
          {filteredListings.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>🐾</div>
              <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.1rem', color: '#1E1347' }}>
                No listings found nearby
              </div>
              <p style={{ color: '#6B7280', fontSize: '0.85rem', marginTop: 6 }}>
                Be the first to list in your area!
              </p>
              <button onClick={() => setShowCreateModal(true)} className="btn-primary"
                style={{ marginTop: 14, padding: '10px 24px', fontSize: '0.88rem', borderRadius: 10 }}>
                + Create First Listing
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
              {filteredListings.map(item => (
                <div key={item.id} className="card"
                  style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(108,75,246,0.16)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '' }}>

                  {/* Image */}
                  <div
                    onClick={() => item.image_url && setLightboxImg(item.image_url)}
                    style={{ height: 150, background: 'linear-gradient(135deg,#F9F5FF,#FFF0E8)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: item.image_url ? 'zoom-in' : 'default' }}>
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: '3.5rem' }}>
                          {CATEGORIES.find(c => c.key === item.category)?.icon || '📦'}
                        </span>
                    }
                  </div>

                  <div style={{ padding: 12 }}>
                    {/* Tags */}
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                      {item.food_type && (
                        <span style={{ padding: '2px 7px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 800, background: item.food_type === 'veg' ? '#E8F8E8' : '#FFE8E8', color: item.food_type === 'veg' ? '#22C55E' : '#FF4757' }}>
                          {item.food_type === 'veg' ? '🟢 Veg' : '🔴 Non-Veg'}
                        </span>
                      )}
                      {item.meant_for && (
                        <span style={{ padding: '2px 7px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 800, background: '#F3F0FF', color: '#6C4BF6' }}>
                          🐾 {item.meant_for}
                        </span>
                      )}
                    </div>

                    <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 700, fontSize: '0.9rem', marginBottom: 2 }}>
                      {item.name}
                    </div>
                    {item.brand && (
                      <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: 2 }}>{item.brand}</div>
                    )}
                    <div style={{ fontWeight: 800, color: '#FF6B35', fontSize: '1rem', marginBottom: 4 }}>
                      ₹{item.price}
                    </div>

                    {/* Location + distance */}
                    <div style={{ fontSize: '0.7rem', color: '#6B7280', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>📍 {item.city || 'Location N/A'}</span>
                      {item.distance != null && (
                        <span style={{ background: '#F3F0FF', color: '#6C4BF6', borderRadius: 20, padding: '1px 6px', fontWeight: 700 }}>
                          {item.distance < 1 ? `${Math.round(item.distance * 1000)}m` : `${item.distance.toFixed(1)}km`}
                        </span>
                      )}
                    </div>

                    {/* Seller */}
                    <div style={{ fontSize: '0.7rem', color: '#6B7280', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#FFE8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', overflow: 'hidden' }}>
                        {item.pets?.avatar_url
                          ? <img src={item.pets.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : item.pets?.emoji || '🐾'}
                      </div>
                      {item.pets?.owner_name || 'PawVerse Seller'}
                    </div>

                    <button className="btn-primary"
                      onClick={() => showToast(`🛒 ${item.name} added to cart! +5 PawCoins 🪙`)}
                      style={{ width: '100%', padding: '7px', fontSize: '0.78rem' }}>
                      {item.is_service ? '📅 Book Now' : '🛒 Add to Cart'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 22, right: 22, background: '#1E1347', color: '#fff', padding: '12px 18px', borderRadius: 14, fontWeight: 700, fontSize: '0.86rem', zIndex: 3000 }}>
          {toast}
        </div>
      )}
    </div>
  )
}