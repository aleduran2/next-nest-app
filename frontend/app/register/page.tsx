'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { accessToken } = await auth.register(email, password);
      auth.saveToken(accessToken);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 bg-slate-800 border border-slate-700 rounded p-6"
      >
        <h1 className="text-2xl font-bold text-center mb-2">Crear cuenta</h1>

        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded bg-slate-900 border border-slate-700 px-4 py-2 outline-none focus:border-indigo-500"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Contraseña (mín. 6 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded bg-slate-900 border border-slate-700 px-4 py-2 outline-none focus:border-indigo-500"
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-indigo-600 px-4 py-2 font-medium hover:bg-indigo-500 transition disabled:opacity-50"
        >
          {loading ? 'Creando cuenta...' : 'Registrarme'}
        </button>

        <p className="text-sm text-slate-400 text-center">
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="text-indigo-400 hover:underline">
            Iniciá sesión
          </Link>
        </p>
      </form>
    </main>
  );
}
