'use server';

import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function createSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // no-op — запись куки делает middleware
        set(_name: string, _value: string, _options: CookieOptions) {},
        // no-op — удаление куки делает middleware
        remove(_name: string, _options: CookieOptions) {},
      },
    }
  );
}
