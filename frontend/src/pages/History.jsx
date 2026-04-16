import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService, transactionService } from '../services/api';
import { HiOutlineArrowUpRight, HiOutlineArrowDownLeft, HiOutlineDocumentArrowDown } from 'react-icons/hi2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export default function History() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const usersRes = await userService.getAll();
      const allUsers = usersRes.data;
      // Build ID -> name map
      const map = {};
      allUsers.forEach((u) => { map[u.id] = u.name || u.email; });
      setUsersMap(map);

      const me = allUsers.find((u) => u.email === user.email);
      if (me) {
        setProfile(me);
        const txRes = await transactionService.getByUser(me.id);
        setTransactions(txRes.data);
      }
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoading(false);
    }
  };

  const getUserName = (id) => usersMap[id] || `Usuario #${id}`;

  const filtered = transactions.filter((tx) => {
    if (filter === 'sent' && tx.fromUserId !== profile?.id) return false;
    if (filter === 'received' && tx.toUserId !== profile?.id) return false;
    if (dateFrom && tx.createdAt) {
      const txDate = new Date(tx.createdAt).toISOString().split('T')[0];
      if (txDate < dateFrom) return false;
    }
    if (dateTo && tx.createdAt) {
      const txDate = new Date(tx.createdAt).toISOString().split('T')[0];
      if (txDate > dateTo) return false;
    }
    return true;
  });

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Historial de Transacciones', 14, 22);
    doc.setFontSize(10);
    doc.text(`Usuario: ${profile?.name} (${profile?.email})`, 14, 30);
    doc.text(`Generado: ${new Date().toLocaleString('es-AR')}`, 14, 36);

    const rows = filtered.map((tx) => {
      const isSent = tx.fromUserId === profile?.id;
      return [
        `#${tx.transactionId || tx.id}`,
        isSent ? 'Enviado' : 'Recibido',
        getUserName(isSent ? tx.toUserId : tx.fromUserId),
        `$${tx.amount?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
        tx.status,
        tx.createdAt ? new Date(tx.createdAt).toLocaleString('es-AR') : '-',
      ];
    });

    autoTable(doc, {
      startY: 42,
      head: [['ID', 'Tipo', 'Usuario', 'Monto', 'Estado', 'Fecha']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
    });

    doc.save('historial-transacciones.pdf');
  };

  const exportExcel = () => {
    const data = filtered.map((tx) => {
      const isSent = tx.fromUserId === profile?.id;
      return {
        ID: tx.transactionId || tx.id,
        Tipo: isSent ? 'Enviado' : 'Recibido',
        Usuario: getUserName(isSent ? tx.toUserId : tx.fromUserId),
        Monto: tx.amount,
        Estado: tx.status,
        Fecha: tx.createdAt ? new Date(tx.createdAt).toLocaleString('es-AR') : '-',
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transacciones');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), 'historial-transacciones.xlsx');
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Historial</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Todas tus transacciones</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <HiOutlineDocumentArrowDown className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <HiOutlineDocumentArrowDown className="w-4 h-4" />
            Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'Todas' },
            { key: 'sent', label: 'Enviadas' },
            { key: 'received', label: 'Recibidas' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-1">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500">No hay transacciones</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map((tx) => {
              const isSent = tx.fromUserId === profile?.id;
              return (
                <div key={tx.transactionId || tx.id} className="px-4 sm:px-6 py-4 flex items-center justify-between">
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
                        {isSent ? `Enviado a ${getUserName(tx.toUserId)}` : `Recibido de ${getUserName(tx.fromUserId)}`}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleString('es-AR') : tx.status}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${isSent ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {isSent ? '-' : '+'}${tx.amount?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">#{tx.transactionId || tx.id}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
