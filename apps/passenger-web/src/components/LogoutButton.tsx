'use client';

import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-sm font-medium text-gray-600 hover:text-red-700"
      onClick={async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.replace('/');
        router.refresh();
      }}
    >
      Çıkış
    </button>
  );
}
