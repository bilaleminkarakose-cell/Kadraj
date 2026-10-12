/* Kadraj: çevrimdışı açılış, ana ekran desteği ve bildirime dokununca uygulamayı açma. Her zaman önce internetten en yeni sürümü dener. */
const C="kadraj-v42";
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png"])).catch(()=>{}))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);if(u.origin!==location.origin)return;
 e.respondWith(fetch(r,{cache:"no-cache"}).then(res=>{if(res&&res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(r,cp)).catch(()=>{})}return res}).catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match("./index.html"))))});
/* bildirime dokununca: açık Kadraj varsa öne getir ve ilgili sohbete/paylaşıma git; yoksa Kadraj'ı o sayfayla aç */
self.addEventListener("notificationclick",e=>{e.notification.close();const key=(e.notification.data&&e.notification.data.key)||"";
 const url=new URL("./"+(key?"#open="+encodeURIComponent(key):""),self.registration.scope).href;
 e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(cs=>{
  for(const c of cs){if(c.url.startsWith(self.registration.scope)&&"focus"in c){if(key)c.postMessage({type:"kadraj-open",key});return c.focus()}}
  return self.clients.openWindow?self.clients.openWindow(url):null}))});
