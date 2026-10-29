'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export type DriverRecord = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
};

export type RequestError = Error & { status?: number; code?: string };

export async function request(path: string, method: string, value?: object) {
  let response: Response;
  try {
    response = await fetch(`/api/admin/${path}`, {
      method,
      headers: value ? { 'Content-Type': 'application/json' } : undefined,
      body: value ? JSON.stringify(value) : undefined,
    });
  } catch {
    throw new Error('Sunucuya ulaşılamadı. Bağlantıyı kontrol edip tekrar deneyin.');
  }
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    window.location.replace('/api/auth/logout');
    throw new Error('Oturum süresi doldu.');
  }
  if (!response.ok)
    throw Object.assign(new Error(data.message || 'İşlem tamamlanamadı.'), {
      status: response.status,
      code: typeof data.code === 'string' ? data.code : undefined,
    }) as RequestError;
  return data;
}

export function DriverManagement({ drivers }: { drivers: DriverRecord[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [createdEmail, setCreatedEmail] = useState('');
  const [copied, setCopied] = useState(false);

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
      setCreatedEmail(created.email);
      setCopied(false);
      setSuccess('Sürücü hesabı oluşturuldu. Geçici şifre yalnızca şimdi gösterilir.');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Hesap oluşturulamadı.');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(driver: DriverRecord) {
    if (
      driver.isActive &&
      !window.confirm(
        `${driver.firstName} ${driver.lastName} pasifleştirilsin mi? Açık oturumu hemen kapanır.`,
      )
    )
      return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await request(`drivers/${driver.id}`, 'PATCH', { isActive: !driver.isActive });
      setSuccess(
        driver.isActive
          ? `${driver.firstName} ${driver.lastName} pasifleştirildi.`
          : `${driver.firstName} ${driver.lastName} etkinleştirildi.`,
      );
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
    <section
      id="surucu-hesaplari"
      className="surface scroll-mt-24 space-y-4 p-4 sm:p-5"
      aria-label="Sürücü yönetimi"
    >
      <div>
        <h2 className="text-base font-semibold text-adm-text">Sürücü hesapları</h2>
        <p className="text-sm text-adm-muted">
          Yalnız yetkili yönetici hesap açabilir ve sürücüyü sefere atayabilir.
        </p>
      </div>
      <form onSubmit={create} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-1 text-sm font-medium">
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
        <label className="grid gap-1 text-sm font-medium">
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
        <label className="grid gap-1 text-sm font-medium">
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
        <p role="alert" className="text-sm text-[#991B1B]">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="text-sm text-[#166534]">
          {success}
        </p>
      )}
      {temporaryPassword && (
        <div className="flex flex-wrap items-center gap-2 rounded-btn bg-adm-sel-bg p-3 text-sm text-adm-sel-text">
          <p className="min-w-0 flex-1 break-all font-mono">
            {createdEmail ? `${createdEmail} · ` : ''}Geçici şifre:{' '}
            <strong>{temporaryPassword}</strong>
          </p>
          <button
            type="button"
            className="ops-btn ops-btn-secondary"
            onClick={() => {
              void navigator.clipboard
                ?.writeText(temporaryPassword)
                .then(() => setCopied(true))
                .catch(() => setCopied(false));
            }}
          >
            {copied ? 'Kopyalandı' : 'Kopyala'}
          </button>
          <button
            type="button"
            className="ops-btn ops-btn-secondary"
            onClick={() => {
              setTemporaryPassword('');
              setCreatedEmail('');
            }}
          >
            Gizle
          </button>
        </div>
      )}
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {drivers.map((driver) => (
          <li
            key={driver.id}
            className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-card border border-adm-line p-3"
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
              className="ops-btn ops-btn-secondary h-11 shrink-0"
              onClick={() => toggle(driver)}
            >
              {driver.isActive ? 'Pasifleştir' : 'Etkinleştir'}
            </button>
            <details className="w-full text-sm">
              <summary className="cursor-pointer font-medium text-adm-sel-text">
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
                <button className="ops-btn ops-btn-secondary h-11" type="submit" disabled={busy}>
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
