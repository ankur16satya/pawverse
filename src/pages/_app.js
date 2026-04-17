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
        {/* Viewport & PWA settings (Best kept in _app) */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <link rel="manifest" href="/manifest.json" />

        {/* JSON-LD Structured Data (Global) */}
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
