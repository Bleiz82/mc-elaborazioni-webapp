import React, { useState } from 'react';
import { 
  BarChart3, PieChart as PieChartIcon, TrendingUp, Users, 
  Download, Calendar, Clock, CheckCircle2, Bot, FileText
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { toast } from 'sonner';

export default function AdminReports() {
  const [dateRange, setDateRange] = useState('questo_mese');

  const handleExport = (format: 'pdf' | 'csv') => {
    toast.success(`Esportazione in ${format.toUpperCase()} avviata`);
    // In a real app, this would trigger a cloud function to generate the report
  };

  // Mock Data for Charts
  const financialData = [
    { name: 'Gen', fatturato: 4000, incassato: 2400 },
    { name: 'Feb', fatturato: 3000, incassato: 1398 },
    { name: 'Mar', fatturato: 2000, incassato: 9800 },
    { name: 'Apr', fatturato: 2780, incassato: 3908 },
    { name: 'Mag', fatturato: 1890, incassato: 4800 },
    { name: 'Giu', fatturato: 2390, incassato: 3800 },
  ];

  const clientData = [
    { name: 'Aziende', value: 400 },
    { name: 'Professionisti', value: 300 },
    { name: 'Privati', value: 300 },
  ];
  const COLORS = ['#0EA5E9', '#8B5CF6', '#10B981'];

  const practiceData = [
    { name: 'Marco P.', completate: 45 },
    { name: 'Claudia C.', completate: 52 },
    { name: 'Giulia R.', completate: 38 },
    { name: 'Luca B.', completate: 24 },
  ];

  const aiData = [
    { name: 'Lun', task: 40 },
    { name: 'Mar', task: 30 },
    { name: 'Mer', task: 20 },
    { name: 'Gio', task: 27 },
    { name: 'Ven', task: 18 },
    { name: 'Sab', task: 23 },
    { name: 'Dom', task: 34 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Report & Analytics</h1>
          <p className="text-slate-500 text-sm mt-1">Analizza le performance dello studio</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={dateRange} onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          >
            <option value="questo_mese">Questo Mese</option>
            <option value="mese_scorso">Mese Scorso</option>
            <option value="trimestre">Ultimo Trimestre</option>
            <option value="anno">Quest'Anno</option>
          </select>
          <div className="relative group">
            <button className="inline-flex items-center justify-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors">
              <Download className="w-5 h-5 mr-2" />
              Esporta
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 first:rounded-t-xl">
                Esporta come PDF
              </button>
              <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 last:rounded-b-xl">
                Esporta come CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Section */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-sky-500" />
            <h2 className="text-lg font-bold text-slate-900">Finanziario</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-xs font-medium text-slate-500 mb-1">Fatturato Totale</p>
              <p className="text-xl font-bold text-slate-900">€ 45.200</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-xs font-medium text-slate-500 mb-1">Incassato</p>
              <p className="text-xl font-bold text-emerald-600">€ 38.500</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-xs font-medium text-slate-500 mb-1">Crediti Insoluti</p>
              <p className="text-xl font-bold text-red-600">€ 6.700</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-xs font-medium text-slate-500 mb-1">Tempo Medio Incasso</p>
              <p className="text-xl font-bold text-slate-900">14 gg</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={financialData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(value) => `€${value/1000}k`} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="fatturato" name="Fatturato" stroke="#0EA5E9" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="incassato" name="Incassato" stroke="#10B981" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Clients Section */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-slate-900">Clienti</h2>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-xs font-medium text-slate-500 mb-1">Clienti Attivi</p>
              <p className="text-xl font-bold text-slate-900">142</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-xs font-medium text-slate-500 mb-1">Nuovi Clienti</p>
              <p className="text-xl font-bold text-emerald-600">+12</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-xs font-medium text-slate-500 mb-1">Tasso Abbandono</p>
              <p className="text-xl font-bold text-slate-900">1.2%</p>
            </div>
          </div>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={clientData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {clientData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Practices & Deadlines Section */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-900">Pratiche & Scadenze</h2>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-xs font-medium text-slate-500 mb-1">Pratiche Totali</p>
              <p className="text-xl font-bold text-slate-900">284</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-xs font-medium text-slate-500 mb-1">Tempo Medio</p>
              <p className="text-xl font-bold text-slate-900">4.5 gg</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-xs font-medium text-slate-500 mb-1">Scadenze Rispettate</p>
              <p className="text-xl font-bold text-emerald-600">98%</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={practiceData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="completate" name="Pratiche Completate" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Subagents Section */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Bot className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-bold text-slate-900">AI Subagents</h2>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-xs font-medium text-slate-500 mb-1">Ore Risparmiate</p>
              <p className="text-xl font-bold text-emerald-600">~45h</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-xs font-medium text-slate-500 mb-1">Risposte Auto</p>
              <p className="text-xl font-bold text-slate-900">64%</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-xs font-medium text-slate-500 mb-1">Costo API</p>
              <p className="text-xl font-bold text-slate-900">€ 12.40</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={aiData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                <defs>
                  <linearGradient id="colorTask" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="task" name="Task Gestiti" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorTask)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
