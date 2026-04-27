import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { GoogleGenAI } from '@google/genai';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

interface AIProxyRequest {
  prompt: string;
  systemInstruction?: string;
  model?: string;
  temperature?: number;
  responseMimeType?: 'text/plain' | 'application/json';
}

export const aiProxy = onCall(
  {
    secrets: [GEMINI_API_KEY],
    region: 'europe-west1',
    maxInstances: 10,
    timeoutSeconds: 60,
    memory: '512MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Devi essere autenticato.');
    }

    const uid = request.auth.uid;
    const userDoc = await admin.firestore().doc(`users/${uid}`).get();
    const role = userDoc.data()?.role;

    if (role !== 'admin' && role !== 'collaborator' && role !== 'client') {
      throw new HttpsError('permission-denied', 'Ruolo non autorizzato.');
    }

    const { prompt, systemInstruction, model, temperature, responseMimeType } =
      request.data as AIProxyRequest;

    if (!prompt || typeof prompt !== 'string' || prompt.length > 50000) {
      throw new HttpsError('invalid-argument', 'Prompt non valido.');
    }

    const rateLimitRef = admin.firestore().doc(`ai_rate_limit/${uid}`);
    const rateDoc = await rateLimitRef.get();
    const now = Date.now();
    const windowMs = 60 * 1000;
    const maxCalls = 10;

    if (rateDoc.exists) {
      const data = rateDoc.data()!;
      if (now - data.windowStart < windowMs && data.count >= maxCalls) {
        throw new HttpsError('resource-exhausted', 'Limite chiamate AI raggiunto.');
      }
    }

    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });
      const response = await ai.models.generateContent({
        model: model || 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: temperature ?? 0.7,
          responseMimeType: responseMimeType || 'text/plain',
        },
      });

      await rateLimitRef.set(
        {
          count: rateDoc.exists && now - rateDoc.data()!.windowStart < windowMs
            ? admin.firestore.FieldValue.increment(1)
            : 1,
          windowStart: rateDoc.exists && now - rateDoc.data()!.windowStart < windowMs
            ? rateDoc.data()!.windowStart
            : now,
          lastCall: now,
        },
        { merge: true }
      );

      await admin.firestore().collection('ai_activity_log').add({
        uid,
        role,
        model: model || 'gemini-2.5-flash',
        promptLength: prompt.length,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        text: response.text,
        usage: response.usageMetadata,
      };
    } catch (error: any) {
      console.error('AI Proxy error:', error);
      throw new HttpsError('internal', `Errore AI: ${error.message}`);
    }
  }
);
