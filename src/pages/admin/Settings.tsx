import React, { useState } from 'react';
import { 
  Building, Bell, Shield, Plug, Save, Upload, Key, 
  Smartphone, Monitor, Download, Bot, CreditCard
} from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);

  // Profile State
  const [profileData, setProfileData] = useState({
    name: 'M&C Elaborazioni e Consulenze Aziendali',
    vat: '01234567890',
    address: 'Via Roma 123, 09040 Senorbì (SU)',
    email: 'info@mec-consulenze.it',
    phone: '+39 070 1234567'
  });

  // Notifications State
  const [notifications, setNotifications] = useState({
    newDocument: true,
    unreadMessages: true,
    pushNotifications: false,
    weeklyReport: true
  });

  // Integrations State
  const [integrations, setIntegrations] = useState({
    stripeKey: 'sk_test_...',
    aiAutoReply: true,
    aiSystemPrompt: 'Sei l\'assistente virtuale dello studio M&C Elaborazioni e Consulenze Aziendali. Rispondi in modo professionale e cortese.'
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Profilo studio aggiornato con successo');
    }, 800);
  };

  const handleSaveNotifications = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Preferenze notifiche aggiornate');
    }, 800);
  };

  const handleSaveIntegrations = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Impostazioni integrazioni salvate');
    }, 800);
  };

  const handleExportData = () => {
    toast.success('Esportazione dati avviata. Riceverai un\'email al termine.');
  };

  const tabs = [
    { id: 'profile', label: 'Profilo Studio', icon: Building },
    { id: 'notifications', label: 'Notifiche', icon: Bell },
    { id: 'security', label: 'Sicurezza & Privacy', icon: Shield },
    { id: 'integrations', label: 'Integrazioni & AI', icon: Plug },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Impostazioni</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Configura la piattaforma per il tuo studio</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <nav className="flex flex-col">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={clsx(
                      "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-2",
                      isActive 
                        ? "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border-sky-500" 
                        : "text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-100"
                    )}
                  >
                    <Icon className={clsx("w-5 h-5", isActive ? "text-sky-500" : "text-slate-400 dark:text-slate-500")} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Profilo Studio</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Informazioni pubbliche visibili ai clienti</p>
              </div>
              <form onSubmit={handleSaveProfile} className="p-6 space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-xl bg-slate-100 dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600 hover:border-sky-400 dark:hover:border-sky-500 transition-colors cursor-pointer">
                    <Upload className="w-6 h-6 mb-1" />
                    <span className="text-xs font-medium">Logo</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Logo dello Studio</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Consigliato: 512x512px, PNG o JPG (Max 2MB)</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome Studio</label>
                    <input 
                      type="text" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Partita IVA</label>
                    <input 
                      type="text" value={profileData.vat} onChange={e => setProfileData({...profileData, vat: e.target.value})}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Telefono</label>
                    <input 
                      type="text" value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Indirizzo</label>
                    <input 
                      type="text" value={profileData.address} onChange={e => setProfileData({...profileData, address: e.target.value})}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Contatto</label>
                    <input 
                      type="email" value={profileData.email} onChange={e => setProfileData({...profileData, email: e.target.value})}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button 
                    type="submit" disabled={isSaving}
                    className="inline-flex items-center px-4 py-2 bg-sky-500 text-white rounded-lg font-medium hover:bg-sky-600 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Salvataggio...' : <><Save className="w-4 h-4 mr-2" /> Salva Modifiche</>}
                  </button>
                </div>
              </form>
            </div>
          )}
          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Preferenze Notifiche</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Scegli come e quando ricevere avvisi</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Nuovi Documenti</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Email quando un cliente carica un documento</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={notifications.newDocument} onChange={e => setNotifications({...notifications, newDocument: e.target.checked})} />
                      <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 dark:peer-focus:ring-sky-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Messaggi Non Letti</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Email di riepilogo per messaggi in chat non letti</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={notifications.unreadMessages} onChange={e => setNotifications({...notifications, unreadMessages: e.target.checked})} />
                      <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 dark:peer-focus:ring-sky-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Notifiche Push</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Ricevi notifiche direttamente nel browser</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={notifications.pushNotifications} onChange={e => setNotifications({...notifications, pushNotifications: e.target.checked})} />
                      <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 dark:peer-focus:ring-sky-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Report Settimanale</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Ricevi un riepilogo automatico ogni lunedì mattina</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={notifications.weeklyReport} onChange={e => setNotifications({...notifications, weeklyReport: e.target.checked})} />
                      <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 dark:peer-focus:ring-sky-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                    </label>
                  </div>
                </div>
                <div className="pt-4 flex justify-end border-t border-slate-100 dark:border-slate-700">
                  <button 
                    onClick={handleSaveNotifications} disabled={isSaving}
                    className="inline-flex items-center px-4 py-2 bg-sky-500 text-white rounded-lg font-medium hover:bg-sky-600 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Salvataggio...' : <><Save className="w-4 h-4 mr-2" /> Salva Preferenze</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Sicurezza & Privacy</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Gestisci l'accesso e i dati del tuo account</p>
              </div>
              <div className="p-6 space-y-8">
                
                {/* Password */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <Key className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Password
                  </h3>
                  <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    Cambia Password
                  </button>
                </div>

                {/* Sessions */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Sessioni Attive
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <Monitor className="w-5 h-5 text-sky-500" />
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">MacBook Pro - Chrome</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Cagliari, IT • Attiva ora</p>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full">Corrente</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">iPhone 13 - Safari</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Senorbì, IT • Ultimo accesso: Ieri</p>
                        </div>
                      </div>
                      <button className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">Disconnetti</button>
                    </div>
                  </div>
                </div>

                {/* GDPR */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <Download className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Esportazione Dati (GDPR)
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Scarica un archivio completo contenente tutti i dati dello studio, i documenti dei clienti e i log di sistema.
                  </p>
                  <button onClick={handleExportData} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    Esporta Tutti i Dati
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* INTEGRATIONS TAB */}
          {activeTab === 'integrations' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Integrazioni & AI</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Connetti servizi esterni e configura l'Intelligenza Artificiale</p>
              </div>
              <div className="p-6 space-y-8">
                
                {/* Stripe */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-[#635BFF]/10 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-[#635BFF]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Stripe</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Per elaborare i pagamenti con carta di credito</p>
                    </div>
                  </div>
                  <div className="space-y-3 pl-13">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Secret Key</label>
                      <input 
                        type="password" value={integrations.stripeKey} onChange={e => setIntegrations({...integrations, stripeKey: e.target.value})}
                        className="w-full max-w-md px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                      />
                    </div>
                    <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                      Verifica Connessione
                    </button>
                  </div>
                </div>

                <hr className="border-slate-100 dark:border-slate-700" />

                {/* AI Configuration */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">AI Subagents</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Configura il comportamento dell'assistente virtuale</p>
                    </div>
                  </div>
                  <div className="space-y-4 pl-13">
                    <div className="flex items-center justify-between max-w-md">
                      <div>
                        <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100">Risposte Automatiche</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">L'AI risponde ai clienti fuori orario lavorativo</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={integrations.aiAutoReply} onChange={e => setIntegrations({...integrations, aiAutoReply: e.target.checked})} />
                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 dark:peer-focus:ring-sky-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                      </label>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">System Prompt Base</label>
                      <textarea 
                        value={integrations.aiSystemPrompt} onChange={e => setIntegrations({...integrations, aiSystemPrompt: e.target.value})}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
                        rows={4}
                      />
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Questo prompt definisce il tono e le regole generali dell'AI.</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end border-t border-slate-100 dark:border-slate-700">
                  <button 
                    onClick={handleSaveIntegrations} disabled={isSaving}
                    className="inline-flex items-center px-4 py-2 bg-sky-500 text-white rounded-lg font-medium hover:bg-sky-600 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Salvataggio...' : <><Save className="w-4 h-4 mr-2" /> Salva Configurazioni</>}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
