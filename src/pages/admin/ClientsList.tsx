import { useState } from 'react';
import { Search, Plus, Filter, MoreVertical, Building2, User, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { generateClientListPDF, generateCSV } from '../../services/pdfGenerator';

const mockClients = [
  { id: '1', name: 'Tech Solutions Srl', type: 'azienda', email: 'info@techsolutions.it', piva: '01234567890', status: 'attivo', nextDeadline: '16 Apr 2026', practices: 3 },
  { id: '2', name: 'Mario Rossi', type: 'libero_professionista', email: 'mario.rossi@email.it', piva: '09876543210', status: 'attivo', nextDeadline: '30 Apr 2026', practices: 1 },
  { id: '3', name: 'Giuseppe Verdi', type: 'privato', email: 'g.verdi@email.it', piva: 'VRDGPP80A01H501A', status: 'sospeso', nextDeadline: '-', practices: 0 },
];

export default function ClientsList() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Clienti</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gestisci l'anagrafica dei clienti dello studio</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <button className="inline-flex items-center justify-center px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <Download className="w-5 h-5 mr-2" />
              Esporta
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button onClick={() => generateClientListPDF(mockClients)} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 first:rounded-t-xl">
                Esporta come PDF
              </button>
              <button onClick={() => generateCSV(mockClients, [
                { key: 'name', label: 'Nome' },
                { key: 'type', label: 'Tipo' },
                { key: 'email', label: 'Email' },
                { key: 'piva', label: 'P.IVA/CF' },
                { key: 'status', label: 'Stato' }
              ], 'Lista_Clienti')} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 last:rounded-b-xl">
                Esporta come CSV
              </button>
            </div>
          </div>
          <button className="inline-flex items-center justify-center px-4 py-2 bg-sky-500 text-white rounded-lg font-medium hover:bg-sky-600 transition-colors">
            <Plus className="w-5 h-5 mr-2" />
            Nuovo Cliente
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-slate-900/50 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
          <input 
            type="text" 
            placeholder="Cerca per nome, email o P.IVA..." 
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtri
          </button>
          <select className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500">
            <option value="all">Tutti i tipi</option>
            <option value="azienda">Azienda</option>
            <option value="libero_professionista">Professionista</option>
            <option value="privato">Privato</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-slate-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium">
              <tr>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Tipologia</th>
                <th className="px-6 py-4">P.IVA / C.F.</th>
                <th className="px-6 py-4">Pratiche</th>
                <th className="px-6 py-4">Prossima Scadenza</th>
                <th className="px-6 py-4">Stato</th>
                <th className="px-6 py-4 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {mockClients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                        {client.type === 'azienda' ? <Building2 className="w-5 h-5 text-slate-500 dark:text-slate-400" /> : <User className="w-5 h-5 text-slate-500 dark:text-slate-400" />}
                      </div>
                      <div>
                        <Link to={`/admin/clients/${client.id}`} className="font-medium text-slate-900 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                          {client.name}
                        </Link>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{client.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300 capitalize">
                      {client.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono text-xs">
                    {client.piva}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                    {client.practices}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                    {client.nextDeadline}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      client.status === 'attivo' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400' :
                      client.status === 'sospeso' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400' :
                      'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300'
                    }`}>
                      {client.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">Mostrando 1 a 3 di 3 clienti</p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded-md text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50" disabled>Precedente</button>
            <button className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded-md text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50" disabled>Successivo</button>
          </div>
        </div>
      </div>
    </div>
  );
}
