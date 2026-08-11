'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      className="btn btn-sm btn-on-dark"
      onClick={async () => {
        setPending(true);
        await fetch('/api/auth/logout', { method: 'POST' });
        router.replace('/');
        router.refresh();
        setPending(false);
      }}
    >
      <LogOut className="h-4 w-4" aria-hidden />
      <span className="hidden sm:inline">{pending ? 'Çıkılıyor…' : 'Çıkış'}</span>
    </button>
  );
}
