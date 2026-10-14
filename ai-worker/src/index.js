// Kadraj yapay zekâ köprüsü (Cloudflare Worker)
// - Anthropic API anahtarı yalnızca Cloudflare'de "Secret" olarak durur (ANTHROPIC_API_KEY); sitede ya da GitHub'da görünmez.
// - Yalnızca Kadraj'a giriş yapmış kişilerin isteklerini kabul eder: her istekte Firebase kimlik jetonu doğrulanır.
// - Kişi başına günlük sınır vardır (DAILY_LIMIT). Asıl harcama sınırını Anthropic Console > Limits'ten koy.
import Anthropic from "@anthropic-ai/sdk";

const JWKS_URL_DEFAULT = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const MAX_MESSAGES = 24;
const MAX_CHARS = 60000;
const MAX_IMAGE_B64 = 1_500_000;

let jwksCache = { keys: null, at: 0 };
const usage = new Map(); // uid -> {day, n, recent: number[]}  (her Worker kopyasında ayrı tutulur; kaba bir sınır)

const enc = new TextEncoder();
function b64urlBytes(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function b64urlJson(s) {
  return JSON.parse(new TextDecoder().decode(b64urlBytes(s)));
}

async function googleKeys(env, force) {
  if (!force && jwksCache.keys && Date.now() - jwksCache.at < 3600e3) return jwksCache.keys;
  const r = await fetch(env.JWKS_URL || JWKS_URL_DEFAULT);
  if (!r.ok) throw new Error("jwks");
  const j = await r.json();
  jwksCache = { keys: j.keys || [], at: Date.now() };
  return jwksCache.keys;
}

// Firebase kimlik jetonunu doğrular, kişinin uid'sini döndürür.
async function verifyFirebase(token, env) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new Error("token");
  const [h, p, s] = parts;
  const header = b64urlJson(h);
  const payload = b64urlJson(p);
  if (header.alg !== "RS256" || !header.kid) throw new Error("token");
  let keys = await googleKeys(env, false);
  let jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    keys = await googleKeys(env, true);
    jwk = keys.find((k) => k.kid === header.kid);
  }
  if (!jwk) throw new Error("token");
  const key = await crypto.subtle.importKey("jwk", { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true }, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlBytes(s), enc.encode(h + "." + p));
  if (!ok) throw new Error("token");
  const project = env.FIREBASE_PROJECT || "kadraj-6f1e0";
  const nowS = Math.floor(Date.now() / 1000);
  if (payload.aud !== project || payload.iss !== "https://securetoken.google.com/" + project) throw new Error("token");
  if (!(payload.exp > nowS) || !(payload.iat <= nowS + 300) || !payload.sub) throw new Error("token");
  return payload.sub;
}

function allowedOrigin(req, env) {
  const origin = req.headers.get("Origin") || "";
  const list = String(env.ALLOWED_ORIGINS || "https://kadrajsosyalmedya.github.io").split(",").map((x) => x.trim()).filter(Boolean);
  return list.includes(origin) ? origin : "";
}
function cors(origin) {
  const h = { "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Max-Age": "86400", Vary: "Origin" };
  if (origin) h["Access-Control-Allow-Origin"] = origin;
  return h;
}
function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...cors(origin) } });
}

// Kişi başına: 10 dakikada en fazla 20, günde en fazla DAILY_LIMIT istek.
function takeQuota(uid, env) {
  const day = new Date().toISOString().slice(0, 10);
  const lim = Math.max(1, parseInt(env.DAILY_LIMIT || "60", 10) || 60);
  let u = usage.get(uid);
  if (!u || u.day !== day) u = { day, n: 0, recent: [] };
  const t = Date.now();
  u.recent = u.recent.filter((x) => t - x < 600e3);
  if (u.n >= lim || u.recent.length >= 20) {
    usage.set(uid, u);
    return false;
  }
  u.n++;
  u.recent.push(t);
  usage.set(uid, u);
  if (usage.size > 5000) usage.clear();
  return true;
}

// İstemciden gelen mesajları sıkıca denetler (yalnızca metin ve küçük resimler).
function cleanMessages(raw) {
  if (!Array.isArray(raw) || !raw.length || raw.length > MAX_MESSAGES) return null;
  let chars = 0;
  const out = [];
  for (const m of raw) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) return null;
    if (typeof m.content === "string") {
      if (!m.content.trim()) continue;
      chars += m.content.length;
      out.push({ role: m.role, content: m.content });
      continue;
    }
    if (!Array.isArray(m.content)) return null;
    const blocks = [];
    for (const b of m.content) {
      if (b && b.type === "text" && typeof b.text === "string") {
        chars += b.text.length;
        blocks.push({ type: "text", text: b.text });
      } else if (m.role === "user" && b && b.type === "image" && b.source && b.source.type === "base64" && /^image\/(jpeg|png|webp|gif)$/.test(b.source.media_type) && typeof b.source.data === "string" && b.source.data.length <= MAX_IMAGE_B64) {
        blocks.push({ type: "image", source: { type: "base64", media_type: b.source.media_type, data: b.source.data } });
      } else return null;
    }
    if (blocks.length) out.push({ role: m.role, content: blocks });
  }
  if (!out.length || out[0].role !== "user" || chars > MAX_CHARS) return null;
  return out;
}

function supportsDynamicSearch(model) {
  return /^claude-(opus-5|opus-4-[678]|sonnet-5|sonnet-4-6|fable-5)/.test(model);
}
function supportsDefaultFallback(model) {
  return /^claude-(opus-5|fable-5|sonnet-5-5)/.test(model);
}

async function ask(env, body) {
  const model = String(env.MODEL || "claude-opus-5-5");
  const effort = ["low", "medium", "high", "xhigh", "max"].includes(env.EFFORT) ? env.EFFORT : "low";
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, ...(env.ANTHROPIC_BASE_URL ? { baseURL: env.ANTHROPIC_BASE_URL } : {}) });
  const messages = cleanMessages(body.messages);
  if (!messages) return { status: 400, data: { error: "bad_request", message: "İstek biçimi hatalı." } };
  const system = typeof body.system === "string" ? body.system.slice(0, 40000) : undefined;
  const params = {
    model,
    max_tokens: 16000,
    output_config: { effort },
    messages,
    ...(system ? { system } : {}),
  };
  if (body.search) {
    params.tools = [supportsDynamicSearch(model) ? { type: "web_search_20260209", name: "web_search", max_uses: 3 } : { type: "web_search_20250305", name: "web_search", max_uses: 3 }];
  }
  const fallback = supportsDefaultFallback(model);
  const call = (p) => (fallback ? client.beta.messages.create({ ...p, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" }) : client.messages.create(p));

  let resp = await call(params);
  // Web araması uzun sürerse sunucu "pause_turn" ile durur; kaldığı yerden devam ettir.
  for (let i = 0; i < 4 && resp.stop_reason === "pause_turn"; i++) {
    resp = await call({ ...params, messages: [...messages, { role: "assistant", content: resp.content }] });
  }
  if (resp.stop_reason === "refusal") {
    return { status: 200, data: { text: "", refusal: true, category: (resp.stop_details && resp.stop_details.category) || null, model: resp.model } };
  }
  let text = "";
  const sources = [];
  for (const b of resp.content || []) {
    if (b.type === "text") text += b.text;
    else if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
      for (const r of b.content) if (r && r.url && sources.length < 6 && !sources.some((s) => s.url === r.url)) sources.push({ title: r.title || r.url, url: r.url });
    }
  }
  return { status: 200, data: { text: text.trim(), sources, model: resp.model, stop: resp.stop_reason } };
}

export default {
  async fetch(req, env) {
    const origin = allowedOrigin(req, env);
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { status: origin ? 204 : 403, headers: cors(origin) });
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return json({ ok: true, name: "kadraj-ai", model: String(env.MODEL || "claude-opus-5-5"), key: !!env.ANTHROPIC_API_KEY }, 200, origin);
    }
    if (req.method !== "POST" || url.pathname !== "/ask") return json({ error: "not_found" }, 404, origin);
    if (!origin) return json({ error: "origin", message: "Bu adres yalnızca Kadraj'dan kullanılabilir." }, 403, origin);
    if (!env.ANTHROPIC_API_KEY) return json({ error: "no_key", message: "Cloudflare'de ANTHROPIC_API_KEY gizli değişkeni eklenmemiş." }, 500, origin);

    let uid;
    try {
      uid = await verifyFirebase((req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, ""), env);
    } catch {
      return json({ error: "auth", message: "Kadraj'a giriş yapmış olman gerekiyor." }, 401, origin);
    }
    if (!takeQuota(uid, env)) return json({ error: "rate_limited", message: "Bugünlük soru hakkın doldu, yarın yine gel." }, 429, origin);

    let body;
    try {
      body = await req.json();
    } catch {
      return json({ error: "bad_request", message: "İstek okunamadı." }, 400, origin);
    }
    try {
      const r = await ask(env, body || {});
      return json(r.data, r.status, origin);
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError) return json({ error: "api_key", message: "API anahtarı geçersiz. Cloudflare'deki ANTHROPIC_API_KEY değerini kontrol et." }, 502, origin);
      if (e instanceof Anthropic.PermissionDeniedError) return json({ error: "api_permission", message: "API hesabının bu modele izni yok ya da kredisi bitmiş." }, 502, origin);
      if (e instanceof Anthropic.RateLimitError) return json({ error: "rate_limited", message: "Yapay zekâ şu an çok yoğun, birazdan tekrar dene." }, 429, origin);
      if (e instanceof Anthropic.BadRequestError) return json({ error: "api_bad_request", message: "Yapay zekâ isteği kabul etmedi: " + String(e.message || "").slice(0, 200) }, 502, origin);
      if (e instanceof Anthropic.APIConnectionError) return json({ error: "api_connection", message: "Yapay zekâ hizmetine bağlanılamadı, birazdan tekrar dene." }, 502, origin);
      if (e instanceof Anthropic.APIError && e.status === 402) return json({ error: "api_billing", message: "Anthropic hesabında kredi kalmamış. Console > Billing'den kredi ekle." }, 502, origin);
      if (e instanceof Anthropic.APIError) return json({ error: "api", status: e.status || 0, message: "Yapay zekâ hizmeti yanıt vermedi (" + (e.status || "bağlantı") + ")." }, 502, origin);
      return json({ error: "server", message: "Köprüde beklenmeyen bir hata oldu." }, 500, origin);
    }
  },
};
