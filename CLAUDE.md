# Kadraj: kod haritası (sürüm 4.0; 3.9 haritası + 4.0 notları aşağıda)

Bu dosya, `index.html` okunarak çıkarılmış ayrıntılı bir haritadır. Yeni bir oturumda önce bunu oku, sonra gerekli fonksiyonu `grep` ile bul (satır numaraları değişir, isimlerle ara).

## Çalışma kuralları (sahibinden)
- Yeni özellik eklerken mevcut fonksiyonları **silme**; küçük ve hedefli değişiklik yap. Eski bir fonksiyonun davranışı değişecekse eskisini `xxxOld` adıyla bırak (örnek: `reactMsgOld`).
- Sürüm numarası ana.ara.yama: hata düzeltme ya da küçük ekleme → yama artar (4.1.0 → 4.1.1); büyük güncelleme → ara artar (4.1.x → 4.2.0). Her değişiklikte `APP_V` (ana*10000+ara*100+yama), `APP_VER` ve `<meta name="kadraj-version">` birlikte güncellenir. "İki sürüm geride" engeli yalnızca ara sürüm farkıyla çalışır; Neler yeni yalnızca ara/ana sürümde otomatik açılır (`WN_ITEMS` başına yenilerini ekle).
- Sahibine yalnızca güncel `index.html` gönderilir. Dosya adı `index.html` kalmalı.
- `const ASSETS={...}` satırına **dokunma** (yaklaşık 1,95 MB base64, tek satır). Kodu okurken bu satırı atla, örneğin `awk 'length($0)<100000'`.
- Yayın: GitHub Pages, `main` dalı. https://kadrajsosyalmedya.github.io/Kadraj/
- Arayüz metinleri Türkçe. Emoji yok; ikonlar SVG.

## Dosyalar
- `index.html`: Uygulamanın tamamı (HTML, CSS ve JS). Saf JS, kütüphane yok, `"use strict"`.
- `sw.js`: Service worker. Önce ağdan çeker, ağ yoksa önbellekten açar (önbellek adı `kadraj-v44`; `kadraj-open` önbelleği bildirim hedefini taşır). Önce ağ denendiği için sürüm değişince önbellek adını değiştirmek zorunlu değil.
- `manifest.webmanifest`, `icon-192.png`, `icon-512.png` ve `icon-maskable-512.png`: PWA dosyaları. 4.4.2'den beri simge: yeşil degrade, vizör köşeleri içinde K ve turuncu nokta (`<link rel=icon>` `?v=` ile önbellek kırılır).

## index.html yapısı (yukarıdan aşağı)
1. **CSS**: Renkler `:root` değişkenlerinde (`--bg`, `--surface`, `--surface-2`, `--line`, `--fg`, `--muted`, `--accent` (#0C7A63), `--accent-ink`, `--accent-soft`, `--sun`, `--heart`, `--ok`). Koyu tema üç yerde tanımlı: `prefers-color-scheme`, `[data-theme]` ve `[data-app-theme]`. Fontlar: `--f-display` Unbounded, `--f-body` Figtree, `--f-mono` JetBrains Mono. Yazı boyutu `--scale` ile ayarlanır. Bölümler: dok, kartlar, ızgara (`.tile`), sohbet (`.msgs`, `.mrow`, `.msg`, `.react`, `.rxpick`, `.wpgrid`), profil, reels, katmanlar (`.sheet`, `.dialog`, `.full`), oluştur, hikâye (`.sv`), ayarlar, arama (`.call`), satranç (`.chess`, `.cboard`, `.pc`...), Rota yüzü (`.rbot`), yönetici (`.adm-*`). Animasyon anahtarları: `enter` (sayfa geçişi, `main.enter`), `msgin`, `toastin`, `dockpop`, `burst`, `up`, `fade`, `cpop`, `cfall` (konfeti). `prefers-reduced-motion` tüm animasyonları kapatır.
2. **HTML iskeleti**: `.shell#shell` içinde `header#top`, `main#main` ve `.dock#dock` var; bunların dışında `#overlay` ve `#toasts` bulunur. Açılışta `main` içinde `.splash` (kelime işareti, spinner ve `#splashMsg`) görünür. **Animasyonlu giriş ekranı için başlangıç noktası burası ve `boot()`.**
3. **JS**: Sırayla yardımcılar, ikonlar, avatarlar, ASSETS, botlar, durum, veri katmanları, Firebase, profil yardımcıları, sohbet, çizim, olaylar, katmanlar, oluştur, video, müzik, giriş, abonelikler, mesaj ve arama, gruplar, satranç, çocuk modu, yönetici, Rota, Firebase hesapları ve açılış.

## Yardımcılar
- `$`, `$$` (querySelector), `esc` (HTML kaçış, şablonlarda **her zaman** kullan), `rid()`, `clone`, `now()`, `H` (1 saat ms), `fmt`, `short`, `ago(t)`.
- `LS.get/set/del` (localStorage JSON, try/catch'li; `set` false dönebilir) ve `SS` (sessionStorage).
- `hash32`, `sha`, `richText` (#etiket ve @bahsetme), `vib(ms)`.
- İkonlar: `IP` nesnesi (ad → SVG path), `I(ad)` → `<svg class="i">`. Yeni ikon için `IP`'ye satır ekle. Mevcut adlar: home search add reels pin heart comment send chat bookmark gear back close more moon sun auto image camera check spark vol mute lock logout trash edit grid music bell users info play link key pen type poll globe hand paste undo eraser film eye reply phone video camoff mic micoff flip hangup pause copy knight rotate bulb flag trophy prev next. Marka işareti için `VF` kullanılır.
- `ROTA_AV`, `MEYDAN_AV`, `initialsAv(ad, tohum)` (baş harfli SVG avatar), `PALETTE`, `NOTE_BG` (6 degrade), `GALLERY` (10 hazır foto).
- `R(yol)`: ASSETS'ten data URL döndürür. `RV(yol)`: video için blob URL üretir.

## Durum ve ayarlar
- `S` globaldir. Önemli alanlar: `mode` ("local" ya da "cloud"), `uid`, `authed`, `guest`, `admin`, `profiles`, `posts`, `meta`, `stories`, `chats`, `botchats`, `saved`, `hidden`, `meydan`, `online` (Set), `typing`, `route` ({name, params}), `stack`, `feedSeg`, `msgs` (açık sohbetin mesajları), `games`, `adm` (admin koleksiyonu), `caps` (`room`, `sample` = yapay zekâ), `replyTo`, `cmp` (oluştur taslağı).
- `settings` localStorage'da `kadraj_settings` altında durur ve `saveSettings()` ile kaydedilir. Alanlar: `theme`, `autoplay`, `notify`, `scale`, `chessLevel`, `chessColor`, `board`, `chessSound`, `evalBar` ve `wp` (3.9 duvar kağıdı).
- Diğer LS anahtarları: `kadraj_session`, `kadraj_accounts` (yerel mod), `kadraj_db` (LocalDB), `kadraj_seen` (görülen hikâyeler), `kadraj_act_<uid>`, `kadraj_meydan_<uid>`, `kadraj_admin_<uid>`, `kadraj_chess_<mode>_<uid>`, `kadraj_cg_rated`, `kadraj_ann_seen`, `kadraj_inst_hide`, `kadraj_installed`, `kadraj_fb_cfg`, `kadraj_fb_remember`, `kadraj_demo`, `kadraj_muted`, `kadraj_childinv_seen_<uid>` ve `kadraj_wp_<key>` (duvar kağıdı fotoğrafı).

## Veri katmanı
- `DB` aynı arayüzü sunar: `get(path)`, `set(path, obj)`, `update(path, obj)`, `del(path)`, `watchCol(col, cb, {where, orderBy, limit, onError})` ve `watchDoc(path, cb)`.
  - `LocalDB`: localStorage `kadraj_db` üstünde çalışır. `update` iç içe birleştirir, diziler üzerine yazılır. Belge yoksa `update` hata fırlatır.
  - `FirebaseDB()`: `update` iç içe nesneleri `FieldPath`'e düzleştirir (diziler yaprak sayılır). Kısmi güncelleme için `{a:{[uid]:v}}` biçimini kullan.
  - `CloudDB` eski ve kullanılmıyor.
- `write(fn, {quiet})`: Yazmaları sarar, hatada Türkçe toast gösterir ve true/false döner. **Yazmaları bununla yap.**
- `guard()`: Misafir, susturulmuş ya da yazma izni olmayan kullanıcıyı engeller. Kullanıcı eylemlerinin başında çağrılır.
- Firebase: `EMBED_CFG` gömülü (proje `kadraj-6f1e0`), SDK 10.12.2. `loadFirebase()` ile yüklenir ve `FB={app,auth,db,A,F}` olur.
- Çevrimiçi durum: `FsRoom()` (`presence` koleksiyonu, 40 sn kalp atışı, `pokes` ile dürtme). `wireRoom()`, `S.online` ve `S.typing` değerlerini doldurur.

### Firestore koleksiyonları ve alanlar
- `profiles/{uid}`: `uid`, `username`, `name`, `bio`, `avatar`, `following:{uid:at|0}`, `botFollowers`, `private`, `createdAt`, `note:{text,at}` (24 saatlik not), `chess:{r,w,l,d,g}`, `child` ve `pins:[postId]` (3.9, en fazla 3).
- `posts/{id}`: `uid`, `at`, `kind` (photo, note, poll ya da reel), `caption`, `loc`, `src` veya `img`, `css`, `ar`, `exif`, `text`, `bg`, `question`, `options`, `video` (`chunk:<vid>:<n>`), `poster`, `slides`, `fx`, `music`.
- `meta/{postId}`: `likes:{uid:at}`, `comments:{cid:{uid,text,at,likes}}`, `votes:{uid:i}`. Yazma `setMeta(id, patch)` ile yapılır.
- `stories/{id}`: `uid`, `at`, `img`, `views:{uid:at}`.
- `vchunks/{vid-i}`: `{d}`, video parçası (`storeVideo` ve `resolveVideo`).
- `chats/{cid}`: `members`, `last:{text,from,at}`, `updatedAt`, `reads:{uid:at}`. Gruplarda ek olarak `group`, `name`, `photo`, `createdBy` bulunur. `cid`: DM için `dm-…` (`cidFor`), grup için `gr-…`, ortak sohbet için `meydan`.
- `chats/{cid}/msgs/{mid}`: `from`, `at`, `text`, `img`, `audio`+`dur`, `post`, `game`, `call`, `reply:{mid,from,text}`, `edited`, `del`, `likes:{uid:at|0}` ve `reacts:{uid:tür|""}` (3.9).
- `presence/{uid}`, `pokes`, `calls/{id}` (+ `cands`), `games/{gid}`.
- `admin/{duyuru|ban|mute|pin|verified|bakim|log|childinv}`: Yalnızca yönetici yazar. `bots/{key}` ve `reports/{id}` de var.
- `data/users/{uid}/{saved|hidden|secret|bot-<key>}`: Kişiye özel belgeler.
- Kurallar `rulesText(ids)` ile üretilir. Kurallarda `yonetici()` fonksiyonu sahibin uid'ini kontrol eder. **Dikkat:** chats ve msgs, giriş yapan herkese açık okuma/yazma iznine sahip.

## Yönlendirme ve çizim
- `go(name, params)`, `back()` ve `tab(name)` kullanılır. Tarayıcı geri tuşu `navPush`/`popstate` ile tek adım geri gider (önce katman kapanır).
- `render(full)`: `S.route.name` değerine göre `vFeed`, `vExplore`, `vReels`, `vProfile`, `vPost`, `vActivity`, `vChats`, `vChat`, `vSettings`, `vEdit`, `vPeople`, `vInvite`, `vChess`, `vAdmin` ya da `vChessGame` çağrılır. Bakım modunda `vBakim` gösterilir. Ardından `afterRender()` çalışır. Yeni sayfa için `switch`'e `case` ekle ve `renderTop()` içine başlık ekle.
- `renderTop()` üst çubuğu, `renderDock()` alt doku (Akış, Keşfet, +, Sohbet, Ben) çizer.
- `refresh()` ve `scheduleRefresh()`: Veri gelince çağrılır. chat, reels, edit ve chessgame ekranlarını baştan çizmez: sohbette yalnızca `renderMsgs()`, reels'te `updateReelCounts()`, satrançta `chUI()` çalışır. Kullanıcı yazı yazarken yeniden çizim ertelenir (`S.dirty`).
- `afterRender()`: Sohbeti başlatır (`startChat` + `wireComposer`), arama kutusu, ayar anahtarları ve reels IntersectionObserver burada bağlanır.

## Olaylar
- Tek bir document `click` dinleyicisi `data-*` özniteliklerine göre dağıtım yapar: `follow`, `tab`, `go`, `prof`, `mention`, `msg`, `chat`, `nudge`, `cact`, `chs`, `adm`, `note`, `seen`, `admu`, `clvl`, `ccol`, `cth`, `cgame`, `chinv`, `cply`, `call`, `play`, `jump`, `open`, `reel`, `like`, `vote`, `comments`, `share`, `save`, `story`, `seg`, `ptab`, `people`, `swap`, `themeSet`, `scale` ve `chip`. Son olarak `data-act` gelir: back, close, theme, create, newreel, addstory, mute, postmenu, profmenu, groupmenu, wallpaper, newchat, newgroup, invite, logout, install, note, plus vb. **Yeni düğme için `data-act="x"` ver ve bu listeye `if(a==="x")` ekle.**
- Çift dokunma (`pointerup`): `[data-dbl]` gönderiyi beğenir, `.msg[data-mid]` mesaja `reactMsg` (kalp) uygular.
- Uzun basma (500 ms): Mesajda `msgMenu(mid)`, sohbet satırında (`data-crow`) `chatRowMenu`. `contextmenu` da aynı işi yapar.
- `[data-rxl]` (tepki rozeti): Yakalama aşamasında dinlenir ve `reactList(mid)` açılır.

## Katmanlar
- `openLayer(name, html, {onClose, noScrim})`, `closeLayer(name)`, `closeTop()` ve `closeAll()`.
- `sheet(name, title, body, {tall, onClose})`: Alttan açılan pencere; düğmeler `.opt` sınıflıdır. `dialog(title, htmlText, [{label, cls, fn}])`: Onay kutusu. Tam ekran katman için `.full` kullanılır (oluştur, çizim).
- `toast(text, uid?)`: Üstte kısa uyarı. `sysNote()`: Arka plandaki telefon bildirimi.

## Ekranlar ve özellikler
- **Akış** (`vFeed`): Filtre çipleri, hikâye şeridi, duyuru ve kurulum afişleri, yöneticinin öne çıkardığı paylaşım (`pinnedId`), kartlar (`postCard`, `mediaHtml`, `pollHtml`) ve öneri bloğu (`suggBlock`).
- **Keşfet** (`vExplore`): Arama (16 karakterden uzun girdi yönetici şifresi olarak `admTry`'ye gider), satranç kartı, kişiler ve ızgara.
- **Reels/Sahneler** (`vReels`): `activateReel`/`deactivateReel`, `Music` (WebAudio ile cihazda üretilen müzik: lofi, enerjik, sakin) ve `hydrateVideos`.
- **Profil** (`vProfile`): İstatistikler, not, sekmeler (paylaşımlar, sahneler, kaydedilenler) ve `grid(list, pins)`. 3.9 sabitleme fonksiyonları: `pinsOf`, `withPins`, `togglePin`. Ayrıca `vPeople` ve `vEdit`/`wireEdit` var.
- **Bildirimler** (`vActivity`, `activity()`): Beğeni, yorum ve takip.
- **Sohbet listesi** (`vChats`, `chatList`): Meydan kartı, notlar şeridi, hızlı düğmeler, Rota, sohbetler ve botlar.
- **Sohbet** (`vChat`, `chatHead`, `renderMsgs`):
  - Görüldü bilgisi küçük avatarlarla gösterilir (`seenAt`), yazıyor göstergesi, Rota akışı (`S.stream`) ve sabit yanıt çipleri var.
  - Gönderme: `sendMessage(key, payload)`; anahtarlar `u:<uid>`, `g:<gid>` ya da `meydan` (`keyInfo`). Mesajda `@rota` geçerse `rotaInRoom` devreye girer.
  - Yanıtla (`S.replyTo`, `drawReply`), fotoğraf (`attachPhoto`), sesli mesaj (`startRec`/`stopRec`/`playAudio`, en fazla 2 dakika), + menüsü (`plusMenu`).
  - Mesaj menüsü (`msgMenu`): Tepki seçici, yanıtla, kopyala, düzenle, benden sil, herkesten sil. `updateLast` sohbetin son mesaj özetini günceller.
  - **3.9 tepkiler:** `REACTS` (heart, laugh, wow, sad, fire, clap SVG), `RX`, `rxSvg`, `msgReacts`, `reactChip`, `setReact`, `reactList`; `reactMsg` artık `setReact(mid,"heart")` çağırır.
  - **3.9 duvar kağıdı:** `WALLS`, `wpOf`, `applyWp` (`renderMsgs` başında çalışır), `wallpaperMenu`. Seçim yalnızca cihazda saklanır.
- **Gruplar**: `openNewGroup`, `groupMenu`, `leaveGroup`, `chatWipe`.
- **Notlar**: `openNote`, `viewNote`, `noteOf` (24 saat).
- **Arama** (WebRTC, sinyal Firestore `calls` üzerinden): `startCall`, `listenCalls`, `incomingCall`, `acceptCall`, `endCall`, `renderCall`, `callAction`; zil sesi için `startTone`.
- **Hikâyeler**: `openStories(uid)` (5 sn çubuklar, görüntüleyenler, yanıt mesaj olarak gider).
- **Oluştur**: `openCreate` → `openComposer(kind)` → `drawComposer()` → `publishComposer()`.
  - Fotoğraf: Oran ve 7 filtre (`FILTERS`). Hikâye: 720×1280 tuval üstüne yazı. Not, anket (2-4 seçenek) ve sahne de var.
  - Sahne iki türlü: video (`openRecorder`, `compressVideo`, `storeVideo` parçaları, `VMAX` 4 MB) ya da kareler (1-3 kare, `fx`, müzik).
  - Görseller `pickImage({title, video, draw})` ile alınır ve `{img, src}` döner; kaynaklar dosya, kamera, Kadraj galerisi, çizim (`openDraw`) ve yapıştırma.
  - Görsel yardımcıları: `toCanvas(img,w,h)`, `encode(canvas, maxChars, q)`, `coverDraw`.
- **Yorumlar**: `openComments`, `renderComments` (yorum beğenme ve silme). **Paylaş**: `openShare`. **Menüler**: `postMenu`, `profMenu`, `reportPost`.
- **Ayarlar** (`vSettings`, `onSetting`): Tema, yazı boyutu, gizli hesap, bildirim, otomatik oynatma, beni hatırla, ana ekrana ekle (`installApp`), sürüm metni ve Firebase bağlantısını sıfırlama.
- **Davet**: `vInvite` ve `inviteText`.
- **Satranç**:
  - Motor ve oyun: `ChessCore()` (0x88 değil, 64'lük dizi; `legal`, `make`, `san`, `search`, alfa-beta), `engineRun` (Web Worker), `CLEVELS` (5 seviye, 400-2000), `CTHEMES`, `PIMG` (taş SVG'leri) ve `CH` durumu.
  - Ekran: `vChess` (lobi) ve `vChessGame`. Tahta ve arayüz: `chDraw`, `chUI`, `chWire` (dokun-dokun ve sürükle), `chBot` (Rota oynar ve hamle yorumlar), `chOver` (puan `chRate` Elo, konfeti).
  - Çevrim içi oyun: `chCreateOnline`, `chSync`, `chPush`, `chFinishOnline`. Ayrıca `chShare` (tahta resmini paylaşma) ve `botFace()` (animasyonlu Rota yüzü: happy, sad, surp, thinking, talk).
- **Çocuk modu**: `isChild`, `cleanText` (`BADWORDS`), `childGate`, `childBlockMeydan`, `checkChildInvite`, `childBanner`.
- **Yönetici**:
  - Giriş: Keşfet aramasına şifre yazılır, `admTry` PBKDF2 ile `ADMIN_HASH` kontrolü yapar, `S.admin` açılır. Panel `vAdmin`, işlemler `admAct` (`data-adm`).
  - İşlevler: duyuru, şikayetler, kullanıcı yönetimi (`admUserSheet`: rozet, susturma, çocuk modu, silme, kapatma), bot ekleme ve düzenleme (`admBotSheet`), öne çıkarma, Meydan ve hikâye temizliği, bakım modu, işlem kaydı (`admLog`) ve kural kopyalama.
  - Paylaşılan yönetici verisi `admSubscribe` ile izlenir. Yazma `admSet(id, doc)` ile yapılır.
- **Rota ve botlar**: `APP_GUIDE` (Rota'nın uygulama bilgisi; **yeni özellik ekleyince bunu da güncelle**), `ROTA_SYS`, `FAQ` (yapay zekâ yokken kullanılan hazır yanıtlar), `sendToBot`, `botReply` (`S.caps.sample`), `fallbackRota`, `aiCaption`, `runTest`. Özel botlar `bots` koleksiyonunda tutulur (`setCustomBots`).

## Açılış ve giriş akışı
- `boot()`: Adres çubuğundaki `#k=` yapılandırması, LS'deki yapılandırma ya da `EMBED_CFG` sırasıyla denenir. `loadFirebase` yaklaşık 20 sn zaman aşımıyla çalışır, ardından `FirebaseDB` ve `FsRoom` kurulur ve `onAuthStateChanged` dinlenir.
  - Oturum yoksa `fbWelcome` (`fbRegister` ve `fbLogin`) gösterilir.
  - Profil yoksa `completeProfile` açılır.
  - Profil varsa `startSession` → `subscribeShared` + `enterApp` çalışır.
- `bootLocal()`: Demo modu (LocalDB). Ekranlar: `showWelcome`, `showRegister`, `showLogin`, `resetFlow`.
- `enterApp(fresh)`: `subscribeUser` çağrılır, Akış açılır, hoş geldin toast'ı ve bildirim izni gelir, çocuk modu önerisi kontrol edilir.
- Giriş ve kayıt ekranları `authShell(html)` içine çizilir (`.auth`). Ortak parçalar: `mosaic`, `brandLine`, `modeChip`.
- Test: Bu ortamda gstatic'e erişim olmayabilir. Tarayıcı testinde gstatic isteklerini engelle, sayfada `await bootLocal(); S.uid="u_test"; await saveNewProfile("Test","test",null)` çalıştır (yerel modda saveNewProfile → startSession → enterApp).

## 4.0 için notlar (okurken fark edilenler)
- Animasyonlu giriş ekranı: Statik `.splash`'ı (`main#main` içinde) animasyonla değiştir ve `boot()`/`enterApp()` geçişine bağla. `prefers-reduced-motion` kuralına uy.
- `APP_GUIDE` ve `FAQ` hâlâ "mesaja çift dokununca kalp" diyor; 3.9 tepkileri, duvar kağıdı ve sabit paylaşım burada anlatılmıyor.
- `chInvitePick` içindeki `S.mode!=="cloud"&&S.mode!=="local"` koşulu hiçbir zaman doğru olmaz (zararsız).
- `boot()` içindeki `if(!cfg)` dalı `EMBED_CFG` olduğu için hiç çalışmaz; kurulum ekranı yalnızca bağlantı hatasında çıkar.
- Tepki bildirimi yok (`notifyChats` yalnızca son mesajı izler).

## 4.0'da eklenenler (kısa)
- Sürüm (şu an 4.4.4): `APP_V=40404`, `APP_VER="4.4.4"` ve `<head>`'deki `<meta name="kadraj-version" content="40404">` birlikte artırılmalı; eski biçim (40) `verNorm` ile çevrilir (sürüm denetimi bu etiketi okur; `meta/_surum` belgesi en yüksek sürümü tutar; iki sürüm geride kalan istemci kapanır).
- Kancalar: `ACT` (data-act eylemleri), `HOOKS.after/enter/profiles/boot` + `runHooks`. Aktiflik: `isActive`, `activeLabel`, `activeUsers`, `lastSeenAt`.
- Blok A (`/*@js:A{*/`): `#intro` açılış animasyonu, karşılama ekranı (`welScreen`), sürüm denetimi (`verWatch`, `fetchRemoteVersion`, `hardReload`, `showVersionBlock`), `showWhatsNew` (`WN_ITEMS`).
- Blok B: vurgu renkleri (`applyAccent`, `effAccent`), `themeSwitch`, tema eşitleme (`profiles.prefs`), yönetici ortak teması (`admin/tema`), ortak sohbet temaları (`chats/{cid}.theme`, `KB_THEMES`, yeni `applyWp`/`wallpaperMenu`), yeni `vSettings` (`data-set` anahtarları).
- Ayar bayrakları: showActive, readReceipts, hideLikes, nMsg/nLike/nComment/nPost, enterSend, haptics, dataSaver, reduceMotion, themeSync, accent.
- Yapılmadı (ileride): çoklu fotoğraf, hikâyeye tepki, öne çıkanlar, sohbet araması, iletme, 2 dk sahne, akış zenginleştirme, satranç bulmacası. Yarım iş dalları: `w40-C`/`w40-C2` (yerel), bulmaca listesi doğrulayıcısı oturum notlarında.
- 4.0 sonrası: Sahne videoları bulutta Cloudinary'ye yüklenir (`CLD={cloud:"jw9koecu",preset:"Kadraj"}`, imzasız ön ayar; `cldUpload`, `storeVideo` → olmazsa `storeVideoFs` Firestore parçaları). Paylaşımın `video` alanı ya `chunk:<vid>:<n>` ya da `https://res.cloudinary.com/...` adresidir (`vsrc` ikisini de oynatır). Sınır: 2 dk / 40 MB, kamera 60 sn. Cloudinary'deki videolar uygulamadan silinemez (imzasız yükleme). Firestore parçaları artık ham bayt (`b`, ilk parçada `m`); eski base64 (`d`) da okunur. 24 saati geçen hikâyeler `cleanOldStories` ile silinir.
- 4.2.0: Giriş kullanıcı adıyla da yapılır (`unames/{username}` → `{uid,email}`; giriş yapmadan `get` ile okunur, listelenemez; `syncUname` girişte yazar). Şifre sıfırlama Kadraj içinde: e-postadaki bağlantı `?mode=resetPassword&oobCode=` ile açılır (`AUTH_ACT`, `showResetPw`, `fbForgot`, `fbMailSent`, `fbFindMail`); Firebase > Authentication > Templates'te eylem adresi Kadraj'a ayarlı olmalı. Bildirimler `sysNote(title,body,tag,{key,icon})`; `key` (u:/g:/post:/prof:) ile `openTarget` ilgili yere gider; sw.js `notificationclick` bunu iletir. Sahne müziği `reelMusic`/`reelBg` ile videoyu izler.
- 4.3.0 Kadraj Posta + Kadraj Anahtarı: özel posta kutusu `data/users/{uid}/posta` = `{code, msgs}`; anahtar 12 karakter (`kaNew`). Şifre, anahtardan türetilen PBKDF2(150k)+AES-GCM ile şifrelenip `unames/{ad}.rk` içinde durur (`kaLock`/`kaUnlock`). Şifre her girildiğinde (`KASA.pw` → `kasaSeal`) yenilenir; unutan kişi `fbKey` ekranında ad + anahtar + yeni şifre girer (eski şifre çözülür → giriş → `updatePassword`). `unames` yazımı `rk`'yi korumalı. Posta: `openPosta`, Ayarlar > Hesap ve profil başlığındaki zarf. Testte `crypto.subtle` için `kt.openApp(...,{https:true})` kullan.
- 4.3.1 Yönetici kurtarması: anahtar ayrıca `kurtar/{uid}` = `{v,s,i,c,at,seen?}` içinde, kişinin kayıt e-postasından türetilen PBKDF2(150k)+AES-GCM ile şifreli durur (`krKey`, `kurtarPut`, `kurtarOpen`, `kurtarSync`). Okuma yalnızca sahibi ve yönetici; yönetici yalnızca `seen` yazabilir. Yönetici > kullanıcı > "Kadraj Anahtarını göster" (`admKeySheet`) e-posta doğruysa anahtarı açar, `seen` yazar ve `admLog`a düşer. Kişi şifresini bir sonraki girişinde `kasaSeal` anahtarı yeniler (`po.kAck`); şifresiz açılışta Posta'ya bir kez bildirim (`po.kNote`). `po.krFor` yedeklenen anahtarı izler; yeniden yedeklemede görülmemiş `seen` korunur. Yönetici ekranı anahtarı `unames.rk` ile doğrular ve `seen` yazılamazsa göstermez. Eski sürüm `kasaSealOld` olarak duruyor. Kurallar değişti: yeniden yayınlanmalı.
- 4.3.2: Küfür süzgeci kelime içinde aramaz (`cleanText`: `BAD_EXACT` tam kelime, `BAD_STEM` kelime başı, `BAD_PHRASE`; eskisi `cleanTextOld`). Yönetici çocuk modunu profile yazamadığı için (kurallar) kapatma `admin/childinv.list[uid].off` ile yapılır; `isChild` bunu dikkate alır (eskisi `isChildOld`), kişinin cihazı girişte `child:0` yazar. Yeniden öneri/geri çekme `off`u korur.
- 4.4.0: "Sahne"nin arayüzdeki adı artık **Flick** (Flick'ler, Flick'i...; kod adları `reel`/`reels` aynı kaldı, yorumlardaki "sahne" de). Paylaşım alanı `posts.noKids` (1/0): "Çocuk modundakiler göremez" anahtarı oluştur ekranında (`#cKid`, `drawComposer` sonu) ve sahibinin `postMenu`sünde (`#mKid`). `kidHid(p)` ile `allPosts`/`postById` Çocuk Modu'ndaki kişiye bu paylaşımları vermez (eskileri `allPostsOld`/`postByIdOld`). Hikâyelerde yok.
- 4.4.1: Çocuk modu önerisi `admSubscribe` her veri gelişinde `checkChildInvite` çağırır (eskisi `checkChildInviteOld`, oturumda bir kez `S._ciShown`). Sohbet teması her yeri boyar: `KB_HUE`, `chatVars`, `chatShell` renkleri `#shell`e yazar (`data-ct`, `data-cdk`), sohbetten çıkınca `HOOKS.after` siler; `applyWp` sarıldı (`applyWpBase`). Klavye: viewport `interactive-widget=resizes-content` + `visualViewport` → `--vvh` (html yüksekliği, #overlay); `#msgs` `_pin` + ResizeObserver + resim `load` ile altta kalır. Meydan/grupta gönderen fotoğrafı ve adı tıklanır (`.avb`, `.sender` `data-prof`); `m.sys` mesajları ortada not (`.stamp.sysn`); `setSharedTheme` önce kaydeder sonra not düşer. Video: `storeVideo` Cloudinary'yi bağlantı hatasında bir kez daha dener, olmazsa büyük videoyu `compressVideo` ile küçültüp `storeVideoFs`e koyar, asıl hata mesajını gösterir (eskisi `storeVideoV41`). Flick ikonu yeni (`IP.reels`, eskisi `reelsOld`).
- 4.4.3: Otomatik güncelleme: `verBar` sarıldı (`verBarBase`) → `verAuto(v)` uygun anda (`verSafe`: katman yok, arama yok, odaklı dolu kutu yok) `hardReload`; oturumda sürüm başına bir kez (`SS kadraj_auto_<v>`); açılışta ve sekmeye dönünce `verRemoteCheck`. Sürüm arşivi (yönetici paneli, `archBox`): `VER_ARCHIVE` [sürüm, sha, tarih] + GitHub API'den "x.y.z:" ile başlayan kayıtlar; `openArchive` index.html'i raw.githubusercontent'ten indirir, `archPrep` CSP (ağ kapalı) + bellekte localStorage + serviceWorker yok ekler ve son `boot();` çağrısını `bootLocal();` yapar, sandbox iframe'de (blob) açar. Kayıt mesajlarını "x.y.z: ..." biçiminde yazmaya devam et ki arşiv kendiliğinden bulsun. Çocuk modu: `sendMessage` sarıldı (`sendMessageBase`): çocuğa yabancı DM, çocuktan Meydan, üye olmayandan grup mesajı engellenir; `kidClean` not/anket/Flick yazısı ve mesaj düzenlemede; çocuğa yabancı arama reddedilir; Meydan bildirimi çocuğa ve nMsg kapalıysa gitmez. Video: `vsrc` önce `vcache` (eskisi `vsrcOld`), `videoPoster` preload+play, sıkıştırma sırasında oluştur kapatılırsa sonuç atılır, kısaltılamayan uzun video reddedilir, kota hatası Türkçe. Boş kutuda Enter sesli kaydı başlatmaz. Grup kurucusu ayrılınca `createdBy` devredilir. Manifest ikonları `?v=442`.
- 4.4.4: Uygulama içi logo yeni K işareti (`VF`; eskisi `VFOld`), açılış animasyonu (`#intro .in-vf`) da K çizer. Bildirime dokununca: sw.js hedefi `kadraj-open` önbelleğine `__open` olarak yazar + mesaj gönderir; sayfa `openPending` ile görünür olunca/odakta/girişte okur (`OPEN_LAST` çift açmayı önler). Flick ekranı: `updateReelCounts` takip/kaydet/yorumu da günceller (eskisi `updateReelCountsOld`), "Sesi açmak için dokun" çalışır. Gizli hesabın hikâyeleri yalnızca takipçilere (`canSeeUser`). `setMeta` belge yerelde yoksa önce update dener, yalnızca belge gerçekten yoksa set eder (eski beğeni/yorumlar silinmez). Çocuğa gizli paylaşım bildirimi gitmez; açıklama düzenleme süzülür. Satranç: iptal edilen davet puanlanmaz ("İptal edildi"), 2 günden eski bitmiş oyunlar silinir, Rota düşünürken geçmişe bakmak tahtayı bozmaz, çocuk modu satranç davetinde de geçerli, terfi düğmesi tıklanır. Düzen: Flick alt güvenli alan, hikâye geniş ekranda kırpılmaz, not balonları, profil sekmeleri sığar. Hazır Flick açıklamalarında "sahne" kalmadı.
