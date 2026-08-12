import Link from 'next/link';
import { ArrowRight, Smartphone } from 'lucide-react';
import { CampaignArt } from '@/components/CampaignArt';
import { campaigns, campaignValidUntil } from '@/lib/campaigns';

export const metadata = { title: 'Kampanyalar' };

export default function CampaignsPage() {
  return (
    <div className="canvas-sage min-h-[100dvh]">
      <div className="screen-wide screen-pad">
        <div className="top-row">
          <p className="font-display text-[1.375rem] font-bold text-ink-900">Kampanyalar</p>
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-ink-900 shadow-card">
            <Smartphone className="h-6 w-6" aria-hidden />
          </span>
        </div>

        <h1 className="sr-only">Kampanyalar</h1>

        <p className="caption mt-2 max-w-md">
          Uygulamaya özel indirimler. Hepsi mobil uygulamadan yapılan alışverişlerde geçerlidir.
        </p>

        <ul className="mt-7 grid gap-4 lg:grid-cols-2">
          {campaigns.map((campaign) => (
            <li key={campaign.slug} className="min-w-0">
              <article className="h-full overflow-hidden rounded-card bg-white shadow-card transition hover:shadow-lift">
                <Link href={`/kampanyalar/${campaign.slug}`} className="flex h-full flex-col">
                  <CampaignArt
                    artwork={campaign.artwork}
                    reward={campaign.reward}
                    rewardNote={campaign.rewardNote}
                    className="m-3 mb-0 h-40 shrink-0"
                  />

                  <div className="flex flex-1 flex-col p-5">
                    <span className="badge badge-lime w-fit">{campaign.kicker}</span>
                    <h2 className="title-md mt-3">{campaign.title}</h2>
                    <p className="subtle mt-1.5 flex-1">{campaign.summary}</p>

                    <span className="mt-4 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-ink-900">
                      Şartları gör
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </span>
                  </div>
                </Link>
              </article>
            </li>
          ))}
        </ul>

        <p className="caption mt-6 leading-5">
          Tüm kampanyalar {campaignValidUntil} tarihine kadar geçerlidir ve yalnızca mobil uygulama
          üzerinden yapılan alışverişleri kapsar. Kampanyalar birbiriyle birleştirilemez.
        </p>
      </div>
    </div>
  );
}
