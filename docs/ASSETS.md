# Varlık kaynakları

## İnsan modelleri ve animasyonlar

Microsoft Rocketbox — Copyright (c) 2020 Microsoft, **MIT**.

- Orijinal kaynak: https://github.com/microsoft/Microsoft-Rocketbox
- GLB dönüşümleri ve dağıtım: https://models.codelove.in/
- Dağıtım lisans sayfası: https://models.codelove.in/license/
- Lisans metni: [CHARACTER-LICENSE.txt](CHARACTER-LICENSE.txt). Ayrıca indirilmiş GLB dosyalarının `asset.extras.licenseText` alanında korunmuştur.
- Aktif modeller: female-party-02, female-adult-11, female-adult-01, female-adult-02, female-adult-15, female-adult-03, female-adult-13, female-adult-17, female-party-01, female-adult-08, male-adult-08, male-adult-11, male-adult-09, male-adult-12, male-adult-04, male-adult-02, male-adult-07, male-adult-10, male-adult-16, male-adult-20, business-male-06. Diğer eski dosyalar yüklenmez.
- Kullanılan kadın/erkek animasyonları: Idle, Dance, Walk, Clap, Cheer.
- Tam model bilgileri `public/assets/catalog.json` içinde.

Modellerdeki materyal ayarları ışıklandırmaya göre değiştirilir. Kemik dönüşleri kullanılır; oturma, servis ve enstrüman pozları sahnede hesaplanır. Modellerin kendisi GLB olarak orijinal lisans bilgileriyle saklanmıştır.

## Mekân ve enstrümanlar

Bu proje için kodla oluşturulan özgün geometri: yuvarlak salon/pist/sahne, çevresel kadife oturma grupları, şişeler/kadehler, masalar, DJ masası, saz ve darbuka. Referans ekran görüntülerinden model, doku, müzik veya kod alınmadı.

Three.js 0.185.1 — MIT; npm paketinin LICENSE dosyasına bakın.

## Gece kıyafetleri ve yüz okunurluğu

Pistte 10 kadın ve 10 erkek görünümü dönüşümlü seçilir. Kadın seçkisinde kısa elbise, şort, etek ve pantolonlu gece kombinleri vardır. Sonradan eklenen uzun pembe etek geometrileri kaldırıldı; kıyafetler kaynak modelin kendi iskeletli geometrisini kullanır. Erkeklerde gömlek, tişört, denim/deri ceket ve spor üstler çeşitlenir. Garsonun beyaz gömlekli modeli ayrıdır. Modeller MIT lisanslıdır; fotogerçekçi tarama değildir.

Saç boyası, ruj/far/allık ve kıyafet renkleri `public/appearance.js` içindeki GLSL katmanlarıyla uygulanır. Kadın pist karakterlerinin seçimi ve görünümü 20'li yaşlarda yetişkin bir kulüp tarzına göre düzenlenmiştir: kısa elbise/etek, askılı saten üst, şort ve koyu denim kombinleri önceliklidir. `public/club-fashion.js` altı uyumlu saç, makyaj ve kıyafet paleti ile modele özel üst/alt/çizme bölgelerini tanımlar. Üst ve pantolon ayrı renklenir; ten bölgeleri korunur. Kumaşlardaki eski desenler ve aşırı parlama azaltılır. Yakın çekimde alın, yanak ve göz altı gölgeleri hafif yumuşatılır; göz, kaş ve dudak ayrıntıları korunur. Erkeklerde gri saç paleti kaldırıldı. Kaynak GLB dokuları değiştirilmez. Saç kartı kabuğu 2,5 mm genişletilir; ek iskelet veya fizik simülasyonu eklenmez. Malzemeler aynı altı görünüm havuzunda paylaşılır.

## Ankara oyun havası hareket referansları

- Dance with Devrim, temel adım eğitimi: https://www.youtube.com/watch?v=NtaMl-h7j_k — sekiz sayıda sağ/sol basış ve ağırlık geçişi için görsel referans.
- Ankara Kalkınma Ajansı, *Anadolu’nun Sırlı Sesi: Müziğiyle Ankara*: https://kutuphane.ankaraka.org.tr/upload/dokumandosya/muzigiyle_ankara_kitabi.pdf — düz oyunda baş ve orta parmakla şıklatma, hafif basışlar, kuvvetli/hafif bölüm ayrımı ve bir kol belde duruş için araştırma referansı.

Videodan ses, görüntü, hareket yakalama verisi veya animasyon dosyası projeye kopyalanmadı. `dance-motion.js` sayılı adım dizisi ve `finger-gesture.js` el pozları bu proje için yazıldı. Gerçek dansçıdan alınmış mocap değildir; birebir performans kopyası iddiası yoktur. Hazır Ankara dans paketi eklenmedi.

- MEB, Bağlamada Temel Davranışlar: https://tymm.meb.gov.tr/muzik-okullari-bireysel-calgi-egitimi-dersi-baglama-modulu/unite/1123 — oturuş, tutuş, sağ/sol el ve tezene çalışması için eğitim referansı. Enstrüman modelleri ve hareketler bu projede üretilmiş prosedürel varlıklardır; eğitim kaynağından model, video veya hareket kaydı alınmamıştır.

Kumaş paleti model adına göre çeşitlenir; bütün kalabalık aynı pembe palete dönmez. Fiziksel kumaş simülasyonu yoktur. Ruj/far yoğunluğu ve dudak parlaklığı artırılmıştır.
