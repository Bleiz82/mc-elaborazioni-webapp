import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Video, 
  MapPin, 
  User, 
  Mail, 
  Phone,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MoreHorizontal
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  getDocs, 
  where 
} from 'firebase/firestore';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO
} from 'date-fns';
import { it } from 'date-fns/locale';
import { safeDate } from '../../lib/utils';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  contact_id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  date: string;
  time: string;
  duration_minutes: number;
  modality: 'online' | 'in_presenza';
  meet_link: string | null;
  status: 'pending' | 'confermato' | 'cancellato' | 'completato' | 'no_show';
  notes: string | null;
}

export default function Appointments() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedApp, setSelectedApp] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState({
    monthTotal: 0,
    today: 0,
    confirmed: 0,
    completed: 0
  });

  useEffect(() => {
    const q = query(collection(db, 'appointments'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      setAppointments(apps);
      setLoading(false);

      // Calculate stats
      const now = new Date();
      const todayStr = format(now, 'yyyy-MM-dd');
      const startMonth = startOfMonth(now);
      const endMonth = endOfMonth(now);

      const monthApps = apps.filter(a => {
        const d = parseISO(a.date);
        return d >= startMonth && d <= endMonth;
      });

      setStats({
        monthTotal: monthApps.length,
        today: apps.filter(a => a.date === todayStr).length,
        confirmed: apps.filter(a => a.status === 'confermato').length,
        completed: apps.filter(a => a.status === 'completato').length
      });
    });

    return () => unsubscribe();
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { locale: it });
  const endDate = endOfWeek(monthEnd, { locale: it });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const updateAppStatus = async (id: string, status: Appointment['status']) => {
    try {
      await updateDoc(doc(db, 'appointments', id), { status });
      toast.success(`Stato aggiornato a ${status}`);
    } catch (error) {
      toast.error('Errore durante l\'aggiornamento');
    }
  };

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50',
    confermato: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50',
    cancellato: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/50',
    completato: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800/50',
    no_show: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/50'
  };

  return (
    <div className="space-y-6">
      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIItem title="Totali Mese" value={stats.monthTotal} icon={<CalendarIcon className="w-5 h-5 text-sky-500" />} />
        <KPIItem title="Appuntamenti Oggi" value={stats.today} icon={<Clock className="w-5 h-5 text-amber-500" />} />
        <KPIItem title="Confermati" value={stats.confirmed} icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />} />
        <KPIItem title="Completati" value={stats.completed} icon={<AlertCircle className="w-5 h-5 text-slate-500" />} />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Calendar Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: it })}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Gestisci le prenotazioni dello studio</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
              Oggi
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
          {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
            <div key={day} className="py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-fr">
          {days.map((day, i) => {
            const dayApps = appointments.filter(a => a.date === format(day, 'yyyy-MM-dd'));
            return (
              <div 
                key={i} 
                className={`min-h-[120px] p-2 border-r border-b border-slate-100 dark:border-slate-700/50 last:border-r-0 ${
                  !isSameMonth(day, currentDate) ? 'bg-slate-50/50 dark:bg-slate-900/20' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${
                    isSameDay(day, new Date()) 
                      ? 'w-7 h-7 bg-sky-500 text-white rounded-full flex items-center justify-center' 
                      : 'text-slate-900 dark:text-slate-300'
                  }`}>
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="space-y-1">
                  {dayApps.map(app => (
                    <button
                      key={app.id}
                      onClick={() => setSelectedApp(app)}
                      className={`w-full text-left px-2 py-1 rounded text-[10px] font-medium truncate transition-transform hover:scale-[1.02] ${statusColors[app.status]}`}
                    >
                      {app.time} - {app.contact_name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-bold">Dettaglio Appuntamento</h3>
              <button onClick={() => setSelectedApp(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-transparent">
                <XCircle className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-sky-600 dark:text-sky-400" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-lg">{selectedApp.contact_name}</h4>
                  <div className="space-y-1 mt-1">
                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5" /> {selectedApp.contact_email}
                    </p>
                    {selectedApp.contact_phone && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5" /> {selectedApp.contact_phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data e Ora</label>
                  <p className="text-sm font-medium mt-0.5">{selectedApp.date} ore {selectedApp.time}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Modalità</label>
                  <p className="text-sm font-medium mt-0.5 flex items-center gap-1.5">
                    {selectedApp.modality === 'online' ? <><Video className="w-3.5 h-3.5 text-sky-500" /> Online</> : <><MapPin className="w-3.5 h-3.5 text-rose-500" /> In Studio</>}
                  </p>
                </div>
              </div>

              {selectedApp.modality === 'online' && selectedApp.meet_link && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Link Videochiamata</label>
                  <a href={selectedApp.meet_link} target="_blank" rel="noreferrer" className="block mt-1 text-sm text-sky-500 hover:underline break-all">
                    {selectedApp.meet_link}
                  </a>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stato Appuntamento</label>
                <select 
                  className="w-full mt-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm"
                  value={selectedApp.status}
                  onChange={(e) => updateAppStatus(selectedApp.id, e.target.value as any)}
                >
                  <option value="pending">In attesa (Pending)</option>
                  <option value="confermato">Confermato</option>
                  <option value="cancellato">Cancellato</option>
                  <option value="completato">Completato</option>
                  <option value="no_show">No Show</option>
                </select>
              </div>

              {selectedApp.notes && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Note</label>
                  <p className="text-sm mt-1 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 p-3 rounded-lg border border-slate-100 dark:border-slate-600">{selectedApp.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KPIItem({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
      <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}
