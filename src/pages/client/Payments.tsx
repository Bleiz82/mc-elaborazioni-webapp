import { useState, useEffect } from 'react';
import { CreditCard, Download, FileText, X, Copy, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, orderBy } from 'firebase/firestore';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Elements } from '@stripe/react-stripe-js';
import { getStripe } from '../../services/stripe';
import StripePaymentForm from '../../components/StripePaymentForm';
import { generateInvoicePDF } from '../../services/pdfGenerator';
import { getAdminUID } from '../../services/ai/utils';

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  description: string;
  amount: number;
  total_amount: number;
  status: 'da_pagare' | 'in_elaborazione' | 'pagata' | 'scaduta' | 'rateizzata';
  due_date: string;
}

export default function ClientPayments() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'da_pagare' | 'pagate' | 'tutte'>('da_pagare');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'carta' | 'paypal' | 'bonifico' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stripePromise, setStripePromise] = useState<any>(null);

  useEffect(() => {
    setStripePromise(getStripe());
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'invoices'),
      where('client_id', '==', user.uid),
      orderBy('due_date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const invoicesData: Invoice[] = [];
      snapshot.forEach((doc) => {
        invoicesData.push({ id: doc.id, ...doc.data() } as Invoice);
      });
      setInvoices(invoicesData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'invoices');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const totalToPay = invoices
    .filter(i => i.status === 'da_pagare' || i.status === 'scaduta')
    .reduce((sum, i) => sum + i.total_amount, 0);

  const dueCount = invoices.filter(i => i.status === 'da_pagare' || i.status === 'scaduta').length;

  const filteredInvoices = invoices.filter(i => {
    if (activeTab === 'da_pagare') return i.status === 'da_pagare' || i.status === 'scaduta';
    if (activeTab === 'pagate') return i.status === 'pagata';
    return true;
  });

  const [showStripeForm, setShowStripeForm] = useState(false);

  const handlePayment = async () => {
    if (!selectedInvoice || !paymentMethod || !user) return;

    if (paymentMethod === 'carta' || paymentMethod === 'paypal') {
      setShowStripeForm(true);
      return;
    }

    setIsProcessing(true);

    try {
      if (paymentMethod === 'bonifico') {
        await addDoc(collection(db, 'payments'), {
          invoice_id: selectedInvoice.id,
          amount: selectedInvoice.total_amount,
          payment_method: 'bonifico',
          status: 'pending',
          created_at: new Date().toISOString()
        });

        await updateDoc(doc(db, 'invoices', selectedInvoice.id), {
          status: 'in_elaborazione'
        });

        // Create notification for admin
        const adminUID = await getAdminUID();
        await addDoc(collection(db, 'notifications'), {
          user_id: adminUID,
          title: 'Nuovo Bonifico Segnalato',
          message: `Il cliente ha segnalato un bonifico per la parcella #${selectedInvoice.invoice_number}`,
          type: 'pagamento',
          is_read: false,
          created_at: new Date().toISOString()
        });

        toast.success('Notifica inviata allo studio');
        setSelectedInvoice(null);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error('Errore durante l\'elaborazione del pagamento');
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('IBAN copiato negli appunti');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'da_pagare':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400">Da Pagare</span>;
      case 'in_elaborazione':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">In Elaborazione</span>;
      case 'pagata':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400">Pagata</span>;
      case 'scaduta':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">Scaduta</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Summary Card */}
      <div className="bg-gradient-to-br from-[#1E3A5F] to-[#0EA5E9] rounded-2xl p-6 text-white shadow-lg">
        <p className="text-sky-100 text-sm font-medium mb-1">Totale da pagare</p>
        <h2 className="text-4xl font-bold mb-2">€ {totalToPay.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</h2>
        <p className="text-sky-200 text-sm">{dueCount} {dueCount === 1 ? 'parcella' : 'parcelle'} in scadenza</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        <button 
          onClick={() => setActiveTab('da_pagare')}
          className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
            activeTab === 'da_pagare' ? 'border-sky-500 text-sky-600 dark:text-sky-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Da Pagare
        </button>
        <button 
          onClick={() => setActiveTab('pagate')}
          className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
            activeTab === 'pagate' ? 'border-sky-500 text-sky-600 dark:text-sky-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Pagate
        </button>
        <button 
          onClick={() => setActiveTab('tutte')}
          className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
            activeTab === 'tutte' ? 'border-sky-500 text-sky-600 dark:text-sky-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Tutte
        </button>
      </div>

      {/* Invoices List */}
      <div>
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm animate-pulse">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-4"></div>
                <div className="flex justify-between items-center">
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
                  <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm text-center">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Nessuna parcella trovata</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInvoices.map(invoice => (
              <div key={invoice.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Parcella #{invoice.invoice_number}</span>
                  {getStatusBadge(invoice.status)}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{invoice.description}</p>
                <div className="flex justify-between items-end mb-4">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Scadenza: {format(new Date(invoice.due_date), 'dd MMM yyyy', { locale: it })}
                  </span>
                  <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    € {invoice.total_amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                {(invoice.status === 'da_pagare' || invoice.status === 'scaduta') ? (
                  <button 
                    onClick={() => {
                      setSelectedInvoice(invoice);
                      setPaymentMethod(null);
                    }}
                    className="w-full bg-sky-500 text-white rounded-lg h-12 font-semibold hover:bg-sky-600 active:scale-95 transition-all"
                  >
                    PAGA ORA
                  </button>
                ) : invoice.status === 'pagata' ? (
                  <button 
                    onClick={() => generateInvoicePDF(invoice)}
                    className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg h-12 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all"
                  >
                    <Download className="w-5 h-5" />
                    Scarica Ricevuta
                  </button>
                ) : (
                  <button disabled className="w-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg h-12 font-semibold cursor-not-allowed">
                    In Elaborazione
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Bottom Sheet */}
      {selectedInvoice && (
        <>
          <div 
            className="fixed inset-0 bg-slate-900/60 z-50 transition-opacity"
            onClick={() => {
              if (!isProcessing) {
                setSelectedInvoice(null);
                setShowStripeForm(false);
              }
            }}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 rounded-t-2xl z-50 p-6 shadow-2xl transform transition-transform animate-in slide-in-from-bottom-full duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {showStripeForm ? 'Inserisci i dati della carta' : 'Scegli metodo di pagamento'}
              </h3>
              <button 
                onClick={() => {
                  if (!isProcessing) {
                    setSelectedInvoice(null);
                    setShowStripeForm(false);
                  }
                }}
                className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-full bg-slate-50 dark:bg-slate-700"
                disabled={isProcessing}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {showStripeForm ? (
              <div className="space-y-4">
                {(import.meta as any).env.VITE_STRIPE_PUBLISHABLE_KEY ? (
                  <Elements stripe={stripePromise}>
                    <StripePaymentForm 
                      invoice={selectedInvoice} 
                      onSuccess={() => {
                        setSelectedInvoice(null);
                        setShowStripeForm(false);
                      }}
                      onCancel={() => setShowStripeForm(false)}
                    />
                  </Elements>
                ) : (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl text-center">
                    <p className="text-amber-800 dark:text-amber-400 font-medium">
                      Pagamento con carta non ancora disponibile.
                    </p>
                    <p className="text-amber-700 dark:text-amber-500 text-sm mt-1">
                      Usa il bonifico bancario per procedere.
                    </p>
                    <button 
                      onClick={() => setShowStripeForm(false)}
                      className="mt-4 text-sm font-semibold text-amber-900 dark:text-amber-300 underline"
                    >
                      Torna indietro
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-6">
                  <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${paymentMethod === 'carta' ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                    <input 
                      type="radio" 
                      name="payment_method" 
                      value="carta" 
                      checked={paymentMethod === 'carta'}
                      onChange={() => setPaymentMethod('carta')}
                      className="w-4 h-4 text-sky-600 border-slate-300 dark:border-slate-600 focus:ring-sky-500"
                    />
                    <div className="ml-3 flex items-center gap-3">
                      <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-sm">
                        <CreditCard className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                      </div>
                      <span className="font-medium text-slate-900 dark:text-slate-100">Carta di Credito / Debito</span>
                    </div>
                  </label>

                  <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${paymentMethod === 'paypal' ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                    <input 
                      type="radio" 
                      name="payment_method" 
                      value="paypal" 
                      checked={paymentMethod === 'paypal'}
                      onChange={() => setPaymentMethod('paypal')}
                      className="w-4 h-4 text-sky-600 border-slate-300 dark:border-slate-600 focus:ring-sky-500"
                    />
                    <div className="ml-3 flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#003087] rounded-lg flex items-center justify-center shadow-sm">
                        <span className="text-white font-bold italic text-lg">P</span>
                      </div>
                      <span className="font-medium text-slate-900 dark:text-slate-100">PayPal</span>
                    </div>
                  </label>

                  <label className={`flex flex-col border rounded-xl cursor-pointer transition-colors ${paymentMethod === 'bonifico' ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                    <div className="flex items-center p-4" onClick={() => setPaymentMethod('bonifico')}>
                      <input 
                        type="radio" 
                        name="payment_method" 
                        value="bonifico" 
                        checked={paymentMethod === 'bonifico'}
                        onChange={() => setPaymentMethod('bonifico')}
                        className="w-4 h-4 text-sky-600 border-slate-300 dark:border-slate-600 focus:ring-sky-500"
                      />
                      <div className="ml-3 flex items-center gap-3">
                        <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-sm">
                          <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                        </div>
                        <span className="font-medium text-slate-900 dark:text-slate-100">Bonifico Bancario</span>
                      </div>
                    </div>
                    
                    {paymentMethod === 'bonifico' && (
                      <div className="px-4 pb-4 pt-2 border-t border-sky-100 dark:border-sky-900/30">
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-sky-100 dark:border-sky-900/50 space-y-3">
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Intestatario</p>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">M&C Elaborazioni e Consulenze Aziendali Srl</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">IBAN</p>
                            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-700">
                              <p className="text-sm font-mono font-medium text-slate-900 dark:text-slate-100">IT00 A000 0000 0000 0000 0000 000</p>
                              <button 
                                onClick={(e) => { e.preventDefault(); copyToClipboard('IT00A0000000000000000000000'); }}
                                className="p-1.5 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/30 rounded"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Causale</p>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Parcella {selectedInvoice.invoice_number}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </label>
                </div>

                <button 
                  onClick={handlePayment}
                  disabled={!paymentMethod || isProcessing}
                  className="w-full bg-sky-500 text-white rounded-xl h-14 font-semibold hover:bg-sky-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isProcessing ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : paymentMethod === 'bonifico' ? (
                    'Ho effettuato il bonifico'
                  ) : (
                    `Procedi al pagamento di € ${selectedInvoice.total_amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`
                  )}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
