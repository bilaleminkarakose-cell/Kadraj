# Kadraj yapay zekâ kurulumu

Bu kurulumdan sonra Rota ve Clawd gerçek yapay zekâyla konuşur. Aynı köprü, Kadraj kapalıyken gelen bildirimleri de gönderir (3. bölüm).

**Nasıl çalışıyor?** Kadraj soruyu Cloudflare'deki küçük bir köprüye gönderir. Köprü soruyu yapay zekâya iletir ve yanıtı geri getirir.

**Kim kullanabilir?** Yalnızca Kadraj'a giriş yapmış kişiler. Köprü her istekte kişinin Firebase oturumunu doğrular.

İki seçenek var:

| | Ücretsiz (Workers AI) | Claude (ücretli) |
|---|---|---|
| Para | Yok. Cloudflare'in günlük ücretsiz kotası kullanılır. | Soru başına birkaç sent. |
| Gereken | Yalnızca ücretsiz bir Cloudflare hesabı | Cloudflare hesabı ve Anthropic API anahtarı |
| Model | Açık kaynaklı Llama 3.3 70B | Claude (varsayılan: Claude Opus 5.5) |
| İnternette arama | Tavily anahtarı eklenirse var (ücretsiz, ayda 1000 arama; 4. bölüm) | Var |

Önce ücretsiz başla. İstersen sonra Claude anahtarını eklersin; anahtar eklendiği anda köprü kendiliğinden Claude'a geçer.

---

## 1. Cloudflare köprüsünü kur (ücretsiz)

### Yol A: GitHub'dan otomatik (önerilen)
1. https://dash.cloudflare.com adresinde ücretsiz hesap aç. Kredi kartı istemez.
2. **Workers & Pages** bölümünde **Create**'e bas, sonra **Import a repository**'yi seç.
3. GitHub hesabını bağla ve `kadrajsosyalmedya/Kadraj` deposunu seç.
4. **Project name** kutusuna `kadraj-ai` yaz. **Root directory** (kök dizin, bazen **Advanced settings** altında) kutusuna `ai-worker` yaz. Diğer ayarları olduğu gibi bırakıp **Deploy**'a bas. Kök dizin boş kalırsa köprü yerine Kadraj sitesinin kopyası yüklenir.
5. Kurulum bitince Worker'ın adresini kopyala. Adres `https://kadraj-ai.<adın>.workers.dev` gibi görünür.

Bu kadar: ücretsiz yapay zekâ bağlantısı (Workers AI) kendiliğinden kurulur.

### Yol B: Kopyala-yapıştır (GitHub bağlamadan)
1. **Workers & Pages** bölümünde **Create**'e bas, **Create Worker**'ı seç. Adı `kadraj-ai` olsun, sonra **Deploy**'a bas.
2. **Edit code**'a bas. Oradaki kodun hepsini sil.
3. Bu depodaki `ai-worker/hazir/kadraj-ai.js` dosyasının içeriğini yapıştır ve **Deploy**'a bas.
4. Worker'ın **Settings** sekmesinde **Bindings** bölümüne gir. **Add**'e bas ve **Workers AI**'ı seç. Variable name kutusuna `AI` yaz ve kaydet.
5. Worker'ın adresini kopyala.

## 2. Kadraj'a bağla

1. Kadraj'da yönetici paneline gir.
2. **Yapay zekâ** bölümünü aç.
3. Worker adresini yapıştır ve **Kaydet**'e bas.
4. **Sına**'ya bas. "Çalışıyor (ücretsiz model): ..." yazısını görürsen iş tamam.

---

## İsteğe bağlı: Claude'a geç (ücretli, daha akıllı)

> Anthropic hesabı açmak için 18 yaşından büyük olmak gerekiyor. Gerekirse bu adımı bir yetişkine (ör. ailenden biri) yaptır.

1. https://console.anthropic.com adresinde hesap aç.
2. **Billing** bölümünden kredi yükle.
3. **Limits** bölümünden aylık harcama sınırı koy. Bu sınır, hesabın o miktardan fazla para harcamasını engeller.
4. **API Keys** bölümünde **Create Key**'e bas ve anahtarı kopyala. Anahtar `sk-ant-...` ile başlar. Kimseyle paylaşma, Kadraj'a da yazma.
5. Cloudflare'de Worker'ı aç ve **Settings** sekmesinde **Variables and Secrets** bölümüne gir. **Add**'e bas:
   - Type: **Secret**
   - Name: `ANTHROPIC_API_KEY`
   - Value: kopyaladığın anahtar
   
   Sonra kaydet. Köprü artık Claude kullanır.

**Yaklaşık maliyet:** `claude-opus-5-5` soru başına yaklaşık 2-3 sent tutar. `MODEL` değişkenini `claude-haiku-5-5` yaparsan soru başına 0,1 sentten azdır. İnternet araması arama başına ayrıca yaklaşık 1 sent tutar. Fiyatlar Anthropic'in 2026 liste fiyatlarına göre.

## 3. Uygulama kapalıyken bildirimler (Web Push, ücretsiz)

Bu adımdan sonra Kadraj kapalıyken de mesaj, beğeni, yorum, takip ve aramalar telefona bildirim olarak gelir. Aynı köprü kullanılır; yapay zekâ için Claude anahtarı gerekmez.

1. Anahtarları üret. İki yol var, ikisi de aynı şeyi üretir:
   - **Kadraj'da (önerilen, Node gerekmez):** Yönetici paneli > **Yapay zekâ** > **Anahtar üret**. Anahtarlar senin tarayıcında üretilir, hiçbir yere gönderilmez. Sayfayı kapatınca kaybolur; Cloudflare'e eklemeden kapatma.
   - **Bilgisayarda:** Bu depoyu indir ve `ai-worker` klasöründe `node vapid-anahtar.mjs` çalıştır (Node 20 ya da daha yenisi).

   Üç değer çıkar: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` ve `VAPID_SUBJECT`. Yalnızca bir kez üretilir.
2. Cloudflare'de Worker'ı aç, **Settings** sekmesinde **Variables and Secrets** bölümüne gir ve **Add**'e basarak üçünü ekle:
   - `VAPID_PUBLIC_KEY`: Type **Text**, değer: çıktıdaki açık anahtar (`B` ile başlar, 87 karakter)
   - `VAPID_PRIVATE_KEY`: Type **Secret**, değer: çıktıdaki gizli anahtar (43 karakter). Kimseyle paylaşma, GitHub'a yazma.
   - `VAPID_SUBJECT`: Type **Text**, değer: `mailto:` ile başlayan kendi e-posta adresin (ör. `mailto:kadraj@ornek.com`). Push hizmetleri sorun olursa bu adrese yazar.

   Sonra **Deploy**'a bas (Yol B ile kurduysan önce `ai-worker/hazir/kadraj-ai.js` dosyasının yeni halini yeniden yapıştır).
3. Firebase'de kuralları yeniden yayınla: Kadraj yönetici paneli > **Kurulum** bölümündeki kuralları kopyala, Firebase > Firestore > **Kurallar**'a yapıştır ve **Yayınla**'ya bas. (Yeni `push` koleksiyonu için kural eklendi.)
4. Dene: tarayıcıda `https://kadraj-ai.<adın>.workers.dev/vapid` adresini aç. `{"key":"B..."}` görürsen köprü hazır.
5. Herkes kendi telefonunda Kadraj > Ayarlar > Bildirimler > **Uygulama kapalıyken de bildir** anahtarını açar ve bildirim iznini verir.
   - Denemek için: Kadraj > Yönetici paneli > **Yapay zekâ** > **Test bildirimi (5 sn sonra)**'ya bas ve 5 saniye içinde Kadraj'ı kapat. Bildirim, bu ayarı açtığın bütün cihazlarına gelir.
   - iPhone'da bu yalnızca Kadraj **Ana ekrana eklenip** oradan açıldığında çalışır (iOS 16.4 ve sonrası).

**Notlar**
- Anahtarları bir kez kur, sonra değiştirme. Değiştirirsen herkesin bu anahtarı kapatıp yeniden açması gerekir.
- Kişi başına sınır: günde `PUSH_DAILY_LIMIT` (varsayılan 600) gönderim isteği, 10 dakikada en fazla 80.
- Köprü yalnızca bilinen push hizmetlerine (Google, Mozilla, Apple, Microsoft) istek atar. Bildirimin içeriği yolda şifrelidir (RFC 8291); köprü içeriği saklamaz.

## 4. Rota internette arasın (Tavily, ücretsiz)

Ücretsiz modelin bilgisi eskidir ve bazen yanlış olabilir. Tavily eklenince Rota genel bilgi sorularında (kim, ne zaman, hangi, bugün, haber...) internete bakar ve yanıtın sonunda kaynağın adını yazar. Kadraj'la ilgili sorularda aramaz, böylece kota boşa gitmez.

> Kayıt için yaş sınırı olabilir; gerekirse bu adımı bir yetişkine yaptır.

1. https://tavily.com adresinde ücretsiz hesap aç. Kredi kartı istemez; ayda 1000 arama ücretsizdir.
2. Paneldeki **API Keys** bölümünden anahtarı kopyala (`tvly-` ile başlar). Kimseyle paylaşma, Kadraj'a yazma.
3. Cloudflare'de Worker'ı aç, **Settings** > **Variables and Secrets** > **Add**: Type **Secret**, Name `TAVILY_API_KEY`, Value: anahtar. Kaydet ve **Deploy**'a bas.
4. Kadraj > Yönetici paneli > **Yapay zekâ** > **Durumu yenile**. "İnternet araması: açık" görürsen tamam.

## Ayarlar (isteğe bağlı)

Worker'da **Settings**, sonra **Variables** bölümünden değiştirebilirsin:

| Ad | Varsayılan | Ne işe yarar |
|---|---|---|
| `FREE_MODEL` | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | Ücretsiz model. Daha hızlı ve kotayı daha az harcayan seçenek: `@cf/meta/llama-3.1-8b-instruct`. |
| `MODEL` | `claude-opus-5-5` | Claude modeli (yalnızca anahtar ekliyse kullanılır). |
| `EFFORT` | `low` | Claude'un düşünme derinliği: `low`, `medium` ya da `high`. |
| `DAILY_LIMIT` | `60` | Bir kişinin günde sorabileceği soru sayısı. |
| `PUSH_DAILY_LIMIT` | `600` | Bir kişinin günde gönderebileceği bildirim isteği sayısı. |
| `SEARCH_DAILY_LIMIT` | `20` | Bir kişinin günde yapabileceği internet araması sayısı (Tavily kotası ayda 1000). |

## Sorun giderme

| Sına'da gördüğün | Ne yapmalı |
|---|---|
| Cloudflare'de "Variables cannot be added to a Worker that only has static assets" ya da adres Kadraj sitesini açıyor | Worker > **Settings** > **Builds** > **Root directory** kutusuna `ai-worker` yaz, kaydet ve yeniden kur (Deployments > son kurulum > **Retry build**). |
| "Köprüye ulaşılamadı" | Adresi kontrol et. Worker yayında mı (Deploy edildi mi), ona bak. |
| "ne API anahtarı ne de ücretsiz model bağlı" | Yol B'nin 4. adımını yap (Workers AI bağlantısı). |
| "Ücretsiz yapay zekâ yanıt vermedi" | Günlük ücretsiz kota dolmuş olabilir. Ertesi gün kendiliğinden yenilenir. |
| "API anahtarı geçersiz" | Anahtarı yeniden kopyala. Başında ya da sonunda boşluk kalmasın. |
| "Kadraj'a giriş yapmış olman gerekiyor" | Kadraj'dan çıkıp yeniden giriş yap. |
| "Köprüde bildirim anahtarları kurulmamış" | 3. bölümün 1. ve 2. adımlarını yap, sonra Deploy'a bas. |
| `/vapid` "VAPID anahtarları hatalı ya da birbirini tutmuyor" | İki anahtarı aynı `node vapid-anahtar.mjs` çıktısından kopyala; başında ya da sonunda boşluk kalmasın. |
| "İnternet araması: kapalı (Tavily anahtarı yok)" | 4. bölümü yap. Anahtarı ekledikten sonra Deploy'a basmayı unutma. |
| "Abonelik kaydedilemedi" | Firestore kurallarını yeniden yayınla (3. bölüm, 3. adım). |
