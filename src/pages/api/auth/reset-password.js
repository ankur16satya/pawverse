// POST { email, otp, newPassword } → verifies the reset OTP and sets the new password.
import { supabaseAdmin, ADMIN_NOT_CONFIGURED } from '../../../lib/supabaseAdmin'
import { EMAIL_RE, normalizeEmail, verifyOtp, getUserIdByEmail } from '../../../lib/otp'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' })
  if (!supabaseAdmin) return res.status(500).json({ error: ADMIN_NOT_CONFIGURED })

  const email = normalizeEmail(req.body?.email)
  const { otp, newPassword } = req.body || {}
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' })
  if (typeof newPassword !== 'string' || newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' })

  try {
    const check = await verifyOtp(email, 'reset', otp)
    if (!check.ok) return res.status(400).json({ error: check.error })

    const userId = await getUserIdByEmail(email)
    if (!userId) return res.status(400).json({ error: 'This code has expired. Please request a new one.' })

    // Resetting via an emailed code also proves ownership, so confirm the email too.
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword, email_confirm: true })
    if (error) return res.status(400).json({ error: error.message })

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('reset-password error:', err)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}
