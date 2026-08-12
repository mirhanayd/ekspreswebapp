/**
 * Mobile-only passenger campaigns.
 *
 * These are marketing terms, not pricing logic: nothing here is applied to an
 * order. The checkout total is still whatever the server calculates, so a
 * campaign can never change what a passenger is charged from the client side.
 */
export type Campaign = {
  slug: string;
  /** Short label for the card badge. */
  kicker: string;
  title: string;
  /** One-line promise, used on the card. */
  summary: string;
  /** The headline reward, printed large on the artwork. */
  reward: string;
  rewardNote: string;
  artwork: 'ticket' | 'seats' | 'invite';
  /** Reward tier this campaign feeds, matching the home progress ladder. */
  tier?: 25 | 50 | 75;
  howItWorks: string[];
  terms: string[];
};

export const campaignValidUntil = '31 Aralık 2026';

export const campaigns: Campaign[] = [
  {
    slug: 'mobile-ilk-seyahat',
    kicker: 'Mobile özel',
    title: 'İlk seyahatine 50 ₺ indirim',
    summary: 'Uygulamadan aldığın ilk biletde 50 ₺ anında indirim.',
    reward: '50 ₺',
    rewardNote: 'ilk bilette',
    artwork: 'ticket',
    tier: 50,
    howItWorks: [
      'Uygulamadan yolcu hesabınla giriş yap.',
      'İlk seferini seç ve koltuğunu ayır.',
      'Ödeme adımında indirim otomatik uygulanır; ayrıca kod girmene gerek yok.',
    ],
    terms: [
      'Kampanya yalnızca Siirt Kurtalan Ekspres mobil uygulaması üzerinden yapılan alışverişlerde geçerlidir; gişe, çağrı merkezi ve acente satışlarını kapsamaz.',
      'Her yolcu hesabı kampanyadan yalnızca bir kez yararlanabilir. Aynı kişiye ait birden fazla hesap tespit edilmesi hâlinde indirim iptal edilir.',
      'İndirim, bilet tutarının 50 ₺ ve üzerinde olduğu seferlerde uygulanır. Bilet tutarı indirim tutarının altındaysa aradaki fark iade edilmez.',
      'İndirim yalnızca bilet bedeline uygulanır; bagaj, koltuk değişikliği ve benzeri ek hizmet bedellerine uygulanmaz.',
      'Biletin iptal edilmesi durumunda indirim tutarı iade edilmez, yolcuya yalnızca ödediği net tutar iade edilir. İptal sonrası kampanya hakkı yeniden kazanılmaz.',
      'Kampanya diğer indirim ve kupon kampanyalarıyla birleştirilemez.',
      `Kampanya ${campaignValidUntil} tarihine kadar geçerlidir. Siirt Kurtalan Ekspres, kampanyayı önceden haber vermeksizin durdurma veya koşullarını değiştirme hakkını saklı tutar.`,
    ],
  },
  {
    slug: 'mobile-uc-bilet',
    kicker: 'Mobile özel',
    title: 'Tek seferde 3 bilet, %5 indirim',
    summary: 'Aynı sefere tek işlemde 3 bilet alana toplamda %5 indirim.',
    reward: '%5',
    rewardNote: 'toplam tutarda',
    artwork: 'seats',
    tier: 25,
    howItWorks: [
      'Aynı sefer için koltuk planından 3 koltuk seç.',
      'Biletleri tek ödeme işleminde tamamla.',
      'İndirim, ödeme özetinde toplam tutara uygulanır.',
    ],
    terms: [
      'Kampanya yalnızca Siirt Kurtalan Ekspres mobil uygulaması üzerinden yapılan alışverişlerde geçerlidir.',
      'İndirimin uygulanabilmesi için 3 biletin aynı sefere ait olması ve tek ödeme işleminde satın alınması zorunludur. Ayrı işlemlerde alınan biletler birleştirilmez.',
      '%5 indirim, üç biletin toplam bilet bedeli üzerinden hesaplanır ve ek hizmet bedellerini kapsamaz.',
      'İşlemdeki biletlerden herhangi birinin iptal edilmesi hâlinde kampanya koşulu ortadan kalkar; kalan biletler için indirim geri alınarak iade tutarından düşülür.',
      'Kampanya diğer indirim ve kupon kampanyalarıyla birleştirilemez.',
      `Kampanya ${campaignValidUntil} tarihine kadar geçerlidir. Siirt Kurtalan Ekspres, kampanyayı önceden haber vermeksizin durdurma veya koşullarını değiştirme hakkını saklı tutar.`,
    ],
  },
  {
    slug: 'arkadasini-davet-et',
    kicker: 'Davet kampanyası',
    title: 'Arkadaşını davet et, 75 ₺ kazan',
    summary: 'Davet ettiğin arkadaşın ilk seyahatini tamamlayınca 75 ₺ senin.',
    reward: '75 ₺',
    rewardNote: 'her davet için',
    artwork: 'invite',
    tier: 75,
    howItWorks: [
      'Hesabım ekranından davet bağlantını paylaş.',
      'Arkadaşın bu bağlantıyla kaydolup ilk biletini alsın.',
      'Arkadaşın seyahatini tamamladığında 75 ₺ indirim hesabına tanımlanır.',
    ],
    terms: [
      'Kampanya yalnızca Siirt Kurtalan Ekspres mobil uygulaması üzerinden yapılan kayıt ve alışverişlerde geçerlidir.',
      'İndirimin tanımlanabilmesi için davet edilen kişinin daha önce Siirt Kurtalan Ekspres yolcu hesabı bulunmaması ve daveti gönderen kişinin bağlantısıyla kaydolması gerekir.',
      'İndirim, davet edilen yolcunun ilk seyahatini fiilen tamamlamasının ardından tanımlanır. Alınıp iptal edilen veya kullanılmayan biletler kampanya kapsamına girmez.',
      'Bir yolcu hesabı kampanya dönemi boyunca en fazla 5 davetten yararlanabilir; toplam kazanç 375 ₺ ile sınırlıdır.',
      'Kazanılan indirim yalnızca bilet alımlarında kullanılabilir; nakde çevrilemez, başka bir hesaba devredilemez.',
      'Aynı kişiye ait olduğu tespit edilen hesaplar arası davetlerde indirim tanımlanmaz ve tanımlanmışsa geri alınır.',
      'Kazanılan indirim, tanımlandığı tarihten itibaren 90 gün içinde kullanılmalıdır.',
      `Kampanya ${campaignValidUntil} tarihine kadar geçerlidir. Siirt Kurtalan Ekspres, kampanyayı önceden haber vermeksizin durdurma veya koşullarını değiştirme hakkını saklı tutar.`,
    ],
  },
];

export function findCampaign(slug: string): Campaign | undefined {
  return campaigns.find((campaign) => campaign.slug === slug);
}

/**
 * The home reward ladder. Three milestones tied to how many journeys the
 * passenger has actually taken, so the bar fills from real ticket data rather
 * than a decorative value.
 */
export const rewardTiers = [
  { amount: 25, label: '1. yolculuk', trips: 1 },
  { amount: 50, label: '3. yolculuk', trips: 3 },
  { amount: 75, label: '5. yolculuk', trips: 5 },
] as const;

/** How many ladder steps `tripCount` completed journeys have passed. */
export function tiersReached(tripCount: number): number {
  return rewardTiers.filter((tier) => tripCount >= tier.trips).length;
}
