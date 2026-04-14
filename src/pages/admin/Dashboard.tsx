import { useState, useEffect } from 'react';
import { 
  TrendingUp, Users, Kanban, CreditCard, 
  Clock, Bot, Calendar, MessageSquare, 
  ArrowUpRight, Target, Zap
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { startOfMonth, endOfMonth, subMonths, format, parseISO, isToday } from 'date-fns';
import { it } from 'date-fns/locale';
import { safeDate } from '../../lib/utils';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    monthlyRevenue: 0,
    activeClients: 0,
    activePractices: 0,
    pendingPayments: 0,
    aiLeads: 0,
    todayAppointments: 0,
    aiMessages: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const now = new Date();
        const startOfCurrentMonth = startOfMonth(now).toISOString();
        const endOfCurrentMonth = endOfMonth(now).toISOString();
        const todayStr = format(now, 'yyyy-MM-dd');

        // 1. Fatturato & Clienti (Existing logic)
        const invoicesRef = collection(db, 'invoices');
        const qPaid = query(invoicesRef, where('status', '==', 'pagata'));
        const paidSnap = await getDocs(qPaid);
        let monthlyRevenue = 0;
        paidSnap.forEach(doc => {
          const data = doc.data();
          if (data.paid_at && data.paid_at >= startOfCurrentMonth && data.paid_at <= endOfCurrentMonth) {
            monthlyRevenue += data.total_amount || 0;
          }
        });

        const clientsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'client'), where('status', '==', 'active')));
        const practicesSnap = await getDocs(query(collection(db, 'practices'), where('status', 'in', ['nuova', 'in_lavorazione', 'in_attesa_cliente', 'in_revisione'])));
        
        // 2. NEW AI STATS v2.0
        const contactsSnap = await getDocs(collection(db, 'contacts'));
        const appointmentsSnap = await getDocs(query(collection(db, 'appointments'), where('date', '==', todayStr)));
        const aiMessagesSnap = await getDocs(query(collection(db, 'messages'), where('is_automated', '==', true)));

        setStats({
          monthlyRevenue,
          activeClients: clientsSnap.size,
          activePractices: practicesSnap.size,
          pendingPayments: 0, // Simplified
          aiLeads: contactsSnap.size,
          todayAppointments: appointmentsSnap.size,
          aiMessages: aiMessagesSnap.size
        });

        // 3. Chart Data
        const sixMonthsAgo = subMonths(startOfMonth(now), 5);
        const chartMap = new Map();
        for (let i = 5; i >= 0; i--) {
          const d = subMonths(now, i);
          chartMap.set(format(d, 'MMM', { locale: it }), 0);
        }
        paidSnap.forEach(doc => {
          const data = doc.data();
          if (data.paid_at) {
            const paidDate = safeDate(data.paid_at);
            if (paidDate >= sixMonthsAgo) {
              const monthKey = format(paidDate, 'MMM', { locale: it });
              if (chartMap.has(monthKey)) {
                chartMap.set(monthKey, chartMap.get(monthKey) + (data.total_amount || 0));
              }
            }
          }
        });
        setChartData(Array.from(chartMap.entries()).map(([name, entrate]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          entrate
        })));

        // 4. Deadlines & Activity
        const deadlinesSnap = await getDocs(collection(db, 'deadlines'));
        const deadlinesList: any[] = [];
        deadlinesSnap.forEach(doc => {
          const data = doc.data();
          if (data.status !== 'completata') deadlinesList.push({ id: doc.id, ...data });
        });
        setUpcomingDeadlines(deadlinesList.sort((a,b)=>safeDate(a.due_date).getTime()-safeDate(b.due_date).getTime()).slice(0, 5));

        const activitySnap = await getDocs(query(collection(db, 'ai_activity_log'), orderBy('created_at', 'desc'), limit(5)));
        setRecentActivities(activitySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      } catch (error) {
        console.error('Dashboard error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="p-8 text-center">Caricamento dashboard...</div>;

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Bentornato, Studio M&C</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Ecco cosa sta succedendo oggi nei tuoi sistemi AI e gestionali.</p>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPIBox 
          title="Fatturato Mese" 
          value={`€ ${stats.monthlyRevenue.toLocaleString('it-IT')}`} 
          trend="+12%" 
          icon={<TrendingUp className="w-6 h-6 text-emerald-500" />}
          color="emerald"
        />
        <KPIBox 
          title="Leads IA Totali" 
          value={stats.aiLeads} 
          trend="Nuovi" 
          icon={<Target className="w-6 h-6 text-sky-500" />}
          color="sky"
        />
        <KPIBox 
          title="Appuntamenti Oggi" 
          value={stats.todayAppointments} 
          trend="In agenda" 
          icon={<Calendar className="w-6 h-6 text-amber-500" />}
          color="amber"
        />
        <KPIBox 
          title="Interazioni IA" 
          value={stats.aiMessages} 
          trend="Automate" 
          icon={<Zap className="w-6 h-6 text-indigo-500" />}
          color="indigo"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Performance Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold">Andamento Entrate</h2>
              <select className="bg-slate-50 dark:bg-slate-900 border-none rounded-lg text-xs font-bold px-3 py-2 outline-none">
                <option>6 Ultimi Mesi</option>
              </select>
            </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorEntrate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <Tooltip />
                <Area type="monotone" dataKey="entrate" stroke="#0EA5E9" strokeWidth={3} fillOpacity={1} fill="url(#colorEntrate)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sidebar Cards */}
        <div className="space-y-8">
          {/* Quick Actions / Status */}
          <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl shadow-sky-500/10 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-32 h-32 bg-sky-500/20 rounded-full blur-3xl group-hover:bg-sky-500/30 transition-all duration-500" />
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Bot className="w-5 h-5 text-sky-400" /> Stato Orchestratore
            </h3>
            <p className="text-slate-400 text-xs mb-6 leading-relaxed">Il sistema multi-agente sta monitorando attivamente chatbot e agenda.</p>
            <div className="flex items-center gap-2 mb-8">
              <div className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Attivo & Reattivo</span>
            </div>
            <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-all border border-white/10">
              Gestisci Agenti
            </button>
          </div>

          {/* Mini Deadlines */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
            <h2 className="text-lg font-bold mb-6">Prossime Scadenze</h2>
            <div className="space-y-4">
              {upcomingDeadlines.map((d, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${d.priority === 'alta' ? 'bg-rose-500' : 'bg-sky-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{d.title}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">{format(safeDate(d.due_date), 'dd MMMM', {locale: it})}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPIBox({ title, value, trend, icon, color }: any) {
  const colors: any = {
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20',
    sky: 'bg-sky-50 text-sky-600 dark:bg-sky-900/20',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20'
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
      <div className={`${colors[color]} w-12 h-12 rounded-2xl flex items-center justify-center mb-6`}>
        {icon}
      </div>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <h3 className="text-3xl font-black text-slate-900 dark:text-white">{value}</h3>
        <span className="text-[10px] font-bold text-emerald-500 uppercase">{trend}</span>
      </div>
    </div>
  );
}
