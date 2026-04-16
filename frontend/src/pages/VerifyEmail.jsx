import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiOutlineCheckBadge, HiOutlineXCircle } from 'react-icons/hi2';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const { user, setUser } = useAuth();

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      authService.verifyEmail(token)
        .then(() => {
          setStatus('success');
          // Update user state so profile shows green immediately
          if (user) {
            const updated = { ...user, verified: true };
            localStorage.setItem('user', JSON.stringify(updated));
            setUser(updated);
          }
        })
        .catch(() => setStatus('error'));
    } else {
      setStatus('error');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 text-center space-y-4">
        {status === 'loading' && (
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500 mx-auto"></div>
        )}
        {status === 'success' && (
          <>
            <HiOutlineCheckBadge className="w-16 h-16 text-emerald-500 mx-auto" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email verificado!</h1>
            <p className="text-gray-500">Tu cuenta ha sido verificada exitosamente.</p>
            <Link to="/" className="inline-block mt-4 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
              Ir al Dashboard
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <HiOutlineXCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Error</h1>
            <p className="text-gray-500">Token de verificacion invalido o expirado.</p>
            <Link to="/" className="inline-block mt-4 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
              Volver
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
