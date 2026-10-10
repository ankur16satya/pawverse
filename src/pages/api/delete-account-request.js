// File: src/pages/api/delete-account-request.js
// Records an account / data deletion request and notifies the PawVerse team.
// Works for signed-out users too (required by Google Play's data deletion policy).
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { sendMail } from '../../lib/mailer'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const ADMIN_EMAILS = ['ankur16satya@gmail.com', 'sharmasiddharth269@gmail.com']
const REQUEST_TYPES = ['full_account', 'specific_data']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const escapeHtml = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const sendEmail = (to, subject, html) => sendMail({ to, subject, html })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' })

  const { email, name = '', requestType = 'full_account', reason = '', details = '', confirmed } = req.body || {}
  const cleanEmail = String(email || '').trim().toLowerCase()

  if (!EMAIL_RE.test(cleanEmail) || cleanEmail.length > 254) {
    return res.status(400).json({ error: 'Please enter a valid email address.' })
  }
  if (!REQUEST_TYPES.includes(requestType)) {
    return res.status(400).json({ error: 'Invalid request type.' })
  }
  if (requestType === 'specific_data' && !String(details).trim()) {
    return res.status(400).json({ error: 'Please describe which data you want deleted.' })
  }
  if (!confirmed) {
    return res.status(400).json({ error: 'Please confirm that you understand the deletion is permanent.' })
  }

  // If the user is signed in, link the request to their account.
  // A request is "verified" only when the signed-in account's email matches.
  let userId = null
  let verified = false
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (token) {
    const { data } = await supabaseAdmin.auth.getUser(token)
    if (data?.user) {
      userId = data.user.id
      verified = (data.user.email || '').toLowerCase() === cleanEmail
    }
  }

  const row = {
    id: crypto.randomUUID(),
    email: cleanEmail,
    name: String(name).trim().slice(0, 120),
    user_id: userId,
    request_type: requestType,
    reason: String(reason).trim().slice(0, 200),
    details: String(details).trim().slice(0, 2000),
    verified,
    status: 'pending',
  }

  // Avoid duplicate pending requests from the same email.
  let requestId = null
  let saved = false
  try {
    const { data: existing } = await supabaseAdmin
      .from('deletion_requests')
      .select('id')
      .eq('email', cleanEmail)
      .eq('status', 'pending')
      .limit(1)
    if (existing && existing.length) {
      return res.status(200).json({ success: true, requestId: existing[0].id, duplicate: true })
    }

    // No .select() here: without the service role key, RLS hides rows from the inserter.
    const { error } = await supabaseAdmin.from('deletion_requests').insert(row)
    if (error) throw error
    requestId = row.id
    saved = true
  } catch (e) {
    console.error('Failed to save deletion request:', e.message)
  }

  const typeLabel = requestType === 'full_account' ? 'Delete entire account & all data' : 'Delete specific data only'

  const adminSent = await sendEmail(
    ADMIN_EMAILS.join(','),
    '🗑️ New Account Deletion Request — PawVerse',
    `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1E1347;">🗑️ New Deletion Request</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 6px 0; color: #6B7280;">Request ID</td><td style="font-weight: 700;">${escapeHtml(requestId || 'not saved to DB')}</td></tr>
        <tr><td style="padding: 6px 0; color: #6B7280;">Email</td><td style="font-weight: 700;">${escapeHtml(cleanEmail)}</td></tr>
        <tr><td style="padding: 6px 0; color: #6B7280;">Name</td><td style="font-weight: 700;">${escapeHtml(row.name || '-')}</td></tr>
        <tr><td style="padding: 6px 0; color: #6B7280;">User ID</td><td style="font-weight: 700;">${escapeHtml(userId || 'signed out')}</td></tr>
        <tr><td style="padding: 6px 0; color: #6B7280;">Verified</td><td style="font-weight: 700;">${verified ? '✅ Signed in with this email' : '⚠️ Not verified — confirm by email before deleting'}</td></tr>
        <tr><td style="padding: 6px 0; color: #6B7280;">Type</td><td style="font-weight: 700;">${typeLabel}</td></tr>
        <tr><td style="padding: 6px 0; color: #6B7280;">Reason</td><td>${escapeHtml(row.reason || '-')}</td></tr>
        <tr><td style="padding: 6px 0; color: #6B7280; vertical-align: top;">Details</td><td>${escapeHtml(row.details || '-').replace(/\n/g, '<br/>')}</td></tr>
      </table>
      <p style="color: #6B7280; font-size: 13px;">Please complete this request within 30 days. Manage it from the Super Admin → Deletion Requests tab.</p>
    </div>
    `
  )

  await sendEmail(
    cleanEmail,
    'We received your account deletion request — PawVerse',
    `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1E1347, #6C4BF6); padding: 26px; border-radius: 16px; text-align: center; margin-bottom: 20px;">
        <h1 style="color: #fff; margin: 0; font-size: 22px;">Deletion request received 🐾</h1>
      </div>
      <p style="color: #374151;">Hi${row.name ? ' ' + escapeHtml(row.name) : ''},</p>
      <p style="color: #374151;">We've received your request: <strong>${typeLabel}</strong>.</p>
      ${requestId ? `<p style="color: #374151;">Reference ID: <strong>${escapeHtml(requestId)}</strong></p>` : ''}
      <p style="color: #374151;">Our team may contact you at this address to verify that you own the account. Once verified, your request will be completed within <strong>30 days</strong> and we'll email you when it's done.</p>
      <p style="color: #374151;">If you did not make this request, simply reply to this email or contact support@pawversesocial.com and we will cancel it.</p>
      <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 20px;">PawVerse — The Social Universe for Your Fur Family 🐾</p>
    </div>
    `
  )

  if (!saved && !adminSent) {
    return res.status(500).json({
      error: 'We could not submit your request right now. Please email support@pawversesocial.com with the subject "Delete my account".',
    })
  }

  return res.status(200).json({ success: true, requestId })
}
