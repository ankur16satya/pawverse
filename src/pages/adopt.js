import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'
import SEO from '../components/SEO'
import { uploadToCloudinary } from '../lib/cloudinary'

export default function Adopt() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [pet, setPet] = useState(null)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('All')
  const [toast, setToast] = useState('')
  const [petsList, setPetsList] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  
  const [formData, setFormData] = useState({
    name: '', type: 'Dogs', breed: '', gender: 'Unknown', age: '', city: '', area: '', pinCode: '', pickup: '',
    vac: 'Not Known', sterilized: 'Not Sure', medical: '', lastVet: '',
    temperament: 'Friendly', goodKids: 'Not Sure', goodDogs: 'Not Sure', goodCats: 'Not Sure', energy: 'Medium', houseTrained: 'Not Sure',
    reason: '', sinceWhen: '', fee: 'Free',
    listerName: '', phone: '', whatsapp: '', email: '', contactMethod: 'Call',
    illegalConsent: false, adoptionConsent: false, urgency: 'Normal'
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      setUser(session.user)
      supabase.from('pets').select('*').eq('user_id', session.user.id).eq('is_health_pet', false).single().then(({ data }) => setPet(data))
      fetchListings()
    })
  }, [])

  const fetchListings = async () => {
    try {
      const { data, error } = await supabase.from('adoption_listings').select('*').order('created_at', { ascending: false })
      if (!error && data) {
        // Map database row to our structure
        const mapped = data.map(row => ({
          id: row.id,
          name: row.name || 'Unknown Pet',
          emoji: emojiMap[row.type] || '🐾',
          type: row.breed ? `${row.breed} (${row.type})` : row.type,
          age: row.age || 'Unknown Age',
          gender: row.gender,
          bg: row.urgency === 'Emergency' ? 'linear-gradient(135deg,#FFEFEF,#FFCACA)' : row.urgency === 'Urgent' ? 'linear-gradient(135deg,#FFF3CD,#FFE69C)' : 'linear-gradient(135deg,#F5F0FF,#E0D5FF)', 
          urgent: row.urgency === 'Urgent' || row.urgency === 'Emergency',
          traits: [row.temperament, row.energy + ' Energy', row.house_trained === 'Yes' ? 'House-trained' : ''].filter(Boolean),
          rescue: row.lister_name || 'Individual Rescuer',
          location: row.city || 'Unknown Location',
          user_id: row.user_id,
          image_urls: row.image_urls || [],
          fullInfo: {
            vac: row.vac, sterilized: row.sterilized, medical: row.medical, goodKids: row.good_kids, goodDogs: row.good_dogs,
            temperament: row.temperament, energy: row.energy, reason: row.reason, fee: row.fee, listerName: row.lister_name,
            phone: row.phone, contactMethod: row.contact_method, whatsapp: row.whatsapp, email: row.email
          }
        }))
        setPetsList(mapped)
      }
    } catch (e) { console.error('Error fetching listings:', e) }
  }

  const types = ['All','Dogs','Cats','Rabbits','Birds','Small Pets']
  const inputTypes = ['Dogs','Cats','Rabbits','Birds','Small Pets', 'Other']
  const emojiMap = { Dogs:'🐶', Cats:'🐱', Rabbits:'🐇', Birds:'🦜', 'Small Pets':'🐹', Other: '🐾' }
  const filtered = filter === 'All' ? petsList : petsList.filter(p => {
     if(filter === 'Others') return !emojiMap[p.emoji]
     return p.emoji === emojiMap[filter]
  })

  const express = async (a) => {
    try {
      if (user && a.user_id && a.user_id !== user.id) {
         const friendId = a.user_id;
         let conv = null;
         const { data: existingConvs } = await supabase.from('conversations').select('*')
           .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`);
         
         if (existingConvs) {
            conv = existingConvs.find(c => 
              (c.participant_1 === user.id && c.participant_2 === friendId) ||
              (c.participant_2 === user.id && c.participant_1 === friendId)
            );
         }
         if (!conv) {
            const { data: newConv } = await supabase.from('conversations').insert({
              participant_1: user.id,
              participant_2: friendId,
              last_message: 'I am interested in this pet... how can I adopt?',
              last_message_at: new Date().toISOString()
            }).select().single();
            conv = newConv;
         }

         if (conv) {
            await supabase.from('messages').insert({
               conversation_id: conv.id,
               sender_id: user.id,
               content: `Hi! I am interested in adopting ${a.name}. How can I proceed?`,
               is_read: false
            });
            await supabase.from('conversations').update({
               last_message: `Hi! I am interested in adopting ${a.name}. How can I proceed?`,
               last_message_at: new Date().toISOString()
            }).eq('id', conv.id);
            
            router.push('/chat') // Redirect to chat immediately
            return;
         }
      }
    } catch (e) { console.error(e) }

    setSelected(null)
    setToast(`❤️ Interest expressed for ${a.name}! A message has been sent.`)
    setTimeout(() => setToast(''), 4000)
    router.push('/chat')
  }

  const handleDeleteListing = async (listingId) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    try {
      await supabase.from('adoption_listings').delete().eq('id', listingId).eq('user_id', user.id);
      setPetsList(prev => prev.filter(p => p.id !== listingId));
      setSelected(null);
      setToast('🗑️ Listing deleted successfully.');
      setTimeout(() => setToast(''), 3000);
    } catch (e) {
      console.error(e);
      alert('Failed to delete listing.');
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  }

  const handleListSubmit = async (e) => {
    e.preventDefault()
    if (!formData.illegalConsent || !formData.adoptionConsent) {
      setToast('⚠️ Please agree to the terms to list the pet.')
      setTimeout(() => setToast(''), 3000)
      return
    }

    setUploading(true);
    let uploadedUrls = [];

    try {
      // Upload images to Cloudinary
      for (const file of selectedFiles) {
        const publicUrl = await uploadToCloudinary(file, 'listings')
        uploadedUrls.push(publicUrl)
      }

      const insertData = {
        user_id: user.id,
        name: formData.name,
        type: formData.type,
        breed: formData.breed,
        gender: formData.gender,
        age: formData.age,
        city: formData.city,
        area: formData.area,
        pincode: formData.pinCode,
        pickup: formData.pickup,
        vac: formData.vac,
        sterilized: formData.sterilized,
        medical: formData.medical,
        last_vet: formData.lastVet,
        temperament: formData.temperament,
        energy: formData.energy,
        house_trained: formData.houseTrained,
        good_kids: formData.goodKids,
        good_dogs: formData.goodDogs,
        good_cats: formData.goodCats,
        reason: formData.reason,
        since_when: formData.sinceWhen,
        fee: formData.fee,
        lister_name: formData.listerName,
        phone: formData.phone,
        whatsapp: formData.whatsapp,
        email: formData.email,
        contact_method: formData.contactMethod,
        urgency: formData.urgency,
        image_urls: uploadedUrls,
      };

      const { data, error } = await supabase.from('adoption_listings').insert(insertData).select().single()
      
      if (error) throw error;

      await fetchListings();

      setShowAddForm(false)
      setSelectedFiles([])
      setFormData({
        name: '', type: 'Dogs', breed: '', gender: 'Unknown', age: '', city: '', area: '', pinCode: '', pickup: '',
        vac: 'Not Known', sterilized: 'Not Sure', medical: '', lastVet: '',
        temperament: 'Friendly', goodKids: 'Not Sure', goodDogs: 'Not Sure', goodCats: 'Not Sure', energy: 'Medium', houseTrained: 'Not Sure',
        reason: '', sinceWhen: '', fee: 'Free',
        listerName: '', phone: '', whatsapp: '', email: '', contactMethod: 'Call',
        illegalConsent: false, adoptionConsent: false, urgency: 'Normal'
      })
      setToast('✅ Pet listed successfully!')
      setTimeout(() => setToast(''), 3000)

    } catch (e) {
      console.error(e);
      alert("Failed to create listing. Please make sure you have run the SQL script to create the 'adoption_listings' table.");
    } finally {
      setUploading(false);
    }
  }

  const inputStyle = { padding: '12px', borderRadius: '10px', border: '1px solid #D1D5DB', width: '100%', boxSizing: 'border-box', fontFamily: 'Nunito, sans-serif', background: '#F9FAFB', outline: 'none' };
  const labelStyle = { display: 'block', fontSize: '0.86rem', color: '#374151', fontWeight: 800, marginBottom: 5 };

  return (
     <div style={{ background: 'linear-gradient(135deg, rgba(213, 134, 200, 1), rgba(105, 201, 249, 1))',padding:'30px', minHeight: '100vh',}}>
      <SEO 
        title="Pet Adoption in India | Adopt Dogs & Cats Near You"
        description="Find your forever furry friend on PawVerse Adoption Board. Browse dogs, cats, rabbits and more looking for a loving home in Dehradun and across India."
        keywords="pet adoption India, adopt dog Dehradun, adopt cat near me, rescue dog India, pet adoption board, free pet adoption, adopt puppy India"
      />
      <NavBar user={user} pet={pet} />
      <div style={{ maxWidth: 1060, margin: '70px auto 0', padding: 14 }}>
        <div className="card" style={{ background: 'linear-gradient(135deg,#2DD4BF,#6C4BF6)', border: 'none', padding: 22, marginBottom: 16, display: 'flex', flexWrap: 'wrap', justifyContent:'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#fff', fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.45rem', marginBottom: 4 }}>🏠 Adopt & Rescue Board</div>
            <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: '0.88rem', marginBottom: 14 }}>Every pet deserves a loving home. Find your forever friend here 🐾❤️</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {types.map(t => (
                <button key={t} onClick={() => setFilter(t)}
                  style={{ padding: '5px 14px', borderRadius: 20, border: 'none', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', background: filter === t ? '#fff' : 'rgba(255,255,255,0.22)', color: filter === t ? '#6C4BF6' : '#fff', transition: 'all 0.2s' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <button className="btn-primary" style={{ padding: '10px 20px', borderRadius: 30, fontSize: '0.9rem', marginTop: 10, background: '#fff', color: '#6C4BF6', border: '2px solid #fff' }} onClick={() => setShowAddForm(true)}>
            + List a Pet
          </button>
        </div>

        {petsList.length === 0 && (
          <div style={{ textAlign: 'center', padding: '50px 20px', background: 'rgba(255,255,255,0.5)', borderRadius: 20 }}>
            <div style={{ fontSize: '3rem', marginBottom: 10 }}>🐾</div>
            <h3 style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.3rem', color: '#1E1347' }}>No pets listed yet</h3>
            <p style={{ color: '#4B5563', fontSize: '0.9rem' }}>Be the first to list a pet for adoption!</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 16 }}>
          {filtered.map(a => (
            <div key={a.id} onClick={() => setSelected(a)}
              style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 4px 20px rgba(108,75,246,0.1)', border: '1px solid #EDE8FF', cursor: 'pointer', transition: 'transform 0.3s, box-shadow 0.3s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(108,75,246,0.18)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(108,75,246,0.1)' }}>
              
              <div style={{ height: 156, background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4.5rem', position: 'relative' }}>
                {a.image_urls && a.image_urls.length > 0 ? (
                  <img src={a.image_urls[0]} alt="pet" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : a.emoji}
                {a.urgent && <div style={{ position: 'absolute', top: 10, right: 10, background: '#FF4757', color: '#fff', padding: '3px 9px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 800 }}>⚡ URGENT</div>}
              </div>
              <div style={{ padding: 13 }}>
                <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.02rem', color: '#1E1347' }}>{a.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', margin: '3px 0 8px' }}>{a.type} · {a.age} · {a.gender} · 📍 {a.location}</div>
                <div style={{ marginBottom: 8 }}>{a.traits.map(t => <span key={t} style={{ display: 'inline-block', padding: '3px 8px', background: '#F3F0FF', color: '#6C4BF6', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700, margin: 2 }}>{t}</span>)}</div>
                <div style={{ fontSize: '0.72rem', color: '#6B7280', marginBottom: 8 }}>🏠 {a.rescue}</div>
                <button className="btn-primary" style={{ width: '100%', padding: 8, fontSize: '0.8rem' }} onClick={e => { e.stopPropagation(); express(a) }}>❤️ Express Interest</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pet Details Modal */}
      {selected && (
        <div onMouseDown={e => e.target === e.currentTarget && setSelected(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 22, padding: 28, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ height: 160, borderRadius: 14, background: selected.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
              {selected.image_urls && selected.image_urls.length > 0 ? (
                  <img src={selected.image_urls[0]} alt="pet" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : selected.emoji}
              {selected.urgent && <div style={{ position: 'absolute', top: 10, right: 10, background: '#FF4757', color: '#fff', padding: '3px 9px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 800 }}>⚡ URGENT</div>}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.6rem', color: '#1E1347', margin: 0 }}>{selected.name}</h2>
                <p style={{ color: '#6B7280', fontSize: '0.84rem', margin: '4px 0 12px' }}>{selected.type} · {selected.age} · {selected.gender}</p>
              </div>
              {user && selected.user_id === user.id && (
                <button onClick={() => handleDeleteListing(selected.id)} style={{ background: 'none', border: 'none', color: '#FF4757', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem', padding: '4px 8px' }}>🗑️ Delete Listing</button>
              )}
            </div>

            <div style={{ marginBottom: 12 }}>{selected.traits.map(t => <span key={t} style={{ display: 'inline-block', padding: '3px 8px', background: '#F3F0FF', color: '#6C4BF6', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700, margin: 2 }}>{t}</span>)}</div>
            <p style={{ fontSize: '0.82rem', marginBottom: 14, color: '#374151' }}>📍 {selected.location} · 🏠 {selected.rescue}</p>
            
            {selected.fullInfo && (
               <div style={{ fontSize: '0.75rem', color: '#4B5563', padding: '12px', background: '#F9FAFB', borderRadius: 8, marginBottom: 16, border: '1px solid #E5E7EB' }}>
                 <div style={{ marginBottom: 6 }}><strong style={{ color: '#1E1347' }}>Health & Medical:</strong> Vac: {selected.fullInfo.vac} | Sterilized: {selected.fullInfo.sterilized} | Medical: {selected.fullInfo.medical || 'None'}</div>
                 <div style={{ marginBottom: 6 }}><strong style={{ color: '#1E1347' }}>Behavior:</strong> {selected.fullInfo.temperament} | Energy: {selected.fullInfo.energy} | Kids: {selected.fullInfo.goodKids} | Dogs: {selected.fullInfo.goodDogs}</div>
                 <div style={{ marginBottom: 6 }}><strong style={{ color: '#1E1347' }}>Reason for Adoption:</strong> {selected.fullInfo.reason} | Fee: {selected.fullInfo.fee}</div>
               </div>
            )}

            <div style={{ padding: '14px', background: '#F3F0FF', borderRadius: 14, marginBottom: 16, border: '1px solid #E0D5FF' }}>
              <div style={{ fontSize: '0.8rem', color: '#6C4BF6', fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                🏠 LISTED BY / OWNER DETAILS
              </div>
              <div style={{ fontSize: '1.05rem', color: '#1E1347', fontWeight: 800 }}>
                {selected.fullInfo?.listerName || selected.rescue || 'Anonymous Lister'}
              </div>
              {selected.fullInfo ? (
                <div style={{ fontSize: '0.85rem', color: '#4B5563', marginTop: 6, lineHeight: 1.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>📞 <strong>{selected.fullInfo.phone}</strong></div>
                  {selected.fullInfo.whatsapp && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>💬 WA: {selected.fullInfo.whatsapp}</div>}
                  {selected.fullInfo.email && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>✉️ {selected.fullInfo.email}</div>}
                  <div style={{ marginTop: 4, fontWeight: 700, color: '#6B7280' }}>Preferred Contact: {selected.fullInfo.contactMethod}</div>
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: '#4B5563', marginTop: 4 }}>
                  Rescue Organization / Local Shelter
                </div>
              )}
            </div>

            {(!user || selected.user_id !== user.id) && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" style={{ flex: 1, padding: 12 }} onClick={() => express(selected)}>❤️ I Want to Adopt</button>
                <button className="btn-secondary" style={{ flex: 1, padding: 12, background: '#F3F4F6', color: '#4B5563', border: 'none', borderRadius: 8, fontWeight: 800 }} onClick={() => router.push('/chat')}>💬 Message Owner</button>
              </div>
            )}
            <button style={{ width: '100%', padding: 10, background: 'none', border: 'none', color: '#6B7280', marginTop: 10, cursor: 'pointer', fontWeight: 700 }} onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}

      {/* Add Pet Listing Form Modal */}
      {showAddForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 2000, padding: 16, overflowY: 'auto' }}>
           <div style={{ background: '#fff', borderRadius: 22, padding: '30px', width: '100%', maxWidth: 700, margin: '20px auto' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
               <h2 style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.6rem', color: '#1E1347', margin: 0 }}>🐾 Pet Adoption Listing Form</h2>
               <button onClick={() => setShowAddForm(false)} style={{ background: '#F3F4F6', border: 'none', fontSize: '1.2rem', cursor: 'pointer', width: 36, height: 36, borderRadius: '50%', color: '#4B5563', fontWeight: 800 }}>✖</button>
             </div>
             
             <form onSubmit={handleListSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
               
               <div>
                  <h3 style={{ fontSize: '1.1rem', color: '#6C4BF6', marginBottom: 12, borderBottom: '2px solid #F3F0FF', paddingBottom: 6 }}>1. Basic Pet Information</h3>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                     <div style={{ flex: '1 1 45%' }}><label style={labelStyle}>Pet Name (optional)</label><input style={inputStyle} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Milo" /></div>
                     <div style={{ flex: '1 1 45%' }}><label style={labelStyle}>Species</label><select style={inputStyle} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>{inputTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                     <div style={{ flex: '1 1 45%' }}><label style={labelStyle}>Breed</label><input style={inputStyle} value={formData.breed} onChange={e => setFormData({...formData, breed: e.target.value})} placeholder="e.g. Labrador Retriever" /></div>
                     <div style={{ flex: '1 1 45%' }}><label style={labelStyle}>Gender</label><select style={inputStyle} value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}><option>Male</option><option>Female</option><option>Unknown</option></select></div>
                     <div style={{ flex: '1 1 100%' }}><label style={labelStyle}>Age (Puppy/Kitten, Adult, Senior OR exact age)</label><input style={inputStyle} value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} placeholder="e.g. Puppy or 3 months" /></div>
                  </div>
               </div>

               <div>
                  <h3 style={{ fontSize: '1.1rem', color: '#6C4BF6', marginBottom: 12, borderBottom: '2px solid #F3F0FF', paddingBottom: 6 }}>2. Location Details</h3>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                     <div style={{ flex: '1 1 45%' }}><label style={labelStyle}>City</label><input style={inputStyle} required value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} /></div>
                     <div style={{ flex: '1 1 45%' }}><label style={labelStyle}>Area / Locality</label><input style={inputStyle} value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} /></div>
                     <div style={{ flex: '1 1 45%' }}><label style={labelStyle}>Pin Code</label><input style={inputStyle} value={formData.pinCode} onChange={e => setFormData({...formData, pinCode: e.target.value})} /></div>
                     <div style={{ flex: '1 1 45%' }}><label style={labelStyle}>Exact Pickup Location (optional)</label><input style={inputStyle} value={formData.pickup} onChange={e => setFormData({...formData, pickup: e.target.value})} /></div>
                  </div>
               </div>

               <div>
                  <h3 style={{ fontSize: '1.1rem', color: '#6C4BF6', marginBottom: 12, borderBottom: '2px solid #F3F0FF', paddingBottom: 6 }}>3. Health & Medical Information</h3>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                     <div style={{ flex: '1 1 45%' }}><label style={labelStyle}>Vaccination Status</label><select style={inputStyle} value={formData.vac} onChange={e => setFormData({...formData, vac: e.target.value})}><option>Not Vaccinated</option><option>Partially</option><option>Fully Vaccinated</option><option>Not Known</option></select></div>
                     <div style={{ flex: '1 1 45%' }}><label style={labelStyle}>Sterilization Status</label><select style={inputStyle} value={formData.sterilized} onChange={e => setFormData({...formData, sterilized: e.target.value})}><option>Yes</option><option>No</option><option>Not Sure</option></select></div>
                     <div style={{ flex: '1 1 45%' }}><label style={labelStyle}>Any Medical Conditions (optional)</label><input style={inputStyle} value={formData.medical} onChange={e => setFormData({...formData, medical: e.target.value})} /></div>
                     <div style={{ flex: '1 1 45%' }}><label style={labelStyle}>Last Vet Visit (optional)</label><input style={inputStyle} value={formData.lastVet} onChange={e => setFormData({...formData, lastVet: e.target.value})} type="date" /></div>
                  </div>
               </div>

               <div>
                  <h3 style={{ fontSize: '1.1rem', color: '#6C4BF6', marginBottom: 12, borderBottom: '2px solid #F3F0FF', paddingBottom: 6 }}>4. Photos</h3>
                  <input type="file" multiple accept="image/*" onChange={handleFileChange} style={{ ...inputStyle, background: '#fff', cursor: 'pointer' }} />
                  {selectedFiles.length > 0 && <p style={{ fontSize: '0.8rem', color: '#10B981', margin: '6px 0 0', fontWeight: 800 }}>{selectedFiles.length} file(s) selected.</p>}
                  <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '4px 0 0' }}>Min 2 images recommended</p>
               </div>

               <div>
                  <h3 style={{ fontSize: '1.1rem', color: '#6C4BF6', marginBottom: 12, borderBottom: '2px solid #F3F0FF', paddingBottom: 6 }}>5. Behavior & Personality</h3>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                     <div style={{ flex: '1 1 45%' }}><label style={labelStyle}>Temperament</label><select style={inputStyle} value={formData.temperament} onChange={e => setFormData({...formData, temperament: e.target.value})}><option>Friendly</option><option>Shy</option><option>Aggressive</option><option>Playful</option></select></div>
                     <div style={{ flex: '1 1 45%' }}><label style={labelStyle}>Energy Level</label><select style={inputStyle} value={formData.energy} onChange={e => setFormData({...formData, energy: e.target.value})}><option>Low</option><option>Medium</option><option>High</option></select></div>
                     <div style={{ flex: '1 1 45%' }}><label style={labelStyle}>House-trained?</label><select style={inputStyle} value={formData.houseTrained} onChange={e => setFormData({...formData, houseTrained: e.target.value})}><option>Yes</option><option>No</option><option>Not Sure</option></select></div>
                  </div>
                  <div style={{ marginTop: 14, display: 'flex', gap: 20, fontSize: '0.9rem', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#374151' }}>Good With Kids: <select value={formData.goodKids} onChange={e => setFormData({...formData, goodKids: e.target.value})} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #D1D5DB' }}><option>Yes</option><option>No</option><option>Not Sure</option></select></label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#374151' }}>Dogs: <select value={formData.goodDogs} onChange={e => setFormData({...formData, goodDogs: e.target.value})} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #D1D5DB' }}><option>Yes</option><option>No</option><option>Not Sure</option></select></label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#374151' }}>Cats: <select value={formData.goodCats} onChange={e => setFormData({...formData, goodCats: e.target.value})} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #D1D5DB' }}><option>Yes</option><option>No</option><option>Not Sure</option></select></label>
                  </div>
               </div>

               <div>
                  <h3 style={{ fontSize: '1.1rem', color: '#6C4BF6', marginBottom: 12, borderBottom: '2px solid #F3F0FF', paddingBottom: 6 }}>6. Adoption Details</h3>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                     <div style={{ flex: '1 1 100%' }}><label style={labelStyle}>Reason for Adoption</label><select style={inputStyle} value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})}><option>Stray Rescue</option><option>Found Abandoned</option><option>Unable to Care</option><option value="">Other...</option></select></div>
                     <div style={{ flex: '1 1 45%' }}><label style={labelStyle}>Since when is the pet with you?</label><input style={inputStyle} value={formData.sinceWhen} onChange={e => setFormData({...formData, sinceWhen: e.target.value})} /></div>
                     <div style={{ flex: '1 1 45%' }}><label style={labelStyle}>Adoption Fee (Free / ₹ Amount)</label><input style={inputStyle} value={formData.fee} onChange={e => setFormData({...formData, fee: e.target.value})} placeholder="e.g. Free or ₹500" /></div>
                  </div>
               </div>

               <div>
                  <h3 style={{ fontSize: '1.1rem', color: '#6C4BF6', marginBottom: 12, borderBottom: '2px solid #F3F0FF', paddingBottom: 6 }}>7. Contact Information</h3>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                     <div style={{ flex: '1 1 45%' }}><label style={labelStyle}>Your Name</label><input style={inputStyle} required value={formData.listerName} onChange={e => setFormData({...formData, listerName: e.target.value})} /></div>
                     <div style={{ flex: '1 1 45%' }}><label style={labelStyle}>Phone Number (required)</label><input style={inputStyle} required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                     <div style={{ flex: '1 1 45%' }}><label style={labelStyle}>WhatsApp Number (optional)</label><input style={inputStyle} type="tel" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} /></div>
                     <div style={{ flex: '1 1 45%' }}><label style={labelStyle}>Email ID</label><input style={inputStyle} type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                     <div style={{ flex: '1 1 100%' }}><label style={labelStyle}>Preferred Contact Method</label><select style={inputStyle} value={formData.contactMethod} onChange={e => setFormData({...formData, contactMethod: e.target.value})}><option>Call</option><option>WhatsApp</option><option>Email</option></select></div>
                  </div>
               </div>

               <div>
                  <h3 style={{ fontSize: '1.1rem', color: '#6C4BF6', marginBottom: 12, borderBottom: '2px solid #F3F0FF', paddingBottom: 6 }}>8. Verification & Consent</h3>
                  <div style={{ fontSize: '0.95rem', color: '#374151', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: '#F9FAFB', padding: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}>
                      <input type="checkbox" checked={formData.illegalConsent} onChange={e => setFormData({...formData, illegalConsent: e.target.checked})} style={{ width: 18, height: 18 }} /> I confirm this pet is not being sold illegally
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: '#F9FAFB', padding: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}>
                      <input type="checkbox" checked={formData.adoptionConsent} onChange={e => setFormData({...formData, adoptionConsent: e.target.checked})} style={{ width: 18, height: 18 }} /> I agree to responsible adoption practices
                    </label>
                  </div>
               </div>

               <div>
                  <h3 style={{ fontSize: '1.1rem', color: '#6C4BF6', marginBottom: 12, borderBottom: '2px solid #F3F0FF', paddingBottom: 6 }}>9. Optional Details</h3>
                  <div style={{ flex: '1 1 100%' }}>
                     <label style={labelStyle}>Urgency Level <span style={{ color: '#FF4757', fontWeight: 800 }}>⚡</span></label>
                     <select style={inputStyle} value={formData.urgency} onChange={e => setFormData({...formData, urgency: e.target.value})}>
                        <option>Normal</option>
                        <option>Urgent</option>
                        <option>Emergency</option>
                     </select>
                  </div>
               </div>

               <button type="submit" disabled={uploading} className="btn-primary" style={{ padding: 16, fontSize: '1.1rem', marginTop: 14, opacity: uploading ? 0.7 : 1 }}>
                 {uploading ? '⏳ Uploading...' : '✅ SUBMIT LISTING'}
               </button>
             </form>
           </div>
        </div>
      )}

      {toast && <div style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', background: '#1E1347', color: '#fff', padding: '12px 24px', borderRadius: 30, fontWeight: 700, fontSize: '0.9rem', zIndex: 3000, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>{toast}</div>}
    </div>
  )
}

// Issue 2.2: Enable SSR for public page so Googlebot can read meta tags
export async function getServerSideProps() {
  return {
    props: {},
  }
}
