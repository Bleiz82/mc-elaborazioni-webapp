import { db } from '../../../lib/firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { getAIProvider } from '../aiProvider';
import { logActivity } from '../utils';

export async function runAgentCompliance(params: any) {
  const { practiceId, practiceData, documents } = params;

  if (!practiceId) return;

  try {
    const aiProvider = await getAIProvider();

    const docList = documents?.map((d: any) => `${d.name} (${d.category})`).join(', ') || 'Nessun documento';

    const prompt = `Sei un esperto di compliance per uno studio di consulenza aziendale italiano.
   
Pratica: ${practiceData.title} - Tipo: ${practiceData.type || 'Generica'}
Documenti allegati: ${docList}

Verifica:
1. Ci sono tutti i documenti necessari per questo tipo di pratica?
2. Manca qualcosa?
3. Ci sono potenziali problemi di conformità?

Rispondi SOLO con JSON:
{
  "status": "compliant|warning|non_compliant",
  "missing_documents": ["..."],
  "warnings": ["..."],
  "suggestions": ["..."]
}`;

    const responseStr = await aiProvider.chat([
      { role: 'system', content: prompt }
    ]);

    let result;
    try {
      const cleanJson = responseStr.replace(/```json/g, '').replace(/```/g, '').trim();
      result = JSON.parse(cleanJson);
    } catch (e) {
      console.error("Failed to parse compliance check:", responseStr);
      return;
    }

    await updateDoc(doc(db, 'practices', practiceId), {
      compliance_check: result
    });

    if (result.status !== 'compliant') {
      await addDoc(collection(db, 'notifications'), {
        user_id: 'admin',
        title: 'Problema di Compliance',
        message: `La pratica "${practiceData.title}" ha problemi di conformità: ${result.warnings?.[0] || 'Verificare'}`,
        type: 'alert',
        link: '/admin/practices',
        is_read: false,
        created_at: new Date().toISOString()
      });
    }

    await logActivity(
      'agent_compliance', 
      'compliance_checked', 
      `Verifica compliance per pratica ${practiceData.title}: ${result.status}`,
      practiceData.client_id
    );

  } catch (error) {
    console.error("Agent Compliance error:", error);
  }
}
