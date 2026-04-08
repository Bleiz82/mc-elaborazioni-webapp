import { db } from '../../../lib/firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { getAIProvider } from '../aiProvider';
import { logActivity } from '../utils';

export async function runAgentSolleciti(params: any) {
  const { fullContext } = params;
  const invoices = fullContext?.invoices || [];

  if (invoices.length === 0) return;

  const aiProvider = await getAIProvider();
  const now = new Date();

  for (const invoice of invoices) {
    if (invoice.status !== 'scaduta') continue;

    try {
      const dueDate = new Date(invoice.due_date);
      const diffTime = Math.abs(now.getTime() - dueDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Check how many reminders sent
      const msgsSnap = await getDocs(query(
        collection(db, 'messages'), 
        where('clientId', '==', invoice.client_id),
        where('isAutomated', '==', true)
      ));
      
      let reminderCount = 0;
      msgsSnap.forEach(d => {
        if (d.data().text.includes(invoice.invoice_number)) reminderCount++;
      });

      let level = 'primo';
      if (diffDays > 3 && diffDays <= 7) level = 'secondo';
      if (diffDays > 7) level = 'terzo';

      // Don't spam if we already sent the appropriate level
      if (level === 'primo' && reminderCount > 0) continue;
      if (level === 'secondo' && reminderCount > 1) continue;
      if (level === 'terzo' && reminderCount > 2) continue;

      const prompt = `Sei un assistente dello studio M&C Elaborazioni.
Scrivi un sollecito di pagamento per il cliente.
Parcella: ${invoice.invoice_number}, Importo: €${invoice.total_amount}, Scaduta da: ${diffDays} giorni.
Livello sollecito: ${level}.

Primo: tono cordiale, ricorda la scadenza.
Secondo: tono professionale fermo, sottolinea l'importanza.
Terzo: tono urgente, menziona possibili conseguenze.

Scrivi in italiano, massimo 5 frasi. Non essere aggressivo.`;

      const messageText = await aiProvider.chat([
        { role: 'system', content: prompt }
      ]);

      // Send chat message
      await addDoc(collection(db, 'messages'), {
        clientId: invoice.client_id,
        senderId: 'system',
        text: messageText,
        isAutomated: true,
        timestamp: new Date().toISOString()
      });

      // Create notification for client
      await addDoc(collection(db, 'notifications'), {
        user_id: invoice.client_id,
        title: 'Sollecito Pagamento',
        message: `Nuovo messaggio riguardo la parcella ${invoice.invoice_number}`,
        type: 'payment',
        link: '/client/chat',
        is_read: false,
        created_at: new Date().toISOString()
      });

      // If third level, notify admin
      if (level === 'terzo') {
        await addDoc(collection(db, 'notifications'), {
          user_id: 'admin', // assuming a generic admin or broadcast
          title: 'Intervento Manuale Richiesto',
          message: `Il cliente per la parcella ${invoice.invoice_number} ha ignorato 3 solleciti.`,
          type: 'alert',
          link: '/admin/payments',
          is_read: false,
          created_at: new Date().toISOString()
        });
      }

      await logActivity(
        'agent_solleciti', 
        'sollecito_inviato', 
        `Inviato ${level} sollecito per parcella ${invoice.invoice_number}`, 
        invoice.client_id
      );

    } catch (error) {
      console.error(`Agent Solleciti error for invoice ${invoice.id}:`, error);
    }
  }
}
