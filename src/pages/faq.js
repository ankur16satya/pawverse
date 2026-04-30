import Head from 'next/head'
import { useState } from 'react'
import SEO from '../components/SEO'

// Issue 5.4: FAQ page with FAQPage schema for PAA & voice search
const FAQS = [
  {
    q: "What is PawVerse?",
    a: "PawVerse is India's all-in-one social network for pet lovers. You can adopt pets, shop the marketplace, track your pet's health records, connect with other pet parents, and get expert vet advice — all in one place."
  },
  {
    q: "Is PawVerse free to use?",
    a: "Yes! PawVerse is free to join and use. Create your pet's profile, post photos, and connect with other pet lovers at no cost. Some premium marketplace listings may have charges from individual sellers."
  },
  {
    q: "How do I adopt a pet through PawVerse?",
    a: "Go to the Adopt page, browse available pets, and click 'Express Interest' on any listing that catches your eye. You'll be connected directly with the pet's current caretaker to arrange a meeting."
  },
  {
    q: "How do I list my pet for adoption on PawVerse?",
    a: "Sign up or log in, then go to the Adopt section and click 'List a Pet for Adoption'. Fill in your pet's details including photos, temperament, and your contact info. Listings are free."
  },
  {
    q: "Can I find vet services on PawVerse?",
    a: "Yes! The PawVerse Marketplace includes a dedicated Services section where verified vets and pet care professionals can list their services. You can browse by location and book directly."
  },
  {
    q: "What is PawCoins?",
    a: "PawCoins is PawVerse's rewards system. Earn coins through activity on the platform and use them for discounts or special features within the app."
  },
  {
    q: "How do I track my pet's health records?",
    a: "After logging in, go to the Health section. You can log your pet's vaccinations, vet visits, weight, and medical history. The tracker keeps a complete timeline of your pet's health."
  },
  {
    q: "Is PawVerse available across India?",
    a: "Yes! While PawVerse started in Dehradun, Uttarakhand, it is available across India. You can find and connect with pet parents in your city, whether you're in Delhi, Mumbai, Bangalore, or smaller towns."
  },
  {
    q: "How do I sell pet products on PawVerse Marketplace?",
    a: "Sign up as a Supplier during registration (or update your role), then go to the Marketplace and click 'List a Product'. You can add photos, description, price, and your location."
  },
  {
    q: "Is there a mobile app for PawVerse?",
    a: "PawVerse is a Progressive Web App (PWA) that works beautifully on mobile browsers. You can add it to your phone's home screen for an app-like experience — no App Store download needed."
  },
  {
    q: "How do I delete my PawVerse account?",
    a: "To delete your account, go to Settings and select the account deletion option, or contact our support team at support@pawversesocial.com."
  },
  {
    q: "Who can I contact for support?",
    a: "For any questions or support, email us at support@pawversesocial.com. We typically respond within 24 hours."
  },
]

export default function FAQ() {
  const [open, setOpen] = useState(null)

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQS.map(f => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": f.a
      }
    }))
  }

  return (
    <div style={{ background: '#FFFBF7', minHeight: '100vh', paddingBottom: 80 }}>
      <SEO
        title="FAQ — Frequently Asked Questions | PawVerse"
        description="Find answers to the most common questions about PawVerse — India's pet social network. Learn how to adopt, sell, find vets, and use PawVerse features."
        keywords="PawVerse FAQ, how to adopt pet India, PawVerse help, pet adoption questions, PawVerse features, pet marketplace FAQ"
        canonical="https://pawversesocial.com/faq"
      />
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      </Head>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1E1347, #6C4BF6)', padding: '80px 20px 60px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: "'Baloo 2', cursive", fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#fff', margin: '0 0 12px' }}>
          Frequently Asked Questions
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.05rem', maxWidth: 500, margin: '0 auto' }}>
          Everything you need to know about PawVerse — India's all-in-one pet community.
        </p>
      </div>

      {/* FAQ List */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 20px' }}>
        {FAQS.map((faq, idx) => (
          <div
            key={idx}
            style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #EDE8FF', marginBottom: 12, overflow: 'hidden' }}
          >
            <button
              onClick={() => setOpen(open === idx ? null : idx)}
              style={{
                width: '100%', textAlign: 'left', padding: '20px 24px', background: 'none', border: 'none',
                cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12
              }}
            >
              <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.05rem', color: '#1E1347', margin: 0, fontWeight: 800 }}>
                {faq.q}
              </h3>
              <span style={{ color: '#6C4BF6', fontSize: '1.4rem', flexShrink: 0 }}>{open === idx ? '−' : '+'}</span>
            </button>
            {open === idx && (
              <div style={{ padding: '0 24px 20px', color: '#6B7280', lineHeight: 1.7, fontSize: '0.97rem' }}>
                {faq.a}
              </div>
            )}
          </div>
        ))}

        {/* Contact CTA */}
        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <p style={{ color: '#6B7280', marginBottom: 16 }}>Still have questions? We're happy to help.</p>
          <a
            href="mailto:support@pawversesocial.com"
            style={{ background: '#6C4BF6', color: '#fff', padding: '14px 32px', borderRadius: 50, fontWeight: 800, fontSize: '1rem', textDecoration: 'none', display: 'inline-block' }}
          >
            Contact Support →
          </a>
        </div>
      </div>
    </div>
  )
}

export async function getStaticProps() {
  return { props: {}, revalidate: 604800 } // Revalidate weekly
}
