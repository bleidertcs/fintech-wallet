import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { HiOutlineShieldCheck } from 'react-icons/hi2';

export default function Login() {
  const { login, verifyTotp, user, pendingTotp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.totpRequired) {
        toast('Ingresa tu codigo 2FA', { icon: '🔐' });
      } else {
        toast.success('Bienvenido!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  const handleTotp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyTotp(pendingTotp, totpCode);
      toast.success('Bienvenido!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Codigo invalido');
    } finally {
      setLoading(false);
    }
  };

  // 2FA verification screen
  if (pendingTotp) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <HiOutlineShieldCheck className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Verificacion 2FA</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Ingresa el codigo de tu app de autenticacion</p>
          </div>
          <form onSubmit={handleTotp} className="bg-white dark:bg-gray-900 rounded-2xl p-8 space-y-6 border border-gray-200 dark:border-gray-800 shadow-sm">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Codigo de 6 digitos</label>
              <input
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                maxLength={6}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="000000"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading || totpCode.length !== 6}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Verificar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">FinTech Wallet</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Inicia sesion en tu cuenta</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white dark:bg-gray-900 rounded-2xl p-8 space-y-6 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contrasena</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="********"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Iniciar Sesion'}
          </button>

          <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
            No tenes cuenta?{' '}
            <Link to="/register" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500">
              Registrate
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
