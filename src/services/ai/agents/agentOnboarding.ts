import { db } from '../../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { getAIProvider } from '../aiProvider';
import { logActivity } from '../utils';

export async function runAgentOnboarding(params: any) {
  const { fullContext, clientId, clientData } = params;
  
  const clientsToProcess = clientId ? [{ id: clientId, ...clientData }] : (fullContext?.newClients || []);

  if (clientsToProcess.length === 0) return;

  const aiProvider = await getAIProvider();

  for (const client of clientsToProcess) {
    try {
      // Logic to determine missing fields
      const missingFields = [];
      if (!client.vat) missingFields.push('Partita IVA / Codice Fiscale');
      if (!client.address) missingFields.push('Indirizzo');
      if (!client.pec) missingFields.push('PEC');

      const prompt = `Sei l'assistente onboarding dello studio M&C Elaborazioni e Consulenze Aziendali.
Un nuovo cliente si è registrato. Nome: ${client.displayName || client.email}.

Dati mancanti: ${missingFields.length > 0 ? missingFields.join(', ') : 'Nessuno'}

Genera un messaggio di benvenuto personalizzato che:
1. Dia il benvenuto nello studio M&C
2. Elenchi i passi da completare per attivare il servizio (se ci sono dati mancanti, chiedi di compilarli nel profilo)
3. Sia cordiale e professionale

In italiano, massimo 8 frasi.`;

      const messageText = await aiProvider.chat([
        { role: 'system', content: prompt }
      ]);

      // Send chat message
      await addDoc(collection(db, 'messages'), {
        clientId: client.id,
        senderId: 'system',
        text: messageText,
        isAutomated: true,
        timestamp: new Date().toISOString()
      });

      if (missingFields.length > 0) {
        await addDoc(collection(db, 'notifications'), {
          user_id: client.id,
          title: 'Completa il Profilo',
          message: `Per favore, completa il tuo profilo inserendo: ${missingFields.join(', ')}`,
          type: 'alert',
          link: '/client/profile',
          is_read: false,
          created_at: new Date().toISOString()
        });
      }

      await logActivity(
        'agent_onboarding', 
        'onboarding_sent', 
        `Inviato messaggio di benvenuto a ${client.displayName || client.email}`, 
        client.id
      );

    } catch (error) {
      console.error(`Agent Onboarding error for client ${client.id}:`, error);
    }
  }
}
