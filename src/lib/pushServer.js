// Server-side web push helper (used by /api/push and /api/notify).
import webpush from 'web-push'

// Must match the public key used by src/lib/push.js when browsers subscribe
// (NEXT_PUBLIC_VAPID_PUBLIC_KEY in .env.local is a different, unused key).
const VAPID_PUBLIC_KEY = 'BMkQXUNaNbEpyVYllsyc4784dZJM2dMwAwoWJCnqBjOsjcu9QFPWZ60L_wRMw-FZAYdMCZTnooVtth3V5VEzB38'
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'ytm81NBachqjG7CSzcOHPQM_zJbIqswM0lqrjjtzuiU'

webpush.setVapidDetails('mailto:support@pawversesocial.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const BATCH = 50

// Sends one push payload to every device of the given users (or all users when userIds is null).
// `db` is a Supabase client allowed to read push_subscriptions.
export async function sendPushToUsers(db, userIds, { title, body, url, icon }) {
  let query = db.from('push_subscriptions').select('user_id, subscription')
  if (userIds) {
    if (!userIds.length) return { sent: 0 }
    query = query.in('user_id', userIds)
  }
  const { data: subs, error } = await query
  if (error) throw error

  const payload = JSON.stringify({
    title: title || '🐾 Pawverse',
    body: body || 'You have a new notification!',
    icon: icon || '/logo.png',
    url: url || '/',
  })

  let sent = 0
  for (let i = 0; i < (subs || []).length; i += BATCH) {
    await Promise.all(subs.slice(i, i + BATCH).map(s =>
      webpush.sendNotification(s.subscription, payload)
        .then(() => { sent++ })
        .catch(e => {
          if (e.statusCode === 410 || e.statusCode === 404) {
            return db.from('push_subscriptions').delete().eq('subscription', s.subscription)
          }
          console.error(`Push error for ${s.user_id}:`, e.message || e)
        })
    ))
  }
  return { sent }
}
