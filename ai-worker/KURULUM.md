# Kadraj yapay zekâ kurulumu (Claude + Cloudflare)

Bu kurulumdan sonra Rota ve Clawd gerçek yapay zekâyla (Claude) konuşur. Clawd'ın "Claude abi" köşesi de böyle çalışır.

**Nasıl çalışıyor?** Kadraj soruyu Cloudflare'deki küçük bir köprüye gönderir. Köprü soruyu Claude'a iletir ve yanıtı geri getirir.

**API anahtarı nerede duruyor?** Yalnızca Cloudflare'de, gizli değişken olarak. Sitede ve GitHub'da görünmez.

**Köprüyü kim kullanabilir?** Yalnızca Kadraj'a giriş yapmış kişiler. Köprü her istekte kişinin Firebase oturumunu doğrular.

---

## 1. Anthropic API anahtarı al

> Anthropic hesabı açmak için 18 yaşından büyük olmak gerekiyor. Gerekirse bu adımı bir yetişkine (ör. ailenden biri) yaptır.

1. https://console.anthropic.com adresine gir ve hesap aç.
2. **Billing** bölümünden kredi yükle (5 dolar başlamak için yeter).
3. **Limits** bölümünden aylık harcama sınırı koy. Bu sınır, hesabın o miktardan fazla para harcamasını engeller.
4. **API Keys** bölümünde **Create Key**'e bas ve anahtarı kopyala. Anahtar `sk-ant-...` ile başlar.
5. Anahtarı kimseyle paylaşma, Kadraj'a da yazma. Yalnızca 2. adımdaki Cloudflare kutusuna yapıştıracaksın.

## 2. Cloudflare köprüsünü kur (ücretsiz)

### Yol A: GitHub'dan otomatik (önerilen)
1. https://dash.cloudflare.com adresinde ücretsiz hesap aç.
2. **Workers & Pages** bölümünde **Create**'e bas, sonra **Import a repository**'yi seç.
3. GitHub hesabını bağla ve `kadrajsosyalmedya/Kadraj` deposunu seç.
4. **Root directory** (kök dizin) kutusuna `ai-worker` yaz. Diğer ayarları olduğu gibi bırakıp **Deploy**'a bas.
5. Kurulum bitince Worker'ı aç ve **Settings** sekmesinde **Variables and Secrets** bölümüne gir. **Add**'e bas:
   - Type: **Secret**
   - Name: `ANTHROPIC_API_KEY`
   - Value: 1. adımda kopyaladığın anahtar
   
   Sonra **Deploy** ya da **Save**'e bas.
6. Worker'ın adresini kopyala. Adres `https://kadraj-ai.<adın>.workers.dev` gibi görünür.

### Yol B: Kopyala-yapıştır (GitHub bağlamadan)
1. **Workers & Pages** bölümünde **Create**'e bas, **Create Worker**'ı seç. Adı `kadraj-ai` olsun, sonra **Deploy**'a bas.
2. **Edit code**'a bas. Oradaki kodun hepsini sil.
3. Bu depodaki `ai-worker/hazir/kadraj-ai.js` dosyasının içeriğini yapıştır ve **Deploy**'a bas.
4. Yol A'daki 5. ve 6. adımları yap: gizli anahtarı ekle ve adresi kopyala.

## 3. Kadraj'a bağla

1. Kadraj'da yönetici paneline gir.
2. **Yapay zekâ** bölümünü aç.
3. Worker adresini yapıştır ve **Kaydet**'e bas.
4. **Sına**'ya bas. "Çalışıyor: ..." yazısını görürsen iş tamam: Rota ve Clawd artık Claude'la konuşuyor.

---

## Ayarlar (isteğe bağlı)

Worker'da **Settings**, sonra **Variables** bölümünden değiştirebilirsin:

| Ad | Varsayılan | Ne işe yarar |
|---|---|---|
| `MODEL` | `claude-opus-5-5` | Kullanılan model. Çok daha ucuz bir seçenek: `claude-haiku-5-5`. |
| `EFFORT` | `low` | Düşünme derinliği: `low`, `medium` ya da `high`. Yükseldikçe yanıtlar yavaşlar ve maliyet artar. |
| `DAILY_LIMIT` | `60` | Bir kişinin günde sorabileceği soru sayısı. |
| `ALLOWED_ORIGINS` | `https://kadrajsosyalmedya.github.io` | Köprüyü kullanabilecek site adresi. |

## Yaklaşık maliyet

Fiyatlar Anthropic'in 2026 liste fiyatlarına göre.

- **`claude-opus-5-5` (varsayılan, en akıllısı):** Soru başına yaklaşık 2-3 sent. Günde 50 soru sorulursa ayda yaklaşık 30-40 dolar eder.
- **`claude-haiku-5-5` (en ucuzu):** Soru başına yaklaşık 0,1 sentten az. Günde 50 soru sorulursa ayda 1 dolar bile etmez.
- **"Abime sorayım" soruları:** Clawd'ın bu sorularda yaptığı internet araması, arama başına ayrıca yaklaşık 1 sent tutar.

Ne seçersen seç, 1. adımda koyduğun aylık harcama sınırı aşılmaz.

## Sorun giderme

| Sına'da gördüğün | Ne yapmalı |
|---|---|
| "Köprüye ulaşılamadı" | Adresi kontrol et. Worker yayında mı (Deploy edildi mi), ona bak. |
| "ANTHROPIC_API_KEY gizli değişkeni eklenmemiş" | 2. adımın 5. maddesini yap. |
| "API anahtarı geçersiz" | Anahtarı yeniden kopyala. Başında ya da sonunda boşluk kalmasın. |
| "Kredi kalmamış" | Anthropic Console'daki **Billing** bölümünden kredi ekle. |
| "Kadraj'a giriş yapmış olman gerekiyor" | Kadraj'dan çıkıp yeniden giriş yap. |
