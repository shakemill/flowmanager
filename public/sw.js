// Service worker minimal (évite le 404 sur GET /sw.js)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
