import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Check } from 'lucide-react';
import { BackButton } from '@/components/nav/BackButton';
import { CAMPAIGN_TONES } from '@/lib/campaign-tones';
import { campaigns, campaignValidUntil, findCampaign } from '@/lib/campaigns';

export function generateStaticParams() {
  return campaigns.map((campaign) => ({ slug: campaign.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: findCampaign(slug)?.title ?? 'Kampanya' };
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const campaign = findCampaign(slug);
  if (!campaign) notFound();

  return (
    <div className="flex min-h-[100dvh] flex-col gap-3.5 px-4 pb-8 pt-3.5">
      <header className="flex items-center gap-3">
        <BackButton fallback="/kampanyalar" label="Kampanyalara dön" />
        <span className="text-lg font-extrabold">Kampanya</span>
      </header>

      <div
        className={`relative flex flex-col gap-3.5 overflow-hidden rounded-[26px] border p-5 ${CAMPAIGN_TONES[campaign.artwork]}`}
      >
        <span className="eyebrow !text-current opacity-85">{campaign.kicker}</span>
        <span className="flex items-end justify-between gap-3">
          <h1 className="m-0 max-w-[200px] text-[21px] font-extrabold leading-tight">
            {campaign.title}
          </h1>
          <span className="flex flex-none flex-col items-end">
            <span className="num text-[40px] leading-none text-[var(--accent)] [font-stretch:122%]">
              {campaign.reward}
            </span>
            <span className="text-xs opacity-85">{campaign.rewardNote}</span>
          </span>
        </span>
        <p className="m-0 text-sm leading-[1.45] opacity-90">{campaign.summary}</p>
      </div>

      <section className="surface p-5" aria-labelledby="nasil">
        <h2 id="nasil" className="m-0 text-lg font-extrabold">
          Nasıl yararlanılır?
        </h2>
        <ol className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
          {campaign.howItWorks.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="num-md grid h-6 w-6 flex-none place-items-center rounded-full bg-sk-brand text-[11px] text-white">
                {index + 1}
              </span>
              <span className="text-[15px] leading-6 text-[#3F434B]">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="surface p-5" aria-labelledby="kosullar">
        <h2 id="kosullar" className="m-0 text-lg font-extrabold">
          Şartlar ve koşullar
        </h2>
        <ul className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
          {campaign.terms.map((term) => (
            <li key={term} className="flex gap-3">
              <Check size={16} aria-hidden className="mt-1 flex-none text-sk-brand" />
              <span className="text-[13px] leading-6 text-sk-ink2">{term}</span>
            </li>
          ))}
        </ul>
        <p className="m-0 mt-5 border-t border-sk-hair pt-4 text-[13px] leading-5 text-sk-ink3">
          Kampanya {campaignValidUntil} tarihine kadar geçerlidir. İndirimler yalnızca bilet
          bedeline uygulanır ve nakde çevrilemez.
        </p>
      </section>

      <Link href="/" data-nav="back" className="btn btn-brand no-underline">
        Sefer ara
        <ArrowRight size={18} strokeWidth={2.4} aria-hidden />
      </Link>
    </div>
  );
}
