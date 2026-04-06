self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', () => { console.log('Pawverse SW Active'); });
self.addEventListener('fetch', () => {});
