import { 
  Upload, CreditCard, CalendarClock, MessageSquare, 
  ChevronRight, FileText, User
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { Link } from 'react-router-dom';

const upcomingDeadlines = [
  { id: 1, title: 'F24 IVA Trimestrale', date: '16 Apr', daysLeft: 8 },
  { id: 2, title: 'Dichiarazione Redditi', date: '30 Apr', daysLeft: 22 },
];

const recentMessages = [
  { id: 1, sender: 'Studio', text: 'Abbiamo elaborato la tua busta paga di Marzo. La trovi nella sezione documenti.', time: 'Ieri' },
  { id: 2, sender: 'Agente Scadenze', text: 'Promemoria: scadenza F24 in avvicinamento.', time: '2 giorni fa' },
];

export default function ClientHome() {
  const { profile } = useAuth();

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Summary Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg">
        <h2 className="text-slate-300 text-sm font-medium mb-4">La tua situazione</h2>
        <div className="grid grid-cols-3 gap-4 divide-x divide-slate-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">2</p>
            <p className="text-xs text-slate-400 mt-1">Scadenze</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-400">0</p>
            <p className="text-xs text-slate-400 mt-1">Da pagare</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">1</p>
            <p className="text-xs text-slate-400 mt-1">Messaggi</p>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Link to="/client/documents" className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-3 hover:border-sky-200 transition-colors active:scale-95">
          <div className="w-12 h-12 bg-sky-50 rounded-full flex items-center justify-center">
            <Upload className="w-6 h-6 text-sky-600" />
          </div>
          <span className="text-sm font-medium text-slate-700 text-center">Carica<br/>Documento</span>
        </Link>
        
        <Link to="/client/payments" className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-3 hover:border-sky-200 transition-colors active:scale-95">
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-emerald-600" />
          </div>
          <span className="text-sm font-medium text-slate-700 text-center">Paga<br/>Parcella</span>
        </Link>
        
        <Link to="/client/deadlines" className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-3 hover:border-sky-200 transition-colors active:scale-95">
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center">
            <CalendarClock className="w-6 h-6 text-amber-600" />
          </div>
          <span className="text-sm font-medium text-slate-700 text-center">Le Mie<br/>Scadenze</span>
        </Link>
        
        <Link to="/client/chat" className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-3 hover:border-sky-200 transition-colors active:scale-95">
          <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-indigo-600" />
          </div>
          <span className="text-sm font-medium text-slate-700 text-center">Chatta con<br/>lo Studio</span>
        </Link>
      </div>

      {/* Upcoming Deadlines */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Prossime Scadenze</h3>
          <Link to="/client/deadlines" className="text-xs text-sky-600 font-medium flex items-center">
            Vedi tutte <ChevronRight className="w-3 h-3 ml-0.5" />
          </Link>
        </div>
        <div className="space-y-3">
          {upcomingDeadlines.map(deadline => (
            <div key={deadline.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <CalendarClock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{deadline.title}</p>
                  <p className="text-xs text-slate-500">{deadline.date}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-50 text-red-600">
                  -{deadline.daysLeft} gg
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Communications */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Ultime Comunicazioni</h3>
          <Link to="/client/chat" className="text-xs text-sky-600 font-medium flex items-center">
            Vai alla chat <ChevronRight className="w-3 h-3 ml-0.5" />
          </Link>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-100">
          {recentMessages.map(msg => (
            <div key={msg.id} className="p-4 flex gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-slate-900">{msg.sender}</p>
                  <p className="text-xs text-slate-400">{msg.time}</p>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2">{msg.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
