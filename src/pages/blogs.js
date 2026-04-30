import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'
import SEO from '../components/SEO'

export default function Blogs() {
  const router = useRouter()
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const categories = ['All', 'Health', 'Training', 'Food', 'Fun', 'General']

  useEffect(() => {
    fetchBlogs()
  }, [])

  const fetchBlogs = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('blogs').select('*').order('created_at', { ascending: false })
    if (!error) setBlogs(data || [])
    setLoading(false)
  }

  const filteredBlogs = filter === 'All' ? blogs : blogs.filter(b => b.category === filter)

  return (
    <div style={{ background: '#FFFBF7', minHeight: '100vh', paddingBottom: 60 }}>
      <SEO 
        title="Pet Health & Care Blog India | Expert Vet Advice"
        description="Expert pet health tips, dog & cat care guides, vaccination schedules, and heartwarming rescue stories. Written by veterinary professionals for pet parents in India."
        keywords="pet health tips India, dog care guide, cat care India, dog vaccination schedule India, best vet advice, pet nutrition India, PawVerse blog"
      />
      <NavBar />
      
      <div style={{ maxWidth: 1100, margin: '80px auto 0', padding: '20px 14px' }}>
        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: 40, animation: 'fadeIn 0.6s ease' }}>
          <h1 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '2.8rem', color: '#1E1347', marginBottom: 10 }}>📖 PawVerse Stories</h1>
          <p style={{ color: '#6B7280', fontSize: '1.05rem', maxWidth: 600, margin: '0 auto 24px' }}>
            Expert advice, heartwarming stories, and essential tips for every pet parent. Connect deeper with your fur family.
          </p>
          
          {/* Category Pills */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button 
                key={cat} 
                onClick={() => setFilter(cat)}
                style={{
                  padding: '8px 20px', borderRadius: 25, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem',
                  background: filter === cat ? '#6C4BF6' : '#fff',
                  color: filter === cat ? '#fff' : '#6B7280',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  transition: 'all 0.2s'
                }}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '3rem', animation: 'pulse 1s infinite' }}>🐾</div>
            <p style={{ color: '#6B7280', fontWeight: 700 }}>Fetching latest stories...</p>
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 24, border: '1.5px dashed #EDE8FF' }}>
             <div style={{ fontSize: '3rem', marginBottom: 15 }}>✍️</div>
             <h3 style={{ fontFamily: "Baloo 2", fontSize: '1.4rem', color: '#1E1347' }}>No stories in this category yet</h3>
             <p style={{ color: '#6B7280' }}>Check back later or explore other categories!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
            {filteredBlogs.map((blog, idx) => (
              <div 
                key={blog.id} 
                onClick={() => router.push(`/blog/${blog.slug}`)}
                style={{
                  background: '#fff', borderRadius: 22, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.3s, boxShadow 0.3s',
                  boxShadow: '0 4px 20px rgba(108,75,246,0.08)', border: '1.5px solid #F3F0FF',
                  animation: `slideUp 0.5s ease forwards ${idx * 0.1}s`, opacity: 0
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(108,75,246,0.15)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(108,75,246,0.08)' }}>
                
                <div style={{ height: 200, position: 'relative', background: '#1E1347', overflow: 'hidden' }}>
                  <img src={blog.image_url || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=800'} alt={blog.title} style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'relative', zIndex: 1 }} />
                  <div style={{ position: 'absolute', inset: '-10px', background: `url(${blog.image_url || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=800'}) center/cover`, filter: 'blur(15px)', opacity: 0.4 }} />
                  <div style={{ position: 'absolute', top: 15, left: 15, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)', padding: '5px 12px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 900, color: '#6C4BF6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {blog.category}
                  </div>
                </div>
                
                <div style={{ padding: 22 }}>
                  <div style={{ color: '#9CA3AF', fontSize: '0.75rem', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                    📅 {new Date(blog.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <h2 style={{ fontFamily: "Baloo 2", fontSize: '1.3rem', color: '#1E1347', marginBottom: 12, lineHeight: 1.3 }}>{blog.title}</h2>
                  <p style={{ color: '#6B7280', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: 20, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {blog.excerpt}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F3F0FF', paddingTop: 15 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                       <img src={blog.author_avatar || '/logo.png'} style={{ width: 28, height: 28, borderRadius: '50%' }} />
                       <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#374151' }}>{blog.author_name || 'Admin'}</span>
                    </div>
                    <span style={{ color: '#6C4BF6', fontSize: '0.85rem', fontWeight: 800 }}>Read More →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes pulse { 0% { transform: scale(1) } 50% { transform: scale(1.1) } 100% { transform: scale(1) } }
      `}</style>
    </div>
  )
}


// Issue 2.2: SSR for blog index so Google can index it
export async function getServerSideProps() {
  return { props: {} }
}
