// POST { email, otp } → confirms the email of an existing account that was never verified.
import { supabaseAdmin, ADMIN_NOT_CONFIGURED } from '../../../lib/supabaseAdmin'
import { EMAIL_RE, normalizeEmail, verifyOtp, getUserIdByEmail } from '../../../lib/otp'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' })
  if (!supabaseAdmin) return res.status(500).json({ error: ADMIN_NOT_CONFIGURED })

  const email = normalizeEmail(req.body?.email)
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' })

  try {
    const check = await verifyOtp(email, 'verify', req.body?.otp)
    if (!check.ok) return res.status(400).json({ error: check.error })

    const userId = await getUserIdByEmail(email)
    if (!userId) return res.status(400).json({ error: 'This code has expired. Please request a new one.' })

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { email_confirm: true })
    if (error) return res.status(400).json({ error: error.message })

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('verify-email error:', err)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}
