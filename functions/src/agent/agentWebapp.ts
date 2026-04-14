import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { decideAgent } from './orchestrator';
import { handleConsulente } from './consulente';
import { handleQualifier } from './qualifier';
import { handleScheduler } from './scheduler';
import { AgentSession, AgentStage } from '../types';

const DB_ID = 'ai-studio-f0b7482f-f418-4061-a54d-ed0b8ffff0cd';

export const agentWebapp = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Devi essere autenticato');
  }

  const uid = request.auth.uid;
  const { message } = request.data;
  
  if (!message) {
    throw new HttpsError('invalid-argument', 'Il messaggio Ã¨ obbligatorio');
  }

  const db = getFirestore(DB_ID);
  
  // For authenticated users, session ID is their UID
  const sessionRef = db.collection('agent_sessions').doc(uid);
  
  try {
    // 1. Get or create session
    let sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
      // Fetch user data
      const userSnap = await db.collection('users').doc(uid).get();
      const userData = userSnap.data();

      const newSession: Partial<AgentSession> = {
        contact_id: uid,
        channel: 'chatbot',
        session_token: uid,
        stage: 'consulting', // Authenticated users skip greeting
        ai_enabled: true,
        current_agent: 'orchestrator',
        context: { 
            contact_name: userData?.full_name || null, 
            contact_email: request.auth.token.email || userData?.email || null, 
            contact_phone: userData?.phone || null, 
            main_problem: null, 
            appointment_id: null 
        },
        message_count: 0,
        created_at: FieldValue.serverTimestamp() as any,
        updated_at: FieldValue.serverTimestamp() as any
      };
      await sessionRef.set(newSession);
      sessionSnap = await sessionRef.get();
    }

    const session = { id: sessionSnap.id, ...sessionSnap.data() } as AgentSession;

    // 2. Check if AI is enabled
    if (!session.ai_enabled) {
      await db.collection('messages').add({
        session_id: uid,
        sender: 'user',
        content: message,
        created_at: FieldValue.serverTimestamp()
      });
      return { reply: null, operator_mode: true };
    }

    // 3. Save user message
    await db.collection('messages').add({
      session_id: uid,
      sender: 'user',
      content: message,
      created_at: FieldValue.serverTimestamp()
    });

    // 4. Load history (last 20)
    const msgsSnap = await db.collection('messages')
      .where('session_id', '==', uid)
      .orderBy('created_at', 'desc')
      .limit(20)
      .get();
    
    const history = msgsSnap.docs
      .map(doc => ({
        role: doc.data().sender === 'user' ? 'user' : 'model' as any,
        content: doc.data().content
      }))
      .reverse();

    // 5. Decide agent
    const agentName = await decideAgent(session.stage, session.context, message);

    // 6. Handle specialized agent
    let aiResponse;
    const saveContextField = async (field: string, value: string) => {
        await sessionRef.update({
            [`context.${field}`]: value,
            updated_at: FieldValue.serverTimestamp()
        });
    };

    const updateSessionStage = async (stage: AgentStage) => {
        await sessionRef.update({
            stage,
            updated_at: FieldValue.serverTimestamp()
        });
    };

    if (agentName === 'qualifier') {
      aiResponse = await handleQualifier(history, session.context, session, updateSessionStage);
    } else if (agentName === 'scheduler') {
      aiResponse = await handleScheduler(history, session.context, session.contact_id);
    } else {
      aiResponse = await handleConsulente(history, session.context, saveContextField);
    }

    // 7. Save assistant reply
    await db.collection('messages').add({
      session_id: uid,
      sender: 'assistant',
      content: aiResponse.text,
      created_at: FieldValue.serverTimestamp()
    });

    // 8. Update session
    await sessionRef.update({
      current_agent: agentName,
      message_count: FieldValue.increment(1),
      updated_at: FieldValue.serverTimestamp()
    });

    return { reply: aiResponse.text };

  } catch (error: any) {
    console.error("[AgentWebapp] Error:", error);
    return { 
        reply: "Mi scuso, si Ã¨ verificato un errore tecnico nell'assistente. Ti preghiamo di riprovare piÃ¹ tardi o contattare direttamente lo studio."
    };
  }
});

