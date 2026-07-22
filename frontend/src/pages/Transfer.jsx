import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { userService, transactionService } from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlineArrowsRightLeft, HiOutlineMagnifyingGlass, HiOutlineStar } from 'react-icons/hi2';

export default function Transfer() {
  const { user } = useAuth();
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [toUserId, setToUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.email) {
      loadUsers();
    }
  }, [user]);

  // Pre-select user from QR scan or other navigation
  useEffect(() => {
    if (location.state?.selectedUser) {
      setToUserId(location.state.selectedUser.id.toString());
    }
  }, [location.state]);

  const loadUsers = async () => {
    if (!user?.email) return;
    try {
      const res = await userService.getAll();
      const allUsers = res.data || [];
      let me = allUsers.find((u) => u.email?.trim().toLowerCase() === user.email?.trim().toLowerCase());

      if (!me) {
        try {
          const createRes = await userService.create({
            name: user.email.split('@')[0],
            email: user.email,
            balance: 10000,
          });
          me = createRes.data;
          allUsers.push(me);
        } catch (createErr) {
          console.error('Error auto-creating user profile:', createErr);
        }
      }

      setMyProfile(me);
      setUsers(allUsers.filter((u) => u.id !== me?.id));
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };


  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!myProfile) {
      toast.error('No se encontro tu perfil de usuario');
      return;
    }
    if (parseFloat(amount) <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }
    if (parseFloat(amount) > myProfile.balance) {
      toast.error('Saldo insuficiente');
      return;
    }

    setLoading(true);
    try {
      await transactionService.transfer({
        fromUserId: myProfile.id,
        toUserId: parseInt(toUserId),
        amount: parseFloat(amount),
      });
      toast.success('Transferencia realizada!');
      setToUserId('');
      setAmount('');
      setSearch('');
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error en la transferencia');
    } finally {
      setLoading(false);
    }
  };

  const selectedUser = users.find((u) => u.id === parseInt(toUserId));

  return (
    <div className="max-w-lg mx-auto space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Transferir</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Envia dinero a otro usuario</p>
      </div>

      {myProfile && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">Tu balance actual</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            ${myProfile.balance?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-6">
        {/* Search users */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Destinatario</label>
          <div className="relative mb-3">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Buscar por nombre o email..."
            />
          </div>

          {/* User list */}
          <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg">
            {filteredUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => { setToUserId(u.id.toString()); setSearch(''); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  parseInt(toUserId) === u.id
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500'
                    : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent'
                }`}
              >
                <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {u.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email}</p>
                </div>
              </button>
            ))}
            {filteredUsers.length === 0 && search && (
              <p className="text-sm text-gray-400 text-center py-3">No se encontraron usuarios</p>
            )}
          </div>

          {selectedUser && !search && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
              <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {selectedUser.name?.charAt(0)?.toUpperCase()}
              </div>
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                {selectedUser.name} ({selectedUser.email})
              </span>
            </div>
          )}
        </div>

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

        <button
          type="submit"
          disabled={loading || !toUserId}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <HiOutlineArrowsRightLeft className="w-5 h-5" />
          {loading ? 'Procesando...' : 'Enviar transferencia'}
        </button>
      </form>
    </div>
  );
}
