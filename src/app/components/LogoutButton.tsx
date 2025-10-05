'use client';

import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function LogoutButton({
  onAfterSignOut,
}: { onAfterSignOut?: () => void }) {
  const router = useRouter();

  const handle = async () => {
    await supabase.auth.signOut();     // разлогиниваем
    onAfterSignOut?.();                // сразу переключаем UI
    router.refresh();                  // обновим серверные части/куки
    // можно вместо refresh:
    // router.replace('/'); // или router.push('/login')
  };

  return (
    <button onClick={handle} className="rounded border px-3 py-1 text-sm">
      Выйти
    </button>
  );
}
