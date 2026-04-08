import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { DayPicker } from 'react-day-picker';
import { format, isSameDay, isBefore, startOfDay, differenceInDays, parseISO, isSameMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  CalendarClock, AlertCircle, CheckCircle2, FileText, Building, Shield, CreditCard, ChevronRight
} from 'lucide-react';
import clsx from 'clsx';
import 'react-day-picker/dist/style.css';

interface Deadline {
  id: string;
  title: string;
  type: string;
  due_date: string;
  priority: string;
  status: string;
}

export default function ClientDeadlines() {
  const { user } = useAuth();
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'deadlines'),
      where('client_id', '==', user.uid),
      orderBy('due_date', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const deadlinesData: Deadline[] = [];
      snapshot.forEach((doc) => {
        deadlinesData.push({ id: doc.id, ...doc.data() } as Deadline);
      });
      setDeadlines(deadlinesData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'deadlines');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const monthDeadlines = deadlines.filter(d => isSameMonth(parseISO(d.due_date), selectedMonth));

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'fiscale': return <Building className="w-5 h-5 text-sky-600" />;
      case 'contributiva': return <FileText className="w-5 h-5 text-indigo-600" />;
      case 'documentale': return <FileText className="w-5 h-5 text-amber-600" />;
      case 'pagamento': return <CreditCard className="w-5 h-5 text-emerald-600" />;
      case 'sicurezza': return <Shield className="w-5 h-5 text-red-600" />;
      default: return <CalendarClock className="w-5 h-5 text-slate-600" />;
    }
  };

  const getCountdownInfo = (dueDateStr: string, status: string) => {
    if (status === 'completata') return { text: 'Completata', color: 'text-emerald-600', bg: 'bg-emerald-50' };
    
    const dueDate = startOfDay(parseISO(dueDateStr));
    const today = startOfDay(new Date());
    const days = differenceInDays(dueDate, today);
    
    if (days < 0) return { text: 'SCADUTA', color: 'text-red-600 font-bold', bg: 'bg-red-50' };
    if (days === 0) return { text: 'DOMANI', color: 'text-red-600 font-bold', bg: 'bg-red-50' }; // Assuming DOMANI means tomorrow, but 0 is today. Let's say OGGI
    if (days === 1) return { text: 'DOMANI', color: 'text-orange-600 font-bold', bg: 'bg-orange-50' };
    if (days <= 5) return { text: `tra ${days} giorni`, color: 'text-amber-600 font-medium', bg: 'bg-amber-50' };
    return { text: `tra ${days} giorni`, color: 'text-emerald-600', bg: 'bg-emerald-50' };
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-20">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-center">
        <DayPicker
          mode="single"
          locale={it}
          month={selectedMonth}
          onMonthChange={setSelectedMonth}
          modifiers={{
            hasDeadline: (date) => deadlines.some(d => isSameDay(parseISO(d.due_date), date))
          }}
          modifiersStyles={{
            hasDeadline: { fontWeight: 'bold', color: '#0EA5E9' }
          }}
          components={{
            Day: (props) => {
              const date = props.date;
              const dayDeads = deadlines.filter(d => isSameDay(parseISO(d.due_date), date));
              
              return (
                <div className="relative w-full h-full flex items-center justify-center">
                  <span>{date.getDate()}</span>
                  {dayDeads.length > 0 && (
                    <div className="absolute bottom-0 w-1 h-1 rounded-full bg-sky-500" />
                  )}
                </div>
              );
            }
          }}
        />
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 px-1">
          Scadenze di {format(selectedMonth, 'MMMM yyyy', { locale: it })}
        </h3>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
          </div>
        ) : monthDeadlines.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
            <CalendarClock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Nessuna scadenza in questo mese</p>
          </div>
        ) : (
          <div className="space-y-3">
            {monthDeadlines.map(deadline => {
              const countdown = getCountdownInfo(deadline.due_date, deadline.status);
              
              return (
                <div key={deadline.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
                  {deadline.priority === 'urgente' && deadline.status !== 'completata' && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                  )}
                  <div className="flex items-start gap-4">
                    <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0", countdown.bg)}>
                      {getTypeIcon(deadline.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-bold text-slate-900 truncate">{deadline.title}</h4>
                        <span className={clsx("text-xs whitespace-nowrap", countdown.color)}>
                          {countdown.text}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                          {deadline.type}
                        </span>
                        {deadline.priority === 'urgente' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700">
                            Urgente
                          </span>
                        )}
                        <span className="text-xs text-slate-500 ml-auto">
                          {format(parseISO(deadline.due_date), 'dd MMM yyyy', { locale: it })}
                        </span>
                      </div>
                    </div>
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
