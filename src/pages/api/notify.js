// POST (Authorization: Bearer <user access token>)
//   { type: 'friend_request', receiverId }  → notifies the person who received the request
//   { type: 'adoption', listingId }         → notifies every PawVerse user about a new adoption listing
// Each event is verified against the database so this can't be used to spam arbitrary notifications.
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '../../lib/supabaseAdmin'
import { sendPushToUsers } from '../../lib/pushServer'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const CHUNK = 500

// Without the service role key, fall back to acting as the signed-in user (same as client-side inserts).
const dbFor = (token) => supabaseAdmin || createClient(URL, ANON, {
  auth: { persistSession: false },
  global: { headers: { Authorization: `Bearer ${token}` } },
})

async function insertNotifications(db, rows) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await db.from('notifications').insert(rows.slice(i, i + CHUNK))
    if (error) throw error
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' })

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Not signed in' })
  const { data: auth } = await createClient(URL, ANON, { auth: { persistSession: false } }).auth.getUser(token)
  const user = auth?.user
  if (!user) return res.status(401).json({ error: 'Not signed in' })

  const db = dbFor(token)
  const { type } = req.body || {}

  try {
    const { data: senderPet } = await db.from('pets').select('pet_name, owner_name')
      .eq('user_id', user.id).eq('is_health_pet', false).maybeSingle()
    const senderName = senderPet?.pet_name || senderPet?.owner_name || 'Someone'

    // ── Friend request ──
    if (type === 'friend_request') {
      const { receiverId } = req.body
      if (!receiverId || receiverId === user.id) return res.status(400).json({ error: 'Invalid receiver' })

      const { data: fr } = await db.from('friend_requests').select('id')
        .eq('sender_id', user.id).eq('receiver_id', receiverId).eq('status', 'pending').maybeSingle()
      if (!fr) return res.status(404).json({ error: 'No pending friend request found' })

      const message = `${senderName} sent you a friend request! 🐾|/friends`

      // Skip duplicates (e.g. double clicks) within 10 minutes
      const since = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      const { data: dup } = await db.from('notifications').select('id')
        .eq('user_id', receiverId).eq('type', 'friend_request').eq('message', message).gte('created_at', since).limit(1)
      if (dup?.length) return res.status(200).json({ success: true, duplicate: true })

      await insertNotifications(db, [{ user_id: receiverId, type: 'friend_request', message }])
      await sendPushToUsers(db, [receiverId], {
        title: '👫 New Friend Request',
        body: `${senderName} wants to be your friend! 🐾`,
        url: '/friends',
      }).catch(e => console.error('friend request push failed:', e))

      return res.status(200).json({ success: true })
    }

    // ── New adoption listing → everyone ──
    if (type === 'adoption') {
      const { listingId } = req.body
      const { data: listing } = await db.from('adoption_listings')
        .select('id, user_id, name, type, breed, city, urgency, created_at').eq('id', listingId).maybeSingle()
      if (!listing || listing.user_id !== user.id) return res.status(404).json({ error: 'Listing not found' })
      if (Date.now() - new Date(listing.created_at).getTime() > 60 * 60 * 1000) {
        return res.status(400).json({ error: 'Listing is too old to announce' })
      }

      const link = `/adopt?listing=${listing.id}`
      const { data: already } = await db.from('notifications').select('id').like('message', `%|${link}`).limit(1)
      if (already?.length) return res.status(200).json({ success: true, duplicate: true })

      const petLabel = [listing.name, listing.breed || listing.type].filter(Boolean).join(', ')
      const urgentTag = listing.urgency === 'Emergency' || listing.urgency === 'Urgent' ? '🚨 Urgent: ' : ''
      const where = listing.city ? ` in ${listing.city}` : ''
      const message = `${urgentTag}${petLabel} is looking for a loving home${where}! 🏠|${link}`

      const { data: pets, error: petsErr } = await db.from('pets').select('user_id').eq('is_health_pet', false)
      if (petsErr) throw petsErr
      const recipients = [...new Set((pets || []).map(p => p.user_id).filter(id => id && id !== user.id))]

      try {
        await insertNotifications(db, recipients.map(id => ({ user_id: id, type: 'adoption', message })))
      } catch (e) {
        // Older databases may restrict notification types — fall back to a generic one.
        if (e.code !== '23514') throw e
        await insertNotifications(db, recipients.map(id => ({ user_id: id, type: 'post', message })))
      }

      const push = await sendPushToUsers(db, recipients, {
        title: `${urgentTag}🏠 New pet up for adoption!`,
        body: `${petLabel} is looking for a loving home${where}. Tap to see details.`,
        url: link,
        icon: '/logo.png',
      }).catch(e => { console.error('adoption push failed:', e); return { sent: 0 } })

      return res.status(200).json({ success: true, notified: recipients.length, pushed: push.sent })
    }

    return res.status(400).json({ error: 'Unknown notification type' })
  } catch (err) {
    console.error('notify error:', err)
    return res.status(500).json({ error: 'Failed to send notification' })
  }
}
