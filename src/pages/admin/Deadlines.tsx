import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, List, Plus, Search, Filter, 
  MoreVertical, Clock, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format, isSameDay, isBefore, startOfDay, differenceInDays, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, getDocs, orderBy } from 'firebase/firestore';
import { toast } from 'sonner';
import clsx from 'clsx';
import 'react-day-picker/dist/style.css';

interface Deadline {
  id: string;
  title: string;
  description?: string;
  client_id: string;
  client_name?: string;
  practice_id?: string;
  type: string;
  due_date: string;
  priority: string;
  status: string;
  is_recurring: boolean;
  recurring_frequency?: string;
  completed_at?: string;
}

interface Client {
  id: string;
  name: string;
}

export default function AdminDeadlines() {
  const [view, setView] = useState<'calendar' | 'list'>('list');
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [dayDeadlines, setDayDeadlines] = useState<Deadline[]>([]);

  // Filters
  const [filterType, setFilterType] = useState('all');
  const [filterClient, setFilterClient] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    client_id: '',
    practice_id: '',
    type: 'fiscale',
    due_date: format(new Date(), 'yyyy-MM-dd'),
    priority: 'media',
    is_recurring: false,
    recurring_frequency: 'mensile'
  });

  useEffect(() => {
    // Fetch clients for dropdowns
    const fetchClients = async () => {
      try {
        const clientsSnapshot = await getDocs(collection(db, 'users'));
        const clientsData = clientsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
          .filter(user => user.role === 'client')
          .map(client => ({ id: client.id, name: client.displayName || client.email }));
        setClients(clientsData);
      } catch (error) {
        console.error("Error fetching clients:", error);
      }
    };

    fetchClients();

    // Listen to deadlines
    const q = query(collection(db, 'deadlines'), orderBy('due_date', 'asc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const deadlinesData: Deadline[] = [];
      const today = startOfDay(new Date());
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Omit<Deadline, 'id'>;
        let status = data.status;
        
        // Auto-update status to 'scaduta' if overdue and not completed
        const dueDate = startOfDay(parseISO(data.due_date));
        if (isBefore(dueDate, today) && status !== 'completata' && status !== 'scaduta') {
          status = 'scaduta';
          // Update in firestore asynchronously
          updateDoc(doc(db, 'deadlines', docSnap.id), { status: 'scaduta' }).catch(console.error);
        }
        
        deadlinesData.push({ id: docSnap.id, ...data, status });
      });

      // Map client names
      const clientsSnap = await getDocs(collection(db, 'users'));
      const clientsMap = new Map();
      clientsSnap.docs.forEach(d => {
        const data = d.data();
        clientsMap.set(d.id, data.displayName || data.email);
      });

      const deadlinesWithClients = deadlinesData.map(d => ({
        ...d,
        client_name: clientsMap.get(d.client_id) || 'Cliente Sconosciuto'
      }));

      setDeadlines(deadlinesWithClients);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'deadlines');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.client_id || !formData.due_date) {
      toast.error('Compila i campi obbligatori');
      return;
    }

    try {
      await addDoc(collection(db, 'deadlines'), {
        ...formData,
        status: 'da_fare',
        created_at: new Date().toISOString()
      });
      toast.success('Scadenza creata con successo');
      setIsModalOpen(false);
      setFormData({
        title: '',
        description: '',
        client_id: '',
        practice_id: '',
        type: 'fiscale',
        due_date: format(new Date(), 'yyyy-MM-dd'),
        priority: 'media',
        is_recurring: false,
        recurring_frequency: 'mensile'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'deadlines');
      toast.error('Errore durante la creazione della scadenza');
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'completata') {
        updateData.completed_at = new Date().toISOString();
      }
      await updateDoc(doc(db, 'deadlines', id), updateData);
      toast.success('Stato aggiornato');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'deadlines');
      toast.error('Errore durante l\'aggiornamento');
    }
  };

  const handleDayClick = (day: Date) => {
    const dayDeads = deadlines.filter(d => isSameDay(parseISO(d.due_date), day));
    if (dayDeads.length > 0) {
      setDayDeadlines(dayDeads);
      setSelectedDate(day);
      setDayModalOpen(true);
    }
  };

  const filteredDeadlines = deadlines.filter(d => {
    if (filterType !== 'all' && d.type !== filterType) return false;
    if (filterClient !== 'all' && d.client_id !== filterClient) return false;
    if (filterStatus !== 'all' && d.status !== filterStatus) return false;
    if (filterPriority !== 'all' && d.priority !== filterPriority) return false;
    return true;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgente': return 'bg-red-100 text-red-800';
      case 'alta': return 'bg-orange-100 text-orange-800';
      case 'media': return 'bg-amber-100 text-amber-800';
      case 'bassa': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completata': return 'bg-emerald-100 text-emerald-800';
      case 'scaduta': return 'bg-red-100 text-red-800';
      case 'in_lavorazione': return 'bg-sky-100 text-sky-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getCountdownText = (dueDateStr: string, status: string) => {
    if (status === 'completata') return 'Completata';
    const dueDate = startOfDay(parseISO(dueDateStr));
    const today = startOfDay(new Date());
    const days = differenceInDays(dueDate, today);
    
    if (days < 0) return `SCADUTA da ${Math.abs(days)} giorni`;
    if (days === 0) return 'SCADE OGGI';
    if (days === 1) return 'Scade domani';
    return `Scade tra ${days} giorni`;
  };

  const getCountdownColor = (dueDateStr: string, status: string) => {
    if (status === 'completata') return 'text-emerald-600';
    const dueDate = startOfDay(parseISO(dueDateStr));
    const today = startOfDay(new Date());
    const days = differenceInDays(dueDate, today);
    
    if (days < 0) return 'text-red-600 font-bold';
    if (days <= 3) return 'text-orange-600 font-bold';
    if (days <= 7) return 'text-amber-600 font-medium';
    return 'text-slate-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Scadenze</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gestisci le scadenze dello studio e dei clienti</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex items-center">
            <button 
              onClick={() => setView('list')}
              className={clsx(
                "px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors",
                view === 'list' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              <List className="w-4 h-4" /> Lista
            </button>
            <button 
              onClick={() => setView('calendar')}
              className={clsx(
                "px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors",
                view === 'calendar' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              <CalendarIcon className="w-4 h-4" /> Calendario
            </button>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center px-4 py-2 bg-sky-500 text-white rounded-lg font-medium hover:bg-sky-600 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuova Scadenza
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <>
          {/* Filters */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tipo</label>
              <select 
                value={filterType} onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              >
                <option value="all">Tutti i tipi</option>
                <option value="fiscale">Fiscale</option>
                <option value="contributiva">Contributiva</option>
                <option value="documentale">Documentale</option>
                <option value="pagamento">Pagamento</option>
                <option value="sicurezza">Sicurezza</option>
                <option value="altro">Altro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Cliente</label>
              <select 
                value={filterClient} onChange={(e) => setFilterClient(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              >
                <option value="all">Tutti i clienti</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Stato</label>
              <select 
                value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              >
                <option value="all">Tutti gli stati</option>
                <option value="da_fare">Da Fare</option>
                <option value="in_lavorazione">In Lavorazione</option>
                <option value="completata">Completata</option>
                <option value="scaduta">Scaduta</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Priorità</label>
              <select 
                value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              >
                <option value="all">Tutte le priorità</option>
                <option value="urgente">Urgente</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="bassa">Bassa</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium">
                  <tr>
                    <th className="px-6 py-4">Titolo</th>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Data Scadenza</th>
                    <th className="px-6 py-4">Priorità</th>
                    <th className="px-6 py-4">Stato</th>
                    <th className="px-6 py-4 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500 mx-auto mb-2"></div>
                        Caricamento scadenze...
                      </td>
                    </tr>
                  ) : filteredDeadlines.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                        Nessuna scadenza trovata
                      </td>
                    </tr>
                  ) : (
                    filteredDeadlines.map((deadline) => (
                      <tr key={deadline.id} className={clsx("hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors", deadline.status === 'scaduta' && "bg-red-50/50 dark:bg-red-900/10")}>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900 dark:text-slate-100">{deadline.title}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 capitalize">{deadline.type}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                          {deadline.client_name}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-slate-900 dark:text-slate-100 font-medium">{format(parseISO(deadline.due_date), 'dd MMM yyyy', { locale: it })}</div>
                          <div className={clsx("text-xs mt-0.5", getCountdownColor(deadline.due_date, deadline.status))}>
                            {getCountdownText(deadline.due_date, deadline.status)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize", getPriorityColor(deadline.priority))}>
                            {deadline.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <select 
                            value={deadline.status}
                            onChange={(e) => handleUpdateStatus(deadline.id, e.target.value)}
                            className={clsx(
                              "text-xs font-medium rounded-full px-2.5 py-1 border-0 cursor-pointer focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white",
                              getStatusColor(deadline.status)
                            )}
                          >
                            <option value="da_fare">Da Fare</option>
                            <option value="in_lavorazione">In Lavorazione</option>
                            <option value="completata">Completata</option>
                            <option value="scaduta">Scaduta</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Calendar View */
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex justify-center">
          <DayPicker
            mode="single"
            locale={it}
            modifiers={{
              hasDeadline: (date) => deadlines.some(d => isSameDay(parseISO(d.due_date), date))
            }}
            modifiersStyles={{
              hasDeadline: { fontWeight: 'bold', textDecoration: 'underline' }
            }}
            onDayClick={handleDayClick}
            className="dark:text-slate-100"
            components={{
              Day: (props) => {
                const date = props.date;
                const dayDeads = deadlines.filter(d => isSameDay(parseISO(d.due_date), date));
                
                return (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <span>{date.getDate()}</span>
                    {dayDeads.length > 0 && (
                      <div className="absolute bottom-0 flex gap-0.5">
                        {dayDeads.slice(0, 3).map((d, i) => {
                          let color = 'bg-sky-500';
                          if (d.status === 'completata') color = 'bg-emerald-500';
                          else if (d.status === 'scaduta' || d.priority === 'urgente') color = 'bg-red-500';
                          else if (differenceInDays(parseISO(d.due_date), new Date()) <= 7) color = 'bg-amber-500';
                          
                          return <div key={i} className={clsx("w-1.5 h-1.5 rounded-full", color)} />
                        })}
                        {dayDeads.length > 3 && <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />}
                      </div>
                    )}
                  </div>
                );
              }
            }}
          />
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Nuova Scadenza</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateDeadline} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Titolo *</label>
                <input 
                  type="text" required
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="Es. F24 IVA Trimestrale"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cliente *</label>
                <select 
                  required
                  value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                >
                  <option value="">Seleziona cliente...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
                  <select 
                    value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  >
                    <option value="fiscale">Fiscale</option>
                    <option value="contributiva">Contributiva</option>
                    <option value="documentale">Documentale</option>
                    <option value="pagamento">Pagamento</option>
                    <option value="sicurezza">Sicurezza</option>
                    <option value="altro">Altro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data Scadenza *</label>
                  <input 
                    type="date" required
                    value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Priorità</label>
                <div className="flex gap-4">
                  {['bassa', 'media', 'alta', 'urgente'].map(p => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" name="priority" value={p}
                        checked={formData.priority === p}
                        onChange={e => setFormData({...formData, priority: e.target.value})}
                        className="text-sky-500 focus:ring-sky-500 dark:bg-slate-700 dark:border-slate-600"
                      />
                      <span className="text-sm capitalize dark:text-slate-300">{p}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.is_recurring}
                    onChange={e => setFormData({...formData, is_recurring: e.target.checked})}
                    className="rounded text-sky-500 focus:ring-sky-500 dark:bg-slate-700 dark:border-slate-600"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Scadenza Ricorrente</span>
                </label>
              </div>
              {formData.is_recurring && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Frequenza</label>
                  <select 
                    value={formData.recurring_frequency} onChange={e => setFormData({...formData, recurring_frequency: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  >
                    <option value="mensile">Mensile</option>
                    <option value="trimestrale">Trimestrale</option>
                    <option value="annuale">Annuale</option>
                  </select>
                </div>
              )}
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
                >
                  Annulla
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-sky-500 text-white rounded-lg font-medium hover:bg-sky-600 transition-colors"
                >
                  Salva Scadenza
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Day Modal */}
      {dayModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Scadenze del {format(selectedDate, 'dd MMMM yyyy', { locale: it })}
              </h2>
              <button onClick={() => setDayModalOpen(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {dayDeadlines.map(deadline => (
                <div key={deadline.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">{deadline.title}</h3>
                    <span className={clsx("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase", getPriorityColor(deadline.priority))}>
                      {deadline.priority}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{deadline.client_name}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 dark:text-slate-500 capitalize">{deadline.type}</span>
                    <span className={clsx("text-xs font-medium px-2 py-1 rounded-full", getStatusColor(deadline.status))}>
                      {deadline.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
