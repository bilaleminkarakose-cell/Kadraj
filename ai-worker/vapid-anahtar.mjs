// Kadraj bildirimleri için VAPID anahtar çifti üretir (bir kez çalıştırman yeter).
// Kullanım:  node vapid-anahtar.mjs
// Çıktıdaki iki değeri Cloudflare'de Worker > Settings > Variables and Secrets bölümüne ekle (KURULUM.md, 3. bölüm).
// Node 20 ya da daha yenisi gerekir. İnternete bağlanmaz, anahtarı hiçbir yere göndermez.
const b64u = (b) => Buffer.from(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const pub = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
const jwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
console.log("Kadraj VAPID anahtarları\n");
console.log("VAPID_PUBLIC_KEY  (Type: Text ya da Secret)");
console.log(b64u(pub) + "\n");
console.log("VAPID_PRIVATE_KEY (Type: Secret, kimseyle paylaşma)");
console.log(jwk.d + "\n");
console.log("VAPID_SUBJECT     (Type: Text)");
console.log("mailto:senin-adresin@ornek.com\n");
console.log("Not: Bu anahtarları bir kez kur ve değiştirme. Değiştirirsen herkesin \"Uygulama kapalıyken de bildir\" ayarını yeniden açması gerekir.");
