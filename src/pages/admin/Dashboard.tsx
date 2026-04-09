import { useState, useEffect } from 'react';
import { 
  TrendingUp, Users, Kanban, CreditCard, 
  AlertCircle, Clock, CheckCircle2, Bot, FolderOpen 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { startOfMonth, endOfMonth, subMonths, format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    monthlyRevenue: 0,
    activeClients: 0,
    activePractices: 0,
    pendingPayments: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [aiAgents, setAiAgents] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const now = new Date();
        const startOfCurrentMonth = startOfMonth(now).toISOString();
        const endOfCurrentMonth = endOfMonth(now).toISOString();

        // 1. Fatturato Mensile
        const invoicesRef = collection(db, 'invoices');
        const qMonthlyRevenue = query(
          invoicesRef,
          where('status', '==', 'pagata')
        );
        const monthlyRevenueSnap = await getDocs(qMonthlyRevenue);
        let monthlyRevenue = 0;
        monthlyRevenueSnap.forEach(doc => {
          const data = doc.data();
          if (data.paid_at && data.paid_at >= startOfCurrentMonth && data.paid_at <= endOfCurrentMonth) {
            monthlyRevenue += data.total_amount || 0;
          }
        });

        // 2. Clienti Attivi
        const clientsRef = collection(db, 'users');
        const qActiveClients = query(
          clientsRef,
          where('role', '==', 'client'),
          where('status', '==', 'active')
        );
        const activeClientsSnap = await getDocs(qActiveClients);
        const activeClients = activeClientsSnap.size;

        // 3. Pratiche in Lavorazione
        const practicesRef = collection(db, 'practices');
        const qActivePractices = query(
          practicesRef,
          where('status', 'in', ['nuova', 'in_lavorazione', 'in_attesa_cliente', 'in_revisione'])
        );
        const activePracticesSnap = await getDocs(qActivePractices);
        const activePractices = activePracticesSnap.size;

        // 4. Pagamenti in Attesa
        const qPendingPayments = query(
          invoicesRef,
          where('status', 'in', ['da_pagare', 'scaduta'])
        );
        const pendingPaymentsSnap = await getDocs(qPendingPayments);
        let pendingPayments = 0;
        pendingPaymentsSnap.forEach(doc => {
          pendingPayments += doc.data().total_amount || 0;
        });

        setStats({
          monthlyRevenue,
          activeClients,
          activePractices,
          pendingPayments,
        });

        // 5. Grafico Entrate ultimi 6 mesi
        const sixMonthsAgo = subMonths(startOfMonth(now), 5);
        const chartMap = new Map();
        for (let i = 5; i >= 0; i--) {
          const d = subMonths(now, i);
          chartMap.set(format(d, 'MMM', { locale: it }), 0);
        }

        monthlyRevenueSnap.forEach(doc => {
          const data = doc.data();
          if (data.paid_at) {
            const paidDate = parseISO(data.paid_at);
            if (paidDate >= sixMonthsAgo) {
              const monthKey = format(paidDate, 'MMM', { locale: it });
              if (chartMap.has(monthKey)) {
                chartMap.set(monthKey, chartMap.get(monthKey) + (data.total_amount || 0));
              }
            }
          }
        });

        const newChartData = Array.from(chartMap.entries()).map(([name, entrate]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          entrate
        }));
        setChartData(newChartData);

        // 6. Prossime Scadenze
        const deadlinesRef = collection(db, 'deadlines');
        const qDeadlines = query(
          deadlinesRef,
          where('status', '!=', 'completata'),
          orderBy('status'), // Required by Firestore when combining != and orderBy on different fields, but let's just fetch and sort in memory to avoid complex indexes
        );
        const deadlinesSnap = await getDocs(collection(db, 'deadlines'));
        const deadlinesList: any[] = [];
        deadlinesSnap.forEach(doc => {
          const data = doc.data();
          if (data.status !== 'completata') {
            deadlinesList.push({ id: doc.id, ...data });
          }
        });
        deadlinesList.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
        setUpcomingDeadlines(deadlinesList.slice(0, 5));

        // 7. Attività Recenti
        const activityRef = collection(db, 'ai_activity_log');
        const qActivity = query(activityRef, orderBy('created_at', 'desc'), limit(5));
        const activitySnap = await getDocs(qActivity);
        const activitiesList: any[] = [];
        activitySnap.forEach(doc => {
          activitiesList.push({ id: doc.id, ...doc.data() });
        });
        setRecentActivities(activitiesList);

        // 8. Stato Subagenti AI
        const agentsRef = collection(db, 'ai_subagents');
        const agentsSnap = await getDocs(agentsRef);
        const agentsList: any[] = [];
        agentsSnap.forEach(doc => {
          agentsList.push({ id: doc.id, ...doc.data() });
        });
        setAiAgents(agentsList);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div>
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-2"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-64"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 h-32"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 lg:col-span-2 h-96"></div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 h-96"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Panoramica delle attività dello studio</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-slate-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Fatturato Mensile</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">€ {stats.monthlyRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-slate-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Clienti Attivi</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.activeClients}</p>
            </div>
            <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-slate-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pratiche in Lavorazione</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.activePractices}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
              <Kanban className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-slate-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pagamenti in Attesa</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">€ {stats.pendingPayments.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-slate-900/50 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Entrate Ultimi 6 Mesi</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#1e293b', color: '#f8fafc' }}
                  formatter={(value: number) => [`€ ${value.toLocaleString('it-IT')}`, 'Entrate']}
                />
                <Bar dataKey="entrate" fill="#0EA5E9" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Deadlines */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-slate-900/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Prossime Scadenze</h2>
          </div>
          <div className="space-y-4">
            {upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Nessuna scadenza imminente.</p>
            ) : (
              upcomingDeadlines.map((deadline) => (
                <div key={deadline.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    deadline.priority === 'alta' ? 'bg-red-500' : 
                    deadline.priority === 'media' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{deadline.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{deadline.client_name || 'Cliente'}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {deadline.due_date ? format(parseISO(deadline.due_date), 'dd MMM', { locale: it }) : ''}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-slate-900/50">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Attività Recenti AI</h2>
          <div className="space-y-4">
            {recentActivities.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Nessuna attività recente.</p>
            ) : (
              recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{activity.description}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {activity.created_at ? format(parseISO(activity.created_at), 'dd MMM HH:mm', { locale: it }) : ''}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AI Agents Status */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-slate-900/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Stato Subagenti AI</h2>
          </div>
          <div className="space-y-3">
            {aiAgents.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Nessun subagente configurato.</p>
            ) : (
              aiAgents.map((agent) => (
                <div key={agent.id} className="p-3 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${agent.status === 'active' ? 'bg-emerald-500' : agent.status === 'error' ? 'bg-red-500' : 'bg-amber-500'}`} />
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{agent.name}</span>
                    </div>
                    <span className={`text-xs font-medium ${agent.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' : agent.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {agent.status === 'active' ? 'Attivo' : agent.status === 'error' ? 'Errore' : 'In Pausa'}
                    </span>
                  </div>
                  {agent.config && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono ml-4 truncate">{`> ${agent.description || 'Nessuna descrizione'}`}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
