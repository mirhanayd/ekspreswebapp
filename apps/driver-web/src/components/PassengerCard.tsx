'use client';

import { forwardRef } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  Phone,
  Undo2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { dative, formatTime } from '@/lib/format';
import type { BoardingStatus, Person, TripStop } from '@/lib/trip-model';

export type CardRole = 'down' | 'up' | 'stay';
export type CardEntry = { person: Person; role: CardRole };
export type MarkStatus = (person: Person, status: BoardingStatus, label: string) => void;

type Action = {
  label: string;
  Icon: LucideIcon;
  tone: 'down' | 'up' | 'plain' | 'ghost';
  grow: number;
  run: () => void;
};

function describe({ person, role }: CardEntry, mark: MarkStatus) {
  const { status, name } = person;
  if (role === 'down') {
    if (status === 'alighted') {
      return {
        roleLabel: 'İNDİ',
        RoleIcon: Check,
        tone: 'muted-down',
        actions: [
          {
            label: 'Geri al',
            Icon: Undo2,
            tone: 'ghost',
            grow: 1,
            run: () => mark(person, 'boarded', `${name} tekrar araçta`),
          },
        ] as Action[],
      };
    }
    return {
      roleLabel: 'İNİYOR',
      RoleIcon: ArrowDown,
      tone: 'down',
      actions: [
        {
          label: 'İndi',
          Icon: ArrowDown,
          tone: 'down',
          grow: 1,
          run: () => mark(person, 'alighted', `${name} indi`),
        },
      ] as Action[],
    };
  }
  if (role === 'up') {
    if (status === 'pending') {
      return {
        roleLabel: 'BİNİYOR',
        RoleIcon: ArrowUp,
        tone: 'up',
        actions: [
          {
            label: 'Gelmedi',
            Icon: X,
            tone: 'plain',
            grow: 0.85,
            run: () => mark(person, 'no_show', `${name} gelmedi olarak işaretlendi`),
          },
          {
            label: 'Bindi',
            Icon: Check,
            tone: 'up',
            grow: 1.15,
            run: () => mark(person, 'boarded', `${name} bindi`),
          },
        ] as Action[],
      };
    }
    const noShow = status === 'no_show';
    return {
      roleLabel: noShow ? 'GELMEDİ' : 'BİNDİ',
      RoleIcon: noShow ? X : Check,
      tone: noShow ? 'noshow' : 'muted-up',
      actions: [
        {
          label: 'Geri al',
          Icon: Undo2,
          tone: 'ghost',
          grow: 1,
          run: () => mark(person, 'pending', `${name} yeniden bekleniyor`),
        },
      ] as Action[],
    };
  }
  return {
    roleLabel: 'YOLCULUK SÜRÜYOR',
    RoleIcon: ArrowRight,
    tone: 'stay',
    actions: [] as Action[],
  };
}

/** Passenger sheet: grows out of the tapped seat (origin and scale are set by the parent). */
export const PassengerCard = forwardRef<
  HTMLElement,
  {
    entries: CardEntry[];
    stops: TripStop[];
    stopIndex: number;
    phase: 'closed' | 'pre' | 'open' | 'closing';
    origin: { x: number; y: number };
    onClose: () => void;
    onMark: MarkStatus;
  }
>(function PassengerCard({ entries, stops, stopIndex, phase, origin, onClose, onMark }, ref) {
  return (
    <section
      ref={ref}
      className="sheet card-sheet"
      data-phase={phase}
      aria-label="Yolcu bilgisi"
      aria-hidden={phase === 'closed'}
      style={{ transformOrigin: `${origin.x}px ${origin.y}px` }}
    >
      <span aria-hidden className="grip" />
      <button type="button" className="sheet-close" aria-label="Kartı kapat" onClick={onClose}>
        <X size={18} strokeWidth={2.6} aria-hidden />
      </button>
      {entries.map((entry, index) => {
        const { person } = entry;
        const { roleLabel, RoleIcon, tone, actions } = describe(entry, onMark);
        const from = stops[person.from];
        const to = stops[person.to];
        const rail = Math.min(
          1,
          Math.max(0, (stopIndex - person.from) / Math.max(1, person.to - person.from)),
        );
        return (
          <div
            key={person.id}
            className="person"
            data-first={index === 0}
            style={{ transitionDelay: phase === 'open' ? `${170 + index * 120}ms` : '0ms' }}
          >
            <div className="person-head">
              <span className="person-seat" data-tone={tone}>
                <span>KOLTUK</span>
                <strong className="num">{person.seat}</strong>
              </span>
              <span className="person-title">
                <span className="role" data-tone={tone}>
                  <RoleIcon size={11} strokeWidth={3.2} aria-hidden />
                  {roleLabel}
                </span>
                <span className="person-name">{person.name}</span>
              </span>
            </div>

            <div className="phone-row">
              <Phone size={18} aria-hidden />
              <span className="phone-text">
                <span>TELEFON</span>
                <strong>{person.phone ?? 'Kayıtlı değil'}</strong>
              </span>
              {person.phone ? (
                <a
                  className="call"
                  href={`tel:${person.phone.replace(/\s/g, '')}`}
                  aria-label={`${person.name} adlı yolcuyu ara`}
                >
                  <Phone size={19} fill="currentColor" aria-hidden />
                </a>
              ) : null}
            </div>

            <div className="journey">
              <div className="journey-ends">
                <span>
                  <small>BİNİŞ · {from ? formatTime(from.time) : '–'}</small>
                  <strong data-role={entry.role === 'up' ? 'up' : undefined}>{from?.name}</strong>
                </span>
                <span>
                  <small>İNİŞ · {to ? formatTime(to.time) : '–'}</small>
                  <strong data-role={entry.role === 'down' ? 'down' : undefined}>{to?.name}</strong>
                </span>
              </div>
              <div className="journey-rail" data-tone={entry.role} aria-hidden>
                <i />
                <b style={{ width: `calc((100% - 12px) * ${rail})` }} />
                <em style={{ left: `calc((100% - 12px) * ${rail})` }} />
              </div>
            </div>

            {actions.length ? (
              <div className="actions">
                {actions.map(({ label, Icon, tone: actionTone, grow, run }) => (
                  <button
                    key={label}
                    type="button"
                    className="action"
                    data-tone={actionTone}
                    style={{ flexGrow: grow }}
                    onClick={run}
                  >
                    <Icon size={18} strokeWidth={2.8} aria-hidden />
                    {label}
                  </button>
                ))}
              </div>
            ) : (
              <span className="person-info">
                Yolculuğu sürüyor ·{' '}
                {to ? `${dative(to.short)} ${formatTime(to.time)}’de inecek` : ''}
              </span>
            )}
          </div>
        );
      })}
    </section>
  );
});
