// Server-only Supabase client with the service role key (bypasses RLS).
// Never import this from a page component — only from /api routes.
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null

export const ADMIN_NOT_CONFIGURED =
  'Server is not configured: add SUPABASE_SERVICE_ROLE_KEY to the environment variables.'
