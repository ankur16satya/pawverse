// File: src/pages/superadmin.js
import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'
import { uploadToCloudinary } from '../lib/cloudinary'
import dynamic from 'next/dynamic'
import 'react-quill/dist/quill.snow.css'
import 'quill-image-uploader/dist/quill.imageUploader.min.css'

const QuillWrapper = dynamic(async () => {
  const { default: RQ } = await import('react-quill');
  
  try {
    const { default: ImageUploader } = await import('quill-image-uploader');
    // ReactQuill exposes the Quill core class via RQ.Quill
    if (RQ.Quill) {
      RQ.Quill.register('modules/imageUploader', ImageUploader);
    }
  } catch (e) {
    console.error("Failed to load quill-image-uploader", e);
  }
  
  return function Editor(props) {
    return <RQ {...props} />;
  }
}, { ssr: false, loading: () => <div style={{padding: 20, textAlign: 'center', color: '#6C4BF6', fontWeight: 800}}>Loading Editor...</div> });

// ⚠️ List all authorized super admin emails here:
const SUPER_ADMINS = ['ankur16satya@gmail.com', 'sharmasiddharth269@gmail.com']

export default function SuperAdmin() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [doctors, setDoctors] = useState([])
  const [appointments, setAppointments] = useState([])
  const [allPets, setAllPets] = useState([])
  const [listings, setListings] = useState([])
  const [activeTab, setActiveTab] = useState('analytics')
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [adminPassInput, setAdminPassInput] = useState('')
  const [passError, setPassError] = useState('')
  
  // Blog State
  const [blogs, setBlogs] = useState([])
  const [showBlogForm, setShowBlogForm] = useState(false)
  const [blogSaving, setBlogSaving] = useState(false)
  const [blogImageUploading, setBlogImageUploading] = useState(false)
  const [editingBlog, setEditingBlog] = useState(null)
  const [blogForm, setBlogForm] = useState({
    title: '', slug: '', excerpt: '', content: '', image_url: '', category: 'General'
  })

  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}],
      ['link', 'image'],
      ['clean']
    ],
    imageUploader: {
      upload: (file) => {
        return new Promise((resolve, reject) => {
          uploadToCloudinary(file, 'blogs')
            .then(url => resolve(url))
            .catch(err => {
              console.error("Upload failed", err);
              reject("Upload failed");
            });
        });
      }
    }
  }), [])

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

    // Fetch Analytics Data
    const { data: pets } = await supabase.from('pets').select('*')
    const { data: listData } = await supabase.from('listings').select('*, pets(owner_name, avatar_url, role)')
    const { data: appts } = await supabase.from('appointments').select('*, listings(name, price), pets(owner_name)').order('created_at', { ascending: false })

    setAllPets(pets || [])
    setListings(listData || [])
    setAppointments(appts || [])
    setDoctors((listData || []).filter(l => l.is_service && l.brand === 'Doctor'))
    
    // Fetch Blogs
    const { data: blogData } = await supabase.from('blogs').select('*').order('created_at', { ascending: false })
    setBlogs(blogData || [])
    
    setLoading(false)
  }

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    if (adminPassInput === 'Ankur@1990') {
      setIsAdminAuthenticated(true)
      setPassError('')
    } else {
      setPassError('❌ Incorrect Admin Password!')
    }
  }

  const roleCounts = {
    total: allPets.length,
    user: allPets.filter(p => !p.role || p.role === 'user').length,
    vet: allPets.filter(p => p.role === 'vet').length,
    supplier: allPets.filter(p => p.role === 'supplier').length,
  }

  const verifyPayment = async (id) => {
    if (!confirm('Have you confirmed this UTR payment in your bank app?')) return
    const { error } = await supabase.from('appointments').update({ payment_status: 'verified' }).eq('id', id)
    if (!error) {
       setAppointments(prev => prev.map(a => a.id === id ? { ...a, payment_status: 'verified' } : a))
       alert('✅ Payment marked as Verified!')
    }
  }

  const handleBlogSubmit = async (e) => {
    e.preventDefault()
    setBlogSaving(true)
    try {
      const slug = blogForm.slug || blogForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      const dataToSave = { ...blogForm, slug, author_name: 'Admin', author_avatar: '/logo.png' }
      
      let res;
      if (editingBlog) {
        res = await supabase.from('blogs').update(dataToSave).eq('id', editingBlog.id)
      } else {
        res = await supabase.from('blogs').insert(dataToSave)
      }

      if (res.error) throw res.error
      
      alert(`Blog ${editingBlog ? 'updated' : 'created'} successfully!`)
      setShowBlogForm(false)
      setEditingBlog(null)
      setBlogForm({ title: '', slug: '', excerpt: '', content: '', image_url: '', category: 'General' })
      init() // Refresh data
    } catch (err) {
      alert(err.message)
    } finally {
      setBlogSaving(false)
    }
  }

  const deleteBlog = async (id) => {
    if (!confirm('Are you sure you want to delete this blog?')) return
    const { error } = await supabase.from('blogs').delete().eq('id', id)
    if (!error) {
      setBlogs(prev => prev.filter(b => b.id !== id))
    }
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '2rem' }}>🐾</div>

  return (
    <div style={{ background: '#FFFBF7', minHeight: '100vh', position: 'relative' }}>
      
      {/* 🔐 PASSWORD OVERLAY */}
      {!isAdminAuthenticated && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', padding: 40, borderRadius: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: 400, textAlign: 'center', border: '1.5px solid #EDE8FF' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 15 }}>👑</div>
            <h2 style={{ fontFamily: "Baloo 2", fontSize: '1.8rem', color: '#1E1347', marginBottom: 8 }}>Restricted Access</h2>
            <p style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: 25 }}>Please enter the Super Admin Key to manage PawVerse ecosystem.</p>
            
            <form onSubmit={handlePasswordSubmit}>
              <input 
                type="password" 
                className="input" 
                placeholder="Enter Admin Password..." 
                value={adminPassInput} 
                onChange={e => setAdminPassInput(e.target.value)}
                autoFocus
                style={{ textAlign: 'center', fontSize: '1.1rem', letterSpacing: '4px', padding: 14, marginBottom: 12 }}
              />
              {passError && <div style={{ color: '#FF4757', fontWeight: 800, fontSize: '0.82rem', marginBottom: 15 }}>{passError}</div>}
              
              <button className="btn-primary" style={{ width: '100%', padding: '14px', borderRadius: 14, fontSize: '1rem' }}>
                Verify Key →
              </button>
            </form>
          </div>
        </div>
      )}

      <NavBar user={user} />

      <div style={{ maxWidth: 1100, margin: '80px auto', padding: 20 }}>
        
        <div style={{ background: 'linear-gradient(135deg, #1E1347, #6C4BF6)', borderRadius: 16, padding: '30px', color: '#fff', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 30px rgba(108, 75, 246, 0.2)' }}>
           <div>
             <h1 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '2.5rem', margin: '0 0 5px' }}>👑 Admin Center</h1>
             <p style={{ margin: 0, opacity: 0.8, fontSize: '0.9rem' }}>Comprehensive monitoring of PawVerse Roles, Services & Products.</p>
           </div>
           <div style={{ display: 'flex', gap: 15, textAlign: 'center' }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px 18px', borderRadius: 12 }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{allPets.length}</div>
                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.8 }}>Total Users</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px 18px', borderRadius: 12 }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{roleCounts.vet}</div>
                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.8 }}>Vets</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px 18px', borderRadius: 12 }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{roleCounts.supplier}</div>
                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.8 }}>Suppliers</div>
              </div>
           </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { id: 'analytics', label: '📊 Dashboard', color: '#FF6B35' },
            { id: 'doctors', label: '🩺 Vet Services', color: '#6C4BF6' },
            { id: 'suppliers', label: '📦 Marketplace', color: '#22C55E' },
            { id: 'blogs', label: '📝 Blogs', color: '#0EA5E9' },
            { id: 'payments', label: '💰 UTR Verify', color: '#FF4757' },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} 
              style={{ flex: 1, minWidth: 150, padding: '14px', border: 'none', borderRadius: 12, background: activeTab === t.id ? t.color : '#fff', color: activeTab === t.id ? '#fff' : '#6B7280', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Analytics View */}
        {activeTab === 'analytics' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
            {/* Simple Users */}
            <div className="card" style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🐾</div>
              <h3 style={{ fontFamily: "Baloo 2", fontSize: '1.4rem', color: '#1E1347', margin: 0 }}>Pet Parents</h3>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#FF6B35' }}>{roleCounts.user}</div>
              <p style={{ fontSize: '0.82rem', color: '#6B7280' }}>Daily users browsing feed & reels</p>
            </div>
            {/* Vets */}
            <div className="card" style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🩺</div>
              <h3 style={{ fontFamily: "Baloo 2", fontSize: '1.4rem', color: '#1E1347', margin: 0 }}>Verified Vets</h3>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#6C4BF6' }}>{roleCounts.vet}</div>
              <p style={{ fontSize: '0.82rem', color: '#6B7280' }}>Medical experts providing services</p>
            </div>
            {/* Suppliers */}
            <div className="card" style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📦</div>
              <h3 style={{ fontFamily: "Baloo 2", fontSize: '1.4rem', color: '#1E1347', margin: 0 }}>Suppliers</h3>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#22C55E' }}>{roleCounts.supplier}</div>
              <p style={{ fontSize: '0.82rem', color: '#6B7280' }}>Verified marketplace product sellers</p>
            </div>

            {/* Price Watch */}
            <div className="card" style={{ gridColumn: 'span 3', padding: 24 }}>
               <h3 style={{ fontFamily: "Baloo 2", color: '#1E1347', marginBottom: 16 }}>💰 Marketplace Listings (Latest Activity)</h3>
               <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                 <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                   <thead>
                     <tr style={{ color: '#9CA3AF', fontSize: '0.75rem', borderBottom: '1.5px solid #F3F0FF' }}>
                       <th style={{ padding: '8px 0' }}>PRODUCT/SERVICE</th>
                       <th>SELLER TYPE</th>
                       <th>SELLER NAME</th>
                       <th>PRICE</th>
                     </tr>
                   </thead>
                   <tbody>
                     {listings.slice(0, 10).map(l => (
                       <tr key={l.id} style={{ borderBottom: '1px solid #F3F0FF', fontSize: '0.85rem' }}>
                         <td style={{ padding: '12px 0', fontWeight: 700, color: '#1E1347' }}>{l.name}</td>
                         <td>
                           <span style={{ fontSize: '0.65rem', padding: '3px 8px', borderRadius: 20, background: l.pets?.role === 'vet' ? '#F3F0FF' : '#E8F8E8', color: l.pets?.role === 'vet' ? '#6C4BF6' : '#22C55E', fontWeight: 800 }}>
                             {l.pets?.role?.toUpperCase() || 'USER'}
                           </span>
                         </td>
                         <td style={{ color: '#6B7280' }}>{l.pets?.owner_name}</td>
                         <td style={{ fontWeight: 800, color: '#FF6B35' }}>₹{l.price}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {/* Suppliers View */}
        {activeTab === 'suppliers' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {listings.filter(l => l.pets?.role === 'supplier' || (!l.is_service && l.pets?.role !== 'vet')).map(prod => (
              <div key={prod.id} className="card" style={{ padding: 16 }}>
                 <img src={prod.image_url} style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }} />
                 <div style={{ fontWeight: 800, color: '#1E1347', fontSize: '0.95rem' }}>{prod.name}</div>
                 <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: 8 }}>Seller: {prod.pets?.owner_name}</div>
                 <div style={{ fontSize: '1rem', fontWeight: 900, color: '#22C55E' }}>₹{prod.price}</div>
                 <div style={{ marginTop: 10, fontSize: '0.65rem', color: '#9CA3AF' }}>Listing ID: {prod.id}</div>
              </div>
            ))}
          </div>
        )}

        {/* Doctors View */}
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

        {/* 📝 Blogs View */}
        {activeTab === 'blogs' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: "Baloo 2", fontSize: '1.5rem', color: '#1E1347', margin: 0 }}>All Blog Articles</h3>
              <button 
                onClick={() => { setEditingBlog(null); setBlogForm({ title: '', slug: '', excerpt: '', content: '', image_url: '', category: 'General' }); setShowBlogForm(true); }}
                className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.9rem' }}>
                + Write New Blog
              </button>
            </div>

            <div style={{ background: '#fff', borderRadius: 20, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1.5px solid #EDE8FF' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ color: '#9CA3AF', fontSize: '0.75rem', borderBottom: '1.5px solid #F3F0FF' }}>
                    <th style={{ padding: '12px 0' }}>BLOG TITLE</th>
                    <th>CATEGORY</th>
                    <th>PUBLISHED ON</th>
                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {blogs.length === 0 && (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>No blogs found. Start writing! ✍️</td></tr>
                  )}
                  {blogs.map(b => (
                    <tr key={b.id} style={{ borderBottom: '1px solid #F3F0FF', fontSize: '0.88rem' }}>
                      <td style={{ padding: '14px 0', fontWeight: 700, color: '#1E1347' }}>{b.title}</td>
                      <td>
                        <span style={{ fontSize: '0.7rem', padding: '3px 9px', borderRadius: 20, background: '#F0F9FF', color: '#0EA5E9', fontWeight: 800 }}>
                          {b.category.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ color: '#6B7280' }}>{new Date(b.created_at).toLocaleDateString()}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          onClick={() => { setEditingBlog(b); setBlogForm(b); setShowBlogForm(true); }}
                          style={{ background: 'none', border: 'none', color: '#6C4BF6', fontWeight: 800, cursor: 'pointer', marginRight: 15 }}>Edit</button>
                        <button 
                          onClick={() => deleteBlog(b.id)}
                          style={{ background: 'none', border: 'none', color: '#FF4757', fontWeight: 800, cursor: 'pointer' }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ✍️ Blog Editor Modal */}
        {showBlogForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11000, padding: 20 }}>
            <div style={{ background: '#fff', borderRadius: 24, padding: 32, width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontFamily: "Baloo 2", fontSize: '1.8rem', color: '#1E1347', margin: 0 }}>{editingBlog ? '📝 Edit Article' : '✍️ Write New Article'}</h2>
                <button onClick={() => setShowBlogForm(false)} style={{ background: '#F3F4F6', border: 'none', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', fontWeight: 800 }}>✕</button>
              </div>

              <form onSubmit={handleBlogSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#374151', display: 'block', marginBottom: 6 }}>Blog Title</label>
                    <input className="input" required value={blogForm.title} onChange={e => setBlogForm({...blogForm, title: e.target.value})} placeholder="e.g. 5 Tips for Puppy Training" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#374151', display: 'block', marginBottom: 6 }}>Category</label>
                    <select className="input" value={blogForm.category} onChange={e => setBlogForm({...blogForm, category: e.target.value})}>
                      <option>Health</option>
                      <option>Training</option>
                      <option>Food</option>
                      <option>Fun</option>
                      <option>General</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#374151', display: 'block', marginBottom: 6 }}>Cover Image</label>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <input type="file" accept="image/*" onChange={async (e) => {
                      if (e.target.files?.[0]) {
                        setBlogImageUploading(true)
                        try {
                          const url = await uploadToCloudinary(e.target.files[0], 'blogs')
                          setBlogForm({...blogForm, image_url: url})
                        } catch (err) {
                          alert('Image upload failed: ' + err.message)
                        } finally {
                          setBlogImageUploading(false)
                        }
                      }
                    }} style={{ fontSize: '0.8rem' }} />
                    {blogImageUploading ? <span style={{ fontSize: '0.85rem', color: '#6C4BF6', fontWeight: 800 }}>Uploading...</span> : (blogForm.image_url && <img src={blogForm.image_url} style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 4, border: '1.5px solid #EDE8FF' }} />)}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#374151', display: 'block', marginBottom: 6 }}>Short Excerpt (SEO Description)</label>
                  <textarea className="input" rows="2" required value={blogForm.excerpt} onChange={e => setBlogForm({...blogForm, excerpt: e.target.value})} placeholder="Brief summary for social media and search engines..." />
                </div>

                <div style={{ paddingBottom: '40px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#374151', display: 'block', marginBottom: 6 }}>Article Content</label>
                  <QuillWrapper 
                    theme="snow" 
                    modules={modules}
                    value={blogForm.content} 
                    onChange={content => setBlogForm({...blogForm, content})} 
                    style={{ height: '350px', background: '#fff' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                  <button type="button" onClick={() => setShowBlogForm(false)} style={{ flex: 1, padding: 14, borderRadius: 14, border: '2px solid #EDE8FF', background: 'transparent', fontWeight: 800 }}>Cancel</button>
                  <button disabled={blogSaving || blogImageUploading} className="btn-primary" style={{ flex: 2, padding: 14, borderRadius: 14, fontSize: '1rem', opacity: (blogSaving || blogImageUploading) ? 0.6 : 1 }}>
                    {blogSaving ? '⏳ Saving...' : '🚀 Publish Article'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
