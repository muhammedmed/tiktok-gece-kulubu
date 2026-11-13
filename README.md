# ÂLÂ — TikTok Gece Kulübü

TikTok LIVE sohbet ve hediyeleriyle çalışan, bilgisayarda yerel olarak açılan 3D gece kulübü. İzleyiciler `kadın` / `erkek` yazarak karakterini seçer, Gül göndererek piste katılır; hediyelerle VIP, müzisyen, DJ, garson ve dansöz rollerine geçer veya sahne efektleri başlatır. Kamera girişleri, rolleri ve gösterileri otomatik takip eder.

**Pist kapasitesi 84 kişi.** VIP locaları, sahne rolleri ve dekor karakterleri bu pist sınırından ayrıdır. Her yayıncı kendi TikTok hesabını, Euler API anahtarını, müziğini ve kamera videosunu kullanır.

## İlk kez kuracaklar

**[Baştan sona kurulum ve kullanım rehberi →](docs/KURULUM.md)**

Rehberde Windows/macOS kurulumu, Euler bağlantısı, hediye eşleştirme, müzik ve kamera, OBS/LIVE Studio görüntü ve ses aktarımı, yayın açılışı, güncelleme ve sorun giderme anlatılır.

## Hızlı başlangıç

[Node.js](https://nodejs.org/) **22.9.0 veya üzeri** gerekir; güncel LTS sürümü tercih edin. Git kuruluysa:

```sh
git clone https://github.com/muhammedmed/tiktok-gece-kulubu.git
cd tiktok-gece-kulubu
npm ci
npm start
```

Git kullanmıyorsanız GitHub'da **Code → Download ZIP** ile indirin, ZIP'i çıkarın ve terminali `package.json` dosyasının bulunduğu klasörde açıp `npm ci` ve `npm start` komutlarını çalıştırın.

Node.js kuruluysa Windows'ta **BASLAT.bat**, macOS'ta **BASLAT.command** başlatıcısını da kullanabilirsiniz. Başlatıcı eksik paketleri ilk seferde kurup sunucuyu açar; ardından aşağıdaki stüdyo adresine gidin.

| Ekran | Adres |
| --- | --- |
| Yönetim ve önizleme | [http://127.0.0.1:4320/](http://127.0.0.1:4320/) |
| Temiz yayın görüntüsü | [http://127.0.0.1:4320/overlay?studio=tiktok](http://127.0.0.1:4320/overlay?studio=tiktok) |

Sunucu terminalini yayın boyunca açık tutun. `index.html` dosyasını çift tıklayarak açmak yeterli değildir. Bu proje Halay uygulamasından bağımsızdır; başka bir proje veya üst klasörde kurulu paket gerektirmez.

## İlk açılışta hangi ayarlar var?

- TikTok kullanıcı adı ve Euler anahtarı **boştur**; yayıncının kendisi girer.
- `kadın` / `kadin` veya `erkek` karakteri seçer; Gül piste çıkarır. Büyük/küçük harf fark etmez. Önce Gül gönderen kişinin seçimi beklenir; yeniden hediye gerekmez.
- **Gül / Rose (#5655) → Piste çık** eşleştirmesi hazırdır.
- Beğeniyle ve yalnızca sohbet mesajıyla giriş varsayılan olarak **kapalıdır**. İsterseniz panelden kişi başına beğeni hedefi belirleyin (örneğin 250); yalnızca Gül ile giriş için 0 olarak bırakın.
- Diğer hediyeler seçilene kadar kapalıdır; **Hediye → eylem** bölümünden belirlenir.
- Webcam/video ve müzik hazır gelmez; kendi dosyalarınızı veya kameranızı eklersiniz.
- Müzik paneline birden fazla MP3 ekleyebilirsiniz. Liste kaydedilir, sırayla çalar ve sonunda başa döner; yeni yüklemeler çalan parçayı kesmez.
- Otomatik TikTok bağlantısı kapalı başlar. Sahne, yayın açılmadan yerel olarak denenebilir.

## Oyun akışı

| Özellik | Davranış |
| --- | --- |
| Piste giriş | Sohbette `kadın` / `erkek` ile karakter seçimi, ardından Gül; dolu pistte bekleme sırası |
| Yalnızca sohbetle giriş | İstenirse panelden açılır; varsayılan olarak kapalıdır. Beğeniyle giriş ayrı çalışır. |
| Aktiflik | 150 saniye sohbet/beğeni/hediye etkileşimi olmayan ücretsiz pist katılımcısı çıkarılır |
| Korunan roller | VIP, müzisyenler ve ücretli rol alanlar otomatik çıkarılmaz; yayıncı panelden kaldırabilir |
| VIP | 4 loca, toplam 12 koltuk |
| Sahne | Sazcı, darbukacı, DJ, garson ve 5 dansöz konumu |
| Rol değiştirme | Kullanıcının kalıcı rolü son aldığı roldür; önceki yer boşalır |
| Dansöz yeri doluysa | En eski dansöz piste/bekleme sırasına geçer, yeni gelen yerini alır |
| Sahne Şovu | 12 saniye kaşık oyunu; pisttekiler çevrede toplanıp alkışlar |
| Coştur | 18 saniye farklı figürler, uygun çiftlerde eş değişimi ve hareketli kamera |
| Para saç | 6 saniye, gönderen karakter dansöze gider ve banknot saçar |
| Sohbet | Karakterin yanında kısa süreli mesaj balonu; gelirse TikTok profil fotoğrafı |
| Gecenin Yıldızı | Türkiye takvim gününde gelen hediyelerin toplam jetonuna göre liderin adı ve profil fotoğrafı |
| Pist sayacı | Yalnızca pistteki izleyici karakterleri; camın yanında, dikey yayın kenarından içeride |

Başlayan hediye gösterisi bitmeden yeni hediye veya sohbet kamerayı kesmez. Bekleyen gösteriler öncelik ve geliş sırasına göre oynar. Ayrıntılar ve süreler [kullanım rehberinde](docs/KURULUM.md#hediye-gösterileri-ve-roller).

## Müzik, güvenlik ve yayın hakkında

Panelde **kalıcı çalma listesi** vardır. MP3, WAV veya OGG dosyalarını birlikte seçebilir, sonradan yeni şarkılar ekleyebilir ve sırasını değiştirebilirsiniz. Liste sırayla çalar ve sonunda başa döner. Şarkı başına en fazla 100 MiB, listede en fazla 100 parça tutulur. Kamera videosu sessiz ve döngülüdür.

TikTok olayları Euler üzerinden sunucuya, oradan açık oyun pencerelerine SSE ile iletilir. Uygulama TikTok yayın yetkisi sağlamaz ve **CANLI Yayın Yap** düğmesine basmaz. LIVE Studio'daki **İzleyici Dilekleri** ayarları bu panelden otomatik aktarılmaz; iki tarafta aynı hediyeleri seçin.

`private/` içindeki anahtar, hesap ayarları, tercihler ve yüklenen medya ile `.env` GitHub'a dahil edilmez. Anahtar tarayıcıya geri gönderilmez; yerel dosyada saklanır. Sunucu yalnızca bu bilgisayarın `127.0.0.1` adresinde çalışır; telefon veya internet üzerinden doğrudan erişim bu sürümde yoktur.

## Geliştiriciler için

```sh
npm test
```

Testler sahne/rol kuralları, kapasite, hediye akışı, kamera, karakter hareketleri ve yerel sunucuyu kapsar. Euler bağlantısı testlerde taklit edilir; gerçek yayındaki sohbet ve hediye denemesi ayrıca yapılmalıdır.

13 Kasım 2026 kontrolünde 195 testin 194'ü geçti. Bilinen sorun: `female-party-01` kadın müzisyen modelinin saz/kıyafet kesişme testi başarısız; bu görsel çakışmanın düzeltilmesi gerekiyor.

3D karakterler oyun modelleridir; fotogerçekçi tarama değildir. Danslar 112 BPM ortak saate göre hesaplanır; yüklediğiniz şarkının ritmi otomatik çözümlenmez. [Varlıklar ve üçüncü taraf lisansları](docs/ASSETS.md), [karakter lisansı](docs/CHARACTER-LICENSE.txt).
