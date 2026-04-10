import React, { useState, useEffect } from 'react';
import {
  Bot,
  Activity,
  CheckCircle2,
  AlertCircle,
  Settings,
  Play,
  Pause,
  RefreshCw,
  Power,
} from 'lucide-react';
import { toast } from 'sonner';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
// import rimosso - AI gira solo su Cloud Functions

interface Subagent {
  id: string;
  name: string;
  description: string;
  color: string;
  status: 'active' | 'paused' | 'error';
  lastRun: string;
  actionsToday: number;
  performance: number;
}

interface ActivityLog {
  id: string;
  subagent_id: string;
  action_type: string;
  description: string;
  created_at: string;
}

const INITIAL_AGENTS: Subagent[] = [
  {
    id: 'agent_scadenze',
    name: 'Agente Scadenze',
    description: 'Monitora e notifica scadenze fiscali e documentali',
    color: 'bg-blue-500',
    status: 'active',
    lastRun: new Date().toISOString(),
    actionsToday: 0,
    performance: 98.5,
  },
  {
    id: 'agent_solleciti',
    name: 'Agente Solleciti',
    description: 'Invia reminder automatici per pagamenti in ritardo',
    color: 'bg-red-500',
    status: 'active',
    lastRun: new Date().toISOString(),
    actionsToday: 0,
    performance: 100,
  },
  {
    id: 'agent_documenti',
    name: 'Agente Documenti',
    description: 'Classifica e categorizza documenti caricati tramite OCR',
    color: 'bg-green-500',
    status: 'active',
    lastRun: new Date().toISOString(),
    actionsToday: 0,
    performance: 95.2,
  },
  {
    id: 'agent_onboarding',
    name: 'Agente Onboarding',
    description: 'Guida i nuovi clienti nella configurazione iniziale',
    color: 'bg-purple-500',
    status: 'active',
    lastRun: new Date().toISOString(),
    actionsToday: 0,
    performance: 100,
  },
  {
    id: 'agent_report',
    name: 'Agente Report',
    description: 'Genera report periodici su KPI e performance studio',
    color: 'bg-orange-500',
    status: 'active',
    lastRun: new Date().toISOString(),
    actionsToday: 0,
    performance: 100,
  },
  {
    id: 'agent_comunicazioni',
    name: 'Agente Comunicazioni',
    description: 'Gestisce risposte automatiche e newsletter',
    color: 'bg-cyan-500',
    status: 'active',
    lastRun: new Date().toISOString(),
    actionsToday: 0,
    performance: 92.4,
  },
  {
    id: 'agent_compliance',
    name: 'Agente Compliance',
    description: 'Verifica conformitÃ  documentale e normativa',
    color: 'bg-indigo-500',
    status: 'active',
    lastRun: new Date().toISOString(),
    actionsToday: 0,
    performance: 100,
  },
  {
    id: 'agent_assistente',
    name: 'Agente Assistente',
    description: 'Chatbot per supporto clienti 24/7',
    color: 'bg-pink-500',
    status: 'active',
    lastRun: new Date().toISOString(),
    actionsToday: 0,
    performance: 99.1,
  },
];

export default function AISubagents() {
  const [orchestratorStatus, setOrchestratorStatus] = useState({
    enabled: true,
    lastRun: new Date().toISOString(),
    actionsToday: 0,
  });
  const [isOrchestratorRunning, setIsOrchestratorRunning] = useState(false);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [agents, setAgents] = useState<Subagent[]>(INITIAL_AGENTS);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'orchestrator_status', 'main'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setOrchestratorStatus((prev) => ({
            ...prev,
            enabled: data.status !== 'stopped',
            lastRun: data.lastRun ?? prev.lastRun,
          }));
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'orchestrator_status/main');
      }
    };
    fetchStatus();

    const q = query(
      collection(db, 'ai_activity_log'),
      orderBy('created_at', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const logsData: ActivityLog[] = [];
        const actionCounts: Record<string, number> = {};
        let totalActions = 0;

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Omit<ActivityLog, 'id'>;
          logsData.push({ id: docSnap.id, ...data });
          actionCounts[data.subagent_id] =
            (actionCounts[data.subagent_id] || 0) + 1;
          totalActions++;
        });

        setLogs(logsData);
        setAgents((prev) =>
          prev.map((agent) => ({
            ...agent,
            actionsToday: actionCounts[agent.id] || 0,
            lastRun:
              logsData.find((l) => l.subagent_id === agent.id)?.created_at ??
              agent.lastRun,
          }))
        );
        setOrchestratorStatus((prev) => ({ ...prev, actionsToday: totalActions }));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'ai_activity_log')
    );

    return () => unsubscribe();
  }, []);

  const handleToggleOrchestrator = () => {
    setOrchestratorStatus((prev) => {
      const next = !prev.enabled;
      toast.success(next ? 'Orchestratore attivato' : 'Orchestratore in pausa');
      return { ...prev, enabled: next };
    });
  };

  const handleRunOrchestrator = async () => {
    setIsOrchestratorRunning(true);
    toast.info('Ciclo orchestratore avviato...');
    try {
      const functions = getFunctions();
      const runManual = httpsCallable(functions, 'runOrchestratorManual');
      await runManual();
      toast.success('Ciclo orchestratore completato');
    } catch (error) {
      console.error('[Orchestrator] Errore:', error);
      toast.error('Errore durante il ciclo orchestratore');
    } finally {
      setIsOrchestratorRunning(false);
    }
  };

const handleRunAgent = async (agentId: string) => {
  toast.info(`Esecuzione ${agentId} avviata...`);
  try {
    const functions = getFunctions();
    const runManual = httpsCallable(functions, 'runOrchestratorManual');
    await runManual({ agentId });
    toast.success('Esecuzione completata');
  } catch (error) {
    console.error(`[Agent] Errore ${agentId}:`, error);
    toast.error("Errore durante l'esecuzione");
  }
};

  const toggleAgentStatus = (id: string) => {
    setAgents((prev) =>
      prev.map((agent) =>
        agent.id === id
          ? { ...agent, status: agent.status === 'active' ? 'paused' : 'active' }
          : agent
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Centro Subagenti AI
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Gestisci e monitora gli agenti autonomi dello studio
          </p>
        </div>
        <button className="inline-flex items-center justify-center px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
          <Settings className="w-5 h-5 mr-2" />
          Configurazione AI
        </button>
      </div>

      {/* Orchestrator Panel */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Bot className="w-48 h-48" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-sky-500/20 rounded-xl flex items-center justify-center border border-sky-500/30">
                <Bot className="w-6 h-6 text-sky-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Orchestratore AI</h2>
                <p className="text-slate-400 text-sm">Il cervello dello studio</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleOrchestrator}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                  orchestratorStatus.enabled
                    ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                }`}
              >
                {orchestratorStatus.enabled ? (
                  <><Pause className="w-4 h-4" /> Metti in Pausa</>
                ) : (
                  <><Play className="w-4 h-4" /> Attiva</>
                )}
              </button>
              <button
                onClick={handleRunOrchestrator}
                disabled={isOrchestratorRunning}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isOrchestratorRunning ? 'animate-spin' : ''}`}
                />
                {isOrchestratorRunning ? 'In esecuzioneâ€¦' : 'Esegui Ciclo Ora'}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-slate-400 text-sm mb-1">Stato</p>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    orchestratorStatus.enabled
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-slate-500'
                  }`}
                />
                <span className="font-medium">
                  {orchestratorStatus.enabled ? 'Attivo (In ascolto)' : 'In Pausa'}
                </span>
              </div>
            </div>
            <div>
              <p className="text-slate-400 text-sm mb-1">Ultimo Ciclo</p>
              <p className="font-medium">
                {new Date(orchestratorStatus.lastRun).toLocaleTimeString('it-IT', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-sm mb-1">Prossimo Ciclo</p>
              <p className="font-medium">Tra 10 min</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm mb-1">Azioni Totali Oggi</p>
              <p className="font-medium text-sky-400 text-xl">
                {orchestratorStatus.actionsToday}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col"
          >
            <div className="p-5 flex-1">
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-xl ${agent.color} flex items-center justify-center shadow-sm`}
                >
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <button
                  onClick={() => toggleAgentStatus(agent.id)}
                  className={`p-2 rounded-full transition-colors ${
                    agent.status === 'active'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                      : agent.status === 'error'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                  title={agent.status === 'active' ? 'Disattiva' : 'Attiva'}
                >
                  <Power className="w-5 h-5" />
                </button>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                {agent.name}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2 min-h-[40px]">
                {agent.description}
              </p>
              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    agent.status === 'active'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400'
                      : agent.status === 'error'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300'
                  }`}
                >
                  {agent.status === 'active' && (
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                  )}
                  {agent.status === 'error' && (
                    <AlertCircle className="w-3 h-3 mr-1" />
                  )}
                  {agent.status === 'active'
                    ? 'Operativo'
                    : agent.status === 'error'
                    ? 'Errore'
                    : 'In Pausa'}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Ultima azione</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[120px]">
                    {new Date(agent.lastRun).toLocaleTimeString('it-IT', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Azioni oggi</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {agent.actionsToday}
                  </span>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-500 dark:text-slate-400">Performance</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {agent.performance}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        agent.performance > 90
                          ? 'bg-emerald-500'
                          : agent.performance > 70
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${agent.performance}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-3 flex gap-2">
              <button
                onClick={() => handleRunAgent(agent.id)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Play className="w-4 h-4" />
                Esegui
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <Activity className="w-4 h-4" />
                Log
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity Log */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 dark:text-slate-100">
            Log AttivitÃ  Recenti
          </h2>
          <button className="text-sm font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300">
            Vedi Tutti
          </button>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              Nessuna attivitÃ  registrata di recente
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-start gap-4"
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-slate-900 dark:text-slate-100">
                      {log.subagent_id}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">â€¢</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(log.created_at).toLocaleString('it-IT')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {log.description}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
