import { db } from '../../../lib/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { getAIProvider } from '../aiProvider';
import { logActivity, getAdminUID } from '../utils';

export async function runAgentReport(params: any) {
  const { type = 'weekly' } = params; // 'weekly' or 'monthly'

  try {
    // Gather KPI data (simplified for this example)
    const invoicesSnap = await getDocs(collection(db, 'invoices'));
    let fatturato = 0;
    let incassato = 0;
    invoicesSnap.forEach(d => {
      const data = d.data();
      fatturato += data.total_amount || 0;
      if (data.status === 'pagata') incassato += data.total_amount || 0;
    });

    const clientsSnap = await getDocs(collection(db, 'users'));
    let totalClients = 0;
    clientsSnap.forEach(d => {
      if (d.data().role === 'client') totalClients++;
    });

    const rawData = {
      periodo: type,
      fatturato,
      incassato,
      clienti_totali: totalClients,
      timestamp: new Date().toISOString()
    };

    const aiProvider = await getAIProvider();
    const adminUID = await getAdminUID();
    const prompt = `Sei l'analista AI dello studio M&C Elaborazioni e Consulenze Aziendali.
Genera un report ${type === 'weekly' ? 'settimanale' : 'mensile'} basato su questi dati:
${JSON.stringify(rawData, null, 2)}

Il report deve includere:
1. Riepilogo executive (3 frasi)
2. Punti di forza del periodo
3. Aree di attenzione / criticità
4. Suggerimenti operativi concreti

Scrivi in italiano, tono professionale ma chiaro. Usa formattazione markdown.`;

    const reportContent = await aiProvider.chat([
      { role: 'system', content: prompt }
    ]);

    await addDoc(collection(db, 'ai_reports'), {
      type,
      title: `Report ${type === 'weekly' ? 'Settimanale' : 'Mensile'} - ${new Date().toLocaleDateString('it-IT')}`,
      content: reportContent,
      raw_data: rawData,
      generatedAt: new Date().toISOString()
    });

    await addDoc(collection(db, 'notifications'), {
      user_id: adminUID,
      title: 'Nuovo Report AI',
      message: `Il report ${type === 'weekly' ? 'settimanale' : 'mensile'} è pronto per essere visualizzato.`,
      type: 'system',
      link: '/admin/reports',
      is_read: false,
      created_at: new Date().toISOString()
    });

    await logActivity(
      'agent_report', 
      'report_generated', 
      `Generato report ${type}`
    );

  } catch (error) {
    console.error("Agent Report error:", error);
  }
}
