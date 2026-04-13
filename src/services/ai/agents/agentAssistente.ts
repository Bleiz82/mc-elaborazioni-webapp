import { db } from '../../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { getAIProvider } from '../aiProvider';
import { logActivity, getAdminUID } from '../utils';

export async function runAgentAssistente(params: any) {
  const { message, clientId, clientData } = params;

  try {
    const aiProvider = await getAIProvider();
    const adminUID = await getAdminUID();

    const prompt = `Sei l'assistente virtuale dello studio M&C Elaborazioni e Consulenze Aziendali di Senorbì, Sardegna.
   
Informazioni sullo studio:
- Servizi: contabilità e paghe, business plan e finanziamenti, sicurezza sul lavoro (DVR, HACCP), consulenza societaria, pratiche SUAPE, consulenza fiscale e strategica
- Fondatori: Marco Pala e Claudia Cancedda
- Sede: Senorbì, Trexenta, Sardegna

Contesto del cliente che scrive:
- Nome: ${clientData?.displayName || 'Cliente'}
- Tipo: ${clientData?.clientType || 'Sconosciuto'}

Il cliente ha scritto: '${message.text}'

REGOLE:
- Se la domanda riguarda informazioni generali, orari, servizi, documenti necessari: rispondi direttamente
- Se riguarda lo stato specifico delle sue pratiche/pagamenti: usa il contesto fornito per rispondere
- Se la domanda è complessa, legale, o richiede una decisione professionale: NON rispondere nel merito, ma di' che inoltrerai la richiesta a un consulente dello studio
- Tono: professionale, cordiale, conciso
- In italiano, massimo 5 frasi

Rispondi SOLO con JSON:
{
  "can_answer": true|false,
  "response": "testo risposta",
  "needs_human": true|false,
  "category": "info|pratica|pagamento|scadenza|complesso"
}`;

    const responseStr = await aiProvider.chat([
      { role: 'system', content: prompt }
    ]);

    let result;
    try {
      const cleanJson = responseStr.replace(/```json/g, '').replace(/```/g, '').trim();
      result = JSON.parse(cleanJson);
    } catch (e) {
      console.error("Failed to parse assistant response:", responseStr);
      return;
    }

    if (result.can_answer && result.response) {
      await addDoc(collection(db, 'messages'), {
        clientId: clientId,
        senderId: 'system',
        text: result.response,
        isAutomated: true,
        timestamp: new Date().toISOString()
      });
      
      await logActivity('agent_assistente', 'auto_reply', `Risposta automatica a ${clientData?.displayName}`, clientId);
    }

    if (result.needs_human) {
      await addDoc(collection(db, 'notifications'), {
        user_id: adminUID,
        title: 'Richiesta Assistenza Complessa',
        message: `Il cliente ${clientData?.displayName} ha fatto una richiesta che richiede intervento umano.`,
        type: 'message',
        link: '/admin/communications',
        is_read: false,
        created_at: new Date().toISOString()
      });
      
      await logActivity('agent_assistente', 'needs_human_review', `Richiesto intervento umano per ${clientData?.displayName}`, clientId);
    }

  } catch (error) {
    console.error("Agent Assistente error:", error);
  }
}
