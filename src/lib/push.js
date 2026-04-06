import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = 'BMkQXUNaNbEpyVYllsyc4784dZJM2dMwAwoWJCnqBjOsjcu9QFPWWZ60L_wRMw-FZAYdMCZTnooVtth3V5VEzB38';

export const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const subscribeUserToPush = async (user) => {
  if (!user || typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.error('Push notifications are not supported or user is not logged in');
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    
    // First, try to get existing subscription and unsubscribe to "refresh" it
    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) {
      await existingSub.unsubscribe();
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    
    // Save/Update subscription in database
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      subscription: subscription.toJSON()
    }, { onConflict: 'user_id' });
    
    if (error) throw error;
    
    console.log('✅ Push Subscription active and synced to DB');
    return true;
  } catch (error) {
    console.error('❌ Push Subscription failed:', error);
    return false;
  }
};
