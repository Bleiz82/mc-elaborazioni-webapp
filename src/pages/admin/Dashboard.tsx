import { useState, useEffect } from 'react';
import { 
  TrendingUp, Users, Kanban, CreditCard, 
  AlertCircle, Clock, CheckCircle2, Bot, FolderOpen 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Ott', entrate: 4000 },
  { name: 'Nov', entrate: 3000 },
  { name: 'Dic', entrate: 2000 },
  { name: 'Gen', entrate: 2780 },
  { name: 'Feb', entrate: 1890 },
  { name: 'Mar', entrate: 2390 },
];

const recentActivities = [
  { id: 1, text: 'Nuovo documento caricato da Mario Rossi', time: '10 min fa', type: 'doc' },
  { id: 2, text: 'Pagamento ricevuto da Tech Srl', time: '1 ora fa', type: 'payment' },
  { id: 3, text: 'Pratica "Bilancio 2023" completata', time: '2 ore fa', type: 'practice' },
  { id: 4, text: 'Agente Scadenze ha inviato 5 solleciti', time: '3 ore fa', type: 'ai' },
];

const upcomingDeadlines = [
  { id: 1, title: 'F24 IVA Trimestrale', client: 'Tech Srl', date: '16 Apr', priority: 'alta' },
  { id: 2, title: 'Buste Paga Marzo', client: 'Ristorante Da Mario', date: '16 Apr', priority: 'media' },
  { id: 3, title: 'Dichiarazione Redditi', client: 'Giuseppe Verdi', date: '30 Apr', priority: 'bassa' },
];

const aiAgents = [
  { id: 1, name: 'Agente Scadenze', status: 'active', color: 'bg-blue-500', log: 'Controllo completato. 5 notifiche inviate.' },
  { id: 2, name: 'Agente Solleciti', status: 'active', color: 'bg-red-500', log: 'In attesa del prossimo ciclo (14:00).' },
  { id: 3, name: 'Agente Documenti', status: 'active', color: 'bg-green-500', log: 'Classificati 3 nuovi documenti.' },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Panoramica delle attività dello studio</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Fatturato Mensile</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">€ 12.450</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-emerald-600 font-medium flex items-center">
              +12.5%
            </span>
            <span className="text-slate-400 ml-2">vs mese scorso</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Clienti Attivi</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">142</p>
            </div>
            <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-sky-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-emerald-600 font-medium flex items-center">
              +3
            </span>
            <span className="text-slate-400 ml-2">nuovi questo mese</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Pratiche in Lavorazione</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">38</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
              <Kanban className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: '65%' }}></div>
            </div>
            <p className="text-xs text-slate-500 mt-2">65% completamento medio</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Pagamenti in Attesa</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">12</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-amber-600 font-medium">
              € 3.240
            </span>
            <span className="text-slate-400 ml-2">da incassare</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Entrate Ultimi 6 Mesi</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="entrate" fill="#0EA5E9" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Deadlines */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Prossime Scadenze</h2>
            <button className="text-sm text-sky-600 hover:text-sky-700 font-medium">Vedi tutte</button>
          </div>
          <div className="space-y-4">
            {upcomingDeadlines.map((deadline) => (
              <div key={deadline.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                  deadline.priority === 'alta' ? 'bg-red-500' : 
                  deadline.priority === 'media' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{deadline.title}</p>
                  <p className="text-xs text-slate-500 truncate">{deadline.client}</p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                    {deadline.date}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Attività Recenti</h2>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {activity.type === 'doc' && <FolderOpen className="w-4 h-4 text-slate-500" />}
                  {activity.type === 'payment' && <CreditCard className="w-4 h-4 text-slate-500" />}
                  {activity.type === 'practice' && <CheckCircle2 className="w-4 h-4 text-slate-500" />}
                  {activity.type === 'ai' && <Bot className="w-4 h-4 text-slate-500" />}
                </div>
                <div>
                  <p className="text-sm text-slate-700">{activity.text}</p>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Agents Status */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Stato Subagenti AI</h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
              Tutti Operativi
            </span>
          </div>
          <div className="space-y-3">
            {aiAgents.map((agent) => (
              <div key={agent.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${agent.color}`} />
                    <span className="text-sm font-medium text-slate-900">{agent.name}</span>
                  </div>
                  <span className="text-xs text-emerald-600 font-medium">Attivo</span>
                </div>
                <p className="text-xs text-slate-500 font-mono ml-4">{`> ${agent.log}`}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
