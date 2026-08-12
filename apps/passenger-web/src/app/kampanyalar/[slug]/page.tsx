import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Check } from 'lucide-react';
import { CampaignArt } from '@/components/CampaignArt';
import { ScreenHeader } from '@/components/ScreenHeader';
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
    <div className="canvas-sage min-h-[100dvh]">
      <div className="screen screen-pad lg:max-w-3xl">
        <ScreenHeader backHref="/kampanyalar" backLabel="Kampanyalara dön" title="Kampanya" />

        <CampaignArt
          artwork={campaign.artwork}
          reward={campaign.reward}
          rewardNote={campaign.rewardNote}
          className="mt-6 aspect-[16/9]"
        />

        <span className="badge badge-lime mt-5 inline-flex">{campaign.kicker}</span>
        <h1 className="title-lg mt-3">{campaign.title}</h1>
        <p className="subtle mt-2">{campaign.summary}</p>

        <section className="card card-pad mt-6" aria-labelledby="nasil">
          <h2 id="nasil" className="title-md">
            Nasıl yararlanılır?
          </h2>
          <ol className="mt-4 space-y-3">
            {campaign.howItWorks.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="num grid h-6 w-6 shrink-0 place-items-center rounded-full bg-lime-400 text-[0.6875rem] font-bold text-ink-900">
                  {index + 1}
                </span>
                <span className="text-[0.9375rem] leading-6 text-ink-700">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="card card-pad mt-4" aria-labelledby="kosullar">
          <h2 id="kosullar" className="title-md">
            Şartlar ve koşullar
          </h2>
          <ul className="mt-4 space-y-3">
            {campaign.terms.map((term) => (
              <li key={term} className="flex gap-3">
                <Check className="mt-1 h-4 w-4 shrink-0 text-lime-600" aria-hidden />
                <span className="text-[0.8125rem] leading-6 text-ink-600">{term}</span>
              </li>
            ))}
          </ul>
          <p className="caption mt-5 border-t border-ink-900/[0.08] pt-4 leading-5">
            Kampanya {campaignValidUntil} tarihine kadar geçerlidir. İndirimler yalnızca bilet
            bedeline uygulanır ve nakde çevrilemez.
          </p>
        </section>

        <Link href="/search" className="btn btn-primary mt-6 w-full">
          Sefer ara
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
