import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import { Kanban, Clock, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { safeDate } from '../../lib/utils';


export default function ClientPractices() {
  const { user } = useAuth();
  const [practices, setPractices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'practices'),
      where('client_id', '==', user.uid),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setPractices(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching practices:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'nuova': return 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400';
      case 'in_lavorazione': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'in_attesa_cliente': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'in_revisione': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'completata': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'annullata': return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'nuova': return 'Nuova';
      case 'in_lavorazione': return 'In Lavorazione';
      case 'in_attesa_cliente': return 'In Attesa (Tua Azione)';
      case 'in_revisione': return 'In Revisione';
      case 'completata': return 'Completata';
      case 'annullata': return 'Annullata';
      default: return status;
    }
  };

  const renderTimeline = (status: string) => {
    const steps = [
      { id: 'nuova', label: 'Nuova' },
      { id: 'in_lavorazione', label: 'In Lavorazione' },
      { id: 'in_attesa_cliente', label: 'In Attesa' },
      { id: 'completata', label: 'Completata' }
    ];

    let currentIndex = 0;
    if (status === 'in_lavorazione') currentIndex = 1;
    if (status === 'in_attesa_cliente' || status === 'in_revisione') currentIndex = 2;
    if (status === 'completata') currentIndex = 3;
    if (status === 'annullata') return null;

    return (
      <div className="flex items-center w-full mt-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center relative">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 ${
                index <= currentIndex 
                  ? 'bg-indigo-600 dark:bg-indigo-500 text-white' 
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
              }`}>
                {index < currentIndex ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs">{index + 1}</span>}
              </div>
              <span className={`text-[10px] sm:text-xs mt-1 absolute top-6 w-20 text-center ${
                index <= currentIndex ? 'text-slate-900 dark:text-slate-100 font-medium' : 'text-slate-500 dark:text-slate-400'
              }`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-1 mx-2 rounded ${
                index < currentIndex ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'
              }`} />
            )}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-2"></div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Le Mie Pratiche</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Monitora lo stato di avanzamento delle tue pratiche</p>
      </div>

      {practices.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Kanban className="w-8 h-8 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">Nessuna pratica attiva</h3>
          <p className="text-slate-500 dark:text-slate-400">Non ci sono pratiche in corso al momento.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {practices.map((practice) => (
            <div key={practice.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm dark:shadow-slate-900/50">
              <div 
                className="p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                onClick={() => setExpandedId(expandedId === practice.id ? null : practice.id)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{practice.title}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(practice.status)}`}>
                        {getStatusLabel(practice.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {practice.created_at ? format(safeDate(practice.created_at), 'dd MMM yyyy', { locale: it }) : 'N/A'}
                      </span>
                      {practice.type && (
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs font-medium">
                          {practice.type}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-end">
                    {expandedId === practice.id ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Timeline */}
                <div className="mt-6 mb-4 pb-4">
                  {renderTimeline(practice.status)}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === practice.id && (
                <div className="p-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">Dettagli Pratica</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                        {practice.description || 'Nessuna descrizione disponibile.'}
                      </p>
                    </div>
                    
                    {practice.status === 'in_attesa_cliente' && (
                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-medium text-amber-900 dark:text-amber-400">Azione Richiesta</h4>
                            <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">
                              Lo studio è in attesa di un tuo riscontro o di documenti aggiuntivi per poter procedere. Controlla i messaggi o i documenti richiesti.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
