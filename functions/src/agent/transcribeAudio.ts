import { onCall, HttpsError } from 'firebase-functions/v2/https';

export const transcribeAudio = onCall(
  { region: 'us-central1', secrets: ['GEMINI_API_KEY'] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Devi essere autenticato');
    }

    const { audioUrl } = request.data;
    if (!audioUrl) {
      throw new HttpsError('invalid-argument', 'audioUrl is required');
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new HttpsError('internal', 'GEMINI_API_KEY not configured');

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{
          role: 'user',
          parts: [
            { text: 'Trascrivi il contenuto audio seguente in italiano. Restituisci SOLO il testo trascritto, senza commenti.' },
            { fileData: { mimeType: 'audio/webm', fileUri: audioUrl } }
          ]
        }],
        config: { temperature: 0.1 }
      });

      const transcription = response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return { transcription };
    } catch (error: any) {
      console.error('[TranscribeAudio] Error:', error.message);
      throw new HttpsError('internal', 'Errore nella trascrizione audio');
    }
  }
);
