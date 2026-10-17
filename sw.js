/* Kadraj: çevrimdışı açılış, ana ekran desteği, bildirime dokununca uygulamayı açma ve (5.1) uygulama kapalıyken gelen bildirimler (Web Push).
   Her zaman önce internetten en yeni sürümü dener. */
const C="kadraj-v51";
const ICON="icon-192.png",BADGE="badge-96.png";
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png","./badge-96.png"])).catch(()=>{}))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C&&k!=="kadraj-open").map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);if(u.origin!==location.origin)return;
 e.respondWith(fetch(r,{cache:"no-cache"}).then(res=>{if(res&&res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(r,cp)).catch(()=>{})}return res}).catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match("./index.html"))))});
const scope=()=>self.registration.scope;
const mine=c=>c.url.startsWith(scope());
const MSG_ACTIONS=[{action:"reply",title:"Yanıtla"},{action:"heart",title:"Kalp at"},{action:"seen",title:"Görüldü"}];
/* 5.1: uygulama kapalıyken gelen bildirim (Kadraj köprüsü /push gönderir; yük RFC 8291 ile şifreli, tarayıcı çözer) */
self.addEventListener("push",e=>{let d={};try{d=e.data?e.data.json():{}}catch{try{d={body:e.data.text()}}catch{}}e.waitUntil(showPush(d||{}))});
async function showPush(d){
 const kind=String(d.kind||"msg"),key=String(d.key||""),tag=String(d.tag||"kadraj").slice(0,80),at=+d.at||Date.now();
 let title=String(d.title||"Kadraj").slice(0,80),body=String(d.body||"").slice(0,240);
 const cs=await self.clients.matchAll({type:"window",includeUncontrolled:true});
 /* Kadraj ekranda açıksa uygulama kendi kartını gösterir (Chrome görünür sekmede bildirim istemez; Safari her seferinde ister) */
 const ua=(self.navigator&&self.navigator.userAgent)||"";const safari=/Safari\//.test(ua)&&!/Chrome|Chromium|Edg|OPR|Android/.test(ua);
 if(!safari&&cs.some(c=>mine(c)&&c.visibilityState==="visible"&&c.focused!==false))return;
 /* aynı sohbetten birikenler tek bildirimde, son üç satır */
 let lines=[body],n=1,dup=false;
 const same=(x,y)=>!!x&&!!y&&String(x).slice(0,60)===String(y).slice(0,60);
 try{const ex=await self.registration.getNotifications({tag});for(const x of ex){const xd=x.data||{};
  /* uygulama arka planda açıkken aynı mesajı kendisi de göstermiş olabilir: ikinci kez çalmasın */
  if(xd.at&&Math.abs(xd.at-at)<20000&&same(xd.body,body)){dup=true;lines=Array.isArray(xd.lines)?xd.lines:[body];n=xd.n||1}
  else if(kind==="msg"&&xd.kind==="msg"){lines=[...(Array.isArray(xd.lines)?xd.lines:[xd.body||x.body]),body].filter(Boolean).slice(-3);n=(xd.n||1)+1}}}catch{}
 if(n>1){body=lines.join("\n");title=title+" · "+n+" yeni mesaj"}
 const opts={body,tag,icon:ICON,badge:BADGE,renotify:!dup,silent:false,timestamp:at,vibrate:kind==="call"?[300,150,300,150,300]:[70,40,70],
  data:{key,mid:String(d.mid||""),cid:String(d.cid||""),from:String(d.from||""),kind,at,tag,lines,n,body:String(d.body||"")},
  actions:kind==="msg"&&key?MSG_ACTIONS:[],requireInteraction:kind==="call"};
 try{await self.registration.showNotification(title,opts)}catch{const{actions,...o}=opts;await self.registration.showNotification(title,o)}}
/* bildirime dokununca: açık Kadraj varsa öne getir ve ilgili sohbete/paylaşıma git; yoksa Kadraj'ı o sayfayla aç */
self.addEventListener("notificationclick",e=>{e.notification.close();const nd=e.notification.data||{};const key=nd.key||"";const at=Date.now();
 /* 5.1 eylem düğmeleri: Yanıtla / Kalp at / Görüldü → uygulamaya iletilir (yazmayı kişinin oturumu yapar) */
 if(e.action==="reply"||e.action==="heart"||e.action==="seen"){e.waitUntil(doAction(e.action,nd,at));return}
 const url=new URL("./"+(key?"#open="+encodeURIComponent(key):""),self.registration.scope).href;
 /* 4.4.4: hedef önbelleğe de yazılır; uygulama öne gelince oradan okur (mesaj kaybolsa da gider) */
 const save=key?caches.open("kadraj-open").then(c=>c.put(new URL("__open",self.registration.scope).href,new Response(JSON.stringify({key,at}),{headers:{"content-type":"application/json"}}))).catch(()=>{}):Promise.resolve();
 e.waitUntil(save.then(()=>self.clients.matchAll({type:"window",includeUncontrolled:true})).then(cs=>{
  for(const c of cs){if(c.url.startsWith(self.registration.scope)&&"focus"in c){if(key)c.postMessage({type:"kadraj-open",key,at});return c.focus().catch(()=>self.clients.openWindow?self.clients.openWindow(url):null)}}
  return self.clients.openWindow?self.clients.openWindow(url):null}))});
async function doAction(action,nd,at){
 const msg={type:"kadraj-action",action,key:String(nd.key||""),mid:String(nd.mid||""),cid:String(nd.cid||""),from:String(nd.from||""),tag:String(nd.tag||""),at};
 try{const c=await caches.open("kadraj-open");await c.put(new URL("__act",scope()).href,new Response(JSON.stringify(msg),{headers:{"content-type":"application/json"}}))}catch{}
 const cs=await self.clients.matchAll({type:"window",includeUncontrolled:true});const c=cs.find(mine);
 if(c){c.postMessage(msg);if(action==="reply"&&"focus"in c){try{await c.focus()}catch{if(self.clients.openWindow)await self.clients.openWindow(scope())}}return}
 /* açık Kadraj yok: eylem için uygulama açılır (bekleyen eylem "__act" önbelleğinden okunur) */
 if(self.clients.openWindow)await self.clients.openWindow(new URL("./",scope()).href)}
/* abonelik tarayıcı tarafından yenilenirse: açık sayfa yeni aboneliği kaydeder */
self.addEventListener("pushsubscriptionchange",e=>{e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(cs=>{for(const c of cs)if(mine(c))c.postMessage({type:"kadraj-pushsub"})}))});
