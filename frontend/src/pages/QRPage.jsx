import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { userService } from '../services/api';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { HiOutlineQrCode, HiOutlineCamera } from 'react-icons/hi2';

export default function QRPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [mode, setMode] = useState('show'); // show or scan
  const [scannedUser, setScannedUser] = useState(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (mode === 'scan' && !scannerRef.current) {
      const scanner = new Html5QrcodeScanner('qr-reader', {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      });
      scanner.render(onScanSuccess, onScanError);
      scannerRef.current = scanner;
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [mode]);

  const loadProfile = async () => {
    try {
      const res = await userService.getAll();
      const me = res.data.find((u) => u.email === user.email);
      setProfile(me);
    } catch (err) {
      console.error(err);
    }
  };

  const onScanSuccess = async (text) => {
    try {
      const data = JSON.parse(text);
      if (data.type === 'fintech-pay' && data.userId) {
        const userRes = await userService.getById(data.userId);
        setScannedUser(userRes.data);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(() => {});
          scannerRef.current = null;
        }
      }
    } catch (e) {
      console.error('Invalid QR:', e);
    }
  };

  const onScanError = () => {};

  const qrData = profile
    ? JSON.stringify({ type: 'fintech-pay', userId: profile.id, name: profile.name, email: profile.email })
    : '';

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">QR de Pago</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Mostra o escanea un codigo QR</p>
      </div>

      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => { setMode('show'); setScannedUser(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-colors ${
            mode === 'show' ? 'bg-emerald-600 text-white' : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          <HiOutlineQrCode className="w-4 h-4" />
          Mi QR
        </button>
        <button
          onClick={() => setMode('scan')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-colors ${
            mode === 'scan' ? 'bg-emerald-600 text-white' : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          <HiOutlineCamera className="w-4 h-4" />
          Escanear
        </button>
      </div>

      {mode === 'show' && profile && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 flex flex-col items-center space-y-4">
          <div className="bg-white p-4 rounded-xl">
            <QRCodeSVG value={qrData} size={200} level="H" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{profile.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{profile.email}</p>
            <p className="text-xs text-gray-400 mt-2">Mostra este QR para que te paguen</p>
          </div>
        </div>
      )}

      {mode === 'scan' && !scannedUser && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 overflow-hidden">
          <div id="qr-reader" className="w-full"></div>
        </div>
      )}

      {scannedUser && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto">
              {scannedUser.name?.charAt(0)?.toUpperCase()}
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mt-3">{scannedUser.name}</p>
            <p className="text-sm text-gray-500">{scannedUser.email}</p>
          </div>
          <button
            onClick={() => navigate('/transfer', { state: { selectedUser: scannedUser } })}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
          >
            Transferir a {scannedUser.name}
          </button>
        </div>
      )}
    </div>
  );
}
