import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService, transactionService, authService } from '../services/api';
import toast from 'react-hot-toast';
import {
  HiOutlineUsers,
  HiOutlineArrowsRightLeft,
  HiOutlineShieldCheck,
  HiOutlineChartBar,
} from 'react-icons/hi2';

export default function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tab, setTab] = useState('users');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, txRes] = await Promise.all([
        userService.getAll(),
        transactionService.getAll(),
      ]);
      setUsers(usersRes.data);
      setTransactions(txRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async (email) => {
    try {
      await authService.promoteAdmin(email);
      toast.success(`${email} ahora es ADMIN`);
    } catch (err) {
      toast.error('Error al promover usuario');
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <HiOutlineShieldCheck className="w-16 h-16 text-red-400" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Acceso denegado</h2>
        <p className="text-gray-500">Necesitas rol de administrador para ver esta pagina</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500"></div>
      </div>
    );
  }

  const totalBalance = users.reduce((s, u) => s + (u.balance || 0), 0);
  const totalTx = transactions.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Panel Admin</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Administracion del sistema</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-500/10 rounded-lg">
              <HiOutlineUsers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Usuarios</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{users.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-500/10 rounded-lg">
              <HiOutlineChartBar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Balance total</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">${totalBalance.toLocaleString('es-AR')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-500/10 rounded-lg">
              <HiOutlineArrowsRightLeft className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Transacciones</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{totalTx}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('users')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'users' ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>Usuarios</button>
        <button onClick={() => setTab('transactions')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'transactions' ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>Transacciones</button>
      </div>

      {tab === 'users' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">ID</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Nombre</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Email</th>
                  <th className="px-4 py-3 text-right text-gray-500 font-medium">Balance</th>
                  <th className="px-4 py-3 text-center text-gray-500 font-medium">Moneda</th>
                  <th className="px-4 py-3 text-center text-gray-500 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">#{u.id}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{u.name}</td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">${u.balance?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{u.currency || 'ARS'}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handlePromote(u.email)} className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 rounded hover:bg-purple-200 dark:hover:bg-purple-500/20">
                        Hacer Admin
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'transactions' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">ID</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">De</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Para</th>
                  <th className="px-4 py-3 text-right text-gray-500 font-medium">Monto</th>
                  <th className="px-4 py-3 text-center text-gray-500 font-medium">Estado</th>
                  <th className="px-4 py-3 text-right text-gray-500 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {transactions.map((tx) => (
                  <tr key={tx.transactionId}>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">#{tx.transactionId}</td>
                    <td className="px-4 py-3 text-gray-500">#{tx.fromUserId}</td>
                    <td className="px-4 py-3 text-gray-500">#{tx.toUserId}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">${tx.amount?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-center"><span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded text-xs">{tx.status}</span></td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs">{tx.createdAt ? new Date(tx.createdAt).toLocaleString('es-AR') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
