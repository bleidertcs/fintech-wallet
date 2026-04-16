import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlineArrowDownLeft, HiOutlineArrowUpRight } from 'react-icons/hi2';

export default function Wallet() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('deposit'); // deposit or withdraw

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await userService.getAll();
      const me = res.data.find((u) => u.email === user.email);
      setProfile(me);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!profile) return;
    const value = parseFloat(amount);
    if (value <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }
    if (mode === 'withdraw' && value > profile.balance) {
      toast.error('Saldo insuficiente');
      return;
    }

    setLoading(true);
    try {
      const finalAmount = mode === 'deposit' ? value : -value;
      await userService.updateBalance(profile.id, finalAmount);
      toast.success(mode === 'deposit' ? 'Deposito realizado!' : 'Retiro realizado!');
      setAmount('');
      loadProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error en la operacion');
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [500, 1000, 2500, 5000, 10000];

  return (
    <div className="max-w-lg mx-auto space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Depositar / Retirar</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Gestiona tu saldo</p>
      </div>

      {profile && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">Tu balance actual</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            ${profile.balance?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => setMode('deposit')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-colors ${
            mode === 'deposit'
              ? 'bg-emerald-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <HiOutlineArrowDownLeft className="w-4 h-4" />
          Depositar
        </button>
        <button
          onClick={() => setMode('withdraw')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-colors ${
            mode === 'withdraw'
              ? 'bg-red-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <HiOutlineArrowUpRight className="w-4 h-4" />
          Retirar
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Monto</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="0.01"
              step="0.01"
              className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Quick amounts */}
        <div className="flex flex-wrap gap-2">
          {quickAmounts.map((qa) => (
            <button
              key={qa}
              type="button"
              onClick={() => setAmount(qa.toString())}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              ${qa.toLocaleString()}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
            mode === 'deposit'
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {mode === 'deposit' ? <HiOutlineArrowDownLeft className="w-5 h-5" /> : <HiOutlineArrowUpRight className="w-5 h-5" />}
          {loading ? 'Procesando...' : mode === 'deposit' ? 'Depositar' : 'Retirar'}
        </button>
      </form>
    </div>
  );
}
