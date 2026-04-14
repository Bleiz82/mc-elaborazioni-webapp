import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Mail, 
  Phone, 
  MessageSquare, 
  Filter, 
  MoreVertical,
  ChevronRight,
  UserPlus,
  ArrowRight,
  Bot,
  MessageCircle,
  Hash
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  getDocs, 
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { safeDate } from '../../lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  phone_normalized: string | null;
  channel_ids: {
    chatbot: string | null;
    whatsapp: string | null;
    email: string | null;
  };
  lead_status: 'new' | 'qualified' | 'scheduled' | 'converted' | 'lost';
  created_at: any;
  qualification_data?: {
    business_type: string | null;
    fiscal_problem: string | null;
    urgency: string | null;
  };
}

export default function Leads() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, 'contacts'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contact));
      setContacts(docs.sort((a, b) => safeDate(b.created_at).getTime() - safeDate(a.created_at).getTime()));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const convertToClient = async (contact: Contact) => {
    try {
      // 1. Create client document
      await addDoc(collection(db, 'clients'), {
        full_name: contact.name,
        email: contact.email,
        phone: contact.phone,
        status: 'active',
        business_type: contact.qualification_data?.business_type || 'Ditta Individuale',
        created_at: serverTimestamp()
      });

      // 2. Update contact status
      await updateDoc(doc(db, 'contacts', contact.id), {
        lead_status: 'converted',
        updated_at: serverTimestamp()
      });

      toast.success('Contatto convertito in cliente con successo!');
    } catch (error) {
      console.error("Conversion error:", error);
      toast.error('Errore durante la conversione');
    }
  };

  const getSourceIcon = (channel_ids: Contact['channel_ids']) => {
    if (channel_ids.whatsapp) return <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />;
    if (channel_ids.chatbot) return <Bot className="w-3.5 h-3.5 text-sky-500" />;
    return <Mail className="w-3.5 h-3.5 text-slate-400" />;
  };

  const statusMap = {
    new: { label: 'Nuovo', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    qualified: { label: 'Qualificato', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    scheduled: { label: 'Appuntamento', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    converted: { label: 'Convertito', color: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400' },
    lost: { label: 'Perso', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' }
  };

  const filteredContacts = filterStatus === 'all' 
    ? contacts 
    : contacts.filter(c => c.lead_status === filterStatus);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Lead & Contatti</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gestisci i potenziali clienti acquisiti tramite i canali AI</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select 
              className="pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Tutti gli stati</option>
              <option value="new">Nuovi</option>
              <option value="qualified">Qualificati</option>
              <option value="scheduled">Appuntamenti</option>
              <option value="converted">Convertiti</option>
              <option value="lost">Persi</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contatto</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Origine</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stato</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Info Qualifica</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {loading ? (
                [1, 2, 3].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-4"><div className="h-10 bg-slate-100 dark:bg-slate-700 rounded-lg"></div></td>
                  </tr>
                ))
              ) : filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">Nessun lead trovato</td>
                </tr>
              ) : (
                filteredContacts.map(contact => (
                  <tr key={contact.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{contact.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{contact.email || contact.phone || 'Senza recapito'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 dark:bg-slate-900 rounded-lg w-fit">
                        {getSourceIcon(contact.channel_ids)}
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                          {contact.channel_ids.whatsapp ? 'WhatsApp' : contact.channel_ids.chatbot ? 'Chatbot' : 'Email'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${statusMap[contact.lead_status].color}`}>
                        {statusMap[contact.lead_status].label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-[150px]">
                        <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                          {contact.qualification_data?.fiscal_problem || 'Nessuna info'}
                        </p>
                        {contact.qualification_data?.urgency && (
                          <p className={`text-[10px] mt-0.5 font-medium ${contact.qualification_data.urgency === 'alta' ? 'text-rose-500' : 'text-slate-400'}`}>
                            Urgenza: {contact.qualification_data.urgency}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                      {safeDate(contact.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => navigate('/admin/communications')}
                          className="p-2 hover:bg-sky-50 dark:hover:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-lg transition-colors"
                          title="Vedi conversazione"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        {contact.lead_status !== 'converted' && (
                          <button 
                            onClick={() => convertToClient(contact)}
                            className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors"
                            title="Converti in Cliente"
                          >
                            <UserPlus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
