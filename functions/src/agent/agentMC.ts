import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { decideAgent } from './orchestrator';
import { handleConsulente } from './consulente';
import { handleQualifier } from './qualifier';
import { handleScheduler } from './scheduler';
import { AgentSession, AgentStage } from '../types';

const DB_ID = 'ai-studio-f0b7482f-f418-4061-a54d-ed0b8ffff0cd';

export const agentMC = onRequest({ cors: true, region: 'us-central1' }, async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { message, session_id } = req.body;
  
  // Backward compatibility: if no session_id, generate or use hash
  const currentSessionId = session_id || "fallback-" + (req.body.conversationHistory?.length || 0);

  if (!message) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  const db = getFirestore(DB_ID);
  const sessionRef = db.collection('agent_sessions').doc(currentSessionId);
  
  try {
    // 1. Get or create session
    let sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
      const newSession: Partial<AgentSession> = {
        session_token: currentSessionId,
        channel: 'chatbot',
        stage: 'greeting',
        ai_enabled: true,
        current_agent: 'orchestrator',
        context: { contact_name: null, contact_email: null, contact_phone: null, main_problem: null, appointment_id: null },
        message_count: 0,
        contact_id: null,
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
        session_id: currentSessionId,
        sender: 'user',
        content: message,
        created_at: FieldValue.serverTimestamp()
      });
      res.json({ reply: null, operator_mode: true });
      return;
    }

    // 3. Save user message
    await db.collection('messages').add({
      session_id: currentSessionId,
      sender: 'user',
      content: message,
      created_at: FieldValue.serverTimestamp()
    });

    // 4. Load history (last 20)
    const msgsSnap = await db.collection('messages')
      .where('session_id', '==', currentSessionId)
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
    
    // Tools shared by agents (like saving context)
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
      session_id: currentSessionId,
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

    res.json({ reply: aiResponse.text });

  } catch (error: any) {
    console.error("[AgentMC] Error:", error);
    res.status(500).json({ 
        error: 'Errore nel servizio AI',
        reply: "Mi scuso, si Ã¨ verificato un errore. Riprova tra qualche istante."
    });
  }
});

