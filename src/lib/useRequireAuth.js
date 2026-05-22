// Drop-in auth gate for pages that require login.
// Replaces patterns like:
//   const { data: { session } } = await supabase.auth.getSession()
//   if (!session) { router.push('/'); return }
// with:
//   const { user, ready } = useRequireAuth()
//   if (!ready) return <Loader />
//
// On not-logged-in: redirects to /login?next=<current path> so user comes back here after signing in.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from './supabase'

export default function useRequireAuth() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (!session) {
        const next = encodeURIComponent(router.asPath || '/')
        router.replace(`/login?next=${next}`)
        return
      }
      setUser(session.user)
      setReady(true)
    })
    return () => { mounted = false }
  }, [])

  return { user, ready }
}
