import { FormEvent, useState } from 'react';
import { Eye, EyeOff, LockKeyhole, User } from '../animated-icons';
import { login } from '../services/api';
import { sileo } from 'sileo';
import loginBg from '../assets/login-bg.jpg';
import roosterLogo from '../assets/rooster-logo.png';

interface LoginPageProps {
  onLogin: (user: { username: string; role: string; rolId: string; permisos: import('../types').Permission[] }) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(username.trim(), password);
      onLogin(user);
      sileo.success({ title: 'Bienvenido', description: `Sesión iniciada como ${user.username}` });
    } catch (loginError) {
      const msg = loginError instanceof Error ? loginError.message : 'No se pudo iniciar sesión.';
      setError(msg);
      sileo.error({ title: 'Error de inicio de sesión', description: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(2,6,23,0.6)_0%,rgba(2,6,23,0.2)_55%,transparent_100%)] pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/70 to-transparent pointer-events-none" />
      <div className="relative w-full max-w-[420px] z-10">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className="hover:scale-105 transition-transform duration-300">
              <img
                src={roosterLogo}
                alt="SGTG Logo"
                className="w-24 h-24 object-contain drop-shadow-[0_8px_24px_rgba(249,115,22,0.55)]"
              />
            </div>
          </div>
          <h1 className="text-2xl font-black text-white mt-1 tracking-tight drop-shadow-md">
            Sistema de Gestión
          </h1>
        </div>
        <form onSubmit={submit} className="rounded-3xl border border-white/15 bg-slate-950/80 backdrop-blur-xl p-6 sm:p-7 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.85)] space-y-4">
          <div>
            <h2 className="text-lg font-extrabold text-white">Iniciar sesión</h2>
            <p className="text-xs text-slate-400 mt-1">Ingrese sus credenciales para continuar.</p>
          </div>
          <label className="block text-xs font-bold text-slate-300">
            Usuario
            <div className="relative mt-1.5">
              <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                autoFocus
                autoComplete="username"
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900/70 py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 transition-all placeholder-slate-500"
                placeholder="Nombre de usuario"
              />
            </div>
          </label>
          <label className="block text-xs font-bold text-slate-300">
            Contraseña
            <div className="relative mt-1.5">
              <LockKeyhole className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type={visible ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900/70 py-2.5 pl-9 pr-10 text-sm text-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 transition-all placeholder-slate-500"
                placeholder="Contraseña"
              />
              <button
                type="button"
                onClick={() => setVisible((current) => !current)}
                className="icon-eye absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-white transition-colors"
                aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>
          {error && <div className="rounded-xl border border-red-500/30 bg-red-500/20 px-3 py-2 text-sm text-red-300 font-medium">{error}</div>}
          <button
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-white py-2.5 text-sm font-black shadow-lg shadow-orange-500/25 active:scale-[0.99] transition-all"
          >
            {loading ? 'Ingresando...' : 'Entrar al sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}