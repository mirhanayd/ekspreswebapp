# Yerel Otobüs Firması Web Uygulaması

## Sıfırdan Şirket Sunumuna Hazır Demo MVP’ye Geliştirme Rehberi ve Ayrıntılı Roadmap

**Doküman türü:** Ürün ön bilgisi + teknik mimari + uygulama geliştirme planı + kabul kriterleri + sunum hazırlık planı  
**Doküman tarihi:** 6 Ağustos 2026  
**Hedef ürün:** Türkiye’de çok sayıda il ve ilçeye sefer düzenleyen yerel bir otobüs firması için modern, üyelikli, rezervasyon/satın alma ve canlı araç takip özellikli responsive web uygulaması  
**Hedef platformlar:** Web, iPhone/iPad Safari, Android Chrome; PWA olarak ana ekrana eklenebilir kullanım  
**Sunum hedefi:** Şirket yöneticisine 5–7 dakikada baştan sona çalışan, güven veren ve gerçek ürüne dönüşme yolu açık bir demo göstermek  
**Önerilen ana teknoloji yığını:** Next.js + NestJS + TypeScript + PostgreSQL/PostGIS + Redis + MapLibre + Docker

> Bu dokümanın amacı yalnızca “hangi ekranlar yapılmalı?” sorusunu cevaplamak değildir. Projeyi sıfırdan kuracak bir geliştiricinin; ürün kararlarından veritabanı kısıtlarına, canlı konum simülasyonundan test senaryolarına, CI/CD’den şirket sunumuna kadar izlemesi gereken yolu tek bir kaynakta tarif eder.

---

## İçindekiler

1. Dokümanın kullanım şekli
2. Projenin özeti ve iş hedefi
3. Demo MVP, pilot ve production ayrımı
4. Başarı tanımı ve sunuma hazır olma ölçütleri
5. Kapsam, kapsam dışı işler ve temel varsayımlar
6. Kullanıcı tipleri ve ihtiyaçları
7. Ürün bilgi mimarisi ve ekran haritası
8. Ana kullanıcı akışları
9. Teknoloji yığını ve mimari kararlar
10. Sistem mimarisi
11. Modüler monolit yapısı
12. Monorepo ve klasör yapısı
13. Ortamlar ve konfigürasyon yönetimi
14. Veritabanı modeli
15. Rezervasyon ve koltuk kilitleme modeli
16. Sipariş, ödeme ve bilet durum makineleri
17. Harita, rota ve durak sistemi
18. Canlı otobüs konumu ve simülasyon altyapısı
19. API tasarımı
20. WebSocket olay sözleşmesi
21. Kimlik doğrulama ve yetkilendirme
22. UI/UX tasarım sistemi
23. Responsive ve iOS uyumluluğu
24. Güvenlik, KVKK ve veri yönetimi
25. Loglama, izlenebilirlik ve hata yönetimi
26. Test stratejisi
27. CI/CD ve dağıtım
28. Sıfırdan kurulum adımları
29. Ayrıntılı faz bazlı roadmap
30. Sprint planı
31. Görev bağımlılıkları ve kritik yol
32. Demo verileri ve seed planı
33. Şirket sunumu senaryosu
34. Sunum öncesi kabul kontrol listesi
35. Risk kaydı ve önlemler
36. Ekip ve süre tahmini
37. Demo sonrası pilot yol haritası
38. Production’a geçişte zorunlu sertleştirmeler
39. İş listesi şablonları ve Definition of Done
40. Ekler: örnek komutlar, `.env`, API yanıtları, test senaryoları ve kaynaklar

---

# 1. Dokümanın kullanım şekli

Bu dosya üç farklı biçimde kullanılabilir:

1. **Geliştirme planı olarak:** Her fazdaki görevler GitHub Issues, Linear, Jira veya başka bir görev sistemine aktarılır.
2. **Teknik referans olarak:** Veritabanı, API, canlı takip, durum makineleri ve güvenlik kararları geliştirme boyunca temel kabul edilir.
3. **Şirket sunumu hazırlığı olarak:** “Demo hazır olma” ve “sunum senaryosu” bölümleri tamamlanmadan uygulama şirkete gösterilmez.

## 1.1 Zorunlu çalışma prensibi

Projede her büyük özellik aşağıdaki sırayla ele alınmalıdır:

```text
İş ihtiyacı
→ Kullanıcı akışı
→ Kabul kriteri
→ Veri modeli
→ API sözleşmesi
→ UI durumu
→ Hata/boş/yükleniyor durumları
→ Test senaryosu
→ İzleme/loglama
→ Dokümantasyon
```

Bir ekranın görünmesi o özelliğin tamamlandığı anlamına gelmez. Örneğin koltuk seçimi ekranı yalnızca görsel olarak çalışıyorsa ürün açısından tamamlanmış değildir. Aynı koltuğun eşzamanlı iki kullanıcı tarafından alınmasını engelleyen backend ve veritabanı kontrolü de bulunmalıdır.

## 1.2 Sürüm isimlendirmesi

- **Prototype:** Tasarım ve akış gösterimi; gerçek veri kaydı zorunlu değil.
- **Demo MVP:** Temel akış gerçek backend ve veritabanıyla çalışır; ödeme ve GPS simüle edilebilir.
- **Pilot:** Sınırlı güzergâh ve araçla gerçek kullanıcı/operasyon testi yapılır.
- **Production:** Gerçek ödeme, güvenlik, KVKK, yüksek erişilebilirlik, yedekleme ve operasyon süreçleri tamamlanmıştır.

Bu roadmap’in ana hedefi **Demo MVP** seviyesidir; son bölümler pilot ve production geçişini de tarif eder.

---

# 2. Projenin özeti ve iş hedefi

## 2.1 Ürün vizyonu

Yerel otobüs firmasının dijital satış, müşteri deneyimi ve sefer görünürlüğünü tek bir modern platformda birleştirmek.

Kullanıcı, uygulama üzerinden:

- kalkış ve varış noktası seçebilmeli,
- tarih bazında sefer arayabilmeli,
- uygun seferleri filtreleyebilmeli,
- otobüs özelliklerini ve güzergâhı görebilmeli,
- koltuk seçebilmeli,
- rezervasyon veya satın alma işlemi gerçekleştirebilmeli,
- biletini hesabında saklayabilmeli,
- aktif sefer sırasında otobüsün güncel konumunu haritada izleyebilmeli,
- sıradaki durak ve tahmini varış bilgisini görebilmelidir.

Firma personeli ise:

- şehir, ilçe, terminal ve durakları yönetebilmeli,
- güzergâh oluşturabilmeli,
- sefer planlayabilmeli,
- otobüs ve koltuk şablonu atayabilmeli,
- bilet ve rezervasyonları izleyebilmeli,
- aktif araçları haritada görebilmeli,
- gerektiğinde fiyat, sefer veya araç bilgilerini güncelleyebilmelidir.

## 2.2 İş değeri

Uygulamanın şirkete sunduğu temel değerler:

- Telefon ve yazıhane bağımlılığını azaltmak
- Online bilet satış kanalını güçlendirmek
- Müşterinin sefer öncesi belirsizliğini azaltmak
- Canlı araç takibiyle güven ve şeffaflık sağlamak
- Tekrarlayan müşterileri üyelik ve kayıtlı yolcu özellikleriyle elde tutmak
- Operasyon verisini merkezi bir sistemde toplamak
- Daha sonra mobil uygulama, sadakat programı, kampanya ve CRM entegrasyonuna temel oluşturmak

## 2.3 Ürün konumlandırması

Bu proje yalnızca “bilet satan web sitesi” olarak konumlandırılmamalıdır. Sunum dili şu çerçevede kurulmalıdır:

> Firmanın satış, yolcu bilgilendirme ve canlı sefer görünürlüğünü aynı platformda birleştiren dijital yolculuk deneyimi.

Bu ifade projeyi hazır bilet listeleme sitelerinden ayırır. En güçlü farklılaştırıcı, **firma markasına özel arayüz + canlı rota/otobüs görünürlüğü + doğrudan müşteri ilişkisi** olacaktır.

---

# 3. Demo MVP, pilot ve production ayrımı

## 3.1 Demo MVP’de mutlaka gerçek çalışması gerekenler

- Kullanıcı kaydı ve giriş
- Şehir/ilçe/terminal verilerinin backend’den gelmesi
- Tarihe göre sefer arama
- Sefer sonuçlarının veritabanından listelenmesi
- Sefer detay sayfası
- Koltuk şemasının backend’den gelmesi
- Koltuk seçimi ve geçici tutma işlemi
- Yolcu bilgisi kaydı
- Rezervasyon veya test satın alma işlemi
- Biletin veritabanında oluşması
- Biletin “Biletlerim” sayfasında görünmesi
- Bir örnek güzergâhın harita üzerinde çizilmesi
- Durakların sıralı gösterilmesi
- Aktif bilet ekranında hareket eden otobüs simülasyonu
- Basit bir yönetim ekranında sefer ve biletlerin görüntülenmesi
- Mobil cihazlarda düzgün responsive görünüm
- İnternete yayınlanmış demo adresi

## 3.2 Demo MVP’de simüle edilebilecekler

- Gerçek kredi kartı çekimi
- Gerçek GPS cihazından veri
- Gerçek SMS gönderimi
- Gerçek e-posta gönderimi
- E-fatura/e-arşiv entegrasyonu
- Tüm Türkiye rota ve sefer verileri
- Karmaşık iptal/iade akışı
- Gerçek sadakat puanı
- Apple/Google sosyal giriş

Simüle edilen her özellik arayüzde ve sunum anlatımında açıkça “demo/test” olarak işaretlenmelidir.

## 3.3 Pilot seviyesinde eklenecekler

- 1–2 gerçek güzergâh
- 1–3 gerçek otobüs
- Gerçek personel hesabı
- Gerçek GPS veya sürücü uygulaması
- Test ödeme yerine sağlayıcı sandbox ve kontrollü gerçek ödeme
- SMS/e-posta bildirimleri
- Destek ve geri bildirim kaydı
- Temel operasyon paneli
- Gerçek müşteri geri bildirimi

## 3.4 Production seviyesinde eklenecekler

- Gerçek ödeme ve mutabakat
- İptal/iade politikaları
- Gelişmiş rol/yetki matrisi
- Yüksek erişilebilirlik
- Otomatik yedekleme ve geri yükleme tatbikatı
- Güvenlik testi ve sızma testi
- KVKK süreçlerinin hukuki olarak tamamlanması
- Log saklama ve olay müdahale prosedürü
- SLA, alarm ve nöbet süreçleri
- Çoklu güzergâh, çoklu filo ve yüksek eşzamanlı kullanıcı desteği

---

# 4. Başarı tanımı ve sunuma hazır olma ölçütleri

## 4.1 Ürün başarısı

Demo aşağıdaki baştan sona akışı kesintisiz tamamlayabiliyorsa temel ürün başarısı sağlanmış kabul edilir:

```text
Ana sayfa
→ Kalkış/varış/tarih seçimi
→ Sefer sonuçları
→ Sefer detayı
→ Koltuk seçimi
→ Yolcu bilgileri
→ Test ödeme veya rezervasyon
→ Bilet oluşumu
→ Biletlerim
→ Aktif bilet
→ Canlı konum simülasyonu
```

## 4.2 Görsel başarı

- Tasarım sistemi tüm ana ekranlarda tutarlı olmalı.
- Mobil görünüm bir masaüstü sitenin küçültülmüş hâli gibi görünmemeli.
- Ana CTA’lar tek elle erişilebilir olmalı.
- Harita ekranı firmanın markasına özel görünmeli.
- Yükleniyor, boş veri, hata ve başarı durumları tasarlanmış olmalı.
- Demo sırasında kırık görsel, varsayılan tarayıcı stili veya teknik hata metni görünmemeli.

## 4.3 Teknik başarı

- Kritik API’ler otomatik testlerden geçmeli.
- Aynı koltuk iki aktif kullanıcıya satılamamalı.
- Kimliği doğrulanmamış kullanıcı başka kullanıcının biletine erişememeli.
- Aktif bilet canlı takip kanalına yalnızca yetkili kullanıcı bağlanabilmeli.
- Veritabanı migration ve seed komutları tek komutla çalışmalı.
- Demo ortamı sıfırdan yeniden kurulabilir olmalı.
- Hatalar yapılandırılmış log olarak kaydedilmeli.

## 4.4 Sunum hazır olma eşiği

| Alan                    |                            Hedef seviye |
| ----------------------- | --------------------------------------: |
| Ana kullanıcı akışı     |                            %100 çalışır |
| UI bütünlüğü            |                                  %85–90 |
| Responsive uyumluluk    |                                    %85+ |
| iOS Safari kontrolü     |                   Kritik akışlarda %100 |
| Backend temel modüller  |                     %70–80 demo kapsamı |
| Gerçek ödeme            |                           Zorunlu değil |
| Gerçek GPS              |                           Zorunlu değil |
| Canlı takip simülasyonu |                            %100 çalışır |
| Admin demo paneli       |                                  %30–40 |
| Test kapsamı            |                    Kritik akışlar tamam |
| Dokümantasyon           | Kurulum + mimari + demo senaryosu hazır |

---

# 5. Kapsam, kapsam dışı işler ve temel varsayımlar

## 5.1 Demo kapsamı

### Yolcu tarafı

- Kayıt/giriş
- Ana sayfa ve arama
- Sefer listesi
- Sefer detayı
- Güzergâh ön izlemesi
- Koltuk seçimi
- Yolcu bilgileri
- Test checkout
- Bilet özeti ve QR
- Biletlerim
- Aktif bilet canlı haritası
- Profil ve temel bildirim tercihleri

### Firma tarafı

- Admin giriş
- Dashboard özeti
- Sefer listesi
- Sefer oluşturma/güncelleme
- Otobüs ve koltuk planı görüntüleme
- Bilet/rezervasyon listesi
- Aktif araç haritası

## 5.2 Demo kapsamı dışı

- Çoklu firma/marketplace mimarisi
- Karmaşık acente komisyon sistemi
- Gerçek muhasebe entegrasyonu
- Dinamik fiyatlandırma motoru
- Kapsamlı sadakat programı
- Yolcu yorum sistemi
- Müşteri hizmetleri ticket sistemi
- E-fatura/e-arşiv
- Çağrı merkezi entegrasyonu
- Gerçek zamanlı trafik bazlı kesin ETA
- Çok dil desteği
- App Store/Google Play yayını

## 5.3 Varsayımlar

- İlk demo tek firma için hazırlanacaktır.
- Para birimi TRY olacaktır.
- Saat dilimi `Europe/Istanbul` olacaktır.
- İlk sürüm Türkçe olacaktır.
- Demo verileri gerçeğe yakın ama sentetik olacaktır.
- En az bir güzergâhın koordinatları elle hazırlanacaktır.
- Harita tile hizmeti lisanslı bir sağlayıcıdan veya uygun bir test kaynağından alınacaktır.
- Gerçek ödeme kart verisi uygulama sunucusuna alınmayacaktır.
- Gerçek GPS gelene kadar konum verisi sunucu taraflı simülatör tarafından üretilecektir.

---

# 6. Kullanıcı tipleri ve ihtiyaçları

## 6.1 Misafir kullanıcı

İhtiyaçları:

- Üye olmadan sefer aramak
- Sefer detaylarını ve fiyatı görmek
- Güzergâh ve durakları incelemek
- Satın alma aşamasında hesap açmak veya misafir checkout seçmek

Demo kararı: İlk sürümde checkout öncesi hesap açma zorunlu tutulabilir. Bu, veri modeli ve bilet sahipliği kontrolünü sadeleştirir.

## 6.2 Kayıtlı yolcu

İhtiyaçları:

- Hızlı sefer arama
- Kayıtlı yolcuları kullanma
- Bilet satın alma/rezervasyon
- Aktif ve geçmiş biletleri görme
- QR bilete erişme
- Canlı otobüs konumunu izleme
- Bildirim tercihlerini yönetme

## 6.3 Operasyon personeli

İhtiyaçları:

- Seferleri ve araç atamalarını görme
- Güzergâh/durak kontrolü
- Aktif otobüslerin konumlarını izleme
- Sefer durumunu güncelleme
- Gecikme veya iptal bilgisi girme

## 6.4 Satış/yazıhane personeli

İhtiyaçları:

- Sefer arama
- Koltuk uygunluğu görme
- Yolcu adına rezervasyon veya satış oluşturma
- Bilet bulma
- Yolcu iletişim bilgisini güncelleme

Demo kapsamı: Tam yazıhane POS akışı yerine yalnızca bilet listesi ve detay görüntüleme yeterlidir.

## 6.5 Yönetici

İhtiyaçları:

- Sefer, otobüs, bilet ve doluluk özeti
- Personel yetkileri
- Fiyat ve rota kontrolü
- Temel raporlar
- Sistem sağlığına ilişkin görünürlük

## 6.6 Araç konum cihazı / sürücü uygulaması

Bu insan kullanıcısı değil, sistem aktörüdür.

Sorumlulukları:

- Yetkili cihaz kimliğiyle sisteme bağlanmak
- Sefer kimliğini taşımak
- Zaman damgalı konum göndermek
- İnternet kesildiğinde kayıtları yerelde sıraya almak
- Yeniden bağlanınca eksik noktaları göndermek

---

# 7. Ürün bilgi mimarisi ve ekran haritası

## 7.1 Yolcu web uygulaması

```text
/
├── /login
├── /register
├── /search
├── /trips
│   └── /[tripId]
│       ├── /seats
│       └── /route
├── /checkout
│   ├── /passengers
│   ├── /payment
│   └── /success
├── /tickets
│   └── /[ticketId]
│       └── /live
├── /profile
│   ├── /passengers
│   ├── /notifications
│   └── /security
├── /help
├── /privacy
└── /terms
```

## 7.2 Yönetim paneli

```text
/admin
├── /login
├── /dashboard
├── /locations
│   ├── /cities
│   ├── /districts
│   ├── /terminals
│   └── /stops
├── /routes
│   └── /[routeId]
├── /trips
│   └── /[tripId]
├── /buses
│   └── /[busId]
├── /seat-layouts
├── /tickets
├── /reservations
├── /live-fleet
├── /users
├── /roles
└── /settings
```

## 7.3 Alt navigasyon önerisi

Mobil yolcu uygulamasında dört ana sekme:

1. Ana Sayfa
2. Seferler / Keşfet
3. Biletlerim
4. Profil

Aktif bilet varsa “Biletlerim” sekmesinde durum noktası veya küçük canlı göstergesi bulunabilir.

## 7.4 Ekran durumları

Her ekran için aşağıdaki durumlar ayrı tasarlanmalıdır:

- İlk yüklenme
- Skeleton loading
- Veri yok
- Filtre sonucu yok
- Yetki yok
- Sunucu hatası
- Ağ bağlantısı yok
- Başarılı işlem
- Kısmi veri
- Yeniden deneme
- Süresi dolmuş işlem

Özellikle checkout ve canlı harita ekranlarında yalnızca “ideal durum” tasarlamak ciddi demo riski oluşturur.

---

# 8. Ana kullanıcı akışları

## 8.1 Sefer arama akışı

```mermaid
flowchart TD
    A[Ana sayfa] --> B[Kalkış seç]
    B --> C[Varış seç]
    C --> D[Tarih seç]
    D --> E[Yolcu sayısı]
    E --> F[Sefer ara]
    F --> G{Sonuç var mı?}
    G -- Hayır --> H[Alternatif tarih/rota öner]
    G -- Evet --> I[Sefer listesi]
    I --> J[Filtrele/sırala]
    J --> K[Sefer detayı]
```

Kabul kriterleri:

- Kalkış ve varış aynı olamaz.
- Geçmiş tarih seçilemez.
- Sefer sonuçları kalkış saatine göre varsayılan sıralanır.
- Fiyat, saat ve koltuk uygunluğu gösterilir.
- Sefer bitmiş veya satışa kapalıysa seçilemez.

## 8.2 Koltuk seçimi akışı

```mermaid
flowchart TD
    A[Sefer detayı] --> B[Koltuk planını yükle]
    B --> C[Uygun koltuğu seç]
    C --> D[Backend uygunluğu yeniden doğrular]
    D --> E{Uygun mu?}
    E -- Hayır --> F[Koltuk güncellendi uyarısı]
    F --> B
    E -- Evet --> G[5 dakikalık hold oluştur]
    G --> H[Checkout sayacı başlat]
```

Kabul kriterleri:

- Dolu koltuk seçilemez.
- Başka kullanıcı tarafından tutulmuş koltuk seçilemez.
- Hold süresi görünür olmalıdır.
- Süre dolunca checkout engellenir ve kullanıcı yeniden koltuk seçer.
- Hold uzatma varsa yalnızca kontrollü ve tek sefer yapılmalıdır.

## 8.3 Rezervasyon/satın alma akışı

```mermaid
flowchart TD
    A[Aktif seat hold] --> B[Yolcu bilgileri]
    B --> C[Kuralları ve fiyatı doğrula]
    C --> D[Order draft oluştur]
    D --> E[Test ödeme]
    E --> F{Sonuç}
    F -- Başarılı --> G[Transaction içinde ticket oluştur]
    G --> H[Seat PURCHASED]
    H --> I[Bilet başarı ekranı]
    F -- Başarısız --> J[Ödeme hatası]
    J --> K{Hold devam ediyor mu?}
    K -- Evet --> E
    K -- Hayır --> L[Yeniden koltuk seç]
```

## 8.4 Aktif bilet ve canlı takip akışı

```mermaid
flowchart TD
    A[Biletlerim] --> B[Aktif bilet]
    B --> C[Bilet yetkisini doğrula]
    C --> D[Son konumu REST ile al]
    D --> E[WebSocket kanalına bağlan]
    E --> F[Konum güncellemelerini işle]
    F --> G[Otobüs markerını hareket ettir]
    G --> H[Sıradaki durak/ETA güncelle]
    E --> I{Bağlantı koptu mu?}
    I -- Evet --> J[Exponential backoff ile yeniden bağlan]
    J --> D
```

---

# 9. Teknoloji yığını ve mimari kararlar

## 9.1 Ana teknoloji matrisi

| Katman           | Teknoloji                            | Neden                                                           |
| ---------------- | ------------------------------------ | --------------------------------------------------------------- |
| Yolcu web        | Next.js App Router + TypeScript      | SSR/CSR dengesi, responsive web/PWA, güçlü React ekosistemi     |
| Admin web        | Next.js + TypeScript                 | Ortak UI ve tip paylaşımı                                       |
| API              | NestJS + TypeScript                  | Modüler backend, validation, guards, OpenAPI, WebSocket gateway |
| Ana DB           | PostgreSQL                           | İlişkisel veri, transaction, güçlü constraint ve kilitleme      |
| Coğrafi DB       | PostGIS                              | Point, LineString, spatial index, rota ve mesafe sorguları      |
| Cache/hold       | Redis                                | TTL’li seat hold, cache, rate limit, pub/sub veya stream        |
| Harita           | MapLibre GL JS                       | Özelleştirilebilir vektör harita, özel katmanlar ve markerlar   |
| ORM/SQL          | Drizzle ORM + kontrollü raw SQL      | Type-safe sorgular; PostGIS ve kilitlemede SQL kontrolü         |
| API şeması       | OpenAPI/Swagger                      | Frontend-backend sözleşmesi ve test kolaylığı                   |
| Validation       | Zod veya class-validator             | Girdi doğrulama; paket sınırlarına göre tek standart seçilmeli  |
| Test             | Vitest/Jest + Supertest + Playwright | Birim, entegrasyon, API ve E2E testleri                         |
| Paket yöneticisi | pnpm                                 | Monorepo ve hızlı bağımlılık yönetimi                           |
| Monorepo         | Turborepo veya pnpm workspaces       | Ortak UI, contract ve config paketleri                          |
| Container        | Docker Compose                       | Yerel ve staging ortam tutarlılığı                              |
| CI               | GitHub Actions                       | Lint, typecheck, test, build, migration kontrolü                |
| Hata izleme      | Sentry benzeri servis                | Frontend/backend hata görünürlüğü                               |
| Log              | Pino + yapılandırılmış JSON          | Hızlı, aranabilir, correlation ID destekli log                  |

## 9.2 Neden TypeScript?

- Frontend ve backend aynı dilde geliştirilebilir.
- DTO, API contract ve ortak enumlar paylaşılabilir.
- Refactor sırasında kırılmalar erken yakalanır.
- Harita, WebSocket ve UI katmanlarında güçlü ekosistem bulunur.
- Ekip büyüdüğünde kod okunabilirliği artar.

TypeScript tek başına runtime güvenliği sağlamaz. Dışarıdan gelen her veri yine runtime validation’dan geçirilmelidir.

## 9.3 Neden Next.js App Router?

- Dosya tabanlı routing
- Layout, loading ve error boundary yapıları
- Server ve Client Component ayrımı
- SEO’ya açık kurumsal sayfalar
- PWA için uygun web tabanı
- Yolcu ve admin uygulamalarında ortak React bileşenleri

Ana kural: Her bileşeni gereksiz biçimde Client Component yapmamak. Form, harita, etkileşim ve tarayıcı API’si gereken alanlar client; veri ağırlıklı statik/SSR alanlar server olabilir.

## 9.4 Neden NestJS?

- Modül sınırlarını açık tutar.
- Guards, pipes, interceptors ve exception filters sunar.
- REST ve WebSocket’i aynı backend içinde yönetebilir.
- OpenAPI dokümantasyonu üretilebilir.
- Modüler monolitten mikroservise geçişi kolaylaştırır.

## 9.5 Neden modüler monolit?

Demo aşamasında mikroservis şu sorunları gereksiz yere büyütür:

- Birden fazla deploy
- Dağıtık transaction
- Mesajlaşma altyapısı
- Gözlemlenebilirlik karmaşıklığı
- Yerel geliştirme zorluğu
- Daha fazla operasyon maliyeti

Başlangıçta tek NestJS uygulaması içinde net modüller kurulur. Canlı konum ingestion veya notification worker daha sonra ayrı servise ayrılabilir.

## 9.6 Sürüm stratejisi

Dokümanda “her zaman latest kullan” yaklaşımı önerilmez. Proje başında:

- Desteklenen Node.js LTS seçilir.
- Paketlerin birbiriyle uyumlu kararlı sürümleri pinlenir.
- `pnpm-lock.yaml` repoya eklenir.
- Otomatik major güncelleme kapatılır.
- Güvenlik patch’leri kontrollü alınır.
- Her yükseltme staging ortamında test edilir.

---

# 10. Sistem mimarisi

## 10.1 Sistem bağlamı

```mermaid
flowchart LR
    Passenger[Yolcu] --> Web[Yolcu Web/PWA]
    Admin[Firma Personeli] --> AdminWeb[Admin Web]
    Driver[GPS Cihazı veya Sürücü App] --> Ingest[Location Ingest API]

    Web --> API[NestJS API]
    AdminWeb --> API
    Ingest --> API

    API --> PG[(PostgreSQL + PostGIS)]
    API --> Redis[(Redis)]
    API --> Storage[(Object Storage)]
    API --> MapProvider[Vector Tile Provider]
    API --> Notification[SMS/E-posta Sağlayıcısı - sonra]
    API --> Payment[Ödeme Sağlayıcısı - pilot/production]

    API --> WS[WebSocket Gateway]
    WS --> Web
    WS --> AdminWeb
```

## 10.2 Container düzeyi

```text
apps/web-passenger    → Next.js
apps/web-admin        → Next.js
apps/api              → NestJS REST + WebSocket
apps/tracking-sim     → Demo konum üretici worker
packages/ui           → Ortak bileşenler
packages/contracts    → DTO/şema/tipler
packages/database     → Schema, migration, seed
packages/config       → ESLint, TSConfig, env şemaları
infra/                → Docker, reverse proxy, deploy dosyaları
```

## 10.3 Veri akışı ilkeleri

- PostgreSQL nihai iş verisi kaynağıdır.
- Redis geçici ve hızlı veriler içindir.
- Seat hold yalnızca Redis’e bırakılmaz; satın alma anında PostgreSQL tekrar doğrulanır.
- Son araç konumu Redis’te hızlı erişim için tutulabilir.
- Konum geçmişi seçilmiş örnekleme oranıyla PostgreSQL/PostGIS’e yazılır.
- Kritik olaylar idempotent olmalıdır.
- Frontend hiçbir zaman fiyat veya satın alma sonucunun nihai kaynağı değildir.

## 10.4 Güven sınırları

1. Tarayıcı güvenilmez istemcidir.
2. GPS cihazı/sürücü app güvenilir kabul edilmez; cihaz kimliği ve imza gerekir.
3. Ödeme başarı ekranı ödeme kanıtı değildir; webhook veya backend doğrulaması gerekir.
4. Admin kullanıcıları da minimum yetkiyle çalışır.
5. Redis verisi kaybolabilir kabul edilerek tasarlanır.

---

# 11. Modüler monolit yapısı

NestJS içindeki önerilen modüller:

```text
auth
users
passengers
locations
terminals
stops
routes
buses
seat-layouts
trips
trip-seats
seat-holds
reservations
orders
payments
tickets
tracking
notifications
admin
audit
health
```

## 11.1 Modül sorumlulukları

### `auth`

- Kayıt
- Giriş
- Refresh token/session
- Şifre sıfırlama
- E-posta doğrulama altyapısı
- Role/permission guard

### `locations`

- İl, ilçe ve arama sözlüğü
- Normalizasyon
- Arama/autocomplete

### `routes`

- Güzergâh başlangıç/bitiş
- Sıralı duraklar
- GeoJSON LineString
- Mesafe ve tahmini süre

### `trips`

- Belirli tarih/saatte çalışan sefer
- Otobüs ve rota ataması
- Satış durumu
- Fiyat
- Kapasite

### `trip-seats`

- Sefer bazında koltuk envanteri
- AVAILABLE/HELD/PURCHASED/BLOCKED
- Cinsiyet politikası gibi gelecekteki kurallar için genişleme noktası

### `seat-holds`

- TTL
- Kullanıcı/oturum sahipliği
- Yenileme politikası
- Süre dolumu

### `orders`

- Fiyat özeti
- Yolcu bağlantısı
- Ödeme durumu
- İdempotency

### `tickets`

- Bilet numarası
- QR payload
- Durum
- Kullanıcı sahipliği
- Aktif/geçmiş bilet sorguları

### `tracking`

- Konum ingestion
- Son konum
- Konum geçmişi
- WebSocket yayınlama
- Sıradaki durak
- Stale/online durumu

### `audit`

- Admin değişiklikleri
- Kim, ne zaman, neyi değiştirdi
- Hassas alanların maskelenmesi

---

# 12. Monorepo ve klasör yapısı

```text
bus-platform/
├── apps/
│   ├── passenger-web/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── lib/
│   │   ├── public/
│   │   └── tests/
│   ├── admin-web/
│   │   ├── app/
│   │   ├── features/
│   │   └── tests/
│   ├── api/
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   ├── common/
│   │   │   ├── config/
│   │   │   └── main.ts
│   │   └── test/
│   └── tracking-simulator/
│       ├── src/
│       └── fixtures/
├── packages/
│   ├── ui/
│   ├── contracts/
│   ├── database/
│   ├── eslint-config/
│   ├── tsconfig/
│   └── test-utils/
├── docs/
│   ├── product/
│   ├── architecture/
│   ├── api/
│   ├── database/
│   ├── operations/
│   └── demo/
├── infra/
│   ├── docker/
│   ├── nginx/
│   ├── monitoring/
│   └── deployment/
├── scripts/
├── .github/workflows/
├── docker-compose.yml
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

## 12.1 Feature klasörü standardı

Örnek:

```text
features/trip-search/
├── api/
├── components/
├── hooks/
├── schemas/
├── state/
├── types/
├── utils/
└── trip-search.test.ts
```

## 12.2 Ortak paket kuralları

- `packages/ui` iş kuralı içermez.
- `packages/contracts` framework bağımlılığını minimum tutar.
- `packages/database` yalnızca schema/migration/query yardımcıları içerir.
- Uygulama içi özel bileşenler ortak UI paketine erken taşınmaz.
- Tek kullanımlık soyutlamalar oluşturulmaz.

---

# 13. Ortamlar ve konfigürasyon yönetimi

## 13.1 Ortam matrisi

| Ortam      | Amaç            | Veri                     | Erişim                 |
| ---------- | --------------- | ------------------------ | ---------------------- |
| local      | Geliştirme      | Seed/sentetik            | Geliştirici            |
| test       | Otomatik test   | Her çalışmada sıfırlanır | CI                     |
| staging    | Demo ve QA      | Gerçeğe yakın sentetik   | Ekip + firma kontrollü |
| production | Gerçek kullanım | Gerçek müşteri verisi    | Yetkili kullanıcılar   |

## 13.2 Konfigürasyon ilkeleri

- Secret değerler repoya yazılmaz.
- Her ortam için ayrı database ve Redis kullanılır.
- `NODE_ENV` tek başına yeterli konfigürasyon sistemi değildir.
- Uygulama açılışında env şeması doğrulanır.
- Eksik veya hatalı env varsa uygulama fail-fast davranır.
- Public env ve server-only env ayrılır.

## 13.3 Örnek env grupları

```dotenv
# Runtime
NODE_ENV=development
APP_ENV=local
APP_TIMEZONE=Europe/Istanbul

# URLs
PASSENGER_WEB_URL=http://localhost:3000
ADMIN_WEB_URL=http://localhost:3001
API_URL=http://localhost:4000
WS_URL=ws://localhost:4000

# Database
DATABASE_URL=postgresql://app:app@localhost:5432/bus_app

# Redis
REDIS_URL=redis://localhost:6379

# Auth
AUTH_ACCESS_TOKEN_SECRET=change-me
AUTH_REFRESH_TOKEN_SECRET=change-me-too
AUTH_ACCESS_TOKEN_TTL=15m
AUTH_REFRESH_TOKEN_TTL=30d

# Maps
MAP_STYLE_URL=
MAP_TILE_API_KEY=

# Demo
ENABLE_DEMO_PAYMENT=true
ENABLE_TRACKING_SIMULATOR=true
DEMO_ROUTE_ID=
```

Gerçek secret örnekleri `.env.example` içinde bulunmamalıdır.

---

# 14. Veritabanı modeli

## 14.1 Temel model ilkeleri

- Primary key olarak UUID kullanılabilir.
- İnsan tarafından okunabilir bilet numarası ayrı alan olmalıdır.
- Tüm zamanlar UTC saklanır; kullanıcıya `Europe/Istanbul` olarak gösterilir.
- Para değerleri floating point tutulmaz; kuruş cinsinden integer veya `numeric` kullanılır.
- Enum değişikliklerinin migration etkisi düşünülür; bazı durumlarda lookup table daha esnektir.
- Soft delete yalnızca gerçekten gerekliyse kullanılır.
- Audit alanları standartlaştırılır: `created_at`, `updated_at`, gerekirse `deleted_at`.
- PII alanları gereksiz yere çoğaltılmaz.

## 14.2 ER diyagramı

```mermaid
erDiagram
    USER ||--o{ SAVED_PASSENGER : owns
    USER ||--o{ ORDER : places
    USER ||--o{ TICKET : owns

    CITY ||--o{ DISTRICT : contains
    DISTRICT ||--o{ TERMINAL : contains
    TERMINAL ||--o{ STOP : may_host

    ROUTE ||--o{ ROUTE_STOP : includes
    STOP ||--o{ ROUTE_STOP : referenced_by

    BUS ||--o{ TRIP : assigned_to
    SEAT_LAYOUT ||--o{ BUS : defines
    ROUTE ||--o{ TRIP : schedules

    TRIP ||--o{ TRIP_SEAT : inventory
    TRIP ||--o{ ORDER : selected_for
    TRIP ||--o{ TICKET : issued_for
    TRIP ||--o{ VEHICLE_POSITION : emits

    ORDER ||--o{ ORDER_PASSENGER : contains
    ORDER ||--o| PAYMENT : paid_by
    ORDER ||--o{ TICKET : creates

    TRIP_SEAT ||--o{ SEAT_HOLD : temporarily_locked
    TICKET }o--|| TRIP_SEAT : assigns
```

## 14.3 Önerilen tablolar

### `users`

- `id`
- `email`
- `phone_e164`
- `password_hash`
- `first_name`
- `last_name`
- `status`
- `email_verified_at`
- `phone_verified_at`
- `last_login_at`
- `created_at`
- `updated_at`

Constraints:

- Normalize edilmiş e-posta için unique index
- Telefon varsa unique veya firma politikasına göre kontrollü index
- Şifre hash’i dışarı dönülmez

### `saved_passengers`

- `id`
- `user_id`
- `first_name`
- `last_name`
- `identity_type`
- `identity_value_encrypted` veya production’da gerekli hukuki karara göre tokenized değer
- `birth_date`
- `gender` yalnızca iş kuralı/hukuki ihtiyaç varsa
- `is_default`

### `cities`

- `id`
- `name`
- `slug`
- `plate_code`
- `is_active`

### `districts`

- `id`
- `city_id`
- `name`
- `slug`
- `is_active`

### `terminals`

- `id`
- `district_id`
- `name`
- `address`
- `location geometry(Point, 4326)`
- `phone`
- `is_active`

### `stops`

- `id`
- `terminal_id nullable`
- `name`
- `type`
- `location geometry(Point, 4326)`
- `boarding_allowed`
- `dropoff_allowed`
- `is_active`

### `routes`

- `id`
- `code`
- `name`
- `origin_stop_id`
- `destination_stop_id`
- `geometry geometry(LineString, 4326)`
- `distance_meters`
- `estimated_duration_minutes`
- `version`
- `is_active`

### `route_stops`

- `id`
- `route_id`
- `stop_id`
- `sequence`
- `distance_from_origin_meters`
- `planned_offset_minutes`
- `dwell_minutes`

Constraints:

- `(route_id, sequence)` unique
- `(route_id, stop_id, sequence)` kontrollü unique
- İlk ve son durak route origin/destination ile tutarlı olmalı

### `seat_layouts`

- `id`
- `name`
- `deck_count`
- `seat_count`
- `layout_json`
- `version`
- `is_active`

`layout_json` örneği:

```json
{
  "rows": 12,
  "columns": 5,
  "items": [
    { "type": "driver", "row": 1, "column": 1 },
    { "type": "seat", "seatNo": "1", "row": 2, "column": 1 },
    { "type": "aisle", "row": 2, "column": 3 },
    { "type": "seat", "seatNo": "2", "row": 2, "column": 4 }
  ]
}
```

### `buses`

- `id`
- `fleet_code`
- `plate_number`
- `brand`
- `model`
- `model_year`
- `seat_layout_id`
- `amenities_json`
- `status`

### `trips`

- `id`
- `route_id`
- `bus_id`
- `departure_at`
- `planned_arrival_at`
- `sales_open_at`
- `sales_close_at`
- `base_price_minor`
- `currency`
- `status`
- `tracking_status`
- `created_at`

Trip status örneği:

```text
DRAFT
SCHEDULED
BOARDING
DEPARTED
IN_PROGRESS
ARRIVED
COMPLETED
CANCELLED
```

### `trip_seats`

- `id`
- `trip_id`
- `seat_no`
- `seat_type`
- `price_minor`
- `status`
- `version`

Constraints:

- `(trip_id, seat_no)` unique
- Satın alma işlemi transaction içinde yürütülür

### `seat_holds`

- `id`
- `trip_seat_id`
- `user_id`
- `session_id`
- `status`
- `expires_at`
- `created_at`
- `released_at`

Bu tablo audit ve yeniden kurma için tutulabilir; aktif TTL hızlı kontrolü Redis’te olabilir.

### `orders`

- `id`
- `order_no`
- `user_id`
- `trip_id`
- `status`
- `subtotal_minor`
- `discount_minor`
- `total_minor`
- `currency`
- `idempotency_key`
- `expires_at`
- `created_at`

### `order_passengers`

- `id`
- `order_id`
- `trip_seat_id`
- `first_name`
- `last_name`
- `identity_snapshot_encrypted nullable`
- `contact_phone`
- `contact_email`

### `payments`

- `id`
- `order_id`
- `provider`
- `provider_payment_id`
- `status`
- `amount_minor`
- `currency`
- `failure_code`
- `paid_at`
- `raw_response_redacted jsonb`

### `tickets`

- `id`
- `ticket_no`
- `user_id`
- `trip_id`
- `trip_seat_id`
- `order_id`
- `status`
- `qr_token_hash`
- `issued_at`
- `cancelled_at`

### `vehicle_devices`

- `id`
- `bus_id`
- `device_code`
- `credential_hash`
- `status`
- `last_seen_at`

### `vehicle_positions`

- `id`
- `trip_id`
- `bus_id`
- `device_id`
- `location geometry(Point, 4326)`
- `speed_kph`
- `heading_deg`
- `accuracy_m`
- `recorded_at`
- `received_at`
- `source`

Spatial index:

```sql
CREATE INDEX vehicle_positions_location_gix
ON vehicle_positions
USING GIST (location);
```

## 14.4 Kritik indeksler

- `trips(route_id, departure_at, status)`
- `trip_seats(trip_id, status)`
- `tickets(user_id, status, issued_at desc)`
- `orders(user_id, created_at desc)`
- `route_stops(route_id, sequence)`
- `vehicle_positions(trip_id, recorded_at desc)`
- GiST: route geometry, stop location, terminal location, vehicle position

## 14.5 Veri bütünlüğü kuralları

- Satın alınmış koltuk için tek aktif ticket olmalı.
- Ticket ve order trip kimliği aynı olmalı.
- Payment amount order total ile eşleşmeli.
- Trip departure geçmişteyse yeni satış yapılamamalı.
- Cancelled trip için yeni hold açılamamalı.
- Route stop sequence boşluk bırakmamalı; bu servis seviyesinde doğrulanabilir.

---

# 15. Rezervasyon ve koltuk kilitleme modeli

## 15.1 Durum makinesi

```mermaid
stateDiagram-v2
    [*] --> AVAILABLE
    AVAILABLE --> HELD: hold oluştur
    HELD --> AVAILABLE: TTL doldu/release
    HELD --> PURCHASED: ödeme başarılı
    AVAILABLE --> BLOCKED: operasyon engeli
    BLOCKED --> AVAILABLE: engel kaldır
    PURCHASED --> CANCELLED: iptal/iade
```

## 15.2 Hold oluşturma algoritması

1. Kullanıcı ve sefer doğrulanır.
2. Sefer satışa açık mı kontrol edilir.
3. Seçilen koltuklar tek transaction içinde sorgulanır.
4. Gerekli satırlar `FOR UPDATE` ile kilitlenir.
5. Koltukların `AVAILABLE` olduğu kontrol edilir.
6. Aktif Redis hold anahtarı olup olmadığı kontrol edilir.
7. PostgreSQL’de hold kaydı oluşturulur.
8. Redis’te TTL’li anahtar yazılır.
9. Koltuk statüsü `HELD` olarak güncellenir veya durum dinamik hesaplanır.
10. İstemciye `holdId`, `expiresAt` ve fiyat özeti döner.

Örnek Redis anahtarı:

```text
seat-hold:trip:{tripId}:seat:{seatNo}
```

Value:

```json
{
  "holdId": "...",
  "userId": "...",
  "sessionId": "...",
  "expiresAt": "..."
}
```

## 15.3 Satın alma anı

Ödeme başarılı olsa bile koltuk şu şekilde yeniden doğrulanmalıdır:

1. Order bulunur.
2. İdempotency kontrol edilir.
3. İlgili trip seat satırı kilitlenir.
4. Hold’ün aynı kullanıcı/order’a ait ve süresi geçmemiş olduğu doğrulanır.
5. Payment amount doğrulanır.
6. Ticket oluşturulur.
7. Trip seat `PURCHASED` yapılır.
8. Hold `CONSUMED` yapılır.
9. Redis anahtarı silinir.
10. Transaction commit edilir.

## 15.4 Yarış durumu senaryoları

### Senaryo A: İki kullanıcı aynı koltuğu aynı anda seçer

- İlk transaction kilidi alır.
- İkinci transaction bekler.
- İlk hold oluşturup commit eder.
- İkinci transaction güncel durumu görür ve `SEAT_NOT_AVAILABLE` döner.

### Senaryo B: Ödeme yanıtı gecikir, hold süresi dolar

Demo yaklaşımı:

- Payment initiated ise kısa grace period uygulanabilir.
- Production’da sağlayıcı davranışı ve hukuk/iş politikasıyla netleştirilmelidir.
- Webhook geldiğinde order state ve hold ownership tekrar kontrol edilir.

### Senaryo C: Aynı ödeme webhook’u iki kez gelir

- `provider_payment_id` unique tutulur.
- Handler idempotent çalışır.
- İkinci çağrı mevcut başarılı sonucu döndürür; ikinci ticket oluşturmaz.

### Senaryo D: Redis erişilemez

- Satın alma güvenliği PostgreSQL ile korunur.
- Yeni hold oluşturma kontrollü olarak durdurulabilir.
- Sistem “koltuk rezervasyonu geçici olarak kullanılamıyor” hatası verir.
- Redis hiçbir zaman satın alma kaydının tek kaynağı olmaz.

---

# 16. Sipariş, ödeme ve bilet durum makineleri

## 16.1 Order durumu

```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> PENDING_PAYMENT
    PENDING_PAYMENT --> PAID
    PENDING_PAYMENT --> PAYMENT_FAILED
    PENDING_PAYMENT --> EXPIRED
    PAYMENT_FAILED --> PENDING_PAYMENT: yeniden dene
    PAID --> FULFILLED: ticket üretildi
    PAID --> REFUND_PENDING
    REFUND_PENDING --> REFUNDED
    DRAFT --> CANCELLED
```

## 16.2 Payment durumu

```text
CREATED
REQUIRES_ACTION
PROCESSING
SUCCEEDED
FAILED
CANCELLED
REFUND_PENDING
REFUNDED
PARTIALLY_REFUNDED
```

## 16.3 Ticket durumu

```text
ACTIVE
USED
COMPLETED
CANCELLED
REFUNDED
EXPIRED
```

## 16.4 Demo ödeme adaptörü

Aynı interface production sağlayıcısına geçişte korunmalıdır:

```ts
interface PaymentProvider {
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyCallback(input: VerifyCallbackInput): Promise<VerifiedPayment>;
  refund(input: RefundInput): Promise<RefundResult>;
}
```

Demo sağlayıcı davranışı:

- Test kartı veya “Ödemeyi başarılı simüle et” butonu
- Belirli test senaryoları: başarı, yetersiz bakiye, 3D secure başarısız, timeout
- Gerçek kart alanı saklanmaz
- Ekranda açıkça `Demo ödeme` etiketi

## 16.5 Fiyatın kaynağı

- Frontend yalnızca fiyat gösterir.
- Checkout başlangıcında backend fiyatı yeniden hesaplar.
- Order içinde fiyat snapshot’ı tutulur.
- Sonradan trip fiyatı değişse bile mevcut order etkilenmez.
- İndirimler ayrı satır veya açıklanabilir discount breakdown olarak tutulur.

---

# 17. Harita, rota ve durak sistemi

## 17.1 Harita katmanları

Önerilen katman sırası:

1. Base vector tiles
2. Su/zemin/yollar
3. Route shadow line
4. Tam rota çizgisi
5. Tamamlanmış rota çizgisi
6. Durak noktaları
7. Seçili durak halo
8. Otobüs markerı
9. Kullanıcı konumu — yalnızca açık izinle ve gerekli ekranda
10. Floating UI kontrolleri

## 17.2 Route geometry

- Veritabanında `LineString` saklanır.
- API GeoJSON döner.
- Admin rota editöründe duraklar sıralanır.
- İlk geometri routing motorundan üretilebilir.
- Firma operasyonu rotayı onaylamadan production’da yayınlamaz.

Örnek GeoJSON:

```json
{
  "type": "Feature",
  "properties": {
    "routeId": "route_istanbul_siirt",
    "name": "İstanbul - Siirt"
  },
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [28.9784, 41.0082],
      [32.8597, 39.9334],
      [41.9419, 37.9333]
    ]
  }
}
```

## 17.3 Harita stil stratejisi

- Harita sağlayıcısının kullanım koşulları incelenir.
- Google Maps tile’ları çekilip yeniden stillendirilmez.
- MapLibre ile lisanslı/uygun vektör tile kaynağı kullanılır.
- OSM attribution görünür tutulur.
- Marka rengi yalnızca rota ve etkileşimde güçlü kullanılır.
- Gereksiz POI ve etiketler azaltılır.
- Gece modu için ayrı style JSON hazırlanabilir.

## 17.4 Durak kartı içeriği

- Sıra numarası
- Durak/terminal adı
- Planlanan varış
- Gerçek/tahmini varış
- Duraklama süresi
- Biniş/iniş durumu
- Tamamlandı / sıradaki / bekliyor durumu

## 17.5 Harita performansı

- Her konum güncellemesinde harita instance yeniden oluşturulmaz.
- Route GeoJSON sabit tutulur.
- Otobüs marker koordinatı güncellenir.
- Çok sayıda araçta HTML marker yerine style layer değerlendirilebilir.
- Büyük GeoJSON payload’ları sadeleştirilir.
- Harita görünmeyen sekmede gereksiz animasyon azaltılır.
- Düşük güç modunda update frekansı düşürülebilir.

## 17.6 Erişilebilirlik

Harita tek bilgi kaynağı olmamalıdır. Aynı bilgiler metin olarak da sunulmalıdır:

- “Otobüs son olarak 14:32’de güncellendi.”
- “Sıradaki durak: Ankara AŞTİ.”
- “Tahmini varış: 18 dakika.”
- “Konum geçici olarak güncellenemiyor.”

---

# 18. Canlı otobüs konumu ve simülasyon altyapısı

## 18.1 Demo mimarisi

```mermaid
flowchart LR
    Fixture[Route fixture/GeoJSON] --> Simulator[Tracking Simulator]
    Simulator --> Ingest[Location Ingest API]
    Ingest --> Redis[(Redis last position + pub/sub)]
    Ingest --> PG[(PostGIS history)]
    Redis --> Gateway[WebSocket Gateway]
    Gateway --> TicketUI[Active Ticket UI]
    Gateway --> FleetUI[Admin Fleet Map]
```

## 18.2 Simülatör gereksinimleri

- Route LineString üzerinde ilerlemeli.
- Ayarlanabilir hız kullanmalı.
- Duraklarda bekleme simüle etmeli.
- Heading hesaplamalı.
- `recordedAt` ve `receivedAt` üretmeli.
- Pause/resume/reset desteklemeli.
- Gecikme senaryosu üretebilmeli.
- Ağ kesintisi ve stale konum senaryosu üretebilmeli.
- Demo başlamadan belirli noktaya alınabilmeli.

## 18.3 Simülasyon algoritması

1. Route koordinatları segmentlere ayrılır.
2. Her segmentin mesafesi hesaplanır.
3. Toplam mesafe üzerinden ilerleme yüzdesi tutulur.
4. Hız ve elapsed time ile yeni mesafe bulunur.
5. İlgili segmentte interpolation yapılır.
6. Heading bir sonraki koordinata göre hesaplanır.
7. Durak yakınlığı threshold ile kontrol edilir.
8. Durakta dwell süresi uygulanır.
9. Konum payload’ı ingestion API’ye gönderilir.

## 18.4 Önerilen demo update frekansı

- Sunucu simülasyonu: 2–5 saniye
- UI animasyonu: iki gerçek update arasında yumuşak interpolation
- Tarihçe DB yazımı: her update yerine 10–30 saniyede bir veya önemli olaylarda

Bu değerler production GPS cihazı özelliklerine göre değişir.

## 18.5 Konum payload sözleşmesi

```json
{
  "tripId": "3e7...",
  "busId": "5ca...",
  "deviceId": "simulator-01",
  "latitude": 39.9334,
  "longitude": 32.8597,
  "speedKph": 76.4,
  "headingDeg": 112.7,
  "accuracyM": 6.5,
  "recordedAt": "2026-08-06T13:30:00.000Z",
  "sequence": 482,
  "source": "SIMULATOR"
}
```

## 18.6 Stale konum politikası

- 0–15 sn: canlı
- 15–60 sn: gecikmeli
- 60–180 sn: eski konum
- 180 sn üzeri: bağlantı yok

Eşikler cihaz ve operasyon ihtiyacına göre ayarlanır.

UI davranışı:

- Marker son bilinen konumda kalır.
- “Son güncelleme” açıkça gösterilir.
- Eski veri canlıymış gibi animasyonla ileri taşınmaz.
- Bağlantı geri gelince kontrollü güncellenir.

## 18.7 Sıradaki durak hesaplama

Basit demo yaklaşımı:

- Otobüsün route üzerindeki ilerleme oranı bulunur.
- `route_stops.distance_from_origin_meters` ile karşılaştırılır.
- İlk büyük değer sıradaki duraktır.

Daha sağlam yaklaşım:

- Konum route’a project edilir.
- Route üzerindeki line location ölçülür.
- Son geçilen durak ve yön doğrulanır.
- GPS sıçramalarına karşı smoothing uygulanır.

## 18.8 ETA yaklaşımı

Demo:

```text
kalan mesafe / son N dakikanın ortalama hızı + planlanan duraklama süreleri
```

Production:

- Gerçek trafik
- Tarihsel sefer verisi
- Yol sınıfı
- Saat/gün etkisi
- Duraklama davranışı
- Operasyon gecikmeleri

Sunumda ETA’nın “demo tahmini” olduğu belirtilmelidir.

## 18.9 Gerçek GPS’e geçiş sözleşmesi

Simülatör ve gerçek cihaz aynı ingestion API’sini kullanmalıdır. Böylece frontend ve backend tracking katmanı değişmez; yalnızca veri kaynağı değişir.

Kaynak enum:

```text
SIMULATOR
MOBILE_APP
GPS_DEVICE
EXTERNAL_FLEET_API
MANUAL
```

---

# 19. API tasarımı

## 19.1 Genel kurallar

- Base path: `/api/v1`
- JSON
- ISO 8601 zaman
- Para: minor unit + currency
- Pagination: cursor veya page/limit; tek standart seçilir
- Correlation ID: her response header’da
- Hata formatı standart
- OpenAPI dokümantasyonu staging’de erişilebilir
- Admin ve public endpoint’ler ayrı guard/prefix ile ayrılır

## 19.2 Örnek endpoint listesi

### Auth

```text
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
GET    /api/v1/auth/me
```

### Locations

```text
GET    /api/v1/locations/search?q=
GET    /api/v1/cities
GET    /api/v1/cities/:cityId/districts
GET    /api/v1/terminals/:terminalId
```

### Trips

```text
GET    /api/v1/trips/search?origin=&destination=&date=&passengers=
GET    /api/v1/trips/:tripId
GET    /api/v1/trips/:tripId/route
GET    /api/v1/trips/:tripId/seats
```

### Holds and checkout

```text
POST   /api/v1/trips/:tripId/seat-holds
GET    /api/v1/seat-holds/:holdId
DELETE /api/v1/seat-holds/:holdId
POST   /api/v1/orders
GET    /api/v1/orders/:orderId
POST   /api/v1/orders/:orderId/payments/demo
```

### Tickets

```text
GET    /api/v1/tickets
GET    /api/v1/tickets/:ticketId
GET    /api/v1/tickets/:ticketId/live
GET    /api/v1/tickets/:ticketId/qr
```

### Tracking ingestion

```text
POST   /api/v1/tracking/positions
GET    /api/v1/trips/:tripId/tracking/latest
GET    /api/v1/trips/:tripId/tracking/history
```

### Admin

```text
GET    /api/v1/admin/dashboard
CRUD   /api/v1/admin/routes
CRUD   /api/v1/admin/trips
CRUD   /api/v1/admin/buses
CRUD   /api/v1/admin/seat-layouts
GET    /api/v1/admin/tickets
GET    /api/v1/admin/live-fleet
```

## 19.3 Standart başarı yanıtı

```json
{
  "data": {
    "id": "..."
  },
  "meta": {
    "requestId": "req_..."
  }
}
```

## 19.4 Standart hata yanıtı

```json
{
  "error": {
    "code": "SEAT_NOT_AVAILABLE",
    "message": "Seçtiğiniz koltuk artık uygun değil.",
    "details": {
      "seatNo": "18"
    },
    "requestId": "req_..."
  }
}
```

## 19.5 Hata kodu örnekleri

```text
AUTH_INVALID_CREDENTIALS
AUTH_SESSION_EXPIRED
VALIDATION_FAILED
TRIP_NOT_FOUND
TRIP_SALES_CLOSED
SEAT_NOT_AVAILABLE
SEAT_HOLD_EXPIRED
ORDER_PRICE_CHANGED
PAYMENT_FAILED
TICKET_NOT_FOUND
TICKET_ACCESS_DENIED
TRACKING_NOT_AVAILABLE
TRACKING_STALE
RATE_LIMITED
INTERNAL_ERROR
```

## 19.6 İdempotency

Aşağıdaki işlemler idempotency key kabul etmelidir:

- Order oluşturma
- Ödeme başlatma
- Payment callback
- Ticket üretme
- GPS position ingestion, cihaz sequence numarası varsa

Header örneği:

```text
Idempotency-Key: 9d66...
```

## 19.7 API versioning

Demo için `/v1` yeterlidir. Breaking change yapılırsa:

- Yeni DTO ve endpoint version oluşturulur.
- Eski version deprecation süresiyle çalışır.
- Web ve admin deploy sırası planlanır.

---

# 20. WebSocket olay sözleşmesi

## 20.1 Bağlantı

- JWT/session ile authentication
- Ticket veya trip erişimi server tarafında doğrulanır
- Kullanıcı yalnızca yetkili olduğu room’a katılır
- Admin ayrı permission ile filo room’larına katılır

## 20.2 Room isimleri

```text
trip:{tripId}:tracking
user:{userId}:notifications
admin:fleet
```

## 20.3 Client → Server events

```text
tracking:subscribe
tracking:unsubscribe
tracking:ping
```

Örnek:

```json
{
  "event": "tracking:subscribe",
  "data": {
    "ticketId": "..."
  }
}
```

## 20.4 Server → Client events

```text
tracking:snapshot
tracking:position
tracking:status
trip:statusChanged
trip:delayUpdated
tracking:error
```

Position örneği:

```json
{
  "event": "tracking:position",
  "data": {
    "tripId": "...",
    "latitude": 39.9334,
    "longitude": 32.8597,
    "speedKph": 76.4,
    "headingDeg": 112.7,
    "recordedAt": "2026-08-06T13:30:00.000Z",
    "nextStop": {
      "id": "...",
      "name": "Ankara AŞTİ",
      "etaMinutes": 18
    }
  }
}
```

## 20.5 Reconnect stratejisi

- 1 sn
- 2 sn
- 4 sn
- 8 sn
- 15 sn tavan
- Random jitter
- Yeniden bağlanınca snapshot isteği

WebSocket mesajı kaçırılmış olabilir. Bu nedenle reconnect sonrası yalnızca devam eden event akışına güvenilmez; son snapshot REST veya socket snapshot event’iyle alınır.

## 20.6 Redis mesajlaşma seçimi

- Yalnızca canlı marker güncellemesi: Pub/Sub kabul edilebilir.
- Kaybolmaması gereken olay: Redis Streams veya kalıcı queue.
- Payment, ticket ve notification olayları Pub/Sub’a bırakılmaz.

---

# 21. Kimlik doğrulama ve yetkilendirme

## 21.1 Yolcu auth önerisi

Demo için iki seçenek:

1. HttpOnly cookie tabanlı session
2. Kısa ömürlü access token + HttpOnly refresh token

Tarayıcı uygulaması için HttpOnly cookie yaklaşımı XSS ile token çalınması riskini azaltabilir. CSRF koruması ve SameSite ayarları doğru yapılmalıdır.

## 21.2 Şifre politikası

- Minimum uzunluk
- Bilinen zayıf şifreleri reddetme
- Hash: Argon2id veya güvenli güncel alternatif
- Plain-text loglama kesinlikle yok
- Reset token tek kullanımlık ve süreli
- Admin hesaplarında MFA planı

## 21.3 Roller

```text
PASSENGER
SUPPORT_AGENT
SALES_AGENT
OPERATIONS
ADMIN
SUPER_ADMIN
DEVICE
```

## 21.4 Permission örnekleri

```text
trip.read
trip.create
trip.update
trip.cancel
ticket.read
ticket.refund
route.manage
bus.manage
tracking.read_all
tracking.ingest
user.manage
role.manage
audit.read
```

## 21.5 Sahiplik kontrolleri

- Kullanıcı `ticketId` bilse bile başka kullanıcı bileti göremez.
- Ticket query her zaman `ticket.user_id = currentUser.id` veya ilgili yetkiyle filtrelenir.
- WebSocket subscription’da da aynı kontrol yapılır.
- QR endpoint’i kısa ömürlü veya imzalı token kullanabilir.

## 21.6 Admin güvenliği

- Yolcu ve admin login alanları ayrılabilir.
- Admin endpoint’leri farklı rate limit ve audit’e sahip olur.
- Kritik işlemler reason alanı isteyebilir.
- Sefer iptali, fiyat değişikliği ve refund audit log oluşturur.

---

# 22. UI/UX tasarım sistemi

## 22.1 Tasarım yönü

Verilen referans ekranlardan alınabilecek ilkeler:

- Büyük, güçlü tipografi
- Yumuşak, yuvarlatılmış kartlar
- Açık ve sıcak arka plan
- Koyu, yüksek kontrastlı bottom navigation
- Harita üzerinde floating kontroller
- Bilet kartında kalkış/varışın güçlü hiyerarşisi
- Tarih ve filtreler için pill/chip yapıları
- Birincil CTA’nın net görünmesi

Birebir kopya yapılmaz. Firmanın logosu, renkleri, bölgesel kimliği ve güven hissi merkeze alınır.

## 22.2 Tasarım tokenları

Örnek token kategorileri:

```text
color.background.canvas
color.background.surface
color.background.elevated
color.text.primary
color.text.secondary
color.border.subtle
color.brand.primary
color.brand.primaryHover
color.status.success
color.status.warning
color.status.danger
color.status.info
radius.sm
radius.md
radius.lg
radius.xl
space.1 ... space.12
shadow.sm
shadow.floating
typography.display
typography.title
typography.body
typography.caption
```

Renkler firma kimliği belli olduktan sonra belirlenmelidir. Erişilebilir kontrast kontrolü yapılmadan yalnızca estetik referansa göre seçilmemelidir.

## 22.3 Tipografi

- Display: ana seyahat başlığı
- H1: sayfa başlığı
- H2: bölüm başlığı
- Body: 16 px altına mobilde dikkatle inilmeli
- Caption: 12–13 px, yüksek kontrast
- Sayısal saat/fiyat alanlarında tabular numerals değerlendirilebilir

## 22.4 Temel bileşenler

- AppShell
- TopHeader
- BottomNavigation
- SearchLocationField
- DatePicker
- PassengerSelector
- TripCard
- RouteSummary
- AmenityChip
- FilterSheet
- SeatMap
- SeatLegend
- HoldCountdown
- PassengerForm
- PriceBreakdown
- TicketCard
- QRCard
- LiveTripMap
- StopTimeline
- TrackingStatusBadge
- EmptyState
- ErrorState
- Skeleton
- Toast
- ConfirmationDialog
- AdminDataTable

## 22.5 Sefer kartı içeriği

- Kalkış saati
- Varış saati
- Kalkış/varış terminali
- Süre
- Fiyat
- Kalan koltuk
- Otobüs tipi
- Özellikler
- Direkt/ara durak bilgisi
- “Koltuk seç” CTA

## 22.6 Koltuk haritası

Durumlar:

- Available
- Selected
- Held by self
- Held by other
- Purchased
- Blocked
- Accessible seat
- Special seat type

Koltuk rengi tek gösterge olmamalıdır. İkon, border veya pattern ile desteklenmelidir.

## 22.7 Canlı bilet ekranı yerleşimi

Mobil:

```text
[Header: rota + canlı durumu]
[Harita — ekranın ana alanı]
[Floating zoom/location controls]
[Bottom sheet]
  - Sıradaki durak
  - ETA
  - Son güncelleme
  - Durak zaman çizelgesi
  - Bilet/QR kısayolu
```

Desktop:

```text
[Sol: harita 2/3]
[Sağ: bilet, durak timeline, araç bilgisi 1/3]
```

## 22.8 Mikro etkileşimler

- Arama alanı seçilince sheet açılması
- Tarih chip geçişi
- Koltuk seçiminde hafif scale/haptic benzeri görsel feedback
- Hold sayacı son 60 saniyede uyarı
- Otobüs markerının yön açısıyla dönmesi
- Durak tamamlandığında timeline geçişi
- Payment success sonrası ölçülü konfeti değil, güven veren başarı animasyonu

## 22.9 Loading stratejisi

- Sayfa geneli spinner yerine skeleton
- Harita yüklenirken statik placeholder
- Koltuk planında shimmer yerine layout iskeleti
- CTA işlemdeyken disabled + progress
- Double submit engeli

## 22.10 Hata metni ilkeleri

Teknik mesaj göstermeyin:

Kötü:

```text
500 Internal Server Error
```

İyi:

```text
Sefer bilgileri şu anda yüklenemedi. Lütfen tekrar deneyin.
```

Kritik işlemlerde request ID kullanıcı destek ekranında gösterilebilir.

---

# 23. Responsive ve iOS uyumluluğu

## 23.1 Hedef tarayıcılar

Demo için minimum test matrisi:

- iPhone Safari — güncel iOS
- iPad Safari
- Android Chrome
- Desktop Chrome/Edge
- Desktop Safari mümkünse
- Firefox temel kontrol

Kesin sürüm desteği firma ve hedef kitle analizi sonrası belirlenir.

## 23.2 PWA davranışı

- Web app manifest
- App icon set
- Theme color
- Standalone display
- Offline fallback sayfası
- Ana ekran kurulum yönlendirmesi
- Service worker güncelleme stratejisi

Checkout ve bilet oluşturma offline çalışmaz. Offline olduğunda kullanıcıya açık mesaj verilmelidir.

## 23.3 iOS safe area

Alt navigasyon ve sheet’ler şu CSS değişkenlerini dikkate almalıdır:

```css
padding-bottom: env(safe-area-inset-bottom);
padding-top: env(safe-area-inset-top);
```

## 23.4 Viewport ve klavye

- Mobil klavye açıldığında CTA kaybolmamalı.
- `100vh` yerine modern viewport birimleri veya kontrollü layout kullanılmalı.
- Form alanına scroll davranışı test edilmeli.
- Date picker native/web kararı iOS’ta ayrıca kontrol edilmeli.

## 23.5 Harita dokunma davranışı

- Harita scroll’u tüm sayfayı kilitlememeli.
- Pinch zoom ve sayfa zoom çakışması test edilmeli.
- Floating kontroller minimum dokunma alanına sahip olmalı.
- Bottom sheet harita gesture’larıyla çatışmamalı.

## 23.6 Web push

İlk demo için zorunlu değildir. Ana ekrana eklenen PWA ve izin koşulları platforma göre değişebileceği için bildirim mimarisi opsiyonel geliştirilmelidir; kritik sefer bildirimlerinde SMS/e-posta alternatifleri planlanmalıdır.

## 23.7 Native uygulamaya geçiş

Yolcu tarafı ilk aşamada PWA olabilir. Daha sonra:

- React Native yolcu uygulaması
- Aynı NestJS API
- Ortak contract paketleri
- MapLibre native çözümü
- Deep link ve push notification

Araçtan arka planda konum gönderme için PWA yerine native sürücü uygulaması veya fiziksel GPS cihazı gereklidir.

---

# 24. Güvenlik, KVKK ve veri yönetimi

> Bu bölüm teknik hazırlık rehberidir; hukuki danışmanlık yerine geçmez. Gerçek kullanıcı verisi ve ödeme öncesinde şirketin hukuk ve bilgi güvenliği sorumluları süreci onaylamalıdır.

## 24.1 Veri sınıflandırması

### Public

- Firma adı
- Güzergâhlar
- Sefer saatleri
- Genel fiyatlar

### Internal

- Otobüs filo kodu
- Operasyon notları
- Personel ekranları

### Personal

- Ad soyad
- E-posta
- Telefon
- Yolcu bilgisi
- Bilet geçmişi

### Sensitive/High-risk

- Kimlik numarası gerekiyorsa
- Ödeme ilişkili veriler
- Personel GPS konumu
- Güvenlik tokenları

## 24.2 Veri minimizasyonu

- Demo için gerçek T.C. kimlik numarası toplamayın.
- Gereksiz doğum tarihi/cinsiyet alanı eklemeyin.
- Kimlik verisi iş gereği zorunluysa şifreleme/tokenization ve erişim politikası belirleyin.
- Kart numarası, CVV ve tam ödeme verisi uygulama backend’ine alınmamalıdır.

## 24.3 KVKK hazırlık çıktıları

Production öncesi en az:

- Veri envanteri
- İşleme amaçları
- Hukuki sebepler
- Saklama süreleri
- Veri alıcıları
- Aydınlatma metni
- Açık rıza gereken/olmayan alanların ayrımı
- Çerez yönetimi
- İlgili kişi başvuru süreci
- Veri ihlali müdahale planı
- Silme/yok etme/anonimleştirme prosedürü
- Veri işleyen tedarikçi sözleşmeleri

## 24.4 Teknik güvenlik kontrolleri

- TLS zorunlu
- HSTS production’da
- Secure, HttpOnly, SameSite cookie
- CSRF koruması
- CORS allowlist
- Rate limiting
- Brute-force koruması
- Girdi doğrulama
- SQL injection’a karşı parametreli sorgular
- XSS’e karşı output encoding ve CSP
- Güvenli dosya yükleme
- Secret manager
- Dependency scanning
- Admin MFA
- Audit log
- En az ayrıcalık ilkesi
- Database erişimlerinin network sınırı
- Backup şifreleme

## 24.5 Threat model — kritik tehditler

| Tehdit                                  | Etki                       | Önlem                                                |
| --------------------------------------- | -------------------------- | ---------------------------------------------------- |
| Başka kullanıcının biletini görme       | Kişisel veri ihlali        | Sahiplik kontrolü, UUID tek başına yetmez            |
| Aynı koltuğun iki kez satılması         | Finansal/operasyonel zarar | Transaction, row lock, unique constraint             |
| Fiyatın frontend’den değiştirilmesi     | Gelir kaybı                | Backend yeniden fiyatlama                            |
| Sahte ödeme başarı isteği               | Ücretsiz bilet             | Provider doğrulaması, webhook, idempotency           |
| Sahte GPS konumu                        | Yanlış yolcu bilgisi       | Device credential, sequence, imza, anomaly check     |
| Admin hesabının ele geçirilmesi         | Büyük kapsamlı zarar       | MFA, RBAC, audit, IP/cihaz politikası                |
| Loglarda PII                            | Gizlilik ihlali            | Masking ve redaction                                 |
| Harita API anahtarının kötüye kullanımı | Maliyet                    | Domain restriction, quota, server proxy gerektiğinde |

## 24.6 Log redaction

Loglanmaması gerekenler:

- Şifre
- Access/refresh token
- CVV
- Tam kart numarası
- Kimlik numarası
- Full payment provider raw payload
- Hassas cookie

Maskelenebilecekler:

```text
mir***@example.com
+90******1234
```

## 24.7 Saklama politikası örneği

Bu yalnızca başlangıç taslağıdır:

- Raw yüksek frekanslı konum: kısa süre
- Özet sefer izi: daha uzun süre
- Başarısız auth logları: güvenlik politikasına göre
- Demo hesapları: sunum sonrası silinebilir
- Audit log: iş ve hukuk ihtiyacına göre

Gerçek süreler hukuk ve operasyon kararıyla belirlenmelidir.

---

# 25. Loglama, izlenebilirlik ve hata yönetimi

## 25.1 Correlation ID

Her HTTP isteği ve WebSocket bağlantısı için request/correlation ID üretilir.

Örnek log:

```json
{
  "level": "info",
  "requestId": "req_123",
  "userId": "usr_456",
  "route": "POST /api/v1/seat-holds",
  "tripId": "trip_789",
  "durationMs": 42,
  "statusCode": 201
}
```

## 25.2 İş olayı logları

- UserRegistered
- LoginFailed
- SeatHoldCreated
- SeatHoldExpired
- OrderCreated
- PaymentSucceeded
- PaymentFailed
- TicketIssued
- TrackingDeviceConnected
- TrackingPositionRejected
- TripStatusChanged

## 25.3 Metric önerileri

- API request count/latency/error rate
- Trip search count
- Search → detail conversion
- Detail → hold conversion
- Hold expiration rate
- Payment success rate
- Ticket issue latency
- Active WebSocket connections
- Position messages per minute
- Stale tracking trips
- Database connection pool usage
- Redis errors

## 25.4 Health endpoints

```text
GET /health/live
GET /health/ready
```

`live`: process yaşıyor mu?  
`ready`: DB, Redis ve kritik bağımlılıklar kullanıma hazır mı?

## 25.5 Hata sınıflandırması

- Validation error: 400/422
- Authentication: 401
- Authorization: 403
- Not found: 404
- Conflict: 409
- Rate limit: 429
- Dependency unavailable: 503
- Unexpected: 500

Her 500 hatası server loguna stack trace ile, kullanıcıya güvenli mesajla yansır.

---

# 26. Test stratejisi

## 26.1 Test piramidi

### Birim testleri

- Fiyat hesaplama
- Hold expiry hesaplama
- Trip status geçişleri
- ETA yardımcıları
- Route progress hesabı
- Permission kontrolü
- DTO/schema validation

### Entegrasyon testleri

- PostgreSQL transaction
- Seat hold concurrency
- Order → payment → ticket
- Auth/session
- Redis TTL
- Tracking ingestion
- WebSocket authorization

### E2E testleri

- Kayıt ve giriş
- Sefer arama
- Koltuk seçimi
- Checkout
- Biletlerim
- Aktif bilet haritası
- Admin sefer oluşturma

## 26.2 Kritik concurrency testi

Test iki paralel istekle aynı koltuğu tutmaya çalışmalıdır.

Beklenen:

- Yalnızca biri 201 alır.
- Diğeri 409 `SEAT_NOT_AVAILABLE` alır.
- Tek aktif hold vardır.
- Tek ticket oluşturulabilir.

## 26.3 E2E ana senaryo

```text
Given kayıtlı kullanıcı giriş yaptı
And İstanbul → Siirt için sefer var
When kullanıcı 18 numaralı koltuğu seçer
And yolcu bilgilerini girer
And demo ödemeyi başarılı tamamlar
Then bilet oluşturulmalı
And Biletlerim ekranında görünmeli
And aktif bilet haritasında araç konumu görünmeli
```

## 26.4 Negatif senaryolar

- Geçmiş tarih arama
- Aynı kalkış/varış
- Satışa kapalı sefer
- Dolu koltuk
- Hold süresi dolmuş checkout
- Fiyat değişmiş order
- Başkasının ticket ID’si
- Yetkisiz WebSocket room
- Geçersiz GPS credential
- Eski sequence numarası
- Harita tile yüklenememesi
- Redis kesintisi
- Payment timeout

## 26.5 UI test cihazları

- 320 px genişlik
- 375/390 px iPhone sınıfı
- 430 px büyük telefon
- 768 px tablet
- 1024 px tablet/desktop
- 1440 px desktop

## 26.6 Accessibility testleri

- Klavye ile navigasyon
- Focus görünürlüğü
- Screen reader label
- Form hata bağlantısı
- Renk kontrastı
- Reduced motion
- Harita bilgisinin metinsel karşılığı

## 26.7 Test verisi izolasyonu

- Her test kendine ait user/trip oluşturur.
- Test sırası bağımlılığı olmaz.
- Clock mock ile hold expiry test edilir.
- Tracking simülatörü deterministic seed destekler.
- CI database’i her run’da sıfırlanır.

---

# 27. CI/CD ve dağıtım

## 27.1 Pull request pipeline

Her PR’da:

1. Install with frozen lockfile
2. Lint
3. Typecheck
4. Unit tests
5. Integration tests
6. Build passenger web
7. Build admin web
8. Build API
9. Migration dry-run veya schema check
10. E2E smoke test
11. Dependency/security scan

## 27.2 Main branch pipeline

- Tüm PR kontrolleri
- Container image build
- Image tag: commit SHA
- Staging deploy
- Migration
- Health check
- Smoke test
- Başarısızsa rollback

## 27.3 Production pipeline

Demo aşamasında manual approval yeterlidir. Production’da:

- Backup doğrulama
- Migration planı
- Maintenance ihtiyacı
- Blue/green veya rolling deploy
- Post-deploy smoke test
- Error rate gözlemleme
- Rollback prosedürü

## 27.4 Migration ilkeleri

- Destructive migration tek adımda yapılmaz.
- Önce nullable/new column eklenir.
- Kod iki şemayla uyumlu deploy edilir.
- Backfill yapılır.
- Sonra constraint uygulanır.
- Büyük tablo migration’ları lock etkisi açısından test edilir.

## 27.5 Demo hosting

Basit seçenek:

- Passenger web: yönetilen Next.js hosting
- Admin web: aynı veya ayrı proje
- API: container destekli platform
- PostgreSQL/PostGIS: yönetilen servis
- Redis: yönetilen servis
- Object storage: S3 uyumlu

Önemli kriterler:

- PostGIS desteği
- WebSocket desteği
- Bölge/latency
- Backup
- Secret yönetimi
- Log erişimi
- Fiyat öngörülebilirliği

---

# 28. Sıfırdan kurulum adımları

## 28.1 Geliştirici ortamı

Önerilen:

- Windows 11 + WSL2 Ubuntu veya macOS/Linux
- Git
- Node.js LTS
- pnpm
- Docker Desktop / Docker Engine
- VS Code
- PostgreSQL client opsiyonel

## 28.2 Repo oluşturma

```bash
mkdir bus-platform
cd bus-platform
git init
corepack enable
pnpm init
```

Workspace:

```yaml
packages:
  - apps/*
  - packages/*
```

## 28.3 Uygulamaları oluşturma

Örnek yön:

```bash
pnpm create next-app apps/passenger-web --ts --eslint --app
pnpm create next-app apps/admin-web --ts --eslint --app
pnpm dlx @nestjs/cli new apps/api --package-manager pnpm
```

Komutlar seçilen sürümlere göre proje başında doğrulanmalıdır.

## 28.4 Local infrastructure

`docker-compose.yml` servisleri:

- PostgreSQL + PostGIS
- Redis
- Mail catcher — opsiyonel
- Object storage emulator — opsiyonel

## 28.5 İlk repo kontrolleri

- `.editorconfig`
- Prettier
- ESLint
- TypeScript strict
- Commit hook opsiyonel
- Conventional commits opsiyonel
- CI workflow
- CODEOWNERS ekip varsa
- PR template
- Issue templates

## 28.6 İlk migration

Sıra:

1. extensions: `postgis`
2. users/roles
3. locations
4. routes/stops
5. buses/seat layouts
6. trips/trip seats
7. holds/orders/payments/tickets
8. tracking
9. audit

## 28.7 Seed komutu

```bash
pnpm db:migrate
pnpm db:seed
```

Seed idempotent olmalıdır; aynı komut tekrar çalıştırıldığında duplicate üretmemelidir.

## 28.8 Tek komutla local çalıştırma

Hedef:

```bash
pnpm dev
```

Bu komut web, admin, API ve simülatörü çalıştırabilir. Infrastructure öncesinde:

```bash
docker compose up -d
```

---

# 29. Ayrıntılı faz bazlı roadmap

Aşağıdaki tahminler tek geliştiricinin tam zamanlı çalıştığı, tasarım kararlarının hızlı alındığı ve dış entegrasyon beklenmediği varsayımıyla hazırlanmıştır. Kaliteyi düşürmeden sunuma hazır demo için yaklaşık **8–12 hafta** gerçekçi bir aralıktır. İki deneyimli geliştirici ve hazır tasarım desteğiyle bu süre kısalabilir.

## Faz 0 — Keşif, kapsam ve kararların kilitlenmesi

**Süre:** 2–4 gün  
**Amaç:** Kod yazmadan önce ürün sınırlarını netleştirmek.

### Görevler

- Firma adı, logo ve kurumsal renkleri toplamak
- Hedef kullanıcı profilini belirlemek
- İlk demo güzergâhını seçmek
- Örnek otobüs tipini ve koltuk planını seçmek
- Rezervasyon ve satın alma farkını firma açısından tanımlamak
- Hold süresini belirlemek
- Bilet üzerinde bulunacak alanları belirlemek
- Canlı takipte gösterilecek bilgileri belirlemek
- Admin demo kapsamını belirlemek
- Harita tile sağlayıcı stratejisini seçmek
- Demo hosting hedefini seçmek
- MVP kapsam dışı listesini onaylamak

### Çıktılar

- `docs/product/product-brief.md`
- `docs/product/mvp-scope.md`
- `docs/product/user-flows.md`
- `docs/architecture/adr-001-tech-stack.md`
- `docs/demo/demo-route.md`

### Kabul kriterleri

- Tek cümlelik ürün vizyonu onaylı
- Ana demo senaryosu yazılı
- 8–10 yolcu ekranı listelenmiş
- Demo route ve seed şehirler seçilmiş
- Teknoloji yığını değişiklik beklemeyecek kadar net

### Bu fazda yapılmaması gereken

- Detaylar netleşmeden onlarca sayfa kodlamak
- Gerçek ödeme entegrasyonuna başlamak
- Tüm Türkiye verisini toplamaya çalışmak
- Mikroservis kurmak

---

## Faz 1 — Monorepo, altyapı ve kalite tabanı

**Süre:** 3–5 gün  
**Amaç:** Geliştirmenin geri kalanını güvenli ve tekrar edilebilir hâle getirmek.

### Görevler

- Monorepo oluştur
- Passenger web, admin web ve API uygulamalarını kur
- Ortak TypeScript/ESLint/Prettier config oluştur
- Docker Compose ile PostGIS ve Redis kur
- Env validation ekle
- Health endpoints ekle
- CI pipeline oluştur
- Database migration sistemi ekle
- Seed altyapısı oluştur
- Pino logging ve request ID ekle
- API global validation ve exception filter ekle
- OpenAPI/Swagger kur

### Çıktılar

- Çalışan boş uygulamalar
- Tek komutla local environment
- CI’da yeşil lint/typecheck/test/build
- `/health/live` ve `/health/ready`
- Swagger sayfası

### Kabul kriterleri

- Yeni geliştirici README ile 30–45 dakika içinde projeyi çalıştırabilir.
- Env eksikse API açık hata ile başlamaz.
- Database migration sıfır DB’de çalışır.
- CI lockfile dışı kurulum yapmaz.

---

## Faz 2 — Tasarım sistemi ve ana uygulama kabuğu

**Süre:** 4–7 gün  
**Amaç:** Tüm ekranların üzerine kurulacağı görsel temel.

### Görevler

- Design tokens
- Font stratejisi
- Button/input/card/chip/badge/sheet/dialog
- Header ve bottom navigation
- Responsive container
- Loading/empty/error bileşenleri
- Toast ve form error yapısı
- Story/gallery sayfası
- iOS safe area
- PWA manifest ve icon placeholder
- Admin shell

### Çıktılar

- UI component gallery
- Mobil ve desktop AppShell
- Ana sayfa statik skeleton
- Admin dashboard shell

### Kabul kriterleri

- Bileşenler keyboard ile kullanılabilir.
- Primary/secondary/destructive durumlar var.
- 320–1440 px aralığında temel layout bozulmaz.
- iPhone safe area test edilir.

---

## Faz 3 — Auth, kullanıcı ve profil tabanı

**Süre:** 4–6 gün  
**Amaç:** Kullanıcı sahipliği gerektiren tüm sonraki işlemlere temel sağlamak.

### Görevler

- User schema/migration
- Register/login/logout/me
- Password hash
- Session/token yaklaşımı
- Auth guards
- Rate limit
- Login/register UI
- Profil özet ekranı
- Protected route davranışı
- Test user seed
- Auth E2E

### Çıktılar

- Çalışan kayıt/giriş
- Demo kullanıcıları
- Authenticated web session
- Admin için ayrı rol seed’i

### Kabul kriterleri

- Yanlış şifre güvenli hata verir.
- Başka kullanıcı session’ına erişim olmaz.
- Logout token/session’ı geçersiz kılar.
- Şifre hiçbir logda görünmez.

---

## Faz 4 — Lokasyon, rota ve sefer veri modeli

**Süre:** 5–8 gün  
**Amaç:** Arama ve harita özelliklerinin gerçek veri temelini kurmak.

### Görevler

- City/district/terminal/stop tabloları
- Route/route_stop tabloları
- PostGIS extension ve geometry alanları
- Trip/bus/seat_layout tabloları
- Location autocomplete API
- Route detail API
- Trip search query
- Admin basic CRUD
- Seed şehir, terminal, route ve trip
- Spatial index

### Seed minimumu

- 5–8 şehir
- 8–12 terminal/durak
- 3–5 route
- En az 10 gelecek tarihli trip
- 1 ana demo route
- 2 otobüs
- 1–2 seat layout

### Kabul kriterleri

- İstanbul → Siirt seçilince uygun tarihte sefer döner.
- Geçmiş/iptal sefer dönmez.
- Route stop sırası doğru gelir.
- Geometry GeoJSON’a çevrilebilir.
- Admin bir trip’i aktif/pasif yapabilir.

---

## Faz 5 — Ana sayfa, arama ve sefer sonuçları

**Süre:** 5–7 gün  
**Amaç:** Kullanıcının ilk değer gördüğü akışı tamamlamak.

### Görevler

- Ana sayfa hero/search kartı
- Kalkış/varış seçim sheet’i
- Tarih picker/chip
- Yolcu sayısı
- Search query state
- Trips results page
- Sorting/filtering
- Trip card
- Empty state
- Error state
- URL query param sync
- Search analytics eventleri
- Responsive test

### Kabul kriterleri

- Kullanıcı arama değerlerini geri/ileri navigasyonda kaybetmez.
- Aynı kalkış/varış engellenir.
- Sonuç yoksa alternatif tarih önerisi görünür.
- Fiyat backend’den gelir.
- Skeleton layout shift’i azaltır.

---

## Faz 6 — Sefer detayı ve rota haritası

**Süre:** 4–6 gün  
**Amaç:** Kullanıcının seçimini güvenle yapacağı detay ekranı.

### Görevler

- Trip detail API
- Trip detail UI
- Otobüs özellikleri
- Route summary
- Stop timeline
- MapLibre entegrasyonu
- Route GeoJSON layer
- Stop markers
- Map loading/error state
- Attribution
- Mobile/desktop layout

### Kabul kriterleri

- Harita route’u doğru çizer.
- Durak sırası ile harita uyumludur.
- Harita yüklenmese de metinsel rota görünür.
- CTA kullanıcıyı seat selection’a taşır.

---

## Faz 7 — Koltuk envanteri ve hold sistemi

**Süre:** 6–9 gün  
**Amaç:** Demo’nun en kritik iş kuralını güvenli şekilde kurmak.

### Görevler

- Trip seat generation
- Seat map API
- Seat layout renderer
- Seat state legend
- Hold create/get/release
- Redis TTL
- PostgreSQL locking
- Hold countdown
- Expiry worker veya lazy expiration
- Concurrency integration test
- Fiyat snapshot
- Çoklu koltuk seçimi gerekliyse atomic hold

### Kabul kriterleri

- İki kullanıcı aynı koltuğu tutamaz.
- Hold süresi dolunca koltuk tekrar açılır.
- Browser refresh sonrası hold geri yüklenir.
- Başka kullanıcı hold’ü kullanamaz.
- Redis anahtarı ile DB kaydı tutarlı kalır.

---

## Faz 8 — Yolcu bilgileri, order ve demo ödeme

**Süre:** 5–8 gün  
**Amaç:** Satın alma akışını tamamlamak.

### Görevler

- Passenger form schema
- Order draft
- Price breakdown
- Terms checkbox
- Demo payment provider
- Başarı/başarısızlık test senaryoları
- Idempotency
- Payment state UI
- Hold expiry handling
- Order integration tests

### Kabul kriterleri

- Frontend fiyatı değiştirerek ucuz bilet oluşturulamaz.
- Aynı ödeme butonuna çift tıklama ikinci order/ticket üretmez.
- Hata sonrası hold devam ediyorsa yeniden denenebilir.
- Süre dolduysa açık uyarı ve seat selection dönüşü olur.

---

## Faz 9 — Ticket üretimi ve Biletlerim

**Süre:** 4–6 gün  
**Amaç:** İşlemin kalıcı kullanıcı değerine dönüşmesi.

### Görevler

- Ticket number generator
- Ticket schema
- QR token/payload
- Ticket detail API
- Tickets list API
- Active/upcoming/past grouping
- Ticket card
- Ticket detail
- QR card
- Ownership authorization
- PDF opsiyonel
- Ticket E2E

### Kabul kriterleri

- Başarılı order tek ticket üretir.
- Ticket kullanıcı hesabında görünür.
- Başka kullanıcı ticket’ı göremez.
- Aktif/geçmiş sınıflandırması tarih ve trip state ile tutarlıdır.

---

## Faz 10 — Canlı tracking simülasyonu

**Süre:** 6–10 gün  
**Amaç:** Sunumun ayırt edici özelliğini çalışır hâle getirmek.

### Görevler

- Tracking ingestion API
- Device/simulator auth
- Position validation
- Redis latest position
- Position history storage
- Tracking simulator
- WebSocket gateway
- Room authorization
- Active ticket map
- Marker interpolation
- Tracking status/stale state
- Next stop calculation
- Demo ETA
- Admin live fleet basic view
- Reconnect test

### Kabul kriterleri

- Simülatör başlatıldığında marker hareket eder.
- Sayfa yenilenince son konum snapshot’tan gelir.
- Bağlantı kesilince UI durum gösterir.
- Yetkisiz kullanıcı room’a giremez.
- Simülatör durakta bekleme davranışı gösterebilir.

---

## Faz 11 — Admin demo paneli

**Süre:** 5–8 gün  
**Amaç:** Şirkete operasyon tarafını göstermek.

### Görevler

- Dashboard KPI kartları
- Trips table
- Trip create/edit
- Bus assignment
- Route detail/read-only map
- Tickets table/detail
- Live fleet map
- Role guard
- Audit log for critical changes

### Kabul kriterleri

- Admin olmayan kullanıcı erişemez.
- Sefer değişikliği audit log üretir.
- Aktif sefer ve doluluk özeti görünür.
- Demo sırasında tablo boş kalmaz.

---

## Faz 12 — QA, güvenlik, performans ve polish

**Süre:** 5–8 gün  
**Amaç:** Özellik eklemeyi durdurup ürünü sunulabilir hâle getirmek.

### Görevler

- E2E ana akış
- Concurrency test
- Authorization test
- Mobile cihaz testleri
- iOS Safari test
- Accessibility pass
- Loading/empty/error tamamlanması
- Log redaction
- Rate limit
- CSP/CORS/cookie ayarları
- Performance audit
- Image optimization
- Map performance
- Error tracking
- Demo data reset script

### Kabul kriterleri

- P0/P1 bug yok.
- Ana demo üç kez arka arkaya hatasız tamamlanır.
- CI yeşil.
- Staging seed reset çalışır.
- Sunum hesabı ve rotası hazır.

---

## Faz 13 — Staging dağıtım ve şirket sunumu hazırlığı

**Süre:** 3–5 gün  
**Amaç:** Ürünü yalnızca çalışır değil, kontrollü biçimde gösterilebilir hâle getirmek.

### Görevler

- Domain/subdomain
- TLS
- Staging deploy
- Migration ve seed
- Demo simulator start/stop kontrolü
- Demo script
- Ekran kaydı backup
- Sunum slaytları
- Teknik mimari diyagram
- Pilot önerisi
- Risk ve sonraki aşama listesi
- Offline backup demo video

### Kabul kriterleri

- Demo linki farklı ağdan açılır.
- Şirket cihazında test edilir.
- Sunum kullanıcı bilgileri hazırdır.
- Simülatör tek komutla beklenen konuma gelir.
- Uygulama ve sunum yedeği mevcuttur.

---

# 30. Sprint planı

İki haftalık sprint örneği:

## Sprint 0 — Discovery ve temel kurulum

- Kapsam
- Mimari kararlar
- Monorepo
- Docker
- CI
- Health/logging

**Sprint çıktısı:** Boş ama güvenli ve deploy edilebilir iskelet.

## Sprint 1 — Tasarım sistemi + auth

- UI kit
- App shell
- Register/login
- Protected routes

**Sprint çıktısı:** Kullanıcı giriş yapıp modern uygulama kabuğunu görür.

## Sprint 2 — Lokasyon + sefer arama

- Seed data
- Search API
- Ana sayfa
- Results page

**Sprint çıktısı:** Gerçek veritabanından sefer aranır.

## Sprint 3 — Sefer detayı + harita

- Route model
- MapLibre
- Stop timeline
- Trip detail

**Sprint çıktısı:** Seçilen seferin rotası ve durakları görünür.

## Sprint 4 — Seat hold

- Seat inventory
- Seat map
- Redis TTL
- Concurrency

**Sprint çıktısı:** Güvenli koltuk seçimi ve sayaç.

## Sprint 5 — Checkout + ticket

- Passenger form
- Order
- Demo payment
- Ticket
- Biletlerim

**Sprint çıktısı:** Baştan sona bilet oluşturma.

## Sprint 6 — Live tracking

- Simulator
- Ingestion
- WebSocket
- Active ticket map
- Next stop/ETA

**Sprint çıktısı:** Hareket eden otobüs ve canlı durum.

## Sprint 7 — Admin + QA + deploy

- Admin demo
- E2E
- Security pass
- Staging
- Sunum hazırlığı

**Sprint çıktısı:** Şirket sunumuna hazır demo.

## Sprint kuralı

Her sprint sonunda:

- Çalışan demo
- Test
- Dokümantasyon
- Known issues
- Sonraki sprint bağımlılıkları

bulunmalıdır. “Kod yazıldı ama entegre edilmedi” tamamlanmış iş sayılmaz.

---

# 31. Görev bağımlılıkları ve kritik yol

## 31.1 Kritik yol

```text
Repo/infra
→ Auth
→ Location/route/trip data
→ Search
→ Trip detail
→ Seat inventory
→ Seat hold
→ Order/payment
→ Ticket
→ Active ticket authorization
→ Tracking simulator/WebSocket
→ QA/deploy
```

Bu zincirdeki gecikmeler demo tarihini doğrudan etkiler.

## 31.2 Paralel yapılabilecek işler

- Tasarım sistemi ile database modeli
- Admin shell ile passenger UI
- Map style ile route API
- Demo sunum slaytı ile QA
- Tracking simulator ile active ticket UI mock

## 31.3 Erken çözülmesi gereken belirsizlikler

- Firma koltuk politikaları
- Rezervasyon süresi
- Satın alma/rezervasyon farkı
- Sefer verisi kaynağı
- GPS verisi kaynağı
- Harita sağlayıcı lisansı
- Gerçek ödeme sağlayıcısı
- Bilette kimlik zorunluluğu
- İptal/iade politikası

Bunlar çözülmeden production planı kesinleştirilmemelidir; demo için kontrollü varsayımlar dokümante edilir.

---

# 32. Demo verileri ve seed planı

## 32.1 Seed amaçları

- Demo her zaman dolu görünmeli.
- Arama sonuçları kontrollü olmalı.
- Dolu/boş/held koltuk durumları görünmeli.
- Aktif, yaklaşan ve geçmiş bilet örnekleri bulunmalı.
- Harita rotası güvenilir şekilde açılmalı.
- Admin dashboard anlamlı veri göstermeli.

## 32.2 Örnek seed seti

### Kullanıcılar

- `demo.passenger@example.com`
- `demo.admin@example.com`
- Şifreler yalnızca staging secret yönetimiyle paylaşılır.

### Şehirler

- İstanbul
- Ankara
- Diyarbakır
- Batman
- Siirt
- Gaziantep
- Şanlıurfa
- Mardin

### Rotalar

- İstanbul → Siirt
- Ankara → Siirt
- Diyarbakır → İstanbul
- Siirt → Batman

### Seferler

- Bugün aktif bir sefer
- Yarın 2–3 sefer
- Bir hafta içinde 5–8 sefer
- Bir cancelled sefer
- Bir satışa kapalı sefer

### Biletler

- Bir aktif bilet
- Bir yaklaşan bilet
- Bir tamamlanmış bilet
- Bir iptal edilmiş bilet

### Koltuklar

- Yaklaşık %25–40 dolu
- Birkaç blocked
- Demo seçimi için 18 numara uygun

## 32.3 Deterministic seed

Seed her çalışmada aynı ana demo ID’lerini üretebilir. Bu, test ve sunum script’ini kolaylaştırır.

Örnek sabitler:

```text
DEMO_PASSENGER_USER_ID
DEMO_ADMIN_USER_ID
DEMO_ROUTE_ID
DEMO_ACTIVE_TRIP_ID
DEMO_TICKET_ID
```

## 32.4 Reset komutu

```bash
pnpm demo:reset
```

Bu komut:

1. Demo verilerini temizler.
2. Migration’ı doğrular.
3. Seed’i yeniden yükler.
4. Seat hold’ları temizler.
5. Tracking simulator progress’ini sıfırlar.
6. Demo hesaplarını doğrular.

Sunumdan önce mutlaka çalıştırılır.

---

# 33. Şirket sunumu senaryosu

## 33.1 5–7 dakikalık ürün demosu

### Dakika 0:00–0:45 — Problem ve çözüm

- Müşteri bilet almak için farklı kanallara yöneliyor.
- Sefer ve otobüs konumu belirsizliği müşteri deneyimini zayıflatıyor.
- Bu platform firmanın kendi markası altında satış ve canlı bilgilendirmeyi birleştiriyor.

### Dakika 0:45–1:30 — Ana sayfa ve arama

- İstanbul → Siirt
- Yarın
- 1 yolcu
- Sefer ara

Vurgulanacaklar:

- Mobil öncelikli arayüz
- İl/ilçe/terminal arama
- Firmanın kendi satış kanalı

### Dakika 1:30–2:15 — Sonuçlar ve sefer detayı

- Fiyat/saat/kalan koltuk
- Otobüs özellikleri
- Rota ve duraklar

### Dakika 2:15–3:15 — Koltuk seçimi

- 18 numaralı koltuğu seç
- Hold sayacını göster
- Aynı koltuğun ikinci kullanıcıya kapanmasını anlat

### Dakika 3:15–4:15 — Checkout ve bilet

- Yolcu bilgisi
- Demo ödeme
- QR bilet
- Veritabanına kayıt

### Dakika 4:15–5:30 — Biletlerim ve canlı takip

- Aktif bilet
- Harita
- Hareket eden otobüs
- Sıradaki durak
- ETA
- Son güncelleme

Bu ekran sunumun ana vurucu noktasıdır.

### Dakika 5:30–6:15 — Admin paneli

- Aktif seferler
- Doluluk
- Canlı filo haritası
- Sefer/bilet yönetimi

### Dakika 6:15–7:00 — Pilot önerisi

- 1–2 güzergâh
- 1–3 otobüs
- Gerçek GPS entegrasyonu
- Kontrollü ödeme
- 2–4 haftalık pilot

## 33.2 Sunum dili

Kullanılacak ifadeler:

- “Bu ekran şu anda gerçek veritabanından geliyor.”
- “Ödeme demo modunda; production’da sağlayıcının güvenli checkout’u bağlanacak.”
- “Konum şu anda simüle ediliyor; aynı ingestion API gerçek GPS cihazına hazır.”
- “Pilot aşamasında tek güzergâh ve sınırlı araçla doğrulayacağız.”

Kaçınılacak ifadeler:

- “Her şey hazır.”
- “Kesinlikle hiç hata olmaz.”
- “Tüm Türkiye verisi otomatik gelir.”
- “GPS cihazı fark etmez, hemen bağlarız.”
- “KVKK kısmı basit.”

## 33.3 Demo yedek planı

- Ekran kaydı
- Statik demo verisi
- Simulator offline replay modu
- Yerel çalışan sürüm
- Mobil hotspot
- Hazır login session
- Önceden açılmış sekmeler

Canlı demo başarısız olursa proje değeri teknik aksaklığa kurban edilmemelidir.

---

# 34. Sunum öncesi kabul kontrol listesi

## 34.1 Ürün

- [ ] Ana arama çalışıyor
- [ ] Sefer sonuçları doğru
- [ ] Trip detail açılıyor
- [ ] Route ve stop’lar görünüyor
- [ ] Seat map açılıyor
- [ ] Hold sayacı çalışıyor
- [ ] Demo payment çalışıyor
- [ ] Ticket oluşuyor
- [ ] Biletlerim listeliyor
- [ ] Aktif bilet live map açıyor
- [ ] Admin dashboard dolu

## 34.2 Teknik

- [ ] CI yeşil
- [ ] Migration başarılı
- [ ] Seed reset başarılı
- [ ] Redis temiz
- [ ] Simulator doğru trip’e bağlı
- [ ] WebSocket reconnect test edildi
- [ ] Başka kullanıcı ticket erişimi engelli
- [ ] Concurrency test geçti
- [ ] Error tracking aktif
- [ ] Health endpoint yeşil

## 34.3 Mobil/iOS

- [ ] iPhone Safari login
- [ ] Search sheet
- [ ] Date picker
- [ ] Seat map touch
- [ ] Checkout keyboard
- [ ] Safe area bottom nav
- [ ] Live map gestures
- [ ] PWA icon/manifest

## 34.4 Görsel

- [ ] Firma logosu doğru
- [ ] Marka renkleri tutarlı
- [ ] Placeholder metin yok
- [ ] Lorem ipsum yok
- [ ] Kırık görsel yok
- [ ] Skeleton’lar hazır
- [ ] Empty/error state hazır
- [ ] Saat ve para formatları Türkçe

## 34.5 Sunum operasyonu

- [ ] Demo hesabı test edildi
- [ ] Şifre hazır
- [ ] Demo route resetlendi
- [ ] Simulator başlangıç noktası ayarlı
- [ ] İnternet test edildi
- [ ] Yedek video hazır
- [ ] Sunum süresi prova edildi
- [ ] Pilot teklifi hazır
- [ ] Sorulabilecek teknik soruların cevapları hazır

---

# 35. Risk kaydı ve önlemler

| ID   | Risk                                   |   Olasılık |       Etki | Önlem                                          |
| ---- | -------------------------------------- | ---------: | ---------: | ---------------------------------------------- |
| R-01 | Firma gereksinimleri değişir           |     Yüksek |       Orta | MVP scope imzası, change log                   |
| R-02 | Sefer verisi düzenli formatta değildir |     Yüksek |     Yüksek | Import adapter, admin giriş, veri şablonu      |
| R-03 | GPS sağlayıcısı API sunmaz             |       Orta |     Yüksek | Simulator, mobil app veya cihaz alternatifleri |
| R-04 | Harita tile maliyeti büyür             |       Orta |       Orta | Kota, caching, sağlayıcı karşılaştırma         |
| R-05 | Aynı koltuğun iki kez satılması        |       Orta | Çok yüksek | DB lock, transaction, unique, test             |
| R-06 | Demo anında WebSocket kopar            |       Orta |     Yüksek | Snapshot fallback, reconnect, video yedeği     |
| R-07 | iOS Safari layout sorunu               |       Orta |       Orta | Erken gerçek cihaz testi                       |
| R-08 | Gerçek ödeme entegrasyonu uzar         |       Orta |     Yüksek | Provider abstraction, demo adapter             |
| R-09 | KVKK kapsamı geç ele alınır            |       Orta | Çok yüksek | Veri minimizasyonu, hukuk kontrol noktası      |
| R-10 | Tek geliştirici darboğazı              |     Yüksek |     Yüksek | Kritik yol, scope kontrolü, docs               |
| R-11 | Tasarım sürekli değişir                |     Yüksek |       Orta | Design system freeze, ekran onayı              |
| R-12 | Demo verisi bozulur                    |       Orta |     Yüksek | Deterministic seed, reset komutu               |
| R-13 | Admin yetkileri aşırı geniş            |       Orta |     Yüksek | RBAC, audit, least privilege                   |
| R-14 | Konum verisi yanlış/sıçramalı          |     Yüksek |       Orta | Validation, smoothing, stale policy            |
| R-15 | Hosting WebSocket desteklemez          | Düşük/Orta |     Yüksek | Platform doğrulama, early spike                |

## 35.1 Risk değerlendirme ritmi

Her hafta:

- Yeni riskler
- Olasılık/etki değişimi
- Mitigation durumu
- Owner
- Son tarih

kontrol edilir.

---

# 36. Ekip ve süre tahmini

## 36.1 Tek geliştirici

Gerçekçi demo aralığı:

- Hızlı ama riskli: 6–8 hafta
- Dengeli: 8–12 hafta
- Çok yüksek polish ve kapsam: 12–16 hafta

Bu tahmin, geliştiricinin Next.js/NestJS/PostgreSQL konusunda rahat olduğunu varsayar.

## 36.2 İki geliştirici

Örnek ayrım:

### Geliştirici A

- Passenger web
- UI kit
- PWA
- Map UI
- E2E

### Geliştirici B

- API
- Database
- Seat hold
- Ticket/payment
- Tracking
- DevOps

Ortak:

- Contract
- Demo
- QA
- Mimari karar

Tahmini süre: 5–8 hafta; koordinasyon ve tasarım kararlarına bağlıdır.

## 36.3 İdeal küçük ekip

- 1 product/analyst — part-time
- 1 UI/UX designer
- 1 frontend developer
- 1 backend developer
- 1 QA — part-time
- DevOps desteği — part-time

## 36.4 Efor dağılımı

| Alan             | Yaklaşık pay |
| ---------------- | -----------: |
| Ürün/analiz      |           %8 |
| UI/UX            |          %15 |
| Frontend         |          %24 |
| Backend          |          %25 |
| Harita/tracking  |          %12 |
| Test/QA          |          %10 |
| Deploy/docs/demo |           %6 |

Bu oranlar dış ödeme/GPS entegrasyonu olmadığında geçerlidir.

---

# 37. Demo sonrası pilot yol haritası

## Pilot Faz P1 — Firma veri entegrasyonu

- Gerçek rota ve durak listesi
- Gerçek otobüs/koltuk planları
- Gerçek sefer tarifesi
- Veri import şablonu
- Admin veri doğrulama

## Pilot Faz P2 — GPS kaynağı

Seçenek sırası:

1. Mevcut filo takip sağlayıcısı API
2. Fiziksel GPS cihazı doğrudan/entegratör
3. Native sürücü uygulaması

Yapılacaklar:

- Credential provisioning
- Device ↔ bus eşleştirme
- Trip assignment
- Offline buffer
- Konum kalitesi metrikleri
- Sahte konum/anomaly kontrolü

## Pilot Faz P3 — Ödeme

- Sağlayıcı seçimi
- Sandbox
- 3D Secure akışı
- Webhook
- İdempotency
- Refund
- Mutabakat
- Finans raporu
- Güvenlik ve hukuk kontrolü

## Pilot Faz P4 — Bildirimler

- Bilet oluştu
- Sefer yaklaşıyor
- Peron/terminal bilgisi
- Gecikme
- İptal
- Otobüs yaklaşıyor

Kanallar:

- E-posta
- SMS
- Web push
- Daha sonra native push

## Pilot Faz P5 — Operasyon

- Personel rolleri
- Yazıhane satış ekranı
- Boarding/QR doğrulama
- Sefer kapatma
- No-show
- Gecikme yönetimi
- Destek akışı

## Pilot başarı metrikleri

- Arama → satın alma dönüşümü
- Checkout terk oranı
- Hold expiry oranı
- Payment success
- Kullanıcı başına destek talebi
- Tracking availability
- Konum freshness
- Sefer başına online bilet oranı
- Tekrar satın alma
- NPS/CSAT gibi kullanıcı geri bildirimi

---

# 38. Production’a geçişte zorunlu sertleştirmeler

## 38.1 Altyapı

- Multi-AZ veya sağlayıcı karşılığı
- Otomatik backup
- Point-in-time recovery
- Restore tatbikatı
- Redis persistence/HA ihtiyacı
- Secret manager
- WAF/rate limit
- CDN
- Alarm ve on-call

## 38.2 Güvenlik

- Sızma testi
- Dependency ve container scanning
- Admin MFA
- Session revocation
- CSP
- Security headers
- Bot/fraud kontrolleri
- Device credential rotation
- Incident response runbook

## 38.3 Veri

- Retention job
- PII encryption
- Access review
- Audit review
- Veri export/delete talepleri
- Production data masking for non-production

## 38.4 Ödeme

- Provider webhook signature
- Replay protection
- Idempotency
- Mutabakat
- Refund state machine
- Chargeback operasyonu
- Kart verisi kapsamının azaltılması

## 38.5 Tracking

- Device provisioning
- GPS spoof/anomaly detection
- Sequence gaps
- Offline replay
- High-volume ingestion
- Partitioned position table
- Retention/downsampling
- ETA model monitoring

## 38.6 Operasyonel runbook’lar

- Sefer iptali
- Otobüs değişikliği
- GPS cihazı arızası
- Ödeme sağlayıcı kesintisi
- Database outage
- Redis outage
- Harita sağlayıcı outage
- Yanlış fiyat yayını
- Çift satış şüphesi
- Kişisel veri ihlali

---

# 39. İş listesi şablonları ve Definition of Done

## 39.1 Feature issue şablonu

```markdown
## Amaç

## Kullanıcı hikâyesi

Bir ... olarak, ... yapmak istiyorum; böylece ...

## Kapsam

## Kapsam dışı

## Kabul kriterleri

- [ ]

## API değişikliği

## Veri modeli değişikliği

## UI durumları

- [ ] Loading
- [ ] Empty
- [ ] Error
- [ ] Success

## Güvenlik/KVKK etkisi

## Testler

- [ ] Unit
- [ ] Integration
- [ ] E2E

## Dokümantasyon

## Demo adımları
```

## 39.2 Bug issue şablonu

```markdown
## Ortam

## Ön koşul

## Tekrarlama adımları

1.

## Beklenen

## Gerçekleşen

## Ekran görüntüsü/log/request ID

## Etki

P0 / P1 / P2 / P3

## Geçici çözüm
```

## 39.3 Definition of Ready

Bir iş geliştirmeye alınmadan önce:

- Kullanıcı değeri açık
- Kabul kriterleri yazılı
- Tasarım veya wireframe mevcut
- API/data etkisi biliniyor
- Bağımlılıklar belirli
- Güvenlik etkisi değerlendirildi
- Kapsam dışı net

## 39.4 Definition of Done

Bir iş tamamlanmış sayılmadan önce:

- Kod review edildi
- Typecheck/lint geçti
- Gerekli testler yazıldı
- Loading/empty/error hazır
- Responsive test edildi
- Yetki kontrolü var
- Log/metric gerekiyorsa eklendi
- Dokümantasyon güncellendi
- Staging’de doğrulandı
- Kabul kriterleri tek tek geçti
- Bilinen kısıtlar yazıldı

## 39.5 Bug öncelikleri

- **P0:** Veri kaybı, güvenlik açığı, ödeme/çift satış, sistem tamamen kapalı
- **P1:** Ana demo veya satın alma akışı çalışmıyor
- **P2:** Önemli ama workaround var
- **P3:** Görsel/minor iyileştirme

Şirket sunumuna P0/P1 ile çıkılmaz.

---

# 40. Ek A — Örnek API request/response’ları

## A.1 Trip search

Request:

```http
GET /api/v1/trips/search?origin=istanbul-esenler&destination=siirt-terminal&date=2026-08-07&passengers=1
```

Response:

```json
{
  "data": [
    {
      "id": "trip_demo_001",
      "departureAt": "2026-08-07T16:30:00+03:00",
      "arrivalAt": "2026-08-08T08:30:00+03:00",
      "durationMinutes": 960,
      "origin": {
        "name": "İstanbul Esenler Otogarı"
      },
      "destination": {
        "name": "Siirt Şehirlerarası Otobüs Terminali"
      },
      "price": {
        "amountMinor": 165000,
        "currency": "TRY"
      },
      "availableSeatCount": 19,
      "bus": {
        "model": "2+1 Premium",
        "amenities": ["wifi", "usb", "refreshment"]
      }
    }
  ],
  "meta": {
    "requestId": "req_123"
  }
}
```

## A.2 Seat hold

Request:

```json
{
  "seatNos": ["18"]
}
```

Response:

```json
{
  "data": {
    "holdId": "hold_123",
    "tripId": "trip_demo_001",
    "seats": [
      {
        "seatNo": "18",
        "priceMinor": 165000
      }
    ],
    "expiresAt": "2026-08-06T13:35:00.000Z"
  }
}
```

## A.3 Demo payment

Request:

```json
{
  "scenario": "SUCCESS",
  "idempotencyKey": "demo-123"
}
```

Response:

```json
{
  "data": {
    "orderId": "order_123",
    "paymentStatus": "SUCCEEDED",
    "ticketId": "ticket_123"
  }
}
```

---

# 41. Ek B — Örnek SQL kuralları

## B.1 Trip seat unique

```sql
ALTER TABLE trip_seats
ADD CONSTRAINT trip_seats_trip_seat_no_unique
UNIQUE (trip_id, seat_no);
```

## B.2 Ticket seat unique — aktif model tasarımına göre

```sql
CREATE UNIQUE INDEX tickets_active_trip_seat_unique
ON tickets (trip_seat_id)
WHERE status IN ('ACTIVE', 'USED', 'COMPLETED');
```

Bu index iptal/iade modeline göre gözden geçirilmelidir.

## B.3 Route spatial index

```sql
CREATE INDEX routes_geometry_gix
ON routes
USING GIST (geometry);
```

## B.4 Latest vehicle position

```sql
SELECT *
FROM vehicle_positions
WHERE trip_id = $1
ORDER BY recorded_at DESC
LIMIT 1;
```

Production ölçeğinde partition, covering index veya latest-position tablosu değerlendirilebilir.

---

# 42. Ek C — Frontend state yaklaşımı

## C.1 Server state

- Trip search results
- Trip detail
- Seat availability
- Ticket list
- Tracking snapshot

Bunlar query/cache kütüphanesi veya Next.js veri stratejisiyle yönetilir.

## C.2 Client UI state

- Açık sheet/dialog
- Seçili filtre
- Seat selection geçici UI
- Bottom sheet yüksekliği
- Map control durumu

Global store’a her şey konulmamalıdır.

## C.3 Checkout state

Checkout state’in kritik kısmı server’da olmalıdır:

- holdId
- orderId
- price snapshot
- expiry

Frontend local state yalnızca form ve görünüm kolaylığı içindir.

## C.4 URL state

Arama parametreleri URL’de tutulabilir:

```text
/search?origin=...&destination=...&date=...
```

Böylece paylaşılabilirlik, geri navigasyon ve refresh deneyimi iyileşir.

---

# 43. Ek D — Tracking simulator komut tasarımı

Örnek komutlar:

```bash
pnpm tracking:simulate --trip trip_demo_001
pnpm tracking:simulate --trip trip_demo_001 --speed 4
pnpm tracking:simulate --trip trip_demo_001 --from-percent 45
pnpm tracking:simulate --trip trip_demo_001 --scenario delayed
pnpm tracking:simulate --trip trip_demo_001 --scenario disconnect
pnpm tracking:reset --trip trip_demo_001
```

Simulator kontrol API’si yalnızca local/staging ve admin korumasıyla açılabilir:

```text
POST /api/v1/admin/demo/tracking/start
POST /api/v1/admin/demo/tracking/pause
POST /api/v1/admin/demo/tracking/reset
```

Production build’de demo kontrol endpoint’leri tamamen kapalı olmalıdır.

---

# 44. Ek E — AI/Codex ile geliştirme çalışma protokolü

Kod ajanı kullanılıyorsa her görev prompt’u şu yapıda olmalıdır:

```markdown
## Context

Repo path, stack, ilgili docs ve mevcut durum.

## Goal

Tek, ölçülebilir sonuç.

## Files to inspect first

- docs/...
- apps/...
- packages/...

## Constraints

- Mevcut mimariyi bozma
- Yeni dependency eklemeden önce gerekçelendir
- Database migration üret
- UI tokenlarını kullan
- API contract’ı güncelle
- Security/authorization kontrolünü unutma

## Acceptance criteria

- [ ]

## Tests required

- Unit
- Integration
- E2E

## Verification commands

- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build

## Output

Değiştirilen dosyalar, kararlar, test sonuçları ve kalan riskler.
```

## 44.1 Ajan kuralları

- Önce `docs/` klasörünü okumalı.
- Mevcut kodu incelemeden yeniden mimari kurmamalı.
- Büyük görevi tek prompt’ta yapmamalı.
- Her adım sonunda test çalıştırmalı.
- Çalışmayan testi silmemeli.
- Secret veya gerçek kullanıcı verisi üretmemeli.
- Migration’ı elle DB’de uygulayıp dosyasız bırakmamalı.
- Mock ile gerçek entegrasyonu karıştırmamalı.
- “Done” demeden kabul kriterlerini raporlamalı.

---

# 45. Ek F — Proje dokümantasyon dosyaları

Önerilen `docs/` ağacı:

```text
docs/
├── product/
│   ├── product-brief.md
│   ├── mvp-scope.md
│   ├── personas.md
│   ├── user-flows.md
│   └── acceptance-criteria.md
├── architecture/
│   ├── system-overview.md
│   ├── auth.md
│   ├── seat-hold.md
│   ├── tracking.md
│   ├── maps.md
│   └── adr/
├── database/
│   ├── erd.md
│   ├── schema.md
│   ├── seed.md
│   └── migrations.md
├── api/
│   ├── conventions.md
│   ├── errors.md
│   ├── websocket-events.md
│   └── openapi.md
├── design/
│   ├── design-system.md
│   ├── responsive.md
│   └── accessibility.md
├── security/
│   ├── threat-model.md
│   ├── privacy-data-map.md
│   └── incident-response.md
├── operations/
│   ├── deployment.md
│   ├── monitoring.md
│   ├── backup-restore.md
│   └── runbooks.md
└── demo/
    ├── demo-script.md
    ├── demo-data.md
    ├── reset-guide.md
    └── known-limitations.md
```

Her önemli kod değişikliği ilgili dokümanı da güncellemelidir.

---

# 46. Ek G — Resmî ve teknik kaynaklar

Aşağıdaki kaynaklar mimari kararları doğrulamak ve uygulama sırasında güncel dokümantasyona başvurmak için kullanılmalıdır:

- Next.js App Router dokümantasyonu: https://nextjs.org/docs/app
- NestJS dokümantasyonu: https://docs.nestjs.com/
- NestJS WebSocket gateways: https://docs.nestjs.com/websockets/gateways
- NestJS validation: https://docs.nestjs.com/techniques/validation
- NestJS OpenAPI: https://docs.nestjs.com/openapi/introduction
- PostgreSQL explicit locking: https://www.postgresql.org/docs/current/explicit-locking.html
- PostGIS dokümantasyonu: https://postgis.net/docs/
- MapLibre GL JS dokümantasyonu: https://www.maplibre.org/maplibre-gl-js/docs/
- Redis Pub/Sub: https://redis.io/docs/latest/develop/pubsub/
- Redis Streams: https://redis.io/docs/latest/develop/data-types/streams/
- Playwright dokümantasyonu: https://playwright.dev/docs/intro
- KVKK Kişisel Veri Güvenliği Rehberi: https://www.kvkk.gov.tr/yayinlar/veri_guvenligi_rehberi.pdf

Kaynak sürümleri ve servis kullanım koşulları implementation başladığında yeniden doğrulanmalıdır.

---

# 47. Son karar özeti

Bu proje için en güvenli başlangıç kararı:

```text
Passenger Web/PWA: Next.js + TypeScript
Admin Web: Next.js + TypeScript
API: NestJS + TypeScript
Database: PostgreSQL + PostGIS
Temporary holds/cache: Redis
Map: MapLibre + lisanslı/uygun vector tile kaynağı
Live updates: WebSocket
Demo location: Tracking simulator
Future real location: GPS API veya native driver app
Deployment: Docker tabanlı staging
Architecture: Modular monolith
```

Şirkete sunulacak sürümün tüm production entegrasyonlarına sahip olması gerekmez. Ancak tek bir yolculuk akışı gerçek backend ve veritabanıyla baştan sona çalışmalı; harita ve canlı takip simülasyonu güvenilir görünmeli; kalan entegrasyonların nasıl yapılacağı teknik olarak açıkça gösterilmelidir.

En kritik başarı ölçütü:

> Kullanıcı sefer arar, koltuk seçer, test satın alma işlemini tamamlar, bileti hesabında görür ve aktif bilet üzerinden otobüsü rota üzerinde canlı izler.

Bu akış hatasız, görsel olarak tutarlı, mobil uyumlu ve internette erişilebilir olduğunda proje şirket sunumuna hazır Demo MVP seviyesine ulaşmış kabul edilir.
