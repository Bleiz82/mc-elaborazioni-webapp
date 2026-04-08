import { db } from '../../../lib/firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { getAIProvider } from '../aiProvider';
import { logActivity } from '../utils';

export async function runAgentScadenze(params: any) {
  const { fullContext } = params;
  const deadlines = fullContext?.deadlines || [];

  if (deadlines.length === 0) return;

  const aiProvider = await getAIProvider();

  for (const deadline of deadlines) {
    if (deadline.reminder_sent) continue;

    try {
      const prompt = `Sei un assistente professionale dello studio M&C Elaborazioni e Consulenze Aziendali.
Scrivi un breve messaggio di notifica per il cliente riguardo alla scadenza "${deadline.title}" in data ${deadline.due_date}.
Tono: professionale ma cordiale, in italiano.
Massimo 3 frasi.`;

      const message = await aiProvider.chat([
        { role: 'system', content: prompt }
      ]);

      // Create notification
      await addDoc(collection(db, 'notifications'), {
        user_id: deadline.client_id,
        title: 'Scadenza in arrivo',
        message: message,
        type: 'scadenza',
        link: '/client/deadlines',
        is_read: false,
        created_at: new Date().toISOString()
      });

      // Update deadline
      await updateDoc(doc(db, 'deadlines', deadline.id), {
        reminder_sent: true
      });

      await logActivity(
        'agent_scadenze', 
        'reminder_sent', 
        `Notifica scadenza "${deadline.title}" inviata`, 
        deadline.client_id
      );

    } catch (error) {
      console.error(`Agent Scadenze error for deadline ${deadline.id}:`, error);
    }
  }
}
