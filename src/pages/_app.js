import { useEffect } from 'react'
import Head from 'next/head'
import '../styles/globals.css'
import '../styles/responsive-patch.css'

export default function App({ Component, pageProps }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(reg => {
          console.log('✅ SW Registered:', reg.scope)
          // Check for updates immediately
          reg.update()
        }).catch(err => {
          console.error('❌ SW Registration Failed:', err)
        })
      })
    }
  }, [])

  return (
    <>
      <Head>
        <title>Pawverse Social</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FF6B35" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
