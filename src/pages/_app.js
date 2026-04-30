import { useEffect } from 'react'
import Head from 'next/head'
import SEO from '../components/SEO'
import '../styles/globals.css'
import '../styles/responsive-patch.css'

export default function App({ Component, pageProps }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(reg => {
          console.log('✅ SW Registered:', reg.scope)
          reg.update()
        }).catch(err => {
          console.error('❌ SW Registration Failed:', err)
        })
      })
    }
  }, [])

  return (
    <>
      {/* 🌍 GLOBAL SEO DEFAULTS */}
      <SEO />
      
      <Head>
        {/* Viewport & PWA settings */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <link rel="manifest" href="/manifest.json" />

        {/* Organization + WebSite JSON-LD Schema (Issue 2.6) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://pawversesocial.com/#org",
                  "name": "PawVerse Social",
                  "url": "https://pawversesocial.com",
                  "logo": {
                    "@type": "ImageObject",
                    "url": "https://pawversesocial.com/logo.png",
                    "width": 512,
                    "height": 512
                  },
                  "description": "India's all-in-one pet social network — adopt, shop, connect and track your pet's health.",
                  "foundingLocation": "Dehradun, Uttarakhand, India",
                  "areaServed": "IN",
                  "contactPoint": {
                    "@type": "ContactPoint",
                    "contactType": "customer support",
                    "email": "support@pawversesocial.com",
                    "availableLanguage": ["English", "Hindi"]
                  },
                  "sameAs": [
                    "https://instagram.com/pawversesocial",
                    "https://twitter.com/pawversesocial",
                    "https://facebook.com/pawversesocial",
                    "https://linkedin.com/company/pawversesocial"
                  ]
                },
                {
                  "@type": "WebSite",
                  "@id": "https://pawversesocial.com/#website",
                  "url": "https://pawversesocial.com",
                  "name": "PawVerse Social",
                  "description": "India's pet social network — adopt dogs & cats, shop the marketplace, track health records.",
                  "publisher": { "@id": "https://pawversesocial.com/#org" },
                  "inLanguage": "en-IN",
                  "potentialAction": {
                    "@type": "SearchAction",
                    "target": {
                      "@type": "EntryPoint",
                      "urlTemplate": "https://pawversesocial.com/feed?tag={search_term_string}"
                    },
                    "query-input": "required name=search_term_string"
                  }
                },
                {
                  "@type": "LocalBusiness",
                  "@id": "https://pawversesocial.com/#localbusiness",
                  "name": "PawVerse Social",
                  "url": "https://pawversesocial.com",
                  "logo": "https://pawversesocial.com/logo.png",
                  "image": "https://pawversesocial.com/og-image.jpg",
                  "description": "India's pet social platform — adopt pets, shop the marketplace, connect with pet parents in Dehradun and across India.",
                  "address": {
                    "@type": "PostalAddress",
                    "addressLocality": "Dehradun",
                    "addressRegion": "Uttarakhand",
                    "addressCountry": "IN"
                  },
                  "geo": {
                    "@type": "GeoCoordinates",
                    "latitude": 30.3165,
                    "longitude": 78.0322
                  },
                  "telephone": "+91-XXXXXXXXXX",
                  "email": "support@pawversesocial.com",
                  "priceRange": "Free",
                  "openingHours": "Mo-Su 00:00-24:00",
                  "sameAs": ["https://pawversesocial.com/#org"]
                }
              ]
            })
          }}
        />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
