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

Pistte 10 kadın ve 10 erkek temel model dönüşümlü seçilir. Kadın katılımcıların görünümü kullanıcının verdiği gece kıyafeti referanslarından esinlenir: bordo altın işleme, siyah çiçekli dantel, gece mavisi ışıltı, şampanya brokar, mürdüm saten ve zebra desen. `public/club-fashion.js` renk, makyaj, saç ve modele uygun etek boylarını tanımlar. Bu görseller yeni bir taranmış karakter modeli değildir; mevcut MIT lisanslı yetişkin modellerin yüzleri ve iskeletleri kullanılır.

`public/evening-outfit.js` modele göre ölçülen bel/kalça yüzeyine oturan, ön ve arka derinliği ayrı hesaplanan elbiseler oluşturur. Eski pantolon/etek/çizme gövdeleri yalnızca bu kıyafeti kullanan katılımcılarda gizlenir. Etek, bacaklar, ayakkabılar, halka küpeler, kolye, bilezik ve kemer tokası tek bir iskeletli mesh içinde çizilir. Elbise hareket ederken kalça ve uyluk ağırlıklarını takip eder; rol değişimlerinde kaybolmaz. Erkekler, dekor seyircileri ve dansöz kostümleri bu kıyafet değişikliğine dahil değildir.

`public/evening-hair.js` düz/dalgalı uzun saç, bukle, at kuyruğu ve topuz ayrıntıları oluşturur. Saç dipleri başı, uzun uçlar üst gövdeyi takip eder; aradaki kemik ağırlıkları yumuşak geçiş yapar. Saçın göğüs ve sırt açıklığı modelin gerçek gövde ölçülerinden hesaplanır. Ek saç tek mesh, kıyafet ve takılar tek mesh kullanır. Geometriler modele göre, materyaller altı palete göre paylaşılır; karakter başına yeni doku indirilmez ve kumaş/saç fizik simülasyonu çalışmaz. Ek kıyafet 6.500, ek saç 5.500 üçgenin altında tutulur. Göz, kaş ve dudak ayrıntıları korunarak ruj, göz kalemi, far ve allık belirginleştirilir; ten ve kumaş aynı şekilde boyanmaz. Kaynak GLB dosyaları ve lisansları değiştirilmez.

Kol ve el kemik ağırlıkları, eski pantolonu gizleyen kesme işleminden ayrı tutulur: aşağıdaki parmaklar kesilmez, elin kaynak avuç/eklem/tırnak dokusu kumaşla boyanmaz. Bacaklar diz, baldır ve bilek kesitleri arasında yumuşak geçiş kullanır; UV dikişlerindeki normaller birleştirilir. Bilek ve ayak üstü aynı kesintisiz yüzeydir. Karakter önizlemesindeki “El detayı” ve “Bacak detayı” düğmeleri bu bölgeleri yakından gösterir.

Yerel `/wardrobe-preview.html` sayfası, on kadın görünümünü önden/arkadan, yüz yakın planında ve dans ederken incelemek içindir. Yayına veya TikTok'a bağlanmaz.

## Ankara oyun havası hareket referansları

- Dance with Devrim, temel adım eğitimi: https://www.youtube.com/watch?v=NtaMl-h7j_k — sekiz sayıda sağ/sol basış ve ağırlık geçişi için görsel referans.
- Ankara Kalkınma Ajansı, *Anadolu’nun Sırlı Sesi: Müziğiyle Ankara*: https://kutuphane.ankaraka.org.tr/upload/dokumandosya/muzigiyle_ankara_kitabi.pdf — düz oyunda baş ve orta parmakla şıklatma, hafif basışlar, kuvvetli/hafif bölüm ayrımı ve bir kol belde duruş için araştırma referansı.

Videodan ses, görüntü, hareket yakalama verisi veya animasyon dosyası projeye kopyalanmadı. `dance-motion.js` sayılı adım dizisi ve `finger-gesture.js` el pozları bu proje için yazıldı. Gerçek dansçıdan alınmış mocap değildir; birebir performans kopyası iddiası yoktur. Hazır Ankara dans paketi eklenmedi.

- MEB, Bağlamada Temel Davranışlar: https://tymm.meb.gov.tr/muzik-okullari-bireysel-calgi-egitimi-dersi-baglama-modulu/unite/1123 — oturuş, tutuş, sağ/sol el ve tezene çalışması için eğitim referansı. Enstrüman modelleri ve hareketler bu projede üretilmiş prosedürel varlıklardır; eğitim kaynağından model, video veya hareket kaydı alınmamıştır.

Kumaş paleti model adına göre çeşitlenir; bütün kalabalık aynı pembe palete dönmez. Fiziksel kumaş simülasyonu yoktur. Ruj/far yoğunluğu ve dudak parlaklığı artırılmıştır.
