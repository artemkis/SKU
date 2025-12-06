'use client';

import { supabase } from '../../lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔥 Автоматический редирект, если пользователь уже авторизован
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push('/'); // ⬅️ редирект на главную
      }
    }
    checkAuth();
  }, [router]);

  // 🔑 Magic-link вход
  const signInMagic = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/login`, 
      },
    });

    if (error) setError(error.message);
    else setSent(true);
  };

  // 🐙 GitHub OAuth вход
  const signInGithub = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${location.origin}` },
    });

    if (error) setError(error.message);
  };

  return (
    <div className="mx-auto max-w-md p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-center">Вход</h1>

      <form onSubmit={signInMagic} className="space-y-3 text-center">
        <input
          type="email"
          className="w-full rounded border px-3 py-2"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <button
          className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800 transition"
        >
          Отправить
        </button>
      </form>

      {sent && (
        <div className="text-sm text-gray-600 text-center">
          Письмо отправлено — проверьте почту.
        </div>
      )}

      {error && (
        <div className="text-red-600 text-center mt-2">
          {error}
        </div>
      )}
    </div>
  );
}

