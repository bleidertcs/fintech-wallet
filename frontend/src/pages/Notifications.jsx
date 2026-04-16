import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService, transactionService } from '../services/api';
import { HiOutlineArrowDownLeft, HiOutlineBell } from 'react-icons/hi2';
import toast from 'react-hot-toast';

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const prevCountRef = useRef(0);

  useEffect(() => {
    loadNotifications();
    // Polling every 10 seconds for real-time feel
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const usersRes = await userService.getAll();
      const me = usersRes.data.find((u) => u.email === user.email);
      if (me) {
        const txRes = await transactionService.getByUser(me.id);
        const received = txRes.data
          .filter((tx) => tx.toUserId === me.id)
          .map((tx) => ({
            id: tx.id,
            message: `Recibiste $${tx.amount?.toLocaleString('es-AR', { minimumFractionDigits: 2 })} del usuario #${tx.fromUserId}`,
            date: tx.createdAt,
            amount: tx.amount,
          }));

        // Toast on new notifications
        if (prevCountRef.current > 0 && received.length > prevCountRef.current) {
          const newCount = received.length - prevCountRef.current;
          toast.success(`${newCount} nueva${newCount > 1 ? 's' : ''} notificacion${newCount > 1 ? 'es' : ''}!`);
        }
        prevCountRef.current = received.length;

        setNotifications(received);
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Notificaciones</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Transferencias recibidas</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          En vivo
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
        {notifications.length === 0 ? (
          <div className="p-12 text-center">
            <HiOutlineBell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 dark:text-gray-500">No tenes notificaciones</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {notifications.map((n) => (
              <div key={n.id} className="px-4 sm:px-6 py-4 flex items-center gap-4">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-500/10 rounded-lg shrink-0">
                  <HiOutlineArrowDownLeft className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{n.message}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {n.date ? new Date(n.date).toLocaleString('es-AR') : 'Reciente'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
