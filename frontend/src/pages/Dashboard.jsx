import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userService, transactionService } from '../services/api';
import {
  HiOutlineArrowUpRight,
  HiOutlineArrowDownLeft,
  HiOutlineArrowsRightLeft,
} from 'react-icons/hi2';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const usersRes = await userService.getAll();
      const users = usersRes.data;
      const myProfile = users.find((u) => u.email === user.email);
      if (myProfile) {
        setProfile(myProfile);
        const txRes = await transactionService.getByUser(myProfile.id);
        const allTx = txRes.data;
        setTransactions(allTx.slice(0, 5));

        // Build chart data - group by day
        const grouped = {};
        allTx.forEach((tx) => {
          const date = tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) : 'Sin fecha';
          if (!grouped[date]) grouped[date] = { date, enviado: 0, recibido: 0 };
          if (tx.fromUserId === myProfile.id) {
            grouped[date].enviado += tx.amount || 0;
          } else {
            grouped[date].recibido += tx.amount || 0;
          }
        });
        setChartData(Object.values(grouped).slice(-7));
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500"></div>
      </div>
    );
  }

  const totalSent = transactions.filter((t) => t.fromUserId === profile?.id).reduce((s, t) => s + (t.amount || 0), 0);
  const totalReceived = transactions.filter((t) => t.toUserId === profile?.id).reduce((s, t) => s + (t.amount || 0), 0);

  return (
    <div className="space-y-6 lg:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Hola, {profile?.name || user.email}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Resumen de tu cuenta</p>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6 sm:p-8 text-white">
        <p className="text-emerald-200 text-sm font-medium">Balance disponible</p>
        <p className="text-3xl sm:text-4xl font-bold mt-2">
          ${profile?.balance?.toLocaleString('es-AR', { minimumFractionDigits: 2 }) || '0.00'}
        </p>
        <div className="mt-4 sm:mt-6 flex flex-wrap gap-2">
          <Link
            to="/transfer"
            className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <HiOutlineArrowsRightLeft className="w-4 h-4" />
            Transferir
          </Link>
          <Link
            to="/wallet"
            className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <HiOutlineArrowDownLeft className="w-4 h-4" />
            Depositar
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-500/10 rounded-lg">
              <HiOutlineArrowDownLeft className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Recibido</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                ${totalReceived.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-500/10 rounded-lg">
              <HiOutlineArrowUpRight className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Enviado</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                ${totalSent.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-500/10 rounded-lg">
              <HiOutlineArrowsRightLeft className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Transacciones</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{transactions.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Movimientos por dia</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Bar dataKey="recibido" fill="#10b981" radius={[4, 4, 0, 0]} name="Recibido" />
              <Bar dataKey="enviado" fill="#ef4444" radius={[4, 4, 0, 0]} name="Enviado" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ultimos movimientos</h2>
          <Link to="/history" className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-500">
            Ver todos
          </Link>
        </div>
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500">
            No hay movimientos todavia
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {transactions.map((tx) => {
              const isSent = tx.fromUserId === profile?.id;
              return (
                <div key={tx.id} className="px-4 sm:px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isSent ? 'bg-red-100 dark:bg-red-500/10' : 'bg-emerald-100 dark:bg-emerald-500/10'}`}>
                      {isSent ? (
                        <HiOutlineArrowUpRight className="w-4 h-4 text-red-600 dark:text-red-400" />
                      ) : (
                        <HiOutlineArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {isSent ? `Enviado a #${tx.toUserId}` : `Recibido de #${tx.fromUserId}`}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleString('es-AR') : tx.status}
                      </p>
                    </div>
                  </div>
                  <p className={`text-sm font-semibold ${isSent ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {isSent ? '-' : '+'}${tx.amount?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
