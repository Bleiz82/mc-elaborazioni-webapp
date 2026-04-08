import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ChevronRight, User, Mail, Phone, Building, Archive, Edit, 
  FileText, Briefcase, Calendar, CreditCard, MessageSquare, 
  StickyNote, Bot, Upload, Plus, Download, CheckCircle2, X
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc, orderBy } from 'firebase/firestore';
import { format, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

// Reusing the chat component logic for the Communications tab
import ClientChatView from './components/ClientChatView';

export default function ClientDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('anagrafica');
  
  // Data states for tabs
  const [documents, setDocuments] = useState<any[]>([]);
  const [practices, setPractices] = useState<any[]>([]);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [aiLogs, setAiLogs] = useState<any[]>([]);
  
  const notesTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!id) return;

    // Fetch Client Data
    const fetchClient = async () => {
      try {
        const docRef = doc(db, 'users', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setClient({ id: docSnap.id, ...data });
          setNotes(data.admin_notes || '');
        }
        setLoading(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${id}`);
        setLoading(false);
      }
    };

    fetchClient();

    // Listeners for related data
    const unsubDocs = onSnapshot(query(collection(db, 'documents'), where('clientId', '==', id), orderBy('createdAt', 'desc')), (snap) => {
      setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    const unsubPractices = onSnapshot(query(collection(db, 'practices'), where('client_id', '==', id)), (snap) => {
      setPractices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    const unsubDeadlines = onSnapshot(query(collection(db, 'deadlines'), where('client_id', '==', id), orderBy('due_date', 'asc')), (snap) => {
      setDeadlines(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    const unsubInvoices = onSnapshot(query(collection(db, 'invoices'), where('client_id', '==', id), orderBy('due_date', 'desc')), (snap) => {
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Mock AI Logs for now
    setAiLogs([
      { id: '1', agent: 'Agente Scadenze', action: 'Inviato promemoria F24', timestamp: new Date(Date.now() - 3600000).toISOString() },
      { id: '2', agent: 'Agente Documenti', action: 'Classificato documento "Visura Camerale"', timestamp: new Date(Date.now() - 86400000).toISOString() },
    ]);

    return () => {
      unsubDocs();
      unsubPractices();
      unsubDeadlines();
      unsubInvoices();
    };
  }, [id]);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNotes = e.target.value;
    setNotes(newNotes);

    if (notesTimeoutRef.current) {
      clearTimeout(notesTimeoutRef.current);
    }

    notesTimeoutRef.current = setTimeout(async () => {
      if (id) {
        try {
          await updateDoc(doc(db, 'users', id), { admin_notes: newNotes });
          toast.success('Note salvate');
        } catch (error) {
          toast.error('Errore nel salvataggio delle note');
        }
      }
    }, 1000);
  };

  const handleDocStatusChange = async (docId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'documents', docId), { status: newStatus });
      toast.success('Stato documento aggiornato');
    } catch (error) {
      toast.error('Errore aggiornamento stato');
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div></div>;
  }

  if (!client) {
    return <div className="p-8 text-center text-slate-500">Cliente non trovato</div>;
  }

  const tabs = [
    { id: 'anagrafica', label: 'Anagrafica', icon: User },
    { id: 'documenti', label: 'Documenti', icon: FileText, count: documents.length },
    { id: 'pratiche', label: 'Pratiche', icon: Briefcase, count: practices.length },
    { id: 'scadenze', label: 'Scadenze', icon: Calendar, count: deadlines.length },
    { id: 'pagamenti', label: 'Pagamenti', icon: CreditCard, count: invoices.length },
    { id: 'comunicazioni', label: 'Comunicazioni', icon: MessageSquare },
    { id: 'note', label: 'Note', icon: StickyNote },
    { id: 'ai', label: 'Log AI', icon: Bot },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-slate-500">
        <Link to="/admin/clients" className="hover:text-sky-600 transition-colors">Clienti</Link>
        <ChevronRight className="w-4 h-4 mx-2" />
        <span className="text-slate-900 font-medium">{client.full_name}</span>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center text-2xl font-bold uppercase shadow-sm">
              {client.full_name.substring(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-slate-900">{client.full_name}</h1>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                  {client.client_type === 'azienda' ? 'Azienda' : 'Privato'}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                  Attivo
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                {client.vat_number && (
                  <div className="flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-slate-400" />
                    P.IVA: {client.vat_number}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-slate-400" />
                  {client.email}
                </div>
                {client.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {client.phone}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2">
              <Archive className="w-4 h-4" /> Archivia
            </button>
            <button className="px-4 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 transition-colors flex items-center gap-2 shadow-sm">
              <Edit className="w-4 h-4" /> Modifica
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto hide-scrollbar border-b border-slate-200">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id 
                  ? 'border-sky-500 text-sky-600 bg-sky-50/50' 
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-sky-500' : 'text-slate-400'}`} />
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content Area */}
        <div className="p-6 bg-slate-50/30 min-h-[400px]">
          
          {/* ANAGRAFICA TAB */}
          {activeTab === 'anagrafica' && (
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Dettagli Anagrafici</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Nome Completo / Ragione Sociale</label>
                    <p className="text-slate-900 font-medium">{client.full_name}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Email</label>
                    <p className="text-slate-900 font-medium">{client.email}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Telefono</label>
                    <p className="text-slate-900 font-medium">{client.phone || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Codice Fiscale</label>
                    <p className="text-slate-900 font-medium">{client.fiscal_code || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Partita IVA</label>
                    <p className="text-slate-900 font-medium">{client.vat_number || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Indirizzo</label>
                    <p className="text-slate-900 font-medium">{client.address || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Città</label>
                    <p className="text-slate-900 font-medium">{client.city || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">CAP</label>
                    <p className="text-slate-900 font-medium">{client.zip_code || '-'}</p>
                  </div>
                </div>
              </div>
              
              <div className="w-full lg:w-80 space-y-4">
                {/* Mini Cards */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-sky-500" /> Situazione Pagamenti
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Da incassare</span>
                      <span className="font-semibold text-amber-600">€ 1.250,00</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-amber-500 h-2 rounded-full" style={{ width: '30%' }}></div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-red-500" /> Prossime Scadenze
                  </h4>
                  {deadlines.slice(0,3).length > 0 ? (
                    <div className="space-y-3">
                      {deadlines.slice(0,3).map(d => (
                        <div key={d.id} className="flex justify-between items-center text-sm">
                          <span className="text-slate-700 truncate pr-2">{d.title}</span>
                          <span className="text-slate-500 font-medium whitespace-nowrap">
                            {format(new Date(d.due_date), 'dd/MM/yy')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Nessuna scadenza imminente</p>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-indigo-500" /> Pratiche Attive
                  </h4>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold text-slate-900">{practices.length}</span>
                    <button onClick={() => setActiveTab('pratiche')} className="text-sm text-sky-600 font-medium hover:underline">
                      Vedi tutte
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DOCUMENTI TAB */}
          {activeTab === 'documenti' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-900">Documenti Cliente</h3>
                <button className="px-4 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 transition-colors flex items-center gap-2 shadow-sm">
                  <Upload className="w-4 h-4" /> Carica Documento
                </button>
              </div>
              
              {documents.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Nessun documento presente</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                      <tr>
                        <th className="px-6 py-3 font-medium">Nome File</th>
                        <th className="px-6 py-3 font-medium">Data</th>
                        <th className="px-6 py-3 font-medium">Stato</th>
                        <th className="px-6 py-3 font-medium text-right">Azioni</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {documents.map(doc => (
                        <tr key={doc.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-medium text-slate-900">{doc.fileName}</td>
                          <td className="px-6 py-4 text-slate-500">{format(new Date(doc.createdAt), 'dd MMM yyyy', { locale: it })}</td>
                          <td className="px-6 py-4">
                            <select 
                              value={doc.status}
                              onChange={(e) => handleDocStatusChange(doc.id, e.target.value)}
                              className={`text-xs font-semibold rounded-full px-2.5 py-1 border-0 cursor-pointer focus:ring-2 focus:ring-sky-500 ${
                                doc.status === 'caricato' ? 'bg-slate-100 text-slate-700' :
                                doc.status === 'in_revisione' ? 'bg-amber-100 text-amber-700' :
                                doc.status === 'approvato' ? 'bg-emerald-100 text-emerald-700' :
                                'bg-red-100 text-red-700'
                              }`}
                            >
                              <option value="caricato">Caricato</option>
                              <option value="in_revisione">In Revisione</option>
                              <option value="approvato">Approvato</option>
                              <option value="da_rifare">Da Rifare</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-800 p-2">
                              <Download className="w-4 h-4 inline" />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* NOTE TAB */}
          {activeTab === 'note' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">Note Interne</h3>
                <span className="text-xs text-slate-400">Salvataggio automatico</span>
              </div>
              <textarea
                value={notes}
                onChange={handleNotesChange}
                placeholder="Inserisci note o appunti su questo cliente. Visibili solo allo studio."
                className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-colors resize-none"
              />
            </div>
          )}

          {/* COMUNICAZIONI TAB */}
          {activeTab === 'comunicazioni' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-[600px]">
              <ClientChatView clientId={id} clientName={client.full_name} clientAvatar={client.avatar_url} />
            </div>
          )}

          {/* SCADENZE TAB */}
          {activeTab === 'scadenze' && (
             <div className="space-y-4">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-bold text-slate-900">Scadenze</h3>
                 <button className="px-4 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 transition-colors flex items-center gap-2 shadow-sm">
                   <Plus className="w-4 h-4" /> Nuova Scadenza
                 </button>
               </div>
               {deadlines.length === 0 ? (
                 <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
                   <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                   <p className="text-slate-500">Nessuna scadenza presente</p>
                 </div>
               ) : (
                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                   <table className="w-full text-left text-sm">
                     <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                       <tr>
                         <th className="px-6 py-3 font-medium">Titolo</th>
                         <th className="px-6 py-3 font-medium">Data Scadenza</th>
                         <th className="px-6 py-3 font-medium">Stato</th>
                         <th className="px-6 py-3 font-medium text-right">Azioni</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {deadlines.map(deadline => {
                         const daysLeft = differenceInDays(new Date(deadline.due_date), new Date());
                         const isUrgent = daysLeft >= 0 && daysLeft <= 7;
                         const isOverdue = daysLeft < 0;
                         
                         return (
                           <tr key={deadline.id} className="hover:bg-slate-50">
                             <td className="px-6 py-4 font-medium text-slate-900">
                               {deadline.title}
                               {isUrgent && <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase">Urgente</span>}
                               {isOverdue && <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">Scaduta</span>}
                             </td>
                             <td className="px-6 py-4 text-slate-500">{format(new Date(deadline.due_date), 'dd MMM yyyy', { locale: it })}</td>
                             <td className="px-6 py-4">
                               <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                 deadline.status === 'completata' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                               }`}>
                                 {deadline.status === 'completata' ? 'Completata' : 'In Sospeso'}
                               </span>
                             </td>
                             <td className="px-6 py-4 text-right">
                               <button className="text-sky-600 hover:text-sky-800 font-medium text-sm">Modifica</button>
                             </td>
                           </tr>
                         );
                       })}
                     </tbody>
                   </table>
                 </div>
               )}
             </div>
          )}

          {/* PAGAMENTI TAB */}
          {activeTab === 'pagamenti' && (
             <div className="space-y-4">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-bold text-slate-900">Parcelle e Pagamenti</h3>
                 <button className="px-4 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 transition-colors flex items-center gap-2 shadow-sm">
                   <Plus className="w-4 h-4" /> Crea Parcella
                 </button>
               </div>
               
               {/* Form Creazione Parcella (Mock UI) */}
               <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
                 <h4 className="text-sm font-bold text-slate-900 mb-3">Nuova Parcella Rapida</h4>
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                   <input type="text" placeholder="Descrizione" className="col-span-2 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none" />
                   <input type="number" placeholder="Importo €" className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none" />
                   <button className="bg-slate-800 text-white rounded-lg font-medium text-sm hover:bg-slate-900 transition-colors">Emetti</button>
                 </div>
               </div>

               {invoices.length === 0 ? (
                 <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
                   <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                   <p className="text-slate-500">Nessuna parcella presente</p>
                 </div>
               ) : (
                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                   <table className="w-full text-left text-sm">
                     <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                       <tr>
                         <th className="px-6 py-3 font-medium">Numero</th>
                         <th className="px-6 py-3 font-medium">Descrizione</th>
                         <th className="px-6 py-3 font-medium">Scadenza</th>
                         <th className="px-6 py-3 font-medium">Importo</th>
                         <th className="px-6 py-3 font-medium">Stato</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {invoices.map(invoice => (
                         <tr key={invoice.id} className="hover:bg-slate-50">
                           <td className="px-6 py-4 font-medium text-slate-900">#{invoice.invoice_number}</td>
                           <td className="px-6 py-4 text-slate-600">{invoice.description}</td>
                           <td className="px-6 py-4 text-slate-500">{format(new Date(invoice.due_date), 'dd MMM yyyy', { locale: it })}</td>
                           <td className="px-6 py-4 font-medium text-slate-900">€ {invoice.total_amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                           <td className="px-6 py-4">
                             <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                               invoice.status === 'pagata' ? 'bg-emerald-100 text-emerald-700' :
                               invoice.status === 'in_elaborazione' ? 'bg-blue-100 text-blue-700' :
                               invoice.status === 'scaduta' ? 'bg-red-100 text-red-700' :
                               'bg-amber-100 text-amber-700'
                             }`}>
                               {invoice.status.replace('_', ' ')}
                             </span>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               )}
             </div>
          )}

          {/* PRATICHE TAB */}
          {activeTab === 'pratiche' && (
             <div className="space-y-4">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-bold text-slate-900">Pratiche</h3>
                 <button className="px-4 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 transition-colors flex items-center gap-2 shadow-sm">
                   <Plus className="w-4 h-4" /> Nuova Pratica
                 </button>
               </div>
               {practices.length === 0 ? (
                 <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
                   <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                   <p className="text-slate-500">Nessuna pratica presente</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {practices.map(practice => (
                     <div key={practice.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                       <div className="flex justify-between items-start mb-3">
                         <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                           practice.status === 'completata' ? 'bg-emerald-100 text-emerald-700' :
                           practice.status === 'in_lavorazione' ? 'bg-sky-100 text-sky-700' :
                           'bg-slate-100 text-slate-700'
                         }`}>
                           {practice.status.replace('_', ' ')}
                         </span>
                         <span className="text-xs text-slate-400">{format(new Date(practice.created_at), 'dd/MM/yyyy')}</span>
                       </div>
                       <h4 className="font-bold text-slate-900 mb-1">{practice.title}</h4>
                       <p className="text-sm text-slate-500 line-clamp-2">{practice.description}</p>
                     </div>
                   ))}
                 </div>
               )}
             </div>
          )}

          {/* LOG AI TAB */}
          {activeTab === 'ai' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Log Attività AI</h3>
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                {aiLogs.map((log) => (
                  <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-sky-100 text-sky-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900 text-sm">{log.agent}</span>
                        <span className="text-xs text-slate-500">{format(new Date(log.timestamp), 'dd MMM HH:mm', { locale: it })}</span>
                      </div>
                      <p className="text-sm text-slate-600">{log.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
