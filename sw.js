/* Service worker cho "Bé Vui Học" — giúp cài đặt như ứng dụng và chơi offline.
   Tăng số phiên bản CACHE mỗi khi cập nhật để trình duyệt tải lại bản mới. */
const CACHE = 'be-vui-hoc-v3';

// Các tệp cốt lõi cần có sẵn để chơi khi không có mạng (dùng đường dẫn tương đối
// để hoạt động cả khi trang đặt trong thư mục con, ví dụ GitHub Pages).
const CORE_ASSETS = [
  '.',
  'index.html',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-192.png',
  'icon-maskable-512.png',
  'apple-touch-icon-180.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Chiến lược: ưu tiên bản đã lưu (chạy nhanh + offline), đồng thời tải lại
// ngầm để cập nhật lần sau. Nếu không có mạng và không có bản lưu, với yêu cầu
// mở trang thì trả về trang chính đã lưu.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith((async () => {
    const cached = await caches.match(req);

    const fromNetwork = fetch(req).then((res) => {
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => null);

    if (cached) {
      fromNetwork; // cập nhật ngầm, không chờ
      return cached;
    }

    const res = await fromNetwork;
    if (res) return res;

    if (req.mode === 'navigate') {
      return (await caches.match('index.html')) || (await caches.match('.')) || Response.error();
    }
    return Response.error();
  })());
});
