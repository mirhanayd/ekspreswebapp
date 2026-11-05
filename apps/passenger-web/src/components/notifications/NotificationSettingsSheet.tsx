'use client';

import { BusFront, MapPin, Volume2, X } from 'lucide-react';
import { BottomSheet } from '@/components/BottomSheet';
import { useNotifications } from './NotificationProvider';

const ROWS = [
  { key: 'km5', title: '5 km kala', sub: 'Hazırlanman için yaklaşık 6 dakika kalır', num: '5' },
  { key: 'km1', title: '1 km kala', sub: 'Otobüs durağa girmek üzereyken', num: '1' },
  {
    key: 'sound',
    title: 'Sesli uyarı ve titreşim',
    sub: 'Telefon sessizdeyken yalnızca titreşir',
    num: '',
  },
] as const;

/** İniş bildirimleri: 5 km, 1 km and sound/vibration switches, opened from account, ticket and tracking. */
export function NotificationSettingsSheet() {
  const { prefs, settings, closeSettings, setPref, permission } = useNotifications();

  const dot = (on: boolean) =>
    `absolute top-[17px] h-[18px] w-[18px] -ml-[9px] rounded-full border-[2.5px] transition-colors duration-300 ${
      on ? 'border-sk-brand bg-sk-brand' : 'border-[#C9C9C3] bg-white'
    }`;
  const label = (on: boolean) =>
    `absolute top-10 text-[11px] font-extrabold transition-colors duration-300 ${
      on ? 'text-sk-brandInk' : 'text-sk-ink3'
    }`;

  return (
    <BottomSheet open={settings.open} onClose={closeSettings} label="İniş bildirimleri">
      <div className="flex flex-col gap-4 px-5 pb-6 pt-[26px]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="m-0 text-2xl font-extrabold">İniş bildirimleri</h2>
            <span className="text-sm text-sk-ink2">
              {settings.subtitle ?? 'İniş durağına yaklaşırken haber veririz'}
            </span>
          </div>
          <button
            type="button"
            aria-label="Kapat"
            onClick={closeSettings}
            className="round-btn border-0 bg-sk-bg"
          >
            <X size={18} strokeWidth={2.6} aria-hidden />
          </button>
        </div>

        <div aria-hidden className="relative h-16 rounded-[18px] bg-[#F4F4F1] px-1">
          <span className="absolute left-[22px] right-10 top-6 h-1 rounded-sm bg-[#DCDCD6]" />
          <BusFront className="absolute left-[10px] top-[17px] text-sk-ink" size={22} />
          <span className={dot(prefs.km5)} style={{ left: 'calc(22px + (100% - 62px) * .375)' }} />
          <span className={dot(prefs.km1)} style={{ left: 'calc(22px + (100% - 62px) * .875)' }} />
          <MapPin
            className="absolute right-[12px] top-[13px] text-sk-brand"
            size={22}
            fill="currentColor"
            stroke="#fff"
          />
          <span
            className={label(prefs.km5)}
            style={{ left: 'calc(22px + (100% - 62px) * .375 - 14px)' }}
          >
            5 km
          </span>
          <span
            className={label(prefs.km1)}
            style={{ left: 'calc(22px + (100% - 62px) * .875 - 14px)' }}
          >
            1 km
          </span>
        </div>

        <div className="flex flex-col">
          {ROWS.map((row) => {
            const on = prefs[row.key];
            return (
              <button
                key={row.key}
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => setPref(row.key, !on)}
                className="flex min-h-[66px] items-center gap-[14px] border-0 border-b border-[#F0F0ED] bg-transparent px-[2px] text-left"
              >
                <span
                  className={`flex h-[42px] w-[42px] flex-none flex-col items-center justify-center rounded-[13px] transition-colors duration-[260ms] ${
                    on
                      ? row.key === 'km1'
                        ? 'bg-sk-brand text-white'
                        : 'bg-sk-dark text-white'
                      : 'bg-sk-bg text-sk-ink3'
                  }`}
                >
                  {row.num ? (
                    <>
                      <span className="num-md text-[17px] leading-none">{row.num}</span>
                      <span className="text-[8px] font-extrabold tracking-[0.06em]">KM</span>
                    </>
                  ) : (
                    <Volume2 size={19} strokeWidth={2} aria-hidden />
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                  <span className="text-base font-extrabold">{row.title}</span>
                  <span className="text-[13px] leading-snug text-sk-ink2">{row.sub}</span>
                </span>
                <span aria-hidden className="switch" />
              </button>
            );
          })}
        </div>

        {permission === 'denied' || permission === 'unsupported' ? (
          <p className="m-0 rounded-2xl bg-sk-tint px-4 py-3 text-[13px] leading-snug text-sk-brandInk">
            {permission === 'denied'
              ? 'Tarayıcı bildirimlerine izin verilmemiş. Uygulama açıkken uyarılar yine ekranın üstünde görünür; kilit ekranı için tarayıcı ayarlarından izin ver.'
              : 'Bu cihaz kilit ekranı bildirimlerini desteklemiyor. Uygulama açıkken uyarılar ekranın üstünde görünür. iPhone’da önce uygulamayı ana ekrana ekle.'}
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <span className="eyebrow">Önizleme</span>
          <div aria-hidden className="flex gap-3 rounded-[20px] bg-[#F4F4F1] p-3">
            <span className="flex h-10 w-10 flex-none flex-col items-center justify-center rounded-xl bg-sk-dark text-white">
              <span className="text-base font-extrabold leading-none">5</span>
              <span className="text-[8px] font-extrabold tracking-[0.06em]">KM</span>
            </span>
            <span className="flex min-w-0 flex-col gap-[2px]">
              <span className="text-sm font-extrabold">Batman Otogarı’na 5 km kaldı</span>
              <span className="text-[13px] text-[#3F434B]">Yaklaşık 6 dakika sonra ineceksin.</span>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={closeSettings}
          className="btn btn-dark mt-1 h-14 w-full rounded-[18px]"
        >
          Tamam
        </button>
      </div>
    </BottomSheet>
  );
}
