import { db } from '../../../lib/firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { getAIProvider } from '../aiProvider';
import { logActivity } from '../utils';

export async function runAgentDocumenti(params: any) {
  const { fullContext, documentId, documentData } = params;
  
  // Can be triggered by orchestrator (batch) or event (single)
  const docsToProcess = documentId ? [{ id: documentId, ...documentData }] : (fullContext?.documents || []);

  if (docsToProcess.length === 0) return;

  const aiProvider = await getAIProvider();

  for (const docItem of docsToProcess) {
    if (docItem.status !== 'caricato') continue;

    try {
      // In a real app, we would download the file from Firebase Storage here.
      // If it's an image, we'd pass it to Gemini Vision.
      // If it's a PDF, we'd extract text.
      // For this implementation, we simulate the text extraction based on filename/metadata.
      
      const simulatedContent = `Filename: ${docItem.name}. Content: [Simulated document content]`;

      const prompt = `Analizza questo documento. Rispondi SOLO con un JSON:
{
  "category": "fattura|contratto|dichiarazione|bilancio|busta_paga|f24|dvr|altro",
  "extracted_info": {
    "tipo_documento": "...",
    "data_documento": "...",
    "importo": "...",
    "emittente": "...",
    "descrizione_breve": "..."
  },
  "confidence": 0.9,
  "suggested_practice_type": "fiscale|contributiva|..."
}

Documento:
${simulatedContent}`;

      const responseStr = await aiProvider.chat([
        { role: 'system', content: prompt }
      ]);

      let result;
      try {
        const cleanJson = responseStr.replace(/```json/g, '').replace(/```/g, '').trim();
        result = JSON.parse(cleanJson);
      } catch (e) {
        console.error("Failed to parse document classification:", responseStr);
        continue;
      }

      const status = result.confidence < 0.7 ? 'da_rifare' : 'in_revisione';
      const note = result.confidence < 0.7 ? 'Classificazione incerta, verificare manualmente' : '';

      await updateDoc(doc(db, 'documents', docItem.id), {
        category: result.category || 'altro',
        metadata: result.extracted_info || {},
        status: status,
        admin_note: note
      });

      await addDoc(collection(db, 'notifications'), {
        user_id: 'admin',
        title: 'Documento Classificato',
        message: `Nuovo documento classificato: ${result.category} (Confidence: ${Math.round(result.confidence * 100)}%)`,
        type: 'document',
        link: '/admin/documents',
        is_read: false,
        created_at: new Date().toISOString()
      });

      await logActivity(
        'agent_documenti', 
        'document_classified', 
        `Documento ${docItem.name} classificato come ${result.category}`, 
        docItem.client_id
      );

    } catch (error) {
      console.error(`Agent Documenti error for doc ${docItem.id}:`, error);
    }
  }
}
