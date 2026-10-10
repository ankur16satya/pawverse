// POST { email, password, otp, profile } → verifies the email OTP, then creates a
// confirmed Supabase user + their main pets row. The client signs in afterwards.
import { supabaseAdmin, ADMIN_NOT_CONFIGURED } from '../../../lib/supabaseAdmin'
import { EMAIL_RE, normalizeEmail, verifyOtp, getUserIdByEmail } from '../../../lib/otp'

const ROLES = ['parent', 'lover', 'vet', 'supplier']
const clip = (v, n = 120) => String(v || '').trim().slice(0, n)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' })
  if (!supabaseAdmin) return res.status(500).json({ error: ADMIN_NOT_CONFIGURED })

  const email = normalizeEmail(req.body?.email)
  const { password, otp, profile = {} } = req.body || {}
  const role = ROLES.includes(profile.role) ? profile.role : 'parent'

  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' })
  if (typeof password !== 'string' || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' })
  if (!clip(profile.ownerName)) return res.status(400).json({ error: 'Please enter your name.' })
  if (role !== 'lover' && !clip(profile.petName)) return res.status(400).json({ error: 'Please fill in all required fields.' })

  try {
    if (await getUserIdByEmail(email)) {
      return res.status(409).json({ error: 'An account with this email already exists. Please sign in instead.' })
    }

    const check = await verifyOtp(email, 'signup', otp)
    if (!check.ok) return res.status(400).json({ error: check.error })

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { owner_name: clip(profile.ownerName), role },
    })
    if (createErr) return res.status(400).json({ error: createErr.message })
    const userId = created.user.id

    const ownerName = clip(profile.ownerName)
    const petName = clip(profile.petName)
    const { error: petErr } = await supabaseAdmin.from('pets').insert({
      user_id: userId,
      owner_name: ownerName,
      role, // parent | lover | vet | supplier
      pet_name: role === 'lover' ? (ownerName || 'Pet Lover') : petName,
      pet_type: role === 'lover' ? '🐾 Pet Lover' : clip(profile.petType, 60),
      pet_breed: clip(profile.petBreed),
      emoji: clip(profile.emoji, 8) || '🐾',
      paw_coins: role === 'parent' || role === 'lover' ? 150 : 0,
      bio: role === 'lover' ? `Hi, I love pets! 🐾` : `Hi, I'm ${petName}! 🐾`,
      location: 'India',
      is_health_pet: false,
      // Vet accounts start unverified; they upload their license at /doctor/admin.
      vet_verified: role === 'vet' ? false : null,
    })

    if (petErr) {
      // Roll back so the user can try again with the same email.
      await supabaseAdmin.auth.admin.deleteUser(userId)
      console.error('signup pets insert failed:', petErr)
      return res.status(500).json({ error: 'Could not create your profile. Please try again.' })
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('signup error:', err)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}
