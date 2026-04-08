import { useState } from 'react';
import { Search, Plus, Filter, MoreVertical, Building2, User } from 'lucide-react';
import { Link } from 'react-router-dom';

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
          <h1 className="text-2xl font-bold text-slate-900">Clienti</h1>
          <p className="text-slate-500 text-sm mt-1">Gestisci l'anagrafica dei clienti dello studio</p>
        </div>
        <button className="inline-flex items-center justify-center px-4 py-2 bg-sky-500 text-white rounded-lg font-medium hover:bg-sky-600 transition-colors">
          <Plus className="w-5 h-5 mr-2" />
          Nuovo Cliente
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cerca per nome, email o P.IVA..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtri
          </button>
          <select className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500">
            <option value="all">Tutti i tipi</option>
            <option value="azienda">Azienda</option>
            <option value="libero_professionista">Professionista</option>
            <option value="privato">Privato</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
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
            <tbody className="divide-y divide-slate-200">
              {mockClients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                        {client.type === 'azienda' ? <Building2 className="w-5 h-5 text-slate-500" /> : <User className="w-5 h-5 text-slate-500" />}
                      </div>
                      <div>
                        <Link to={`/admin/clients/${client.id}`} className="font-medium text-slate-900 hover:text-sky-600 transition-colors">
                          {client.name}
                        </Link>
                        <p className="text-xs text-slate-500">{client.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 capitalize">
                      {client.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                    {client.piva}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {client.practices}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {client.nextDeadline}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      client.status === 'attivo' ? 'bg-emerald-100 text-emerald-800' :
                      client.status === 'sospeso' ? 'bg-amber-100 text-amber-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {client.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <p className="text-sm text-slate-500">Mostrando 1 a 3 di 3 clienti</p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 border border-slate-200 rounded-md text-sm font-medium text-slate-600 hover:bg-white disabled:opacity-50" disabled>Precedente</button>
            <button className="px-3 py-1 border border-slate-200 rounded-md text-sm font-medium text-slate-600 hover:bg-white disabled:opacity-50" disabled>Successivo</button>
          </div>
        </div>
      </div>
    </div>
  );
}
