import { db } from '../../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { getAIProvider } from '../aiProvider';
import { logActivity } from '../utils';

export async function runAgentComunicazioni(params: any) {
  const { type, messageData, clientId } = params;

  try {
    const aiProvider = await getAIProvider();

    if (type === 'draft_reply') {
      const prompt = `Un cliente dello studio M&C Elaborazioni e Consulenze Aziendali ha scritto:
'${messageData.text}'.

Suggerisci una risposta professionale.
In italiano, massimo 4 frasi.`;

      const suggestedReply = await aiProvider.chat([
        { role: 'system', content: prompt }
      ]);

      await addDoc(collection(db, 'ai_draft_replies'), {
        conversationId: messageData.conversationId || clientId,
        clientId: clientId,
        originalMessage: messageData.text,
        suggestedReply: suggestedReply,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      await logActivity(
        'agent_comunicazioni', 
        'draft_created', 
        `Bozza di risposta generata per cliente ${clientId}`,
        clientId
      );
    } else if (type === 'broadcast') {
      // Logic for generating broadcast messages
    }

  } catch (error) {
    console.error("Agent Comunicazioni error:", error);
  }
}
