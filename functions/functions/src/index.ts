import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();

// ── Orchestratore automatico ogni 10 minuti ──────────────────────
export const orchestratorScheduled = onSchedule(
  {
    schedule: 'every 10 minutes',
    timeZone: 'Europe/Rome',
    secrets: ['GEMINI_API_KEY'],
  },
  async () => {
    console.log('[Orchestrator] Avvio ciclo schedulato');
    const db = getFirestore();
    await db.collection('orchestrator_status').doc('main').set({
      lastRun: new Date().toISOString(),
      status: 'running',
    }, { merge: true });
    console.log('[Orchestrator] Ciclo completato');
  }
);

// ── Chiamata manuale da admin panel ───────────────────────────────
export const runOrchestratorManual = onCall(
  {
    secrets: ['GEMINI_API_KEY'],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Autenticazione richiesta');
    }
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    if (userDoc.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Solo admin può avviare manualmente');
    }
    await db.collection('orchestrator_status').doc('main').set({
      lastRun: new Date().toISOString(),
      status: 'manual_run',
    }, { merge: true });
    return { success: true, message: 'Orchestratore avviato' };
  }
);
