/* ── SERVICE WORKER SUICIDE SCRIPT ── */
/* This script is used to break infinite reload loops caused by development caching. */

self.addEventListener('install', () => {
  self.skipWaiting(); // Immediately activate the new worker
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 1. Unregister this service worker
      await self.registration.unregister();
      
      // 2. Clear all browser caches for this site
      if (self.caches) {
        const names = await caches.keys();
        await Promise.all(names.map(name => caches.delete(name)));
      }
      
      // 3. Force-reload all open windows to get fresh content from server
      const windows = await self.clients.matchAll({ type: 'window' });
      for (const client of windows) {
        if (client.url && 'navigate' in client) {
          client.navigate(client.url);
        }
      }
      
      console.log('✅ Service Worker and Caches cleared.');
    })()
  );
});
