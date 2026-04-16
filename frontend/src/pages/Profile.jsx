import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService, authService, CURRENCIES } from '../services/api';
import api from '../services/api';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import {
  HiOutlineUser, HiOutlineEnvelope, HiOutlineBanknotes,
  HiOutlineLockClosed, HiOutlineShieldCheck, HiOutlineCurrencyDollar,
  HiOutlineCheckBadge,
} from 'react-icons/hi2';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  // Password
  const [showPassword, setShowPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);
  // 2FA
  const [show2FA, setShow2FA] = useState(false);
  const [totpSetup, setTotpSetup] = useState(null);
  const [totpCode, setTotpCode] = useState('');
  // Verification
  const [sendingVerification, setSendingVerification] = useState(false);
  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [dailyLimit, setDailyLimit] = useState('');
  const [currency, setCurrency] = useState('');

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const res = await userService.getAll();
      const me = res.data.find((u) => u.email === user.email);
      setProfile(me);
      if (me) {
        setDailyLimit(me.dailyLimit?.toString() || '50000');
        setCurrency(me.currency || 'ARS');
      }
      // Refresh auth status (verified, totpEnabled) from backend
      try {
        const authRes = await authService.getMe(user.email);
        const fresh = authRes.data;
        const updated = { ...user, verified: fresh.verified, totpEnabled: fresh.totpEnabled, role: fresh.role };
        localStorage.setItem('user', JSON.stringify(updated));
        setUser(updated);
      } catch (e) { console.error('Error refreshing auth status:', e); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error('Minimo 6 caracteres'); return; }
    setChangingPw(true);
    try {
      await api.put('/auth/change-password', { email: user.email, oldPassword, newPassword });
      toast.success('Contrasena cambiada!');
      setOldPassword(''); setNewPassword(''); setShowPassword(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setChangingPw(false); }
  };

  const handleSetup2FA = async () => {
    try {
      const res = await authService.setupTotp(user.email);
      setTotpSetup(res.data);
    } catch (err) { toast.error('Error al configurar 2FA'); }
  };

  const handleEnable2FA = async () => {
    try {
      await authService.enableTotp(user.email, totpCode);
      toast.success('2FA activado!');
      const updated = { ...user, totpEnabled: true };
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
      setTotpSetup(null); setTotpCode(''); setShow2FA(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Codigo invalido'); }
  };

  const handleDisable2FA = async () => {
    try {
      await authService.disableTotp(user.email);
      toast.success('2FA desactivado');
      const updated = { ...user, totpEnabled: false };
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
    } catch (err) { toast.error('Error'); }
  };

  const handleResendVerification = async () => {
    setSendingVerification(true);
    try {
      await authService.resendVerification(user.email);
      toast.success('Email de verificacion enviado! Revisa tu bandeja de entrada.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al enviar el email');
    } finally {
      setSendingVerification(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await userService.updateSettings(profile.id, { dailyLimit, currency });
      toast.success('Configuracion guardada!');
      loadProfile();
    } catch (err) { toast.error('Error al guardar'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500"></div></div>;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Mi Perfil</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Informacion y configuracion</p>
      </div>

      {/* User card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-8 flex items-center justify-center">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-3xl font-bold text-white">{profile?.name?.charAt(0)?.toUpperCase() || '?'}</span>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <HiOutlineUser className="w-5 h-5 text-gray-400 shrink-0" />
            <div><p className="text-xs text-gray-500">Nombre</p><p className="text-sm font-medium text-gray-900 dark:text-white">{profile?.name}</p></div>
          </div>
          <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <HiOutlineEnvelope className="w-5 h-5 text-gray-400 shrink-0" />
            <div className="flex-1"><p className="text-xs text-gray-500">Email</p><p className="text-sm font-medium text-gray-900 dark:text-white">{profile?.email}</p></div>
            {user.verified ? (
              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"><HiOutlineCheckBadge className="w-4 h-4" />Verificado</span>
            ) : (
              <button
                onClick={handleResendVerification}
                disabled={sendingVerification}
                className="flex items-center gap-1 text-xs bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 px-3 py-1.5 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-500/20 transition-colors font-medium disabled:opacity-50"
              >
                <HiOutlineEnvelope className="w-3.5 h-3.5" />
                {sendingVerification ? 'Enviando...' : 'Verificar'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <HiOutlineBanknotes className="w-5 h-5 text-gray-400 shrink-0" />
            <div><p className="text-xs text-gray-500">Balance</p><p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{CURRENCIES[profile?.currency || 'ARS']?.symbol}{profile?.balance?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p></div>
          </div>
          <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <HiOutlineShieldCheck className="w-5 h-5 text-gray-400 shrink-0" />
            <div><p className="text-xs text-gray-500">2FA</p><p className="text-sm font-medium text-gray-900 dark:text-white">{user.totpEnabled ? 'Activado' : 'Desactivado'}</p></div>
          </div>
        </div>
      </div>

      {/* Settings: Currency + Daily Limit */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
        <button onClick={() => setShowSettings(!showSettings)} className="w-full flex items-center gap-3 p-4 text-left">
          <HiOutlineCurrencyDollar className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">Moneda y Limite diario</span>
          <span className="ml-auto text-gray-400 text-sm">{showSettings ? '▲' : '▼'}</span>
        </button>
        {showSettings && (
          <div className="px-4 pb-4 space-y-4 border-t border-gray-100 dark:border-gray-800 pt-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Moneda</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {Object.entries(CURRENCIES).map(([code, { name }]) => (
                  <option key={code} value={code}>{code} - {name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Limite diario de transferencia</label>
              <input type="number" value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button onClick={handleSaveSettings} className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm">Guardar</button>
          </div>
        )}
      </div>

      {/* 2FA */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
        <button onClick={() => setShow2FA(!show2FA)} className="w-full flex items-center gap-3 p-4 text-left">
          <HiOutlineShieldCheck className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">Autenticacion de dos factores (2FA)</span>
          <span className="ml-auto text-gray-400 text-sm">{show2FA ? '▲' : '▼'}</span>
        </button>
        {show2FA && (
          <div className="px-4 pb-4 space-y-4 border-t border-gray-100 dark:border-gray-800 pt-4">
            {user.totpEnabled ? (
              <div className="space-y-3">
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">2FA esta activo</p>
                <button onClick={handleDisable2FA} className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg text-sm">Desactivar 2FA</button>
              </div>
            ) : totpSetup ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Escanea este QR con Google Authenticator:</p>
                <div className="flex justify-center">
                  <div className="bg-white p-3 rounded-lg">
                    <QRCodeSVG value={totpSetup.otpAuthUri} size={180} />
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center break-all">Secret: {totpSetup.secret}</p>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Ingresa el codigo de la app</label>
                  <input type="text" value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-center text-xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="000000" maxLength={6}
                  />
                </div>
                <button onClick={handleEnable2FA} disabled={totpCode.length !== 6}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm disabled:opacity-50">
                  Verificar y activar
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Agrega una capa extra de seguridad con Google Authenticator</p>
                <button onClick={handleSetup2FA} className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm">Configurar 2FA</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Change password */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
        <button onClick={() => setShowPassword(!showPassword)} className="w-full flex items-center gap-3 p-4 text-left">
          <HiOutlineLockClosed className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">Cambiar contrasena</span>
          <span className="ml-auto text-gray-400 text-sm">{showPassword ? '▲' : '▼'}</span>
        </button>
        {showPassword && (
          <form onSubmit={handleChangePassword} className="px-4 pb-4 space-y-4 border-t border-gray-100 dark:border-gray-800 pt-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Contrasena actual</label>
              <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Nueva contrasena</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <button type="submit" disabled={changingPw} className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm disabled:opacity-50">
              {changingPw ? 'Cambiando...' : 'Cambiar contrasena'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
