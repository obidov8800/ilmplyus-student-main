/*
 * Internet yo'qligida sahifa o'rniga brauzerning «dinozavr»/«sahifa yuklanmadi» oynasi emas, saytning o'z
 * «Internet aloqasi yo'q» sahifasi (offline.html) chiqishi uchun service worker.
 *
 * ATAYLAB MINIMAL: faqat sahifa MANZILIGA kirish (navigate) so'rovlari kuzatiladi. Internet bor bo'lsa so'rov
 * odatdagidek serverga ketadi (hech narsa keshlanmaydi, eski sahifa ko'rinib qolmaydi, yangi versiya darhol
 * chiqadi); tarmoq umuman javob bermasa (offline, DNS/ulanish xatosi) — oldindan saqlab qo'yilgan offline.html.
 * Server xato kodi bilan javob bersa (403/500/502...) u o'zgarishsiz uzatiladi — ularni Apache'dagi
 * errors/*.html ko'rsatadi. JS/CSS/API so'rovlari bu fayldan o'tmaydi.
 *
 * Fayl `public/` ildizida turishi shart (scope = butun sayt) va `Cache-Control: no-cache` bilan beriladi
 * (`.htaccess`), shunda yangilanishi darhol ko'rinadi.
 */
const CACHE = 'offline-page-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(async () => (await caches.match(OFFLINE_URL)) || Response.error()),
  );
});
