import type { Campaign } from '@/lib/campaigns';

/**
 * Campaign artwork, drawn inline so it inherits the design tokens exactly and
 * needs no external asset. Each piece reuses the vocabulary of the reference
 * screens: near-black surfaces, the lime rail, the butter facts strip and the
 * dashed route.
 */
export function CampaignArt({
  artwork,
  reward,
  rewardNote,
  className = '',
}: {
  artwork: Campaign['artwork'];
  reward: string;
  rewardNote: string;
  className?: string;
}) {
  return (
    <div
      className={`relative isolate overflow-hidden rounded-[1.5rem] bg-ink-900 ${className}`}
      aria-hidden
    >
      {/* The box is locked to the artboard's 16:9, so nothing is ever cropped. */}
      <svg viewBox="0 0 320 180" className="h-full w-full">
        <defs>
          <pattern id={`dots-${artwork}`} width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1.2" fill="rgba(255,255,255,0.09)" />
          </pattern>
        </defs>
        <rect width="320" height="180" fill={`url(#dots-${artwork})`} />

        {artwork === 'ticket' ? <TicketArt /> : null}
        {artwork === 'seats' ? <SeatsArt /> : null}
        {artwork === 'invite' ? <InviteArt /> : null}
      </svg>

      <div className="absolute inset-y-0 right-0 flex w-[45%] flex-col justify-center pr-5 text-right">
        <span className="font-display text-[2rem] font-bold leading-none text-lime-400">
          {reward}
        </span>
        <span className="mt-1 text-[0.6875rem] font-semibold text-white/60">{rewardNote}</span>
      </div>
    </div>
  );
}

/** A boarding pass with its lime rail and butter strip, tilted off-axis. */
function TicketArt() {
  return (
    <g transform="translate(18 30) rotate(-6)">
      <rect width="150" height="118" rx="14" fill="#FFFFFF" />
      <path d="M0 14A14 14 0 0 1 14 0h20v118H14A14 14 0 0 1 0 104Z" fill="#BCCB30" />
      <circle cx="17" cy="92" r="9" fill="#051A09" />
      <rect x="13.5" y="88.5" width="7" height="5" rx="1.2" fill="#FFFFFF" />
      <rect x="46" y="16" width="46" height="9" rx="4.5" fill="#051A09" />
      <rect x="46" y="32" width="70" height="6" rx="3" fill="#051A09" opacity="0.25" />
      <rect x="46" y="46" width="34" height="8" rx="4" fill="#051A09" opacity="0.55" />
      <rect x="98" y="46" width="34" height="8" rx="4" fill="#051A09" opacity="0.55" />
      <rect x="34" y="72" width="116" height="30" fill="#FFFA93" />
      <rect x="46" y="82" width="24" height="5" rx="2.5" fill="#051A09" opacity="0.6" />
      <rect x="82" y="82" width="24" height="5" rx="2.5" fill="#051A09" opacity="0.6" />
      <rect x="118" y="82" width="20" height="5" rx="2.5" fill="#051A09" opacity="0.6" />
    </g>
  );
}

/** Three selected coach seats on a deck plan. */
function SeatsArt() {
  const seat = (x: number, y: number, on: boolean) => (
    <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
      <rect
        width="30"
        height="30"
        rx="9"
        fill={on ? '#BCCB30' : '#FFFFFF'}
        opacity={on ? 1 : 0.9}
      />
      {on ? (
        <path
          d="M8 15.5l4.5 4.5L22 10.5"
          stroke="#051A09"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ) : null}
    </g>
  );

  return (
    <g transform="translate(22 24)">
      <rect width="132" height="132" rx="20" fill="#FFFFFF" opacity="0.1" />
      <rect x="14" y="14" width="104" height="16" rx="8" fill="#FFFFFF" opacity="0.22" />
      {seat(14, 40, true)}
      {seat(50, 40, true)}
      {seat(88, 40, false)}
      {seat(14, 78, false)}
      {seat(50, 78, true)}
      {seat(88, 78, false)}
    </g>
  );
}

/** Two travellers joined by the dashed route. */
function InviteArt() {
  const person = (cx: number, fill: string) => (
    <g>
      <circle cx={cx} cy="72" r="21" fill={fill} />
      <circle cx={cx} cy="66" r="7.5" fill="#051A09" />
      <path d={`M${cx - 11} 88a11 11 0 0 1 22 0Z`} fill="#051A09" />
    </g>
  );

  return (
    <g transform="translate(16 12)">
      {person(34, '#FFFFFF')}
      {person(122, '#BCCB30')}
      <path
        d="M60 72h36"
        stroke="#F7AA12"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="6 7"
      />
      <g transform="translate(66 104)">
        <rect width="66" height="22" rx="11" fill="#F7AA12" />
        <path
          d="M14 11h8m-4-4v8"
          stroke="#051A09"
          strokeWidth="2.6"
          strokeLinecap="round"
          fill="none"
        />
        <rect x="30" y="8" width="24" height="6" rx="3" fill="#051A09" opacity="0.6" />
      </g>
    </g>
  );
}
