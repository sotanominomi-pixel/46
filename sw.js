// ===========================
// N Clock Service Worker
// ===========================
const CACHE_NAME = 'nclock-cache-v2';
const FILES_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-icon-192.png',
  './icons/maskable-icon-512.png'
];

// --- インストール時：キャッシュ登録 ---
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

// --- 有効化時：古いキャッシュ削除 ---
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }))
    )
  );
  self.clients.claim();
});

// --- fetch時：キャッシュ優先（オフライン対応） ---
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // キャッシュにあればそれを返す
      if (response) return response;

      // ネットに繋がっていればフェッチしてキャッシュ更新
      return fetch(event.request).then(networkResponse => {
        // 画像やHTMLだけキャッシュ対象にする（無限肥大防止）
        if (
          event.request.url.includes('.png') ||
          event.request.url.endsWith('.html') ||
          event.request.url.endsWith('.css') ||
          event.request.url.endsWith('.js')
        ) {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(() => caches.match('./index.html')); // オフライン時フォールバック
    })
  );
});
