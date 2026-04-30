import Head from 'next/head'
import { useRouter } from 'next/router'
import SEO from '../components/SEO'

// Issue 6.1: Local SEO landing page for Dehradun
export default function Dehradun() {
  const router = useRouter()

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "PawVerse Social — Dehradun",
    "description": "Dehradun's pet community — adopt dogs & cats, find pet services, and connect with local pet parents.",
    "url": "https://pawversesocial.com/dehradun",
    "telephone": "+91-XXXXXXXXXX",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Dehradun",
      "addressRegion": "Uttarakhand",
      "postalCode": "248001",
      "addressCountry": "IN"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 30.3165,
      "longitude": 78.0322
    },
    "areaServed": [
      { "@type": "City", "name": "Dehradun" },
      { "@type": "City", "name": "Mussoorie" },
      { "@type": "City", "name": "Haridwar" },
      { "@type": "City", "name": "Rishikesh" }
    ],
    "openingHours": "Mo-Su 00:00-24:00",
    "priceRange": "Free",
    "sameAs": ["https://pawversesocial.com/#org"]
  }

  return (
    <div style={{ background: '#FFFBF7', minHeight: '100vh', paddingBottom: 60 }}>
      <SEO
        title="Pet Adoption & Community in Dehradun | PawVerse"
        description="Join Dehradun's pet community on PawVerse. Adopt dogs & cats in Dehradun, find local vet services, and connect with pet parents in Uttarakhand."
        keywords="pet adoption Dehradun, adopt dog Dehradun, cat adoption Dehradun, vet Dehradun, pet community Dehradun, pet shop Dehradun, Uttarakhand pet network"
        canonical="https://pawversesocial.com/dehradun"
      />
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
      </Head>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #1E1347, #6C4BF6)', padding: '80px 20px 60px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: "'Baloo 2', cursive", fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#fff', margin: '0 0 16px' }}>
          🐾 Dehradun's Pet Community
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.15rem', maxWidth: 600, margin: '0 auto 32px', lineHeight: 1.6 }}>
          PawVerse is Dehradun's home for pet lovers — adopt dogs &amp; cats, find vet services, shop the marketplace, and connect with fellow pet parents across Uttarakhand.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/adopt" style={{ background: '#FF6B35', color: '#fff', padding: '14px 32px', borderRadius: 50, fontWeight: 800, fontSize: '1rem', textDecoration: 'none', display: 'inline-block' }}>
            🏠 Adopt a Pet in Dehradun
          </a>
          <a href="/" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '14px 32px', borderRadius: 50, fontWeight: 800, fontSize: '1rem', textDecoration: 'none', display: 'inline-block', border: '2px solid rgba(255,255,255,0.4)' }}>
            Join PawVerse →
          </a>
        </div>
      </div>

      {/* Content Sections */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 20px' }}>

        {/* Why Dehradun */}
        <section style={{ marginBottom: 64 }}>
          <h2 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '2rem', color: '#1E1347', marginBottom: 16 }}>
            Why PawVerse is Perfect for Dehradun Pet Parents
          </h2>
          <p style={{ color: '#6B7280', fontSize: '1.05rem', lineHeight: 1.8, maxWidth: 800 }}>
            Dehradun's growing pet-loving community deserves a dedicated platform. Whether you're looking to adopt a stray dog from Rajpur Road, find a trusted vet in Clement Town, or buy organic dog food in Sahastradhara — PawVerse connects you with everything local.
          </p>
        </section>

        {/* Feature Grid */}
        <section style={{ marginBottom: 64 }}>
          <h2 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '2rem', color: '#1E1347', marginBottom: 32 }}>
            What You Can Do on PawVerse in Dehradun
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
            {[
              { icon: '🏠', title: 'Pet Adoption', desc: 'Browse dogs, cats, rabbits and birds available for adoption in Dehradun and nearby areas.', link: '/adopt' },
              { icon: '🛍️', title: 'Pet Marketplace', desc: 'Shop local pet food, accessories, and grooming services from Dehradun suppliers.', link: '/marketplace' },
              { icon: '🩺', title: 'Vet Services', desc: 'Find and connect with verified veterinarians in Dehradun, Mussoorie, and Haridwar.', link: '/marketplace?category=services' },
              { icon: '📖', title: 'Pet Health Blog', desc: 'Expert vet-authored articles on pet health, nutrition, and care — tailored for Indian conditions.', link: '/blogs' },
              { icon: '💬', title: 'Pet Community', desc: 'Connect with fellow dog and cat lovers in Dehradun. Share photos, tips, and heartwarming stories.', link: '/' },
              { icon: '📊', title: 'Health Records', desc: 'Track your pet\'s vaccinations, vet visits, and health history — all in one place.', link: '/health' },
            ].map(f => (
              <a key={f.title} href={f.link} style={{ textDecoration: 'none' }}>
                <div style={{ background: '#fff', borderRadius: 20, padding: 28, border: '1.5px solid #EDE8FF', transition: 'transform 0.2s', cursor: 'pointer' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 12 }}>{f.icon}</div>
                  <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.2rem', color: '#1E1347', marginBottom: 8 }}>{f.title}</h3>
                  <p style={{ color: '#6B7280', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Areas Covered */}
        <section style={{ background: '#F5F0FF', borderRadius: 24, padding: '40px 32px', marginBottom: 64 }}>
          <h2 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.8rem', color: '#1E1347', marginBottom: 16 }}>
            Areas We Serve in Uttarakhand
          </h2>
          <p style={{ color: '#6B7280', marginBottom: 24, lineHeight: 1.7 }}>
            PawVerse connects pet parents across Uttarakhand. Our community is active in:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {['Dehradun', 'Mussoorie', 'Haridwar', 'Rishikesh', 'Roorkee', 'Haldwani', 'Nainital', 'Almora', 'Pithoragarh'].map(city => (
              <span key={city} style={{ background: '#fff', border: '1.5px solid #6C4BF6', color: '#6C4BF6', padding: '8px 18px', borderRadius: 25, fontWeight: 700, fontSize: '0.9rem' }}>
                📍 {city}
              </span>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{ textAlign: 'center', padding: '40px 20px', background: 'linear-gradient(135deg, #FF6B35, #6C4BF6)', borderRadius: 24 }}>
          <h2 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '2rem', color: '#fff', marginBottom: 12 }}>
            Join Dehradun's Pet Revolution 🐾
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: 28, fontSize: '1rem' }}>
            Free to join. Create your pet's profile, connect with local pet parents, and be part of Uttarakhand's fastest-growing pet community.
          </p>
          <a href="/" style={{ background: '#fff', color: '#6C4BF6', padding: '14px 40px', borderRadius: 50, fontWeight: 900, fontSize: '1.1rem', textDecoration: 'none', display: 'inline-block' }}>
            Get Started Free →
          </a>
        </section>
      </div>
    </div>
  )
}

export async function getStaticProps() {
  return { props: {}, revalidate: 86400 }
}
