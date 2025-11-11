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
    <button onClick={handle} className="justify-self-end shrink-0 inline-flex items-center gap-2 
             px-4 py-2 rounded-full text-base font-medium
             text-white bg-gradient-to-r from-fuchsia-500 to-sky-500
             shadow-md hover:shadow-lg hover:opacity-90 active:scale-[0.98] transition">
      Выйти
    </button>
  );
}
