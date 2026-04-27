import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { GoogleGenAI } from '@google/genai';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

interface OcrRequest {
  prompt: string;
  fileBase64: string;
  mimeType: string;
  model?: string;
}

export const aiOcrProxy = onCall(
  {
    secrets: [GEMINI_API_KEY],
    region: 'europe-west1',
    maxInstances: 5,
    timeoutSeconds: 120,
    memory: '1GiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Devi essere autenticato.');
    }

    const uid = request.auth.uid;
    const userDoc = await admin.firestore().doc(`users/${uid}`).get();
    const role = userDoc.data()?.role;

    if (role !== 'admin' && role !== 'collaborator') {
      throw new HttpsError('permission-denied', 'Ruolo non autorizzato per OCR.');
    }

    const { prompt, fileBase64, mimeType, model } = request.data as OcrRequest;

    if (!prompt || !fileBase64 || !mimeType) {
      throw new HttpsError('invalid-argument', 'Prompt, file e mimeType sono obbligatori.');
    }

    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });
      const response = await ai.models.generateContent({
        model: model || 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: fileBase64,
                },
              },
              { text: prompt },
            ],
          },
        ],
      });

      await admin.firestore().collection('ai_activity_log').add({
        uid,
        role,
        model: model || 'gemini-2.5-flash',
        type: 'ocr',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        text: response.text,
      };
    } catch (error: any) {
      console.error('AI OCR Proxy error:', error);
      throw new HttpsError('internal', `Errore OCR: ${error.message}`);
    }
  }
);
