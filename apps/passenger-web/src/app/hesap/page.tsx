import { redirect } from 'next/navigation';
import { AccountRows } from '@/components/AccountRows';
import { getSessionUser } from '@/lib/session';
import { initials } from '@/lib/session-format';

export const metadata = { title: 'Hesabım' };
export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login?returnTo=/hesap');

  return (
    <div className="screen-tab flex flex-col gap-4 px-4 pt-[18px]">
      <h1 className="h1 mx-1 mt-2">Hesabım</h1>
      <div className="flex items-center gap-[14px] rounded-3xl bg-sk-dark p-4 text-white">
        <span className="grid h-14 w-14 flex-none place-items-center rounded-full bg-sk-brand text-[19px] font-extrabold">
          {initials(user.firstName, user.lastName)}
        </span>
        <span className="flex min-w-0 flex-col gap-[3px]">
          <span className="truncate text-[19px] font-extrabold">
            {user.firstName} {user.lastName}
          </span>
          <span className="truncate text-sm text-sk-mute">{user.email}</span>
        </span>
      </div>
      <AccountRows />
      <p className="mx-1 mt-1 text-[13px] leading-snug text-sk-ink2">
        Biletlerin ve yolculuk geçmişin bu hesaba bağlıdır. Cihazını paylaşıyorsan işin bittiğinde
        çıkış yapmayı unutma.
      </p>
    </div>
  );
}
