import Link from 'next/link';
import { campaigns, campaignValidUntil } from '@/lib/campaigns';
import { CAMPAIGN_TONES } from '@/lib/campaign-tones';

export const metadata = { title: 'Kampanyalar' };

export default function CampaignsPage() {
  return (
    <div className="screen-tab flex flex-col gap-3.5 px-4 pt-[18px]">
      <div className="mx-1 mb-0.5 mt-2 flex flex-col gap-1">
        <h1 className="h1">Kampanyalar</h1>
        <span className="text-sm text-sk-ink2">
          Mobil uygulamaya özel · {campaignValidUntil}’a kadar
        </span>
      </div>
      {campaigns.map((campaign, index) => (
        <Link
          key={campaign.slug}
          href={`/kampanyalar/${campaign.slug}`}
          className={`rise relative flex flex-col gap-3.5 overflow-hidden rounded-[26px] border p-5 text-inherit no-underline ${CAMPAIGN_TONES[campaign.artwork]}`}
          style={{ '--i': index } as React.CSSProperties}
        >
          <span className="eyebrow !text-current opacity-85">{campaign.kicker}</span>
          <span className="flex items-end justify-between gap-3">
            <h2 className="m-0 max-w-[200px] text-[21px] font-extrabold leading-tight">
              {campaign.title}
            </h2>
            <span className="flex flex-none flex-col items-end">
              <span className="num text-[40px] leading-none text-[var(--accent)] [font-stretch:122%]">
                {campaign.reward}
              </span>
              <span className="text-xs opacity-85">{campaign.rewardNote}</span>
            </span>
          </span>
          <p className="m-0 text-sm leading-[1.45] opacity-90">{campaign.summary}</p>
        </Link>
      ))}
      <p className="mx-1 mt-1 text-[13px] leading-snug text-sk-ink2">
        Tüm kampanyalar yalnızca mobil uygulama üzerinden yapılan alışverişleri kapsar ve birbiriyle
        birleştirilemez.
      </p>
    </div>
  );
}
