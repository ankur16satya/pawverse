import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import NavBar from '../../components/NavBar'
import SEO from '../../components/SEO'
import { ArrowLeft, Clock, Calendar, User, Share2, Heart } from 'lucide-react'

export default function BlogPost() {
  const router = useRouter()
  const { slug } = router.query
  const [blog, setBlog] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (slug) fetchBlog()
  }, [slug])

  const fetchBlog = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('blogs')
      .select('*')
      .eq('slug', slug)
      .single()
    
    if (error) {
      console.error(error)
      // router.push('/blogs')
    } else {
      setBlog(data)
    }
    setLoading(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#FFFBF7' }}>
      <div style={{ animation: 'pulse 1.2s infinite', fontSize: '3rem' }}>🐾</div>
    </div>
  )

  if (!blog) return (
    <div style={{ textAlign: 'center', padding: '100px 20px', background: '#FFFBF7', minHeight: '100vh' }}>
      <h2 style={{ fontFamily: "Baloo 2", fontSize: '2rem' }}>Story not found</h2>
      <button onClick={() => router.push('/blogs')} className="btn-primary" style={{ marginTop: 20 }}>Back to Blogs</button>
    </div>
  )

  return (
    <div style={{ background: '#fff', minHeight: '100vh', paddingBottom: 100 }}>
      <SEO 
        title={`${blog.title} | PawVerse Blog`}
        description={blog.excerpt}
        image={blog.image_url}
        article={true}
      />
      <NavBar />

      {/* Hero Header */}
      <div style={{ position: 'relative', height: '60vh', minHeight: 400, background: '#1E1347', overflow: 'hidden' }}>
        <img 
          src={blog.image_url || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=1200'} 
          alt={blog.title} 
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }}
        />
        <div style={{ 
          position: 'absolute', inset: 0, 
          background: 'linear-gradient(to bottom, rgba(30,19,71,0.2) 0%, rgba(30,19,71,0.95) 100%)',
          display: 'flex', alignItems: 'flex-end', paddingBottom: 60
        }}>
          <div style={{ maxWidth: 850, margin: '0 auto', width: '100%', padding: '0 20px', animation: 'slideUp 0.8s ease' }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
               <span style={{ background: '#6C4BF6', color: '#fff', padding: '6px 16px', borderRadius: 25, fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase' }}>{blog.category}</span>
            </div>
            <h1 style={{ fontFamily: "'Baloo 2', cursive", fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#fff', margin: '0 0 20px', lineHeight: 1.1 }}>{blog.title}</h1>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', fontWeight: 700 }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                 <img src={blog.author_avatar || '/logo.png'} style={{ width: 35, height: 35, borderRadius: '50%', border: '2px solid #fff' }} />
                 <span style={{ color: '#fff' }}>{blog.author_name || 'Admin'}</span>
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={18} /> {new Date(blog.created_at).toLocaleDateString()}</div>
               <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={18} /> 5 min read</div>
            </div>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <div style={{ maxWidth: 850, margin: '0 auto', padding: '60px 20px', position: 'relative' }}>
         {/* Sidebar Actions (Floating on desktop) */}
         <div style={{ position: 'absolute', left: -80, top: 70, display: 'flex', flexDirection: 'column', gap: 15 }} className="mobile-hide">
             <button style={{ width: 45, height: 45, borderRadius: '50%', background: '#fff', border: '1.5px solid #EDE8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B7280' }}><Heart size={20} /></button>
             <button style={{ width: 45, height: 45, borderRadius: '50%', background: '#fff', border: '1.5px solid #EDE8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B7280' }}><Share2 size={20} /></button>
         </div>

         <div 
           className="blog-content"
           dangerouslySetInnerHTML={{ __html: blog.content }}
           style={{ 
             fontSize: '1.15rem', lineHeight: 1.8, color: '#374151', fontFamily: 'Nunito, sans-serif'
           }} 
         />

         {/* Author Bio Section */}
         <div style={{ marginTop: 80, padding: 40, background: '#F9FAFB', borderRadius: 24, border: '1.5px solid #EDE8FF', display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            <img src={blog.author_avatar || '/logo.png'} style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '4px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
            <div style={{ flex: 1, minWidth: 250 }}>
               <h4 style={{ fontFamily: "Baloo 2", fontSize: '1.4rem', color: '#1E1347', margin: '0 0 8px' }}>Written by {blog.author_name || 'Admin'}</h4>
               <p style={{ color: '#6B7280', fontSize: '0.95rem', margin: '0 0 15px', lineHeight: 1.6 }}>
                 Passionate about building the ultimate digital universe for pets. Sharing insights to help you and your fur family live your best life together.
               </p>
               <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn-secondary" style={{ padding: '6px 16px', fontSize: '0.8rem' }} onClick={() => router.push('/blogs')}>More from {blog.author_name || 'Admin'}</button>
               </div>
            </div>
         </div>

         <div style={{ textAlign: 'center', marginTop: 60 }}>
            <button onClick={() => router.push('/blogs')} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', color: '#6C4BF6', fontWeight: 800, cursor: 'pointer', fontSize: '1.1rem' }}>
               <ArrowLeft size={20} /> Back to all stories
            </button>
         </div>
      </div>

      <style jsx global>{`
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        .blog-content h2, .blog-content h3 { fontFamily: 'Baloo 2', cursive; color: #1E1347; margin-top: 40px; margin-bottom: 20px; }
        .blog-content p { margin-bottom: 25px; }
        .blog-content img { width: 100%; border-radius: 20px; margin: 30px 0; }
        .blog-content blockquote { border-left: 5px solid #6C4BF6; padding-left: 24px; font-style: italic; color: #6C4BF6; margin: 40px 0; font-size: 1.4rem; }
        
        @media (max-width: 900px) {
          .mobile-hide { display: none !important; }
        }
      `}</style>
    </div>
  )
}
