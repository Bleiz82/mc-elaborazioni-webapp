import { useState, useEffect } from 'react';
import { 
  Upload, CreditCard, CalendarClock, MessageSquare, 
  ChevronRight, FileText, User
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { Link } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { format, parseISO, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';

export default function ClientHome() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    deadlines: 0,
    toPay: 0,
    messages: 0
  });
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);
  const [recentMessages, setRecentMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    // Fetch Deadlines
    const deadlinesQuery = query(
      collection(db, 'deadlines'),
      where('client_id', '==', user.uid),
      where('status', '!=', 'completata'),
      orderBy('status'),
      orderBy('due_date', 'asc'),
      limit(3)
    );

    const unsubscribeDeadlines = onSnapshot(deadlinesQuery, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        daysLeft: differenceInDays(parseISO(doc.data().due_date), new Date())
      }));
      setUpcomingDeadlines(docs);
      setStats(prev => ({ ...prev, deadlines: snapshot.size }));
    });

    // Fetch Messages (from all conversations of this client)
    // Note: In a real app we might want to fetch from a specific conversation or the latest ones
    const messagesQuery = query(
      collection(db, 'messages'),
      where('client_id', '==', user.uid), // Assuming messages have client_id for easy filtering
      orderBy('created_at', 'desc'),
      limit(3)
    );

    // Alternative: if messages don't have client_id, we'd need to fetch conversations first.
    // But for simplicity and following the rule "Filtra SEMPRE per where('clientId', '==', user.uid)"
    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecentMessages(docs);
      setStats(prev => ({ ...prev, messages: snapshot.size }));
    });

    // Fetch Invoices (to pay)
    const invoicesQuery = query(
      collection(db, 'invoices'),
      where('client_id', '==', user.uid),
      where('status', 'in', ['da_pagare', 'scaduta'])
    );

    const unsubscribeInvoices = onSnapshot(invoicesQuery, (snapshot) => {
      setStats(prev => ({ ...prev, toPay: snapshot.size }));
    });

    setLoading(false);

    return () => {
      unsubscribeDeadlines();
      unsubscribeMessages();
      unsubscribeInvoices();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Summary Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg">
        <h2 className="text-slate-300 text-sm font-medium mb-4">La tua situazione</h2>
        <div className="grid grid-cols-3 gap-4 divide-x divide-slate-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{stats.deadlines}</p>
            <p className="text-xs text-slate-400 mt-1">Scadenze</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${stats.toPay > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {stats.toPay}
            </p>
            <p className="text-xs text-slate-400 mt-1">Da pagare</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{stats.messages}</p>
            <p className="text-xs text-slate-400 mt-1">Messaggi</p>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Link to="/client/documents" className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center gap-3 hover:border-sky-200 dark:hover:border-sky-700 transition-colors active:scale-95">
          <div className="w-12 h-12 bg-sky-50 dark:bg-sky-900/30 rounded-full flex items-center justify-center">
            <Upload className="w-6 h-6 text-sky-600 dark:text-sky-400" />
          </div>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 text-center">Carica<br/>Documento</span>
        </Link>
        
        <Link to="/client/payments" className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center gap-3 hover:border-sky-200 dark:hover:border-sky-700 transition-colors active:scale-95">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 text-center">Paga<br/>Parcella</span>
        </Link>
        
        <Link to="/client/deadlines" className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center gap-3 hover:border-sky-200 dark:hover:border-sky-700 transition-colors active:scale-95">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
            <CalendarClock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 text-center">Le Mie<br/>Scadenze</span>
        </Link>
        
        <Link to="/client/chat" className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center gap-3 hover:border-sky-200 dark:hover:border-sky-700 transition-colors active:scale-95">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 text-center">Chatta con<br/>lo Studio</span>
        </Link>
      </div>

      {/* Upcoming Deadlines */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Prossime Scadenze</h3>
          <Link to="/client/deadlines" className="text-xs text-sky-600 dark:text-sky-400 font-medium flex items-center">
            Vedi tutte <ChevronRight className="w-3 h-3 ml-0.5" />
          </Link>
        </div>
        <div className="space-y-3">
          {upcomingDeadlines.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
              <p className="text-xs text-slate-500">Nessuna scadenza imminente</p>
            </div>
          ) : (
            upcomingDeadlines.map(deadline => (
              <div key={deadline.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <CalendarClock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{deadline.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {format(parseISO(deadline.due_date), 'dd MMM', { locale: it })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                    deadline.daysLeft <= 3 ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                  }`}>
                    {deadline.daysLeft < 0 ? 'Scaduta' : deadline.daysLeft === 0 ? 'Oggi' : `-${deadline.daysLeft} gg`}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Communications */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Ultime Comunicazioni</h3>
          <Link to="/client/chat" className="text-xs text-sky-600 dark:text-sky-400 font-medium flex items-center">
            Vai alla chat <ChevronRight className="w-3 h-3 ml-0.5" />
          </Link>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
          {recentMessages.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs text-slate-500">Nessun messaggio recente</p>
            </div>
          ) : (
            recentMessages.map(msg => (
              <div key={msg.id} className="p-4 flex gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {msg.sender_id === user?.uid ? 'Tu' : 'Studio'}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {format(parseISO(msg.created_at), 'HH:mm')}
                    </p>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{msg.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
