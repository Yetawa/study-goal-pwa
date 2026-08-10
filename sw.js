/* 学习目标管理台 — Service Worker
 * 应用壳预缓存 + 离线可用。navigate 走 network-first（保证最新），
 * 静态资源走 cache-first（秒开 + 离线）。兼容 index.html 与中文文件名两种入口。
 */
const CACHE = 'studygoal-pwa-v2';
const PRE = [
  './',
  './index.html',
  './学习目标管理台.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './icon.svg'
];

self.addEventListener('install', function (e) {
  e.waitUntil((async function () {
    const c = await caches.open(CACHE);
    await Promise.all(PRE.map(async function (u) {
      try {
        const r = await fetch(u);
        if (r && r.ok) await c.put(u, r);
      } catch (_) { /* 缺失文件忽略，避免安装失败 */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    const ks = await caches.keys();
    await Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (r) {
        const cp = r.clone();
        caches.open(CACHE).then(function (c) { c.put(req, cp); });
        return r;
      }).catch(function () {
        return caches.match('./index.html')
          .then(function (m) { return m || caches.match('./学习目标管理台.html'); })
          .then(function (m) { return m || caches.match('./'); });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function (m) {
      return m || fetch(req).then(function (r) {
        const cp = r.clone();
        caches.open(CACHE).then(function (c) { c.put(req, cp); });
        return r;
      }).catch(function () { return caches.match('./'); });
    })
  );
});
