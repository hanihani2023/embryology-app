// 오프라인 지원: 앱 파일과 데이터를 캐시해 두고, 온라인일 때는 새 버전을 받아 갱신한다.
// 데이터나 앱 파일을 바꾸면 VERSION을 올린다.
const VERSION = "v12-2026-11-28";
const CORE = [
  "./", "index.html", "manifest.webmanifest",
  "app/styles.css", "app/main.js", "app/data.js", "app/body.js", "app/study.js", "app/stages.js", "app/body.jpg", "app/icon.svg",
  ...["early", "lineage", "folding", "pharyngeal", "face", "cardiovascular", "cavities", "urogenital", "teratology"].map(m => `data/${m}.json`),
  ...["zyg", "c2", "c4", "mor", "bla", "impl", "bil", "exm", "gas", "np", "nt", "fold", "w5", "w6", "w8", "w12", "w20", "birth"].map(s => `app/stages/${s}.jpg`)
];

self.addEventListener("install", e => {
  // cache: "reload" — 브라우저 HTTP 캐시(GitHub Pages는 10분)에 남은 예전 파일을 새 버전에 담지 않도록 서버에서 새로 받는다.
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// 같은 출처 요청: 네트워크 우선(서버에 바뀌었는지 매번 확인), 실패하면 캐시. 글꼴 등 다른 출처: 캐시 우선.
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const same = new URL(req.url).origin === location.origin;
  if (same) {
    e.respondWith(fetch(req, { cache: "no-cache" }).then(res => {
      const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res;
    }).catch(() => caches.match(req, { ignoreSearch: true })));
  } else {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res;
    })));
  }
});
