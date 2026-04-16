import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService, transactionService } from '../services/api';
import toast from 'react-hot-toast';
import {
  HiOutlineHandRaised,
  HiOutlineCheck,
  HiOutlineXMark,
  HiOutlineMagnifyingGlass,
  HiOutlineClock,
} from 'react-icons/hi2';

export default function RequestMoney() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [targetId, setTargetId] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('send'); // send or received

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const usersRes = await userService.getAll();
      const allUsers = usersRes.data;
      const me = allUsers.find((u) => u.email === user.email);
      setProfile(me);
      setUsers(allUsers.filter((u) => u.id !== me?.id));
      if (me) {
        const reqRes = await transactionService.getRequests(me.id);
        setRequests(reqRes.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!profile || !targetId) return;
    setLoading(true);
    try {
      await transactionService.createRequest({
        requesterId: profile.id,
        targetId: parseInt(targetId),
        amount: parseFloat(amount),
        message: message || null,
      });
      toast.success('Solicitud enviada!');
      setTargetId('');
      setAmount('');
      setMessage('');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al enviar solicitud');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id) => {
    try {
      await transactionService.acceptRequest(id);
      toast.success('Solicitud aceptada! Transferencia realizada.');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al aceptar');
    }
  };

  const handleReject = async (id) => {
    try {
      await transactionService.rejectRequest(id);
      toast.success('Solicitud rechazada');
      loadData();
    } catch (err) {
      toast.error('Error al rechazar');
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  const pendingForMe = requests.filter((r) => r.targetId === profile?.id && r.status === 'PENDING');
  const myRequests = requests.filter((r) => r.requesterId === profile?.id);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Solicitar Dinero</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Pedile plata a otro usuario</p>
      </div>

      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <button onClick={() => setTab('send')} className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors ${tab === 'send' ? 'bg-emerald-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}>
          Enviar solicitud
        </button>
        <button onClick={() => setTab('received')} className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors relative ${tab === 'received' ? 'bg-emerald-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}>
          Recibidas
          {pendingForMe.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{pendingForMe.length}</span>
          )}
        </button>
        <button onClick={() => setTab('sent')} className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors ${tab === 'sent' ? 'bg-emerald-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}>
          Mis solicitudes
        </button>
      </div>

      {tab === 'send' && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">A quien pedirle</label>
            <div className="relative mb-2">
              <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Buscar usuario..."
              />
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1">
              {filteredUsers.map((u) => (
                <button key={u.id} type="button" onClick={() => { setTargetId(u.id.toString()); setSearch(''); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${parseInt(targetId) === u.id ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500' : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent'}`}
                >
                  <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold">{u.name?.charAt(0)?.toUpperCase()}</div>
                  <span className="text-sm text-gray-900 dark:text-white truncate">{u.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Monto</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required min="0.01" step="0.01"
                className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mensaje (opcional)</label>
            <input type="text" value={message} onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Ej: Para la cena de ayer"
            />
          </div>
          <button type="submit" disabled={loading || !targetId}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
            <HiOutlineHandRaised className="w-5 h-5" />
            {loading ? 'Enviando...' : 'Solicitar dinero'}
          </button>
        </form>
      )}

      {tab === 'received' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
          {pendingForMe.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No tenes solicitudes pendientes</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {pendingForMe.map((r) => (
                <div key={r.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Usuario #{r.requesterId} te pide</p>
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">${r.amount?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                      {r.message && <p className="text-xs text-gray-500 mt-1">"{r.message}"</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleAccept(r.id)} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-1">
                      <HiOutlineCheck className="w-4 h-4" /> Pagar
                    </button>
                    <button onClick={() => handleReject(r.id)} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-1">
                      <HiOutlineXMark className="w-4 h-4" /> Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'sent' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
          {myRequests.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No enviaste solicitudes</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {myRequests.map((r) => (
                <div key={r.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">Pediste a usuario #{r.targetId}</p>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">${r.amount?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    r.status === 'PENDING' ? 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' :
                    r.status === 'ACCEPTED' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' :
                    'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                  }`}>{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
