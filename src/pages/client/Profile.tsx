import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { db } from '../../lib/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { User, CreditCard, Bell, Shield, LogOut, ChevronRight, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ClientProfile() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    taxId: '',
    vatNumber: '',
    pec: '',
    sdiCode: ''
  });

  const [notifications, setNotifications] = useState({
    deadlines: true,
    payments: true,
    documents: true,
    messages: true
  });

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;
      
      try {
        // Fetch from clients collection as well to get business data
        const clientDoc = await getDoc(doc(db, 'users', user.uid));
        const clientData = clientDoc.exists() ? clientDoc.data() : {};

        setFormData({
          fullName: profile?.full_name || clientData.displayName || '',
          phone: clientData.phone || '',
          address: clientData.address || '',
          city: clientData.city || '',
          taxId: clientData.taxId || '',
          vatNumber: clientData.vatNumber || '',
          pec: clientData.pec || '',
          sdiCode: clientData.sdiCode || ''
        });

        if (clientData.notification_preferences) {
          setNotifications(clientData.notification_preferences);
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user, profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    try {
      // Update users collection
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: formData.fullName,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        taxId: formData.taxId,
        vatNumber: formData.vatNumber,
        pec: formData.pec,
        sdiCode: formData.sdiCode,
        updated_at: new Date().toISOString()
      });

      toast.success('Profilo aggiornato con successo');
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationToggle = async (key: keyof typeof notifications) => {
    if (!user) return;
    
    const newPrefs = { ...notifications, [key]: !notifications[key] };
    setNotifications(newPrefs);
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        notification_preferences: newPrefs
      });
    } catch (error) {
      console.error("Error saving notification preferences:", error);
      toast.error('Errore durante il salvataggio delle preferenze');
      // Revert on error
      setNotifications(notifications);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      toast.error('Errore durante il logout');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-8">
      {/* Header Profilo */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
        <div className="w-20 h-20 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4 text-sky-700 font-bold text-2xl border-4 border-white shadow-sm">
          {formData.fullName.charAt(0) || user?.email?.charAt(0) || 'U'}
        </div>
        <h2 className="text-xl font-bold text-slate-900">{formData.fullName || 'Utente'}</h2>
        <p className="text-slate-500 text-sm mb-3">{user?.email}</p>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
          Cliente
        </span>
      </div>

      {/* I Miei Dati */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
          <User className="w-5 h-5 text-sky-500" />
          <h3 className="font-bold text-slate-900">I Miei Dati</h3>
        </div>
        <form onSubmit={handleSaveProfile} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Nome Completo / Ragione Sociale</label>
            <input 
              type="text" 
              value={formData.fullName}
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:bg-white transition-colors text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Telefono</label>
            <input 
              type="tel" 
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:bg-white transition-colors text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Indirizzo Sede</label>
              <input 
                type="text" 
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:bg-white transition-colors text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Città, CAP, Provincia</label>
              <input 
                type="text" 
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:bg-white transition-colors text-sm"
              />
            </div>
          </div>
          
          <div className="pt-2 border-t border-slate-100 mt-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Dati Fiscali</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Codice Fiscale</label>
                <input 
                  type="text" 
                  value={formData.taxId}
                  readOnly={!!formData.taxId}
                  onChange={(e) => setFormData({...formData, taxId: e.target.value})}
                  className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm ${formData.taxId ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50 focus:ring-2 focus:ring-sky-500 focus:bg-white'}`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Partita IVA</label>
                <input 
                  type="text" 
                  value={formData.vatNumber}
                  readOnly={!!formData.vatNumber}
                  onChange={(e) => setFormData({...formData, vatNumber: e.target.value})}
                  className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm ${formData.vatNumber ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50 focus:ring-2 focus:ring-sky-500 focus:bg-white'}`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">PEC</label>
                <input 
                  type="email" 
                  value={formData.pec}
                  onChange={(e) => setFormData({...formData, pec: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:bg-white transition-colors text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Codice SDI</label>
                <input 
                  type="text" 
                  value={formData.sdiCode}
                  onChange={(e) => setFormData({...formData, sdiCode: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:bg-white transition-colors text-sm uppercase"
                  maxLength={7}
                />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={saving}
            className="w-full mt-4 bg-slate-900 text-white rounded-xl py-3 font-medium hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? 'Salvataggio...' : 'Salva Modifiche'}
          </button>
        </form>
      </div>

      {/* Metodi di Pagamento */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
          <CreditCard className="w-5 h-5 text-emerald-500" />
          <h3 className="font-bold text-slate-900">Metodi di Pagamento</h3>
        </div>
        <div className="p-4">
          <div className="text-center py-4">
            <p className="text-sm text-slate-500 mb-4">Nessun metodo di pagamento salvato.</p>
            <button className="text-sm font-medium text-sky-600 hover:text-sky-700 bg-sky-50 px-4 py-2 rounded-lg transition-colors">
              Gestisci metodi di pagamento
            </button>
          </div>
        </div>
      </div>

      {/* Preferenze Notifiche */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
          <Bell className="w-5 h-5 text-amber-500" />
          <h3 className="font-bold text-slate-900">Preferenze Notifiche</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Scadenze</p>
              <p className="text-xs text-slate-500">Promemoria per F24, dichiarazioni, ecc.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={notifications.deadlines} onChange={() => handleNotificationToggle('deadlines')} />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Pagamenti</p>
              <p className="text-xs text-slate-500">Avvisi per nuove parcelle e ricevute</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={notifications.payments} onChange={() => handleNotificationToggle('payments')} />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Documenti</p>
              <p className="text-xs text-slate-500">Notifiche per nuovi documenti caricati</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={notifications.documents} onChange={() => handleNotificationToggle('documents')} />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Messaggi</p>
              <p className="text-xs text-slate-500">Nuovi messaggi dallo studio</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={notifications.messages} onChange={() => handleNotificationToggle('messages')} />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Sicurezza */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
          <Shield className="w-5 h-5 text-slate-500" />
          <h3 className="font-bold text-slate-900">Sicurezza</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Google Login</p>
                <p className="text-xs text-slate-500">Connesso</p>
              </div>
            </div>
            <Check className="w-5 h-5 text-emerald-500" />
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 text-red-600 font-medium hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Disconnetti Account
          </button>
          
          <p className="text-center text-xs text-slate-400 mt-4">
            Per eliminare definitivamente il tuo account e tutti i dati associati, contatta lo studio.
          </p>
        </div>
      </div>
    </div>
  );
}
