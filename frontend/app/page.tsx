'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { tasksApi } from '@/lib/api';
import { auth } from '@/lib/auth';
import { Task } from '@/types/task';

export default function HomePage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadTasks() {
    try {
      setError(null);
      const data = await tasksApi.getAll();
      setTasks(data);
    } catch (err) {
      setError(
        'No se pudo conectar con el backend. ¿Está corriendo en el puerto 4000?',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Si no hay token, ni intentamos pedir tareas: vamos directo al login.
    if (!auth.getToken()) {
      router.replace('/login');
      return;
    }
    loadTasks();
  }, [router]);

  function handleLogout() {
    auth.logout();
    router.push('/login');
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const created = await tasksApi.create(newTitle.trim());
    setTasks((prev) => [...prev, created]);
    setNewTitle('');
  }

  async function handleToggle(task: Task) {
    const updated = await tasksApi.toggleComplete(task.id, !task.isCompleted);
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
  }

  async function handleDelete(id: number) {
    await tasksApi.remove(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-8 sm:p-24">
      <div className="w-full max-w-md flex items-center justify-between mb-2">
        <h1 className="text-4xl font-bold">Tasks</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-slate-400 hover:text-red-400 transition"
        >
          Cerrar sesión
        </button>
      </div>
      <p className="text-slate-400 mb-8 w-full max-w-md">
        Frontend en Next.js consumiendo una API en NestJS con auth JWT
      </p>

      <form onSubmit={handleCreate} className="flex w-full max-w-md gap-2 mb-8">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Nueva tarea..."
          className="flex-1 rounded bg-slate-800 border border-slate-700 px-4 py-2 outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          className="rounded bg-indigo-600 px-4 py-2 font-medium hover:bg-indigo-500 transition"
        >
          Agregar
        </button>
      </form>

      {error && <p className="text-red-400 mb-4">{error}</p>}
      {loading && <p className="text-slate-400">Cargando tareas...</p>}

      <div className="w-full max-w-md space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center justify-between p-4 border border-slate-700 bg-slate-800 rounded"
          >
            <button
              onClick={() => handleToggle(task)}
              className={`text-lg text-left flex-1 ${
                task.isCompleted ? 'line-through text-slate-500' : ''
              }`}
            >
              {task.title}
            </button>

            <div className="flex items-center gap-3">
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  task.isCompleted
                    ? 'bg-green-500 text-black'
                    : 'bg-yellow-500 text-black'
                }`}
              >
                {task.isCompleted ? 'Done' : 'Pending'}
              </span>
              <button
                onClick={() => handleDelete(task.id)}
                className="text-slate-500 hover:text-red-400 transition"
                aria-label="Eliminar tarea"
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        {!loading && tasks.length === 0 && !error && (
          <p className="text-slate-500 text-center">No hay tareas todavía.</p>
        )}
      </div>
    </main>
  );
}
