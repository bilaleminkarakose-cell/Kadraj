// Kadraj 5.1 Web Push testleri: VAPID JWT, RFC 8291 şifreleme (ters çevirerek çözülür), /vapid ve /push yolları
import http from "node:http";
// Çalıştır: ai-worker klasöründe  node test/push-test.mjs   (hazır paketi denemek için: BUNDLE=hazir/kadraj-ai.js)
const WT=new URL("../src/",import.meta.url).href;
const W=(await import(process.env.BUNDLE?new URL("../"+process.env.BUNDLE,import.meta.url).href:(WT+"index.js"))).default;
const P=await import(WT+"push.js");
const {b64u,unb64u,concat,hkdf}=P;
const te=new TextEncoder(),td=new TextDecoder();
const ok=(c,m)=>{console.log((c?"PASS ":"FAIL ")+m);if(!c)process.exitCode=1};
// Firebase sahte JWKS
const kp=await crypto.subtle.generateKey({name:"RSASSA-PKCS1-v1_5",modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:"SHA-256"},true,["sign","verify"]);
const pubj=await crypto.subtle.exportKey("jwk",kp.publicKey);
async function jwt(over={}){const now=Math.floor(Date.now()/1000);const h=b64u(te.encode(JSON.stringify({alg:"RS256",kid:"k1"})));const p=b64u(te.encode(JSON.stringify({aud:"kadraj-6f1e0",iss:"https://securetoken.google.com/kadraj-6f1e0",sub:"u1",iat:now-10,exp:now+3600,...over})));const sig=await crypto.subtle.sign("RSASSA-PKCS1-v1_5",kp.privateKey,te.encode(h+"."+p));return h+"."+p+"."+b64u(new Uint8Array(sig))}
const srv=http.createServer((q,r)=>{r.setHeader("content-type","application/json");r.end(JSON.stringify({keys:[{...pubj,kid:"k1",alg:"RS256",use:"sig"}]}))});
await new Promise(r=>srv.listen(0,r));const port=srv.address().port;
// VAPID anahtarı (vapid-anahtar.mjs ile aynı yol)
const vk=await crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},true,["sign","verify"]);
const vpub=b64u(new Uint8Array(await crypto.subtle.exportKey("raw",vk.publicKey)));const vjwk=await crypto.subtle.exportKey("jwk",vk.privateKey);
const env={JWKS_URL:`http://127.0.0.1:${port}/jwks`,ALLOWED_ORIGINS:"https://kadrajsosyalmedya.github.io",FIREBASE_PROJECT:"kadraj-6f1e0",VAPID_PUBLIC_KEY:vpub,VAPID_PRIVATE_KEY:vjwk.d,VAPID_SUBJECT:"mailto:test@kadraj.test",PUSH_DAILY_LIMIT:"6"};
const O="https://kadrajsosyalmedya.github.io";
// tarayıcı tarafı abonelik (ua) anahtarları
async function mkSub(host="fcm.googleapis.com"){const ua=await crypto.subtle.generateKey({name:"ECDH",namedCurve:"P-256"},true,["deriveBits"]);const uaPub=new Uint8Array(await crypto.subtle.exportKey("raw",ua.publicKey));const auth=crypto.getRandomValues(new Uint8Array(16));
 return {ua,uaPub,auth,sub:{endpoint:`https://${host}/fcm/send/abc`+Math.random().toString(36).slice(2),keys:{p256dh:b64u(uaPub),auth:b64u(auth)}}}}
// RFC 8291 ters çevirme: tarayıcının yaptığı gibi çöz
async function decrypt(body,s){const salt=body.slice(0,16);const rs=(body[16]<<24)|(body[17]<<16)|(body[18]<<8)|body[19];const idlen=body[20];const asPub=body.slice(21,21+idlen);const ct=body.slice(21+idlen);
 const asKey=await crypto.subtle.importKey("raw",asPub,{name:"ECDH",namedCurve:"P-256"},false,[]);
 const ecdh=new Uint8Array(await crypto.subtle.deriveBits({name:"ECDH",public:asKey},s.ua.privateKey,256));
 const ikm=await hkdf(s.auth,ecdh,concat(te.encode("WebPush: info\0"),s.uaPub,asPub),32);
 const cek=await hkdf(salt,ikm,te.encode("Content-Encoding: aes128gcm\0"),16);const nonce=await hkdf(salt,ikm,te.encode("Content-Encoding: nonce\0"),12);
 const k=await crypto.subtle.importKey("raw",cek,{name:"AES-GCM"},false,["decrypt"]);const pt=new Uint8Array(await crypto.subtle.decrypt({name:"AES-GCM",iv:nonce,tagLength:128},k,ct));
 let end=pt.length-1;while(end>=0&&pt[end]===0)end--;if(pt[end]!==2)throw new Error("delimiter");return {rs,idlen,text:td.decode(pt.slice(0,end))}}
// 1) şifreleme birim testi
const s1=await mkSub();
const enc=await P.encryptPayload(s1.sub,"Merhaba Kadraj — ğüşiöç");
const d1=await decrypt(enc,s1);ok(d1.text==="Merhaba Kadraj — ğüşiöç"&&d1.rs===4096&&d1.idlen===65,"RFC 8291 round trip (rs 4096, keyid 65, 0x02 delimiter)");
const s1b=await mkSub();let bad=false;try{await decrypt(enc,s1b)}catch{bad=true}ok(bad,"wrong subscriber key cannot decrypt");
// Bağımsız uygulama ile çapraz denetim: http_ece (Mozilla, web-push kütüphanesinin kullandığı) bizim çıktımızı çözebilmeli
{const {createRequire}=await import("node:module");const req=createRequire(import.meta.url);let ece=null;try{ece=req(process.env.HTTP_ECE||"http_ece")}catch{}if(!ece)console.log("SKIP http_ece çapraz denetimi (npm i http_ece ya da HTTP_ECE=yol)");else{const nc=await import("node:crypto");
 const ecdh=nc.createECDH("prime256v1");ecdh.generateKeys();const sub={endpoint:"https://fcm.googleapis.com/x",keys:{p256dh:b64u(ecdh.getPublicKey()),auth:b64u(crypto.getRandomValues(new Uint8Array(16)))}};
 const out=await P.encryptPayload(sub,"Kadraj http_ece çapraz denetim");
 const pt=ece.decrypt(Buffer.from(out),{version:"aes128gcm",privateKey:ecdh,authSecret:sub.keys.auth});
 ok(pt.toString("utf8")==="Kadraj http_ece çapraz denetim","independent http_ece library decrypts our aes128gcm payload");
 const back=ece.encrypt(Buffer.from("geri yön"),{version:"aes128gcm",privateKey:(()=>{const a=nc.createECDH("prime256v1");a.generateKeys();return a})(),dh:ecdh.getPublicKey(),authSecret:sub.keys.auth});
 ok(back.length>21+65,"http_ece encrypt available for symmetry");}}
// 2) VAPID JWT doğrulaması
const jw=await P.vapidJwt("https://fcm.googleapis.com/fcm/send/xyz",env);const [h,p,sg]=jw.split(".");
const vpubKey=await crypto.subtle.importKey("raw",unb64u(vpub),{name:"ECDSA",namedCurve:"P-256"},false,["verify"]);
ok(await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},vpubKey,unb64u(sg),te.encode(h+"."+p)),"VAPID JWT ES256 signature verifies with public key");
const pj=JSON.parse(td.decode(unb64u(p)));ok(pj.aud==="https://fcm.googleapis.com"&&pj.sub==="mailto:test@kadraj.test"&&pj.exp>Date.now()/1000&&pj.exp<Date.now()/1000+86400,"VAPID claims aud/sub/exp");
ok(JSON.parse(td.decode(unb64u(h))).alg==="ES256","JWT header ES256");
const envJ={...env,VAPID_PRIVATE_KEY:JSON.stringify(vjwk)};const jw2=await P.vapidJwt("https://web.push.apple.com/x",envJ);const [h2,p2,s2]=jw2.split(".");
ok(await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},vpubKey,unb64u(s2),te.encode(h2+"."+p2)),"VAPID private key as JWK works");
let mm=false;try{await P.vapidKeys({...env,VAPID_PUBLIC_KEY:b64u(s1.uaPub)})}catch(e){mm=/^vapid_(mismatch|private)$/.test(e.message)}ok(mm,"mismatched VAPID pair detected");
// 3) uç noktayı taklit et: global fetch, push sunucularını yakalar
const realFetch=globalThis.fetch;let pushes=[];let statusFor=()=>201;
globalThis.fetch=async(u,o={})=>{const url=typeof u==="string"?u:u.url;if(/^https:\/\/(fcm\.googleapis\.com|web\.push\.apple\.com|updates\.push\.services\.mozilla\.com)\//.test(url)){pushes.push({url,headers:o.headers,body:new Uint8Array(o.body)});return new Response("",{status:statusFor(url)})}return realFetch(u,o)};
const call=async(path,{method="POST",body,tok,origin=O,e=env}={})=>{const r=await W.fetch(new Request("https://w.example"+path,{method,headers:{Origin:origin,"Content-Type":"application/json",...(tok!==null?{Authorization:"Bearer "+(tok||await jwt())}:{})},...(body?{body:JSON.stringify(body)}:{})}),e);let j=null;try{j=await r.json()}catch{}return {status:r.status,json:j,acao:r.headers.get("access-control-allow-origin")}};
let r=await call("/vapid",{method:"GET",tok:null});ok(r.status===200&&r.json.key===vpub&&r.acao===O,"GET /vapid returns public key");
r=await call("/vapid",{method:"GET",tok:null,e:{...env,VAPID_PRIVATE_KEY:""}});ok(r.status===501&&r.json.error==="no_vapid","GET /vapid without keys 501");
r=await call("/vapid",{method:"GET",tok:null,e:{...env,VAPID_PRIVATE_KEY:"bozuk"}});ok(r.status===500&&r.json.error==="bad_vapid","GET /vapid with broken key 500 + message");
let hr=await W.fetch(new Request("https://w.example/health",{headers:{Origin:O}}),env);ok((await hr.json()).push===true,"health reports push");
const s2_=await mkSub(),s3=await mkSub("web.push.apple.com"),sGone=await mkSub();
r=await call("/push",{body:{subscriptions:[s2_.sub],payload:{title:"Ayşe"}},tok:null});ok(r.status===401,"push without token 401");
r=await call("/push",{body:{subscriptions:[s2_.sub],payload:{}},origin:"https://evil.example"});ok(r.status===403,"push foreign origin 403");
r=await call("/push",{body:{subscriptions:[s2_.sub],payload:{}},e:{...env,VAPID_PUBLIC_KEY:""}});ok(r.status===501,"push without VAPID 501");
pushes=[];statusFor=u=>u===sGone.sub.endpoint?410:201;
r=await call("/push",{body:{subscriptions:[s2_.sub,s3.sub,sGone.sub,{endpoint:"https://evil.example/x",keys:s2_.sub.keys},{endpoint:"http://fcm.googleapis.com/x",keys:s2_.sub.keys}],payload:{title:"Ayşe Yılmaz",body:"Selam! Nasılsın?",kind:"msg",key:"u:u9",tag:"m-dm-u1-u9",mid:"abc123",cid:"dm-u1-u9",from:"sahte",icon:"https://evil/x.png",at:123}}});
ok(r.status===200&&r.json.ok===true&&r.json.results.length===5,"push 200 with per-subscription results");
const res=r.json.results;ok(res[0].ok&&res[1].ok&&res[2].gone&&res[2].status===410&&res[3].error==="invalid"&&res[4].error==="invalid","statuses: ok, ok, gone(410), invalid host, invalid http");
ok(pushes.length===3,"only valid push services contacted ("+pushes.length+")");
const p0=pushes.find(x=>x.url===s2_.sub.endpoint);ok(p0.headers["Content-Encoding"]==="aes128gcm"&&p0.headers.TTL==="86400"&&p0.headers.Urgency==="high"&&/^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=/.test(p0.headers.Authorization)&&p0.headers.Authorization.endsWith("k="+vpub)&&p0.headers.Topic.length===32,"push request headers (aes128gcm, TTL, Urgency, vapid t/k, Topic)");
const dj=await decrypt(p0.body,s2_);const pl=JSON.parse(dj.text);
ok(pl.title==="Ayşe Yılmaz"&&pl.body==="Selam! Nasılsın?"&&pl.key==="u:u9"&&pl.mid==="abc123"&&pl.cid==="dm-u1-u9"&&pl.kind==="msg"&&pl.at===123,"decrypted payload fields");
ok(pl.from==="u1"&&!("icon" in pl),"sender uid set by worker (client 'from' ignored), icon dropped");
const pa=pushes.find(x=>x.url===s3.sub.endpoint);
const aud=JSON.parse(td.decode(unb64u(pa.headers.Authorization.split("t=")[1].split(",")[0].split(".")[1]))).aud;ok(aud==="https://web.push.apple.com","per-endpoint JWT audience");
ok((JSON.parse((await decrypt(pa.body,s3)).text)).title==="Ayşe Yılmaz","apple subscription decrypts");
pushes=[];r=await call("/push",{body:{subscription:s2_.sub,payload:{title:"x".repeat(500),body:"y\u0000z".repeat(200),key:"javascript:alert(1)",tag:"bad tag!",kind:"evil"}},tok:await jwt({sub:"u2"})});
const pl2=JSON.parse((await decrypt(pushes[0].body,s2_)).text);ok(pl2.title.length===80&&pl2.body.length<=180&&!pl2.body.includes("\u0000")&&pl2.key===""&&pl2.tag==="kadraj"&&pl2.kind==="msg"&&pl2.from==="u2","single subscription + payload sanitized");
r=await call("/push",{body:{subscriptions:Array.from({length:21},()=>s2_.sub),payload:{}},tok:await jwt({sub:"u3"})});ok(r.status===400&&r.json.error==="too_many","more than 20 subscriptions rejected");
r=await call("/push",{body:{payload:{}},tok:await jwt({sub:"u3"})});ok(r.status===400,"no subscription 400");
let last;for(let i=0;i<8;i++)last=await call("/push",{body:{subscription:s2_.sub,payload:{title:"q"}},tok:await jwt({sub:"u7"})});ok(last.status===429&&last.json.error==="rate_limited","push daily limit enforced (6)");
pushes=[];r=await call("/push",{body:{subscription:s2_.sub,payload:{title:"Ali arıyor",kind:"call"}},tok:await jwt({sub:"u4"})});ok(pushes[0].headers.TTL==="60"&&pushes[0].headers.Urgency==="high","call push short TTL");
pushes=[];r=await call("/push",{body:{subscription:s2_.sub,payload:{title:"beğeni",kind:"like"}},tok:await jwt({sub:"u4"})});ok(pushes[0].headers.Urgency==="normal","like push normal urgency");
globalThis.fetch=async(u,o)=>{const url=typeof u==="string"?u:u.url;if(url.startsWith("https://fcm"))throw new Error("net");return realFetch(u,o)};
r=await call("/push",{body:{subscription:s2_.sub,payload:{title:"q"}},tok:await jwt({sub:"u5"})});ok(r.status===200&&r.json.ok===false&&r.json.results[0].status===0,"network error reported per subscription");
globalThis.fetch=realFetch;
r=await call("/ask",{body:{messages:[{role:"user",content:"x"}]}});ok(r.status===500&&r.json.error==="no_key","ask route unaffected");
r=await W.fetch(new Request("https://w.example/push",{method:"OPTIONS",headers:{Origin:O}}),env);ok(r.status===204,"push preflight");
srv.close();
