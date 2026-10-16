// Kadraj Web Push (5.1): uygulama kapalıyken bildirim.
// Standart Web Push: VAPID (RFC 8292, ES256 JWT) + yük şifreleme (RFC 8291, aes128gcm; ECDH P-256 + HKDF-SHA-256).
// Yalnızca WebCrypto kullanır; Cloudflare Workers'ta ve Node 20+'da aynı çalışır.

const te = new TextEncoder();

export function b64u(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < b.length; i += 32768) s += String.fromCharCode.apply(null, b.subarray(i, i + 32768));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function unb64u(s) {
  s = String(s || "").trim().replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
export function concat(...arrs) {
  let n = 0;
  for (const a of arrs) n += a.length;
  const out = new Uint8Array(n);
  let o = 0;
  for (const a of arrs) {
    out.set(a, o);
    o += a.length;
  }
  return out;
}
async function hmac(key, data) {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}
// HKDF (RFC 5869), çıktı en fazla 32 bayt (tek blok yeter)
export async function hkdf(salt, ikm, info, len) {
  const prk = await hmac(salt, ikm);
  const okm = await hmac(prk, concat(info, new Uint8Array([1])));
  return okm.slice(0, len);
}

// ---- VAPID anahtarları ----
// VAPID_PUBLIC_KEY: 65 baytlık sıkıştırılmamış P-256 noktası (base64url, 87 karakter; "B" ile başlar).
// VAPID_PRIVATE_KEY: 32 baytlık gizli sayı "d" (base64url, 43 karakter) ya da tam JWK (JSON).
let vapidCache = { src: "", key: null, pub: "" };
export async function vapidKeys(env) {
  const pubS = String(env.VAPID_PUBLIC_KEY || "").trim();
  const privS = String(env.VAPID_PRIVATE_KEY || "").trim();
  if (!pubS || !privS) throw new Error("vapid_missing");
  const src = pubS + "|" + privS;
  if (vapidCache.src === src && vapidCache.key) return vapidCache;
  let jwk;
  if (privS.startsWith("{")) {
    const j = JSON.parse(privS);
    jwk = { kty: "EC", crv: "P-256", d: j.d, x: j.x, y: j.y, ext: true };
  } else {
    const pub = unb64u(pubS);
    if (pub.length !== 65 || pub[0] !== 4) throw new Error("vapid_public");
    jwk = { kty: "EC", crv: "P-256", d: privS, x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), ext: true };
  }
  let key;
  try {
    key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  } catch {
    throw new Error("vapid_private");
  }
  // iki anahtar birbirini tutmalı (yoksa push hizmetleri her isteği reddeder): deneme imzası atıp açık anahtarla doğrula
  const pubFromJwk = b64u(concat(new Uint8Array([4]), unb64u(jwk.x), unb64u(jwk.y)));
  if (pubFromJwk !== pubS.replace(/=+$/, "")) throw new Error("vapid_mismatch");
  const probe = te.encode("kadraj-vapid");
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, probe);
  const pk = await crypto.subtle.importKey("raw", unb64u(pubS), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  if (!(await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pk, sig, probe))) throw new Error("vapid_mismatch");
  vapidCache = { src, key, pub: pubFromJwk };
  return vapidCache;
}

// VAPID JWT (ES256). WebCrypto imzası zaten JWS'nin istediği r||s (64 bayt) biçiminde.
export async function vapidJwt(endpoint, env, nowS = Math.floor(Date.now() / 1000)) {
  const { key } = await vapidKeys(env);
  const aud = new URL(endpoint).origin;
  let sub = String(env.VAPID_SUBJECT || "").trim();
  if (!/^(mailto:|https:)/.test(sub)) sub = "https://kadrajsosyalmedya.github.io/Kadraj/";
  const h = b64u(te.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const p = b64u(te.encode(JSON.stringify({ aud, exp: nowS + 12 * 3600, sub })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, te.encode(h + "." + p)));
  return h + "." + p + "." + b64u(sig);
}

// ---- RFC 8291 yük şifreleme (aes128gcm, tek kayıt) ----
// opts.asKeys / opts.salt yalnızca testler için (sabit değerlerle karşılaştırma).
export async function encryptPayload(sub, plaintext, opts = {}) {
  const uaPub = unb64u(sub.keys.p256dh);
  const auth = unb64u(sub.keys.auth);
  if (uaPub.length !== 65 || auth.length < 16) throw new Error("bad_keys");
  const as = opts.asKeys || (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]));
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", as.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, as.privateKey, 256));
  const keyInfo = concat(te.encode("WebPush: info\0"), uaPub, asPub);
  const ikm = await hkdf(auth, ecdh, keyInfo, 32);
  const salt = opts.salt || crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, te.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, te.encode("Content-Encoding: nonce\0"), 12);
  const body = typeof plaintext === "string" ? te.encode(plaintext) : plaintext;
  const padded = concat(body, new Uint8Array([2])); // son kayıt ayracı, dolgu yok
  const k = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, tagLength: 128 }, k, padded));
  const rs = 4096;
  const header = concat(salt, new Uint8Array([(rs >>> 24) & 255, (rs >>> 16) & 255, (rs >>> 8) & 255, rs & 255, asPub.length]), asPub);
  return concat(header, ct);
}

// Yalnızca bilinen push hizmetlerine gönderilir (Worker başka adreslere istek atmak için kullanılamasın).
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)notify\.windows\.com$/, /(^|\.)push\.apple\.com$/, /^web\.push\.apple\.com$/];
export function validSub(s, env) {
  if (!s || typeof s !== "object" || typeof s.endpoint !== "string" || s.endpoint.length > 1000) return false;
  let u;
  try {
    u = new URL(s.endpoint);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  const extra = String((env && env.PUSH_HOSTS_EXTRA) || "").split(",").map((x) => x.trim()).filter(Boolean);
  if (!PUSH_HOSTS.some((r) => r.test(u.hostname)) && !extra.includes(u.host)) return false;
  const k = s.keys || {};
  return typeof k.p256dh === "string" && k.p256dh.length >= 80 && k.p256dh.length <= 100 && typeof k.auth === "string" && k.auth.length >= 16 && k.auth.length <= 32;
}

const KINDS = ["msg", "like", "comment", "follow", "call", "post", "game", "nudge"];
const cut = (s, n) => String(s == null ? "" : s).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);
// İstemciden gelen yükü süzer; göndereni (uid) Worker ekler, istemci değiştiremez.
export function cleanPayload(p, uid) {
  p = p && typeof p === "object" ? p : {};
  const out = {
    t: "kadraj",
    title: cut(p.title, 80) || "Kadraj",
    body: cut(p.body, 180),
    key: /^(u:|g:|post:|prof:|meydan$|activity$)[\w:.-]{0,120}$/.test(String(p.key || "")) ? String(p.key) : "",
    tag: /^[\w:.-]{1,80}$/.test(String(p.tag || "")) ? String(p.tag) : "kadraj",
    kind: KINDS.includes(p.kind) ? p.kind : "msg",
    mid: /^[\w-]{1,60}$/.test(String(p.mid || "")) ? String(p.mid) : "",
    cid: /^[\w:.-]{1,120}$/.test(String(p.cid || "")) ? String(p.cid) : "",
    at: Number.isFinite(+p.at) ? Math.floor(+p.at) : Date.now(),
    from: String(uid || ""),
  };
  return out;
}

// Tek aboneliğe gönderir. Dönüş: {status, gone}
export async function sendPush(sub, payloadObj, env, fetcher = fetch) {
  const body = await encryptPayload(sub, JSON.stringify(payloadObj));
  const { pub } = await vapidKeys(env);
  const jwt = await vapidJwt(sub.endpoint, env);
  const urgency = payloadObj.kind === "msg" || payloadObj.kind === "call" ? "high" : "normal";
  const ttl = payloadObj.kind === "call" ? 60 : 24 * 3600;
  const headers = {
    "Content-Encoding": "aes128gcm",
    "Content-Type": "application/octet-stream",
    TTL: String(ttl),
    Urgency: urgency,
    Authorization: "vapid t=" + jwt + ", k=" + pub,
  };
  // Topic: aynı sohbetin bekleyen eski bildirimini sunucuda değiştirir (en fazla 32 karakter, base64url)
  if (payloadObj.tag) headers.Topic = b64u(await crypto.subtle.digest("SHA-256", te.encode(payloadObj.tag))).slice(0, 32);
  let r;
  try {
    r = await fetcher(sub.endpoint, { method: "POST", headers, body });
  } catch {
    return { status: 0, gone: false };
  }
  return { status: r.status, gone: r.status === 404 || r.status === 410 };
}

// POST /push gövdesi: {subscriptions:[...]} ya da {subscription:{...}}, payload:{title, body, key, tag, icon, mid, kind}
export async function handlePush(body, uid, env, fetcher = fetch) {
  const raw = Array.isArray(body && body.subscriptions) ? body.subscriptions : body && body.subscription ? [body.subscription] : [];
  if (!raw.length) return { status: 400, data: { error: "bad_request", message: "Abonelik yok." } };
  if (raw.length > 20) return { status: 400, data: { error: "too_many", message: "Bir istekte en fazla 20 abonelik." } };
  const payload = cleanPayload(body.payload, uid);
  const results = await Promise.all(
    raw.map(async (s, i) => {
      if (!validSub(s, env)) return { i, status: 0, gone: false, error: "invalid" };
      try {
        const r = await sendPush({ endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } }, payload, env, fetcher);
        return { i, status: r.status, gone: r.gone, ok: r.status >= 200 && r.status < 300 };
      } catch (e) {
        return { i, status: 0, gone: false, error: String((e && e.message) || "error").slice(0, 40) };
      }
    }),
  );
  return { status: 200, data: { ok: results.some((r) => r.ok), results } };
}
