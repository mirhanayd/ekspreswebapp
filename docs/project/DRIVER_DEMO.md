# Şoför sunum demosu

Başlangıç: `http://localhost:3000/driver`. Yalnızca `pnpm --filter passenger-web dev`
gereklidir. API, veritabanı, oturum veya GPS gerekmez. Bu alan gerçek şoför yetkilendirmesi
veya operasyon kaydı sağlamaz; yalnızca kurgusal sunum verileri kullanır.

## Tasarım incelemesi

Yolcu ana sayfası, hesap, sefer kartları, rota ve canlı harita bileşenleri incelendi.
`packages/ui/tailwind.config.js` ve yolcu `globals.css` tek tasarım kaynağıdır:

- Adaçayı `#E8F3E9`, krem `#F3F2E7`, koyu yeşil `#051A09`, lime `#CEDE44`, amber `#F7AA12`.
- Inter gövde, Archivo başlık; mevcut `display-1`, `title-lg`, `caption`, `eyebrow` hiyerarşisi.
- 24 px kart köşeleri, 28 px rota panelleri, mevcut `shadow-card` / `shadow-panel`.
- Kapsül buton ve inputlar, Lucide ikonlar, `badge-*`, `facts-strip`, `meter`, `empty-state`.
- Mobil 24 px kenar boşluğu ve 27 rem kolon; 1024 px itibarıyla masaüstü üst menüsü.
- Yolcunun yüzen beşli alt menüsü aynı bileşende şoför bağlantılarını gösterir.
- `RoutePanel`, `ScreenHeader`, `Sheet`, `BrandMark`, `TopNav`, `BottomNav`, `MapView` yeniden kullanılır.
- `JourneyCard` satın alma fiyatı ve aksiyonuna bağlı olduğu için şoför listesi onun mevcut
  kart yüzeyi, koltuk vurgusu ve bilgi şeridi sınıflarını kullanır; yeni UI kütüphanesi eklenmez.

## Sunum akışı

1. `/driver`: Mehmet Kaya, Trabzon → Erzurum, 61 ABC 123; 12/16 bindi, 3 bekleyen, 1 binmedi.
2. **Durak ve yolcular**: Bayburt biniş ve iniş listesi. Ahmet'i **Bindi** yap.
3. **Ana sayfa**: sayı 13/16 olur. **Yolcular**: durum filtreleri ve Türkçe ad/koltuk araması.
4. **Sefer** → Bayburt → **Durağı tamamla ve ilerle**: sıradaki durak Erzurum olur.
5. **Konum**: demo işaretçisi, tahmini varış, paylaşım anahtarı ve simüle güncelleme yaşı.
6. **Profil**: araç ve firma; **Demoyu başlangıca al** ile tüm senaryo sıfırlanır.

Durum gezinme boyunca React context içinde korunur; tam sayfa yenilemesinde sıfırlanır.
Ara/Mesaj yalnızca bilgilendirme sheet'i açar. Harita mevcut CARTO/MapLibre tabanını kullanır;
yükleme hatasında çevrimdışı durak şeması gösterilir. Çizgi demo güzergâhıdır, navigasyon değildir.
Konum paylaşımı ve yolcu takip bağlantısı simüledir; yolcu backend'i ile veri alışverişi yoktur.

## Kontroller

Çalışan yolcu web sunucusuna karşı `pnpm exec playwright test e2e/driver-demo.spec.mjs`
durum senkronizasyonu, arama, iletişim sheet'i, sıfırlama, tamamlanan sefer, harita hata durumu,
375/390/768/1440 px taşma ve yolcu menüsü regresyonunu denetler.
