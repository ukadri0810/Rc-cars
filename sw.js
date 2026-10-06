const CACHE='kas-activityos-v4.5';
const STATIC=['./','./index.html','./style.css?v=4.5','./portal.css?v=4.5','./finance.css?v=4.5','./workspace.css?v=4.5','./navigation.css?v=4.5','./app.js?v=4.5','./activity-os.js?v=4.5','./portal-ui.js?v=4.5','./finance-ui.js?v=4.5','./settlement.js?v=4.5','./workspace-ui.js?v=4.5','./equipment-ui.js?v=4.5','./navigation-ui.js?v=4.5','./manifest.json','./assets/kas-logo.png','./assets/icon-192.png','./assets/icon-512.png','./assets/time-over-ringer.wav'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC.map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('kas-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 if(event.request.mode==='navigate'){
  event.respondWith(fetch(event.request,{cache:'no-cache'}).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put('./index.html',copy)))}return response}).catch(()=>caches.open(CACHE).then(cache=>cache.match('./index.html'))));return;
 }
 event.respondWith(caches.open(CACHE).then(async cache=>{const cached=await cache.match(event.request);if(cached)return cached;const response=await fetch(event.request);if(response.ok)event.waitUntil(cache.put(event.request,response.clone()));return response}));
});
