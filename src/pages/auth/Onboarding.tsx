import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { db } from '../../lib/firebase';
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Building2, User, Briefcase, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

export default function Onboarding() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: profile?.full_name || '',
    phone: '',
    clientType: 'azienda' as 'azienda' | 'professionista' | 'privato',
    companyName: '',
    vatNumber: '',
    taxId: '',
    pec: '',
    sdiCode: '',
    address: '',
    city: '',
    privacyAccepted: false
  });

  useEffect(() => {
    if (!user || !profile) {
      navigate('/login');
      return;
    }

    if (profile.role !== 'client') {
      navigate('/admin/dashboard');
      return;
    }

    if (profile.onboarding_completed) {
      navigate('/client/home');
    }
  }, [user, profile, navigate]);

  const handleNext = () => {
    if (step === 2) {
      if (!formData.fullName || !formData.phone) {
        toast.error('Compila tutti i campi obbligatori');
        return;
      }
      if (formData.clientType === 'privato') {
        setStep(4); // Skip company data
        return;
      }
    }
    if (step === 3) {
      if (!formData.taxId || !formData.address || !formData.city) {
        toast.error('Compila i campi obbligatori (Codice Fiscale, Indirizzo, Città)');
        return;
      }
    }
    setStep(s => s + 1);
  };

  const handleBack = () => {
    if (step === 4 && formData.clientType === 'privato') {
      setStep(2);
    } else {
      setStep(s => s - 1);
    }
  };

  const handleComplete = async () => {
    if (!formData.privacyAccepted) {
      toast.error('Devi accettare l\'informativa sulla privacy per continuare');
      return;
    }

    setLoading(true);
    try {
      // 1. Update/Create Client Document
      const clientData = {
        email: user?.email,
        displayName: formData.clientType === 'privato' ? formData.fullName : (formData.companyName || formData.fullName),
        role: 'client',
        phone: formData.phone,
        clientType: formData.clientType,
        taxId: formData.taxId,
        vatNumber: formData.vatNumber,
        pec: formData.pec,
        sdiCode: formData.sdiCode,
        address: formData.address,
        city: formData.city,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'active'
      };

      await setDoc(doc(db, 'users', user!.uid), clientData, { merge: true });

      // 2. Update Profile Document
      await updateDoc(doc(db, 'profiles', user!.uid), {
        onboarding_completed: true,
        full_name: formData.fullName,
        updated_at: new Date().toISOString()
      });

      // 3. Trigger Onboarding Agent (mocked via notification for now, or just let the listener handle it)
      // The eventListener on 'users' collection will catch this new/updated user and trigger agentOnboarding.

      toast.success('Profilo completato! Benvenuto in M&C');
      navigate('/client/home');
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast.error('Si è verificato un errore. Riprova.');
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3, 4].map(i => (
        <div 
          key={i}
          className={clsx(
            "h-2 rounded-full transition-all duration-300",
            step === i ? "w-8 bg-sky-500" : 
            step > i ? "w-4 bg-sky-500/50" : "w-4 bg-slate-200"
          )}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        
        {/* Step 1: Splash */}
        {step === 1 && (
          <div className="p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-20 h-20 bg-sky-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-10 h-10 text-sky-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Benvenuto nel portale M&C Elaborazioni</h1>
            <p className="text-slate-500 mb-8">Configuriamo il tuo profilo in pochi semplici passi per offrirti il miglior servizio possibile.</p>
            <button 
              onClick={handleNext}
              className="w-full bg-sky-500 text-white rounded-xl py-4 font-bold hover:bg-sky-600 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              Iniziamo <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step 2: Personal Data & Type */}
        {step === 2 && (
          <div className="p-6 sm:p-8 animate-in fade-in slide-in-from-right-4 duration-300">
            {renderStepIndicator()}
            <h2 className="text-xl font-bold text-slate-900 mb-6">I Tuoi Dati</h2>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo *</label>
                <input 
                  type="text" required
                  value={formData.fullName}
                  onChange={e => setFormData({...formData, fullName: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefono *</label>
                <input 
                  type="tel" required
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white transition-colors"
                />
              </div>

              <div className="pt-4">
                <label className="block text-sm font-medium text-slate-700 mb-3">Tipo di Cliente *</label>
                <div className="grid grid-cols-1 gap-3">
                  <label className={clsx("flex items-center p-4 border rounded-xl cursor-pointer transition-all", formData.clientType === 'azienda' ? "border-sky-500 bg-sky-50 ring-1 ring-sky-500" : "border-slate-200 hover:bg-slate-50")}>
                    <input type="radio" name="type" value="azienda" checked={formData.clientType === 'azienda'} onChange={() => setFormData({...formData, clientType: 'azienda'})} className="sr-only" />
                    <Building2 className={clsx("w-6 h-6 mr-3", formData.clientType === 'azienda' ? "text-sky-600" : "text-slate-400")} />
                    <span className={clsx("font-medium", formData.clientType === 'azienda' ? "text-sky-900" : "text-slate-700")}>Azienda</span>
                  </label>
                  <label className={clsx("flex items-center p-4 border rounded-xl cursor-pointer transition-all", formData.clientType === 'professionista' ? "border-sky-500 bg-sky-50 ring-1 ring-sky-500" : "border-slate-200 hover:bg-slate-50")}>
                    <input type="radio" name="type" value="professionista" checked={formData.clientType === 'professionista'} onChange={() => setFormData({...formData, clientType: 'professionista'})} className="sr-only" />
                    <Briefcase className={clsx("w-6 h-6 mr-3", formData.clientType === 'professionista' ? "text-sky-600" : "text-slate-400")} />
                    <span className={clsx("font-medium", formData.clientType === 'professionista' ? "text-sky-900" : "text-slate-700")}>Libero Professionista</span>
                  </label>
                  <label className={clsx("flex items-center p-4 border rounded-xl cursor-pointer transition-all", formData.clientType === 'privato' ? "border-sky-500 bg-sky-50 ring-1 ring-sky-500" : "border-slate-200 hover:bg-slate-50")}>
                    <input type="radio" name="type" value="privato" checked={formData.clientType === 'privato'} onChange={() => setFormData({...formData, clientType: 'privato'})} className="sr-only" />
                    <User className={clsx("w-6 h-6 mr-3", formData.clientType === 'privato' ? "text-sky-600" : "text-slate-400")} />
                    <span className={clsx("font-medium", formData.clientType === 'privato' ? "text-sky-900" : "text-slate-700")}>Privato</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleBack} className="p-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button onClick={handleNext} className="flex-1 bg-sky-500 text-white rounded-xl py-4 font-bold hover:bg-sky-600 active:scale-95 transition-all flex items-center justify-center gap-2">
                Avanti <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Business Data */}
        {step === 3 && (
          <div className="p-6 sm:p-8 animate-in fade-in slide-in-from-right-4 duration-300">
            {renderStepIndicator()}
            <h2 className="text-xl font-bold text-slate-900 mb-6">Dati Aziendali</h2>
            
            <div className="space-y-4 mb-8">
              {formData.clientType === 'azienda' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ragione Sociale *</label>
                  <input 
                    type="text" required
                    value={formData.companyName}
                    onChange={e => setFormData({...formData, companyName: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white transition-colors"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Partita IVA</label>
                  <input 
                    type="text" 
                    value={formData.vatNumber}
                    onChange={e => setFormData({...formData, vatNumber: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Codice Fiscale *</label>
                  <input 
                    type="text" required
                    value={formData.taxId}
                    onChange={e => setFormData({...formData, taxId: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white transition-colors uppercase"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">PEC</label>
                  <input 
                    type="email" 
                    value={formData.pec}
                    onChange={e => setFormData({...formData, pec: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Codice SDI</label>
                  <input 
                    type="text" 
                    value={formData.sdiCode}
                    onChange={e => setFormData({...formData, sdiCode: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white transition-colors uppercase"
                    maxLength={7}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Indirizzo Sede *</label>
                <input 
                  type="text" required
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Città, CAP, Provincia *</label>
                <input 
                  type="text" required
                  value={formData.city}
                  onChange={e => setFormData({...formData, city: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleBack} className="p-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button onClick={handleNext} className="flex-1 bg-sky-500 text-white rounded-xl py-4 font-bold hover:bg-sky-600 active:scale-95 transition-all flex items-center justify-center gap-2">
                Avanti <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Summary & Privacy */}
        {step === 4 && (
          <div className="p-6 sm:p-8 animate-in fade-in slide-in-from-right-4 duration-300">
            {renderStepIndicator()}
            <h2 className="text-xl font-bold text-slate-900 mb-6">Quasi fatto!</h2>
            
            <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100">
              <h3 className="font-medium text-slate-900 mb-3">Riepilogo Dati</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Nome:</dt>
                  <dd className="font-medium text-slate-900">{formData.fullName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Tipo:</dt>
                  <dd className="font-medium text-slate-900 capitalize">{formData.clientType}</dd>
                </div>
                {formData.clientType !== 'privato' && (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">CF/P.IVA:</dt>
                      <dd className="font-medium text-slate-900">{formData.vatNumber || formData.taxId}</dd>
                    </div>
                  </>
                )}
              </dl>
            </div>

            <label className="flex items-start gap-3 mb-8 cursor-pointer">
              <input 
                type="checkbox" 
                checked={formData.privacyAccepted}
                onChange={e => setFormData({...formData, privacyAccepted: e.target.checked})}
                className="mt-1 w-5 h-5 text-sky-600 border-slate-300 rounded focus:ring-sky-500"
              />
              <span className="text-sm text-slate-600 leading-relaxed">
                Acconsento al trattamento dei dati personali ai sensi del GDPR per le finalità indicate nella <a href="#" className="text-sky-600 hover:underline">Privacy Policy</a> dello studio.
              </span>
            </label>

            <div className="flex gap-3">
              <button onClick={handleBack} disabled={loading} className="p-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button 
                onClick={handleComplete} 
                disabled={loading || !formData.privacyAccepted}
                className="flex-1 bg-slate-900 text-white rounded-xl py-4 font-bold hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>Completa Registrazione <CheckCircle2 className="w-5 h-5" /></>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
