// Client helper: asks /api/notify to create the in-app notification + phone push.
import { supabase } from './supabase'

export async function notify(body) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    })
  } catch (e) {
    console.error('Notify failed:', e)
  }
}

export const notifyFriendRequest = (receiverId) => notify({ type: 'friend_request', receiverId })
export const notifyNewAdoption = (listingId) => notify({ type: 'adoption', listingId })
