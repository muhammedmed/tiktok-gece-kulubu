# Baştan sona kurulum ve kullanım

Bu rehber, ÂLÂ kulüp oyununu kendi bilgisayarınızda açıp kendi TikTok hesabınızla kullanmanız içindir. Oyun bilgisayarda görüntü üretir; TikTok sohbet ve hediyelerini Euler üzerinden dinler. Görüntü ve sesi yayına OBS veya hesabınızda erişilebilir olan LIVE Studio ile verirsiniz.

## İçindekiler

1. [Gerekenler](#1-gerekenler)
2. [Projeyi indirme ve çalıştırma](#2-projeyi-indirme-ve-çalıştırma)
3. [Yayın açmadan deneme](#3-yayın-açmadan-deneme)
4. [Kendi TikTok ve Euler hesabını bağlama](#4-kendi-tiktok-ve-euler-hesabını-bağlama)
5. [Katılım ve hediye ayarları](#5-katılım-ve-hediye-ayarları)
6. [Webcam veya döngü video](#6-webcam-veya-döngü-video)
7. [Müzik yükleme ve ses](#7-müzik-yükleme-ve-ses)
8. [OBS / LIVE Studio'ya aktarma](#8-obs--live-studioya-aktarma)
9. [Yayını başlatma ve bitirme](#9-yayını-başlatma-ve-bitirme)
10. [Roller, gösteriler ve kapasite](#hediye-gösterileri-ve-roller)
11. [Güncelleme, yedek ve özel dosyalar](#güncelleme-yedek-ve-özel-dosyalar)
12. [Sorun giderme](#sorun-giderme)

## 1. Gerekenler

- Windows veya macOS bilgisayar ve 3D/WebGL destekleyen güncel bir tarayıcı.
- [Node.js](https://nodejs.org/) **22.9.0 veya üzeri**; güncel LTS sürümü tercih edin. Başlatma komutundaki `--env-file-if-exists` seçeneği Node 22.9.0 ile eklenmiştir. [Node.js belgesi](https://nodejs.org/api/cli.html#--env-file-if-existsfile)
- TikTok LIVE yayını açabildiğiniz kendi hesabınız ve kullanacağınız yayın yöntemi için gerekli erişim.
- Gerçek sohbet/hediye bağlantısı için kendi [Euler Stream](https://www.eulerstream.com/) hesabınız ve API anahtarınız. Hesabınızın WebSocket hizmet erişimi ve kotası uygun olmalıdır; koşulları Euler hesabınızdan kontrol edin.
- Yayına vermek istediğiniz kendi ses dosyanız; isterseniz webcam veya MP4/WebM video.

Yerel sahne denemesi için Euler anahtarı ve açık TikTok yayını gerekmez. Canlı sohbet/hediyelerin gelmesi için internet ve gerçek yayın bağlantısı gerekir. Repo oyun modellerini içerir; kişisel müzik, video, TikTok hesabı veya API anahtarı içermez.

## 2. Projeyi indirme ve çalıştırma

### A. ZIP ile indirme — Git bilmek gerekmiyor

1. [Repo sayfasını](https://github.com/muhammedmed/tiktok-gece-kulubu) açın.
2. **Code → Download ZIP** seçin.
3. ZIP'i tamamen çıkarın. İçinde `package.json`, `server.js`, `public` ve `src` bulunan klasör proje klasörüdür. ZIP'in içinden çalıştırmayın.
4. Node.js'i kurduktan sonra açık terminali kapatıp yeniden açın.
5. Terminali proje klasöründe açın:
   - **Windows:** Dosya Gezgini'nde proje klasörünü açın, adres çubuğuna `cmd` yazıp Enter'a basın. Açılan Komut İstemi doğru klasörde başlar.
   - **macOS:** Terminal'i açın, `cd ` yazın, proje klasörünü Finder'dan Terminal'e sürükleyin ve Enter'a basın.
6. Aşağıdaki komutları sırayla çalıştırın:

```sh
node --version
npm --version
npm ci
npm start
```

`npm ci` yalnızca ilk kurulumda ve paket güncellemelerinde gerekir. Her yayın için `npm start` yeterlidir. `.env` dosyasının bulunmadığına ilişkin bir bilgi satırı görülebilir; ayarları panelden girecekseniz `.env` oluşturmanız gerekmez.

Node.js kurulduktan sonra Windows'ta **BASLAT.bat**, macOS'ta **BASLAT.command** dosyasını açmak da aynı sunucuyu başlatır; Three.js paketi yoksa ilk kurulumunu yapar. Başlatıcı tarayıcıyı kendiliğinden açmaz; aşağıdaki stüdyo adresine gidin. macOS dosyayı açamıyorsa proje klasöründe terminalden `zsh BASLAT.command` çalıştırabilir veya yukarıdaki `npm` komutlarını kullanabilirsiniz.

### B. Git ile indirme

```sh
git clone https://github.com/muhammedmed/tiktok-gece-kulubu.git
cd tiktok-gece-kulubu
npm ci
npm start
```

Terminalde `ÂLÂ Stüdyo: http://127.0.0.1:4320` adresi yazmalıdır. Tarayıcıda [stüdyoyu açın](http://127.0.0.1:4320/). Modellerin yüklenmesini bekleyin; ilk açılış cihazınıza göre zaman alabilir.

**Terminali açık bırakın.** Terminalde `Ctrl+C` sunucuyu durdurur. HTML dosyasını çift tıklamak veya GitHub sayfasını açmak oyunu çalıştırmaz. `npm ci` mutlaka bu projenin kendi klasöründe çalıştırılmalıdır; Halay projesi kurulmuş olmak zorunda değildir.

## 3. Yayın açmadan deneme

1. Stüdyoda **☷ Kontrol panelini aç** düğmesine basın.
2. **Sahne denemesi · yayın bağlantısı kapalıyken** bölümünü açın.
3. Misafir adı ve karakter seçin.
4. **Piste çık**, **VIP'ye geç**, **Sazcı ol**, **Dansöz ol**, **Sahne Şovu**, **Para saç** veya **Coştur** düğmeleriyle yerel deneme yapın.
5. Aynı adla başka rol seçerek rol değişimini deneyin. **Sohbet komutu** alanıyla mesaj/karakter tercihi akışını deneyebilirsiniz.

İlk önizlemede örnek kalabalık bulunur. Sunucu üzerinden ilk sahne denemesine veya canlı bağlantıya geçerken örnek katılımcılar temizlenir; isimsiz masa konukları ve boş sahne yerlerinin dekor karakterleri kalır. **Örnek sahneye dön** deneme katılımcılarını sıfırlar.

Deneme düğmeleri TikTok bağlantısı açık veya yayını bekliyor durumdayken kapalıdır. Denemek için **Bağlantıyı kes** seçin. Bu deneme, gerçek TikTok hediyesi göndermez ve jeton harcamaz.

## 4. Kendi TikTok ve Euler hesabını bağlama

1. [Euler Stream](https://www.eulerstream.com/) hesabınıza giriş yapın. Hesap panelinizin API anahtarları bölümünden kendi anahtarınızı oluşturun veya mevcut anahtarınızı kullanın. Anahtarı paylaşmayın.
2. ÂLÂ panelinde **1 · TikTok bağlantısı** bölümünü açın.
3. **Yayıncı kullanıcı adı** alanına yayını açacağınız hesabın kullanıcı adını girin. Görünen profil adını değil `@kullaniciadi` biçimindeki adı kullanın. Baştaki `@` kabul edilir.
4. **Euler API anahtarı** alanına anahtarınızı yapıştırın.
5. İsterseniz **Sunucu açılınca yayını bekle** seçeneğini açın. Bu seçenek TikTok yayını başlatmaz; sunucu yeniden açıldığında bağlantıyı hazırlayıp hesabın yayına girmesini bekler.
6. **Bağlantı ayarlarını kaydet** düğmesine basın. Anahtar alanının boşalması normaldir; altında anahtarın sunucuda kayıtlı olduğu yazar.
7. Hazır olduğunuzda **Yayına bağlan** seçin. Yayın kapalıysa “Yayın bekleniyor”, açık ve bağlantı kurulmuşsa “Yayına bağlı” durumu görünür.

İlk beklemelerde yayın durumu yaklaşık 15 saniyede bir kontrol edilir; uzun bekleyişte aralık 90 saniyeye çıkabilir. Yayını açtıktan hemen sonra bağlanmazsa kısa süre bekleyin. Kullanıcı adı/API anahtarını değiştirmek mevcut bağlantı ve sahne oturumunu sıfırlar; bunu yayın hazırlığında yapın.

Uygulama TikTok şifrenizi istemez. Başka yayıncıya kendi anahtarınızı vermeniz gerekmez; herkes kendi anahtarını kaydeder.

## 5. Katılım ve hediye ayarları

### Karakter seçimi ve Gül ile piste çıkma

Yeni kurulumda **Gül → Piste çık** hazırdır ve ücretsiz katılım kapalıdır. İzleyici önce sohbetten karakterini seçer, ardından Gül göndererek piste çıkar.

İzleyici aşağıdakilerden birini yazar:

```text
kadın
kadin
erkek
```

Büyük/küçük harf fark etmez. Bu sözcükler kişinin oyun karakteri tercihidir; profilinden cinsiyet tahmin edilmez. Yeni karakter seçimi için `kadın` / `erkek` kullanın; `katıl` tek başına karakter tercihi belirlemez.

Bu mesajlar yalnızca karakter tercihini seçer. Ücretsiz giriş isterseniz **3 · Karakter tercihi → Kadın / erkek yazan ücretsiz piste çıkabilsin** seçeneğini açıp **Katılım ayarlarını kaydet** deyin. Varsayılan **Seçim yapmayan kişi** kuralı “Hediyesini tut, seçimini bekle”dir; isterseniz varsayılan kadın veya erkek karakter seçebilirsiniz.

Karakter seçmeden rol hediyesi atan kişinin isteği bekler. `kadın`/`erkek` yazınca bekleyen rolü açılır; yeniden hediye gerekmez. Birden fazla istek varsa gösterileri sıraya alınır ve kişinin kalıcı rolü son istediği rol olur. Mevcut VIP/müzisyen karakter tercihini değiştirince ücretsiz katılım mesajı onu zorla piste taşımaz.

### Hediye eşleştirme

1. Önce Euler anahtarını kaydedin.
2. **2 · Hediye → eylem → TikTok hediye kataloğunu getir** düğmesine basın.
3. **Hediye ara** alanından adı arayın.
4. Her eylemin yanındaki listeden hediyesini seçin.
5. **Hediye eşleşmelerini kaydet** deyin.

Yeni kurulumda **Gül / Rose (#5655) → Piste çık** hazırdır. **Para saç** ve diğer eylemler eşleştirilmemiştir. Kullanılmayacak eylemi **Eşleştirilmedi · kapalı** bırakın. Aynı hediye iki eyleme bağlanamaz; değiştirmek için eski eylemden kaldırıp yeni eyleme seçin.

Eşleşme **hediye kimliğiyle (ID)** yapılır; aynı jeton değerindeki başka bir hediye aynı eylemi tetiklemez. Listede görünen jeton bilgisi katalogdan gelir; gerçek hediye fiyatını ve kullanılabilirliğini TikTok belirler. Hediye seri paketleri tekrarlandığında aynı olay iki kez oynatılmaz.

### LIVE Studio'daki İzleyici Dilekleri

TikTok/LIVE Studio hesabınızda **İzleyici Dilekleri** paneli varsa orada gösterdiğiniz hediye ve açıklamayı ÂLÂ'daki eşleşmeyle aynı yapın. Örneğin TikTok'ta Gül için “Piste çık” yazıyorsa burada da Gül → Piste çık olmalıdır. TikTok panelini kendi arayüzünde etkinleştirin.

Bu iki panel otomatik olarak birbirine ayar aktarmaz. TikTok paneli izleyiciye hediyeyi gösterir; ÂLÂ ise gelen hediye ID'sine göre oyunu çalıştırır. Yayın görüntüsünde kamera, “🌹 Piste çık · Gül” ve karakter seçimi bilgisi gösterilir; hediye açıklamalarını TikTok’un İzleyici Dilekleri panelinden sunabilirsiniz.

## 6. Webcam veya döngü video

**4 · Sol üst kamera** bölümünü kullanın.

| Kaynak | Yapılacak işlem |
| --- | --- |
| Kapalı | Kamera kaynağını Kapalı seçip uygula |
| Döngü video | Kendi MP4/WebM dosyanı Kamera videosu alanından yükle; genişliği ayarla |
| Webcam | Bilgisayarın kamerası seç, uygula; açılan tarayıcı izin isteğini onayla |

Video en fazla 300 MiB olabilir; dosya adından ziyade tarayıcının desteklediği video kodlaması önemlidir. Yükleme “Sessiz döngü video” modunu açar. Video sesi kapalıdır; yayın müziği ayrı çalar. Genişlik %18–38 arasında ayarlanır.

Webcam izni yayın görüntüsünü açtığınız tarayıcı/uygulamada da gerekir. Kamera başka uygulamada kullanılıyorsa erişilemeyebilir. OBS/LIVE Studio'daki kendi Kamera kaynağınızı kullanacaksanız ÂLÂ'daki kamerayı kapatıp kamerayı yayın sahnesinde sol üste yerleştirebilirsiniz.

Repoyu indiren başka kişide sizin kamera videonuz görünmez. Her kullanıcı kendi videosunu yüklemeli veya kendi webcam'ini seçmelidir.

## 7. Müzik yükleme ve ses

1. **5 · Yayın müziği → MP3 / ses dosyası** alanından dosyanızı seçin.
2. Yükleme tamamlanınca müzik hazır olur; yayın penceresi açıkken çalmaya başlar.
3. Ses seviyesini ayarlayın. Gerektiğinde panelde duraklatıp başlatabilirsiniz.
4. Yönetim ekranında da duymak istiyorsanız **Stüdyoda sesi dinle** seçeneğini açın. Yayın penceresi zaten ses çalıyorsa çift ses olmaması için bu seçeneği kapalı bırakın.

Desteklenen yüklemeler MP3, WAV ve OGG; dosya sınırı 100 MiB'dir. Tarayıcının dosyayı çözebilmesi gerekir. **Tek yüklenen dosya döngüde çalar. Bu sürümde çoklu dosya/çalma listesi yoktur.** Yeni ses yüklemesi önceki dosyayı değiştirir ve yeni parçayı başlatır. Birkaç şarkıyı peş peşe döndürmek için bir ses düzenleyicide tek dosya olarak birleştirip yükleyin.

Tarayıcı otomatik sesi engellerse temiz yayın penceresine bir kez tıklayın. Aynı yayın penceresini yenilemede aynı dosyanın son konumu oturum belleğinden geri alınmaya çalışılır; ayrı pencerelerin müzik konumları birebir senkron değildir. Yayın için tek ses çıkışı kullanın.

Ses/video dosyaları sizin bilgisayarınızdaki `private/` klasöründe tutulur. GitHub'a eklenmez. Yalnızca yayınınızda kullanma hakkınız olan içerikleri yükleyin.

## 8. OBS / LIVE Studio'ya aktarma

**Yayın görüntüsü adresi:**

```text
http://127.0.0.1:4320/overlay?studio=tiktok
```

Yönetim panelinin adresini değil bu adresi kullanın. **6 · LIVE Studio / OBS → Yayın penceresini aç** düğmesi aynı görüntüyü ayrı pencerede açar. Oyunu hem dikey hem yatay kullanabilirsiniz; kaynak ve yayın tuvalini aynı oranla hazırlayın.

### OBS ile

1. OBS'de yayın sahnenizi seçin.
2. Kaynaklara **Tarayıcı / Browser** ekleyin.
3. URL alanına yayın görüntüsü adresini yapıştırın.
4. Dikey yayın için kaynak boyutunu **1080 × 1920**, yatay için **1920 × 1080** yapın ve tuvale sığdırın. Daha düşük çözünürlükle yayın yapıyorsanız aynı en-boy oranını koruyun.
5. Kaynağın sesi OBS ses mikserinde görünüyorsa susturulmadığını ve yayın çıkışına gönderildiğini kontrol edin. Sesi OBS üzerinden denetleme seçeneği mevcutsa kullanın.
6. Müzik otomatik başlamadıysa Tarayıcı kaynağının **Etkileşim / Interact** penceresinden bir kez tıklayın.
7. Webcam'i OBS'nin kendi kaynağından ekliyorsanız oyunun webcam alanını kapatın.

OBS'nin TikTok'a yayın gönderebilmesi, hesabınızın sağladığı yayın bağlantısı/erişim yöntemine bağlıdır. Oyun RTMP anahtarı üretmez, LIVE yetkisi açmaz. OBS'yi yalnızca görüntü hazırlamak için kullanıp LIVE Studio'da yakalıyorsanız görüntü ve sesin ikisinin de aktarıldığını ayrıca kontrol edin.

### LIVE Studio ile

1. Hesabınızla LIVE Studio'yu açıp yayın sahnenizi hazırlayın.
2. Sürümünüzde URL/Tarayıcı kaynağı varsa yayın görüntüsü adresini ekleyin.
3. Bu kaynak yoksa ÂLÂ'da **Yayın penceresini aç** deyin; LIVE Studio'da **Pencere yakalama** kaynağıyla açılan ÂLÂ yayın penceresini seçin.
4. Görüntüyü yayın alanına sığdırın; tarayıcı çerçevesi/adres çubuğu yakalanıyorsa kırpın.
5. Tarayıcının/uygulamanın sesini yayın ses kaynaklarına ekleyin veya kullandığınız sistem sesi yakalamasında seçin. **Pencere görüntüsünü yakalamak, sesi otomatik yakaladığınız anlamına gelmez.**
6. Kısa bir yerel kayıt ya da yayın önizlemesiyle müziği ve mikrofonu dinleyin; iki kez gelen sesi kapatın.
7. İzleyici Dilekleri hediye açıklamalarını kendi TikTok panelinizde hazırlayıp etkinleştirin.

macOS veya Windows ekran/ses/kamera izni isterse kullandığınız yayın uygulaması için gerekli izni işletim sistemi ayarlarından verin. Menü adları uygulama sürümüne ve dile göre değişebilir.

## 9. Yayını başlatma ve bitirme

Her yayın öncesi:

1. Proje klasöründe `npm start` çalıştırın; terminali açık bırakın.
2. Stüdyoda doğru TikTok kullanıcı adının kayıtlı olduğunu kontrol edin.
3. Müzik, kamera ve hediye eşleşmelerini hazırlayın.
4. Temiz yayın görüntüsünü OBS/LIVE Studio'da açın; sesin yayına gittiğini kontrol edin.
5. ÂLÂ'da **Yayına bağlan** deyin. “Sunucu açılınca yayını bekle” açıksa otomatik başlamış olabilir.
6. **Asıl yayını TikTok/LIVE Studio içinde siz başlatın.** Gerekirse İzleyici Dilekleri panelini de ayrıca başlatın.
7. ÂLÂ'da bağlantı durumunun “Yayına bağlı” olmasını bekleyin.
8. Başka bir hesapla `kadın` veya `erkek` yazıp karakter seçimini kontrol edin. Varsayılan ayarda giriş için Gül gerekir. Hediyesiz giriş denemesi için panelden ücretsiz katılımı açabilirsiniz.

Yayını bitirirken önce TikTok/LIVE Studio'da yayını sonlandırın. Ardından ÂLÂ'da **Bağlantıyı kes** deyip terminalde `Ctrl+C` kullanabilirsiniz. **Geceyi sonlandır** hediyesi yalnızca gönderenin adını ve bir bildirim gösterir; yayını otomatik kapatmaz.

Canlı yayın sırasında sayfa yenilemesi sunucudaki katılımcı/rol kayıtlarını silmez; sürmekte olan görsel gösteriler yeniden başlamayabilir. **Sunucuyu yeniden başlatmak** geçici sahne, kuyruk ve katılımcıları sıfırlar. Kod güncellemelerini yayın kapalıyken uygulayın.

## Hediye gösterileri ve roller

| Eylem | Süre / sonuç |
| --- | --- |
| Piste çık | Ücretli katılım isteğe bağlı; gösteri 6 saniye |
| VIP ol | 8 saniye; kısa yürüyüş ve locaya oturma |
| Sazcı ol | 8 saniye; saz çalma yakın çekimi |
| Darbukacı ol | 8 saniye; darbuka çalma yakın çekimi |
| DJ ol | 8 saniye |
| Garson ol | 6 saniye |
| Dansöz ol | 10 saniye; 5 sahne konumundan birini alır |
| Sahne Şovu | 12 saniye; dört kaşıkla solo oyun, çevrede toplanan ve alkışlayan pist katılımcıları |
| Para saç | 6 saniye; gönderen geçici olarak dansöze gidip para saçar |
| Konfeti patlat | 6 saniye |
| Coştur | 18 saniye; farklı figürler, uygun çiftlerde eş değişimi, pistte kamera geçişleri |
| Geceyi sonlandır | Bildirim; yayını yayıncı kendisi kapatır |

Başlayan hediye gösterisi tamamlanır. Yeni hediye, sohbet yakın çekimi veya otomatik kamera turu devam eden gösteriyi kesmez. Bekleyenlerde öncelik **Coştur → Dansöz / Sahne Şovu → VIP / DJ / Saz / Darbuka → Garson / Para saç / Konfeti → Ücretli piste giriş** şeklindedir. Aynı öncelikte geliş sırası korunur; gösteriler arasında kısa genel plan bulunur.

Kullanıcının **kalıcı rolü son istediği roldür**. Önce saz, sonra VIP alan kişi VIP'de kalır; sıradaki eski hediye gösterisi bitti diye saza geri taşınmaz. Sazcı/darbukacı/DJ tek kişiliktir; yeni alan kişi yerini alınca önceki kişi uygun pist veya VIP konumuna geçer. İkisi de doluysa işlem uyarıyla reddedilebilir. Dansöz konumları doluysa en eski dansöz piste, pist doluysa korunmuş bekleme sırasına alınır.

### Kapasite ve 150 saniye kuralı

- **Pistte en fazla 66 katılımcı** bulunur. Fazlası sıraya girer; en fazla 100 kişi bekleyebilir.
- 4 VIP loca toplam 12 koltuktur. VIP, müzisyen, dansöz ve diğer roller pistteki 66 kişiden ayrıdır. Dekor NPC'leri de ekranda görünebilir; toplam görünen kişi sayısının 66'dan büyük olması pist sınırının aşıldığı anlamına gelmez.
- Ücretsiz pist katılımcısının sohbet, beğeni veya hediye etkileşimi aktiflik süresini yeniler.
- 150 saniye etkileşim göstermeyen ücretsiz pist katılımcısı çıkarılır; bekleme sırası da temizlenir. Yer açılınca sıradaki kişi alınır.
- VIP, müzisyen ve ücretli rol alanlar otomatik çıkarılmaz. Ücretli rol aldıktan sonra piste dönmüş kişi de korunur.
- Yayıncı **Karakter tercihi → Sahnedeki izleyiciler → Sahneden çıkar** ile kişiyi kaldırabilir.

Bu, “yayından kesin ayrıldı” tespiti değildir: sessizce izleyen biri de etkileşim gelmediği için çıkarılabilir. Bağlantı kesildiğinde süre duraklatılır. Kullanıcı uygun komutla yeniden katılabilir.

### İsim, profil fotoğrafı ve sohbet

TikTok olayında profil fotoğrafı gelirse isim balonunda kullanılır; gelmez veya yüklenemezse harfli gösterim kalır. Sohbet, sahnede karakteri bulunan kişinin yanında yaklaşık 6 saniye görünür. Sohbet yakın çekimleri hediye gösterilerinin önüne geçmez.

## Güncelleme, yedek ve özel dosyalar

### Neler saklanır?

| Yer | İçerik |
| --- | --- |
| `private/settings.json` | Hesap ayarları, Euler anahtarı, hediye/müzik/kamera ayarları |
| `private/preferences.json` | Yayıncı hesabı ve kullanıcı kimliğine göre karakter tercihleri |
| `private/music.bin` ve metadata | Son yüklenen ses dosyası |
| `private/video.bin` ve metadata | Son yüklenen kamera videosu |
| `.env` | İsteğe bağlı yerel ortam ayarları |

Ayarlar, medya ve tercihler sunucu kapanınca kalır. O anki pist katılımcıları, rol sahipleri ve bekleyen gösteriler sunucu yeniden başladığında sıfırlanır.

`private/`, `.env`, `node_modules/`, günlükler ve yerel ekran kayıtları `.gitignore` kapsamındadır. **`git add -f` ile bunları zorla eklemeyin.** Anahtar yerel dosyada tutulur; şifreli bir kasa değildir. Tarayıcıya/API yanıtına geri gönderilmez. Yedeği yalnızca kendinizin erişebildiği bir yerde tutun; Issue açarken anahtar, özel dosya veya kişisel medya paylaşmayın.

### Güncelleme

Önce yayını bitirin ve sunucuyu `Ctrl+C` ile durdurun. Kendi `private/` klasörünüzü özel bir konuma yedekleyin.

Git ile kurduysanız:

```sh
git pull --ff-only
npm ci
npm start
```

Yerel kod değişiklikleriniz nedeniyle güncelleme durursa değişikliklerinizi yedekleyip karşılaştırın; zorla sıfırlamayın. ZIP ile kurduysanız yeni ZIP'i ayrı klasöre çıkarın, kendi `private/` klasörünüzü ve kullanıyorsanız `.env` dosyanızı yeni klasöre taşıyıp orada `npm ci` ve `npm start` çalıştırın. Eski ve yeni sunucuyu aynı anda aynı portta açmayın.

### İsteğe bağlı `.env`

Normal kullanımda panel yeterlidir. İsterseniz `.env.example` dosyasını `.env` olarak kopyalayıp kullanıcı adı, anahtar ve port girin. Kaydedilmiş panel ayarları varsa aynı alanlar için öncelik yerel ayarlardadır. `.env` içine başka kişinin anahtarını koymayın; dosyayı paylaşmayın.

### Mobil / başka bilgisayardan erişim

Bu sürüm sunucuyu **yalnızca `127.0.0.1` üzerinde** açar. Telefonda aynı adres, bilgisayarınızı değil telefonu gösterir. Aynı Wi-Fi'de olmak yeterli değildir; bilgisayarın LAN IP'sini yazmak da bu sürümde çözüm değildir. Sunucuda uzaktan giriş/kullanıcı yetkilendirmesi bulunmaz ve mobil erişim hazır sunulmaz. Paneli port yönlendirme veya tünelle internete açmayın.

## Sorun giderme

| Belirti | Kontrol / çözüm |
| --- | --- |
| `node` / `npm` bulunamıyor | Node.js'i kurun, terminali kapatıp yeniden açın; `node --version` ile kontrol edin. |
| PowerShell `npm.ps1` çalıştırmıyor | Komut İstemi kullanın veya `npm.cmd ci` / `npm.cmd start` yazın; sistem güvenlik politikasını değiştirmeniz gerekmez. |
| `bad option: --env-file-if-exists` | Node sürümü eski; en az 22.9.0 kurun. |
| `package.json` bulunamıyor | Terminal yanlış klasörde. `package.json` bulunan proje klasöründe komutları çalıştırın. |
| Sayfa açılmıyor / bağlantı yok | `npm start` açık mı, terminalde hata var mı, port 4320 mi? Adresi aynı bilgisayarda açın. |
| `EADDRINUSE` / port kullanımda | Önceki ÂLÂ sunucusunu kendi terminalinde `Ctrl+C` ile durdurun. Gerekirse `.env` içindeki `PORT` değerini değiştirip tüm yayın adreslerini buna göre güncelleyin. |
| Model yüklenemedi / pist görünmüyor | ZIP'in tamamını çıkardığınızı ve `public/assets` klasörünün bulunduğunu kontrol edin; proje içinde `npm ci` çalıştırın. HTML dosyasını doğrudan açmayın. |
| WebGL / siyah 3D ekran | Tarayıcının grafik hızlandırmasını, ekran kartı sürücüsünü ve sayfadaki hata metnini kontrol edin; güncel tarayıcıyla deneyin. |
| Başka bilgisayarda kamera veya müzik yok | Kişisel medya repoda bulunmaz; o bilgisayarda yeniden yükleyin veya webcam seçin. |
| Müzik duyulmuyor | Dosya yüklü/çalıyor mu? Yayın penceresine bir kez tıklayın. Ses seviyesi ve OBS/LIVE Studio ses yakalama kaynağını kontrol edin. |
| Müzik iki kez geliyor | Birden fazla yayın penceresini veya stüdyo ses dinlemesini kapatın; aynı uygulamayı iki ses kaynağından yakalamayın. |
| Video sesi geliyor | ÂLÂ içindeki video sessizdir. Aynı videoyu yayın programına ayrı sesli medya kaynağı olarak eklediyseniz o kaynağı kontrol edin. |
| `kadın` / `erkek` yazınca gelmiyor | Varsayılan ayarda bu mesaj yalnızca karakteri seçer; giriş için Gül gerekir. ÂLÂ doğru hesaba bağlı mı? Ücretsiz giriş istiyorsanız panelden açın. Pist doluysa bekleme sırasına bakın. |
| Hediye rolü çalışmıyor | İki tarafta aynı hediye ID'si seçili mi? Eşleşmeler kaydedildi mi? Kişi karakter seçimi bekliyor mu? Başka gösteri sürüyorsa sırada olabilir. |
| Katalog yüklenmiyor | Euler anahtarı, internet ve hizmet erişimini kontrol edin; anahtarı önce kaydedin. |
| Euler anahtarı geçersiz / bağlantı limiti | Euler hesabında anahtarın ve erişimin etkinliğini/kotasını kontrol edin. Aynı anahtarla gereksiz paralel bağlantıları kapatın. |
| Sürekli “Yayın bekleniyor” | Girdiğiniz `@kullaniciadi` ile gerçekten yayın açtığınızı kontrol edin; görünen profil adını girmeyin. |
| Çok kasıyor | Tek yayın penceresi kullanın, gereksiz 3D sekmeleri kapatın, 720×1280 veya 1280×720 gibi daha düşük kaynak boyutunu deneyin. Oyun hedefi 30 FPS'dir; yayın kodlama yükü de cihazı etkiler. |
| Test düğmeleri kapalı | Canlı bağlantı/bekleme açık olabilir. Yerel test için önce Bağlantıyı kes seçin. |

Hata bildirirken işletim sistemi, `node --version`, hangi adımı yaptığınız ve gizli bilgi içermeyen hata metni yeterlidir. Gerçek Euler anahtarınızı veya `private/` dosyalarınızı göndermeyin.

## Teknik sınırlar ve kaynaklar

Oyun Node.js yerel sunucu + Three.js tarayıcı sahnesinden oluşur. TikTok olayları Euler WebSocket bağlantısıyla gelir; yerel pencereler aynı sunucuyu SSE ile dinler. Socket.IO gerekmez. Yönetim ve yayın pencerelerinin oyuncu durumları paylaşılır; animasyon kareleri/kamera saatleri ve müzik oynatma konumu ayrı pencerelerde birebir eşzamanlı değildir.

Hareketler programla üretilir; yüklediğiniz müziğin ritmini otomatik analiz etmez. Animasyonların ortak temposu 112 BPM'dir. Gerçek insan modelleri oyun varlıklarıdır; fotogerçekçi tarama veya gerçek dansçı hareket yakalaması değildir. Varlık kaynakları ve lisans bilgisi [ASSETS.md](ASSETS.md) dosyasındadır.

Geliştirici doğrulaması için proje klasöründe `npm test` çalıştırılabilir. Bu testlerde Euler taklit edilir; gerçek yayın uçtan uca denemesi ayrıca gerekir.
