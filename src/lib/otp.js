// Email OTP helpers (server-only). Codes are stored hashed in public.email_otps.
import crypto from 'crypto'
import { supabaseAdmin } from './supabaseAdmin'

export const OTP_PURPOSES = ['signup', 'reset', 'verify']
export const OTP_TTL_MINUTES = 10
const MAX_ATTEMPTS = 5
const RESEND_COOLDOWN_SECONDS = 60
const MAX_PER_HOUR = 5

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const normalizeEmail = (email) => String(email || '').trim().toLowerCase()

const secret = () => process.env.OTP_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const hashCode = (code, email, purpose) =>
  crypto.createHmac('sha256', secret()).update(`${code}:${email}:${purpose}`).digest('hex')

export async function getUserIdByEmail(email) {
  const { data, error } = await supabaseAdmin.rpc('get_user_id_by_email', { p_email: email })
  if (error) throw new Error('User lookup failed: ' + error.message)
  return data || null
}

// Creates a new OTP for (email, purpose). Returns { code } or { error, status }.
export async function createOtp(email, purpose) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data: recent, error: recentErr } = await supabaseAdmin
    .from('email_otps')
    .select('created_at')
    .eq('email', email)
    .eq('purpose', purpose)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
  if (recentErr) throw new Error('OTP lookup failed: ' + recentErr.message)

  if (recent?.length) {
    const secondsSinceLast = (Date.now() - new Date(recent[0].created_at).getTime()) / 1000
    if (secondsSinceLast < RESEND_COOLDOWN_SECONDS) {
      return { status: 429, error: `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceLast)} seconds before requesting another code.` }
    }
    if (recent.length >= MAX_PER_HOUR) {
      return { status: 429, error: 'Too many codes requested. Please try again in an hour.' }
    }
  }

  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0')
  const { error } = await supabaseAdmin.from('email_otps').insert({
    email,
    purpose,
    code_hash: hashCode(code, email, purpose),
    expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString(),
  })
  if (error) throw new Error('Could not save OTP: ' + error.message)
  return { code }
}

// Checks the latest unused OTP. Marks it consumed on success.
// Returns { ok: true } or { ok: false, error }.
export async function verifyOtp(email, purpose, code) {
  const clean = String(code || '').replace(/\D/g, '')
  if (clean.length !== 6) return { ok: false, error: 'Please enter the 6-digit code from your email.' }

  const { data: otp, error } = await supabaseAdmin
    .from('email_otps')
    .select('id, code_hash, attempts, expires_at')
    .eq('email', email)
    .eq('purpose', purpose)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error('OTP lookup failed: ' + error.message)

  if (!otp || new Date(otp.expires_at) < new Date()) {
    return { ok: false, error: 'This code has expired. Please request a new one.' }
  }
  if (otp.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: 'Too many incorrect attempts. Please request a new code.' }
  }

  const expected = Buffer.from(otp.code_hash, 'hex')
  const actual = Buffer.from(hashCode(clean, email, purpose), 'hex')
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    await supabaseAdmin.from('email_otps').update({ attempts: otp.attempts + 1 }).eq('id', otp.id)
    const left = MAX_ATTEMPTS - otp.attempts - 1
    return { ok: false, error: left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many incorrect attempts. Please request a new code.' }
  }

  await supabaseAdmin.from('email_otps').update({ consumed_at: new Date().toISOString() }).eq('id', otp.id)
  return { ok: true }
}

export function otpEmailHtml(code, purpose) {
  const heading = {
    signup: 'Verify your email to join PawVerse 🐾',
    reset: 'Reset your PawVerse password 🔑',
    verify: 'Confirm your PawVerse email 📧',
  }[purpose]
  return `
  <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #FF6B35, #6C4BF6); padding: 26px; border-radius: 16px; text-align: center;">
      <h1 style="color: #fff; margin: 0; font-size: 22px;">${heading}</h1>
    </div>
    <p style="color: #374151; font-size: 15px; margin-top: 24px;">Your verification code is:</p>
    <div style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #1E1347; background: #F3F0FF; border-radius: 12px; padding: 18px; text-align: center;">${code}</div>
    <p style="color: #6B7280; font-size: 13px; margin-top: 18px;">This code expires in ${OTP_TTL_MINUTES} minutes. Never share it with anyone — PawVerse will never ask you for it.</p>
    <p style="color: #6B7280; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
    <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 24px;">PawVerse — The Social Universe for Your Fur Family 🐾</p>
  </div>`
}
