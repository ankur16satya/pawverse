// PUBLIC HOMEPAGE — Server-side rendered for SEO
// Anonymous visitors see the public feed (browse only).
// Logged-in users see their personalised feed (same as /feed).
// Any interaction (like, comment, post, profile, marketplace, etc.) requires login.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import SEO from '../components/SEO'

const PAWS = Array.from({ length: 14 }, (_, i) => i)

/**
 * SSR: fetch the latest public posts so Google/Bing see real content in the HTML.
 * Uses anon key — only posts visible to anonymous users will be returned
 * (Supabase RLS policies must allow public SELECT on posts/pets for this to work).
 */
export async function getServerSideProps({ res }) {
  // Cache for 5 minutes at the edge, refresh in background
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  let initialPosts = []
  let totalPets = 0
  let totalPosts = 0

  try {
    const sb = createClient(url, key, { auth: { persistSession: false } })

    // Use the SAME select pattern as feed.js (which works) — `*` plus embedded pets.
    // `!inner` forces an INNER JOIN so we only get posts whose pet still exists.
    const { data: posts, error: postsErr } = await sb
      .from('posts')
      .select('*, pets!inner(pet_name, emoji, pet_breed, owner_name, avatar_url, user_id, is_health_pet, role)')
      .eq('hidden', false)
      .eq('pets.is_health_pet', false)  // filter through the join — exclude private health pet posts
      .order('created_at', { ascending: false })
      .limit(20)

    if (postsErr) console.error('SSR posts query error:', JSON.stringify(postsErr))

    initialPosts = posts || []

    // Stats for social proof
    const [petsCount, postsCount] = await Promise.all([
      sb.from('pets').select('id', { count: 'exact', head: true }).eq('is_health_pet', false),
      sb.from('posts').select('id', { count: 'exact', head: true }).eq('hidden', false),
    ])
    totalPets = petsCount.count || 0
    totalPosts = postsCount.count || 0
  } catch (e) {
    // Fail soft — client-side fallback below will retry the fetch
    console.error('SSR fetch failed:', e?.message)
  }

  return {
    props: {
      initialPosts: JSON.parse(JSON.stringify(initialPosts)),
      totalPets,
      totalPosts,
      year: new Date().getFullYear(),
    }
  }
}

export default function Home({ initialPosts, totalPets, totalPosts, year }) {
  const router = useRouter()
  const [posts, setPosts] = useState(initialPosts)

  // If user is logged in, redirect them to the interactive feed.
  // This runs CLIENT-SIDE ONLY (useEffect doesn't run during SSR),
  // so it doesn't affect the server-rendered HTML and won't trigger a hydration mismatch.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/feed')
    })
  }, [])

  // Client-side fallback: if SSR returned 0 posts, try fetching again from the browser.
  // This catches edge cases where the server-side fetch failed (env var missing, network blip, etc.)
  // and uses the exact same query pattern as the /feed page which is known to work.
  useEffect(() => {
    if (initialPosts.length > 0) return // SSR worked, no need
    let cancelled = false
    supabase
      .from('posts')
      .select('*, pets!inner(pet_name, emoji, pet_breed, owner_name, avatar_url, user_id, is_health_pet, role)')
      .eq('hidden', false)
      .eq('pets.is_health_pet', false)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('Client-side posts fetch error:', error)
          return
        }
        if (data && data.length > 0) setPosts(data)
      })
    return () => { cancelled = true }
  }, [])

  // Action that requires login → push to /login with return URL
  const requireLogin = (returnPath = '/feed') => {
    router.push(`/login?next=${encodeURIComponent(returnPath)}`)
  }

  // ItemList JSON-LD so Google can understand the post collection
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": posts.slice(0, 10).map((p, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "url": `https://pawversesocial.com/post/${p.id}`,
      "name": (p.content || `Post by ${p.pets?.pet_name || 'a pet'}`).slice(0, 100)
    }))
  }

  return (
    <div className="public-home" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FFF0E8 0%, #F0EBFF 50%, #E8F8FF 100%)' }}>
      <SEO 
        title="PawVerse — India's Pet Social Network | Adopt, Shop & Connect"
        description="Join PawVerse — India's all-in-one pet community. Adopt dogs & cats near you, shop the pet marketplace, track health records & connect with Dehradun's pet parents."
        keywords="pet social network India, pet adoption India, adopt dog Dehradun, adopt cat India, pet marketplace India, pet health tracker, PawVerse"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />

      {/* === HEADER (sticky, prominent, with both Sign In + Join) === */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: '#fff', borderBottom: '2px solid #F0EBFF', boxShadow: '0 2px 8px rgba(108,75,246,0.06)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
            <span style={{ fontSize: '1.6rem' }}>🐾</span>
            <span style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.4rem', background: 'linear-gradient(135deg, #FF6B35, #6C4BF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PawVerse</span>
          </Link>
          <nav style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Link href="/adopt" style={navLinkStyle} className="nav-hide-mobile">Adopt</Link>
            <Link href="/marketplace" style={navLinkStyle} className="nav-hide-mobile">Marketplace</Link>
            <Link href="/blogs" style={navLinkStyle} className="nav-hide-mobile">Blog</Link>
            <Link href="/login" style={{ color: '#6C4BF6', fontWeight: 800, fontSize: '0.95rem', textDecoration: 'none', padding: '8px 14px', borderRadius: 50, border: '2px solid #6C4BF6', marginLeft: 4 }}>Sign In</Link>
            <Link href="/login" style={{ background: 'linear-gradient(135deg, #FF6B35, #6C4BF6)', color: '#fff', fontWeight: 800, fontSize: '0.95rem', padding: '10px 18px', borderRadius: 50, textDecoration: 'none', boxShadow: '0 2px 8px rgba(255,107,53,0.3)' }}>Join Free</Link>
          </nav>
        </div>
      </header>

      {/* === COMPACT HERO === */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 16px', textAlign: 'center', position: 'relative' }}>
        {PAWS.map(i => (
          <span key={i} className="paw-float" aria-hidden="true" style={{ position: 'absolute', left: `${(i * 7.2) % 100}%`, top: `${(i * 13) % 80}%`, animationDuration: `${9 + (i % 5) * 1.8}s`, animationDelay: `${(i * 0.6) % 7}s`, fontSize: `${1 + (i % 3) * 0.4}rem`, opacity: 0.1, pointerEvents: 'none' }}>🐾</span>
        ))}
        <h1 style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', background: 'linear-gradient(135deg, #FF6B35, #6C4BF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8, lineHeight: 1.15 }}>
          India's Pet Social Network — Adopt, Shop &amp; Connect
        </h1>
        <p style={{ color: '#4B5563', fontWeight: 500, fontSize: '0.98rem', maxWidth: 640, margin: '0 auto 10px', lineHeight: 1.5 }}>
          Join thousands of pet parents across India. Adopt dogs &amp; cats, shop the pet marketplace, track vaccinations, and connect with your local pet community.
        </p>
        <p style={{ color: '#6B7280', fontSize: '0.88rem', marginBottom: 14 }}>
          {totalPets > 0 && <><strong>{totalPets.toLocaleString('en-IN')}+</strong> pet profiles &nbsp;·&nbsp; </>}
          {totalPosts > 0 && <><strong>{totalPosts.toLocaleString('en-IN')}+</strong> stories shared &nbsp;·&nbsp; </>}
          Free forever 🐾
        </p>
      </section>

      {/* === PUBLIC FEED — appears immediately, no scrolling needed === */}
      <section id="feed" style={{ maxWidth: 680, margin: '0 auto', padding: '8px 16px 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.4rem', color: '#1E1347', margin: 0 }}>📸 Community Feed</h2>
          <span style={{ color: '#6B7280', fontSize: '0.82rem' }}>
            <Link href="/login" style={{ color: '#FF6B35', fontWeight: 700, textDecoration: 'none' }}>Join free</Link> to post, like &amp; chat
          </span>
        </div>

        {posts.length === 0 && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 30, textAlign: 'center', color: '#6B7280' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🐾</div>
            <p>No posts yet — be the first! <Link href="/login" style={{ color: '#FF6B35', fontWeight: 700 }}>Join PawVerse</Link></p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {posts.map(post => (
            <article key={post.id} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(108,75,246,0.08)', boxShadow: '0 2px 8px rgba(108,75,246,0.05)' }}>
              {/* Author */}
              <div style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: post.pets?.avatar_url ? `url(${post.pets.avatar_url})` : 'linear-gradient(135deg, #FF6B35, #6C4BF6)', backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.15rem', flexShrink: 0 }}>
                  {!post.pets?.avatar_url && (post.pets?.emoji || '🐾')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1E1347' }}>{post.pets?.pet_name || 'PawVerse user'} {post.pets?.role === 'vet' && <span title="Verified vet" style={{ fontSize: '0.75rem', color: '#22C55E' }}>🩺</span>}</div>
                  <div style={{ color: '#6B7280', fontSize: '0.74rem' }}>{post.pets?.owner_name} {post.location && <>· 📍 {post.location}</>}</div>
                </div>
              </div>

              {/* Body */}
              {post.content && <div style={{ padding: '0 14px 12px', color: '#1E1347', fontSize: '0.95rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{post.content}</div>}
              {post.image_url && (
                <img src={post.image_url} alt={`Post by ${post.pets?.pet_name || 'a pet'} on PawVerse`} loading="lazy" style={{ width: '100%', display: 'block', maxHeight: 600, objectFit: 'cover' }} />
              )}
              {post.video_url && !post.image_url && (
                <div style={{ position: 'relative', background: '#000', padding: '20px', textAlign: 'center', color: '#fff' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎬</div>
                  <Link href="/login" style={{ color: '#FF6B35', fontWeight: 700 }}>Sign in to watch this video</Link>
                </div>
              )}

              {/* Login-required interaction bar */}
              <div style={{ padding: '10px 14px', borderTop: '1px solid #F3F4F6', display: 'flex', gap: 18, alignItems: 'center' }}>
                <button onClick={() => requireLogin(`/post/${post.id}`)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.88rem', color: '#6B7280', fontWeight: 700, padding: 0 }}>❤️ Like</button>
                <button onClick={() => requireLogin(`/post/${post.id}`)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.88rem', color: '#6B7280', fontWeight: 700, padding: 0 }}>💬 Comment</button>
                <button onClick={() => requireLogin(`/post/${post.id}`)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.88rem', color: '#6B7280', fontWeight: 700, padding: 0 }}>📤 Share</button>
                <Link href={`/post/${post.id}`} style={{ marginLeft: 'auto', color: '#6C4BF6', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}>View post →</Link>
              </div>
            </article>
          ))}
        </div>

        {posts.length > 0 && (
          <div style={{ marginTop: 24, padding: 22, background: 'linear-gradient(135deg, #FF6B35, #6C4BF6)', borderRadius: 16, textAlign: 'center', color: '#fff' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>🐾</div>
            <h3 style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.3rem', marginBottom: 8 }}>Want to see more?</h3>
            <p style={{ marginBottom: 14, opacity: 0.95, fontSize: '0.92rem' }}>Create your free PawVerse account to like posts, message pet parents, adopt pets and shop the marketplace.</p>
            <Link href="/login" style={{ background: '#fff', color: '#FF6B35', padding: '12px 28px', borderRadius: 50, fontWeight: 800, textDecoration: 'none', display: 'inline-block' }}>Join PawVerse — Free</Link>
          </div>
        )}
      </section>

      {/* === FEATURES (KEYWORD-RICH, MOVED BELOW FEED) === */}
      <section style={{ background: 'rgba(255,255,255,0.55)', padding: '40px 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: 6, color: '#1E1347' }}>Everything Pet Parents in India Need — In One App</h2>
          <p style={{ textAlign: 'center', color: '#6B7280', marginBottom: 28, fontSize: '0.95rem' }}>From adoption to grooming to vet appointments — PawVerse is your pet's whole world.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {[
              { icon: '🏠', title: 'Pet Adoption in India', desc: 'Adopt dogs, cats, rabbits and more from verified shelters and pet parents. We help street dogs and rescued cats find loving homes across Dehradun, Mumbai, Delhi, Bengaluru and every major Indian city.' },
              { icon: '🛍️', title: 'Pet Marketplace', desc: 'Buy and sell pet food, toys, accessories, grooming supplies and pet medicines. Free listings for pet parents and verified suppliers across India.' },
              { icon: '🩺', title: 'Vet Consultations & Health Tracker', desc: 'Book online vet appointments with verified veterinarians, track vaccination schedules, store medical records and get expert pet care advice.' },
              { icon: '📸', title: 'Pet Social Feed', desc: 'Share photos, reels and stories of your fur family. Discover trending pet posts, connect with pet parents in your city and join the largest pet community in India.' },
              { icon: '💬', title: 'Pet Parent Chat', desc: 'Message other pet owners, get breed-specific advice, organise meetups and trade tips with vets and pet experts — all inside one chat.' },
              { icon: '🪙', title: 'PawCoins Rewards', desc: 'Earn PawCoins for posting, adopting and engaging. Redeem them for marketplace discounts, vet consultations and exclusive PawVerse perks.' }
            ].map(card => (
              <div key={card.title} style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid rgba(108,75,246,0.1)', boxShadow: '0 4px 16px rgba(108,75,246,0.06)' }}>
                <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>{card.icon}</div>
                <h3 style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.1rem', marginBottom: 6, color: '#1E1347' }}>{card.title}</h3>
                <p style={{ color: '#4B5563', fontSize: '0.88rem', lineHeight: 1.5 }}>{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === FAQ (server-rendered, FAQPage schema below) === */}
      <section style={{ padding: '40px 20px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: 'clamp(1.5rem, 3vw, 2rem)', textAlign: 'center', marginBottom: 20, color: '#1E1347' }}>Frequently Asked Questions</h2>
          {[
            { q: 'Is PawVerse free to use?', a: 'Yes — PawVerse is completely free to sign up and use. You only pay for marketplace purchases or paid vet consultations if you choose to book them.' },
            { q: 'Can I adopt a pet on PawVerse?', a: 'Yes. PawVerse helps connect adopters with pet parents and shelters across India. Browse the Adopt section to see dogs, cats and other pets looking for loving homes.' },
            { q: 'Do I need to have a pet to join PawVerse?', a: 'No — anyone who loves pets can join. We have a dedicated "Pet Lover" signup option for people without pets who still want to be part of the community.' },
            { q: 'How does vet verification work on PawVerse?', a: 'Vets sign up, confirm their email, and upload their veterinary license or registration certificate. The system automatically activates their account once both steps are complete — typically within minutes.' },
            { q: 'Which cities does PawVerse cover in India?', a: 'PawVerse is available across India with strong communities in Dehradun, Mumbai, Delhi, Bengaluru, Chennai, Hyderabad, Pune, Kolkata, Jaipur and Chandigarh.' },
            { q: 'How do I list a pet product on the marketplace?', a: 'Sign up as a Supplier or Pet Parent, go to the Marketplace section and click "Add Listing". Listing pet products on PawVerse is free.' },
          ].map((f, idx) => (
            <details key={idx} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 10, border: '1px solid rgba(108,75,246,0.1)' }}>
              <summary style={{ fontWeight: 800, color: '#1E1347', cursor: 'pointer', fontSize: '0.98rem' }}>{f.q}</summary>
              <p style={{ marginTop: 10, color: '#4B5563', fontSize: '0.92rem', lineHeight: 1.55 }}>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* FAQPage JSON-LD for rich Google results */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          { "@type": "Question", "name": "Is PawVerse free to use?", "acceptedAnswer": { "@type": "Answer", "text": "Yes — PawVerse is completely free to sign up and use. You only pay for marketplace purchases or paid vet consultations if you choose to book them." }},
          { "@type": "Question", "name": "Can I adopt a pet on PawVerse?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. PawVerse helps connect adopters with pet parents and shelters across India. Browse the Adopt section to see dogs, cats and other pets looking for loving homes." }},
          { "@type": "Question", "name": "Do I need to have a pet to join PawVerse?", "acceptedAnswer": { "@type": "Answer", "text": "No — anyone who loves pets can join. We have a dedicated Pet Lover signup option for people without pets who still want to be part of the community." }},
          { "@type": "Question", "name": "How does vet verification work on PawVerse?", "acceptedAnswer": { "@type": "Answer", "text": "Vets sign up, confirm their email, and upload their veterinary license or registration certificate. The system automatically activates their account once both steps are complete — typically within minutes." }},
          { "@type": "Question", "name": "Which cities does PawVerse cover in India?", "acceptedAnswer": { "@type": "Answer", "text": "PawVerse is available across India with strong communities in Dehradun, Mumbai, Delhi, Bengaluru, Chennai, Hyderabad, Pune, Kolkata, Jaipur and Chandigarh." }},
          { "@type": "Question", "name": "How do I list a pet product on the marketplace?", "acceptedAnswer": { "@type": "Answer", "text": "Sign up as a Supplier or Pet Parent, go to the Marketplace section and click Add Listing. Listing pet products on PawVerse is free." }}
        ]
      }) }} />

      {/* === FOOTER (SEO + nav real estate) === */}
      <footer style={{ background: '#1E1347', color: '#fff', padding: '40px 20px 20px', marginTop: 30 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 28 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: '1.6rem' }}>🐾</span>
              <span style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.4rem' }}>PawVerse</span>
            </div>
            <p style={{ color: '#A8A4C7', fontSize: '0.88rem', lineHeight: 1.55 }}>India's all-in-one pet social network. Adopt, shop, connect & care — all in one place. Headquartered in Dehradun, Uttarakhand.</p>
          </div>
          <div>
            <h4 style={{ fontWeight: 800, marginBottom: 12, fontSize: '0.95rem' }}>Explore</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li><Link href="/adopt" style={footerLinkStyle}>Adopt a Pet</Link></li>
              <li><Link href="/marketplace" style={footerLinkStyle}>Pet Marketplace</Link></li>
              <li><Link href="/blogs" style={footerLinkStyle}>Pet Blog &amp; Tips</Link></li>
              <li><Link href="/dehradun" style={footerLinkStyle}>Pets in Dehradun</Link></li>
            </ul>
          </div>
          <div>
            <h4 style={{ fontWeight: 800, marginBottom: 12, fontSize: '0.95rem' }}>Account</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li><Link href="/login" style={footerLinkStyle}>Sign In</Link></li>
              <li><Link href="/login" style={footerLinkStyle}>Create Account</Link></li>
              <li><Link href="/faq" style={footerLinkStyle}>FAQ &amp; Help</Link></li>
            </ul>
          </div>
          <div>
            <h4 style={{ fontWeight: 800, marginBottom: 12, fontSize: '0.95rem' }}>Contact</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, color: '#A8A4C7', fontSize: '0.88rem' }}>
              <li>📧 support@pawversesocial.com</li>
              <li>📍 Dehradun, Uttarakhand, India</li>
            </ul>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 28, paddingTop: 16, textAlign: 'center', color: '#A8A4C7', fontSize: '0.82rem' }}>
          © {year} PawVerse Social. Made with ❤️ in India for pet parents everywhere.
        </div>
      </footer>
    </div>
  )
}

const navLinkStyle = {
  color: '#1E1347',
  fontWeight: 700,
  fontSize: '0.92rem',
  textDecoration: 'none',
  padding: '6px 10px',
  borderRadius: 8,
}

const footerLinkStyle = {
  color: '#A8A4C7',
  fontSize: '0.88rem',
  textDecoration: 'none',
}
