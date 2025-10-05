'use client';

import { supabase } from '../../lib/supabase/client'
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signInMagic = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}` }
    });
    if (error) setError(error.message);
    else setSent(true);
  };

  const signInGithub = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: location.origin }
    });
    if (error) setError(error.message);
  };

  return (
    <div className="mx-auto max-w-md p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Вход</h1>

      <form onSubmit={signInMagic} className="space-y-3">
        <input
          type="email"
          className="w-full rounded border px-3 py-2"
          placeholder="you@example.com"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          required
        />
        <button className="rounded bg-black px-4 py-2 text-white">Отправить magic-link</button>
      </form>

      {sent && <div className="text-sm text-gray-600">Письмо отправлено, проверьте почту.</div>}
      {error && <div className="text-red-600">{error}</div>}

      <div className="pt-2">
        <button onClick={signInGithub} className="rounded border px-4 py-2">Войти через GitHub</button>
      </div>
    </div>
  );
}
