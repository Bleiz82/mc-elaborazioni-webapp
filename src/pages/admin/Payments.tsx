import React, { useState, useEffect } from 'react';
import { 
  CreditCard, TrendingUp, AlertCircle, CheckCircle2, Plus, 
  Search, Filter, MoreVertical, Download, Send, Trash2, X
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, query, onSnapshot, orderBy, doc, deleteDoc, updateDoc, getDocs, addDoc, where } from 'firebase/firestore';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, isSameMonth, isBefore, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import clsx from 'clsx';
import { generateInvoicePDF, generateCSV } from '../../services/pdfGenerator';

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  client_name?: string;
  practice_id?: string;
  description: string;
  amount: number;
  tax_rate: number;
  total_amount: number;
  due_date: string;
  status: string;
  payment_method?: string;
  created_at: string;
  paid_at?: string;
}

interface Client {
  id: string;
  name: string;
}

export default function AdminPayments() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterClient, setFilterClient] = useState('all');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    practice_id: '',
    description: '',
    amount: '',
    tax_rate: 22,
    due_date: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
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

    const q = query(collection(db, 'invoices'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const invoicesData: Invoice[] = [];
      const today = startOfDay(new Date());

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Omit<Invoice, 'id'>;
        let status = data.status;

        // Auto-update to scaduta
        const dueDate = startOfDay(parseISO(data.due_date));
        if (isBefore(dueDate, today) && status !== 'pagata' && status !== 'scaduta') {
          status = 'scaduta';
          updateDoc(doc(db, 'invoices', docSnap.id), { status: 'scaduta' }).catch(console.error);
        }

        invoicesData.push({ id: docSnap.id, ...data, status });
      });

      const clientsSnap = await getDocs(collection(db, 'users'));
      const clientsMap = new Map();
      clientsSnap.docs.forEach(d => {
        const data = d.data();
        clientsMap.set(d.id, data.displayName || data.email);
      });

      const invoicesWithClients = invoicesData.map(inv => ({
        ...inv,
        client_name: clientsMap.get(inv.client_id) || 'Cliente Sconosciuto'
      }));

      setInvoices(invoicesWithClients);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'invoices');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_id || !formData.description || !formData.amount || !formData.due_date) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    try {
      const amountNum = parseFloat(formData.amount);
      const totalAmount = amountNum + (amountNum * formData.tax_rate / 100);
      
      // Generate Invoice Number
      const year = new Date().getFullYear();
      const yearInvoices = invoices.filter(i => i.invoice_number.includes(`MC-${year}`));
      const nextNum = (yearInvoices.length + 1).toString().padStart(3, '0');
      const invoiceNumber = `MC-${year}-${nextNum}`;

      const now = new Date().toISOString();

      const invoiceData = {
        invoice_number: invoiceNumber,
        client_id: formData.client_id,
        practice_id: formData.practice_id || null,
        description: formData.description,
        amount: amountNum,
        tax_rate: formData.tax_rate,
        total_amount: totalAmount,
        due_date: formData.due_date,
        status: 'da_pagare',
        created_at: now
      };

      const docRef = await addDoc(collection(db, 'invoices'), invoiceData);

      // Create linked deadline
      await addDoc(collection(db, 'deadlines'), {
        title: `Pagamento Parcella ${invoiceNumber}`,
        description: formData.description,
        client_id: formData.client_id,
        practice_id: formData.practice_id || null,
        type: 'pagamento',
        due_date: formData.due_date,
        priority: 'alta',
        status: 'da_fare',
        is_recurring: false,
        created_at: now,
        invoice_id: docRef.id
      });

      // Create notification
      await addDoc(collection(db, 'notifications'), {
        user_id: formData.client_id,
        title: 'Nuova Parcella',
        message: `È stata emessa la parcella ${invoiceNumber} di €${totalAmount.toFixed(2)}`,
        type: 'payment',
        is_read: false,
        created_at: now,
        link: '/client/payments'
      });

      toast.success('Parcella creata e notifica inviata al cliente');
      setIsModalOpen(false);
      setFormData({
        client_id: '',
        practice_id: '',
        description: '',
        amount: '',
        tax_rate: 22,
        due_date: format(new Date(), 'yyyy-MM-dd')
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'invoices');
      toast.error('Errore durante la creazione della parcella');
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      await updateDoc(doc(db, 'invoices', id), { 
        status: 'pagata',
        paid_at: new Date().toISOString()
      });
      toast.success('Parcella segnata come pagata');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'invoices');
      toast.error('Errore durante l\'aggiornamento');
    }
  };

  const handleSendReminder = async (invoice: Invoice) => {
    try {
      const now = new Date().toISOString();
      
      // Send notification
      await addDoc(collection(db, 'notifications'), {
        user_id: invoice.client_id,
        title: 'Sollecito Pagamento',
        message: `Ti ricordiamo che la parcella ${invoice.invoice_number} risulta non pagata.`,
        type: 'payment',
        is_read: false,
        created_at: now,
        link: '/client/payments'
      });

      // Log AI Action
      await addDoc(collection(db, 'ai_activity_log'), {
        agent: 'agent_solleciti',
        action: 'Invio sollecito pagamento',
        client_id: invoice.client_id,
        details: `Sollecito per parcella ${invoice.invoice_number}`,
        created_at: now
      });

      toast.success('Sollecito inviato al cliente');
    } catch (error) {
      console.error("Error sending reminder:", error);
      toast.error('Errore durante l\'invio del sollecito');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa parcella?')) return;
    try {
      await deleteDoc(doc(db, 'invoices', id));
      toast.success('Parcella eliminata');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'invoices');
      toast.error('Errore durante l\'eliminazione');
    }
  };

  // KPI Calculations
  const currentMonth = new Date();
  const lastMonth = subMonths(currentMonth, 1);

  const totalRevenue = invoices.filter(i => i.status === 'pagata').reduce((acc, curr) => acc + curr.total_amount, 0);
  const totalRevenueLastMonth = invoices.filter(i => i.status === 'pagata' && i.paid_at && isSameMonth(parseISO(i.paid_at), lastMonth)).reduce((acc, curr) => acc + curr.total_amount, 0);
  const revenueGrowth = totalRevenueLastMonth === 0 ? 100 : ((totalRevenue - totalRevenueLastMonth) / totalRevenueLastMonth) * 100;

  const toCollect = invoices.filter(i => i.status === 'da_pagare' || i.status === 'scaduta').reduce((acc, curr) => acc + curr.total_amount, 0);
  const collectedThisMonth = invoices.filter(i => i.status === 'pagata' && i.paid_at && isSameMonth(parseISO(i.paid_at), currentMonth)).reduce((acc, curr) => acc + curr.total_amount, 0);
  const overdueCount = invoices.filter(i => i.status === 'scaduta').length;

  // Chart Data (Last 6 months)
  const chartData = Array.from({ length: 6 }).map((_, i) => {
    const d = subMonths(currentMonth, 5 - i);
    const monthName = format(d, 'MMM', { locale: it });
    const amount = invoices
      .filter(inv => inv.status === 'pagata' && inv.paid_at && isSameMonth(parseISO(inv.paid_at), d))
      .reduce((acc, curr) => acc + curr.total_amount, 0);
    return { name: monthName, incassi: amount };
  });

  const filteredInvoices = invoices.filter(i => {
    if (filterStatus !== 'all' && i.status !== filterStatus) return false;
    if (filterClient !== 'all' && i.client_id !== filterClient) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pagata': return 'bg-emerald-100 text-emerald-800';
      case 'scaduta': return 'bg-red-100 text-red-800';
      case 'in_elaborazione': return 'bg-sky-100 text-sky-800';
      default: return 'bg-amber-100 text-amber-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pagamenti e Parcelle</h1>
          <p className="text-slate-500 text-sm mt-1">Gestisci la fatturazione e gli incassi dello studio</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => generateCSV(invoices, [
              { key: 'invoice_number', label: 'Numero' },
              { key: 'client_name', label: 'Cliente' },
              { key: 'description', label: 'Descrizione' },
              { key: 'total_amount', label: 'Totale' },
              { key: 'status', label: 'Stato' },
              { key: 'due_date', label: 'Scadenza' }
            ], 'Parcelle')}
            className="inline-flex items-center justify-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
          >
            <Download className="w-5 h-5 mr-2" />
            Esporta CSV
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center px-4 py-2 bg-sky-500 text-white rounded-lg font-medium hover:bg-sky-600 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuova Parcella
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Fatturato Totale</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">€ {totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-sky-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className={clsx("font-medium flex items-center", revenueGrowth >= 0 ? "text-emerald-600" : "text-red-600")}>
              {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}%
            </span>
            <span className="text-slate-400 ml-2">vs mese scorso</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Da Incassare</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">€ {toCollect.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Incassato Questo Mese</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">€ {collectedThisMonth.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Parcelle Scadute</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{overdueCount}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Incassi Ultimi 6 Mesi</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(val) => `€${val}`} />
              <Tooltip 
                cursor={{ fill: '#f1f5f9' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [`€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`, 'Incassi']}
              />
              <Bar dataKey="incassi" fill="#0EA5E9" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4">
          <div className="flex gap-2 flex-1">
            <select 
              value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            >
              <option value="all">Tutti gli stati</option>
              <option value="da_pagare">Da Pagare</option>
              <option value="in_elaborazione">In Elaborazione</option>
              <option value="pagata">Pagate</option>
              <option value="scaduta">Scadute</option>
            </select>
            <select 
              value={filterClient} onChange={(e) => setFilterClient(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent flex-1 max-w-xs"
            >
              <option value="all">Tutti i clienti</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <tr>
                <th className="px-6 py-4"># Parcella</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Descrizione</th>
                <th className="px-6 py-4">Importo</th>
                <th className="px-6 py-4">Scadenza</th>
                <th className="px-6 py-4">Stato</th>
                <th className="px-6 py-4 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500 mx-auto mb-2"></div>
                    Caricamento parcelle...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    Nessuna parcella trovata
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{invoice.invoice_number}</td>
                    <td className="px-6 py-4 text-slate-600">{invoice.client_name}</td>
                    <td className="px-6 py-4 text-slate-600 max-w-[200px] truncate" title={invoice.description}>{invoice.description}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">€ {invoice.total_amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-slate-600">{format(parseISO(invoice.due_date), 'dd MMM yyyy', { locale: it })}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize w-fit", getStatusColor(invoice.status))}>
                          {invoice.status.replace('_', ' ')}
                        </span>
                        {invoice.status === 'pagata' && invoice.payment_method && (
                          <span className="text-xs text-slate-500 capitalize">
                            via {invoice.payment_method}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {invoice.status !== 'pagata' && (
                          <>
                            <button onClick={() => handleMarkAsPaid(invoice.id)} className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors" title="Segna come Pagata">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleSendReminder(invoice)} className="p-1.5 text-slate-400 hover:text-amber-600 transition-colors" title="Invia Sollecito">
                              <Send className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button onClick={() => generateInvoicePDF(invoice)} className="p-1.5 text-slate-400 hover:text-sky-600 transition-colors" title="Scarica PDF">
                          <Download className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(invoice.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors" title="Elimina">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Nuova Parcella</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateInvoice} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cliente *</label>
                <select 
                  required
                  value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                >
                  <option value="">Seleziona cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrizione *</label>
                <input 
                  type="text" required
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="Es. Consulenza Fiscale Q1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Importo Netto (€) *</label>
                  <input 
                    type="number" step="0.01" required min="0"
                    value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Aliquota IVA</label>
                  <select 
                    value={formData.tax_rate} onChange={e => setFormData({...formData, tax_rate: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  >
                    <option value={22}>22%</option>
                    <option value={10}>10%</option>
                    <option value={4}>4%</option>
                    <option value={0}>Esente (0%)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data Scadenza *</label>
                <input 
                  type="date" required
                  value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>
              
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500">Imponibile:</span>
                  <span className="font-medium">€ {formData.amount ? parseFloat(formData.amount).toFixed(2) : '0.00'}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-500">IVA ({formData.tax_rate}%):</span>
                  <span className="font-medium">€ {formData.amount ? (parseFloat(formData.amount) * formData.tax_rate / 100).toFixed(2) : '0.00'}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t border-slate-200">
                  <span className="text-slate-900">Totale:</span>
                  <span className="text-sky-600">€ {formData.amount ? (parseFloat(formData.amount) * (1 + formData.tax_rate / 100)).toFixed(2) : '0.00'}</span>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                >
                  Annulla
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-sky-500 text-white rounded-lg font-medium hover:bg-sky-600 transition-colors"
                >
                  Emetti Parcella
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
