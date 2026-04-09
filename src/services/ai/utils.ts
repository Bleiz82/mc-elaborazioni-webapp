import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, addDoc, query, where, limit, getDocs } from 'firebase/firestore';

export async function logActivity(agentId: string, actionType: string, description: string, clientId?: string, details?: any) {
  try {
    await addDoc(collection(db, 'ai_activity_log'), {
      subagent_id: agentId,
      action_type: actionType,
      description,
      client_id: clientId || null,
      details: details || null,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error("Failed to log AI activity:", error);
  }
}

export async function getAdminUID(): Promise<string> {
  try {
    const q = query(collection(db, 'users'), where('role', '==', 'admin'), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].id;
    }
  } catch (error) {
    console.error("Error fetching admin UID:", error);
  }
  return 'admin'; // fallback
}
