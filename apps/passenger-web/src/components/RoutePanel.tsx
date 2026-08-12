import { BusFront } from 'lucide-react';
import { placeCodeClass, placeShortName } from '@/lib/format';

/**
 * Tinted route panel from `ui/trip-search-reference.png`: a #E9E7D5 card with a
 * faint dotted map texture, the origin code on the left, the destination code on
 * the right, and a dashed path between them broken by a near-black circular
 * vehicle badge. Children render the action row the reference prints inside the
 * same card.
 */
export function RoutePanel({
  originName,
  destinationName,
  children,
}: {
  originName: string;
  destinationName: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="panel-tint map-texture text-ink-700" aria-label="Seçili güzergâh">
      <div className="relative flex min-w-0 items-start gap-3">
        <div className="min-w-0 shrink">
          <p className={`${placeCodeClass(originName, 'panel')} truncate`}>
            {placeShortName(originName)}
          </p>
          <p className="caption mt-1 truncate">{originName}</p>
        </div>

        <div className="flex w-14 shrink-0 items-center pt-2.5 sm:w-24" aria-hidden>
          <span className="h-2 w-2 shrink-0 rounded-full bg-ink-900" />
          <span className="dotted-path" />
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-900 text-white">
            <BusFront className="h-[1.125rem] w-[1.125rem]" />
          </span>
          <span className="dotted-path" />
          <span className="h-2 w-2 shrink-0 rounded-full bg-ink-900" />
        </div>

        <div className="min-w-0 flex-1 text-right">
          <p className={`${placeCodeClass(destinationName, 'panel')} truncate`}>
            {placeShortName(destinationName)}
          </p>
          <p className="caption mt-1 truncate">{destinationName}</p>
        </div>
      </div>

      {children ? <div className="relative mt-5">{children}</div> : null}
    </section>
  );
}
