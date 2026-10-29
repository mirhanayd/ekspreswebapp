'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CornerDownLeft, Plus, Search, X } from 'lucide-react';
import { navigation } from './AdminNav';

const HEALTH_INTERVAL_MS = 60_000;

function SystemStatus() {
  const [state, setState] = useState<'ok' | 'down' | 'unknown'>('unknown');

  useEffect(() => {
    let cancelled = false;
    // Reuses the existing fleet read: a 200 proves session, Route Handler and database are up.
    const check = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const response = await fetch('/api/admin/fleet', { cache: 'no-store' });
        if (!cancelled) setState(response.ok ? 'ok' : 'down');
      } catch {
        if (!cancelled) setState('down');
      }
    };
    void check();
    const timer = window.setInterval(check, HEALTH_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const label =
    state === 'ok' ? 'Sistem çalışıyor' : state === 'down' ? 'Bağlantı sorunu' : 'Kontrol ediliyor';
  const dot = state === 'ok' ? 'bg-[#22C55E]' : state === 'down' ? 'bg-[#EF4444]' : 'bg-ink-300';

  return (
    <span
      role="status"
      className="hidden h-10 items-center gap-2 rounded-btn border border-adm-line bg-white px-3 text-sm text-adm-muted lg:inline-flex"
    >
      <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden />
      {label}
    </span>
  );
}

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const items = useMemo(() => {
    const all = navigation.flatMap((section) =>
      section.items.map((item) => ({ ...item, group: section.group })),
    );
    const needle = query.trim().toLocaleLowerCase('tr-TR');
    return needle
      ? all.filter((item) => item.label.toLocaleLowerCase('tr-TR').includes(needle))
      : all;
  }, [query]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setCursor(0);
    window.setTimeout(() => input.current?.focus(), 0);
  }, [open]);

  if (!open) return null;

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink-900/30 px-4 pt-[12vh]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Hızlı arama"
        className="w-full max-w-lg overflow-hidden rounded-card border border-adm-line bg-white shadow-xl"
      >
        <div className="flex items-center gap-2 border-b border-adm-line px-3">
          <Search className="h-4 w-4 shrink-0 text-adm-muted" aria-hidden />
          <input
            ref={input}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setCursor(0);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setCursor((value) => Math.min(items.length - 1, value + 1));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setCursor((value) => Math.max(0, value - 1));
              } else if (event.key === 'Enter' && items[cursor]) {
                go(items[cursor].href);
              } else if (event.key === 'Escape') {
                onClose();
              }
            }}
            placeholder="Sayfa ara…"
            aria-label="Sayfa ara"
            className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-adm-muted"
          />
          <button type="button" className="ops-icon-btn border-0" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden />
            <span className="sr-only">Kapat</span>
          </button>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2" role="listbox" aria-label="Sonuçlar">
          {items.map((item, index) => (
            <li key={item.href} role="option" aria-selected={index === cursor}>
              <button
                type="button"
                onMouseEnter={() => setCursor(index)}
                onClick={() => go(item.href)}
                className={`flex h-11 w-full items-center gap-3 rounded-btn px-3 text-left text-sm ${
                  index === cursor ? 'bg-adm-sel-bg text-adm-sel-text' : 'text-adm-text'
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="flex-1">{item.label}</span>
                <span className="text-xs text-adm-muted">{item.group}</span>
                {index === cursor ? <CornerDownLeft className="h-3.5 w-3.5" aria-hidden /> : null}
              </button>
            </li>
          ))}
          {!items.length ? (
            <li className="px-3 py-6 text-center text-sm text-adm-muted">Sonuç bulunamadı.</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}

export function AdminTopbar() {
  const [open, setOpen] = useState(false);
  const [mac, setMac] = useState(true);

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-[var(--admin-header-h)] items-center gap-2 border-b border-adm-line bg-white/95 px-4 backdrop-blur md:px-6">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-btn border border-adm-line bg-adm-bg px-3 text-left text-sm text-adm-muted transition hover:border-ink-300 md:max-w-sm"
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden />
        <span className="flex-1 truncate">Ara…</span>
        <kbd className="hidden rounded border border-adm-line bg-white px-1.5 font-mono text-xs text-adm-muted sm:inline">
          {mac ? '⌘K' : 'Ctrl K'}
        </kbd>
      </button>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <SystemStatus />
        <Link href="/dashboard#dikkat" className="ops-icon-btn" aria-label="Dikkat gerektirenler">
          <Bell className="h-4 w-4" aria-hidden />
        </Link>
        <Link href="/operations/trips" className="ops-btn ops-btn-primary px-3 sm:px-4">
          <Plus className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Yeni sefer</span>
          <span className="sr-only sm:hidden">Yeni sefer</span>
        </Link>
      </div>
      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </header>
  );
}
