'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export function LogoutButton({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      className={variant === 'light' ? 'btn btn-secondary' : 'btn btn-sm btn-on-dark'}
      onClick={async () => {
        setPending(true);
        await fetch('/api/auth/logout', { method: 'POST' });
        router.replace('/');
        router.refresh();
        setPending(false);
      }}
    >
      <LogOut className="h-4 w-4" aria-hidden />
      <span className={variant === 'light' ? '' : 'hidden sm:inline'}>
        {pending ? 'Çıkılıyor…' : 'Çıkış yap'}
      </span>
    </button>
  );
}
