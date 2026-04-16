import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  HiOutlineHome,
  HiOutlineArrowsRightLeft,
  HiOutlineClock,
  HiOutlineUser,
  HiOutlineBell,
  HiOutlineArrowRightOnRectangle,
  HiOutlineBanknotes,
  HiOutlineStar,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineXMark,
  HiOutlineQrCode,
  HiOutlineHandRaised,
  HiOutlineShieldCheck,
} from 'react-icons/hi2';

const links = [
  { to: '/', label: 'Dashboard', icon: HiOutlineHome },
  { to: '/wallet', label: 'Depositar / Retirar', icon: HiOutlineBanknotes },
  { to: '/transfer', label: 'Transferir', icon: HiOutlineArrowsRightLeft },
  { to: '/qr', label: 'QR de Pago', icon: HiOutlineQrCode },
  { to: '/request', label: 'Solicitar Dinero', icon: HiOutlineHandRaised },
  { to: '/history', label: 'Historial', icon: HiOutlineClock },
  { to: '/favorites', label: 'Favoritos', icon: HiOutlineStar },
  { to: '/profile', label: 'Perfil', icon: HiOutlineUser },
  { to: '/notifications', label: 'Notificaciones', icon: HiOutlineBell },
];

export default function Sidebar({ open, onClose }) {
  const { logout, user } = useAuth();
  const { dark, toggle } = useTheme();

  const allLinks = user?.role === 'ADMIN'
    ? [...links, { to: '/admin', label: 'Admin', icon: HiOutlineShieldCheck }]
    : links;

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-white dark:bg-gray-900 text-gray-800 dark:text-white flex flex-col z-50 border-r border-gray-200 dark:border-gray-700 transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">FinTech Wallet</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">{user?.email}</p>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-500 hover:text-gray-800 dark:hover:text-white">
            <HiOutlineXMark className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {allLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-1">
          <button
            onClick={toggle}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors w-full"
          >
            {dark ? <HiOutlineSun className="w-5 h-5" /> : <HiOutlineMoon className="w-5 h-5" />}
            {dark ? 'Modo Claro' : 'Modo Oscuro'}
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors w-full"
          >
            <HiOutlineArrowRightOnRectangle className="w-5 h-5" />
            Cerrar Sesion
          </button>
        </div>
      </aside>
    </>
  );
}
