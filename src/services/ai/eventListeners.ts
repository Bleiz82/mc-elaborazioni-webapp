import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { executeSubagent } from './orchestrator';

let listenersInitialized = false;
let unsubscribes: (() => void)[] = [];

export function initAIEventListeners(isAdmin: boolean) {
  if (!isAdmin || listenersInitialized) return;

  console.log("Initializing AI Event Listeners...");

  // 1. Documents Listener
  const docsQuery = query(collection(db, 'documents'), where('status', '==', 'caricato'));
  const unsubDocs = onSnapshot(docsQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        executeSubagent('agent_documenti', 'classify', {
          documentId: change.doc.id,
          documentData: change.doc.data()
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
          executeSubagent('agent_assistente', 'reply', {
            message: { id: change.doc.id, ...data },
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
        executeSubagent('agent_onboarding', 'welcome', {
          clientId: change.doc.id,
          clientData: change.doc.data()
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
  console.log("AI Event Listeners cleaned up.");
}
