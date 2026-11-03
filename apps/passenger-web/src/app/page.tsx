import Link from 'next/link';
import { ArrowRight, Ticket } from 'lucide-react';
import { ticketService } from '@ekspres/database';
import { getLocations } from '@/lib/server-transport';
import { getSessionUser } from '@/lib/session';
import { BrandMark } from '@/components/BrandLogo';
import { JourneyCard, type JourneyLocation } from '@/components/home/JourneyCard';
import { LiveJourneyCard } from '@/components/home/LiveJourneyCard';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { campaigns } from '@/lib/campaigns';
import { CAMPAIGN_TONES } from '@/lib/campaign-tones';
import { formatDayMonth, formatTime, placeShortName } from '@/lib/format';

export const dynamic = 'force-dynamic';

type WalletTicket = {
  id: string;
  tripSeat: { seatNo: string };
  trip: {
    id: string;
    status: string;
    departureTime: Date;
    route: { origin: { name: string }; destination: { name: string } };
  };
};

async function loadWallet(userId: string | undefined) {
  if (!userId) return { live: null, upcoming: null };
  try {
    const { active } = (await ticketService.getMyTickets(userId)) as unknown as {
      active: WalletTicket[];
    };
    const live = active.find((ticket) => ['boarding', 'in_transit'].includes(ticket.trip.status));
    const upcoming = active
      .filter((ticket) => ticket !== live)
      .sort((a, b) => +new Date(a.trip.departureTime) - +new Date(b.trip.departureTime))[0];
    return { live: live ?? null, upcoming: upcoming ?? null };
  } catch {
    return { live: null, upcoming: null };
  }
}

/**
 * Home: dark header with the search card overlapping it, the passenger's live
 * journey, and the campaigns from `lib/campaigns.ts`.
 */
export default async function Home() {
  const user = await getSessionUser();
  const [locations, wallet] = await Promise.all([
    getLocations().catch(() => [] as JourneyLocation[]),
    loadWallet(user?.id),
  ]);
  const journeyLocations = (locations as JourneyLocation[]).map(({ id, name }) => ({ id, name }));
  const label = (ticket: WalletTicket) =>
    `${placeShortName(ticket.trip.route.origin.name)} → ${placeShortName(ticket.trip.route.destination.name)}`;

  return (
    <div className="screen-tab">
      <header className="relative h-[290px] overflow-hidden rounded-b-[34px] bg-sk-dark px-5 pt-4">
        <svg
          width="390"
          height="290"
          viewBox="0 0 390 290"
          aria-hidden
          className="absolute left-0 top-0"
        >
          <path
            d="M-20 250C80 230 160 170 250 150C320 134 360 90 410 40"
            fill="none"
            stroke="#26282E"
            strokeWidth="2"
          />
          <path
            d="M-20 276C90 256 170 198 262 178C332 162 372 120 422 70"
            fill="none"
            stroke="#26282E"
            strokeWidth="2"
            strokeDasharray="2 9"
            strokeLinecap="round"
          />
          <circle cx="250" cy="150" r="5" fill="#16171B" stroke="#3C3E45" strokeWidth="2" />
          <circle cx="352" cy="96" r="5" fill="#16171B" stroke="#3C3E45" strokeWidth="2" />
          <circle cx="120" cy="214" r="5" fill="#16171B" stroke="#3C3E45" strokeWidth="2" />
        </svg>
        <div className="relative flex h-11 items-center justify-between">
          <BrandMark tone="light" className="w-[124px]" priority />
          <NotificationBell />
        </div>
        <p className="relative m-0 mt-[22px] text-[15px] text-sk-mute">
          {user ? `Merhaba ${user.firstName}` : 'Merhaba'}
        </p>
        <h1 className="relative m-0 mt-1.5 text-[32px] font-extrabold leading-[1.04] tracking-[-0.02em] text-white [font-stretch:112%]">
          Nereye
          <br />
          gidiyorsun?
        </h1>
      </header>

      <JourneyCard locations={journeyLocations} />

      {wallet.live || wallet.upcoming ? (
        <section className="flex flex-col gap-2.5 px-4 pt-[22px]" aria-label="Yolculuğun">
          <h2 className="m-0 mx-1 text-lg font-extrabold">Yolculuğun</h2>
          {wallet.live ? (
            <Link
              href={`/trips/${wallet.live.trip.id}/live?ticketId=${wallet.live.id}`}
              className="block text-inherit no-underline"
            >
              <LiveJourneyCard
                ticketId={wallet.live.id}
                routeLabel={label(wallet.live)}
                departureLabel={formatTime(wallet.live.trip.departureTime)}
                seatNo={wallet.live.tripSeat.seatNo}
              />
            </Link>
          ) : wallet.upcoming ? (
            <Link
              href={`/tickets/${wallet.upcoming.id}`}
              className="flex items-center gap-3 rounded-3xl border border-sk-line bg-white p-4 text-inherit no-underline"
            >
              <span className="grid h-11 w-11 flex-none place-items-center rounded-[14px] bg-sk-tint text-sk-brand">
                <Ticket size={20} aria-hidden />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="eyebrow">Yaklaşan yolculuğun</span>
                <span className="truncate text-base font-extrabold">
                  {label(wallet.upcoming)} · {formatDayMonth(wallet.upcoming.trip.departureTime)}{' '}
                  {formatTime(wallet.upcoming.trip.departureTime)}
                </span>
              </span>
              <ArrowRight size={18} aria-hidden className="text-sk-ink3" />
            </Link>
          ) : null}
        </section>
      ) : null}

      <section className="pt-6" aria-label="Kampanyalar">
        <div className="flex items-center justify-between px-5">
          <h2 className="m-0 text-lg font-extrabold">Kampanyalar</h2>
          <Link
            href="/kampanyalar"
            className="flex h-11 items-center px-1 text-sm font-extrabold text-sk-brandInk no-underline"
          >
            Tümü
          </Link>
        </div>
        <div className="scroll-x px-5 pb-1.5 pt-1">
          {campaigns.map((campaign) => (
            <Link
              key={campaign.slug}
              href={`/kampanyalar/${campaign.slug}`}
              className={`relative flex h-[150px] w-[252px] flex-none snap-start flex-col justify-between overflow-hidden rounded-3xl border p-4 no-underline ${CAMPAIGN_TONES[campaign.artwork]}`}
            >
              <span className="flex flex-col gap-1.5">
                <span className="eyebrow !text-current opacity-85">{campaign.kicker}</span>
                <span className="max-w-[170px] text-base font-extrabold leading-tight">
                  {campaign.title}
                </span>
              </span>
              <span className="flex items-baseline gap-1.5">
                <span className="num text-[34px] leading-none text-[var(--accent)]">
                  {campaign.reward}
                </span>
                <span className="text-xs opacity-85">{campaign.rewardNote}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
