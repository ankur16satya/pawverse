// POST { email, purpose: 'signup' | 'reset' | 'verify' } → emails a 6-digit code via our Gmail SMTP.
import { supabaseAdmin, ADMIN_NOT_CONFIGURED } from '../../../lib/supabaseAdmin'
import { sendMail } from '../../../lib/mailer'
import { OTP_PURPOSES, EMAIL_RE, normalizeEmail, createOtp, getUserIdByEmail, otpEmailHtml } from '../../../lib/otp'

const SUBJECTS = {
  signup: 'Your PawVerse verification code',
  reset: 'Your PawVerse password reset code',
  verify: 'Your PawVerse email confirmation code',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' })
  if (!supabaseAdmin) return res.status(500).json({ error: ADMIN_NOT_CONFIGURED })

  const email = normalizeEmail(req.body?.email)
  const purpose = req.body?.purpose
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' })
  if (!OTP_PURPOSES.includes(purpose)) return res.status(400).json({ error: 'Invalid request.' })

  try {
    const userId = await getUserIdByEmail(email)

    if (purpose === 'signup' && userId) {
      return res.status(409).json({ error: 'An account with this email already exists. Please sign in instead.' })
    }
    // For reset/verify, don't reveal whether the email is registered.
    if (purpose !== 'signup' && !userId) {
      return res.status(200).json({ success: true })
    }

    const result = await createOtp(email, purpose)
    if (result.error) return res.status(result.status).json({ error: result.error })

    const sent = await sendMail({
      to: email,
      subject: SUBJECTS[purpose],
      text: `Your PawVerse verification code is ${result.code}. It expires in 10 minutes.`,
      html: otpEmailHtml(result.code, purpose),
    })
    if (!sent) return res.status(500).json({ error: 'We could not send the email right now. Please try again in a minute.' })

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('send-otp error:', err)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}
