import { useEffect } from 'react'
import Head from 'next/head'
import '../styles/globals.css'
import '../styles/responsive-patch.css'

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // ── HARDENED SERVICE WORKER REMOVAL (DEV MODE) ──
    if ('serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'development') {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          for (let registration of registrations) {
            registration.unregister().then(() => {
              console.log('🗑️ SW Unregistered for Development');
            });
          }
        });
        
        // Also clear any caches the SW might have created
        if (window.caches) {
          caches.keys().then(names => {
            for (let name of names) caches.delete(name);
          });
        }
      } else {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js').then(reg => {
            console.log('✅ SW Registered:', reg.scope)
            reg.update()
          }).catch(err => {
            console.error('❌ SW Registration Failed:', err)
          })
        })
      }
    }
  }, [])

  return (
    <>
      <Head>
        {/* Primary SEO */}
        <title>PawVerse — The Social Universe for Your Fur Family 🐾</title>
        <meta name="description" content="PawVerse is the ultimate social media platform for pet lovers. Share photos, videos and reels of your pets, connect with other pet parents, adopt animals, shop the marketplace, and manage your pet's health records." />
        <meta name="keywords" content="pet social media, pet app, dogs, cats, rabbits, birds, pet network, adopt pets, pet health, pawverse" />
        <meta name="author" content="PawVerse" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pawversesocial.com/" />

        {/* Viewport & PWA */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <meta name="theme-color" content="#FF6B35" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="icon" href="/logo.png" />

        {/* Open Graph (Facebook, WhatsApp, LinkedIn) */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="PawVerse" />
        <meta property="og:title" content="PawVerse — The Social Universe for Your Fur Family 🐾" />
        <meta property="og:description" content="Share your pet's life, discover adorable animals, adopt pets, and connect with pet parents worldwide. Join PawVerse today!" />
        <meta property="og:url" content="https://pawversesocial.com/" />
        <meta property="og:image" content="https://pawversesocial.com/logo.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale" content="en_IN" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="PawVerse — The Social Universe for Your Fur Family 🐾" />
        <meta name="twitter:description" content="Share your pet's life, discover adorable animals, adopt pets, and connect with pet parents worldwide." />
        <meta name="twitter:image" content="https://pawversesocial.com/logo.png" />

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "PawVerse",
              "url": "https://pawversesocial.com",
              "description": "The social universe for your fur family. Share, adopt, and connect with pet lovers worldwide.",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://pawversesocial.com/feed?tag={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
