import { db, storage, app } from '../../../lib/firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { ref, getBytes } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { logActivity, getAdminUID } from '../utils';
import { callAI } from '../aiClient';

const functions = getFunctions(app, 'europe-west1');

// Determina il MIME type dal nome file
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':  return 'application/pdf';
    case 'png':  return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    case 'heic': return 'image/heic';
    case 'heif': return 'image/heif';
    default:     return 'application/octet-stream';
  }
}

// Converte ArrayBuffer in base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Scarica il file da Firebase Storage e lo converte in base64
async function downloadFileAsBase64(storagePath: string): Promise<{ base64: string; mimeType: string; filename: string }> {
  const fileRef = ref(storage, storagePath);
  const arrayBuffer = await getBytes(fileRef);
  const filename = storagePath.split('/').pop() || 'documento';
  const mimeType = getMimeType(filename);
  const base64 = arrayBufferToBase64(arrayBuffer);
  return { base64, mimeType, filename };
}

const OCR_PROMPT = `Sei un sistema OCR e classificatore di documenti per uno studio di consulenza aziendale italiano.

Analizza attentamente questo documento e rispondi SOLO con un JSON valido, senza markdown:
{
  "category": "fattura|contratto|dichiarazione|bilancio|busta_paga|f24|dvr|ricevuta|visura|altro",
  "extracted_info": {
    "tipo_documento": "descrizione precisa del tipo",
    "data_documento": "data in formato YYYY-MM-DD o null",
    "importo": "importo con valuta o null",
    "emittente": "nome azienda/persona emittente o null",
    "destinatario": "nome azienda/persona destinataria o null",
    "numero_documento": "numero fattura/protocollo o null",
    "partita_iva": "P.IVA rilevata o null",
    "codice_fiscale": "CF rilevato o null",
    "descrizione_breve": "riassunto in max 2 righe del contenuto"
  },
  "confidence": 0.95,
  "suggested_practice_type": "fiscale|contributiva|societaria|amministrativa|sicurezza|altro",
  "testo_estratto": "testo grezzo estratto dal documento (max 500 caratteri)"
}`;

export async function runAgentDocumenti(params: any) {
  const { fullContext, documentId, documentData } = params;

  const docsToProcess = documentId
    ? [{ id: documentId, ...documentData }]
    : (fullContext?.documents || []);

  if (docsToProcess.length === 0) return;

  const adminUID = await getAdminUID();
  const aiOcrProxy = httpsCallable<any, { text: string }>(functions, 'aiOcrProxy');

  for (const docItem of docsToProcess) {
    if (docItem.status !== 'caricato') continue;

    try {
      let analysisContent: any;

      const storagePath = docItem.storage_path || docItem.file_path || null;

      if (storagePath) {
        // --- OCR REALE via Cloud Function sicura ---
        const { base64, mimeType } = await downloadFileAsBase64(storagePath);

        const result = await aiOcrProxy({
          prompt: OCR_PROMPT,
          fileBase64: base64,
          mimeType: mimeType,
          model: 'gemini-2.5-flash',
        });

        const responseText = result.data.text || '';
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        analysisContent = JSON.parse(cleanJson);

      } else {
        // --- FALLBACK: analisi solo da metadati via proxy sicuro ---
        const fallbackPrompt = `Analizza questo documento basandoti solo sui metadati disponibili.
Nome file: ${docItem.name || 'sconosciuto'}
Tipo: ${docItem.type || 'sconosciuto'}
Dimensione: ${docItem.size ? Math.round(docItem.size / 1024) + ' KB' : 'sconosciuta'}

Rispondi SOLO con JSON valido:
{
  "category": "fattura|contratto|dichiarazione|bilancio|busta_paga|f24|dvr|ricevuta|visura|altro",
  "extracted_info": {
    "tipo_documento": "...",
    "data_documento": null,
    "importo": null,
    "emittente": null,
    "destinatario": null,
    "numero_documento": null,
    "partita_iva": null,
    "codice_fiscale": null,
    "descrizione_breve": "Classificazione basata solo sul nome file"
  },
  "confidence": 0.3,
  "suggested_practice_type": "fiscale|contributiva|societaria|amministrativa|sicurezza|altro",
  "testo_estratto": null
}`;

        const response = await callAI({
          prompt: fallbackPrompt,
          model: 'gemini-2.5-flash',
          responseMimeType: 'application/json',
        });

        const responseText = response.text || '';
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        analysisContent = JSON.parse(cleanJson);
      }

      let newStatus = 'classificato';
      let adminNote = '';
      if (analysisContent.confidence >= 0.8) {
        newStatus = 'classificato';
        adminNote = `OCR completato con confidence ${Math.round(analysisContent.confidence * 100)}%`;
      } else if (analysisContent.confidence >= 0.5) {
        newStatus = 'in_revisione';
        adminNote = `Classificazione incerta (${Math.round(analysisContent.confidence * 100)}%) - verificare manualmente`;
      } else {
        newStatus = 'da_rifare';
        adminNote = 'Confidence troppo bassa - richiede revisione manuale';
      }

      await updateDoc(doc(db, 'documents', docItem.id), {
        category: analysisContent.category || 'altro',
        metadata: analysisContent.extracted_info || {},
        testo_estratto: analysisContent.testo_estratto || null,
        suggested_practice_type: analysisContent.suggested_practice_type || null,
        ocr_confidence: analysisContent.confidence || 0,
        status: newStatus,
        admin_note: adminNote,
        classified_at: new Date().toISOString()
      });

      await addDoc(collection(db, 'notifications'), {
        user_id: adminUID,
        title: newStatus === 'da_rifare' ? 'Documento da Rivedere' : 'Documento Classificato',
        message: `${docItem.name}: ${analysisContent.category} - ${adminNote}`,
        type: 'document',
        link: '/admin/documents',
        is_read: false,
        created_at: new Date().toISOString()
      });

      await logActivity(
        'agent_documenti',
        'document_classified',
        `OCR completato per "${docItem.name}": ${analysisContent.category} (${Math.round(analysisContent.confidence * 100)}%)`,
        docItem.client_id
      );

    } catch (error) {
      console.error(`Agent Documenti OCR error for doc ${docItem.id}:`, error);

      try {
        await updateDoc(doc(db, 'documents', docItem.id), {
          status: 'errore_ocr',
          admin_note: `Errore OCR: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
          classified_at: new Date().toISOString()
        });
      } catch (updateError) {
        console.error('Failed to update document error status:', updateError);
      }

      await logActivity(
        'agent_documenti',
        'ocr_error',
        `Errore OCR per "${docItem.name}": ${error}`,
        docItem.client_id
      );
    }
  }
}
