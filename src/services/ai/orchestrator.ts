import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, getDocs, query, where, addDoc, updateDoc, doc, setDoc } from 'firebase/firestore';
import { getAIProvider, chatWithFallback } from './aiProvider';
import { logActivity } from './utils';

// Import subagents (we will implement these next)
import { runAgentScadenze } from './agents/agentScadenze';
import { runAgentSolleciti } from './agents/agentSolleciti';
import { runAgentDocumenti } from './agents/agentDocumenti';
import { runAgentOnboarding } from './agents/agentOnboarding';
import { runAgentReport } from './agents/agentReport';
import { runAgentComunicazioni } from './agents/agentComunicazioni';
import { runAgentCompliance } from './agents/agentCompliance';
import { runAgentAssistente } from './agents/agentAssistente';

async function getActiveSubagents() {
  // In a real app, this might be stored in Firestore.
  // For now, we assume all are active unless disabled in settings.
  return [
    'agent_scadenze', 'agent_solleciti', 'agent_documenti', 
    'agent_onboarding', 'agent_report', 'agent_comunicazioni', 
    'agent_compliance', 'agent_assistente'
  ];
}

async function gatherStudioContext() {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const _3DaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const _7DaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const context: any = {
    deadlines: [],
    invoices: [],
    documents: [],
    practices: [],
    messages: [],
    newClients: []
  };

  try {
    // Deadlines
    const deadlinesSnap = await getDocs(query(collection(db, 'deadlines'), where('status', '!=', 'completata')));
    deadlinesSnap.forEach(d => {
      const data = d.data();
      if (new Date(data.due_date) <= in7Days) {
        context.deadlines.push({ id: d.id, ...data });
      }
    });

    // Invoices
    const invoicesSnap = await getDocs(query(collection(db, 'invoices'), where('status', 'in', ['scaduta', 'da_pagare'])));
    invoicesSnap.forEach(d => {
      const data = d.data();
      if (data.status === 'scaduta' || (data.status === 'da_pagare' && new Date(data.due_date) <= in3Days)) {
        context.invoices.push({ id: d.id, ...data });
      }
    });

    // Documents
    const docsSnap = await getDocs(query(collection(db, 'documents'), where('status', '==', 'caricato')));
    docsSnap.forEach(d => context.documents.push({ id: d.id, ...d.data() }));

    // Practices
    const practicesSnap = await getDocs(query(collection(db, 'practices'), where('status', '==', 'in_attesa_cliente')));
    practicesSnap.forEach(d => {
      const data = d.data();
      if (new Date(data.updated_at || data.created_at) < _3DaysAgo) {
        context.practices.push({ id: d.id, ...data });
      }
    });

    // Messages
    const msgsSnap = await getDocs(query(collection(db, 'messages'), where('isRead', '==', false)));
    msgsSnap.forEach(d => context.messages.push({ id: d.id, ...d.data() }));

    // New Clients
    const clientsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'client')));
    clientsSnap.forEach(d => {
      const data = d.data();
      if (data.created_at && new Date(data.created_at) > _7DaysAgo) {
        context.newClients.push({ id: d.id, ...data });
      }
    });

  } catch (error) {
    console.error("Error gathering studio context:", error);
  }

  return context;
}

export async function executeSubagent(agentSlug: string, action: string, params: any) {
  console.log(`Executing ${agentSlug}: ${action}`, params);
  
  try {
    switch (agentSlug) {
      case 'agent_scadenze':
        await runAgentScadenze(params);
        break;
      case 'agent_solleciti':
        await runAgentSolleciti(params);
        break;
      case 'agent_documenti':
        await runAgentDocumenti(params);
        break;
      case 'agent_onboarding':
        await runAgentOnboarding(params);
        break;
      case 'agent_report':
        await runAgentReport(params);
        break;
      case 'agent_comunicazioni':
        await runAgentComunicazioni(params);
        break;
      case 'agent_compliance':
        await runAgentCompliance(params);
        break;
      case 'agent_assistente':
        await runAgentAssistente(params);
        break;
      default:
        console.warn(`Unknown agent: ${agentSlug}`);
    }
  } catch (error) {
    console.error(`Error executing ${agentSlug}:`, error);
    await logActivity('orchestrator', 'error', `Errore esecuzione ${agentSlug}: ${error}`);
  }
}

export async function runOrchestrator() {
  console.log("Orchestrator cycle starting...");
  
  const context = await gatherStudioContext();
  
  try {
    const aiProvider = await getAIProvider();
    const decisionStr = await aiProvider.chat([
      {
        role: 'system',
        content: `Sei l'orchestratore AI di uno studio di consulenza aziendale "M&C Elaborazioni e Consulenze Aziendali" a SenorbÃ¬, Sardegna. Il tuo compito Ã¨ analizzare lo stato attuale dello studio e decidere quali subagenti AI attivare.

I subagenti disponibili sono:
1. agent_scadenze - Monitora e notifica scadenze
2. agent_solleciti - Invia solleciti pagamenti
3. agent_documenti - Classifica documenti caricati
4. agent_onboarding - Guida nuovi clienti
5. agent_report - Genera report
6. agent_comunicazioni - Gestisce comunicazioni automatiche
7. agent_compliance - Verifica conformitÃ  documentale
8. agent_assistente - Risponde ai clienti

Analizza il contesto e rispondi SOLO con un JSON array di azioni:
[
  {
    "agent": "agent_slug",
    "action": "descrizione azione da eseguire",
    "priority": "high|medium|low",
    "params": { "contextData": "passa qui i dati rilevanti dal contesto" }
  }
]

Se non serve attivare nessun agente, rispondi con array vuoto [].
Sii efficiente: attiva solo gli agenti necessari. NON includere markdown come \`\`\`json, solo l'array.`
      },
      {
        role: 'user',
        content: `Stato attuale dello studio:\n${JSON.stringify(context, null, 2)}`
      }
    ], { temperature: 0.3 });

    let actions = [];
    try {
      // Clean up potential markdown formatting
      const cleanJson = decisionStr.replace(/```json/g, '').replace(/```/g, '').trim();
      actions = JSON.parse(cleanJson);
    } catch (e) {
      console.error("Failed to parse orchestrator decision:", decisionStr);
      return;
    }

    for (const action of actions) {
      // Pass the relevant context to the subagent
      const params = { ...action.params, fullContext: context };
      await executeSubagent(action.agent, action.action, params);
    }

    await logActivity('orchestrator', 'cycle_complete', `Ciclo completato: ${actions.length} azioni eseguite`);
    
    // Update orchestrator status
    const statusRef = doc(db, 'studio_settings', 'orchestrator_status');
    try {
      await updateDoc(statusRef, {
        lastRun: new Date().toISOString(),
        enabled: true
      });
    } catch (e) {
      // If it doesn't exist, create it
      await setDoc(statusRef, {
        lastRun: new Date().toISOString(),
        enabled: true,
        actionsToday: actions.length
      });
    }

  } catch (error) {
    console.error("Orchestrator cycle failed:", error);
    await logActivity('orchestrator', 'cycle_failed', `Errore nel ciclo: ${error}`);
  }
}

// DEPRECATO - tutto gira sulle Cloud Functions
export function startOrchestrator(_intervalMinutes = 10) {
  console.warn('startOrchestrator() deprecato. Usa la Cloud Function orchestratorScheduled.');
}

export function stopOrchestrator() {
  console.warn('stopOrchestrator() deprecato.');
}
