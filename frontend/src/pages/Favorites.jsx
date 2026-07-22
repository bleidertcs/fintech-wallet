import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/api';
import toast from 'react-hot-toast';
import {
  HiOutlineStar,
  HiOutlineArrowsRightLeft,
  HiOutlineTrash,
  HiOutlinePlusCircle,
  HiOutlineMagnifyingGlass,
} from 'react-icons/hi2';

export default function Favorites() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user?.email) {
      loadUsers();
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  const loadUsers = async () => {
    if (!user?.email) return;
    try {
      const res = await userService.getAll();
      const allUsers = res.data || [];
      const me = allUsers.find((u) => u.email?.trim().toLowerCase() === user.email?.trim().toLowerCase());
      setMyProfile(me);
      setUsers(allUsers.filter((u) => u.id !== me?.id));

    } catch (err) {
      console.error('Error:', err);
    }
  };

  const addFavorite = (u) => {
    if (!favorites.find((f) => f.id === u.id)) {
      setFavorites([...favorites, { id: u.id, name: u.name, email: u.email }]);
      toast.success(`${u.name} agregado a favoritos`);
    }
    setShowAdd(false);
    setSearch('');
  };

  const removeFavorite = (id) => {
    setFavorites(favorites.filter((f) => f.id !== id));
    toast.success('Eliminado de favoritos');
  };

  const nonFavUsers = users.filter(
    (u) => !favorites.find((f) => f.id === u.id) &&
    (u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-lg mx-auto space-y-6 sm:space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Favoritos</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Contactos frecuentes</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <HiOutlinePlusCircle className="w-4 h-4" />
          Agregar
        </button>
      </div>

      {/* Add favorite panel */}
      {showAdd && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
          <div className="relative">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Buscar usuario..."
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {nonFavUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => addFavorite(u)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-left transition-colors"
              >
                <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {u.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email}</p>
                </div>
                <HiOutlinePlusCircle className="w-5 h-5 text-emerald-500 ml-auto shrink-0" />
              </button>
            ))}
            {nonFavUsers.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-3">No hay usuarios disponibles</p>
            )}
          </div>
        </div>
      )}

      {/* Favorites list */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
        {favorites.length === 0 ? (
          <div className="p-12 text-center">
            <HiOutlineStar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 dark:text-gray-500">No tenes favoritos</p>
            <p className="text-xs text-gray-400 mt-1">Agrega contactos para transferir mas rapido</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {favorites.map((fav) => (
              <div key={fav.id} className="px-4 sm:px-6 py-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold shrink-0">
                  {fav.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{fav.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{fav.email}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => navigate('/transfer', { state: { selectedUser: fav } })}
                    className="p-2 bg-emerald-100 dark:bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/20 transition-colors"
                    title="Transferir"
                  >
                    <HiOutlineArrowsRightLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeFavorite(fav.id)}
                    className="p-2 bg-red-100 dark:bg-red-500/10 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/20 transition-colors"
                    title="Eliminar"
                  >
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
