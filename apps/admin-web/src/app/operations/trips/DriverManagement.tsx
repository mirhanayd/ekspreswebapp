'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export type DriverRecord = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
};

async function request(path: string, method: string, value?: object) {
  const response = await fetch(`/api/admin/${path}`, {
    method,
    headers: value ? { 'Content-Type': 'application/json' } : undefined,
    body: value ? JSON.stringify(value) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'İşlem tamamlanamadı.');
  return data;
}

export function DriverManagement({ drivers }: { drivers: DriverRecord[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const created = await request('drivers', 'POST', {
        firstName: data.get('firstName'),
        lastName: data.get('lastName'),
        email: data.get('email'),
      });
      form.reset();
      setTemporaryPassword(created.temporaryPassword);
      setSuccess('Sürücü hesabı oluşturuldu. Geçici şifre yalnızca şimdi gösterilir.');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Hesap oluşturulamadı.');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(driver: DriverRecord) {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await request(`drivers/${driver.id}`, 'PATCH', { isActive: !driver.isActive });
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Hesap güncellenemedi.');
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>, driver: DriverRecord) {
    event.preventDefault();
    const form = event.currentTarget;
    const password = new FormData(form).get('password');
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await request(`drivers/${driver.id}/reset-password`, 'POST', { password });
      form.reset();
      setSuccess('Şifre yenilendi. Yeni şifreyi güvenli şekilde sürücüye iletin.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Şifre yenilenemedi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface space-y-4 p-4 sm:p-5" aria-label="Sürücü yönetimi">
      <div>
        <h2 className="text-lg font-bold text-ink-900">Sürücü hesapları</h2>
        <p className="text-sm text-ink-500">
          Yalnız yetkili yönetici hesap açabilir ve sürücüyü sefere atayabilir.
        </p>
      </div>
      <form onSubmit={create} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-1 text-sm font-semibold">
          Ad
          <input
            className="ops-field"
            name="firstName"
            minLength={2}
            maxLength={100}
            required
            autoComplete="off"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Soyad
          <input
            className="ops-field"
            name="lastName"
            minLength={2}
            maxLength={100}
            required
            autoComplete="off"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          E-posta
          <input className="ops-field" name="email" type="email" required autoComplete="off" />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="ops-btn ops-btn-primary sm:col-span-2 lg:col-span-4"
        >
          {busy ? 'Kaydediliyor…' : 'Sürücü hesabı oluştur'}
        </button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="text-sm text-brand-700">
          {success}
        </p>
      )}
      {temporaryPassword && (
        <p className="break-all rounded-lg bg-brand-50 p-3 font-mono text-sm text-brand-900">
          Geçici şifre: <strong>{temporaryPassword}</strong>
        </p>
      )}
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {drivers.map((driver) => (
          <li
            key={driver.id}
            className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-200 p-3"
          >
            <span className="min-w-0">
              <strong className="block truncate text-sm">
                {driver.firstName} {driver.lastName}
              </strong>
              <span className="block truncate text-xs text-ink-500">
                {driver.email} · {driver.isActive ? 'Aktif' : 'Pasif'}
              </span>
            </span>
            <button
              type="button"
              disabled={busy}
              className="ops-btn ops-btn-secondary min-h-11 shrink-0"
              onClick={() => toggle(driver)}
            >
              {driver.isActive ? 'Pasifleştir' : 'Etkinleştir'}
            </button>
            <details className="w-full text-sm">
              <summary className="cursor-pointer font-semibold text-brand-700">
                Şifre yenile
              </summary>
              <form
                className="mt-2 flex flex-wrap gap-2"
                onSubmit={(event) => resetPassword(event, driver)}
              >
                <label className="sr-only" htmlFor={`reset-${driver.id}`}>
                  Yeni şifre
                </label>
                <input
                  id={`reset-${driver.id}`}
                  className="ops-field flex-1"
                  name="password"
                  type="password"
                  minLength={12}
                  maxLength={72}
                  required
                  autoComplete="new-password"
                  placeholder="En az 12 karakter"
                />
                <button
                  className="ops-btn ops-btn-secondary min-h-11"
                  type="submit"
                  disabled={busy}
                >
                  Yenile
                </button>
              </form>
            </details>
          </li>
        ))}
        {!drivers.length && <li className="text-sm text-ink-500">Henüz sürücü hesabı yok.</li>}
      </ul>
    </section>
  );
}

export function DriverAssignmentControl({
  tripId,
  initialDriverId,
  drivers,
}: {
  tripId: string;
  initialDriverId: string | null;
  drivers: DriverRecord[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(initialDriverId ?? '');
  const [current, setCurrent] = useState(initialDriverId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [override, setOverride] = useState(false);
  const [reason, setReason] = useState('');
  const active = drivers.filter((driver) => driver.isActive);
  useEffect(() => {
    setCurrent(initialDriverId);
    setSelected(initialDriverId ?? '');
  }, [initialDriverId]);
  async function save(method: 'PUT' | 'DELETE') {
    setBusy(true);
    setError('');
    try {
      await request(
        `trips/${tripId}/driver`,
        method,
        method === 'PUT' ? { driverId: selected, override, reason } : undefined,
      );
      setCurrent(method === 'PUT' ? selected : null);
      if (method === 'DELETE') setSelected('');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Atama güncellenemedi.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid min-w-44 gap-1.5 text-left">
      <label className="sr-only" htmlFor={`driver-${tripId}`}>
        Sefer sürücüsü
      </label>
      <select
        id={`driver-${tripId}`}
        className="ops-field"
        value={selected}
        onChange={(event) => setSelected(event.target.value)}
        disabled={busy}
      >
        <option value="">Sürücü seçin</option>
        {drivers
          .filter((driver) => driver.isActive || driver.id === current)
          .map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.firstName} {driver.lastName}
              {driver.isActive ? '' : ' (pasif)'}
            </option>
          ))}
      </select>
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          className="ops-btn ops-btn-secondary"
          disabled={
            busy ||
            !selected ||
            selected === current ||
            !active.some((driver) => driver.id === selected)
          }
          onClick={() => save('PUT')}
        >
          {current ? 'Değiştir' : 'Ata'}
        </button>
        {current && (
          <button
            type="button"
            className="ops-btn ops-btn-secondary"
            disabled={busy}
            onClick={() => {
              if (window.confirm('Bu seferdeki sürücü ataması kaldırılsın mı?')) save('DELETE');
            }}
          >
            Kaldır
          </button>
        )}
      </div>
      {error && (
        <span role="alert" className="max-w-48 text-xs text-red-700">
          {error}
        </span>
      )}
      <label className="flex items-center gap-2 text-xs text-ink-600">
        <input
          type="checkbox"
          checked={override}
          onChange={(event) => setOverride(event.target.checked)}
          disabled={busy}
        />
        Çakışmayı gerekçeyle geç
      </label>
      {override && (
        <label className="grid gap-1 text-xs font-semibold">
          Gerekçe
          <input
            className="ops-field"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            minLength={3}
            maxLength={500}
            required
          />
        </label>
      )}
    </div>
  );
}
