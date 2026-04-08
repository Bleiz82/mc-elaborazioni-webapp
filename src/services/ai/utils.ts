import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

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
