import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

let listenersInitialized = false;
let unsubscribes: (() => void)[] = [];

// Chiama la Cloud Function invece di eseguire AI nel browser
async function triggerCloudAgent(agentSlug: string, action: string, params: any) {
  try {
    const functions = getFunctions(undefined, 'us-central1');
    const runAgent = httpsCallable(functions, 'runOrchestratorManual');
    await runAgent({ agent: agentSlug, action, params });
    console.log('[CF] Triggered ' + agentSlug + ':' + action + ' via Cloud Function');
  } catch (error) {
    console.error('[CF] Failed to trigger ' + agentSlug + ':', error);
  }
}

export function initAIEventListeners(isAdmin: boolean) {
  if (!isAdmin || listenersInitialized) return;

  console.log('Initializing AI Event Listeners (CF-only mode)...');

  // 1. Documents Listener
  const docsQuery = query(collection(db, 'documents'), where('status', '==', 'caricato'));
  const unsubDocs = onSnapshot(docsQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        triggerCloudAgent('agent_documenti', 'classify', {
          documentId: change.doc.id
        });
      }
    });
  });
  unsubscribes.push(unsubDocs);

  // 2. Messages Listener
  const msgsQuery = query(collection(db, 'messages'));
  const unsubMsgs = onSnapshot(msgsQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const data = change.doc.data();
        if (data.senderId !== 'admin' && data.senderId !== 'system') {
          triggerCloudAgent('agent_assistente', 'reply', {
            messageId: change.doc.id,
            clientId: data.clientId
          });
        }
      }
    });
  });
  unsubscribes.push(unsubMsgs);

  // 3. Profiles Listener (New Clients)
  const profilesQuery = query(collection(db, 'users'), where('role', '==', 'client'));
  const unsubProfiles = onSnapshot(profilesQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        triggerCloudAgent('agent_onboarding', 'welcome', {
          clientId: change.doc.id
        });
      }
    });
  });
  unsubscribes.push(unsubProfiles);

  listenersInitialized = true;
}

export function cleanupAIEventListeners() {
  unsubscribes.forEach(unsub => unsub());
  unsubscribes = [];
  listenersInitialized = false;
  console.log('AI Event Listeners cleaned up.');
}
