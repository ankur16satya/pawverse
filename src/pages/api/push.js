import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ── VAPID SETUP ──
const VAPID_PUBLIC_KEY = 'BMkQXUNaNbEpyVYllsyc4784dZJM2dMwAwoWJCnqBjOsjcu9QFPWWZ60L_wRMw-FZAYdMCZTnooVtth3V5VEzB38';
const VAPID_PRIVATE_KEY = 'ytm81NBachqjG7CSzcOHPQM_zJbIqswM0lqrjjtzuiU';

webpush.setVapidDetails(
  'mailto:ankur16satya@gmail.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const { user_id, title, body, icon, url } = req.body;

  if (!user_id) return res.status(400).json({ error: 'user_id is required' });

  try {
    // ── Get all subscriptions for this user ──
    const { data: subs, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', user_id);

    if (error) throw error;
    if (!subs || subs.length === 0) return res.status(200).json({ success: true, message: 'No subscriptions found' });

    const payload = JSON.stringify({
      title: title || '🐾 Pawverse',
      body: body || 'You have a new notification!',
      icon: icon || '/logo.png',
      url: url || '/'
    });

    const results = await Promise.all(
      subs.map(s => 
        webpush.sendNotification(s.subscription, payload)
          .catch(e => {
            if (e.statusCode === 410 || e.statusCode === 404) {
              // Subscription expired/invalid -> remove it from DB
              return supabaseAdmin.from('push_subscriptions').delete().eq('subscription', s.subscription);
            }
            console.error('Push send error:', e);
          })
      )
    );

    res.status(200).json({ success: true, resultsCount: results.length });
  } catch (err) {
    console.error('Push API error:', err);
    res.status(500).json({ error: 'Failed to send push notification' });
  }
}
